-- Enrichment Security Tables Migration
-- Adds durable rate limiting and observability tables for company enrichment Edge Function
-- Run this AFTER create_url_content_cache.sql

-- ==============================================================================
-- 1. ENRICHMENT RATE LIMITS TABLE
-- Tracks API usage per workspace for durable rate limiting across cold starts
-- ==============================================================================

CREATE TABLE IF NOT EXISTS enrichment_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Rate limiting counters
    requests_this_minute INTEGER NOT NULL DEFAULT 0,
    requests_this_day INTEGER NOT NULL DEFAULT 0,
    
    -- Reset timestamps
    minute_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    day_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Quota limits (can be customized per workspace/tier)
    max_requests_per_minute INTEGER NOT NULL DEFAULT 10,
    max_requests_per_day INTEGER NOT NULL DEFAULT 100,
    
    -- Balance tracking for billing (optional debit system)
    api_balance INTEGER NOT NULL DEFAULT 100,  -- Number of enrichments allowed
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    CONSTRAINT enrichment_rate_limits_workspace_unique UNIQUE(workspace_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_enrichment_rate_limits_workspace 
    ON enrichment_rate_limits(workspace_id);

-- Enable RLS
ALTER TABLE enrichment_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything (for Edge Functions)
CREATE POLICY "Service role full access to rate limits" ON enrichment_rate_limits
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy: Users can view their own workspace rate limits
CREATE POLICY "Users can view workspace rate limits" ON enrichment_rate_limits
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

COMMENT ON TABLE enrichment_rate_limits IS 'Durable rate limiting for company enrichment API calls per workspace';

-- ==============================================================================
-- 2. ENRICHMENT METRICS TABLE  
-- Tracks enrichment requests for observability and analytics
-- ==============================================================================

CREATE TABLE IF NOT EXISTS enrichment_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request context
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Request details (scrubbed for privacy)
    domain TEXT,  -- Just the domain, not full URL
    
    -- Result info
    provider TEXT,  -- 'groq', 'youcom', 'cache'
    is_fallback BOOLEAN DEFAULT false,
    cache_hit BOOLEAN DEFAULT false,
    success BOOLEAN NOT NULL,
    error_code TEXT,  -- Generic error codes, not full messages
    
    -- Performance
    duration_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_enrichment_metrics_workspace 
    ON enrichment_metrics(workspace_id);
CREATE INDEX IF NOT EXISTS idx_enrichment_metrics_created 
    ON enrichment_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_enrichment_metrics_provider 
    ON enrichment_metrics(provider);

-- Enable RLS
ALTER TABLE enrichment_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can insert (for Edge Functions)
CREATE POLICY "Service role can insert metrics" ON enrichment_metrics
    FOR INSERT
    WITH CHECK (true);

-- Policy: Workspace admins can view their metrics
CREATE POLICY "Workspace admins can view metrics" ON enrichment_metrics
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid() 
            AND role = 'owner'
        )
    );

COMMENT ON TABLE enrichment_metrics IS 'Observability data for company enrichment requests (privacy-safe)';

-- ==============================================================================
-- 3. UPDATE URL_CONTENT_CACHE FOR ENRICHMENT DATA
-- Add columns to store parsed enrichment data alongside raw content
-- ==============================================================================

-- Add enrichment data column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'url_content_cache' 
        AND column_name = 'enrichment_data'
    ) THEN
        ALTER TABLE url_content_cache 
        ADD COLUMN enrichment_data JSONB;
        
        COMMENT ON COLUMN url_content_cache.enrichment_data IS 
            'Parsed enrichment result (company description, industry, etc.)';
    END IF;
END $$;

-- Add provider column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'url_content_cache' 
        AND column_name = 'provider'
    ) THEN
        ALTER TABLE url_content_cache 
        ADD COLUMN provider TEXT DEFAULT 'unknown';
        
        COMMENT ON COLUMN url_content_cache.provider IS 
            'Which provider was used for this cached result (groq, youcom)';
    END IF;
END $$;

