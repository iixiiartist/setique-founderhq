-- Fix the trigger to bypass RLS by using SECURITY DEFINER properly
-- The trigger needs to run with elevated privileges to create workspace records

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate function with proper security context
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER -- This makes it run with the function owner's privileges
SET search_path = public
AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    -- Create a workspace for the new user
    INSERT INTO public.workspaces (owner_id, name, plan_type)
    VALUES (NEW.id, 'My Workspace', 'free')
    RETURNING id INTO new_workspace_id;

    -- Add user as owner in workspace_members
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'owner');

    -- Create subscription record
    INSERT INTO public.subscriptions (workspace_id, plan_type, status, seat_count)
    VALUES (new_workspace_id, 'free', 'active', 1);

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Failed to create workspace for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

