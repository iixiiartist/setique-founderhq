-- ============================================
-- FIX ADMIN PLANS AND RESTORE FUNCTIONALITY
-- ============================================

-- STEP 1: Check current status of admin user and all workspaces
SELECT '=== CURRENT STATUS ===' as info;

SELECT 
    p.id as user_id,
    p.email,
    p.full_name,
    p.is_admin,
    w.id as workspace_id,
    w.name as workspace_name,
    w.plan_type as workspace_plan,
    w.seats,
    s.plan_type as subscription_plan,
    s.status as subscription_status,
    s.seat_count
FROM profiles p
LEFT JOIN workspace_members wm ON wm.user_id = p.id AND wm.role = 'owner'
LEFT JOIN workspaces w ON w.id = wm.workspace_id
LEFT JOIN subscriptions s ON s.workspace_id = w.id
WHERE p.email = 'joe@setique.com';

-- STEP 2: Check if admin_update_user_plan function exists
SELECT '=== CHECKING ADMIN FUNCTION ===' as info;

SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name = 'admin_update_user_plan';

-- STEP 3: Create or replace the admin_update_user_plan function
-- Drop existing function first if it has wrong return type
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

    -- Get the user's workspace
    SELECT w.id INTO v_workspace_id
    FROM workspaces w
    JOIN workspace_members wm ON wm.workspace_id = w.id
    WHERE wm.user_id = target_user_id
    AND wm.role = 'owner'
    LIMIT 1;

    IF v_workspace_id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'No workspace found for user'
        );
    END IF;

    -- Update workspace plan_type
    UPDATE workspaces
    SET 
        plan_type = new_plan_type,
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
            current_period_end
        ) VALUES (
            v_workspace_id,
            new_plan_type,
            'active',
            CASE 
                WHEN new_plan_type = 'team-pro' THEN COALESCE(new_seats, 5)
                ELSE 1
            END,
            NOW(),
            NOW() + INTERVAL '30 days'
        );
    ELSE
        -- Update existing subscription
        UPDATE subscriptions
        SET 
            plan_type = new_plan_type,
            status = 'active',
            seat_count = CASE 
                WHEN new_plan_type = 'team-pro' THEN COALESCE(new_seats, 5)
                ELSE 1
            END,
            updated_at = NOW()
        WHERE id = v_subscription_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Plan updated successfully',
        'workspace_id', v_workspace_id,
        'plan_type', new_plan_type
    );
END;
$$;

-- STEP 4: Grant execute permission
GRANT EXECUTE ON FUNCTION admin_update_user_plan TO authenticated;

-- STEP 5: Set your admin account to team-pro with 10 seats
-- Replace 'joe@setique.com' with your actual email if different
DO $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
BEGIN
    -- Get user ID
    SELECT id INTO v_user_id FROM profiles WHERE email = 'joe@setique.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'User not found';
    ELSE
        -- Update to team-pro plan
        SELECT admin_update_user_plan(v_user_id, 'team-pro', 10) INTO v_result;
        RAISE NOTICE 'Result: %', v_result;
    END IF;
END $$;

-- STEP 6: Verify the changes
SELECT '=== VERIFICATION ===' as info;

SELECT 
    p.email,
    p.is_admin,
    w.name as workspace,
    w.plan_type as workspace_plan,
    w.seats as workspace_seats,
    s.plan_type as subscription_plan,
    s.status,
    s.seat_count
FROM profiles p
LEFT JOIN workspace_members wm ON wm.user_id = p.id AND wm.role = 'owner'
LEFT JOIN workspaces w ON w.id = wm.workspace_id
LEFT JOIN subscriptions s ON s.workspace_id = w.id
WHERE p.email = 'joe@setique.com';

-- STEP 7: Check all workspaces to see what was reset
SELECT '=== ALL WORKSPACES ===' as info;

SELECT 
    w.name,
    w.plan_type,
    w.seats,
    p.email as owner,
    s.plan_type as subscription_plan,
    s.status
FROM workspaces w
LEFT JOIN profiles p ON p.id = w.owner_id
LEFT JOIN subscriptions s ON s.workspace_id = w.id
ORDER BY w.created_at DESC
LIMIT 20;
