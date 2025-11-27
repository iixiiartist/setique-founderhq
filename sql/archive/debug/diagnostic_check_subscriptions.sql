-- Diagnostic script to check subscription and seat management setup
-- Run this in your Supabase SQL Editor to see what's configured

-- 1. Check if subscriptions table exists and its structure
SELECT 'Subscriptions Table Structure:' as check_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;

-- 2. Check if workspaces has seats column
SELECT 'Workspaces Table - Seats Column:' as check_name;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'workspaces' AND column_name IN ('seats', 'plan_type');

-- 3. Check workspace_members table structure
SELECT 'Workspace Members Table Structure:' as check_name;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'workspace_members'
ORDER BY ordinal_position;

-- 4. Check if there are any triggers on workspace_members (for seat enforcement)
SELECT 'Triggers on workspace_members:' as check_name;
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'workspace_members';

-- 5. Check existing subscriptions data
SELECT 'Current Subscriptions Data:' as check_name;
SELECT 
    s.workspace_id,
    w.name as workspace_name,
    s.plan_type,
    s.seat_count,
    s.used_seats,
    s.ai_requests_limit,
    s.status,
    (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = s.workspace_id) as actual_member_count
FROM subscriptions s
LEFT JOIN workspaces w ON w.id = s.workspace_id
LIMIT 10;

-- 6. Check if admin_update_user_plan function exists
SELECT 'Admin Function Exists:' as check_name;
SELECT routine_name, routine_type, data_type
FROM information_schema.routines
WHERE routine_name = 'admin_update_user_plan';

-- 7. Check function parameters
SELECT 'Admin Function Parameters:' as check_name;
SELECT parameter_name, data_type, parameter_mode
FROM information_schema.parameters
WHERE specific_name LIKE '%admin_update_user_plan%'
ORDER BY ordinal_position;

-- 8. Check for seat enforcement function/trigger
SELECT 'Seat Enforcement Functions:' as check_name;
SELECT routine_name
FROM information_schema.routines
WHERE routine_name LIKE '%seat%' OR routine_name LIKE '%member%limit%';

-- 9. Test query: Find workspaces with member count vs subscription limits
SELECT 'Workspaces with seat mismatches:' as check_name;
SELECT 
    w.id,
    w.name,
    w.plan_type as workspace_plan,
    s.plan_type as subscription_plan,
    s.seat_count as allowed_seats,
    s.used_seats as recorded_used_seats,
    (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) as actual_members
FROM workspaces w
LEFT JOIN subscriptions s ON s.workspace_id = w.id
WHERE w.plan_type IN ('team-pro', 'team-starter')
LIMIT 10;

-- 10. Check for any RLS policies that might affect subscriptions
SELECT 'RLS Policies on subscriptions:' as check_name;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'subscriptions';

-- 11. Check for workspace invite/member policies
SELECT 'RLS Policies on workspace_members:' as check_name;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'workspace_members';
