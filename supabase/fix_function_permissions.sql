-- Grant permissions and check the function
-- Run this in Supabase Dashboard → SQL Editor

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_member_workspace() TO authenticated;

-- Test the function works
SELECT * FROM get_member_workspace();

-- Also check what's actually in workspace_members for this user
SELECT 
  wm.id,
  wm.workspace_id,
  wm.user_id,
  wm.role,
  w.name as workspace_name,
  p.email
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
JOIN profiles p ON p.id = wm.user_id
WHERE wm.user_id = '3a191135-bf21-4e74-a0c1-851feb74c091';

SELECT 'Check complete!' as status;
