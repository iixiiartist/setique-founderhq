-- ============================================
-- COMPLETE FIX - Admin Function + Admin Status
-- ============================================

-- STEP 1: Ensure joe@setique.com is admin
UPDATE profiles 
SET is_admin = true 
WHERE email = 'joe@setique.com';

-- STEP 2: Drop and recreate the function with type casting
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

    -- Update workspace plan_type and seats (with explicit type casting)
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
        -- Create new subscription (with explicit type casting)
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
        -- Update existing subscription (with explicit type casting)
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

-- STEP 3: Grant permission
GRANT EXECUTE ON FUNCTION admin_update_user_plan TO authenticated;

-- STEP 4: Set joe@setique.com account to team-pro plan
DO $$
DECLARE
    v_user_id UUID;
    v_workspace_id UUID;
    v_subscription_id UUID;
BEGIN
    -- Get your user ID
    SELECT id INTO v_user_id FROM profiles WHERE email = 'joe@setique.com';
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'User joe@setique.com not found!';
    END IF;

    -- Get your workspace
    SELECT w.id INTO v_workspace_id
    FROM workspaces w
    WHERE w.owner_id = v_user_id
    LIMIT 1;

    IF v_workspace_id IS NULL THEN
        RAISE EXCEPTION 'No workspace found for joe@setique.com';
    END IF;

    -- Update workspace plan
    UPDATE workspaces
    SET 
        plan_type = 'team-pro'::plan_type,
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
            'team-pro'::plan_type,
            'active',
            10,
            NOW(),
            NOW() + INTERVAL '365 days'
        );
    ELSE
        -- Update subscription
        UPDATE subscriptions
        SET 
            plan_type = 'team-pro'::plan_type,
            status = 'active',
            seat_count = 10,
            current_period_end = NOW() + INTERVAL '365 days',
            updated_at = NOW()
        WHERE id = v_subscription_id;
    END IF;
END $$;

-- STEP 5: Verify everything
SELECT 
    'Admin Account Status' as section,
    p.email,
    p.is_admin as "Is Admin",
    w.plan_type as "Workspace Plan",
    w.seats as "Seats",
    s.plan_type as "Subscription Plan",
    s.status as "Status",
    s.current_period_end as "Expires"
FROM profiles p
LEFT JOIN workspaces w ON w.owner_id = p.id
LEFT JOIN subscriptions s ON s.workspace_id = w.id
WHERE p.email = 'joe@setique.com';
