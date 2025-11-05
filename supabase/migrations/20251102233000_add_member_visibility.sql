-- Add back workspace visibility for members
-- Now that basic policy works, let's add member workspace visibility

-- Update workspaces policy to allow members to see workspaces they belong to
DROP POLICY IF EXISTS "workspaces_select_basic" ON workspaces;

CREATE POLICY "workspaces_select_policy" ON workspaces
    FOR SELECT
    USING (
        -- Owner can see their own workspaces
        owner_id = auth.uid()
        OR
        -- Members can see workspaces they belong to
        id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Update workspace_members policy to allow owners to see all members
DROP POLICY IF EXISTS "workspace_members_select_basic" ON workspace_members;

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