-- Add is_fallback column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'url_content_cache' 
        AND column_name = 'is_fallback'
    ) THEN
        ALTER TABLE url_content_cache 
        ADD COLUMN is_fallback BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN url_content_cache.is_fallback IS 
            'Whether this result came from a fallback provider';
    END IF;
END $$;

-- ==============================================================================
-- 4. RPC FUNCTION FOR ATOMIC RATE LIMIT CHECK & INCREMENT
-- Used by Edge Function to atomically check and increment rate limits
-- ==============================================================================

CREATE OR REPLACE FUNCTION check_and_increment_enrichment_rate_limit(
    p_workspace_id UUID
) 
RETURNS TABLE (
    allowed BOOLEAN,
    remaining_minute INTEGER,
    remaining_day INTEGER,
    balance INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record enrichment_rate_limits%ROWTYPE;
    v_now TIMESTAMPTZ := NOW();
    v_minute_ago TIMESTAMPTZ := v_now - INTERVAL '1 minute';
    v_day_ago TIMESTAMPTZ := v_now - INTERVAL '1 day';
    v_allowed BOOLEAN := false;
    v_remaining_minute INTEGER := 0;
    v_remaining_day INTEGER := 0;
    v_balance INTEGER := 0;
BEGIN
    -- Get or create rate limit record for workspace
    INSERT INTO enrichment_rate_limits (workspace_id)
    VALUES (p_workspace_id)
    ON CONFLICT (workspace_id) DO NOTHING;
    
    -- Lock the row for update
    SELECT * INTO v_record
    FROM enrichment_rate_limits
    WHERE workspace_id = p_workspace_id
    FOR UPDATE;
    
    -- Reset minute counter if needed
    IF v_record.minute_reset_at < v_minute_ago THEN
        v_record.requests_this_minute := 0;
        v_record.minute_reset_at := v_now;
    END IF;
    
    -- Reset day counter if needed
    IF v_record.day_reset_at < v_day_ago THEN
        v_record.requests_this_day := 0;
        v_record.day_reset_at := v_now;
    END IF;
    
    -- Check if request is allowed
    IF v_record.requests_this_minute < v_record.max_requests_per_minute
       AND v_record.requests_this_day < v_record.max_requests_per_day
       AND v_record.api_balance > 0 THEN
        
        v_allowed := true;
        
        -- Increment counters and deduct balance
        UPDATE enrichment_rate_limits
        SET 
            requests_this_minute = v_record.requests_this_minute + 1,
            requests_this_day = v_record.requests_this_day + 1,
            minute_reset_at = v_record.minute_reset_at,
            day_reset_at = v_record.day_reset_at,
            api_balance = api_balance - 1,
            updated_at = v_now
        WHERE workspace_id = p_workspace_id;
        
        v_remaining_minute := v_record.max_requests_per_minute - v_record.requests_this_minute - 1;
        v_remaining_day := v_record.max_requests_per_day - v_record.requests_this_day - 1;
        v_balance := v_record.api_balance - 1;
    ELSE
        v_remaining_minute := GREATEST(0, v_record.max_requests_per_minute - v_record.requests_this_minute);
        v_remaining_day := GREATEST(0, v_record.max_requests_per_day - v_record.requests_this_day);
        v_balance := v_record.api_balance;
    END IF;
    
    RETURN QUERY SELECT v_allowed, v_remaining_minute, v_remaining_day, v_balance;
END;
$$;

-- Grant execute to authenticated users (will still be checked via Edge Function auth)
GRANT EXECUTE ON FUNCTION check_and_increment_enrichment_rate_limit(UUID) TO authenticated;

COMMENT ON FUNCTION check_and_increment_enrichment_rate_limit IS 
    'Atomically check and increment rate limits for enrichment API. Returns allowed status and remaining quotas.';

-- ==============================================================================
-- 5. CLEANUP FUNCTION FOR OLD METRICS (for scheduled job)
-- ==============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_enrichment_metrics(
    p_retention_days INTEGER DEFAULT 90
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM enrichment_metrics
    WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;
    
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$;

COMMENT ON FUNCTION cleanup_old_enrichment_metrics IS 
    'Delete enrichment metrics older than specified retention period (default 90 days)';

