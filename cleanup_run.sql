-- Clean up test data for II XII
DELETE FROM workspaces WHERE owner_id IN (SELECT id FROM auth.users WHERE email = 'iixiiartist@gmail.com');
DELETE FROM workspace_members WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'iixiiartist@gmail.com');
DELETE FROM auth.users WHERE email = 'iixiiartist@gmail.com';
DELETE FROM workspace_invitations WHERE email = 'iixiiartist@gmail.com';
SELECT 'Cleanup complete!' as status;
