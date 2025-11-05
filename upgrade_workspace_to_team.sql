-- Set workspace to team-pro plan (unlimited features) for testing
-- This allows admin to see team features

UPDATE workspaces 
SET plan_type = 'team-pro'
WHERE owner_id = 'f8722baa-9f38-44bf-81ef-ec167dc135c3';

-- Verify the change
SELECT id, name, owner_id, plan_type, created_at 
FROM workspaces 
WHERE owner_id = 'f8722baa-9f38-44bf-81ef-ec167dc135c3';
