-- Force add user to workspace using SECURITY DEFINER to bypass RLS
-- Run this in Supabase Dashboard → SQL Editor

-- Create a privileged function that can bypass RLS
CREATE OR REPLACE FUNCTION admin_add_workspace_member(
  p_workspace_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_invited_by UUID
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  member_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_member_id UUID;
BEGIN
  -- Insert the user into workspace_members
  INSERT INTO workspace_members (workspace_id, user_id, role, invited_by)
  VALUES (p_workspace_id, p_user_id, p_role, p_invited_by)
  ON CONFLICT (workspace_id, user_id) DO UPDATE
  SET role = EXCLUDED.role,
      invited_by = EXCLUDED.invited_by
  RETURNING id INTO v_member_id;
  
  -- Return success
  RETURN QUERY SELECT TRUE, 'User added successfully'::TEXT, v_member_id;
  
EXCEPTION WHEN OTHERS THEN
  -- Return error details
  RETURN QUERY SELECT FALSE, SQLERRM::TEXT, NULL::UUID;
END;
$$;

-- Grant execute to authenticated users (but function runs with elevated privileges)
GRANT EXECUTE ON FUNCTION admin_add_workspace_member(UUID, UUID, TEXT, UUID) TO authenticated;

-- Now call the function to add the user
SELECT * FROM admin_add_workspace_member(
  '06ce0397-0587-4f25-abbd-7aefd4072bb3'::UUID,  -- Setique workspace
  '3a191135-bf21-4e74-a0c1-851feb74c091'::UUID,  -- iixiiartist@gmail.com
  'member',
  'fbba1e0b-d99f-433b-9de4-0d982bc0a70c'::UUID   -- joe@setique.com
);

-- Verify the user was added
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

-- Test that get_member_workspace now returns data
SELECT * FROM get_member_workspace();

SELECT 'User should now be added to workspace!' as status;
