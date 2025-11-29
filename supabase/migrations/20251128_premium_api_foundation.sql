-- Migration: Premium API Foundation
-- Date: 2025-11-28
-- Purpose: API keys, request logging, and rate limiting infrastructure
-- Phase 1 of Premium API implementation

-- ============================================
-- 0. HELPER FUNCTION (if not exists)
-- ============================================
-- is_workspace_member: checks if current user is owner or member of a workspace
-- This function may already exist from earlier migrations, so we use CREATE OR REPLACE

CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- Check if user is workspace owner
    SELECT 1 FROM workspaces
    WHERE id = workspace_uuid AND owner_id = auth.uid()
    UNION
    -- Check if user is invited member
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION is_workspace_member(UUID) IS 'Returns true if current user is owner or member of the workspace';

-- ============================================
-- 1. API KEYS TABLE
-- ============================================
-- Stores hashed API keys with scopes and rate limits

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    
    -- Key identification
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,           -- SHA-256 hash of the actual key
    key_prefix TEXT NOT NULL,         -- First 8 chars for display "fhq_live_abc..."
    
    -- Permissions
    scopes TEXT[] NOT NULL DEFAULT '{}',
    -- Available scopes:
    -- 'contacts:read', 'contacts:write'
    -- 'tasks:read', 'tasks:write'
    -- 'deals:read', 'deals:write'
    -- 'documents:read', 'documents:write'
    -- 'crm:read', 'crm:write'
    -- 'agents:run'
    -- 'webhooks:manage'
    -- 'context:read'
    
    -- Rate limiting
    rate_limit_tier TEXT NOT NULL DEFAULT 'standard',
    -- Tiers: 'standard' (100/min), 'elevated' (500/min), 'unlimited'
    requests_per_minute INTEGER NOT NULL DEFAULT 100,
    monthly_request_limit INTEGER,     -- NULL = unlimited
    requests_this_month INTEGER NOT NULL DEFAULT 0,
    month_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Status & metadata
    last_used_at TIMESTAMPTZ,
    last_used_ip INET,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT api_keys_key_prefix_unique UNIQUE (key_prefix),
    CONSTRAINT api_keys_rate_limit_tier_check CHECK (rate_limit_tier IN ('standard', 'elevated', 'unlimited'))
);

-- Indexes for API key lookups
CREATE INDEX IF NOT EXISTS idx_api_keys_workspace ON api_keys(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- ============================================
-- 2. API REQUEST LOG TABLE
-- ============================================
-- Tracks all API requests for analytics and billing

CREATE TABLE IF NOT EXISTS api_request_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identity
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Request details
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    path_params JSONB,
    query_params JSONB,
    
    -- Response
    status_code INTEGER,
    error_code TEXT,
    error_message TEXT,
    
    -- Performance
    response_time_ms INTEGER,
    request_size_bytes INTEGER,
    response_size_bytes INTEGER,
    
    -- Client info
    ip_address INET,
    user_agent TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partition-friendly indexes
CREATE INDEX IF NOT EXISTS idx_api_request_log_created ON api_request_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_log_key ON api_request_log(api_key_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_log_workspace ON api_request_log(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_request_log_endpoint ON api_request_log(endpoint, created_at DESC);

-- ============================================
-- 3. RATE LIMIT TRACKING TABLE
-- ============================================
-- Real-time rate limit counters (replaces in-memory)

CREATE TABLE IF NOT EXISTS api_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    api_key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
    window_start TIMESTAMPTZ NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 1,
    
    -- Unique per key per minute window
    CONSTRAINT api_rate_limits_key_window UNIQUE (api_key_id, window_start)
);

CREATE INDEX IF NOT EXISTS idx_api_rate_limits_key ON api_rate_limits(api_key_id, window_start DESC);

-- ============================================
-- 4. OUTBOUND WEBHOOKS TABLE
-- ============================================
-- For pushing events to external systems

CREATE TABLE IF NOT EXISTS api_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id),
    
    -- Webhook configuration
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    secret TEXT NOT NULL,             -- For HMAC signature verification
    
    -- Event subscriptions
    events TEXT[] NOT NULL DEFAULT '{}',
    -- Events: 'contact.created', 'contact.updated', 'contact.deleted'
    --         'task.created', 'task.updated', 'task.completed', 'task.deleted'
    --         'deal.created', 'deal.updated', 'deal.stage_changed', 'deal.won', 'deal.lost'
    --         'document.created', 'document.updated'
    
    -- Status
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_triggered_at TIMESTAMPTZ,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_webhooks_workspace ON api_webhooks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_api_webhooks_events ON api_webhooks USING GIN(events);

-- ============================================
-- 5. WEBHOOK DELIVERY LOG
-- ============================================
-- Track webhook delivery attempts

CREATE TABLE IF NOT EXISTS api_webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES api_webhooks(id) ON DELETE CASCADE,
    
    -- Event details
    event_type TEXT NOT NULL,
    event_id UUID NOT NULL,           -- ID of the entity that triggered the event
    payload JSONB NOT NULL,
    
    -- Delivery status
    status TEXT NOT NULL DEFAULT 'pending',
    -- Status: 'pending', 'delivered', 'failed', 'retrying'
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    
    -- Response
    response_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    
    -- Error tracking
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ,
    
    CONSTRAINT api_webhook_deliveries_status_check CHECK (status IN ('pending', 'delivered', 'failed', 'retrying'))
);

