-- Fix RLS policies for task_comments to allow workspace owners
-- Issue: Workspace owners are not in workspace_members table, so they can't comment

-- RLS Policy: Workspace members AND owners can view comments
DROP POLICY IF EXISTS "Workspace members can view task comments" ON task_comments;
CREATE POLICY "Workspace members can view task comments"
  ON task_comments FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- RLS Policy: Workspace members AND owners can insert comments
DROP POLICY IF EXISTS "Workspace members can insert comments" ON task_comments;
CREATE POLICY "Workspace members can insert comments"
  ON task_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
      UNION
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Users can update their own comments (no change needed)
-- Users can delete their own comments (no change needed)

-- Also add a policy for workspace owners to delete any comment in their workspace
DROP POLICY IF EXISTS "Workspace owners can delete any comment" ON task_comments;
CREATE POLICY "Workspace owners can delete any comment"
  ON task_comments FOR DELETE
  USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );
