-- Clean up incorrectly created workspace for invited user
-- Run this AFTER fix_new_user_trigger.sql

-- First, find the user's incorrectly created workspace
-- (the one where they are owner, not the one they were invited to)
-- User email: iixiiartist@gmail.com
-- User ID: 3a191135-bf21-4e74-a0c1-851feb74c091

-- Check which workspaces this user has
SELECT 
    w.id as workspace_id,
    w.name,
    w.owner_id,
    wm.role,
    w.created_at,
    CASE 
        WHEN w.owner_id = '3a191135-bf21-4e74-a0c1-851feb74c091' THEN 'OWNED (incorrect)'
        ELSE 'MEMBER (correct)'
    END as status
FROM workspaces w
JOIN workspace_members wm ON wm.workspace_id = w.id
WHERE wm.user_id = '3a191135-bf21-4e74-a0c1-851feb74c091'
ORDER BY w.created_at;

-- The workspace they should be in is: 06ce0397-0587-4f25-abbd-7aefd4072bb3 (Setique - joe@setique.com's workspace)
-- The incorrectly created workspace is: 9079b881-11d0-4160-af3b-47629278b108

-- Delete the incorrectly created workspace (9079b881-11d0-4160-af3b-47629278b108)
-- This will cascade delete workspace_members, subscriptions, etc.
DELETE FROM workspaces 
WHERE id = '9079b881-11d0-4160-af3b-47629278b108'
AND owner_id = '3a191135-bf21-4e74-a0c1-851feb74c091';

-- Verify user is now only in the correct workspace
SELECT 
    w.id as workspace_id,
    w.name,
    w.owner_id,
    wm.role,
    p.email as owner_email
FROM workspaces w
JOIN workspace_members wm ON wm.workspace_id = w.id
LEFT JOIN profiles p ON p.id = w.owner_id
WHERE wm.user_id = '3a191135-bf21-4e74-a0c1-851feb74c091';

-- Expected result: One row showing workspace "Setique" where joe@setique.com is owner
SELECT 'Cleanup complete! User now only in correct workspace.' as status;
