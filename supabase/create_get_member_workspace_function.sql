-- Create missing get_member_workspace function
-- Run this in Supabase Dashboard → SQL Editor

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
    w.plan_type,
    w.created_at
  FROM workspaces w
  INNER JOIN workspace_members wm ON wm.workspace_id = w.id
  WHERE wm.user_id = auth.uid();
END;
$$;

SELECT 'Function get_member_workspace created successfully!' as status;
