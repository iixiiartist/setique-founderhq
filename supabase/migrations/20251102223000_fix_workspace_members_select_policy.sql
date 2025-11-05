-- Fix workspace_members SELECT policy to allow users to see all members of their workspaces
-- Current policy only allows seeing your own membership record
-- New policy allows seeing all members of workspaces you're a member of OR workspaces you own

DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;

CREATE POLICY "workspace_members_select_policy" ON workspace_members
    FOR SELECT
    USING (
        -- Can see members of workspaces where you are a member
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
        OR
        -- Can see members of workspaces you own
        workspace_id IN (
            SELECT id 
            FROM workspaces 
            WHERE owner_id = auth.uid()
        )
    );

