-- Create ai_tool_executions table for tool call idempotency and audit logging
-- This table prevents duplicate tool executions and provides an audit trail

CREATE TABLE IF NOT EXISTS ai_tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_call_hash VARCHAR(64) NOT NULL UNIQUE, -- SHA-256 hash of request_id + tool_name + arguments
  request_id UUID NOT NULL, -- Links to the AI request
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_name VARCHAR(100) NOT NULL,
  tool_arguments JSONB, -- The arguments passed to the tool
  result JSONB, -- The result returned by the tool
  success BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT fk_workspace FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
);

-- Index for looking up by hash (idempotency check)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_tool_executions_hash ON ai_tool_executions(tool_call_hash);

-- Index for audit queries by workspace
CREATE INDEX IF NOT EXISTS idx_ai_tool_executions_workspace ON ai_tool_executions(workspace_id, created_at DESC);

-- Index for audit queries by user
CREATE INDEX IF NOT EXISTS idx_ai_tool_executions_user ON ai_tool_executions(user_id, created_at DESC);

-- Index for request correlation
CREATE INDEX IF NOT EXISTS idx_ai_tool_executions_request ON ai_tool_executions(request_id);

-- RLS policies
ALTER TABLE ai_tool_executions ENABLE ROW LEVEL SECURITY;

-- Workspace members can view their workspace's tool executions
CREATE POLICY "Workspace members can view tool executions"
  ON ai_tool_executions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.workspace_id = ai_tool_executions.workspace_id
      AND wm.user_id = auth.uid()
    )
  );

-- Only service role can insert (Edge Functions use supabaseAdmin with service role)
-- SECURITY: Block direct authenticated user inserts - all writes go through Edge Functions
CREATE POLICY "Service role only can insert tool executions"
  ON ai_tool_executions
  FOR INSERT
  WITH CHECK (
    -- This evaluates to FALSE for authenticated users, TRUE for service_role
    -- Service role bypasses RLS entirely, so only authenticated users hit this check
    false
  );

-- Comment explaining the table
COMMENT ON TABLE ai_tool_executions IS 'Stores AI tool call executions for idempotency (preventing duplicate creates) and audit logging';
COMMENT ON COLUMN ai_tool_executions.tool_call_hash IS 'SHA-256 hash of workspace_id + room_id + tool_name + arguments for idempotency (excludes requestId to dedupe retries)';
COMMENT ON COLUMN ai_tool_executions.request_id IS 'The AI request UUID that triggered this tool call';
