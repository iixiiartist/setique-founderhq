-- Check workspace_members RLS policies
-- Run this in Supabase SQL Editor

-- Check if RLS is enabled on workspace_members
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'workspace_members';

-- Check existing policies on workspace_members
SELECT polname, polcmd, polqual::text, polwithcheck::text
FROM pg_policy
WHERE polrelid = 'workspace_members'::regclass;

-- SOLUTION: Create a SECURITY DEFINER function that bypasses RLS
-- This function will check workspace membership without being blocked by RLS

CREATE OR REPLACE FUNCTION public.user_has_workspace_access(check_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = check_workspace_id
    AND user_id = auth.uid()
  );
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.user_has_workspace_access(uuid) TO authenticated;

-- Now update marketing_items policies to use the function
DROP POLICY IF EXISTS "Users can view marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can insert marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can update marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can delete marketing items in their workspace" ON marketing_items;

CREATE POLICY "Users can view marketing items in their workspace" ON marketing_items
FOR SELECT USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can insert marketing items in their workspace" ON marketing_items
FOR INSERT WITH CHECK (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can update marketing items in their workspace" ON marketing_items
FOR UPDATE USING (public.user_has_workspace_access(workspace_id));

CREATE POLICY "Users can delete marketing items in their workspace" ON marketing_items
FOR DELETE USING (public.user_has_workspace_access(workspace_id));

-- Test: This should now return your marketing items
SELECT * FROM marketing_items WHERE workspace_id = '06ce0397-0587-4f25-abbd-7aefd4072bb3';
