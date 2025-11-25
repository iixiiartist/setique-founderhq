-- Webhook Events Table for Idempotency
-- Migration: 20251125_webhook_events.sql
-- Purpose: Prevent duplicate processing of Stripe webhook events

-- ============================================================================
-- 1. CREATE WEBHOOK EVENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,                    -- Stripe event ID for idempotency
    event_type TEXT NOT NULL,                         -- e.g., 'checkout.session.completed'
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    payload JSONB,                                    -- Event data (for debugging/retry)
    error_message TEXT,                               -- Error details if failed
    attempts INTEGER DEFAULT 0,                       -- Retry count
    processed_at TIMESTAMPTZ,                         -- When successfully processed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);

-- ============================================================================
-- 3. ENABLE RLS - SERVICE ROLE ONLY
-- ============================================================================

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies for authenticated users - only service role can access
-- This ensures webhook events are only managed by edge functions

-- ============================================================================
-- 4. CLEANUP FUNCTION (Run periodically)
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete completed events older than 30 days
    DELETE FROM webhook_events 
    WHERE status = 'completed' 
    AND created_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Delete failed events older than 90 days
    DELETE FROM webhook_events 
    WHERE status = 'failed' 
    AND created_at < NOW() - INTERVAL '90 days';
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION cleanup_old_webhook_events() TO service_role;
