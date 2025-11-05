-- Final fix: Ultra-simple RLS policies with zero recursion risk
-- The issue is that even IN subqueries can cause recursion in Supabase's RLS engine

-- =====================================================
-- STEP 1: Drop ALL existing policies completely
-- =====================================================

DROP POLICY IF EXISTS "workspaces_select_owned" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select_member" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;

DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_workspace_members" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;

DROP POLICY IF EXISTS "workspace_members_select_owned" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_member" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_manage" ON workspace_members;

-- =====================================================
-- STEP 2: WORKSPACES - Only direct auth.uid() checks
-- =====================================================

-- Owner can see their workspace
CREATE POLICY "workspace_owner_select"
ON workspaces FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

-- Owner can insert (one workspace only enforced by unique constraint)
CREATE POLICY "workspace_owner_insert"
ON workspaces FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Owner can update their workspace
CREATE POLICY "workspace_owner_update"
ON workspaces FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Owner can delete their workspace
CREATE POLICY "workspace_owner_delete"
ON workspaces FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- =====================================================
-- STEP 3: WORKSPACE_MEMBERS - Only auth.uid() checks
-- =====================================================

-- Members can see where they are a member
CREATE POLICY "member_select_own"
ON workspace_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Anyone can insert themselves (will be used for invitations)
CREATE POLICY "member_insert_self"
ON workspace_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Can only delete yourself
CREATE POLICY "member_delete_self"
ON workspace_members FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- STEP 4: PROFILES - Only auth.uid() checks (no joins!)
-- =====================================================

-- Can see own profile
CREATE POLICY "profile_select_own"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Can update own profile
CREATE POLICY "profile_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Can insert own profile
CREATE POLICY "profile_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- =====================================================
-- STEP 5: Create SECURITY DEFINER functions for safe joins
-- (These bypass RLS so queries can join without recursion)
-- =====================================================

-- Function to get workspace members WITH profiles
CREATE OR REPLACE FUNCTION get_workspace_members_with_profiles(workspace_uuid UUID)
RETURNS TABLE (
    id UUID,
    workspace_id UUID,
    user_id UUID,
    role TEXT,
    joined_at TIMESTAMPTZ,
    invited_by UUID,
    profile_id UUID,
    profile_email TEXT,
    profile_full_name TEXT,
    profile_avatar_url TEXT
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if user has access to this workspace (owner or member)
    IF NOT EXISTS (
        SELECT 1 FROM workspaces WHERE id = workspace_uuid AND owner_id = auth.uid()
    ) AND NOT EXISTS (
        SELECT 1 FROM workspace_members WHERE workspace_id = workspace_uuid AND user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied to workspace';
    END IF;

    -- Return members with their profiles
    RETURN QUERY
    SELECT 
        wm.id,
        wm.workspace_id,
        wm.user_id,
        wm.role,
        wm.joined_at,
        wm.invited_by,
        p.id as profile_id,
        p.email as profile_email,
        p.full_name as profile_full_name,
        p.avatar_url as profile_avatar_url
    FROM workspace_members wm
    LEFT JOIN profiles p ON p.id = wm.user_id
    WHERE wm.workspace_id = workspace_uuid
    ORDER BY wm.joined_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_workspace_members_with_profiles(UUID) TO authenticated;

-- Function to get workspace for member (member access)
CREATE OR REPLACE FUNCTION get_member_workspace()
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    name TEXT,
    plan_type TEXT,
    owner_id UUID,
    ai_calls_used INTEGER,
    ai_calls_limit INTEGER,
    storage_used_mb INTEGER,
    storage_limit_mb INTEGER,
    file_count INTEGER,
    file_limit INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Return workspace where user is a member (not owner)
    RETURN QUERY
    SELECT w.*
    FROM workspaces w
    INNER JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = auth.uid()
    AND w.owner_id != auth.uid()
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_workspace() TO authenticated;

-- =====================================================
-- SUMMARY
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Final RLS Fix: Zero Recursion';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Strategy:';
    RAISE NOTICE '• RLS policies ONLY check auth.uid() directly';
    RAISE NOTICE '• NO joins in policies (no recursion possible)';
    RAISE NOTICE '• SECURITY DEFINER functions for safe cross-table queries';
    RAISE NOTICE '• Code must use RPC functions for member/profile data';
    RAISE NOTICE '=======================================================';
END $$;

