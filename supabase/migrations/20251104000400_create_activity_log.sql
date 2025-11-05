-- Create activity_log table for team activity tracking
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'task_created', 'task_completed', 'task_assigned', 'crm_contact_added', etc.
  entity_type TEXT NOT NULL, -- 'task', 'crm_contact', 'document', etc.
  entity_id UUID, -- ID of the entity being acted upon
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context (task name, assignee name, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Add comment
COMMENT ON TABLE activity_log IS 'Tracks team member actions for activity feed';

-- Enable RLS
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Workspace members can view all workspace activities
DROP POLICY IF EXISTS "Workspace members can view workspace activities" ON activity_log;
CREATE POLICY "Workspace members can view workspace activities"
  ON activity_log FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert their own activities
DROP POLICY IF EXISTS "Users can insert their own activities" ON activity_log;
CREATE POLICY "Users can insert their own activities"
  ON activity_log FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON activity_log TO authenticated;

