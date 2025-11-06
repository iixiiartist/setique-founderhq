-- Migration: Add Subscription Schema
-- Date: 2025-11-01
-- Description: Adds subscriptions table with Stripe integration and usage tracking

-- Create plan_type enum
DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM (
        'free',
        'power-individual',
        'team-pro'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create subscription_status enum
DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM (
        'active',
        'past_due',
        'canceled',
        'unpaid',
        'trialing',
        'incomplete',
        'incomplete_expired'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Plan Information
    plan_type plan_type DEFAULT 'free' NOT NULL,
    
    -- Stripe Integration
    stripe_customer_id TEXT, -- Stripe customer ID
    stripe_subscription_id TEXT, -- Stripe subscription ID
    stripe_price_id TEXT, -- Stripe price ID for the current plan
    
    -- Subscription Status
    status subscription_status DEFAULT 'active' NOT NULL,
    
    -- Team Plan Details
    seat_count INTEGER DEFAULT 1 NOT NULL CHECK (seat_count > 0),
    used_seats INTEGER DEFAULT 1 NOT NULL CHECK (used_seats >= 0),
    
    -- Billing Periods
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    canceled_at TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    
    -- Usage Tracking
    ai_requests_used INTEGER DEFAULT 0 NOT NULL,
    ai_requests_limit INTEGER, -- NULL = unlimited
    ai_requests_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    storage_bytes_used BIGINT DEFAULT 0 NOT NULL,
    storage_bytes_limit BIGINT, -- NULL = unlimited
    
    file_count_used INTEGER DEFAULT 0 NOT NULL,
    file_count_limit INTEGER, -- NULL = unlimited
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_workspace_id ON subscriptions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_type ON subscriptions(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end);

-- Create trigger for updated_at on subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at 
    BEFORE UPDATE ON subscriptions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for subscriptions
DROP POLICY IF EXISTS "Users can view subscriptions of their workspaces" ON subscriptions;
CREATE POLICY "Users can view subscriptions of their workspaces" ON subscriptions 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE workspaces.id = subscriptions.workspace_id 
            AND (
                workspaces.owner_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM workspace_members 
                    WHERE workspace_members.workspace_id = subscriptions.workspace_id 
                    AND workspace_members.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Workspace owners can create subscriptions" ON subscriptions;
CREATE POLICY "Workspace owners can create subscriptions" ON subscriptions 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE workspaces.id = subscriptions.workspace_id 
            AND workspaces.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Workspace owners can update subscriptions" ON subscriptions;
CREATE POLICY "Workspace owners can update subscriptions" ON subscriptions 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE workspaces.id = subscriptions.workspace_id 
            AND workspaces.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can update subscriptions" ON subscriptions;
CREATE POLICY "System can update subscriptions" ON subscriptions 
    FOR UPDATE USING (true); -- Allow service role to update (for webhooks)

-- Add comments for documentation (only if columns exist)
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subscriptions') THEN
        COMMENT ON TABLE subscriptions IS 'Subscription and billing information per workspace. Tracks Stripe integration and usage limits.';
        
        -- Only add comments for columns that exist
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'workspace_id') THEN
            COMMENT ON COLUMN subscriptions.workspace_id IS 'Links to workspace - one subscription per workspace (enforced by UNIQUE constraint)';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'plan_type') THEN
            COMMENT ON COLUMN subscriptions.plan_type IS 'Current subscription plan: free, power-individual, team-pro';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'stripe_customer_id') THEN
            COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID for billing';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'stripe_subscription_id') THEN
            COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID for managing subscription';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'status') THEN
            COMMENT ON COLUMN subscriptions.status IS 'Stripe subscription status: active, past_due, canceled, unpaid, trialing, incomplete';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'seat_count') THEN
            COMMENT ON COLUMN subscriptions.seat_count IS 'Number of seats purchased (for team plans). Minimum 1.';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'used_seats') THEN
            COMMENT ON COLUMN subscriptions.used_seats IS 'Number of seats currently occupied by workspace members';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'current_period_end') THEN
            COMMENT ON COLUMN subscriptions.current_period_end IS 'When the current billing period ends';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'trial_end') THEN
            COMMENT ON COLUMN subscriptions.trial_end IS 'When the trial period ends';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'cancel_at_period_end') THEN
            COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether subscription will cancel at period end';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'ai_requests_used') THEN
            COMMENT ON COLUMN subscriptions.ai_requests_used IS 'Number of AI requests used in current period';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'ai_requests_limit') THEN
            COMMENT ON COLUMN subscriptions.ai_requests_limit IS 'Maximum AI requests allowed. NULL = unlimited.';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'storage_bytes_used') THEN
            COMMENT ON COLUMN subscriptions.storage_bytes_used IS 'Storage used in bytes';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'storage_bytes_limit') THEN
            COMMENT ON COLUMN subscriptions.storage_bytes_limit IS 'Maximum storage allowed in bytes. NULL = unlimited.';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'file_count_used') THEN
            COMMENT ON COLUMN subscriptions.file_count_used IS 'Number of files uploaded';
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subscriptions' AND column_name = 'file_count_limit') THEN
            COMMENT ON COLUMN subscriptions.file_count_limit IS 'Maximum files allowed. NULL = unlimited.';
        END IF;
    END IF;
END $$;

