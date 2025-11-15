-- Migration: Add performance indexes for notifications table
-- Created: 2025-11-15
-- Purpose: Optimize notification queries for real-time system
-- Related: NOTIFICATION_SYSTEM_UPGRADE_SUMMARY.md

-- Composite index for user notifications list query
-- Optimizes: getUserNotifications() - filters by user_id, workspace_id, read status and orders by created_at
-- Query pattern: SELECT * FROM notifications WHERE user_id = ? AND workspace_id = ? AND read = ? ORDER BY created_at DESC LIMIT 50
CREATE INDEX IF NOT EXISTS idx_notifications_user_workspace_read_created 
ON notifications(user_id, workspace_id, read, created_at DESC);

-- Partial index for unread count queries
-- Optimizes: getUnreadNotificationCount() - only indexes unread notifications to reduce index size
-- Query pattern: SELECT COUNT(*) FROM notifications WHERE user_id = ? AND workspace_id = ? AND read = false
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
ON notifications(user_id, workspace_id) 
WHERE read = false;

-- Index for real-time subscription filtering
-- Optimizes: Supabase postgres_changes filter performance
-- Used by: NotificationBell.tsx WebSocket subscription
-- Filter pattern: user_id=eq.{userId},workspace_id=eq.{workspaceId}
CREATE INDEX IF NOT EXISTS idx_notifications_realtime_filter
ON notifications(user_id, workspace_id, created_at DESC);

-- Verify indexes were created
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename = 'notifications'
    AND indexname IN (
        'idx_notifications_user_workspace_read_created',
        'idx_notifications_user_unread',
        'idx_notifications_realtime_filter'
    );

    IF index_count = 3 THEN
        RAISE NOTICE 'SUCCESS: All 3 notification indexes created successfully';
    ELSE
        RAISE WARNING 'Only % of 3 indexes were created', index_count;
    END IF;
END $$;
