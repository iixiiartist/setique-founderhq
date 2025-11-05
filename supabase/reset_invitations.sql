-- Reset stuck invitations
-- Run this in Supabase Dashboard → SQL Editor

-- Reset all 'processing' invitations back to 'pending'
UPDATE workspace_invitations 
SET status = 'pending'
WHERE status = 'processing';

-- Also reset any 'accepted' invitations that might need to be re-sent
-- (optional - uncomment if you want to reset accepted invitations too)
-- UPDATE workspace_invitations 
-- SET status = 'pending'
-- WHERE status = 'accepted';

SELECT 'Invitations reset! All processing invitations are now pending again.' as status;
