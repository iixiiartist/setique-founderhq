-- Migration: API Balance System
-- Date: 2025-11-28
-- Purpose: Add wallet/balance system for API usage billing
-- Rate: $0.001 per API call (1 cent = 10 calls, $1 = 1000 calls)

-- ============================================
-- 1. ADD BALANCE TO WORKSPACES
-- ============================================

ALTER TABLE workspaces 
ADD COLUMN IF NOT EXISTS api_balance_cents INTEGER NOT NULL DEFAULT 0;

-- Add index for quick balance lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_api_balance ON workspaces(id) WHERE api_balance_cents > 0;

COMMENT ON COLUMN workspaces.api_balance_cents IS 'API balance in cents. $0.001 per call = 0.1 cents per call';

-- ============================================
-- 2. BALANCE TRANSACTIONS TABLE
-- ============================================
-- Audit trail for all balance changes

CREATE TABLE IF NOT EXISTS api_balance_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- Transaction details
    type TEXT NOT NULL,
    -- Types: 'topup', 'api_usage', 'refund', 'adjustment', 'bonus'
    
    amount_cents INTEGER NOT NULL,  -- Positive for credit, negative for debit
    balance_before INTEGER NOT NULL,
    balance_after INTEGER NOT NULL,
    
    -- Reference info
    description TEXT,
    stripe_payment_intent_id TEXT,      -- For topups
    stripe_checkout_session_id TEXT,    -- For topups
    api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,  -- For usage
    api_request_count INTEGER,          -- For batch usage deductions
    
    -- Metadata
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT api_balance_transactions_type_check CHECK (
        type IN ('topup', 'api_usage', 'refund', 'adjustment', 'bonus')
    )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_api_balance_transactions_workspace 
    ON api_balance_transactions(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_balance_transactions_stripe 
    ON api_balance_transactions(stripe_payment_intent_id) WHERE stripe_payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_api_balance_transactions_type 
    ON api_balance_transactions(workspace_id, type, created_at DESC);

-- ============================================
-- 3. AUTO-RELOAD SETTINGS (OPTIONAL FEATURE)
-- ============================================

CREATE TABLE IF NOT EXISTS api_balance_auto_reload (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE UNIQUE,
    
    -- Settings
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    threshold_cents INTEGER NOT NULL DEFAULT 500,     -- Reload when balance drops below $5
    reload_amount_cents INTEGER NOT NULL DEFAULT 2000, -- Reload $20
    
    -- Stripe payment method
    stripe_payment_method_id TEXT,
    
    -- Status
    last_reload_at TIMESTAMPTZ,
    last_reload_error TEXT,
    consecutive_failures INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 4. RLS POLICIES
-- ============================================

ALTER TABLE api_balance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_balance_auto_reload ENABLE ROW LEVEL SECURITY;

-- Balance transactions: workspace members can view
CREATE POLICY "api_balance_transactions_select" ON api_balance_transactions 
    FOR SELECT TO authenticated
    USING (is_workspace_member(workspace_id));

-- Auto-reload: workspace owners can manage
CREATE POLICY "api_balance_auto_reload_select" ON api_balance_auto_reload 
    FOR SELECT TO authenticated
    USING (is_workspace_member(workspace_id));

CREATE POLICY "api_balance_auto_reload_insert" ON api_balance_auto_reload 
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = api_balance_auto_reload.workspace_id 
            AND owner_id = auth.uid()
        )
    );

CREATE POLICY "api_balance_auto_reload_update" ON api_balance_auto_reload 
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = api_balance_auto_reload.workspace_id 
            AND owner_id = auth.uid()
        )
    );

-- ============================================
-- 5. HELPER FUNCTIONS
-- ============================================

-- Check if workspace has sufficient balance for API call
-- Cost: 0.1 cents per call ($0.001)
CREATE OR REPLACE FUNCTION check_api_balance(p_workspace_id UUID, p_call_count INTEGER DEFAULT 1)
RETURNS TABLE (
    has_balance BOOLEAN,
    current_balance_cents INTEGER,
    cost_cents NUMERIC,
    balance_after_cents NUMERIC
) AS $$
DECLARE
    v_balance INTEGER;
    v_cost NUMERIC;
BEGIN
    -- Get current balance
    SELECT api_balance_cents INTO v_balance
    FROM workspaces
    WHERE id = p_workspace_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, 0::NUMERIC, 0::NUMERIC;
        RETURN;
    END IF;
    
    -- Calculate cost: $0.001 per call = 0.1 cents per call
    v_cost := p_call_count * 0.1;
    
    RETURN QUERY SELECT 
        v_balance >= v_cost,
        v_balance,
        v_cost,
        v_balance - v_cost;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Deduct balance for API usage (atomic operation)
CREATE OR REPLACE FUNCTION deduct_api_balance(
    p_workspace_id UUID,
    p_api_key_id UUID,
    p_call_count INTEGER DEFAULT 1,
    p_description TEXT DEFAULT 'API usage'
)
RETURNS TABLE (
    success BOOLEAN,
    new_balance_cents INTEGER,
    transaction_id UUID,
    error_message TEXT
) AS $$
DECLARE
    v_balance_before INTEGER;
    v_balance_after INTEGER;
    v_cost_cents NUMERIC;
    v_txn_id UUID;
