-- Fix handle_new_user trigger to NOT create workspace for invited users
-- Run this in Supabase Dashboard → SQL Editor

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
    invited_to_workspace UUID;
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    
    -- Check if user was invited to a workspace
    invited_to_workspace := (NEW.raw_user_meta_data->>'invited_to_workspace')::UUID;
    
    -- Only create workspace if user was NOT invited to one
    IF invited_to_workspace IS NULL THEN
        -- Create default workspace
        INSERT INTO public.workspaces (owner_id, name, plan_type)
        VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'My') || '''s Workspace', 'free')
        RETURNING id INTO new_workspace_id;
        
        -- Add user as workspace member
        INSERT INTO public.workspace_members (workspace_id, user_id, role)
        VALUES (new_workspace_id, NEW.id, 'owner');
        
        -- Create subscription
        INSERT INTO public.subscriptions (workspace_id, plan_type, status)
        VALUES (new_workspace_id, 'free', 'active');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Trigger fixed! Invited users will no longer get their own workspace.' as status;
