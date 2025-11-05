-- Fix infinite recursion in both workspaces and workspace_members policies
-- The issue: workspaces policy checks workspace_members, and workspace_members policy checks workspaces
-- This creates a circular dependency causing infinite recursion
-- Solution: Temporarily disable RLS, create helper functions, then use simpler policies

-- Step 1: Drop the problematic policies
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "workspace_members_select_policy" ON workspace_members;

-- Step 2: Create helper function to check workspace membership (SECURITY DEFINER to bypass RLS)
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM workspace_members 
        WHERE workspace_id = workspace_uuid 
        AND user_id = user_uuid
    );
END;
$$;

-- Step 3: Create workspaces SELECT policy using the helper function
CREATE POLICY "workspaces_select_policy" ON workspaces
    FOR SELECT
    USING (
        owner_id = auth.uid() 
        OR is_workspace_member(id, auth.uid())
    );

-- Step 4: Create workspace_members SELECT policy (no circular dependency)
CREATE POLICY "workspace_members_select_policy" ON workspace_members
    FOR SELECT
    USING (
        -- Can see your own membership records
        user_id = auth.uid()
        OR
        -- Can see members of workspaces you own
        workspace_id IN (
            SELECT id 
            FROM workspaces 
            WHERE owner_id = auth.uid()
        )
    );

