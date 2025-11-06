-- Force update all subscription limits to correct values
-- This manually sets the correct limits based on plan type

-- Update all free plans to correct limits
UPDATE subscriptions
SET 
    ai_requests_limit = 20,
    storage_bytes_limit = 104857600, -- 100 MB
    file_count_limit = 25,
    seat_count = 1,
    updated_at = NOW()
WHERE plan_type = 'free';

-- Verify the fix worked
SELECT 
    w.name as workspace_name,
    s.plan_type,
    s.ai_requests_limit,
    s.file_count_limit,
    ROUND(s.storage_bytes_limit / 1048576.0, 1) as storage_mb,
    s.seat_count
FROM workspaces w
JOIN subscriptions s ON s.workspace_id = w.id
ORDER BY w.name;
