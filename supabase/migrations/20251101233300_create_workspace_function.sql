-- Create a function to get user workspaces that bypasses RLS
-- This will be called from the client and will return workspaces the user can access

CREATE OR REPLACE FUNCTION get_user_workspaces(user_id_param UUID)
RETURNS TABLE (
    id UUID,
    owner_id UUID,
    name TEXT,
    plan_type plan_type,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    user_role workspace_role
) 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id,
        w.owner_id,
        w.name,
        w.plan_type,
        w.created_at,
        w.updated_at,
        CASE 
            WHEN w.owner_id = user_id_param THEN 'owner'::workspace_role
            ELSE COALESCE(wm.role, 'member'::workspace_role)
        END as user_role
    FROM workspaces w
    LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND wm.user_id = user_id_param
    WHERE w.owner_id = user_id_param 
       OR wm.user_id = user_id_param
    ORDER BY w.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_workspaces(UUID) TO authenticated;

