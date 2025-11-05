-- Fix multiple issues with member access and profile creation
-- Migration: 20251103022000_fix_member_access_and_profiles.sql

-- =====================================================
-- Fix 1: Fix get_member_workspace function type mismatch
-- =====================================================

DROP FUNCTION IF EXISTS get_member_workspace();

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
    SELECT 
        w.id,
        w.created_at,
        w.updated_at,
        w.name,
        w.plan_type::text,  -- Cast enum to text
        w.owner_id,
        w.ai_calls_used,
        w.ai_calls_limit,
        w.storage_used_mb,
        w.storage_limit_mb,
        w.file_count,
        w.file_limit
    FROM workspaces w
    INNER JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = auth.uid()
    AND w.owner_id != auth.uid()
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_workspace() TO authenticated;

-- =====================================================
-- Fix 2: Ensure profiles table has proper policies
-- =====================================================

-- Drop existing profile policies
DROP POLICY IF EXISTS "profile_select_own" ON profiles;
DROP POLICY IF EXISTS "profile_update_own" ON profiles;
DROP POLICY IF EXISTS "profile_insert_own" ON profiles;

-- Users can always read their own profile
CREATE POLICY "profile_select_own"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "profile_update_own"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid());

-- Users can insert their own profile (for manual creation if trigger fails)
CREATE POLICY "profile_insert_own"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- =====================================================
-- Fix 3: Allow workspace owners to manage members
-- =====================================================

-- Drop and recreate workspace_members policies
DROP POLICY IF EXISTS "member_select_own" ON workspace_members;
DROP POLICY IF EXISTS "member_insert_self" ON workspace_members;
DROP POLICY IF EXISTS "member_delete_self" ON workspace_members;

-- Members can see where they are a member
CREATE POLICY "member_select_own"
ON workspace_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Owners can insert members into their workspace
CREATE POLICY "owner_insert_members"
ON workspace_members FOR INSERT
TO authenticated
WITH CHECK (
    -- Check if the current user owns the workspace
    EXISTS (
        SELECT 1 FROM workspaces 
        WHERE workspaces.id = workspace_members.workspace_id 
        AND workspaces.owner_id = auth.uid()
    )
);

-- Users can insert themselves as members (accepting invitations)
CREATE POLICY "member_insert_self"
ON workspace_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Owners can delete members from their workspace
CREATE POLICY "owner_delete_members"
ON workspace_members FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces 
        WHERE workspaces.id = workspace_members.workspace_id 
        AND workspaces.owner_id = auth.uid()
    )
);

-- Members can delete themselves
CREATE POLICY "member_delete_self"
ON workspace_members FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- =====================================================
-- Fix 4: Workspace invitations policies
-- =====================================================

-- Drop existing invitation policies
DROP POLICY IF EXISTS "invitations_select_own" ON workspace_invitations;
DROP POLICY IF EXISTS "invitations_insert" ON workspace_invitations;
DROP POLICY IF EXISTS "invitations_update" ON workspace_invitations;
DROP POLICY IF EXISTS "invitations_delete" ON workspace_invitations;

-- Users can see invitations sent to their email
CREATE POLICY "invitations_select_own"
ON workspace_invitations FOR SELECT
TO authenticated
USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR invited_by = auth.uid()
);

-- Workspace owners can create invitations
CREATE POLICY "invitations_insert_owner"
ON workspace_invitations FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspaces 
        WHERE workspaces.id = workspace_invitations.workspace_id 
        AND workspaces.owner_id = auth.uid()
    )
);

-- Users can update their own invitations (accepting/rejecting)
CREATE POLICY "invitations_update_own"
ON workspace_invitations FOR UPDATE
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- Owners can delete invitations they created
CREATE POLICY "invitations_delete_owner"
ON workspace_invitations FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces 
        WHERE workspaces.id = workspace_invitations.workspace_id 
        AND workspaces.owner_id = auth.uid()
    )
);

-- Verification
DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Fixed: Member Access and Profile Issues';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '✓ Fixed get_member_workspace function (cast plan_type)';
    RAISE NOTICE '✓ Added proper profile RLS policies';
    RAISE NOTICE '✓ Added workspace member management policies';
    RAISE NOTICE '✓ Added invitation policies for owners';
    RAISE NOTICE '=======================================================';
END $$;

