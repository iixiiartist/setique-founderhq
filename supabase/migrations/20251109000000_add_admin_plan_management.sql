-- Migration: Add admin plan management functions
-- Created: 2025-11-09
-- Purpose: Allow admins to manage user plan types

-- Drop old function if it exists (with old signature)
DROP FUNCTION IF EXISTS admin_update_user_plan(UUID, TEXT);

-- Function to update user plan type (admin only)
CREATE OR REPLACE FUNCTION admin_update_user_plan(
    target_user_id UUID,
    new_plan_type TEXT,
    new_seats INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID;
    caller_is_admin BOOLEAN;
    target_workspace_id UUID;
    current_member_count INTEGER;
    result JSON;
BEGIN
    -- Get the caller's user ID
    caller_id := auth.uid();
    
    -- Check if caller exists and is admin
    IF caller_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Authentication required'
        );
    END IF;
    
    -- Check if caller is admin
    SELECT is_admin INTO caller_is_admin
    FROM profiles
    WHERE id = caller_id;
    
    IF NOT COALESCE(caller_is_admin, false) THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Admin access required'
        );
    END IF;
    
    -- Validate plan type
    IF new_plan_type NOT IN ('free', 'power-individual', 'team-pro') THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Invalid plan type. Must be: free, power-individual, or team-pro'
        );
    END IF;
    
    -- Get target user's workspace
    SELECT id INTO target_workspace_id
    FROM workspaces
    WHERE owner_id = target_user_id
    LIMIT 1;
    
    IF target_workspace_id IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User workspace not found'
        );
    END IF;
    
    -- Get current member count for the workspace
    SELECT COUNT(*) INTO current_member_count
    FROM workspace_members
    WHERE workspace_id = target_workspace_id;
    
    -- Update the workspace plan type and seats (cast TEXT to plan_type enum)
    -- Handle seats column not existing gracefully
    IF new_plan_type = 'free' THEN
        -- Free plan: no seats
        BEGIN
            UPDATE workspaces
            SET 
                plan_type = new_plan_type::plan_type,
                seats = NULL,
                updated_at = NOW()
            WHERE owner_id = target_user_id;
        EXCEPTION WHEN undefined_column THEN
            -- seats column doesn't exist, just update plan_type
            UPDATE workspaces
            SET 
                plan_type = new_plan_type::plan_type,
                updated_at = NOW()
            WHERE owner_id = target_user_id;
        END;
        
        -- Also update subscriptions table if it exists (free plan)
        BEGIN
            INSERT INTO subscriptions (workspace_id, plan_type, status, seat_count, used_seats, ai_requests_used, ai_requests_limit, ai_requests_reset_at, storage_bytes_used, file_count_used)
            VALUES (target_workspace_id, new_plan_type::plan_type, 'active', 1, COALESCE(current_member_count, 1), 0, 50, NOW(), 0, 0)
            ON CONFLICT (workspace_id) DO UPDATE SET
                plan_type = EXCLUDED.plan_type,
                seat_count = EXCLUDED.seat_count,
                ai_requests_limit = EXCLUDED.ai_requests_limit,
                status = EXCLUDED.status,
                ai_requests_reset_at = EXCLUDED.ai_requests_reset_at,
                updated_at = NOW();
        EXCEPTION WHEN undefined_table THEN NULL;
        END;
    ELSIF new_plan_type = 'power-individual' THEN
        -- Power individual: 1 seat
        BEGIN
            UPDATE workspaces
            SET 
                plan_type = new_plan_type::plan_type,
                seats = 1,
                updated_at = NOW()
            WHERE owner_id = target_user_id;
        EXCEPTION WHEN undefined_column THEN
            -- seats column doesn't exist, just update plan_type
            UPDATE workspaces
            SET 
                plan_type = new_plan_type::plan_type,
                updated_at = NOW()
            WHERE owner_id = target_user_id;
        END;
        
        -- Also update subscriptions table if it exists (power-individual)
        BEGIN
            INSERT INTO subscriptions (workspace_id, plan_type, status, seat_count, used_seats, ai_requests_used, ai_requests_limit, ai_requests_reset_at, storage_bytes_used, file_count_used)
            VALUES (target_workspace_id, new_plan_type::plan_type, 'active', 1, COALESCE(current_member_count, 1), 0, 500, NOW(), 0, 0)
            ON CONFLICT (workspace_id) DO UPDATE SET
                plan_type = EXCLUDED.plan_type,
                seat_count = EXCLUDED.seat_count,
                ai_requests_limit = EXCLUDED.ai_requests_limit,
                status = EXCLUDED.status,
                ai_requests_reset_at = EXCLUDED.ai_requests_reset_at,
                updated_at = NOW();
        EXCEPTION WHEN undefined_table THEN NULL;
        END;
    ELSIF new_plan_type = 'team-pro' THEN
        -- Team Pro: use provided seats or default to 5
        BEGIN
            UPDATE workspaces
            SET 
                plan_type = new_plan_type::plan_type,
                seats = COALESCE(new_seats, 5),
                updated_at = NOW()
            WHERE owner_id = target_user_id;
        EXCEPTION WHEN undefined_column THEN
            -- seats column doesn't exist, just update plan_type
            UPDATE workspaces
            SET 
                plan_type = new_plan_type::plan_type,
                updated_at = NOW()
            WHERE owner_id = target_user_id;
        END;
        
        -- Also update subscriptions table if it exists (team-pro)
        BEGIN
            INSERT INTO subscriptions (workspace_id, plan_type, status, seat_count, used_seats, ai_requests_used, ai_requests_limit, ai_requests_reset_at, storage_bytes_used, file_count_used)
            VALUES (target_workspace_id, new_plan_type::plan_type, 'active', COALESCE(new_seats, 5), COALESCE(current_member_count, 1), 0, 1000, NOW(), 0, 0)
            ON CONFLICT (workspace_id) DO UPDATE SET
                plan_type = EXCLUDED.plan_type,
                seat_count = EXCLUDED.seat_count,
                ai_requests_limit = EXCLUDED.ai_requests_limit,
                status = EXCLUDED.status,
                ai_requests_reset_at = EXCLUDED.ai_requests_reset_at,
                updated_at = NOW();
        EXCEPTION WHEN undefined_table THEN NULL;
        END;
    END IF;
    
    -- Log the change (if activity_log table exists and has required columns)
    BEGIN
        INSERT INTO activity_log (user_id, workspace_id, action_type, entity_type, entity_id, metadata)
        VALUES (
            caller_id,
            target_workspace_id,
            'admin_plan_change',
            'workspace',
            target_workspace_id,
            json_build_object(
                'target_user_id', target_user_id,
                'new_plan_type', new_plan_type,
                'changed_by_admin', caller_id
            )
        );
    EXCEPTION WHEN OTHERS THEN
        -- If activity_log doesn't exist or has different schema, skip logging
        NULL;
    END;
    
    -- Return success
    RETURN json_build_object(
        'success', true,
        'message', 'Plan updated successfully',
        'user_id', target_user_id,
        'new_plan_type', new_plan_type
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Error updating plan: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users (function checks admin status internally)
GRANT EXECUTE ON FUNCTION admin_update_user_plan(UUID, TEXT, INTEGER) TO authenticated;

-- Comment on function
COMMENT ON FUNCTION admin_update_user_plan IS 'Admin-only function to update user plan types and seats. Validates admin status and logs changes.';
