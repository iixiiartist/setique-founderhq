-- Quick test query to check a specific user's subscription state
-- Replace 'USER_EMAIL_HERE' with the actual user email you're trying to update

SELECT 
    p.id as user_id,
    p.email,
    w.id as workspace_id,
    w.plan_type as workspace_plan,
    w.seats as workspace_seats,
    s.plan_type as subscription_plan,
    s.seat_count as subscription_seat_count,
    s.used_seats,
    s.ai_requests_limit,
    s.status,
    (SELECT COUNT(*) FROM workspace_members wm WHERE wm.workspace_id = w.id) as actual_members
FROM profiles p
LEFT JOIN workspaces w ON w.owner_id = p.id
LEFT JOIN subscriptions s ON s.workspace_id = w.id
WHERE p.email = 'USER_EMAIL_HERE';

-- Also check if there are multiple workspaces for this user
SELECT 
    'Multiple workspaces for user?' as check,
    p.email,
    COUNT(w.id) as workspace_count
FROM profiles p
LEFT JOIN workspaces w ON w.owner_id = p.id
WHERE p.email = 'USER_EMAIL_HERE'
GROUP BY p.email;
