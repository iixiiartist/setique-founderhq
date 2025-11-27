-- ============================================================================
-- PRICING SIMPLIFICATION MIGRATION
-- ============================================================================
-- This migration simplifies the pricing model:
--   - REMOVED: power-individual plan ($49/month)
--   - UPDATED: team-pro plan ($49/month base + $25/extra seat)
--   - KEPT: free plan (25 AI requests/month)
--
-- The new Team Pro pricing includes the workspace owner in the base price.
-- Additional team members cost $25/month each.
-- Solo users should use Team Pro with 1 seat ($49/month total).
--
-- RUN THIS IN SUPABASE SQL EDITOR
-- ============================================================================

-- Step 1: Migrate existing power-individual users to team-pro with 1 seat
-- This gives them the same unlimited access they had before
UPDATE subscriptions
SET 
    plan_type = 'team-pro',
    seat_count = 1,
    updated_at = now()
WHERE plan_type = 'power-individual';

-- Log the migration
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count FROM subscriptions WHERE plan_type = 'team-pro' AND seat_count = 1;
    RAISE NOTICE 'Migrated % power-individual subscriptions to team-pro with 1 seat', migrated_count;
END $$;

-- Step 2: Update the admin_update_user_plan function to support new pricing
-- This function is used by admins to change user plans
CREATE OR REPLACE FUNCTION admin_update_user_plan(
    target_user_id UUID,
    new_plan_type TEXT,
    new_seats INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_id UUID;
    v_is_admin BOOLEAN;
    v_target_workspace_id UUID;
    v_calculated_seats INTEGER;
    v_ai_limit INTEGER;
BEGIN
    -- Get the authenticated user's ID
    v_caller_id := auth.uid();
    
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Not authenticated');
    END IF;
    
    -- Check if caller is admin
    SELECT is_admin INTO v_is_admin
    FROM profiles
    WHERE id = v_caller_id;
    
    IF NOT COALESCE(v_is_admin, false) THEN
        RETURN jsonb_build_object('success', false, 'message', 'Admin access required');
    END IF;
    
    -- Validate plan type (simplified: only free and team-pro)
    IF new_plan_type NOT IN ('free', 'team-pro') THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid plan type. Must be free or team-pro');
    END IF;
    
    -- Get target user's workspace
    SELECT w.id INTO v_target_workspace_id
    FROM workspaces w
    WHERE w.owner_id = target_user_id
    LIMIT 1;
    
    IF v_target_workspace_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'User workspace not found');
    END IF;
    
    -- Calculate seat count
    v_calculated_seats := CASE 
        WHEN new_plan_type = 'team-pro' THEN COALESCE(new_seats, 1)
        ELSE 1 
    END;
    
    -- Calculate AI limit based on plan
    v_ai_limit := CASE 
        WHEN new_plan_type = 'free' THEN 25
        WHEN new_plan_type = 'team-pro' THEN 999999  -- Unlimited
        ELSE 25
    END;
    
    -- Update the subscription
    UPDATE subscriptions
    SET 
        plan_type = new_plan_type,
        seat_count = v_calculated_seats,
        ai_requests_limit = v_ai_limit,
        updated_at = now()
    WHERE workspace_id = v_target_workspace_id;
    
    -- If no subscription exists, create one
    IF NOT FOUND THEN
        INSERT INTO subscriptions (
            workspace_id,
            plan_type,
            status,
            seat_count,
            ai_requests_limit,
            ai_requests_used,
            created_at,
            updated_at
        ) VALUES (
            v_target_workspace_id,
            new_plan_type,
            'active',
            v_calculated_seats,
            v_ai_limit,
            0,
            now(),
            now()
        );
    END IF;
    
    RETURN jsonb_build_object(
        'success', true, 
        'message', format('Plan updated to %s with %s seats', new_plan_type, v_calculated_seats),
        'workspace_id', v_target_workspace_id
    );
END;
$$;

-- Step 3: Update the plan validation trigger to accept simplified plans
CREATE OR REPLACE FUNCTION validate_subscription_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Validate plan_type (simplified pricing)
    IF NEW.plan_type NOT IN ('free', 'team-pro') THEN
        -- Allow legacy plans during transition but log warning
        IF NEW.plan_type = 'power-individual' THEN
            -- Auto-migrate to team-pro
            NEW.plan_type := 'team-pro';
            NEW.seat_count := 1;
            RAISE NOTICE 'Auto-migrating power-individual to team-pro with 1 seat';
        ELSE
            RAISE EXCEPTION 'Invalid plan_type: %. Must be free or team-pro', NEW.plan_type;
        END IF;
    END IF;
    
    -- Set AI limits based on plan
    IF NEW.plan_type = 'free' THEN
        NEW.ai_requests_limit := 25;
        NEW.seat_count := 1;
    ELSIF NEW.plan_type = 'team-pro' THEN
        NEW.ai_requests_limit := 999999;  -- Unlimited
        -- Minimum 1 seat for team-pro (owner included in base)
        IF NEW.seat_count IS NULL OR NEW.seat_count < 1 THEN
            NEW.seat_count := 1;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Step 4: Ensure the trigger exists
DROP TRIGGER IF EXISTS subscription_plan_validation ON subscriptions;
CREATE TRIGGER subscription_plan_validation
    BEFORE INSERT OR UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION validate_subscription_plan();

-- Step 5: Verify the migration
DO $$
DECLARE
    free_count INTEGER;
    team_pro_count INTEGER;
    legacy_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO free_count FROM subscriptions WHERE plan_type = 'free';
    SELECT COUNT(*) INTO team_pro_count FROM subscriptions WHERE plan_type = 'team-pro';
    SELECT COUNT(*) INTO legacy_count FROM subscriptions WHERE plan_type NOT IN ('free', 'team-pro');
    
    RAISE NOTICE '';
    RAISE NOTICE '=== PRICING MIGRATION SUMMARY ===';
    RAISE NOTICE 'Free plan subscriptions: %', free_count;
    RAISE NOTICE 'Team Pro subscriptions: %', team_pro_count;
    RAISE NOTICE 'Legacy plans remaining: %', legacy_count;
    RAISE NOTICE '';
    
    IF legacy_count > 0 THEN
        RAISE WARNING 'There are % subscriptions with legacy plan types that need manual review', legacy_count;
    ELSE
        RAISE NOTICE 'Migration complete! All subscriptions are on free or team-pro plans.';
    END IF;
END $$;

-- ============================================================================
-- STRIPE CONFIGURATION NOTES
-- ============================================================================
-- After running this migration, update your Stripe Dashboard:
--
-- 1. Keep the Team Pro base price at $49/month (or adjust as needed)
-- 2. Keep the seat price at $25/month per extra user
-- 3. The power-individual Stripe price can be archived but keep for existing subs
--
-- Environment Variables needed:
--   STRIPE_PRICE_TEAM_PRO_BASE - Price ID for $49/month base
--   STRIPE_PRICE_TEAM_PRO_SEAT - Price ID for $25/month per extra seat
--
-- You can remove:
--   STRIPE_PRICE_POWER_INDIVIDUAL (no longer used for new subscriptions)
-- ============================================================================
