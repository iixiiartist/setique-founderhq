-- Complete reset of business_profile RLS policies
-- This will drop ALL existing policies and recreate them from scratch

-- First, let's see what we're working with
-- You can run: SELECT * FROM pg_policies WHERE tablename = 'business_profile';

-- Drop ALL possible policy names that might exist
DROP POLICY IF EXISTS "Users can view business profiles of their workspaces" ON business_profile;
DROP POLICY IF EXISTS "Workspace owners can create business profiles" ON business_profile;
DROP POLICY IF EXISTS "Workspace owners can update business profiles" ON business_profile;
DROP POLICY IF EXISTS "Workspace owners can delete business profiles" ON business_profile;
DROP POLICY IF EXISTS "Users can view workspace business profiles" ON business_profile;
DROP POLICY IF EXISTS "Users can create business profiles" ON business_profile;
DROP POLICY IF EXISTS "Users can update business profiles" ON business_profile;
DROP POLICY IF EXISTS "owner_select_business_profile" ON business_profile;
DROP POLICY IF EXISTS "member_select_business_profile" ON business_profile;
DROP POLICY IF EXISTS "owner_insert_business_profile" ON business_profile;
DROP POLICY IF EXISTS "owner_update_business_profile" ON business_profile;
DROP POLICY IF EXISTS "owner_delete_business_profile" ON business_profile;

-- Now create fresh, simple policies that WILL work

-- 1. SELECT: Owners and members can view
CREATE POLICY "select_business_profile_owner"
ON business_profile FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = business_profile.workspace_id
        AND w.owner_id = auth.uid()
    )
);

CREATE POLICY "select_business_profile_member"
ON business_profile FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = business_profile.workspace_id
        AND wm.user_id = auth.uid()
    )
);

-- 2. INSERT: Only owners can create
CREATE POLICY "insert_business_profile"
ON business_profile FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_id
        AND w.owner_id = auth.uid()
    )
);

-- 3. UPDATE: Only owners can update
CREATE POLICY "update_business_profile"
ON business_profile FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = business_profile.workspace_id
        AND w.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = business_profile.workspace_id
        AND w.owner_id = auth.uid()
    )
);

-- 4. DELETE: Only owners can delete
CREATE POLICY "delete_business_profile"
ON business_profile FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = business_profile.workspace_id
        AND w.owner_id = auth.uid()
    )
);

-- Verify RLS is enabled
ALTER TABLE business_profile ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON POLICY "select_business_profile_owner" ON business_profile IS 'Workspace owners can view their business profile';
COMMENT ON POLICY "select_business_profile_member" ON business_profile IS 'Workspace members can view the business profile';
COMMENT ON POLICY "insert_business_profile" ON business_profile IS 'Only workspace owners can create business profiles';
COMMENT ON POLICY "update_business_profile" ON business_profile IS 'Only workspace owners can update business profiles';
COMMENT ON POLICY "delete_business_profile" ON business_profile IS 'Only workspace owners can delete business profiles';
