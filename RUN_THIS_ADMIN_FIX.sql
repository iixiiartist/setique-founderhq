-- ============================================
-- COMPREHENSIVE ADMIN FIX - RUN THIS SCRIPT
-- ============================================
-- This script will:
-- 1. Ensure admin functions exist
-- 2. Set your account to admin with team-pro plan
-- 3. Verify everything is working

BEGIN;

-- ============================================
-- STEP 1: Ensure get_all_users_for_admin exists
-- ============================================
DROP FUNCTION IF EXISTS get_all_users_for_admin();

CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
    user_id uuid,
    email text,
    full_name text,
    created_at timestamptz,
    email_confirmed_at timestamptz,
    last_sign_in_at timestamptz,
    has_profile boolean,
    user_is_admin boolean,
    workspace_id uuid,
    workspace_name text,
    plan_type text
) 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND public.profiles.is_admin = true) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email::text,
        COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', 'N/A')::text as full_name,
        u.created_at,
        u.email_confirmed_at,
        u.last_sign_in_at,
        (p.id IS NOT NULL) as has_profile,
        COALESCE(p.is_admin, false) as user_is_admin,
        w.id as workspace_id,
        w.name::text as workspace_name,
        COALESCE(w.plan_type, 'free')::text as plan_type
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.workspaces w ON w.owner_id = u.id
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- STEP 2: Ensure admin_update_user_plan exists
-- ============================================
-- Drop existing function if it has wrong return type
DROP FUNCTION IF EXISTS admin_update_user_plan(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION admin_update_user_plan(
    target_user_id UUID,
    new_plan_type TEXT,
    new_seats INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_workspace_id UUID;
    v_subscription_id UUID;
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Unauthorized: Admin access required'
        );
    END IF;

    -- Get the user's workspace (as owner)
    SELECT w.id INTO v_workspace_id
    FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = target_user_id
    AND wm.role = 'owner'
    LIMIT 1;

    IF v_workspace_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No workspace found for user (user must be workspace owner)'
        );
    END IF;

    -- Update workspace plan_type and seats
    UPDATE workspaces
    SET 
        plan_type = new_plan_type::plan_type,
        seats = CASE 
            WHEN new_plan_type = 'team-pro' THEN COALESCE(new_seats, 5)
            WHEN new_plan_type = 'power-individual' THEN 1
            ELSE 1
        END,
        updated_at = NOW()
    WHERE id = v_workspace_id;

    -- Check if subscription exists
    SELECT id INTO v_subscription_id
    FROM subscriptions
    WHERE workspace_id = v_workspace_id
    LIMIT 1;

    IF v_subscription_id IS NULL THEN
        -- Create new subscription
        INSERT INTO subscriptions (
            workspace_id,
            plan_type,
            status,
            seat_count,
            current_period_start,
            current_period_end,
            created_at,
            updated_at
        ) VALUES (
            v_workspace_id,
            new_plan_type::plan_type,
            'active',
            CASE 
                WHEN new_plan_type = 'team-pro' THEN COALESCE(new_seats, 5)
                ELSE 1
            END,
            NOW(),
            NOW() + INTERVAL '30 days',
            NOW(),
            NOW()
        );
    ELSE
        -- Update existing subscription
        UPDATE subscriptions
        SET 
            plan_type = new_plan_type::plan_type,
            status = 'active',
            seat_count = CASE 
                WHEN new_plan_type = 'team-pro' THEN COALESCE(new_seats, 5)
                ELSE 1
            END,
            current_period_start = NOW(),
            current_period_end = NOW() + INTERVAL '30 days',
            updated_at = NOW()
        WHERE id = v_subscription_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Plan updated successfully',
        'workspace_id', v_workspace_id,
        'plan_type', new_plan_type,
        'seats', CASE 
            WHEN new_plan_type = 'team-pro' THEN COALESCE(new_seats, 5)
            ELSE 1
        END
    );
END;
$$;

