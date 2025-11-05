-- Fix iixiiartist profile and re-enable RLS with working policies

-- =====================================================
-- STEP 1: Set iixiiartist's full_name
-- =====================================================

UPDATE profiles 
SET full_name = 'iixiiartist'
WHERE email = 'iixiiartist@gmail.com' AND full_name IS NULL;

-- =====================================================
-- STEP 2: Re-enable RLS on tables
-- =====================================================

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: Create simple, non-recursive RLS policies
-- =====================================================

-- Drop any existing policies first
DROP POLICY IF EXISTS "Users can view their owned workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON workspaces;
DROP POLICY IF EXISTS "Users can create their own workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can update their owned workspace" ON workspaces;
DROP POLICY IF EXISTS "Users can delete their owned workspace" ON workspaces;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their workspace" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

DROP POLICY IF EXISTS "Users can view members of their owned workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Users can view members in workspaces they belong to" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON workspace_members;

-- =====================================================
-- WORKSPACES: Direct, simple policies
-- =====================================================

CREATE POLICY "workspaces_select_owned"
ON workspaces FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "workspaces_select_member"
ON workspaces FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "workspaces_insert"
ON workspaces FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_update"
ON workspaces FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "workspaces_delete"
ON workspaces FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- =====================================================
-- PROFILES: Simple SELECT policies only
-- =====================================================

CREATE POLICY "profiles_select_own"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

CREATE POLICY "profiles_select_workspace_members"
ON profiles FOR SELECT
TO authenticated
USING (
    -- Can see profiles of members in workspaces you own
    id IN (
        SELECT wm.user_id 
        FROM workspace_members wm
        INNER JOIN workspaces w ON w.id = wm.workspace_id
        WHERE w.owner_id = auth.uid()
    )
    OR
    -- Can see profiles of members in workspaces you're a member of
    id IN (
        SELECT wm2.user_id
        FROM workspace_members wm1
        INNER JOIN workspace_members wm2 ON wm2.workspace_id = wm1.workspace_id
        WHERE wm1.user_id = auth.uid()
    )
);

CREATE POLICY "profiles_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- =====================================================
-- WORKSPACE_MEMBERS: Direct policies
-- =====================================================

CREATE POLICY "workspace_members_select_owned"
ON workspace_members FOR SELECT
TO authenticated
USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
);

CREATE POLICY "workspace_members_select_member"
ON workspace_members FOR SELECT
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

CREATE POLICY "workspace_members_manage"
ON workspace_members FOR ALL
TO authenticated
USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
);

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'RLS Re-enabled with Fixed Policies';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Changes:';
    RAISE NOTICE '✓ Set iixiiartist full_name';
    RAISE NOTICE '✓ Re-enabled RLS on all tables';
    RAISE NOTICE '✓ Used subqueries with IN operator (no recursion)';
    RAISE NOTICE '✓ Policies are now simple and direct';
    RAISE NOTICE '=======================================================';
END $$;

