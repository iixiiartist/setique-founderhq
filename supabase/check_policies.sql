-- Check current policies on workspaces and workspace_members
-- Run this in Supabase Dashboard → SQL Editor to diagnose the issue

-- Check all policies on workspaces table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'workspaces' 
ORDER BY policyname;

-- Check all policies on workspace_members table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'workspace_members' 
ORDER BY policyname;

-- Check if workspaces table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'workspaces'
) as workspaces_exists;

-- Check if workspace_members table exists
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'workspace_members'
) as workspace_members_exists;

-- Try to count workspaces (will show if there's a policy issue)
SELECT COUNT(*) as workspace_count FROM workspaces;
