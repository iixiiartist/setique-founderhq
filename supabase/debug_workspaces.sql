-- Test query to verify tables exist and check data
-- Run this in Supabase SQL Editor to debug

SELECT 
    'workspaces' as table_name,
    COUNT(*) as row_count
FROM workspaces

UNION ALL

SELECT 
    'workspace_members' as table_name,
    COUNT(*) as row_count
FROM workspace_members

UNION ALL

SELECT 
    'business_profile' as table_name,
    COUNT(*) as row_count
FROM business_profile

UNION ALL

SELECT 
    'subscriptions' as table_name,
    COUNT(*) as row_count
FROM subscriptions;

-- Check if your user has a workspace
SELECT w.*, wm.role
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
WHERE w.owner_id = 'f61f58d6-7ffa-4f05-902c-af4e4edc646e'
   OR wm.user_id = 'f61f58d6-7ffa-4f05-902c-af4e4edc646e';
