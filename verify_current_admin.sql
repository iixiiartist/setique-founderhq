-- Verify current user is now admin
SELECT id, email, is_admin FROM profiles WHERE id = 'f61f58d6-7ffa-4f05-902c-af4e4edc646e';

-- Check workspace plan
SELECT id, name, plan_type, owner_id FROM workspaces WHERE id = '81a0cb25-8191-4f11-add8-6be68daf2994';
