-- Revert to simple working policies
-- The member visibility subquery is causing recursion again

DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;

-- Simple workspaces policy (owner only)
CREATE POLICY "workspaces_select_policy" ON workspaces
    FOR SELECT
    USING (owner_id = auth.uid());

-- Simple workspace_members policy (self + owner's workspace members)
CREATE POLICY "workspace_members_select_policy" ON workspace_members
    FOR SELECT
    USING (
        -- Can see your own membership records
        user_id = auth.uid()
        OR
        -- Can see members of workspaces you own
        workspace_id IN (
            SELECT id 
            FROM workspaces 
            WHERE owner_id = auth.uid()
        )
    );