-- Function to initialize subscription limits based on plan
CREATE OR REPLACE FUNCTION set_subscription_limits()
RETURNS TRIGGER AS $$
BEGIN
    -- Set limits based on plan type
    CASE NEW.plan_type
        WHEN 'free' THEN
            NEW.ai_requests_limit := 20;
            NEW.storage_bytes_limit := 104857600; -- 100 MB
            NEW.file_count_limit := 25;
            NEW.seat_count := 1;
            
        WHEN 'power-individual' THEN
            NEW.ai_requests_limit := NULL; -- Unlimited
            NEW.storage_bytes_limit := 5368709120; -- 5 GB
            NEW.file_count_limit := NULL; -- Unlimited
            NEW.seat_count := 1;
            
        WHEN 'team-pro' THEN
            -- Per-user limits: unlimited AI, unlimited files per user
            -- Shared storage: 10 GB
            NEW.ai_requests_limit := NULL; -- Unlimited
            NEW.storage_bytes_limit := 10737418240; -- 10 GB shared
            NEW.file_count_limit := NULL; -- Unlimited
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set limits on insert or plan change
DROP TRIGGER IF EXISTS set_subscription_limits_trigger ON subscriptions;
CREATE TRIGGER set_subscription_limits_trigger
    BEFORE INSERT OR UPDATE OF plan_type, seat_count ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION set_subscription_limits();

-- Function to reset AI usage monthly
CREATE OR REPLACE FUNCTION reset_ai_usage()
RETURNS void AS $$
BEGIN
    UPDATE subscriptions
    SET 
        ai_requests_used = 0,
        ai_requests_reset_at = NOW()
    WHERE ai_requests_reset_at < NOW() - INTERVAL '30 days'
    AND ai_requests_limit IS NOT NULL; -- Only reset for plans with limits
END;
$$ LANGUAGE plpgsql;

-- Function to check if workspace has reached AI limit
CREATE OR REPLACE FUNCTION check_ai_limit(p_workspace_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_subscription RECORD;
BEGIN
    SELECT ai_requests_used, ai_requests_limit, status
    INTO v_subscription
    FROM subscriptions
    WHERE workspace_id = p_workspace_id;
    
    -- If no subscription found or subscription inactive, deny access
    IF NOT FOUND OR v_subscription.status NOT IN ('active', 'trialing') THEN
        RETURN FALSE;
    END IF;
    
    -- If unlimited (NULL limit), allow
    IF v_subscription.ai_requests_limit IS NULL THEN
        RETURN TRUE;
    END IF;
    
    -- Check if under limit
    RETURN v_subscription.ai_requests_used < v_subscription.ai_requests_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to increment AI usage
CREATE OR REPLACE FUNCTION increment_ai_usage(p_workspace_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE subscriptions
    SET ai_requests_used = ai_requests_used + 1
    WHERE workspace_id = p_workspace_id
    AND status IN ('active', 'trialing');
END;
$$ LANGUAGE plpgsql;

-- Function to check if workspace has reached storage limit
CREATE OR REPLACE FUNCTION check_storage_limit(p_workspace_id UUID, p_file_size_bytes BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_subscription RECORD;
BEGIN
    SELECT storage_bytes_used, storage_bytes_limit, file_count_used, file_count_limit, status
    INTO v_subscription
    FROM subscriptions
    WHERE workspace_id = p_workspace_id;
    
    -- If no subscription found or subscription inactive, deny access
    IF NOT FOUND OR v_subscription.status NOT IN ('active', 'trialing') THEN
        RETURN FALSE;
    END IF;
    
    -- Check file count limit (if exists)
    IF v_subscription.file_count_limit IS NOT NULL 
       AND v_subscription.file_count_used >= v_subscription.file_count_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Check storage bytes limit (if exists)
    IF v_subscription.storage_bytes_limit IS NOT NULL 
       AND (v_subscription.storage_bytes_used + p_file_size_bytes) > v_subscription.storage_bytes_limit THEN
        RETURN FALSE;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to update storage usage
CREATE OR REPLACE FUNCTION update_storage_usage(
    p_workspace_id UUID,
    p_bytes_delta BIGINT, -- Positive for add, negative for delete
    p_file_count_delta INTEGER -- Positive for add, negative for delete
)
RETURNS void AS $$
BEGIN
    UPDATE subscriptions
    SET 
        storage_bytes_used = GREATEST(0, storage_bytes_used + p_bytes_delta),
        file_count_used = GREATEST(0, file_count_used + p_file_count_delta)
    WHERE workspace_id = p_workspace_id;
END;
$$ LANGUAGE plpgsql;

-- Pricing Reference (for application use)
/*
PRICING STRUCTURE:

Individual Plans:
- Free: $0/month
  * 20 AI requests/month
  * 25 files, 100 MB storage
  * 1 user only

- Pro: $29/month
  * 500 AI requests/month
  * 250 files, 1 GB storage
  * 1 user only

- Power: $99/month
  * Unlimited AI requests
  * Unlimited files, 5 GB storage
  * 1 user only

Team Plans:
- Starter: $49/month + $15/seat
  * 500 AI requests/user/month
  * 250 files/user, 3 GB shared storage
  * Minimum 2 seats

- Pro: $149/month + $12/seat
  * Unlimited AI requests/user
  * Unlimited files/user, 10 GB shared storage
  * Minimum 2 seats

Stripe Price IDs (to be set in environment variables):
- VITE_STRIPE_PRICE_PRO_INDIVIDUAL
- VITE_STRIPE_PRICE_POWER_INDIVIDUAL
- VITE_STRIPE_PRICE_TEAM_STARTER_BASE
- VITE_STRIPE_PRICE_TEAM_STARTER_SEAT
- VITE_STRIPE_PRICE_TEAM_PRO_BASE
- VITE_STRIPE_PRICE_TEAM_PRO_SEAT
*/

