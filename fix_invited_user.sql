-- Fix the invited user by removing their auto-created workspace and adding them as a member

DO $$
DECLARE
    invited_user_id UUID;
    joe_workspace_id UUID;
BEGIN
    -- Get the invited user's ID
    SELECT id INTO invited_user_id FROM auth.users WHERE email = 'iixiiartist@gmail.com';
    
    -- Get Joe's workspace ID
    SELECT id INTO joe_workspace_id FROM workspaces WHERE owner_id = (
        SELECT id FROM auth.users WHERE email = 'joe@setique.com'
    );
    
    IF invited_user_id IS NULL THEN
        RAISE NOTICE 'User iixiiartist@gmail.com not found';
        RETURN;
    END IF;
    
    IF joe_workspace_id IS NULL THEN
        RAISE NOTICE 'Joe''s workspace not found';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found user: %', invited_user_id;
    RAISE NOTICE 'Found Joe''s workspace: %', joe_workspace_id;
    
    -- Delete the auto-created workspace for the invited user
    DELETE FROM workspaces WHERE owner_id = invited_user_id;
    RAISE NOTICE 'Deleted auto-created workspace';
    
    -- Add user as a member to Joe's workspace (if not already a member)
    INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
    VALUES (joe_workspace_id, invited_user_id, 'member', (SELECT id FROM auth.users WHERE email = 'joe@setique.com'))
    ON CONFLICT (workspace_id, user_id) DO NOTHING;
    RAISE NOTICE 'Added user as member to Joe''s workspace';
    
    -- Mark the invitation as accepted
    UPDATE workspace_invitations 
    SET status = 'accepted', 
        accepted_at = NOW()
    WHERE email = 'iixiiartist@gmail.com' 
      AND workspace_id = joe_workspace_id
      AND status = 'pending';
    RAISE NOTICE 'Marked invitation as accepted';
    
    RAISE NOTICE 'SUCCESS: User iixiiartist@gmail.com is now a member of Joe''s workspace!';
END $$;
