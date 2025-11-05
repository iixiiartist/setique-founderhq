-- Ultra-simple invitation policies to avoid ALL recursion
-- Migration: 20251103025000_simplest_invitation_policies.sql

-- Drop ALL existing policies
DROP POLICY IF EXISTS "invitations_select" ON workspace_invitations;
DROP POLICY IF EXISTS "invitations_insert" ON workspace_invitations;
DROP POLICY IF EXISTS "invitations_update" ON workspace_invitations;
DROP POLICY IF EXISTS "invitations_delete" ON workspace_invitations;

-- Temporarily disable RLS to test
ALTER TABLE workspace_invitations DISABLE ROW LEVEL SECURITY;

-- Re-enable with simplest possible policies
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read all invitations (we'll filter in app code if needed)
CREATE POLICY "invitations_select_all"
ON workspace_invitations FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert invitations (we'll validate workspace ownership in app)
CREATE POLICY "invitations_insert_all"
ON workspace_invitations FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow authenticated users to update invitations
CREATE POLICY "invitations_update_all"
ON workspace_invitations FOR UPDATE
TO authenticated
USING (true);

-- Allow authenticated users to delete invitations
CREATE POLICY "invitations_delete_all"
ON workspace_invitations FOR DELETE
TO authenticated
USING (true);

-- Verification
DO $$
BEGIN
    RAISE NOTICE '=======================================================';
    RAISE NOTICE 'TEMPORARY: Open Invitation Policies';
    RAISE NOTICE '=======================================================';
    RAISE NOTICE '⚠️  This is a temporary fix to unblock development';
    RAISE NOTICE '⚠️  All authenticated users can access invitations';
    RAISE NOTICE '⚠️  TODO: Add proper validation in application layer';
    RAISE NOTICE '⚠️  Or fix RLS recursion issue properly';
    RAISE NOTICE '=======================================================';
END $$;