CREATE INDEX IF NOT EXISTS idx_api_webhook_deliveries_webhook ON api_webhook_deliveries(webhook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_webhook_deliveries_pending ON api_webhook_deliveries(status, next_retry_at) 
    WHERE status IN ('pending', 'retrying');

-- ============================================
-- 6. RLS POLICIES
-- ============================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_request_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- API Keys: Workspace members can view, owners can manage
CREATE POLICY "api_keys_select" ON api_keys FOR SELECT TO authenticated
    USING (is_workspace_member(workspace_id));

CREATE POLICY "api_keys_insert" ON api_keys FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = api_keys.workspace_id 
            AND user_id = auth.uid() 
            AND role = 'owner'
        )
    );

CREATE POLICY "api_keys_update" ON api_keys FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = api_keys.workspace_id 
            AND user_id = auth.uid() 
            AND role = 'owner'
        )
    );

CREATE POLICY "api_keys_delete" ON api_keys FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = api_keys.workspace_id 
            AND user_id = auth.uid() 
            AND role = 'owner'
        )
    );

-- Request Log: Workspace members can view
CREATE POLICY "api_request_log_select" ON api_request_log FOR SELECT TO authenticated
    USING (is_workspace_member(workspace_id));

-- Rate Limits: Service role only (accessed via Edge Functions)
CREATE POLICY "api_rate_limits_service" ON api_rate_limits FOR ALL TO service_role
    USING (true);

-- Webhooks: Workspace owners can manage
CREATE POLICY "api_webhooks_select" ON api_webhooks FOR SELECT TO authenticated
    USING (is_workspace_member(workspace_id));

CREATE POLICY "api_webhooks_insert" ON api_webhooks FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = api_webhooks.workspace_id 
            AND user_id = auth.uid() 
            AND role = 'owner'
        )
    );

CREATE POLICY "api_webhooks_update" ON api_webhooks FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = api_webhooks.workspace_id 
            AND user_id = auth.uid() 
            AND role = 'owner'
        )
    );

CREATE POLICY "api_webhooks_delete" ON api_webhooks FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = api_webhooks.workspace_id 
            AND user_id = auth.uid() 
            AND role = 'owner'
        )
    );

-- Webhook Deliveries: Workspace members can view
CREATE POLICY "api_webhook_deliveries_select" ON api_webhook_deliveries FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM api_webhooks w
            WHERE w.id = api_webhook_deliveries.webhook_id
            AND is_workspace_member(w.workspace_id)
        )
    );

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Validate API key and return key details
CREATE OR REPLACE FUNCTION validate_api_key(p_key_hash TEXT)
RETURNS TABLE (
    key_id UUID,
    workspace_id UUID,
    scopes TEXT[],
    rate_limit_tier TEXT,
    requests_per_minute INTEGER,
    is_valid BOOLEAN,
    error_message TEXT
) AS $$
DECLARE
    v_key RECORD;
