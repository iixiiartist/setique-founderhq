-- FINAL FIX: Only create workspace if NO invitation exists
-- This runs synchronously so it will see 'processing' status set by edge function

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
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
    -- Create profile (always)
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Check for ANY invitation (pending, processing, accepted)
    SELECT EXISTS (
        SELECT 1 FROM workspace_invitations 
        WHERE email = NEW.email 
        AND status IN ('pending', 'processing', 'accepted')
        AND expires_at > NOW()
    ) INTO has_invitation;
    
    -- Only create workspace if user has NO invitation
    IF NOT has_invitation THEN
        INSERT INTO public.workspaces (owner_id, name, plan_type)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email) || '''s Workspace',
            'free'
        )
        ON CONFLICT (owner_id) DO NOTHING;
        
        RAISE NOTICE '✓ Created workspace for % (no invitation)', NEW.email;
    ELSE
        RAISE NOTICE '✗ Skipped workspace for % (has invitation)', NEW.email;
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS 
    'Creates profile and workspace ONLY if user has no invitations.';

