-- Create a function to get all users for admin dashboard
-- This accesses auth.users and joins with profiles/workspaces

-- First, create a function that admins can call
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
    user_id uuid,
    email text,
    full_name text,
    created_at timestamptz,
    email_confirmed_at timestamptz,
    last_sign_in_at timestamptz,
    has_profile boolean,
    is_admin boolean,
    workspace_id uuid,
    workspace_name text,
    plan_type text
) 
SECURITY DEFINER -- This runs with the permissions of the function creator
SET search_path = public, auth
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email,
        COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', 'N/A') as full_name,
        u.created_at,
        u.email_confirmed_at,
        u.last_sign_in_at,
        (p.id IS NOT NULL) as has_profile,
        COALESCE(p.is_admin, false) as is_admin,
        w.id as workspace_id,
        w.name as workspace_name,
        COALESCE(w.plan_type, 'free') as plan_type
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.workspaces w ON w.owner_id = u.id
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users (we'll check is_admin in the app)
GRANT EXECUTE ON FUNCTION get_all_users_for_admin() TO authenticated;

-- Verify it works
SELECT * FROM get_all_users_for_admin();
