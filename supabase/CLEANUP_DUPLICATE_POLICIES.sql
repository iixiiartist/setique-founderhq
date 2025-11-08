-- ============================================================
-- CLEANUP DUPLICATE RLS POLICIES
-- Remove old/duplicate policies and keep the comprehensive ones
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
-- This will remove duplicate policies and keep the most comprehensive ones
-- ============================================================

BEGIN;

-- ============================================================
-- TASKS TABLE - Remove duplicates, keep comprehensive policies
-- ============================================================

-- Remove the newer duplicate policies (less comprehensive)
DROP POLICY IF EXISTS "Users can insert tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks in their workspace" ON tasks;

-- Keep the more specific owner/member policies that check both conditions
-- These are already in place: insert_tasks_owner, insert_tasks_member, etc.

-- ============================================================
-- MARKETING_ITEMS TABLE - Remove duplicates, keep comprehensive policies
-- ============================================================

-- Remove the newer duplicate policies (less comprehensive)
DROP POLICY IF EXISTS "Users can insert marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can view marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can update marketing items in their workspace" ON marketing_items;
DROP POLICY IF EXISTS "Users can delete marketing items in their workspace" ON marketing_items;

-- Keep the comprehensive workspace_members_can_manage_marketing policy (ALL operations)
-- Keep the workspace_members_can_view_marketing policy

-- ============================================================
-- ACTIVITY_LOG TABLE - Remove duplicates, keep comprehensive policies
-- ============================================================

-- Remove the newer duplicate policies
DROP POLICY IF EXISTS "Users can insert activity in their workspace" ON activity_log;
DROP POLICY IF EXISTS "Users can view activity in their workspace" ON activity_log;

-- Also remove the older duplicate set
DROP POLICY IF EXISTS "Users can insert activity logs in their workspace" ON activity_log;
DROP POLICY IF EXISTS "Users can view activity logs in their workspace" ON activity_log;

-- Keep the workspace_members_can_insert_activity and workspace_members_can_view_activity policies
-- These use EXISTS which is more efficient than IN with subquery

-- ============================================================
-- VERIFICATION - Show remaining policies
-- ============================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN qual IS NULL THEN 'No restriction'
    ELSE LEFT(qual::text, 100) || '...'
  END as qual_preview
FROM pg_policies
WHERE tablename IN ('tasks', 'marketing_items', 'activity_log')
ORDER BY tablename, cmd, policyname;

COMMIT;

-- ============================================================
-- CLEANUP COMPLETE!
-- ============================================================
-- Duplicate policies removed.
-- Only the most comprehensive policies remain.
-- ============================================================
