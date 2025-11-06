-- Fix business_profile INSERT policy to work correctly
-- The issue: RLS is blocking INSERTs even for workspace owners
-- Solution: Ensure workspace ownership check works properly in INSERT policy

-- Drop and recreate INSERT policy with proper checks
DROP POLICY IF EXISTS "owner_insert_business_profile" ON business_profile;

-- Allow workspace owners to insert business profiles
-- Use WITH CHECK instead of USING for INSERT operations
CREATE POLICY "owner_insert_business_profile"
ON business_profile FOR INSERT
TO authenticated
WITH CHECK (
    -- Check if the user owns the workspace they're trying to create a profile for
    EXISTS (
        SELECT 1 FROM workspaces 
        WHERE workspaces.id = business_profile.workspace_id 
        AND workspaces.owner_id = auth.uid()
    )
);

-- Also ensure the UPDATE policy is correct
DROP POLICY IF EXISTS "owner_update_business_profile" ON business_profile;

CREATE POLICY "owner_update_business_profile"
ON business_profile FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces 
        WHERE workspaces.id = business_profile.workspace_id 
        AND workspaces.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspaces 
        WHERE workspaces.id = business_profile.workspace_id 
        AND workspaces.owner_id = auth.uid()
    )
);

COMMENT ON POLICY "owner_insert_business_profile" ON business_profile IS 'Workspace owners can create business profiles for their workspaces';
COMMENT ON POLICY "owner_update_business_profile" ON business_profile IS 'Workspace owners can update business profiles for their workspaces';
