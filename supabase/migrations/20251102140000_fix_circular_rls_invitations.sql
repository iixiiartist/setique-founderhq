-- Fix circular RLS issue in workspace_invitations by simplifying policies

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Owners can view workspace invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Owners can create workspace invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Owners can revoke workspace invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON workspace_invitations;

-- Simpler policies without circular dependencies

-- Policy 1: Workspace owners can do everything with their workspace invitations
CREATE POLICY "Workspace owners manage invitations" ON workspace_invitations
    FOR ALL
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- Policy 2: Users can view invitations sent to their email (much simpler)
CREATE POLICY "Users view own email invitations" ON workspace_invitations
    FOR SELECT
    USING (
        email = (SELECT email FROM profiles WHERE id = auth.uid() LIMIT 1)
        AND status = 'pending'
    );

