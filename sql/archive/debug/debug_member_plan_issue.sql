-- Debug: Check why team member is seeing "free" plan instead of "team-pro"
-- This checks the subscription and workspace setup

-- 1. Your current user info
SELECT 
    auth.uid() as your_user_id,
    auth.email() as your_email;

-- 2. All workspaces you're a member of (including owned)
SELECT 
    w.id as workspace_id,
    w.name as workspace_name,
    w.owner_id,
    wm.user_id as member_user_id,
    wm.role as member_role,
    (w.owner_id = auth.uid()) as you_are_owner,
    s.plan_type as subscription_plan,
    s.ai_requests_used,
    s.seat_count,
    s.status as subscription_status
FROM workspaces w
JOIN workspace_members wm ON w.id = wm.workspace_id
LEFT JOIN subscriptions s ON w.id = s.workspace_id
WHERE wm.user_id = auth.uid()
ORDER BY w.created_at DESC;

-- 3. Check if Team Pro workspace exists but subscription is missing/wrong
SELECT 
    w.id,
    w.name,
    w.owner_id,
    COUNT(wm.user_id) as member_count,
    s.plan_type,
    s.ai_requests_used,
    CASE 
        WHEN s.plan_type IS NULL THEN '❌ NO SUBSCRIPTION!'
        WHEN s.plan_type = 'free' AND COUNT(wm.user_id) > 1 THEN '⚠️ Multiple members on FREE plan'
        WHEN s.plan_type IN ('team-pro', 'team-starter') THEN '✅ Team plan'
        ELSE '⚠️ Check this'
    END as status
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
LEFT JOIN subscriptions s ON w.id = s.workspace_id
WHERE w.id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
)
GROUP BY w.id, w.name, w.owner_id, s.plan_type, s.ai_requests_used
ORDER BY w.created_at DESC;

-- 4. Fix: If a workspace should be team-pro but isn't, uncomment and run this:
-- UPDATE subscriptions 
-- SET plan_type = 'team-pro', ai_requests_used = 0
-- WHERE workspace_id = 'YOUR_WORKSPACE_ID_HERE';
