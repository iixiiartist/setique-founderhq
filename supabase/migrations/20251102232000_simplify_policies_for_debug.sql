-- Temporary fix: Simplify policies to troubleshoot
-- Let's use the most basic policies possible without any joins

-- Drop existing policies
DROP POLICY IF EXISTS "workspaces_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;

-- Create simplest possible workspaces policy (owner only for now)
CREATE POLICY "workspaces_select_basic" ON workspaces
    FOR SELECT
    USING (owner_id = auth.uid());

-- Create simplest possible workspace_members policy
CREATE POLICY "workspace_members_select_basic" ON workspace_members
    FOR SELECT
    USING (user_id = auth.uid());

-- We'll add back the member workspace visibility after we verify this works