BEGIN
    SELECT * INTO v_key
    FROM api_keys ak
    WHERE ak.key_hash = p_key_hash
    AND ak.is_active = true;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT 
            NULL::UUID, NULL::UUID, NULL::TEXT[], NULL::TEXT, NULL::INTEGER,
            false, 'Invalid API key'::TEXT;
        RETURN;
    END IF;
    
    -- Check expiration
    IF v_key.expires_at IS NOT NULL AND v_key.expires_at < NOW() THEN
        RETURN QUERY SELECT 
            v_key.id, v_key.workspace_id, v_key.scopes, v_key.rate_limit_tier, v_key.requests_per_minute,
            false, 'API key has expired'::TEXT;
        RETURN;
    END IF;
    
    -- Check monthly limit
    IF v_key.monthly_request_limit IS NOT NULL THEN
        -- Reset counter if new month
        IF v_key.month_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN
            UPDATE api_keys SET 
                requests_this_month = 0,
                month_reset_date = DATE_TRUNC('month', CURRENT_DATE)
            WHERE id = v_key.id;
        ELSIF v_key.requests_this_month >= v_key.monthly_request_limit THEN
            RETURN QUERY SELECT 
                v_key.id, v_key.workspace_id, v_key.scopes, v_key.rate_limit_tier, v_key.requests_per_minute,
                false, 'Monthly request limit exceeded'::TEXT;
            RETURN;
        END IF;
    END IF;
    
    -- Update last used
    UPDATE api_keys SET last_used_at = NOW() WHERE id = v_key.id;
    
    RETURN QUERY SELECT 
        v_key.id, v_key.workspace_id, v_key.scopes, v_key.rate_limit_tier, v_key.requests_per_minute,
        true, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check rate limit and increment counter
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_api_key_id UUID,
    p_requests_per_minute INTEGER
)
RETURNS TABLE (
    allowed BOOLEAN,
    current_count INTEGER,
    reset_at TIMESTAMPTZ
) AS $$
DECLARE
    v_window_start TIMESTAMPTZ;
    v_count INTEGER;
BEGIN
    -- Get current minute window
    v_window_start := DATE_TRUNC('minute', NOW());
    
    -- Upsert rate limit counter
    INSERT INTO api_rate_limits (api_key_id, window_start, request_count)
    VALUES (p_api_key_id, v_window_start, 1)
    ON CONFLICT (api_key_id, window_start)
    DO UPDATE SET request_count = api_rate_limits.request_count + 1
    RETURNING request_count INTO v_count;
    
    -- Check if over limit
    IF v_count > p_requests_per_minute THEN
        RETURN QUERY SELECT 
            false,
            v_count,
            v_window_start + INTERVAL '1 minute';
    ELSE
        RETURN QUERY SELECT 
            true,
            v_count,
            v_window_start + INTERVAL '1 minute';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Increment monthly request counter
CREATE OR REPLACE FUNCTION increment_monthly_requests(p_api_key_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE api_keys 
    SET requests_this_month = requests_this_month + 1
    WHERE id = p_api_key_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log API request
CREATE OR REPLACE FUNCTION log_api_request(
    p_api_key_id UUID,
    p_workspace_id UUID,
    p_endpoint TEXT,
    p_method TEXT,
    p_status_code INTEGER,
    p_response_time_ms INTEGER,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL,
    p_error_code TEXT DEFAULT NULL,
    p_error_message TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO api_request_log (
        api_key_id, workspace_id, endpoint, method,
        status_code, error_code, error_message,
        response_time_ms, ip_address, user_agent
    ) VALUES (
        p_api_key_id, p_workspace_id, p_endpoint, p_method,
        p_status_code, p_error_code, p_error_message,
        p_response_time_ms, p_ip_address, p_user_agent
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old rate limit records (run periodically)
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM api_rate_limits
    WHERE window_start < NOW() - INTERVAL '5 minutes';
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up old request logs (run periodically)
CREATE OR REPLACE FUNCTION cleanup_api_request_logs(p_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM api_request_log
    WHERE created_at < NOW() - (p_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION validate_api_key TO service_role;
GRANT EXECUTE ON FUNCTION check_rate_limit TO service_role;
GRANT EXECUTE ON FUNCTION increment_monthly_requests TO service_role;
GRANT EXECUTE ON FUNCTION log_api_request TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_rate_limits TO service_role;
GRANT EXECUTE ON FUNCTION cleanup_api_request_logs TO service_role;

-- ============================================
-- 8. TRIGGERS FOR UPDATED_AT
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER api_webhooks_updated_at
    BEFORE UPDATE ON api_webhooks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Premium API Foundation migration completed successfully';
    RAISE NOTICE 'Tables created: api_keys, api_request_log, api_rate_limits, api_webhooks, api_webhook_deliveries';
    RAISE NOTICE 'Functions created: validate_api_key, check_rate_limit, increment_monthly_requests, log_api_request';
END $$;
