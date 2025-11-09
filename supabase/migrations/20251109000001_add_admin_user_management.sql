-- Migration: Add admin user management functions
-- Created: 2025-11-09
-- Purpose: Allow admins to delete users safely with cascade

-- Function to safely delete a user and all their data (admin only)
CREATE OR REPLACE FUNCTION admin_delete_user(
    target_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    caller_id UUID;
    caller_is_admin BOOLEAN;
    target_email TEXT;
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
    
    -- Prevent admins from deleting themselves
    IF target_user_id = caller_id THEN
        RETURN json_build_object(
            'success', false,
            'message', 'Cannot delete your own account'
        );
    END IF;
    
    -- Get target user email for logging
    SELECT email INTO target_email
    FROM auth.users
    WHERE id = target_user_id;
    
    IF target_email IS NULL THEN
        RETURN json_build_object(
            'success', false,
            'message', 'User not found'
        );
    END IF;
    
    -- Delete user data in correct order (respecting foreign keys)
    
    -- 1. Delete meetings (references contacts)
    DELETE FROM meetings WHERE user_id = target_user_id;
    
    -- 2. Delete contacts (references crm items)
    DELETE FROM contacts WHERE user_id = target_user_id;
    
    -- 3. Delete CRM items
    DELETE FROM investors WHERE user_id = target_user_id;
    DELETE FROM customers WHERE user_id = target_user_id;
    DELETE FROM partners WHERE user_id = target_user_id;
    
    -- 4. Delete other user data
    DELETE FROM tasks WHERE user_id = target_user_id;
    DELETE FROM marketing WHERE user_id = target_user_id;
    DELETE FROM expenses WHERE user_id = target_user_id;
    DELETE FROM revenue WHERE user_id = target_user_id;
    DELETE FROM documents WHERE user_id = target_user_id;
    DELETE FROM activity_log WHERE user_id = target_user_id;
    
    -- 5. Remove from workspace memberships
    DELETE FROM workspace_members WHERE user_id = target_user_id;
    
    -- 6. Delete owned workspaces
    DELETE FROM workspaces WHERE owner_id = target_user_id;
    
    -- 7. Delete profile
    DELETE FROM profiles WHERE id = target_user_id;
    
    -- 8. Delete from auth.users (this is the critical part)
    DELETE FROM auth.users WHERE id = target_user_id;
    
    -- Return success
    RETURN json_build_object(
        'success', true,
        'message', 'User deleted successfully',
        'deleted_user_id', target_user_id,
        'deleted_user_email', target_email
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Error deleting user: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users (function checks admin status internally)
GRANT EXECUTE ON FUNCTION admin_delete_user(UUID) TO authenticated;

-- Comment on function
COMMENT ON FUNCTION admin_delete_user IS 'Admin-only function to safely delete users and all their data. Cascades through all foreign key relationships.';
