-- Fix trigger to check metadata FIRST before database
-- This ensures invited users don't get duplicate workspaces

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    has_invitation BOOLEAN := FALSE;
BEGIN
    -- Create profile first (always needed)
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- FIRST check if user metadata indicates they were invited to a workspace
    -- This is the most reliable check since edge function sets this at user creation
    IF NEW.raw_user_meta_data->>'invited_to_workspace' IS NOT NULL THEN
        has_invitation := TRUE;
        RAISE NOTICE 'User % has invited_to_workspace in metadata', NEW.email;
    ELSE
        -- Then check if user has any pending/accepted invitations in database
        SELECT EXISTS (
            SELECT 1 FROM workspace_invitations 
            WHERE email = NEW.email 
            AND status IN ('pending', 'accepted')
            AND expires_at > NOW()
        ) INTO has_invitation;
        
        IF has_invitation THEN
            RAISE NOTICE 'User % has pending/accepted invitation in database', NEW.email;
        END IF;
    END IF;
    
    -- Only create workspace if user doesn't have any invitations
    IF NOT has_invitation THEN
        INSERT INTO public.workspaces (owner_id, name, plan_type)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email) || '''s Workspace',
            'free'
        )
        ON CONFLICT (owner_id) DO NOTHING;
        
        RAISE NOTICE 'Created workspace for user % (no invitations found)', NEW.email;
    ELSE
        RAISE NOTICE 'Skipped workspace creation for user % (has invitation)', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 
    'Creates profile for all users. Only creates workspace if user has no invitations. Checks metadata FIRST.';

