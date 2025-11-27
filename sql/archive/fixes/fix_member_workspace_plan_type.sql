-- Fix get_member_workspace to return subscription plan_type
-- Migration: Fix member workspace to show correct team-pro plan

DROP FUNCTION IF EXISTS get_member_workspace();

CREATE OR REPLACE FUNCTION get_member_workspace()
RETURNS TABLE (
    id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    name TEXT,
    plan_type TEXT,
    owner_id UUID,
    seat_count INTEGER,
    ai_usage_count INTEGER
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Return workspace where user is a member (not owner)
    -- Use subscription plan_type if available, fallback to workspace plan_type
    RETURN QUERY
    SELECT 
        w.id,
        w.created_at,
        w.updated_at,
        w.name,
        COALESCE(s.plan_type::text, w.plan_type::text) as plan_type,  -- Use subscription plan_type if exists
        w.owner_id,
        COALESCE(s.seat_count, w.seat_count, 1) as seat_count,
        COALESCE(w.ai_usage_count, 0) as ai_usage_count
    FROM workspaces w
    INNER JOIN workspace_members wm ON wm.workspace_id = w.id
    LEFT JOIN subscriptions s ON s.workspace_id = w.id
    WHERE wm.user_id = auth.uid()
    AND w.owner_id != auth.uid()
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION get_member_workspace() TO authenticated;

COMMENT ON FUNCTION get_member_workspace() IS 'Returns the workspace where the current user is a member (not owner). Uses subscription plan_type for accurate plan information.';
