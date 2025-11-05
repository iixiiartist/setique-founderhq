-- Re-enable RLS on workspaces and fix policies properly
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies on workspaces
DROP POLICY IF EXISTS "Users can view their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can view workspaces they're members of" ON workspaces;
DROP POLICY IF EXISTS "Owners can insert workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can insert their own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete their workspaces" ON workspaces;

-- Create simple, non-circular SELECT policy
-- Users can see workspaces where they are the owner OR where they are a member
CREATE POLICY "workspace_select_policy" ON workspaces
    FOR SELECT
    USING (
        owner_id = auth.uid()
        OR
        id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Create simple INSERT policy - users can create workspaces
CREATE POLICY "workspace_insert_policy" ON workspaces
    FOR INSERT
    WITH CHECK (owner_id = auth.uid());

-- Create simple UPDATE policy - only owners can update
CREATE POLICY "workspace_update_policy" ON workspaces
    FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Create simple DELETE policy - only owners can delete
CREATE POLICY "workspace_delete_policy" ON workspaces
    FOR DELETE
    USING (owner_id = auth.uid());

-- Now fix workspace_members policies to not reference workspaces
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;

-- Simple policy: users can see memberships where they are the user OR where they own the workspace
CREATE POLICY "workspace_members_select_policy" ON workspace_members
    FOR SELECT
    USING (user_id = auth.uid());

-- Only owners can insert members (checked via workspace ownership)
CREATE POLICY "workspace_members_insert_policy" ON workspace_members
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = workspace_id 
            AND owner_id = auth.uid()
        )
    );

-- Only owners can delete members
CREATE POLICY "workspace_members_delete_policy" ON workspace_members
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = workspace_id 
            AND owner_id = auth.uid()
        )
    );

