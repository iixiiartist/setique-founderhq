# Database Migrations Guide

## Overview

This directory contains version-controlled SQL migrations for the Setique Founder Dashboard database. All database schema changes, RLS policy updates, and data migrations should be tracked here.

## Migration Naming Convention

Migrations follow this naming pattern:
```
YYYYMMDDHHMMSS_descriptive_name.sql
```

**Examples:**
- `20241107000001_add_time_columns.sql`
- `20241107000002_workspace_members_trigger.sql`
- `20241107000003_fix_rls_policies.sql`

**Rules:**
- Use UTC timestamp for consistency
- Use snake_case for description
- Keep descriptions concise but clear
- One migration per logical change

## Migration Process

### 1. Creating a New Migration

```bash
# Copy the template
cp supabase/migrations/TEMPLATE.sql supabase/migrations/$(date -u +%Y%m%d%H%M%S)_your_description.sql

# Edit the new file with your changes
```

### 2. Writing Migrations

**Best Practices:**
- ✅ Always use `IF NOT EXISTS` for schema changes
- ✅ Always use `IF EXISTS` when dropping objects
- ✅ Include comments explaining WHY, not just WHAT
- ✅ Test on a development database first
- ✅ Include verification queries
- ✅ Document rollback steps
- ❌ Never delete or modify existing migrations
- ❌ Never include transaction statements (Supabase handles this)

**Example Structure:**
```sql
-- Migration: Add user preferences
-- Created: 2024-11-07
-- Description: Adds user_preferences table for storing per-user settings

-- Add new table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  theme TEXT DEFAULT 'light',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences" ON user_preferences
FOR ALL USING (user_id = auth.uid());

-- Verification
-- SELECT * FROM user_preferences LIMIT 1;
```

### 3. Applying Migrations

#### Option A: Supabase Dashboard (Recommended)
1. Go to Supabase Dashboard → SQL Editor
2. Copy the migration content
3. Run the SQL
4. Verify results
5. Record in migration log

#### Option B: Supabase CLI
```bash
# Link your project
supabase link --project-ref your-project-ref

# Apply all pending migrations
supabase db push

# Or apply specific migration
psql $DATABASE_URL -f supabase/migrations/20241107000001_add_time_columns.sql
```

### 4. Verifying Migrations

After applying a migration:

```sql
-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'your_table';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'your_table';

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE event_object_table = 'your_table';
```

## Existing Migrations

### Applied Migrations

| Migration | Date | Description | Status |
|-----------|------|-------------|--------|
| `20241107000001_add_time_columns.sql` | 2024-11-07 | Adds due_time columns to tasks, marketing_items, and crm_items | ✅ Applied |
| `20241107000002_workspace_members_trigger.sql` | 2024-11-07 | Automatic workspace owner membership | ✅ Applied |
| `20241107000003_fix_rls_policies.sql` | 2024-11-07 | Updates RLS policies for workspace_members | ✅ Applied |

### Migration History

#### 20241107000001_add_time_columns.sql
**Purpose:** Add time scheduling capabilities to tasks and marketing items

**Changes:**
- Added `due_time TEXT` to `tasks` table
- Added `due_time TEXT` to `marketing_items` table
- Added `next_action_time TEXT` to `crm_items` table

**Impact:** Allows users to set specific times for due dates and next actions

#### 20241107000002_workspace_members_trigger.sql
**Purpose:** Fix RLS policy violations by ensuring workspace owners are always in workspace_members

**Changes:**
- Backfills existing workspaces with owner memberships
- Creates `add_owner_to_workspace_members()` function
- Creates trigger on workspace creation

**Impact:** Critical for RLS policies - prevents 403 errors on data operations

#### 20241107000003_fix_rls_policies.sql
**Purpose:** Update all RLS policies to use workspace_members for access control

**Changes:**
- Updates tasks RLS policies (SELECT, INSERT, UPDATE, DELETE)
- Updates marketing_items RLS policies
- Updates activity_log RLS policies

**Impact:** Proper multi-tenant security - users can only access their workspace data

