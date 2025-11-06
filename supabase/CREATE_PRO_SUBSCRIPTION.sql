-- Create Pro Individual Subscription
-- Run this in Supabase SQL Editor to set yourself up with a Pro plan

INSERT INTO subscriptions (
    workspace_id, 
    plan_type, 
    status, 
    ai_requests_used, 
    ai_requests_limit, 
    seat_count,
    ai_requests_reset_at
)
SELECT 
    id,                          -- workspace_id
    'pro-individual',            -- Pro plan (500 AI requests/month)
    'active',                    -- Active status
    0,                           -- Start with 0 usage
    500,                         -- 500 request limit
    1,                           -- 1 seat (individual plan)
    NOW()                        -- Reset date
FROM workspaces
WHERE owner_id = auth.uid()
LIMIT 1;

-- Verify it was created
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
WHERE w.owner_id = auth.uid();
