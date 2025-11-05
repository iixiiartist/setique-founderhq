-- Fix the profiles RLS policy to work correctly for all workspace members
-- The previous policy had inverted logic

-- Drop the incorrect policy
DROP POLICY IF EXISTS "workspace_members_can_view_profiles" ON profiles;

-- Create correct policy: if you're in a workspace, you can see profiles of all members in that workspace
CREATE POLICY "workspace_members_can_view_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    -- Users can always see their own profile
    id = auth.uid()
    OR
    -- Users can see profiles of other members in their shared workspaces
    EXISTS (
      SELECT 1
      FROM workspace_members wm1
      INNER JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()  -- Current user is a member
      AND wm2.user_id = profiles.id   -- The profile being viewed is also a member
    )
  );

-- Add comment
COMMENT ON POLICY "workspace_members_can_view_profiles" ON profiles IS 'Allows workspace members to view profiles of other members in shared workspaces';

