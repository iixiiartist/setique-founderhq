-- Create background_agent_jobs table for tracking AI agent background tasks
-- This allows users to start agent jobs and continue working while they run

CREATE TABLE IF NOT EXISTS background_agent_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Agent configuration
  agent_slug TEXT NOT NULL,
  
  -- Job input parameters
  target TEXT NOT NULL,
  goal TEXT NOT NULL,
  notes TEXT,
  urls TEXT[],
  input_prompt TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  
  -- Job status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  error_message TEXT,
  
  -- Result data (populated when completed)
  output TEXT,
  sources JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  report_id UUID REFERENCES agent_reports(id) ON DELETE SET NULL, -- Link to saved report
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Notification settings
  notify_on_complete BOOLEAN DEFAULT TRUE,
  notified_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_background_agent_jobs_workspace_id ON background_agent_jobs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_background_agent_jobs_user_id ON background_agent_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_background_agent_jobs_status ON background_agent_jobs(status);
CREATE INDEX IF NOT EXISTS idx_background_agent_jobs_created_at ON background_agent_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_background_agent_jobs_pending ON background_agent_jobs(status) WHERE status IN ('pending', 'running');

-- Enable RLS
ALTER TABLE background_agent_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own jobs
CREATE POLICY "Users can view their own agent jobs"
  ON background_agent_jobs FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert jobs for their workspaces
CREATE POLICY "Users can create agent jobs in their workspace"
  ON background_agent_jobs FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update their own jobs
CREATE POLICY "Users can update their own agent jobs"
  ON background_agent_jobs FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can delete their own jobs
CREATE POLICY "Users can delete their own agent jobs"
  ON background_agent_jobs FOR DELETE
  USING (user_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_background_agent_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS background_agent_jobs_updated_at ON background_agent_jobs;
CREATE TRIGGER background_agent_jobs_updated_at
  BEFORE UPDATE ON background_agent_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_background_agent_jobs_updated_at();

-- Enable realtime for job status updates
ALTER PUBLICATION supabase_realtime ADD TABLE background_agent_jobs;

-- Grant permissions
GRANT ALL ON background_agent_jobs TO authenticated;

-- Add agent job notification types to notifications table if not exists
DO $$
BEGIN
  -- Add new notification types for agent jobs
  -- The notifications table should already exist, this just ensures the types are supported
  RAISE NOTICE 'background_agent_jobs table created successfully!';
  RAISE NOTICE 'Remember to add agent_job_completed and agent_job_failed to your NotificationType enum in the codebase.';
END $$;

-- Comments for documentation
COMMENT ON TABLE background_agent_jobs IS 'Tracks AI agent jobs running in the background so users can continue working while waiting for results';
COMMENT ON COLUMN background_agent_jobs.status IS 'Job status: pending (queued), running (in progress), completed (success), failed (error), cancelled (user cancelled)';
COMMENT ON COLUMN background_agent_jobs.report_id IS 'Links to the auto-saved agent_reports entry when job completes successfully';
COMMENT ON COLUMN background_agent_jobs.notify_on_complete IS 'Whether to send a notification when the job finishes';
