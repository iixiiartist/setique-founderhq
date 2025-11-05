-- Check if trigger exists
SELECT 
    tgname AS trigger_name,
    tgenabled AS enabled,
    proname AS function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

-- Check if function exists
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'handle_new_user';

-- Manually create workspace for the user
DO $$
DECLARE
    new_workspace_id UUID;
    user_uuid UUID := 'f8722baa-9f38-44bf-81ef-ec167dc135c3';
BEGIN
    -- First check if user already has a workspace
    IF EXISTS (SELECT 1 FROM workspaces WHERE owner_id = user_uuid) THEN
        RAISE NOTICE 'User already has a workspace';
        RETURN;
    END IF;

    -- Create profile if it doesn't exist
    INSERT INTO profiles (id, email, created_at)
    VALUES (user_uuid, 'test@example.com', NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Create workspace
    INSERT INTO workspaces (owner_id, name, plan_type)
    VALUES (user_uuid, 'My Workspace', 'free')
    RETURNING id INTO new_workspace_id;

    RAISE NOTICE 'Created workspace: %', new_workspace_id;

    -- Add as workspace member
    INSERT INTO workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, user_uuid, 'owner');

    -- Create subscription
    INSERT INTO subscriptions (workspace_id, plan_type, status, seat_count)
    VALUES (new_workspace_id, 'free', 'active', 1);

    RAISE NOTICE 'Successfully created workspace for user';
END $$;

