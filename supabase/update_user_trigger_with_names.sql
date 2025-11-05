-- Update handle_new_user trigger to populate full_name from metadata
-- This ensures invited users have their names auto-populated
-- Run this in Supabase Dashboard → SQL Editor

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
    invited_to_workspace UUID;
    user_full_name TEXT;
BEGIN
    -- Extract user's full name from metadata (from invitation or signup)
    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.email
    );

    -- Create profile with full_name populated
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, user_full_name)
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        updated_at = NOW();
    
    -- Check if user was invited to a workspace
    invited_to_workspace := (NEW.raw_user_meta_data->>'invited_to_workspace')::UUID;
    
    -- Only create workspace if user was NOT invited to one
    IF invited_to_workspace IS NULL THEN
        -- Create default workspace
        INSERT INTO public.workspaces (owner_id, name, plan_type)
        VALUES (NEW.id, COALESCE(user_full_name, 'My') || '''s Workspace', 'free')
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

-- Verify the trigger is still attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

SELECT 'Trigger updated to auto-populate user names!' as status;
