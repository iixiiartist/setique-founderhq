-- Debug version with extensive logging
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
    raw_metadata TEXT;
    app_metadata TEXT;
BEGIN
    -- Log everything for debugging
    RAISE NOTICE '========== NEW USER TRIGGER START ==========';
    RAISE NOTICE 'User ID: %', NEW.id;
    RAISE NOTICE 'Email: %', NEW.email;
    
    -- Get raw metadata values
    raw_metadata := NEW.raw_user_meta_data->>'invited_to_workspace';
    app_metadata := NEW.raw_app_meta_data->>'invited_to_workspace';
    
    RAISE NOTICE 'raw_user_meta_data->invited_to_workspace: %', raw_metadata;
    RAISE NOTICE 'raw_app_meta_data->invited_to_workspace: %', app_metadata;
    RAISE NOTICE 'Full raw_user_meta_data: %', NEW.raw_user_meta_data::text;
    
    -- Create profile first (always needed)
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Check BOTH user_metadata and raw_app_meta_data for invited_to_workspace
    metadata_workspace := COALESCE(raw_metadata, app_metadata);
    
    IF metadata_workspace IS NOT NULL AND metadata_workspace != '' THEN
        has_invitation := TRUE;
        RAISE NOTICE '✓ Found invited_to_workspace in metadata: %', metadata_workspace;
    ELSE
        RAISE NOTICE '✗ No invited_to_workspace in metadata, checking database...';
        
        -- Fallback: check database for pending/accepted invitations
        SELECT EXISTS (
            SELECT 1 FROM workspace_invitations 
            WHERE email = NEW.email 
            AND status IN ('pending', 'accepted')
            AND expires_at > NOW()
        ) INTO has_invitation;
        
        IF has_invitation THEN
            RAISE NOTICE '✓ Found pending/accepted invitation in database for %', NEW.email;
        ELSE
            RAISE NOTICE '✗ No invitation found in database either';
        END IF;
    END IF;
    
    -- Only create workspace if user doesn't have any invitations
    IF NOT has_invitation THEN
        -- Double-check workspace doesn't already exist
        IF NOT EXISTS (SELECT 1 FROM workspaces WHERE owner_id = NEW.id) THEN
            INSERT INTO public.workspaces (owner_id, name, plan_type)
            VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email) || '''s Workspace',
                'free'
            );
            RAISE NOTICE '✓✓✓ CREATED WORKSPACE for user %', NEW.email;
        ELSE
            RAISE NOTICE '○ Workspace already exists for user %', NEW.email;
        END IF;
    ELSE
        RAISE NOTICE '✗✗✗ SKIPPED workspace creation for user % (has invitation)', NEW.email;
    END IF;
    
    RAISE NOTICE '========== NEW USER TRIGGER END ==========';
    
    RETURN NEW;
END;
$$;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

