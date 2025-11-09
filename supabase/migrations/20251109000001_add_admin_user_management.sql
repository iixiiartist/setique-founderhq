-- Migration: Add admin user management functions
-- Created: 2025-11-09
-- Purpose: Allow admins to prepare users for deletion safely

-- Function to prepare a user for deletion by removing all their data (admin only)
-- Note: Auth user deletion should be done via Supabase Admin API
CREATE OR REPLACE FUNCTION admin_prepare_user_deletion(
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
    -- This prepares the user for safe deletion from auth.users
    
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
    
    -- 6. Delete subscriptions for owned workspaces (if table exists)
    BEGIN
        DELETE FROM subscriptions WHERE workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = target_user_id
        );
    EXCEPTION WHEN undefined_table THEN
        -- subscriptions table doesn't exist, skip
        NULL;
    END;
    
    -- 7. Delete owned workspaces
    DELETE FROM workspaces WHERE owner_id = target_user_id;
    
    -- 8. Delete profile
    DELETE FROM profiles WHERE id = target_user_id;
    
    -- Note: auth.users deletion will be handled by the frontend using Supabase Admin API
    
    -- Return success with user ID for frontend to delete from auth
    RETURN json_build_object(
        'success', true,
        'message', 'User data deleted, ready for auth deletion',
        'user_id', target_user_id,
        'user_email', target_email
    );
    
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
        'success', false,
        'message', 'Error preparing user deletion: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users (function checks admin status internally)
GRANT EXECUTE ON FUNCTION admin_prepare_user_deletion(UUID) TO authenticated;

-- Comment on function
COMMENT ON FUNCTION admin_prepare_user_deletion IS 'Admin-only function to prepare users for deletion by removing all their app data. Auth user must be deleted separately via Admin API.';
