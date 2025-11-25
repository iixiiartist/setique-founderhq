-- Audit Log Security Hardening
-- Migration: 20251125_audit_security.sql
-- Purpose: Tighten RLS policies, add retention, redact PII

-- ============================================================================
-- 1. UPDATE RLS POLICIES - RESTRICT TO ADMINS ONLY
-- ============================================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can insert audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Workspace members can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Users can view audit logs in their workspace" ON audit_logs;

-- Only workspace owners can view audit logs (admin role not yet available)
CREATE POLICY "Workspace admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role = 'owner'
        )
    );

-- No direct insert policy - only triggers/service role can insert
-- This prevents users from injecting fake audit entries

-- ============================================================================
-- 2. CREATE SAFE VIEW WITH REDACTED DATA
-- ============================================================================

CREATE OR REPLACE VIEW audit_logs_safe AS
SELECT
    id,
    workspace_id,
    user_id,
    entity_type,
    entity_id,
    action,
    -- Redact sensitive fields from old_values
    CASE 
        WHEN old_values IS NULL THEN NULL
        WHEN old_values ? 'password' THEN old_values - 'password' || '{"password": "[REDACTED]"}'::jsonb
        WHEN old_values ? 'api_key' THEN old_values - 'api_key' || '{"api_key": "[REDACTED]"}'::jsonb
        WHEN old_values ? 'secret' THEN old_values - 'secret' || '{"secret": "[REDACTED]"}'::jsonb
        WHEN old_values ? 'token' THEN old_values - 'token' || '{"token": "[REDACTED]"}'::jsonb
        ELSE old_values
    END as old_values,
    -- Redact sensitive fields from new_values
    CASE 
        WHEN new_values IS NULL THEN NULL
        WHEN new_values ? 'password' THEN new_values - 'password' || '{"password": "[REDACTED]"}'::jsonb
        WHEN new_values ? 'api_key' THEN new_values - 'api_key' || '{"api_key": "[REDACTED]"}'::jsonb
        WHEN new_values ? 'secret' THEN new_values - 'secret' || '{"secret": "[REDACTED]"}'::jsonb
        WHEN new_values ? 'token' THEN new_values - 'token' || '{"token": "[REDACTED]"}'::jsonb
        ELSE new_values
    END as new_values,
    -- Hash IP address for privacy (keep for correlation, not identification)
    CASE 
        WHEN ip_address IS NOT NULL 
        THEN encode(sha256(ip_address::text::bytea), 'hex')
        ELSE NULL
    END as ip_hash,
    -- Don't expose user_agent (PII concern)
    created_at
FROM audit_logs;

-- Grant access to the safe view
GRANT SELECT ON audit_logs_safe TO authenticated;

-- ============================================================================
-- 3. RETENTION CLEANUP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS TABLE(deleted_count INTEGER, oldest_remaining TIMESTAMPTZ) AS $$
DECLARE
    _deleted INTEGER;
    _oldest TIMESTAMPTZ;
BEGIN
    -- Delete logs older than 90 days
    DELETE FROM audit_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS _deleted = ROW_COUNT;
    
    -- Get the oldest remaining log
    SELECT MIN(created_at) INTO _oldest FROM audit_logs;
    
    RETURN QUERY SELECT _deleted, _oldest;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Only service role can execute cleanup
REVOKE ALL ON FUNCTION cleanup_old_audit_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs() TO service_role;

-- ============================================================================
-- 4. OPTIONAL: ANONYMIZE HISTORICAL IP ADDRESSES
-- ============================================================================

-- Run this once to hash existing IP addresses (optional, one-time migration)
-- UPDATE audit_logs 
-- SET ip_address = NULL 
-- WHERE created_at < NOW() - INTERVAL '30 days';

-- ============================================================================
-- 5. ADD INDEX FOR RETENTION QUERIES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