-- ============================================
-- STEP 3: Fix the set_subscription_limits trigger function
-- ============================================
-- Simplify trigger - subscriptions table doesn't have max_* columns
CREATE OR REPLACE FUNCTION public.set_subscription_limits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Just validate the plan type is correct and pass through
  -- The limits are enforced in the application layer
  IF NEW.plan_type NOT IN ('free', 'power-individual', 'team-starter', 'team-pro') THEN
    RAISE EXCEPTION 'Invalid plan_type: %. Must be one of: free, power-individual, team-starter, team-pro', NEW.plan_type;
  END IF;
  RETURN NEW;
END;
$$;

-- ============================================
-- STEP 4: Grant permissions
-- ============================================
GRANT EXECUTE ON FUNCTION get_all_users_for_admin TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user_plan TO authenticated;

-- ============================================
-- STEP 5: Ensure your admin account is set up
-- ============================================
-- Set joe@setique.com as admin
UPDATE profiles 
SET is_admin = true 
WHERE email = 'joe@setique.com';

-- ============================================
-- STEP 6: Set your account to team-pro plan
-- ============================================
DO $$
DECLARE
    v_user_id UUID;
    v_workspace_id UUID;
    v_subscription_id UUID;
BEGIN
    -- Get your user ID
    SELECT id INTO v_user_id FROM profiles WHERE email = 'joe@setique.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'ERROR: User joe@setique.com not found!';
        RETURN;
    END IF;

    -- Get your workspace
    SELECT w.id INTO v_workspace_id
    FROM workspaces w
    WHERE w.owner_id = v_user_id
    LIMIT 1;

    IF v_workspace_id IS NULL THEN
        RAISE NOTICE 'ERROR: No workspace found for joe@setique.com';
        RETURN;
    END IF;

    -- Update workspace plan
    UPDATE workspaces
    SET 
        plan_type = 'team-pro',
        seats = 10,
        updated_at = NOW()
    WHERE id = v_workspace_id;

    -- Check for existing subscription
    SELECT id INTO v_subscription_id
    FROM subscriptions
    WHERE workspace_id = v_workspace_id;

    IF v_subscription_id IS NULL THEN
        -- Create subscription
        INSERT INTO subscriptions (
            workspace_id,
            plan_type,
            status,
            seat_count,
            current_period_start,
            current_period_end
        ) VALUES (
            v_workspace_id,
            'team-pro',
            'active',
            10,
            NOW(),
            NOW() + INTERVAL '365 days'  -- 1 year for admin
        );
        RAISE NOTICE 'SUCCESS: Created team-pro subscription for joe@setique.com';
    ELSE
        -- Update subscription
        UPDATE subscriptions
        SET 
            plan_type = 'team-pro',
            status = 'active',
            seat_count = 10,
            current_period_end = NOW() + INTERVAL '365 days',
            updated_at = NOW()
        WHERE id = v_subscription_id;
        RAISE NOTICE 'SUCCESS: Updated subscription to team-pro for joe@setique.com';
    END IF;
END $$;

COMMIT;

-- ============================================
-- VERIFICATION - Check results
-- ============================================
SELECT 
    '=== YOUR ADMIN ACCOUNT STATUS ===' as section,
    p.email,
    p.is_admin as "Is Admin?",
    w.name as workspace,
    w.plan_type as "Workspace Plan",
    w.seats as "Workspace Seats",
    s.plan_type as "Subscription Plan",
    s.seat_count as "Subscription Seats",
    s.status as "Subscription Status",
    s.current_period_end as "Plan Expires"
FROM profiles p
LEFT JOIN workspaces w ON w.owner_id = p.id
LEFT JOIN subscriptions s ON s.workspace_id = w.id
WHERE p.email = 'joe@setique.com';

-- Check all users and their current plans
SELECT 
    '=== ALL USERS OVERVIEW ===' as section,
    p.email,
    p.is_admin as admin,
    w.plan_type as workspace_plan,
    s.plan_type as subscription_plan,
    COALESCE(s.seat_count, w.seats, 1) as seats
FROM profiles p
LEFT JOIN workspaces w ON w.owner_id = p.id
LEFT JOIN subscriptions s ON s.workspace_id = w.id
ORDER BY p.is_admin DESC, p.email;
