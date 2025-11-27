-- STEP 1: Clean up ALL test data for II XII
DELETE FROM workspaces WHERE owner_id IN (
    SELECT id FROM auth.users WHERE email = 'iixiiartist@gmail.com'
);
DELETE FROM workspace_members WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'iixiiartist@gmail.com'
);
DELETE FROM auth.users WHERE email = 'iixiiartist@gmail.com';

-- STEP 2: Delete ALL old invitations (they're all 'accepted' already)
DELETE FROM workspace_invitations WHERE email = 'iixiiartist@gmail.com';

-- STEP 3: Verify cleanup
SELECT 'Cleanup complete. Now send a FRESH invitation from Joe''s dashboard!' as next_step;

-- After sending new invite, run this to get the link:
-- SELECT 'http://localhost:3001?token=' || token as invite_link
-- FROM workspace_invitations 
-- WHERE email = 'iixiiartist@gmail.com' AND status = 'pending'
-- ORDER BY created_at DESC LIMIT 1;
