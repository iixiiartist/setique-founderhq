-- COMPLETE FIX - Run this ONE time in Supabase SQL Editor
-- This fixes ALL RLS issues for all users (existing and new)

-- ============================================================
-- STEP 1: Add all workspace owners to workspace_members table
-- ============================================================
INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
SELECT 
  gen_random_uuid(),
  w.id,
  w.owner_id,
  'owner',
  w.created_at
FROM workspaces w
WHERE NOT EXISTS (
  SELECT 1 FROM workspace_members wm 
  WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_id
);

-- ============================================================
-- STEP 2: Create trigger for future workspaces
-- ============================================================
CREATE OR REPLACE FUNCTION add_owner_to_workspace_members()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
  VALUES (gen_random_uuid(), NEW.id, NEW.owner_id, 'owner', NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_workspace_members();

-- ============================================================
-- STEP 3: Fix ALL RLS policies at once
-- ============================================================

-- Tasks table
DROP POLICY IF EXISTS "Users can insert tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their workspace" ON tasks;

CREATE POLICY "Users can insert tasks in their workspace" ON tasks
FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view tasks in their workspace" ON tasks
FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update tasks in their workspace" ON tasks
FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete tasks in their workspace" ON tasks
FOR DELETE USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Marketing items table
DROP POLICY IF EXISTS "Users can insert marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can view marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can update marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can delete marketing items in their workspace" ON marketing_items;

CREATE POLICY "Users can insert marketing items in their workspace" ON marketing_items
FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view marketing items in their workspace" ON marketing_items
FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can update marketing items in their workspace" ON marketing_items
FOR UPDATE USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete marketing items in their workspace" ON marketing_items
FOR DELETE USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- Activity log table
DROP POLICY IF EXISTS "Users can insert activity logs in their workspace" ON activity_log;
DROP POLICY IF EXISTS "Users can view activity logs in their workspace" ON activity_log;

CREATE POLICY "Users can insert activity logs in their workspace" ON activity_log
FOR INSERT WITH CHECK (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Users can view activity logs in their workspace" ON activity_log
FOR SELECT USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

-- ============================================================
-- VERIFICATION: Check that it worked
-- ============================================================
SELECT 
  'Workspace Members Added' as status,
  COUNT(*) as count
FROM workspace_members
UNION ALL
SELECT 
  'Trigger Installed' as status,
  COUNT(*) as count
FROM information_schema.triggers
WHERE trigger_name = 'on_workspace_created';

-- Show your workspace membership
SELECT * FROM workspace_members WHERE user_id = auth.uid();
