-- Check workspace_members DELETE policy
-- Run this to verify RLS policies are correctly set up

-- 1. Check if RLS is enabled on workspace_members
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'workspace_members';

-- 2. List all policies on workspace_members table
SELECT 
    policyname,
    cmd as command,
    qual as using_expression,
    with_check
FROM pg_policies 
WHERE tablename = 'workspace_members'
ORDER BY policyname;

-- 3. Check your current user info and workspace ownership
SELECT 
    auth.uid() as current_user_id,
    auth.email() as current_user_email;

-- 4. Check workspaces you own
SELECT 
    w.id as workspace_id,
    w.name as workspace_name,
    w.owner_id,
    (w.owner_id = auth.uid()) as you_are_owner
FROM workspaces w
WHERE w.owner_id = auth.uid()
ORDER BY w.created_at DESC;

-- 5. Check workspace_members you should be able to delete
SELECT 
    wm.id as member_id,
    wm.workspace_id,
    w.name as workspace_name,
    wm.user_id,
    p.email as member_email,
    wm.role,
    (w.owner_id = auth.uid()) as you_can_delete
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
LEFT JOIN profiles p ON wm.user_id = p.id
WHERE w.owner_id = auth.uid()
ORDER BY wm.created_at DESC;
