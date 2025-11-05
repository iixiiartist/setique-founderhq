-- FINAL NUCLEAR OPTION: Trigger does NOTHING for users with invitations
-- Edge function handles EVERYTHING for invited users

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Do NOTHING for users with invitation metadata
    -- The edge function will handle profile and workspace membership
    IF NEW.raw_user_meta_data->>'invited_to_workspace' IS NOT NULL THEN
        RAISE NOTICE 'Skipping trigger for invited user: %', NEW.email;
        RETURN NEW;
    END IF;
    
    -- For regular signups: create profile AND workspace
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    
    INSERT INTO public.workspaces (owner_id, name, plan_type)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email) || '''s Workspace',
        'free'
    )
    ON CONFLICT (owner_id) DO NOTHING;
    
    RAISE NOTICE 'Created profile + workspace for regular signup: %', NEW.email;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

