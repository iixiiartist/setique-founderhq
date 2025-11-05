-- Verify admin status and reset AI usage for testing
SELECT id, email, is_admin, created_at 
FROM profiles 
WHERE id = 'f8722baa-9f38-44bf-81ef-ec167dc135c3';

-- Also check subscription status
SELECT workspace_id, plan_type, ai_requests_used, ai_requests_limit
FROM subscriptions
WHERE workspace_id = '08aa7e67-a131-443a-b46f-5f53a4013f0c';

-- Reset AI usage to 0 for testing (optional - uncomment to run)
-- UPDATE subscriptions
-- SET ai_requests_used = 0
-- WHERE workspace_id = '08aa7e67-a131-443a-b46f-5f53a4013f0c';
