-- Fix infinite recursion in workspaces RLS policy
-- The workspaces SELECT policy references workspace_members, which references workspaces back
-- This creates a circular dependency causing infinite recursion

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;

-- Recreate with simpler logic that only checks ownership
-- For now, users can only see workspaces they own
-- TODO: Add team member access after fixing the circular dependency properly
CREATE POLICY "Users can view own workspaces" ON workspaces FOR SELECT 
    USING (owner_id = auth.uid());

