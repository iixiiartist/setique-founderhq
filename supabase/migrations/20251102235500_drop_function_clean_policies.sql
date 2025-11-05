-- Drop the potentially problematic function and ensure clean policies

-- Drop the SECURITY DEFINER function that might be causing issues
DROP FUNCTION IF EXISTS is_workspace_member(UUID, UUID);

-- Verify clean policies
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;

-- Create the simplest possible policies
CREATE POLICY "workspaces_select_policy" ON workspaces
    FOR SELECT
    USING (owner_id = auth.uid());

CREATE POLICY "workspace_members_select_policy" ON workspace_members
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        workspace_id IN (
            SELECT id 
            FROM workspaces 
            WHERE owner_id = auth.uid()
        )
    );

