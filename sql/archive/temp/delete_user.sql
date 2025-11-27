-- Delete user iixiiartist@gmail.com and all associated data
-- This will cascade delete workspace_members, invitations, etc.

DO $$
DECLARE
    user_uuid UUID;
BEGIN
    -- Get the user's UUID
    SELECT id INTO user_uuid FROM auth.users WHERE email = 'iixiiartist@gmail.com';
    
    IF user_uuid IS NULL THEN
        RAISE NOTICE 'User iixiiartist@gmail.com not found';
    ELSE
        RAISE NOTICE 'Found user: %', user_uuid;
        
        -- Delete from workspace_members (if they are a member anywhere)
        DELETE FROM workspace_members WHERE user_id = user_uuid;
        RAISE NOTICE 'Deleted workspace_members';
        
        -- Delete from workspace_invitations
        DELETE FROM workspace_invitations WHERE email = 'iixiiartist@gmail.com';
        RAISE NOTICE 'Deleted workspace_invitations';
        
        -- Delete their owned workspace (if any) - this will cascade to related data
        DELETE FROM workspaces WHERE owner_id = user_uuid;
        RAISE NOTICE 'Deleted workspace';
        
        -- Delete their profile
        DELETE FROM profiles WHERE id = user_uuid;
        RAISE NOTICE 'Deleted profile';
        
        -- Delete from auth.users (requires admin privileges)
        DELETE FROM auth.users WHERE id = user_uuid;
        RAISE NOTICE 'Deleted auth user';
        
        RAISE NOTICE 'Successfully deleted user iixiiartist@gmail.com';
    END IF;
END $$;
