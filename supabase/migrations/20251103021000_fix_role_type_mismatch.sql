-- Fix type mismatch: workspace_role enum needs to be cast to text
-- Migration: 20251103021000_fix_role_type_mismatch.sql

DROP FUNCTION IF EXISTS get_workspace_members_with_profiles(UUID);

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
        SELECT 1 FROM workspaces WHERE workspaces.id = workspace_uuid AND workspaces.owner_id = auth.uid()
    ) AND NOT EXISTS (
        SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = workspace_uuid AND workspace_members.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied to workspace';
    END IF;

    -- Return members with their profiles (cast enum to text)
    RETURN QUERY
    SELECT 
        wm.id as id,
        wm.workspace_id as workspace_id,
        wm.user_id as user_id,
        wm.role::text as role,  -- Cast workspace_role enum to text
        wm.joined_at as joined_at,
        wm.invited_by as invited_by,
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

-- Verification
DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Fixed: Type Mismatch in RPC Function';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '✓ Cast workspace_role enum to text (wm.role::text)';
    RAISE NOTICE '✓ Function now returns TEXT instead of workspace_role';
    RAISE NOTICE '=======================================================';
END $$;

