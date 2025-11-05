-- Create function to delete user account and all associated data
-- This will be called from the client to permanently delete a user

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Delete user profile (CASCADE will handle related data)
    DELETE FROM profiles WHERE id = current_user_id;

    -- Delete workspaces owned by user (CASCADE will handle workspace_members, business_profile, subscriptions, workspace_achievements)
    DELETE FROM workspaces WHERE owner_id = current_user_id;

    -- Remove user from workspace_members where they're not the owner
    DELETE FROM workspace_members WHERE user_id = current_user_id;

    -- Delete the auth user (requires service_role, so this might fail)
    -- The user will need to be deleted from the auth.users table separately
    -- or we can leave it to Supabase's soft delete
    
    -- Note: The actual auth.users deletion requires admin privileges
    -- So we'll just clean up all the data and let the auth user remain
    -- The user won't be able to use the app without profile data
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION delete_user_account() TO authenticated;

