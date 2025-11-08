-- ============================================================
-- CONSOLIDATED MIGRATION FILE
-- Apply all pending migrations in a single transaction
-- Created: 2024-11-07
-- Project: jffnzpdcmdalxqhkfymx
-- ============================================================
-- 
-- Instructions:
-- 1. Go to: https://supabase.com/dashboard/project/jffnzpdcmdalxqhkfymx
-- 2. Navigate to: SQL Editor
-- 3. Copy and paste this entire file
-- 4. Click "Run" to execute
-- 
-- This will apply all three migrations:
-- - Add time columns (due_time, next_action_time)
-- - Setup workspace members trigger
-- - Fix RLS policies
-- ============================================================

BEGIN;

-- ============================================================
-- MIGRATION 1: Add Time Columns
-- ============================================================

-- Add due_time to tasks
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS due_time TEXT;

COMMENT ON COLUMN tasks.due_time IS 'Time in HH:MM format (24-hour) for task due date';

-- Add due_time to marketing_items
ALTER TABLE marketing_items 
ADD COLUMN IF NOT EXISTS due_time TEXT;

COMMENT ON COLUMN marketing_items.due_time IS 'Time in HH:MM format (24-hour) for marketing item due date';

-- Add next_action_time to crm_items
ALTER TABLE crm_items
ADD COLUMN IF NOT EXISTS next_action_time TEXT;

COMMENT ON COLUMN crm_items.next_action_time IS 'Time in HH:MM format (24-hour) for next action';

-- ============================================================
-- MIGRATION 2: Workspace Members Trigger
-- ============================================================

-- Step 1: Backfill existing workspaces - add owners to workspace_members
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
)
ON CONFLICT DO NOTHING;

-- Step 2: Create function to automatically add owner to workspace_members
CREATE OR REPLACE FUNCTION add_owner_to_workspace_members()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at)
  VALUES (gen_random_uuid(), NEW.id, NEW.owner_id, 'owner', NEW.created_at)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Drop existing trigger if present
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;

-- Step 4: Create trigger to run after workspace insertion
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_to_workspace_members();

-- ============================================================
-- MIGRATION 3: Fix RLS Policies
-- ============================================================

-- TASKS TABLE RLS POLICIES
DROP POLICY IF EXISTS "Users can insert tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their workspace" ON tasks;

CREATE POLICY "Users can insert tasks in their workspace" ON tasks
FOR INSERT WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view tasks in their workspace" ON tasks
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update tasks in their workspace" ON tasks
FOR UPDATE USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete tasks in their workspace" ON tasks
FOR DELETE USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- MARKETING_ITEMS TABLE RLS POLICIES
DROP POLICY IF EXISTS "Users can insert marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can view marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can update marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can delete marketing items in their workspace" ON marketing_items;

CREATE POLICY "Users can insert marketing items in their workspace" ON marketing_items
FOR INSERT WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view marketing items in their workspace" ON marketing_items
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update marketing items in their workspace" ON marketing_items
FOR UPDATE USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete marketing items in their workspace" ON marketing_items
FOR DELETE USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- ACTIVITY_LOG TABLE RLS POLICIES
DROP POLICY IF EXISTS "Users can insert activity in their workspace" ON activity_log;
DROP POLICY IF EXISTS "Users can view activity in their workspace" ON activity_log;

CREATE POLICY "Users can insert activity in their workspace" ON activity_log
FOR INSERT WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view activity in their workspace" ON activity_log
FOR SELECT USING (
  workspace_id IN (
    SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- VERIFICATION QUERIES
-- ============================================================

-- Verify time columns were added
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('tasks', 'marketing_items', 'crm_items')
AND column_name IN ('due_time', 'next_action_time')
ORDER BY table_name, column_name;

-- Verify workspace members are populated
SELECT 
  w.id as workspace_id,
  w.name as workspace_name,
  w.owner_id,
  wm.user_id as member_user_id,
  wm.role
FROM workspaces w
LEFT JOIN workspace_members wm ON w.id = wm.workspace_id AND w.owner_id = wm.user_id
ORDER BY w.created_at DESC
LIMIT 10;

-- Verify RLS policies are in place
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('tasks', 'marketing_items', 'activity_log')
ORDER BY tablename, policyname;

COMMIT;

-- ============================================================
-- SUCCESS!
-- ============================================================
-- All migrations applied successfully.
-- Your database schema is now up to date.
-- ============================================================
