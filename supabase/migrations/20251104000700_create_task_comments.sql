-- Create task_comments table for threaded task discussions
CREATE TABLE IF NOT EXISTS task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  mentions TEXT[] DEFAULT ARRAY[]::TEXT[], -- Array of mentioned user IDs
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_workspace_id ON task_comments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at DESC);

-- Add comment
COMMENT ON TABLE task_comments IS 'Comments and discussions on tasks with @mention support';

-- Enable RLS
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Workspace members can view comments on workspace tasks
DROP POLICY IF EXISTS "Workspace members can view task comments" ON task_comments;
CREATE POLICY "Workspace members can view task comments"
  ON task_comments FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Workspace members can insert comments
DROP POLICY IF EXISTS "Workspace members can insert comments" ON task_comments;
CREATE POLICY "Workspace members can insert comments"
  ON task_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own comments
DROP POLICY IF EXISTS "Users can update their own comments" ON task_comments;
CREATE POLICY "Users can update their own comments"
  ON task_comments FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete their own comments" ON task_comments;
CREATE POLICY "Users can delete their own comments"
  ON task_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_comment_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_task_comment_updated_at ON task_comments;
CREATE TRIGGER trigger_update_task_comment_updated_at
  BEFORE UPDATE ON task_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_task_comment_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON task_comments TO authenticated;

