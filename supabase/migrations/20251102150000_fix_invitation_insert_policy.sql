-- Fix workspace_invitations INSERT policy
-- The issue is that FOR ALL includes INSERT, but INSERT needs WITH CHECK clause

-- Drop the existing "FOR ALL" policy
DROP POLICY IF EXISTS "Workspace owners manage invitations" ON workspace_invitations;

-- Create separate policies for different operations

-- SELECT policy: Workspace owners can view their workspace invitations
CREATE POLICY "Workspace owners view invitations" ON workspace_invitations
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- INSERT policy: Workspace owners can create invitations for their workspace
CREATE POLICY "Workspace owners create invitations" ON workspace_invitations
    FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- UPDATE policy: Workspace owners can update (revoke) invitations
CREATE POLICY "Workspace owners update invitations" ON workspace_invitations
    FOR UPDATE
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    )
    WITH CHECK (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

-- DELETE policy: Workspace owners can delete invitations
CREATE POLICY "Workspace owners delete invitations" ON workspace_invitations
    FOR DELETE
    USING (
        workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

