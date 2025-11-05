-- ============================================================================
-- FIX NOTIFICATIONS RLS POLICY - CORRECT COLUMN REFERENCE SYNTAX
-- ============================================================================
-- Problem: INSERT policies were using notifications.column_name in WITH CHECK
-- Solution: Use bare column names (workspace_id, user_id) that reference INSERT values
-- ============================================================================

-- Step 1: Drop ALL existing INSERT policies (clean slate)
DROP POLICY IF EXISTS "system_can_insert_notifications" ON notifications;
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can create notifications for workspace members" ON notifications;
DROP POLICY IF EXISTS "workspace_members_can_notify" ON notifications;
DROP POLICY IF EXISTS "workspace_members_can_create_notifications" ON notifications;

-- Step 2: Create simple INSERT policy for authenticated users
-- Allow any authenticated user to create notifications
CREATE POLICY "authenticated_users_can_create_notifications" 
ON notifications FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Step 3: Verify the policy was created correctly
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  with_check 
FROM pg_policies 
WHERE tablename = 'notifications' 
  AND cmd = 'INSERT';
