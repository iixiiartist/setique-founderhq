-- ============================================
-- FIX PLAN TYPE CASTING - Quick Fix
-- ============================================
-- This fixes the "column plan_type is of type plan_type but expression is of type text" error

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

-- Grant permission
GRANT EXECUTE ON FUNCTION admin_update_user_plan TO authenticated;

-- Verify your admin status (run this first if the function says unauthorized)
-- UPDATE profiles SET is_admin = true WHERE email = 'joe@setique.com';
