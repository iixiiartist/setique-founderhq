-- ============================================
-- FIX ADMIN FUNCTION - Run this in Supabase SQL Editor
-- ============================================
-- This fixes the "ambiguous column reference" error

-- Drop the old function
DROP FUNCTION IF EXISTS get_all_users_for_admin();

-- Create the fixed function with renamed output column
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
    user_id uuid,
    email text,
    full_name text,
    created_at timestamptz,
    email_confirmed_at timestamptz,
    last_sign_in_at timestamptz,
    has_profile boolean,
    user_is_admin boolean,
    workspace_id uuid,
    workspace_name text,
    plan_type text
) 
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    -- Check if user is admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND public.profiles.is_admin = true) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    RETURN QUERY
    SELECT 
        u.id as user_id,
        u.email::text,
        COALESCE(p.full_name, u.raw_user_meta_data->>'full_name', 'N/A')::text as full_name,
        u.created_at,
        u.email_confirmed_at,
        u.last_sign_in_at,
        (p.id IS NOT NULL) as has_profile,
        COALESCE(p.is_admin, false) as user_is_admin,
        w.id as workspace_id,
        w.name::text as workspace_name,
        COALESCE(w.plan_type, 'free')::text as plan_type
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.id = u.id
    LEFT JOIN public.workspaces w ON w.owner_id = u.id
    ORDER BY u.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permission
GRANT EXECUTE ON FUNCTION get_all_users_for_admin TO authenticated;

-- Test the function
SELECT * FROM get_all_users_for_admin();
