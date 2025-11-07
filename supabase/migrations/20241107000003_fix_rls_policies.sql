-- Migration: Fix RLS policies for all tables
-- Created: 2024-11-07
-- Description: Updates Row-Level Security policies to use workspace_members table
--              for access control. This ensures proper permission checking.

-- ============================================================
-- TASKS TABLE RLS POLICIES
-- ============================================================

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

-- ============================================================
-- MARKETING_ITEMS TABLE RLS POLICIES
-- ============================================================

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

-- ============================================================
-- ACTIVITY_LOG TABLE RLS POLICIES
-- ============================================================

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

-- Note: CRM items and other tables may need similar updates
-- Add additional table policies as needed following the same pattern
