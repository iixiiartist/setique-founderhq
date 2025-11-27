-- Create agent_reports table to store Research Agent outputs for later reference
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS agent_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_slug TEXT NOT NULL DEFAULT 'research_briefing',
  
  -- Research parameters
  target TEXT NOT NULL,
  goal TEXT NOT NULL,
  notes TEXT,
  urls TEXT[],
  
  -- Response data
  output TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_agent_reports_workspace_id ON agent_reports(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agent_reports_user_id ON agent_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_reports_created_at ON agent_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_reports_agent_slug ON agent_reports(agent_slug);

-- Enable RLS
ALTER TABLE agent_reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view reports in their workspace
CREATE POLICY "Users can view workspace agent reports"
  ON agent_reports FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can insert reports in their workspace
CREATE POLICY "Users can create agent reports"
  ON agent_reports FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
    AND user_id = auth.uid()
  );

-- Policy: Users can delete their own reports
CREATE POLICY "Users can delete their own reports"
  ON agent_reports FOR DELETE
  USING (
    user_id = auth.uid()
    OR workspace_id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_agent_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS agent_reports_updated_at ON agent_reports;
CREATE TRIGGER agent_reports_updated_at
  BEFORE UPDATE ON agent_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_reports_updated_at();

-- Grant permissions
GRANT ALL ON agent_reports TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'agent_reports table created successfully!';
END $$;