BEGIN
    -- Calculate cost: 0.1 cents per call
    v_cost_cents := p_call_count * 0.1;
    
    -- Atomic balance update with check
    UPDATE workspaces
    SET api_balance_cents = api_balance_cents - CEIL(v_cost_cents)::INTEGER
    WHERE id = p_workspace_id
    AND api_balance_cents >= CEIL(v_cost_cents)::INTEGER
    RETURNING api_balance_cents + CEIL(v_cost_cents)::INTEGER, api_balance_cents
    INTO v_balance_before, v_balance_after;
    
    IF NOT FOUND THEN
        -- Check if workspace exists or just insufficient funds
        SELECT api_balance_cents INTO v_balance_before
        FROM workspaces WHERE id = p_workspace_id;
        
        IF NOT FOUND THEN
            RETURN QUERY SELECT false, 0, NULL::UUID, 'Workspace not found'::TEXT;
        ELSE
            RETURN QUERY SELECT false, v_balance_before, NULL::UUID, 'Insufficient balance'::TEXT;
        END IF;
        RETURN;
    END IF;
    
    -- Record transaction
    INSERT INTO api_balance_transactions (
        workspace_id, type, amount_cents, balance_before, balance_after,
        description, api_key_id, api_request_count
    ) VALUES (
        p_workspace_id, 'api_usage', -CEIL(v_cost_cents)::INTEGER, v_balance_before, v_balance_after,
        p_description, p_api_key_id, p_call_count
    )
    RETURNING id INTO v_txn_id;
    
    RETURN QUERY SELECT true, v_balance_after, v_txn_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add balance (for topups, refunds, bonuses)
CREATE OR REPLACE FUNCTION add_api_balance(
    p_workspace_id UUID,
    p_amount_cents INTEGER,
    p_type TEXT,
    p_description TEXT DEFAULT NULL,
    p_stripe_payment_intent_id TEXT DEFAULT NULL,
    p_stripe_checkout_session_id TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    new_balance_cents INTEGER,
    transaction_id UUID,
    error_message TEXT
) AS $$
DECLARE
    v_balance_before INTEGER;
    v_balance_after INTEGER;
    v_txn_id UUID;
BEGIN
    -- Validate type
    IF p_type NOT IN ('topup', 'refund', 'adjustment', 'bonus') THEN
        RETURN QUERY SELECT false, 0, NULL::UUID, 'Invalid transaction type'::TEXT;
        RETURN;
    END IF;
    
    -- Validate amount
    IF p_amount_cents <= 0 THEN
        RETURN QUERY SELECT false, 0, NULL::UUID, 'Amount must be positive'::TEXT;
        RETURN;
    END IF;
    
    -- Atomic balance update
    UPDATE workspaces
    SET api_balance_cents = api_balance_cents + p_amount_cents
    WHERE id = p_workspace_id
    RETURNING api_balance_cents - p_amount_cents, api_balance_cents
    INTO v_balance_before, v_balance_after;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 0, NULL::UUID, 'Workspace not found'::TEXT;
        RETURN;
    END IF;
    
    -- Record transaction
    INSERT INTO api_balance_transactions (
        workspace_id, type, amount_cents, balance_before, balance_after,
        description, stripe_payment_intent_id, stripe_checkout_session_id, metadata
    ) VALUES (
        p_workspace_id, p_type, p_amount_cents, v_balance_before, v_balance_after,
        p_description, p_stripe_payment_intent_id, p_stripe_checkout_session_id, p_metadata
    )
    RETURNING id INTO v_txn_id;
    
    RETURN QUERY SELECT true, v_balance_after, v_txn_id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get balance summary for a workspace
CREATE OR REPLACE FUNCTION get_api_balance_summary(p_workspace_id UUID)
RETURNS TABLE (
    balance_cents INTEGER,
    balance_dollars NUMERIC,
    estimated_calls_remaining INTEGER,
    total_topped_up_cents BIGINT,
    total_used_cents BIGINT,
    calls_this_month INTEGER,
    last_topup_at TIMESTAMPTZ,
    last_usage_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    WITH stats AS (
        SELECT
            COALESCE(SUM(CASE WHEN type = 'topup' THEN amount_cents ELSE 0 END), 0) as topped_up,
            COALESCE(SUM(CASE WHEN type = 'api_usage' THEN ABS(amount_cents) ELSE 0 END), 0) as used,
            COALESCE(SUM(CASE WHEN type = 'api_usage' AND created_at >= DATE_TRUNC('month', NOW()) 
                THEN api_request_count ELSE 0 END), 0) as month_calls,
            MAX(CASE WHEN type = 'topup' THEN created_at END) as last_topup,
            MAX(CASE WHEN type = 'api_usage' THEN created_at END) as last_usage
        FROM api_balance_transactions
        WHERE workspace_id = p_workspace_id
    )
    SELECT 
        w.api_balance_cents,
        (w.api_balance_cents / 100.0)::NUMERIC,
        (w.api_balance_cents * 10)::INTEGER,  -- 0.1 cents per call = 10 calls per cent
        s.topped_up::BIGINT,
        s.used::BIGINT,
        s.month_calls::INTEGER,
        s.last_topup,
        s.last_usage
    FROM workspaces w
    CROSS JOIN stats s
    WHERE w.id = p_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_api_balance TO service_role;
GRANT EXECUTE ON FUNCTION deduct_api_balance TO service_role;
GRANT EXECUTE ON FUNCTION add_api_balance TO service_role;
GRANT EXECUTE ON FUNCTION get_api_balance_summary TO authenticated;

-- ============================================
-- 6. TRIGGER FOR AUTO-RELOAD UPDATED_AT
-- ============================================

CREATE TRIGGER api_balance_auto_reload_updated_at
    BEFORE UPDATE ON api_balance_auto_reload
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'API Balance System migration completed successfully';
    RAISE NOTICE 'Rate: $0.001 per API call (0.1 cents, 10 calls per cent, 1000 calls per dollar)';
    RAISE NOTICE 'Tables: api_balance_transactions, api_balance_auto_reload';
    RAISE NOTICE 'Functions: check_api_balance, deduct_api_balance, add_api_balance, get_api_balance_summary';
END $$;
