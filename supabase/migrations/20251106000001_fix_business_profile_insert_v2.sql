-- Fix business_profile INSERT policy - v2
-- The issue: Row reference in WITH CHECK doesn't work as expected
-- Solution: Use simple subquery check against the workspace_id being inserted

-- Drop existing policy
DROP POLICY IF EXISTS "owner_insert_business_profile" ON business_profile;

-- Create new INSERT policy with correct syntax
-- WITH CHECK receives the NEW row values, so we can reference workspace_id directly
CREATE POLICY "owner_insert_business_profile"
ON business_profile FOR INSERT
TO authenticated
WITH CHECK (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
);

-- Verify UPDATE policy is also correct
DROP POLICY IF EXISTS "owner_update_business_profile" ON business_profile;

CREATE POLICY "owner_update_business_profile"
ON business_profile FOR UPDATE
TO authenticated
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

-- Also add DELETE policy for completeness
DROP POLICY IF EXISTS "owner_delete_business_profile" ON business_profile;

CREATE POLICY "owner_delete_business_profile"
ON business_profile FOR DELETE
TO authenticated
USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
);

COMMENT ON POLICY "owner_insert_business_profile" ON business_profile IS 'Workspace owners can create business profiles - simplified check';
COMMENT ON POLICY "owner_update_business_profile" ON business_profile IS 'Workspace owners can update their business profiles';
COMMENT ON POLICY "owner_delete_business_profile" ON business_profile IS 'Workspace owners can delete their business profiles';