## Rollback Procedures

### General Rollback Steps

1. **Identify the migration to rollback**
2. **Check for dependencies** - ensure no later migrations depend on this
3. **Write rollback SQL** - reverse the changes
4. **Test in development first**
5. **Apply rollback in production**
6. **Verify data integrity**

### Example Rollback

```sql
-- Rollback: 20241107000001_add_time_columns.sql

-- Remove columns
ALTER TABLE tasks DROP COLUMN IF EXISTS due_time;
ALTER TABLE marketing_items DROP COLUMN IF EXISTS due_time;
ALTER TABLE crm_items DROP COLUMN IF EXISTS next_action_time;

-- Verify
SELECT column_name FROM information_schema.columns 
WHERE table_name IN ('tasks', 'marketing_items', 'crm_items')
AND column_name LIKE '%time%';
```

## Common Migration Patterns

### Adding a Column
```sql
ALTER TABLE table_name 
ADD COLUMN IF NOT EXISTS column_name data_type DEFAULT default_value;

COMMENT ON COLUMN table_name.column_name IS 'Description of purpose';
```

### Creating an Index
```sql
CREATE INDEX IF NOT EXISTS idx_table_column 
ON table_name(column_name);

-- For partial index
CREATE INDEX IF NOT EXISTS idx_table_column_partial
ON table_name(column_name) 
WHERE condition;
```

### Adding RLS Policy
```sql
-- Enable RLS if not already enabled
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Drop old policy if updating
DROP POLICY IF EXISTS "policy_name" ON table_name;

-- Create new policy
CREATE POLICY "policy_name" ON table_name
FOR operation USING (condition);
```

### Creating a Trigger
```sql
-- Create function
CREATE OR REPLACE FUNCTION function_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Logic here
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_name ON table_name;
CREATE TRIGGER trigger_name
  AFTER INSERT ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION function_name();
```

## Troubleshooting

### Migration Fails with Permission Error
- Check if you're running as the database owner
- Some operations require `SECURITY DEFINER` functions

### Policy Already Exists Error
- Always use `DROP POLICY IF EXISTS` before creating
- Check for policy name conflicts

### Column Already Exists Error
- Always use `IF NOT EXISTS` clause
- Check if migration was partially applied

### RLS Blocking Data Access
- Verify workspace_members table has correct entries
- Check policy conditions match your data structure
- Use `SELECT * FROM workspace_members WHERE user_id = auth.uid()` to debug

## Testing Migrations

### Local Testing with Supabase CLI

```bash
# Start local Supabase
supabase start

# Run migration
supabase migration up

# Test the changes
# ... perform manual testing ...

# Reset if needed
supabase db reset
```

### Manual Testing Checklist

- [ ] Migration applies without errors
- [ ] Verification queries return expected results
- [ ] Existing data remains intact
- [ ] RLS policies work correctly
- [ ] Application functions as expected
- [ ] Performance is acceptable
- [ ] Rollback script works if needed

## Best Practices Summary

1. **Always backup** before running migrations in production
2. **Test thoroughly** in development first
3. **Use idempotent operations** (IF EXISTS, IF NOT EXISTS)
4. **Document clearly** - future you will thank you
5. **Keep migrations atomic** - one logical change per file
6. **Version control everything** - commit migrations with code
7. **Never edit existing migrations** - create new ones to fix issues
8. **Plan for rollback** - know how to undo changes

## Support & Resources

- [Supabase Migrations Docs](https://supabase.com/docs/guides/cli/migrations)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)

## Migration Log

Document when migrations are applied in production:

| Date | Migration | Applied By | Environment | Notes |
|------|-----------|------------|-------------|-------|
| 2024-11-07 | 20241107000001 | System | Production | Added time columns |
| 2024-11-07 | 20241107000002 | System | Production | Workspace members trigger |
| 2024-11-07 | 20241107000003 | System | Production | Fixed RLS policies |

---

**Last Updated:** 2024-11-07  
**Maintained By:** Development Team
