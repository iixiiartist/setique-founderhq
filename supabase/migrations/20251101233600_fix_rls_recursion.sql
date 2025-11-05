-- Fix infinite recursion in RLS policies
-- The issue is that the workspace_members policy references workspace_members in its USING clause

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;

-- Recreate with simpler logic that doesn't cause recursion
-- Users can view workspace_members if they are IN that workspace OR own the workspace
CREATE POLICY "Users can view workspace members" ON workspace_members FOR SELECT 
    USING (
        user_id = auth.uid() 
        OR workspace_id IN (
            SELECT id FROM workspaces WHERE owner_id = auth.uid()
        )
    );

