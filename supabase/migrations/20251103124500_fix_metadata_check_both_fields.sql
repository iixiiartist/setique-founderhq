-- Fix: Check BOTH user_metadata AND raw_user_meta_data for invited_to_workspace
-- Supabase might store it in different places depending on timing

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    has_invitation BOOLEAN := FALSE;
    metadata_workspace TEXT;
BEGIN
    -- Create profile first (always needed)
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Check BOTH user_metadata and raw_user_meta_data for invited_to_workspace
    metadata_workspace := COALESCE(
        NEW.raw_user_meta_data->>'invited_to_workspace',
        NEW.raw_app_meta_data->>'invited_to_workspace'
    );
    
    IF metadata_workspace IS NOT NULL THEN
        has_invitation := TRUE;
        RAISE NOTICE 'User % has invited_to_workspace in metadata: %', NEW.email, metadata_workspace;
    ELSE
        -- Fallback: check database for pending/accepted invitations
        SELECT EXISTS (
            SELECT 1 FROM workspace_invitations 
            WHERE email = NEW.email 
            AND status IN ('pending', 'accepted')
            AND expires_at > NOW()
        ) INTO has_invitation;
        
        IF has_invitation THEN
            RAISE NOTICE 'User % has pending/accepted invitation in database', NEW.email;
        ELSE
            RAISE NOTICE 'User % has NO invitation found (metadata: %, db: false)', NEW.email, metadata_workspace;
        END IF;
    END IF;
    
    -- Only create workspace if user doesn't have any invitations
    IF NOT has_invitation THEN
        INSERT INTO public.workspaces (owner_id, name, plan_type)
        VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email) || '''s Workspace',
            'free'
        )
        ON CONFLICT (owner_id) DO NOTHING;
        
        RAISE NOTICE '✓ Created workspace for user % (no invitations found)', NEW.email;
    ELSE
        RAISE NOTICE '✗ Skipped workspace creation for user % (has invitation)', NEW.email;
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
    'Creates profile for all users. Only creates workspace if user has no invitations. Checks metadata thoroughly.';

