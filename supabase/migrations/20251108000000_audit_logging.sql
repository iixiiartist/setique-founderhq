-- Migration: Add database-level audit logging for critical tables
-- Created: 2025-11-08
-- Description: Creates audit schema and triggers for immutable audit trail of critical operations

-- Create audit schema
CREATE SCHEMA IF NOT EXISTS audit;

-- Audit log table for critical operations
CREATE TABLE IF NOT EXISTS audit.operation_log (
  id BIGSERIAL PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  user_id UUID,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_table_name ON audit.operation_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit.operation_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit.operation_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_operation ON audit.operation_log(operation);

-- Enable RLS (only workspace owners can read audit logs)
ALTER TABLE audit.operation_log ENABLE ROW LEVEL SECURITY;

-- Policy: Only workspace owners can view audit logs
CREATE POLICY "workspace_owners_can_view_audit_logs"
  ON audit.operation_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm
      WHERE wm.user_id = auth.uid()
        AND wm.role = 'owner'
    )
  );

-- Audit trigger function
CREATE OR REPLACE FUNCTION audit.log_operation()
RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[];
BEGIN
  -- Calculate changed fields for UPDATEs
  IF TG_OP = 'UPDATE' THEN
    SELECT array_agg(key)
    INTO changed_fields
    FROM jsonb_each(to_jsonb(NEW))
    WHERE to_jsonb(NEW)->key IS DISTINCT FROM to_jsonb(OLD)->key;
  END IF;

  -- Insert audit record
  INSERT INTO audit.operation_log (
    table_name,
    operation,
    user_id,
    old_data,
    new_data,
    changed_fields,
    ip_address
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    auth.uid(),
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END,
    changed_fields,
    inet_client_addr()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to critical tables

-- Workspaces: Track all workspace creation, updates, and deletions
CREATE TRIGGER audit_workspaces
  AFTER INSERT OR UPDATE OR DELETE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION audit.log_operation();

-- Workspace Members: Track membership changes (critical for access control)
CREATE TRIGGER audit_workspace_members
  AFTER INSERT OR UPDATE OR DELETE ON workspace_members
  FOR EACH ROW EXECUTE FUNCTION audit.log_operation();

-- Subscriptions: Track all billing changes (critical for revenue)
CREATE TRIGGER audit_subscriptions
  AFTER INSERT OR UPDATE OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION audit.log_operation();

-- Business Profile: Track changes to company information
CREATE TRIGGER audit_business_profile
  AFTER INSERT OR UPDATE OR DELETE ON business_profile
  FOR EACH ROW EXECUTE FUNCTION audit.log_operation();

-- Workspace Invitations: Track invitation lifecycle
CREATE TRIGGER audit_workspace_invitations
  AFTER INSERT OR UPDATE OR DELETE ON workspace_invitations
  FOR EACH ROW EXECUTE FUNCTION audit.log_operation();

-- Add helpful comments
COMMENT ON SCHEMA audit IS 'Database-level audit logging for security and compliance';
COMMENT ON TABLE audit.operation_log IS 'Immutable audit log for critical database operations. Never delete records from this table.';
COMMENT ON FUNCTION audit.log_operation() IS 'Trigger function that logs all INSERT, UPDATE, DELETE operations with full change history';

-- Grant permissions
GRANT USAGE ON SCHEMA audit TO authenticated;
GRANT SELECT ON audit.operation_log TO authenticated;
