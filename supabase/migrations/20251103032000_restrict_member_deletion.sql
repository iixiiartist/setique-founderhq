-- Restrict workspace_members deletion to only workspace owners
-- Migration: 20251103032000_restrict_member_deletion.sql

-- Drop existing DELETE policy if any
DROP POLICY IF EXISTS "Users can remove workspace members" ON workspace_members;
DROP POLICY IF EXISTS "delete_workspace_members" ON workspace_members;

-- Only workspace owners can delete members
CREATE POLICY "owner_delete_workspace_members"
ON workspace_members FOR DELETE
TO authenticated
USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
    -- Additional safety: prevent deleting the owner themselves
    AND user_id != (SELECT owner_id FROM workspaces WHERE id = workspace_members.workspace_id)
);

COMMENT ON POLICY "owner_delete_workspace_members" ON workspace_members IS 'Only workspace owners can remove members, and they cannot remove themselves';

