-- Allow workspace members to view each other's profiles
-- This is needed for activity feed, task assignments, and comments to show user names

-- Add policy for workspace members to see each other's profiles
DROP POLICY IF EXISTS "workspace_members_can_view_profiles" ON profiles;

CREATE POLICY "workspace_members_can_view_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Users can see profiles of other users in their workspaces
    id IN (
      SELECT DISTINCT wm.user_id
      FROM workspace_members wm
      WHERE wm.workspace_id IN (
        -- Get all workspaces the current user is a member of
        SELECT workspace_id 
        FROM workspace_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Add comment
COMMENT ON POLICY "workspace_members_can_view_profiles" ON profiles IS 'Allows workspace members to view profiles of other members in their workspaces';

