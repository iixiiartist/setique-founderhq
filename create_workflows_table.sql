-- Create workflows table for automated workflow engine
-- Run this in Supabase SQL Editor

-- Workflows table
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    enabled BOOLEAN DEFAULT true,
    trigger JSONB NOT NULL,
    actions JSONB[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Workflow executions table (for tracking history)
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    trigger_data JSONB,
    status TEXT NOT NULL DEFAULT 'success', -- 'success', 'failed', 'running'
    error TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_workflows_workspace ON workflows(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workflows_enabled ON workflows(enabled);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_workflow ON workflow_executions(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_executions_executed_at ON workflow_executions(executed_at DESC);

-- Enable Row Level Security
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflows
CREATE POLICY "Users can view workflows in their workspace"
    ON workflows FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create workflows in their workspace"
    ON workflows FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update workflows in their workspace"
    ON workflows FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete workflows in their workspace"
    ON workflows FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members
            WHERE user_id = auth.uid()
        )
    );

-- RLS Policies for workflow_executions
CREATE POLICY "Users can view workflow executions in their workspace"
    ON workflow_executions FOR SELECT
    USING (
        workflow_id IN (
            SELECT id FROM workflows
            WHERE workspace_id IN (
                SELECT workspace_id FROM workspace_members
                WHERE user_id = auth.uid()
            )
        )
    );

-- Update trigger for workflows
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_workflows_updated_at ON workflows;
CREATE TRIGGER update_workflows_updated_at
    BEFORE UPDATE ON workflows
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON workflows TO authenticated;
GRANT ALL ON workflow_executions TO authenticated;
