-- Fix notifications INSERT policy to allow workspace members to create notifications for each other
-- Drop the old policy
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;

-- Create new policy: Users can insert notifications for other users in their shared workspaces
CREATE POLICY "Users can create notifications for workspace members"
  ON notifications
  FOR INSERT
  WITH CHECK (
    -- Allow if the creator is a member of the same workspace as the recipient
    EXISTS (
      SELECT 1 FROM workspace_members wm1
      JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()
        AND wm2.user_id = notifications.user_id
        AND wm1.workspace_id = notifications.workspace_id
    )
  );
