-- Set the currently logged-in user as admin
-- User ID: f61f58d6-7ffa-4f05-902c-af4e4edc646e

UPDATE profiles 
SET is_admin = TRUE 
WHERE id = 'f61f58d6-7ffa-4f05-902c-af4e4edc646e';

-- Also upgrade this user's workspace to team-pro
UPDATE workspaces 
SET plan_type = 'team-pro'
WHERE owner_id = 'f61f58d6-7ffa-4f05-902c-af4e4edc646e';

-- Verify the changes
SELECT id, email, is_admin FROM profiles WHERE id = 'f61f58d6-7ffa-4f05-902c-af4e4edc646e';

SELECT id, name, plan_type FROM workspaces WHERE owner_id = 'f61f58d6-7ffa-4f05-902c-af4e4edc646e';

