-- Fix infinite recursion in workspace_members SELECT policy
-- The previous policy referenced workspace_members within itself, causing infinite recursion
-- Solution: Use a simpler policy that checks workspace ownership directly

DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;

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

