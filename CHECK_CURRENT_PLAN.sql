-- Check current plan status for joe@setique.com
SELECT 
    'Current Status' as check_type,
    p.email,
    p.is_admin,
    w.id as workspace_id,
    w.plan_type as workspace_plan,
    w.seats as workspace_seats,
    s.plan_type as subscription_plan,
    s.seat_count as subscription_seats,
    s.status,
    s.current_period_end
FROM profiles p
LEFT JOIN workspaces w ON w.owner_id = p.id
LEFT JOIN subscriptions s ON s.workspace_id = w.id
WHERE p.email = 'joe@setique.com';
