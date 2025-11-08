# Row-Level Security (RLS) Architecture

This document explains FounderHQ's multi-tenant security architecture using PostgreSQL Row-Level Security (RLS). Understanding RLS is critical for maintaining data isolation between workspaces and preventing unauthorized access.

## 📋 Table of Contents

- [What is RLS?](#what-is-rls)
- [Why RLS Matters](#why-rls-matters)
- [Core Concepts](#core-concepts)
- [FounderHQ's RLS Strategy](#founderhqs-rls-strategy)
- [Policy Patterns](#policy-patterns)
- [Common Pitfalls](#common-pitfalls)
- [Testing RLS Policies](#testing-rls-policies)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## What is RLS?

**Row-Level Security (RLS)** is a PostgreSQL feature that allows you to control which rows users can access in database queries. It acts as an additional security layer ON TOP of traditional SQL permissions.

### How It Works

1. **Enable RLS on a table**: `ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;`
2. **Create policies**: Define rules that determine which rows a user can see/modify
3. **Automatic enforcement**: PostgreSQL applies policies to ALL queries (SELECT, INSERT, UPDATE, DELETE)

### Example

```sql
-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can only see tasks in their workspace
CREATE POLICY "workspace_members_can_view_tasks"
ON tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = tasks.workspace_id
    AND user_id = auth.uid()
  )
);
```

Now when a user runs:
```sql
SELECT * FROM tasks;
```

PostgreSQL automatically adds the RLS check:
```sql
SELECT * FROM tasks
WHERE EXISTS (
  SELECT 1 FROM workspace_members
  WHERE workspace_id = tasks.workspace_id
  AND user_id = auth.uid()
);
```

**Users can't bypass this check**, even with SQL injection or direct database access.

---

## Why RLS Matters

### Multi-Tenant Security

FounderHQ is a **multi-tenant SaaS application**. Multiple users/workspaces share the same database, but each should ONLY see their own data.

**Without RLS:**
- Developers must remember to add workspace filters in EVERY query
- One forgotten `WHERE workspace_id = X` → data leak
- Application-level security is error-prone

**With RLS:**
- Security is enforced at the database level
- Impossible to query other workspaces' data
- Defense in depth: even if app logic fails, RLS catches it

### Compliance

Many regulations (GDPR, SOC 2, HIPAA) require **data isolation** and **audit trails**:
- ✅ RLS provides cryptographic-level data isolation
- ✅ Policies are auditable and version-controlled
- ✅ Combined with audit logging, creates complete compliance story

### Performance

RLS policies can leverage database indexes:
- Policies using `workspace_id` benefit from indexes
- Query planner optimizes RLS checks
- Often faster than application-level filtering

---

## Core Concepts

### 1. Supabase Auth Integration

Supabase provides `auth.uid()` function that returns the authenticated user's ID:

```sql
-- Get current user's ID
SELECT auth.uid();  -- Returns UUID of logged-in user

-- Get current user's JWT claims
SELECT auth.jwt();  -- Returns full JWT payload
```

This is how RLS policies know WHO is making the request.

### 2. Policy Types

PostgreSQL supports 4 policy types:

| Policy Type | When Applied | Purpose |
|-------------|-------------|---------|
| `FOR SELECT` | `SELECT` queries | Control which rows users can VIEW |
| `FOR INSERT` | `INSERT` queries | Control which rows users can CREATE |
| `FOR UPDATE` | `UPDATE` queries | Control which rows users can MODIFY |
| `FOR DELETE` | `DELETE` queries | Control which rows users can REMOVE |
| `FOR ALL` | All query types | Apply same rule to all operations |

### 3. USING vs. WITH CHECK

```sql
CREATE POLICY "policy_name" ON table_name
FOR UPDATE
USING (condition_to_see_row)      -- Can user see this row?
WITH CHECK (condition_to_modify); -- After update, is row still valid?
```

- **USING**: Determines which EXISTING rows user can access
- **WITH CHECK**: Validates NEW/UPDATED rows meet criteria

**Example:**
```sql
-- Members can update tasks in their workspace
CREATE POLICY "update_tasks" ON tasks
FOR UPDATE
USING (
  -- Can only update tasks you can already see
  is_workspace_member(workspace_id)
)
WITH CHECK (
  -- After update, task must still be in your workspace
  is_workspace_member(workspace_id)
);
```

### 4. SECURITY DEFINER Functions

Normal functions run with the permissions of the CALLING user. `SECURITY DEFINER` functions run with the permissions of the function OWNER.

**Why use it?**
- Avoid infinite recursion in RLS policies
- Safely query tables with RLS enabled from within policies

```sql
-- Without SECURITY DEFINER: Can cause recursion
CREATE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- This query is ALSO subject to RLS!
  -- Can cause infinite loop if workspace_members has RLS
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql;  -- ❌ Not SECURITY DEFINER

-- With SECURITY DEFINER: Bypasses RLS safely
CREATE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- ✅ Bypasses RLS
```

---

## FounderHQ's RLS Strategy

### The Single Workspace Model

**Core Principle:** Each user has ONE workspace. Either as owner OR invited member.

**Database Schema:**
```sql
-- Workspaces: One per user
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  UNIQUE(owner_id)  -- Enforces one workspace per user
);

-- Workspace Members: For collaboration
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces,
  user_id UUID REFERENCES auth.users,
  role TEXT CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);
```

### The Helper Function Pattern

**Problem:** Every RLS policy needs to check "Is user a member of this workspace?"

**Solution:** Centralized helper function.

```sql
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- Check if user is workspace owner
    SELECT 1 FROM workspaces
    WHERE id = workspace_uuid AND owner_id = auth.uid()
    UNION
    -- Check if user is invited member
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
```

**Benefits:**
- ✅ DRY: Write once, use everywhere
- ✅ Consistent: All tables use same membership logic
- ✅ Maintainable: Change in one place affects all policies
- ✅ Performant: Database can optimize the function

### Applying to All Content Tables

**All workspace-scoped tables** use this pattern:

```sql
-- Example: Tasks table
CREATE POLICY "workspace_members_select_tasks"
ON tasks FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_insert_tasks"
ON tasks FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_update_tasks"
ON tasks FOR UPDATE TO authenticated
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

CREATE POLICY "workspace_members_delete_tasks"
ON tasks FOR DELETE TO authenticated
USING (is_workspace_member(workspace_id));
```

**Applied to:**
- `tasks`
- `crm_items`
- `contacts`
- `meetings`
- `marketing_items`
- `financial_logs`
- `documents`
- `expenses`
- `activity_log`

---

## Policy Patterns

### Pattern 1: Workspace-Scoped Content

**Use Case:** Tables where ALL data belongs to a workspace.

**Schema:**
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces NOT NULL,  -- Required
  title TEXT NOT NULL,
  -- ...
);
```

**Policies:**
```sql
-- SELECT: Members can view workspace tasks
CREATE POLICY "workspace_members_select_tasks"
ON tasks FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- INSERT: Members can create tasks in their workspace
CREATE POLICY "workspace_members_insert_tasks"
ON tasks FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id));

-- UPDATE: Members can modify workspace tasks
CREATE POLICY "workspace_members_update_tasks"
ON tasks FOR UPDATE TO authenticated
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

-- DELETE: Members can delete workspace tasks
CREATE POLICY "workspace_members_delete_tasks"
ON tasks FOR DELETE TO authenticated
USING (is_workspace_member(workspace_id));
```

### Pattern 2: User-Specific Data

**Use Case:** Tables where each row belongs to ONE user (e.g., profiles).

**Schema:**
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users,
  full_name TEXT,
  email TEXT,
  -- ...
);
```

**Policies:**
```sql
-- Users can view their own profile
CREATE POLICY "users_view_own_profile"
ON profiles FOR SELECT TO authenticated
USING (id = auth.uid());

-- Users can view profiles of workspace members
CREATE POLICY "users_view_workspace_profiles"
ON profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspace_members wm1
    INNER JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
  )
);

-- Users can update their own profile
CREATE POLICY "users_update_own_profile"
ON profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
```

### Pattern 3: Owner-Only Access

**Use Case:** Sensitive data only workspace OWNERS should access.

**Example: Subscription billing info**

**Schema:**
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces NOT NULL,
  stripe_customer_id TEXT,
  plan_type TEXT,
  -- ...
);
```

**Policies:**
```sql
-- Only workspace owners can view billing
CREATE POLICY "owners_view_subscriptions"
ON subscriptions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = subscriptions.workspace_id
    AND owner_id = auth.uid()
  )
);

-- Only owners can modify billing
CREATE POLICY "owners_manage_subscriptions"
ON subscriptions FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = subscriptions.workspace_id
    AND owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = subscriptions.workspace_id
    AND owner_id = auth.uid()
  )
);
```

### Pattern 4: Granular Permissions

**Use Case:** Different permissions based on role or ownership.

**Example: Tasks - Owners can delete ANY, members can delete OWN**

```sql
-- Owners can delete any task in workspace
CREATE POLICY "delete_tasks_owner"
ON tasks FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM workspaces
    WHERE id = tasks.workspace_id
    AND owner_id = auth.uid()
  )
);

