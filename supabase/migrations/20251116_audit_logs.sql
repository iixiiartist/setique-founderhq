-- Migration: Add audit logs table
-- Date: 2025-11-16
-- Purpose: Track CRM mutations for compliance and debugging

-- Create enum for action types
CREATE TYPE audit_action AS ENUM ('create', 'update', 'delete', 'restore');

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- What was changed
    entity_type TEXT NOT NULL, -- 'crm_item', 'contact', 'task', etc.
    entity_id UUID NOT NULL,
    action audit_action NOT NULL,
    
    -- Change details
    old_values JSONB,
    new_values JSONB,
    
    -- Metadata
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);

-- Row Level Security
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can only read audit logs for their workspace
CREATE POLICY "Users can view audit logs for their workspace"
    ON audit_logs FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Only service role can insert audit logs (triggered by functions)
CREATE POLICY "Service role can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);

-- Function to log CRM item changes
CREATE OR REPLACE FUNCTION log_crm_audit()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert audit log
    INSERT INTO audit_logs (
        workspace_id,
        user_id,
        entity_type,
        entity_id,
        action,
        old_values,
        new_values
    ) VALUES (
        COALESCE(NEW.workspace_id, OLD.workspace_id),
        COALESCE(NEW.user_id, OLD.user_id, auth.uid()),
        'crm_item',
        COALESCE(NEW.id, OLD.id),
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'create'::audit_action
            WHEN TG_OP = 'UPDATE' THEN 'update'::audit_action
            WHEN TG_OP = 'DELETE' THEN 'delete'::audit_action
        END,
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on crm_items
DROP TRIGGER IF EXISTS audit_crm_items ON crm_items;
CREATE TRIGGER audit_crm_items
    AFTER INSERT OR UPDATE OR DELETE ON crm_items
    FOR EACH ROW
    EXECUTE FUNCTION log_crm_audit();

-- Grant necessary permissions
GRANT SELECT ON audit_logs TO authenticated;

-- Add comment
COMMENT ON TABLE audit_logs IS 
'Audit trail for all CRM mutations. Tracks create, update, delete operations with full before/after values.';
