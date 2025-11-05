-- Create a SECURITY DEFINER function to get workspace details for members
-- This bypasses RLS so members can see workspace details they have membership to

CREATE OR REPLACE FUNCTION get_workspace_by_id_for_member(workspace_uuid UUID)
RETURNS SETOF workspaces
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if the current user is a member or owner of this workspace
    IF EXISTS (
        SELECT 1 FROM workspace_members 
        WHERE workspace_id = workspace_uuid 
        AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM workspaces
        WHERE id = workspace_uuid
        AND owner_id = auth.uid()
    ) THEN
        -- Return the workspace details
        RETURN QUERY
        SELECT * FROM workspaces WHERE id = workspace_uuid;
    END IF;
    
    -- If not authorized, return nothing
    RETURN;
END;
$$;

