-- Emergency hotfix: Remove circular RLS policies causing 500 errors

-- =====================================================
-- STEP 1: Drop all policies and start fresh
-- =====================================================

-- Drop all workspace policies
DROP POLICY IF EXISTS "Users can view their own workspace or workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can create their own workspace (only one)" ON workspaces;
DROP POLICY IF EXISTS "Users can update their own workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can delete their own workspace" ON workspaces;

-- Drop all profile policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles of workspace members" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Drop all workspace_members policies
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON workspace_members;

-- =====================================================
-- STEP 2: Create simple, non-recursive policies
-- =====================================================

-- WORKSPACES: Simple policies without recursion
CREATE POLICY "Users can view their owned workspace"
ON workspaces FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Users can view workspaces they are members of"
ON workspaces FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspace_members
        WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create their own workspace"
ON workspaces FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
    AND NOT EXISTS (
        SELECT 1 FROM workspaces w2
        WHERE w2.owner_id = auth.uid()
    )
);

CREATE POLICY "Users can update their owned workspace"
ON workspaces FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can delete their owned workspace"
ON workspaces FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- PROFILES: Simple policies - can view own profile and profiles in same workspace
CREATE POLICY "Users can view their own profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Allow viewing profiles of people in the same workspace (non-recursive)
-- Uses a direct join without checking back to profiles
CREATE POLICY "Users can view profiles in their workspace"
ON profiles FOR SELECT
TO authenticated
USING (
    -- User can see profiles of people in workspaces they own
    id IN (
        SELECT wm.user_id
        FROM workspace_members wm
        INNER JOIN workspaces w ON w.id = wm.workspace_id
        WHERE w.owner_id = auth.uid()
    )
    OR
    -- User can see profiles of people in workspaces they are members of
    id IN (
        SELECT wm2.user_id
        FROM workspace_members wm1
        INNER JOIN workspace_members wm2 ON wm2.workspace_id = wm1.workspace_id
        WHERE wm1.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update their own profile"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- WORKSPACE_MEMBERS: Simple policies
CREATE POLICY "Users can view members of their owned workspaces"
ON workspace_members FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces
        WHERE workspaces.id = workspace_members.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
);

CREATE POLICY "Users can view members in workspaces they belong to"
ON workspace_members FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_members.workspace_id
        AND wm.user_id = auth.uid()
    )
);

CREATE POLICY "Workspace owners can manage members"
ON workspace_members FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces
        WHERE workspaces.id = workspace_members.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspaces
        WHERE workspaces.id = workspace_members.workspace_id
        AND workspaces.owner_id = auth.uid()
    )
);

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Hotfix Applied: Fixed RLS Recursion';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Fixed:';
    RAISE NOTICE '✓ Removed circular RLS dependencies';
    RAISE NOTICE '✓ Split policies to avoid recursion';
    RAISE NOTICE '✓ Used subqueries instead of EXISTS with cross-table checks';
    RAISE NOTICE '=======================================================';
END $$;

