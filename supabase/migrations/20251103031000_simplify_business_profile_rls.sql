-- Fix business_profile RLS to allow members to view workspace business profile
-- Migration: 20251103031000_simplify_business_profile_rls.sql

-- Drop existing policies that might cause recursion
DROP POLICY IF EXISTS "Users can view workspace business profiles" ON business_profile;
DROP POLICY IF EXISTS "Users can create business profiles" ON business_profile;
DROP POLICY IF EXISTS "Users can update business profiles" ON business_profile;

-- Simple SELECT policy: Users can view business profiles of workspaces they own
CREATE POLICY "owner_select_business_profile"
ON business_profile FOR SELECT
TO authenticated
USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
);

-- Members can view business profiles through a SECURITY DEFINER function
-- So we need a second SELECT policy for members
CREATE POLICY "member_select_business_profile"
ON business_profile FOR SELECT
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
);

-- Only owners can create/update business profiles
CREATE POLICY "owner_insert_business_profile"
ON business_profile FOR INSERT
TO authenticated
WITH CHECK (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
);

CREATE POLICY "owner_update_business_profile"
ON business_profile FOR UPDATE
TO authenticated
USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
);

COMMENT ON POLICY "owner_select_business_profile" ON business_profile IS 'Workspace owners can view their workspace business profile - no recursion';
COMMENT ON POLICY "member_select_business_profile" ON business_profile IS 'Workspace members can view the business profile of workspaces they belong to - no recursion';

