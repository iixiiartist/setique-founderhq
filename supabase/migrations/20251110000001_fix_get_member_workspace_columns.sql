-- Fix get_member_workspace function to use correct workspace columns
-- Migration: 20251110000001_fix_get_member_workspace_columns.sql
-- Date: 2025-11-10

DROP FUNCTION IF EXISTS get_member_workspace();

CREATE OR REPLACE FUNCTION get_member_workspace()
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    name TEXT,
    plan_type TEXT,
    owner_id UUID,
    seat_count INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Return workspace where user is a member (not owner)
    -- Only return columns that actually exist in workspaces table
    RETURN QUERY
    SELECT 
        w.id,
        w.created_at,
        w.updated_at,
        w.name,
        w.plan_type::text,  -- Cast enum/text to text
        w.owner_id,
        COALESCE(s.seat_count, 1) as seat_count  -- Get seat_count from subscriptions
    FROM workspaces w
    INNER JOIN workspace_members wm ON wm.workspace_id = w.id
    LEFT JOIN subscriptions s ON s.workspace_id = w.id
    WHERE wm.user_id = auth.uid()
    AND w.owner_id != auth.uid()
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_workspace() TO authenticated;

COMMENT ON FUNCTION get_member_workspace() IS 'Returns the workspace where the current user is a member (not owner). Returns correct columns from workspaces table.';
