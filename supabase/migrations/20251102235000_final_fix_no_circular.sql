-- Final fix: Remove the circular dependency by only checking owner for workspaces
-- The issue: workspaces policy checks workspace_members table via subquery
-- This causes infinite recursion when workspace_members policy checks workspaces

DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;

-- Workspaces policy: ONLY check ownership (no workspace_members subquery)
CREATE POLICY "workspaces_select_policy" ON workspaces
    FOR SELECT
    USING (owner_id = auth.uid());

-- Note: Members will see workspaces through the application logic
-- by querying workspace_members first, then fetching workspace details
-- This avoids the RLS circular dependency