-- Members can delete tasks they created or are assigned to
CREATE POLICY "delete_tasks_member"
ON tasks FOR DELETE TO authenticated
USING (
  (auth.uid() = tasks.user_id OR auth.uid() = tasks.assigned_to)
  AND EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = tasks.workspace_id
    AND user_id = auth.uid()
  )
);
```

### Pattern 5: Public Read, Authenticated Write

**Use Case:** Content visible to all, but only authenticated users can modify.

**Example: Public documentation**

```sql
-- Anyone can read
CREATE POLICY "public_read_docs"
ON documentation FOR SELECT
TO anon, authenticated
USING (true);

-- Only workspace members can write
CREATE POLICY "members_write_docs"
ON documentation FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id));
```

---

## Common Pitfalls

### ❌ Pitfall 1: Infinite Recursion

**Problem:** RLS policy queries a table that ALSO has RLS enabled.

**Example:**
```sql
-- workspaces table policy checks workspace_members
CREATE POLICY "workspace_member_access" ON workspaces
USING (
  EXISTS (SELECT 1 FROM workspace_members WHERE ...)  -- ⚠️ workspace_members has RLS!
);

-- workspace_members policy checks workspaces
CREATE POLICY "member_access" ON workspace_members
USING (
  EXISTS (SELECT 1 FROM workspaces WHERE ...)  -- ⚠️ workspaces has RLS!
);
```

**Result:** Infinite recursion → database error.

**Solution:** Use `SECURITY DEFINER` functions to break the cycle.

```sql
CREATE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;  -- ✅ Bypasses RLS

