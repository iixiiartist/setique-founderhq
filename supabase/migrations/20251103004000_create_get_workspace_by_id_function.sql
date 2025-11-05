-- Drop existing function if it exists (to allow recreating with different signature)
DROP FUNCTION IF EXISTS get_workspace_by_id_for_member(UUID);

-- Create a function to get workspace details by ID for members (bypasses RLS)
-- This is needed so that workspace members can see the basic workspace info
-- including the owner_id to fetch team member details

CREATE OR REPLACE FUNCTION get_workspace_by_id_for_member(workspace_uuid UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  owner_id UUID,
  plan TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user is either the owner or a member of this workspace
  IF NOT EXISTS (
    SELECT 1 FROM workspaces w
    WHERE w.id = workspace_uuid
    AND w.owner_id = auth.uid()
  ) AND NOT EXISTS (
    SELECT 1 FROM workspace_members wm
    WHERE wm.workspace_id = workspace_uuid
    AND wm.user_id = auth.uid()
  ) THEN
    -- User has no access to this workspace
    RETURN;
  END IF;

  -- Return the workspace details
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.owner_id,
    w.plan,
    w.created_at,
    w.updated_at
  FROM workspaces w
  WHERE w.id = workspace_uuid;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_workspace_by_id_for_member(UUID) TO authenticated;

COMMENT ON FUNCTION get_workspace_by_id_for_member IS 'Allows workspace members to view basic workspace information including owner_id, bypassing RLS policies';

