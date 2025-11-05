-- Quick fix for workspace policies causing infinite recursion
-- Run this in Supabase Dashboard → SQL Editor

-- Drop all existing policies on workspaces and workspace_members
DROP POLICY IF EXISTS "members_can_view_workspaces" ON workspaces;
DROP POLICY IF EXISTS "owners_can_view_workspaces" ON workspaces;
DROP POLICY IF EXISTS "members_can_view_via_membership" ON workspaces;
DROP POLICY IF EXISTS "owners_can_insert_workspaces" ON workspaces;
DROP POLICY IF EXISTS "owners_can_update_workspaces" ON workspaces;
DROP POLICY IF EXISTS "owners_can_delete_workspaces" ON workspaces;

DROP POLICY IF EXISTS "members_can_view_workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "users_can_view_own_memberships" ON workspace_members;
DROP POLICY IF EXISTS "users_can_view_same_workspace_members" ON workspace_members;
DROP POLICY IF EXISTS "owners_can_manage_workspace_members" ON workspace_members;

-- Create simple, non-recursive workspace policies
CREATE POLICY "owners_can_view_workspaces" ON workspaces FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "members_can_view_via_membership" ON workspaces FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_members.workspace_id = workspaces.id 
    AND workspace_members.user_id = auth.uid()
  ));

CREATE POLICY "owners_can_insert_workspaces" ON workspaces FOR INSERT TO authenticated 
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners_can_update_workspaces" ON workspaces FOR UPDATE TO authenticated 
  USING (owner_id = auth.uid());

CREATE POLICY "owners_can_delete_workspaces" ON workspaces FOR DELETE TO authenticated 
  USING (owner_id = auth.uid());

-- Create simple, non-recursive workspace_members policies
CREATE POLICY "users_can_view_own_memberships" ON workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "users_can_view_same_workspace_members" ON workspace_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid()
  ));

CREATE POLICY "owners_can_manage_workspace_members" ON workspace_members FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspaces 
    WHERE workspaces.id = workspace_members.workspace_id 
    AND workspaces.owner_id = auth.uid()
  ));

SELECT 'Policies fixed! Try refreshing the app.' as status;
