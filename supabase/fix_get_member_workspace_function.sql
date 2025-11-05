-- Fix the get_member_workspace function to handle plan_type enum correctly
-- Run this in Supabase Dashboard → SQL Editor

-- Drop the old function
DROP FUNCTION IF EXISTS get_member_workspace();

-- Recreate with correct return type (cast plan_type to text)
CREATE OR REPLACE FUNCTION get_member_workspace()
RETURNS TABLE (
  id UUID,
  name TEXT,
  owner_id UUID,
  plan_type TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    w.id,
    w.name,
    w.owner_id,
    w.plan_type::TEXT,  -- Cast enum to text
    w.created_at
  FROM workspaces w
  INNER JOIN workspace_members wm ON wm.workspace_id = w.id
  WHERE wm.user_id = auth.uid();
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_member_workspace() TO authenticated;

-- Test the function works
SELECT * FROM get_member_workspace();

-- Check if user is in workspace_members
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

SELECT 'Function fixed and tested!' as status;
