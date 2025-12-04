-- Migration: Fix Notifications RLS and Realtime
-- Date: 2025-12-06
-- Purpose: Ensure notifications table has proper RLS policies for INSERT and is added to realtime publication
-- This fixes production issues where notifications cannot be created or received in real-time

-- ============================================
-- 1. VERIFY NOTIFICATIONS TABLE EXISTS
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        RAISE EXCEPTION 'notifications table does not exist - please create it first';
    END IF;
END $$;

-- ============================================
-- 2. ENSURE RLS IS ENABLED
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. DROP AND RECREATE ALL POLICIES
-- ============================================
-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can manage all notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Workspace members can insert notifications" ON notifications;

-- SELECT: Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: Authenticated users can create notifications for any user in their workspace
-- This is necessary for features like mentions, task assignments, etc.
CREATE POLICY "Authenticated users can insert notifications"
    ON notifications FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            -- User can create notification for themselves
            user_id = auth.uid()
            OR
            -- User can create notification for another user in same workspace
            EXISTS (
                SELECT 1 FROM workspace_members wm1
                WHERE wm1.workspace_id = notifications.workspace_id
                AND wm1.user_id = auth.uid()
            )
        )
    );

-- UPDATE: Users can only update their own notifications (e.g., mark as read)
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- DELETE: Users can only delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- 4. ADD TO REALTIME PUBLICATION
-- ============================================
-- Check if table is already in the publication
DO $$
BEGIN
    -- Try to add the table to the publication
    -- This will error if already added, which we catch and ignore
    ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    RAISE NOTICE 'Added notifications table to supabase_realtime publication';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE 'notifications table already in supabase_realtime publication';
END $$;

-- ============================================
-- 5. ENSURE REPLICA IDENTITY FOR REALTIME
-- ============================================
-- Set replica identity to FULL for proper UPDATE/DELETE events
-- This ensures the old row data is available in realtime events
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- ============================================
-- 6. VERIFY REQUIRED COLUMNS EXIST
-- ============================================
DO $$
BEGIN
    -- Ensure all required columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'user_id') THEN
        RAISE EXCEPTION 'notifications table missing user_id column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'workspace_id') THEN
        RAISE EXCEPTION 'notifications table missing workspace_id column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'type') THEN
        RAISE EXCEPTION 'notifications table missing type column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'title') THEN
        RAISE EXCEPTION 'notifications table missing title column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'message') THEN
        RAISE EXCEPTION 'notifications table missing message column';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'read') THEN
        RAISE EXCEPTION 'notifications table missing read column';
    END IF;
    
    RAISE NOTICE 'All required columns verified';
END $$;

-- ============================================
-- 7. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================
-- 8. VERIFICATION QUERY
-- ============================================
DO $$
DECLARE
    policy_count INTEGER;
    is_in_publication BOOLEAN;
BEGIN
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'notifications';
    
    -- Check publication
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'notifications'
    ) INTO is_in_publication;
    
    RAISE NOTICE '=== VERIFICATION RESULTS ===';
    RAISE NOTICE 'Policies on notifications table: %', policy_count;
    RAISE NOTICE 'In supabase_realtime publication: %', is_in_publication;
    
    IF policy_count < 4 THEN
        RAISE WARNING 'Expected at least 4 policies, found %', policy_count;
    END IF;
    
    IF NOT is_in_publication THEN
        RAISE WARNING 'Table not in supabase_realtime publication - realtime will not work';
    END IF;
    
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
END $$;