-- Now safe to use in policies
CREATE POLICY "workspace_access" ON workspaces
USING (owner_id = auth.uid() OR is_workspace_member(id));
```

### ❌ Pitfall 2: Forgetting WITH CHECK

**Problem:** USING clause allows user to see row, but WITH CHECK prevents modification.

**Example:**
```sql
-- User can see task, but can't update it!
CREATE POLICY "update_tasks" ON tasks
FOR UPDATE
USING (is_workspace_member(workspace_id));
-- ❌ Missing WITH CHECK
```

**Solution:** Always include WITH CHECK for UPDATE/INSERT policies.

```sql
CREATE POLICY "update_tasks" ON tasks
FOR UPDATE
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));  -- ✅ Explicit check
```

### ❌ Pitfall 3: Overly Permissive Policies

**Problem:** Policy allows more access than intended.

**Example:**
```sql
-- OOPS: Anyone can see any user's profile!
CREATE POLICY "view_profiles" ON profiles
FOR SELECT TO authenticated
USING (true);  -- ❌ Too permissive
```

**Solution:** Be explicit about access requirements.

```sql
-- Users can only see profiles in their workspace
CREATE POLICY "view_workspace_profiles" ON profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() OR  -- Own profile
  EXISTS (
    SELECT 1 FROM workspace_members wm1
    INNER JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
  )
);
```

### ❌ Pitfall 4: Missing Policies

**Problem:** RLS enabled but no policies created → users can't access ANY data.

**Symptoms:**
- Queries return 0 rows
- "new row violates row-level security policy" errors

**Solution:** Always create complete policy set (SELECT, INSERT, UPDATE, DELETE).

```sql
-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Must create policies!
CREATE POLICY "select_tasks" ON tasks FOR SELECT USING (...);
CREATE POLICY "insert_tasks" ON tasks FOR INSERT WITH CHECK (...);
CREATE POLICY "update_tasks" ON tasks FOR UPDATE USING (...) WITH CHECK (...);
CREATE POLICY "delete_tasks" ON tasks FOR DELETE USING (...);
```

### ❌ Pitfall 5: Not Testing with Actual Users

**Problem:** Policies tested as superuser (bypasses RLS) → bugs in production.

**Solution:** Test with actual authenticated user contexts.

```sql
-- Set session to simulate user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';

