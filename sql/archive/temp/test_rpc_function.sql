-- Test the get_member_workspace RPC function as II XII
-- Run this while logged in as iixiiartist@gmail.com

-- First, verify you're logged in as the right user
SELECT 
    'Current User' as info,
    auth.uid() as user_id,
    (SELECT email FROM auth.users WHERE id = auth.uid()) as email;

-- Check workspace_members to see if the membership exists
SELECT 
    'Workspace Membership' as info,
    wm.workspace_id,
    wm.user_id,
    wm.role,
    w.name as workspace_name,
    w.owner_id
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
WHERE wm.user_id = auth.uid();

-- Test the RPC function directly
SELECT 
    'RPC Function Result' as info,
    *
FROM get_member_workspace();
