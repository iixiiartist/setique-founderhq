-- Make BOTH accounts admin (to be safe)
UPDATE profiles 
SET is_admin = TRUE 
WHERE id IN ('f8722baa-9f38-44bf-81ef-ec167dc135c3', 'f61f58d6-7ffa-4f05-902c-af4e4edc646e');

-- Upgrade BOTH workspaces to team-pro
UPDATE workspaces 
SET plan_type = 'team-pro'
WHERE owner_id IN ('f8722baa-9f38-44bf-81ef-ec167dc135c3', 'f61f58d6-7ffa-4f05-902c-af4e4edc646e');

-- Show all users and their admin status
SELECT id, email, is_admin, created_at FROM profiles;

-- Show all workspaces and their plans
SELECT id, name, owner_id, plan_type FROM workspaces;