-- Now queries run with RLS
SELECT * FROM tasks;
```

---

## Testing RLS Policies

### Unit Tests (Vitest)

**Location:** `tests/rls/tasks.test.ts`

**Pattern:**
```typescript
import { createAuthenticatedClient } from './setup';

describe('Tasks RLS Policies', () => {
  it('workspace owner can view tasks', async () => {
    const ownerClient = await createAuthenticatedClient(
      'owner@example.com',
      'password123'
    );
    
    const { data, error } = await ownerClient
      .from('tasks')
      .select('*');
    
    expect(error).toBeNull();
    expect(data).toHaveLength(5);
  });

  it('non-member cannot view workspace tasks', async () => {
    const nonMemberClient = await createAuthenticatedClient(
      'outsider@example.com',
      'password123'
    );
    
    const { data, error } = await nonMemberClient
      .from('tasks')
      .select('*')
      .eq('workspace_id', 'target-workspace-id');
    
    expect(error).toBeNull();
    expect(data).toHaveLength(0);  // Should see nothing
  });
});
```

### Manual SQL Testing

**1. Check if policies exist:**
```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'tasks';
```

**2. Simulate user session:**
```sql
-- Simulate authenticated user
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "a1b2c3d4-uuid-here"}';

-- Test SELECT
SELECT * FROM tasks;

-- Test INSERT
INSERT INTO tasks (workspace_id, title) VALUES ('workspace-uuid', 'Test Task');

-- Reset
RESET ROLE;
```

**3. Check helper functions:**
```sql
-- Test is_workspace_member function
SELECT is_workspace_member('workspace-uuid-here');
-- Should return true if you're a member, false otherwise
```

### Supabase Dashboard Testing

**Settings → Database → Policies:**
- View all RLS policies
- See which tables have RLS enabled
- Review policy definitions

**SQL Editor:**
- Run test queries as authenticated user
- Use `auth.uid()` to get current user ID
- Check `workspace_members` table for membership

---

## Troubleshooting

### Symptom: "new row violates row-level security policy"

**Cause:** INSERT policy WITH CHECK condition failed.

**Diagnosis:**
```sql
-- Check INSERT policies
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'tasks' AND cmd = 'INSERT';

-- Test condition manually
SELECT 
  'workspace-uuid' as workspace_id,
  is_workspace_member('workspace-uuid') as can_insert;
```

**Fixes:**
1. **User not in workspace_members**: Run workspace member trigger
2. **Policy too restrictive**: Review WITH CHECK condition
3. **Missing policy**: Create INSERT policy

### Symptom: Users see 0 rows

**Cause:** SELECT policy USING condition too restrictive or missing.

**Diagnosis:**
```sql
-- Check SELECT policies
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'tasks' AND cmd = 'SELECT';

-- Test condition manually
SELECT COUNT(*) FROM tasks;  -- As superuser (should see all)

SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid"}';
SELECT COUNT(*) FROM tasks;  -- As user (check if see any)
RESET ROLE;
```

**Fixes:**
1. **Missing SELECT policy**: Create one
2. **Wrong condition**: Check `is_workspace_member()` function
3. **User not authenticated**: Verify session token

### Symptom: RLS policies not applying

**Cause:** RLS not enabled on table.

**Diagnosis:**
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'tasks';
-- rowsecurity should be 't' (true)
```

