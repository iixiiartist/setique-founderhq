-- Fixed version - breaks the recursion cycle completely
-- Run this in Supabase Dashboard → SQL Editor

-- Drop ALL policies on both tables
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

-- Workspace policies (NO reference to workspace_members)
CREATE POLICY "owners_can_view_workspaces" ON workspaces FOR SELECT TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "owners_can_insert_workspaces" ON workspaces FOR INSERT TO authenticated 
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "owners_can_update_workspaces" ON workspaces FOR UPDATE TO authenticated 
  USING (owner_id = auth.uid());

CREATE POLICY "owners_can_delete_workspaces" ON workspaces FOR DELETE TO authenticated 
  USING (owner_id = auth.uid());

-- Workspace_members policies (NO reference back to workspaces for SELECT)
CREATE POLICY "users_can_view_all_workspace_members" ON workspace_members FOR SELECT TO authenticated
  USING (true);  -- Allow all authenticated users to view memberships

CREATE POLICY "users_can_insert_own_membership" ON workspace_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "owners_can_update_members" ON workspace_members FOR UPDATE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

CREATE POLICY "owners_can_delete_members" ON workspace_members FOR DELETE TO authenticated
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid()));

-- Now add member view access to workspaces (after workspace_members policies are set)
CREATE POLICY "members_can_view_via_membership" ON workspaces FOR SELECT TO authenticated
  USING (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

SELECT 'Policies fixed! Recursion cycle broken. Try refreshing the app.' as status;
