-- Upgrade workspace to team-pro plan for admin user
-- This enables full team features

UPDATE workspaces 
SET plan_type = 'team-pro'
WHERE owner_id = 'f8722baa-9f38-44bf-81ef-ec167dc135c3';

