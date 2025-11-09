-- Debug AI limit issue for team members
-- Check workspace subscription and member details

-- 1. Get your current user info
SELECT 
    auth.uid() as your_user_id,
    auth.email() as your_email;

-- 2. Check your workspace memberships
SELECT 
    wm.workspace_id,
    w.name as workspace_name,
    wm.role as your_role,
    w.owner_id,
    (w.owner_id = auth.uid()) as you_are_owner
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
WHERE wm.user_id = auth.uid();

-- 3. Check subscriptions for those workspaces
SELECT 
    s.workspace_id,
    w.name as workspace_name,
    s.plan_type,
    s.ai_requests_used,
    s.seat_count,
    s.status,
    s.ai_requests_reset_at
FROM subscriptions s
JOIN workspaces w ON s.workspace_id = w.id
WHERE s.workspace_id IN (
    SELECT workspace_id 
    FROM workspace_members 
    WHERE user_id = auth.uid()
);

-- 4. Check if there's a mismatch (member of workspace but no subscription or wrong plan)
SELECT 
    wm.workspace_id,
    w.name as workspace_name,
    wm.role,
    s.plan_type,
    s.ai_requests_used,
    CASE 
        WHEN s.plan_type IS NULL THEN 'No subscription found'
        WHEN s.plan_type = 'free' AND wm.role = 'member' THEN 'Member of free workspace'
        WHEN s.plan_type IN ('team-starter', 'team-pro') THEN 'Should have team access'
        ELSE 'Other'
    END as status
FROM workspace_members wm
JOIN workspaces w ON wm.workspace_id = w.id
LEFT JOIN subscriptions s ON s.workspace_id = wm.workspace_id
WHERE wm.user_id = auth.uid();
