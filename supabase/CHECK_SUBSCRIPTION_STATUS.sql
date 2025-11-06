-- Quick Subscription Status Check
-- Copy and paste this into Supabase SQL Editor: https://supabase.com/dashboard/project/jffnzpdcmdalxqhkfymx/sql/new

-- 1. Check if you have a subscription
SELECT 
    s.id,
    w.name as workspace_name,
    s.plan_type,
    s.status,
    s.ai_requests_used,
    s.ai_requests_limit,
    (s.ai_requests_limit - s.ai_requests_used) as remaining_requests,
    s.seat_count,
    s.created_at
FROM subscriptions s
JOIN workspaces w ON s.workspace_id = w.id
WHERE w.owner_id = auth.uid()
ORDER BY s.created_at DESC;

-- 2. If no results, create a free subscription
-- INSERT INTO subscriptions (workspace_id, plan_type, status, ai_requests_used, ai_requests_limit, seat_count)
-- SELECT id, 'free', 'active', 0, 20, 1
-- FROM workspaces
-- WHERE owner_id = auth.uid()
-- LIMIT 1;
