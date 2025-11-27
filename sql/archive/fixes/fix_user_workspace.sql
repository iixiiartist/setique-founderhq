-- Force create workspace for test user
-- This is a one-time script to fix the current user

DO $$
DECLARE
    new_workspace_id UUID;
    user_uuid UUID := 'f8722baa-9f38-44bf-81ef-ec167dc135c3';
BEGIN
    -- Delete any existing workspace/subscription data for clean slate
    DELETE FROM subscriptions WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = user_uuid);
    DELETE FROM workspace_members WHERE user_id = user_uuid;
    DELETE FROM business_profile WHERE workspace_id IN (SELECT id FROM workspaces WHERE owner_id = user_uuid);
    DELETE FROM workspaces WHERE owner_id = user_uuid;
    
    -- Ensure profile exists
    INSERT INTO profiles (id, email, created_at)
    VALUES (user_uuid, (SELECT email FROM auth.users WHERE id = user_uuid), NOW())
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

    -- Create workspace
    INSERT INTO workspaces (owner_id, name, plan_type, created_at)
    VALUES (user_uuid, 'My Workspace', 'free', NOW())
    RETURNING id INTO new_workspace_id;

    RAISE NOTICE 'Created workspace: %', new_workspace_id;

    -- Add as workspace member
    INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
    VALUES (new_workspace_id, user_uuid, 'owner', NOW());

    -- Create subscription
    INSERT INTO subscriptions (workspace_id, plan_type, status, seat_count, current_period_start, current_period_end)
    VALUES (new_workspace_id, 'free', 'active', 1, NOW(), NOW() + INTERVAL '1 year');

    RAISE NOTICE 'Successfully created complete workspace setup for user';
END $$;