**Fix:**
```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

### Symptom: Infinite recursion error

**Cause:** Circular dependency in RLS policies.

**Example:**
```
ERROR: infinite recursion detected in policy for relation "workspaces"
```

**Fix:** Use SECURITY DEFINER functions:
```sql
CREATE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER  -- This breaks the recursion
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid AND user_id = auth.uid()
  );
END;
$$;
```

---

## Best Practices

### ✅ DO: Use Helper Functions

**Bad:**
```sql
-- Repeated logic in every policy
CREATE POLICY "select_tasks" ON tasks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM workspaces WHERE id = tasks.workspace_id AND owner_id = auth.uid()
    UNION
    SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid()
  )
);
```

**Good:**
```sql
-- Centralized logic
CREATE FUNCTION is_workspace_member(workspace_uuid UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspaces WHERE id = workspace_uuid AND owner_id = auth.uid()
    UNION
    SELECT 1 FROM workspace_members WHERE workspace_id = workspace_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "select_tasks" ON tasks FOR SELECT
USING (is_workspace_member(workspace_id));
```

### ✅ DO: Be Explicit with Roles

```sql
-- Good: Explicitly target authenticated users
CREATE POLICY "authenticated_access" ON tasks
FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Also good: Allow public read
CREATE POLICY "public_read" ON docs
FOR SELECT TO anon, authenticated
USING (is_published = true);
```

### ✅ DO: Add Comments

```sql
-- Explain WHY the policy exists
CREATE POLICY "workspace_members_select_tasks"
ON tasks FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

COMMENT ON POLICY "workspace_members_select_tasks" ON tasks IS
'Workspace members (owners + invited) can view all tasks in their workspace. Uses is_workspace_member() helper function to check membership.';
```

### ✅ DO: Test Policies in Isolation

Create test migrations that:
1. Create test users
2. Create test workspaces
3. Add test data
4. Run assertions

### ✅ DO: Use Indexes

RLS policies benefit from indexes:
```sql
-- Index on workspace_id for all content tables
CREATE INDEX idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX idx_crm_workspace_id ON crm_items(workspace_id);
-- ...
```

### ❌ DON'T: Disable RLS in Production

```sql
-- NEVER do this in production!
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
```

### ❌ DON'T: Use `TO public`

```sql
-- Bad: Anyone (even anonymous) can access
CREATE POLICY "bad_policy" ON tasks
FOR SELECT TO public
USING (true);

-- Good: Require authentication
CREATE POLICY "good_policy" ON tasks
FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));
```

### ❌ DON'T: Hardcode User IDs

```sql
-- Bad: Breaks when user IDs change
CREATE POLICY "admin_access" ON tasks
FOR ALL TO authenticated
USING (auth.uid() = 'a1b2c3d4-hardcoded-uuid');

-- Good: Use a roles table
CREATE POLICY "admin_access" ON tasks
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users WHERE user_id = auth.uid()
  )
);
```

---

## Summary

### Key Takeaways

1. **RLS is your security foundation** - Never disable it in production
2. **Use helper functions** - Centralize membership checks
3. **Test with real users** - Superuser tests don't catch RLS bugs
4. **Avoid recursion** - Use SECURITY DEFINER functions
5. **Be explicit** - Always define all 4 policy types (SELECT, INSERT, UPDATE, DELETE)

### Migration Checklist

When adding a new table:

- [ ] Add `workspace_id` column (NOT NULL)
- [ ] Create index on `workspace_id`
- [ ] Enable RLS: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`
- [ ] Create SELECT policy using `is_workspace_member()`
- [ ] Create INSERT policy with WITH CHECK
- [ ] Create UPDATE policy with USING and WITH CHECK
- [ ] Create DELETE policy
- [ ] Add comments to policies
- [ ] Write RLS tests
- [ ] Test manually with simulated users
- [ ] Document in migration README

### Further Reading

- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [FounderHQ Onboarding](./ONBOARDING.md)
- [FounderHQ Audit Logging](./SUPABASE_AUDIT_LOGGING.md)

---

**Questions?** Check existing migrations in `supabase/migrations/` for examples, or review RLS test files in `tests/rls/`.
