-- Manually add the invited user to Joe's workspace
-- Run this in Supabase Dashboard → SQL Editor

-- User details:
-- Email: iixiiartist@gmail.com
-- User ID: 3a191135-bf21-4e74-a0c1-851feb74c091
-- Workspace: Setique (06ce0397-0587-4f25-abbd-7aefd4072bb3)
-- Owner: joe@setique.com (fbba1e0b-d99f-433b-9de4-0d982bc0a70c)

-- First, verify the user exists in profiles
SELECT id, email, full_name FROM profiles 
WHERE id = '3a191135-bf21-4e74-a0c1-851feb74c091';

-- Check if they're already a workspace member
SELECT * FROM workspace_members 
WHERE user_id = '3a191135-bf21-4e74-a0c1-851feb74c091';

-- Add user to Joe's workspace as a member
INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
VALUES (
  '06ce0397-0587-4f25-abbd-7aefd4072bb3', -- Setique workspace
  '3a191135-bf21-4e74-a0c1-851feb74c091', -- iixiiartist@gmail.com
  'member',
  'fbba1e0b-d99f-433b-9de4-0d982bc0a70c'  -- joe@setique.com
)
ON CONFLICT DO NOTHING;

-- Verify the user is now a member
SELECT 
  w.name as workspace_name,
  wm.role,
  p_owner.email as owner_email,
  p_member.email as member_email
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
JOIN profiles p_owner ON p_owner.id = w.owner_id
JOIN profiles p_member ON p_member.id = wm.user_id
WHERE wm.user_id = '3a191135-bf21-4e74-a0c1-851feb74c091';

-- Expected result: One row showing "Setique" workspace, "member" role, joe@setique.com as owner

SELECT 'User successfully added to workspace! Have them sign out and sign back in.' as status;
