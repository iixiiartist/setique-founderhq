-- Migration: Add admin plan management functions
-- Created: 2025-11-09
-- Purpose: Allow admins to manage user plan types

-- Function to update user plan type (admin only)
CREATE OR REPLACE FUNCTION admin_update_user_plan(
    target_user_id UUID,
    new_plan_type TEXT
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
    
    -- Update the workspace plan type (cast TEXT to plan_type enum)
    UPDATE workspaces
    SET 
        plan_type = new_plan_type::plan_type,
        updated_at = NOW()
    WHERE owner_id = target_user_id;
    
    -- If downgrading to free, ensure seats is null or 1
    IF new_plan_type = 'free' THEN
        UPDATE workspaces
        SET seats = NULL
        WHERE owner_id = target_user_id;
    END IF;
    
    -- Log the change
    INSERT INTO activity_log (user_id, workspace_id, action_type, action_details)
    VALUES (
        caller_id,
        target_workspace_id,
        'admin_plan_change',
        json_build_object(
            'target_user_id', target_user_id,
            'new_plan_type', new_plan_type,
            'changed_by_admin', caller_id
        )
    );
    
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
GRANT EXECUTE ON FUNCTION admin_update_user_plan(UUID, TEXT) TO authenticated;

-- Comment on function
COMMENT ON FUNCTION admin_update_user_plan IS 'Admin-only function to update user plan types. Validates admin status and logs changes.';
