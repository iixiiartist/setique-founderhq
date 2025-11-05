-- Quick fix: Create workspace for existing user
-- Run this in Supabase SQL Editor

-- Replace YOUR_USER_ID with your actual user ID
DO $$
DECLARE
    v_user_id uuid := 'f61f58d6-7ffa-4f05-902c-af4e4edc646e'; -- Your user ID from the logs
    v_workspace_id uuid;
BEGIN
    -- Check if workspace already exists
    SELECT id INTO v_workspace_id
    FROM workspaces
    WHERE owner_id = v_user_id;
    
    IF v_workspace_id IS NULL THEN
        -- Create workspace
        INSERT INTO workspaces (owner_id, name, plan_type)
        VALUES (v_user_id, 'My Workspace', 'free')
        RETURNING id INTO v_workspace_id;
        
        -- Add user as workspace owner
        INSERT INTO workspace_members (workspace_id, user_id, role)
        VALUES (v_workspace_id, v_user_id, 'owner');
        
        -- Create subscription
        INSERT INTO subscriptions (workspace_id, plan_type, status)
        VALUES (v_workspace_id, 'free', 'active');
        
        RAISE NOTICE 'Workspace created for user %', v_user_id;
    ELSE
        RAISE NOTICE 'Workspace already exists for user %', v_user_id;
    END IF;
END $$;

