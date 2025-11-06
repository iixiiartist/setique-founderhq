-- Check workspace plan type for the current user
-- Run this in Supabase SQL Editor to see your workspace's plan

SELECT 
    w.id as workspace_id,
    w.name as workspace_name,
    w.plan_type,
    w.owner_id,
    p.email as owner_email,
    p.full_name as owner_name,
    s.plan_type as subscription_plan_type,
    s.status as subscription_status,
    s.ai_requests_used,
    s.ai_requests_limit
FROM workspaces w
JOIN profiles p ON w.owner_id = p.id
LEFT JOIN subscriptions s ON w.id = s.workspace_id
WHERE p.email = auth.email(); -- Shows YOUR workspace

-- If the plan_type is NULL or not 'free', run this to fix it:
-- UPDATE workspaces 
-- SET plan_type = 'free' 
-- WHERE owner_id = auth.uid() AND plan_type IS NULL;

-- Also ensure subscription exists:
-- INSERT INTO subscriptions (workspace_id, plan_type, ai_requests_limit, ai_requests_used, ai_requests_reset_at)
-- SELECT id, 'free', 0, 0, NOW()
-- FROM workspaces 
-- WHERE owner_id = auth.uid()
-- ON CONFLICT (workspace_id) DO UPDATE
-- SET plan_type = 'free', ai_requests_limit = 0;
