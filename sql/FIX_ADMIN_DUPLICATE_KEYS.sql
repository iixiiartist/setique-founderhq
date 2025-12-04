-- ============================================
-- FIX ADMIN FUNCTIONS - Duplicate Keys & Plan Update
-- ============================================
-- Run this in Supabase SQL Editor

-- ============================================
-- STEP 1: Fix get_all_users_for_admin to prevent duplicate users
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

    -- Use DISTINCT ON to prevent duplicate users
    -- Join via workspace_members to properly get the user's owned workspace
    RETURN QUERY
    SELECT DISTINCT ON (u.id)
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
        COALESCE(w.plan_type::text, 'free') as plan_type
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.workspace_members wm ON wm.user_id = u.id AND wm.role = 'owner'
    LEFT JOIN public.workspaces w ON w.id = wm.workspace_id
    ORDER BY u.id, u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_all_users_for_admin TO authenticated;

-- ============================================
-- STEP 2: Fix admin_update_user_plan with proper type casting
-- ============================================
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
    v_validated_plan plan_type;
BEGIN
    -- Verify caller is admin
    IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Unauthorized: Admin access required'
        );
    END IF;

    -- Validate and cast plan_type first
    BEGIN
        v_validated_plan := new_plan_type::plan_type;
    EXCEPTION WHEN others THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', format('Invalid plan type: %s. Valid values: free, team-pro, power-individual', new_plan_type)
        );
    END;

    -- Get the user's workspace (as owner) via workspace_members
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
        plan_type = v_validated_plan,
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
            v_validated_plan,
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
            plan_type = v_validated_plan,
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

GRANT EXECUTE ON FUNCTION admin_update_user_plan TO authenticated;

-- ============================================
-- Verify the fixes
-- ============================================
SELECT 'Functions updated successfully!' as status;

-- Test the get_all_users_for_admin function (optional)
-- SELECT * FROM get_all_users_for_admin();
