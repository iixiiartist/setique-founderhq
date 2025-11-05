-- Add 'processing' status to workspace_invitations CHECK constraint
ALTER TABLE workspace_invitations DROP CONSTRAINT IF EXISTS workspace_invitations_status_check;
ALTER TABLE workspace_invitations ADD CONSTRAINT workspace_invitations_status_check 
    CHECK (status IN ('pending', 'processing', 'accepted', 'expired', 'revoked'));

-- Update trigger to check for processing status
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
    RAISE NOTICE '========== NEW USER TRIGGER START ==========';
    RAISE NOTICE 'User email: %', NEW.email;
    
    -- Create profile first (always needed)
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    
    -- Check database for ANY invitation (pending, processing, OR accepted)
    SELECT EXISTS (
        SELECT 1 FROM workspace_invitations 
        WHERE email = NEW.email 
        AND status IN ('pending', 'processing', 'accepted')
        AND expires_at > NOW()
    ) INTO has_invitation;
    
    RAISE NOTICE 'Invitation check result: %', has_invitation;
    
    -- Only create workspace if user has NO invitations
    IF NOT has_invitation THEN
        IF NOT EXISTS (SELECT 1 FROM workspaces WHERE owner_id = NEW.id) THEN
            INSERT INTO public.workspaces (owner_id, name, plan_type)
            VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email) || '''s Workspace',
                'free'
            );
            RAISE NOTICE '✓✓✓ CREATED WORKSPACE for %', NEW.email;
        ELSE
            RAISE NOTICE '○ Workspace already exists for %', NEW.email;
        END IF;
    ELSE
        RAISE NOTICE '✗✗✗ SKIPPED workspace creation - user has invitation';
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

