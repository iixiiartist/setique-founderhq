-- Migration: Fix ai_requests_limit constraint and backfill NULL values
-- Created: 2025-11-10
-- Purpose: Handle cases where ai_requests_limit might be NULL in production

-- 1. Remove NOT NULL constraint if it exists (it shouldn't per schema, but production might have it)
ALTER TABLE subscriptions 
    ALTER COLUMN ai_requests_limit DROP NOT NULL;

-- 2. Backfill any NULL ai_requests_limit values based on plan type
UPDATE subscriptions
SET ai_requests_limit = CASE 
    WHEN plan_type = 'free' THEN 50
    WHEN plan_type = 'power-individual' THEN 500
    WHEN plan_type = 'team-pro' THEN 1000
    ELSE 50  -- Default to free plan limit
END
WHERE ai_requests_limit IS NULL;

-- 3. Ensure ai_requests_reset_at is set for all subscriptions
UPDATE subscriptions
SET ai_requests_reset_at = NOW()
WHERE ai_requests_reset_at IS NULL;

-- 4. Now add the NOT NULL constraint back if you want to enforce it
-- Uncomment the line below if you want ai_requests_limit to be required
-- ALTER TABLE subscriptions ALTER COLUMN ai_requests_limit SET NOT NULL;

COMMENT ON COLUMN subscriptions.ai_requests_limit IS 'AI request limit per period. Free=50, Power=500, Team=1000. NULL means unlimited (should not be used).';
