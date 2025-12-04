-- Migration: Fix Notifications for Production
-- Date: 2025-12-04
-- Purpose: Ensure notifications table has proper RLS policies, realtime publication, and replica identity

-- ============================================
-- 1. VERIFY NOTIFICATIONS TABLE EXISTS
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        RAISE EXCEPTION 'notifications table does not exist - run base migrations first';
    END IF;
END $$;

-- ============================================
-- 2. ENABLE RLS (idempotent)
-- ============================================
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. DROP AND RECREATE ALL RLS POLICIES
-- ============================================
-- This ensures clean state and proper policies

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role can manage all notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications for workspace members" ON notifications;

-- SELECT: Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
    ON notifications FOR SELECT
    USING (user_id = auth.uid());

-- INSERT: Allow inserting notifications for users in the same workspace
-- This is critical for mention/assignment notifications to work
CREATE POLICY "Users can insert notifications for workspace members"
    ON notifications FOR INSERT
    WITH CHECK (
        -- The target user must be a member of the same workspace as the inserter
        EXISTS (
            SELECT 1 FROM workspace_members wm1
            WHERE wm1.workspace_id = notifications.workspace_id
            AND wm1.user_id = auth.uid()
        )
        AND EXISTS (
            SELECT 1 FROM workspace_members wm2
            WHERE wm2.workspace_id = notifications.workspace_id
            AND wm2.user_id = notifications.user_id
        )
    );

-- UPDATE: Users can only update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
    ON notifications FOR UPDATE
    USING (user_id = auth.uid());

-- DELETE: Users can only delete their own notifications
CREATE POLICY "Users can delete own notifications"
    ON notifications FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- 4. ENABLE REALTIME PUBLICATION
-- ============================================
-- This is CRITICAL for real-time notification updates

-- Safely add to realtime publication (idempotent)
DO $$
BEGIN
    -- Check if table is already in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
    END IF;
END $$;

-- ============================================
-- 5. SET REPLICA IDENTITY FOR REALTIME
-- ============================================
-- Required for UPDATE/DELETE events to include full row data
ALTER TABLE notifications REPLICA IDENTITY FULL;

-- ============================================
-- 6. ENSURE REQUIRED COLUMNS EXIST
-- ============================================
DO $$
BEGIN
    -- Add delivery_status if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'delivery_status') THEN
        ALTER TABLE notifications ADD COLUMN delivery_status VARCHAR(20) DEFAULT 'created';
    END IF;
    
    -- Add priority if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'priority') THEN
        ALTER TABLE notifications ADD COLUMN priority VARCHAR(10) DEFAULT 'normal';
    END IF;
    
    -- Add delivered_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'delivered_at') THEN
        ALTER TABLE notifications ADD COLUMN delivered_at TIMESTAMPTZ;
    END IF;
    
    -- Add seen_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'seen_at') THEN
        ALTER TABLE notifications ADD COLUMN seen_at TIMESTAMPTZ;
    END IF;
    
    -- Add acknowledged_at if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'acknowledged_at') THEN
        ALTER TABLE notifications ADD COLUMN acknowledged_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================
-- 7. CREATE DELIVERY TRACKING FUNCTIONS
-- ============================================
-- These functions update delivery status with proper validation

CREATE OR REPLACE FUNCTION mark_notification_delivered(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET 
        delivery_status = 'delivered',
        delivered_at = COALESCE(delivered_at, NOW())
    WHERE id = p_notification_id 
    AND user_id = p_user_id
    AND delivery_status = 'created';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_notification_seen(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET 
        delivery_status = 'seen',
        delivered_at = COALESCE(delivered_at, NOW()),
        seen_at = COALESCE(seen_at, NOW())
    WHERE id = p_notification_id 
    AND user_id = p_user_id
    AND delivery_status IN ('created', 'delivered');
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION mark_notification_acknowledged(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET 
        delivery_status = 'acknowledged',
        delivered_at = COALESCE(delivered_at, NOW()),
        seen_at = COALESCE(seen_at, NOW()),
        acknowledged_at = COALESCE(acknowledged_at, NOW()),
        read = TRUE
    WHERE id = p_notification_id 
    AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. GRANT PERMISSIONS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_delivered TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_seen TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_acknowledged TO authenticated;

-- ============================================
-- 9. CREATE OPTIMIZED INDEXES
-- ============================================
-- Index for fetching user's notifications (most common query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_workspace_created
    ON notifications(user_id, workspace_id, created_at DESC);

-- Index for unread count (very frequent query)
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications(user_id, read) WHERE read = false;

-- Index for realtime subscription filter
CREATE INDEX IF NOT EXISTS idx_notifications_realtime
    ON notifications(user_id, workspace_id, created_at DESC);

-- ============================================
-- 10. VERIFICATION
-- ============================================
DO $$
DECLARE
    policy_count INTEGER;
    realtime_enabled BOOLEAN;
BEGIN
    -- Count RLS policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = 'notifications';
    
    -- Check realtime publication
    SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        AND tablename = 'notifications'
    ) INTO realtime_enabled;
    
    RAISE NOTICE '=== NOTIFICATION SYSTEM VERIFICATION ===';
    RAISE NOTICE 'RLS Policies: % (should be 4)', policy_count;
    RAISE NOTICE 'Realtime Enabled: %', realtime_enabled;
    
    IF policy_count >= 4 AND realtime_enabled THEN
        RAISE NOTICE 'SUCCESS: Notification system is production-ready!';
    ELSE
        RAISE WARNING 'Some checks failed - review the output above';
    END IF;
END $$;
