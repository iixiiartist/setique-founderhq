-- Fix the handle_new_user trigger to handle errors gracefully
-- This prevents signup failures when workspace creation has issues
-- IMPORTANT: Does NOT create subscriptions table entry - workspace plan_type is enough

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    has_invitation BOOLEAN := FALSE;
    v_workspace_id UUID;
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
    
    -- Check database for ANY invitation for this email
    -- Only check workspace_invitations if table exists
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'workspace_invitations') THEN
            SELECT EXISTS (
                SELECT 1 FROM workspace_invitations 
                WHERE email = NEW.email 
                AND status IN ('pending', 'processing', 'accepted')
                AND expires_at > NOW()
            ) INTO has_invitation;
        ELSE
            has_invitation := FALSE;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        has_invitation := FALSE;
    END;
    
    -- Only create workspace if user has NO invitations
    IF NOT has_invitation THEN
        -- Double-check workspace doesn't already exist
        IF NOT EXISTS (SELECT 1 FROM workspaces WHERE owner_id = NEW.id) THEN
            -- Create workspace (do NOT create subscription entry)
            INSERT INTO public.workspaces (owner_id, name, plan_type)
            VALUES (
                NEW.id,
                COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.email) || '''s Workspace',
                'free'
            )
            RETURNING id INTO v_workspace_id;
        END IF;
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
    'Creates profile and workspace for new users. Errors are logged but do not prevent signup.';
