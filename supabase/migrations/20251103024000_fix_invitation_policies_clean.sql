-- Clean up and fix workspace_invitations RLS policies
-- Migration: 20251103024000_fix_invitation_policies_clean.sql

-- Drop ALL existing policies on workspace_invitations
DROP POLICY IF EXISTS "Owners can view workspace invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Owners can create workspace invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Owners can revoke workspace invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to their email" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace owners manage invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Users view own email invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace owners view invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace owners create invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace owners update invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "Workspace owners delete invitations" ON workspace_invitations;
DROP POLICY IF EXISTS "invitations_select_own" ON workspace_invitations;
DROP POLICY IF EXISTS "invitations_insert_owner" ON workspace_invitations;
DROP POLICY IF EXISTS "invitations_update_own" ON workspace_invitations;
DROP POLICY IF EXISTS "invitations_delete_owner" ON workspace_invitations;

-- Create simple, non-recursive policies using SECURITY DEFINER function

-- Function to check if user owns workspace
CREATE OR REPLACE FUNCTION user_owns_workspace(workspace_uuid UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM workspaces 
        WHERE id = workspace_uuid 
        AND owner_id = auth.uid()
    );
END;
$$;

GRANT EXECUTE ON FUNCTION user_owns_workspace(UUID) TO authenticated;

-- SELECT: Users can see invitations to their email OR invitations they created
CREATE POLICY "invitations_select"
ON workspace_invitations FOR SELECT
TO authenticated
USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_owns_workspace(workspace_id)
);

-- INSERT: Only workspace owners can create invitations
CREATE POLICY "invitations_insert"
ON workspace_invitations FOR INSERT
TO authenticated
WITH CHECK (user_owns_workspace(workspace_id));

-- UPDATE: Users can update invitations sent to them, OR owners can update their invitations
CREATE POLICY "invitations_update"
ON workspace_invitations FOR UPDATE
TO authenticated
USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR user_owns_workspace(workspace_id)
);

-- DELETE: Only workspace owners can delete invitations
CREATE POLICY "invitations_delete"
ON workspace_invitations FOR DELETE
TO authenticated
USING (user_owns_workspace(workspace_id));

-- Verification
DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'Fixed: Workspace Invitations RLS Policies';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '✓ Cleaned up all old invitation policies';
    RAISE NOTICE '✓ Created SECURITY DEFINER helper function';
    RAISE NOTICE '✓ Simple policies using helper function';
    RAISE NOTICE '✓ No RLS recursion possible';
    RAISE NOTICE '=======================================================';
END $$;

