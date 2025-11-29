-- Migration: Notification Pagination & Audit Trail
-- Date: 2025-11-28
-- Purpose: Add cursor-based pagination support, priority levels, and delivery audit trail
-- Phase 2 of notification system production-readiness

-- ============================================
-- 1. ADD PRIORITY COLUMN TO NOTIFICATIONS
-- ============================================
-- Priority levels: 'low', 'normal', 'high', 'urgent'
-- Urgent notifications bypass quiet hours and always show

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'priority'
    ) THEN
        ALTER TABLE notifications ADD COLUMN priority VARCHAR(10) DEFAULT 'normal';
        
        -- Add check constraint for valid priority values
        ALTER TABLE notifications ADD CONSTRAINT chk_notification_priority 
            CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
            
        RAISE NOTICE 'Added priority column to notifications table';
    ELSE
        RAISE NOTICE 'Priority column already exists';
    END IF;
END $$;

-- ============================================
-- 2. ADD DELIVERY AUDIT COLUMNS
-- ============================================
-- Track when notification was delivered and acknowledged

DO $$
BEGIN
    -- delivery_status: 'created', 'delivered', 'seen', 'acknowledged', 'failed'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'delivery_status'
    ) THEN
        ALTER TABLE notifications ADD COLUMN delivery_status VARCHAR(20) DEFAULT 'created';
        ALTER TABLE notifications ADD CONSTRAINT chk_notification_delivery_status 
            CHECK (delivery_status IN ('created', 'delivered', 'seen', 'acknowledged', 'failed'));
        RAISE NOTICE 'Added delivery_status column';
    END IF;

    -- delivered_at: When the notification was delivered to the user's screen
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'delivered_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN delivered_at TIMESTAMPTZ;
        RAISE NOTICE 'Added delivered_at column';
    END IF;

    -- seen_at: When the notification appeared in the user's viewport
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'seen_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN seen_at TIMESTAMPTZ;
        RAISE NOTICE 'Added seen_at column';
    END IF;

    -- acknowledged_at: When user interacted (clicked/dismissed)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'acknowledged_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN acknowledged_at TIMESTAMPTZ;
        RAISE NOTICE 'Added acknowledged_at column';
    END IF;

    -- retry_count: Number of delivery attempts (for failed notifications)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'retry_count'
    ) THEN
        ALTER TABLE notifications ADD COLUMN retry_count INTEGER DEFAULT 0;
        RAISE NOTICE 'Added retry_count column';
    END IF;

    -- last_error: Last delivery error message
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' AND column_name = 'last_error'
    ) THEN
        ALTER TABLE notifications ADD COLUMN last_error TEXT;
        RAISE NOTICE 'Added last_error column';
    END IF;
END $$;

-- ============================================
-- 3. ADD INDEXES FOR PAGINATION
-- ============================================
-- Cursor-based pagination needs efficient ordering by created_at

-- Index for cursor-based pagination (created_at, id for stable sorting)
CREATE INDEX IF NOT EXISTS idx_notifications_cursor_pagination 
ON notifications(user_id, workspace_id, created_at DESC, id DESC);

-- Index for priority-first ordering
CREATE INDEX IF NOT EXISTS idx_notifications_priority_created 
ON notifications(user_id, workspace_id, priority, created_at DESC);

-- Partial index for undelivered notifications (for retry logic)
CREATE INDEX IF NOT EXISTS idx_notifications_undelivered 
ON notifications(user_id, delivery_status, created_at DESC) 
WHERE delivery_status IN ('created', 'failed');

-- ============================================
-- 4. FUNCTION: Get paginated notifications with cursor
-- ============================================
CREATE OR REPLACE FUNCTION get_paginated_notifications(
    p_user_id UUID,
    p_workspace_id UUID,
    p_limit INTEGER DEFAULT 20,
    p_cursor_created_at TIMESTAMPTZ DEFAULT NULL,
    p_cursor_id UUID DEFAULT NULL,
    p_unread_only BOOLEAN DEFAULT FALSE,
    p_category VARCHAR(50) DEFAULT NULL,
    p_priority VARCHAR(10) DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    workspace_id UUID,
    type VARCHAR(50),
    title VARCHAR(255),
    message TEXT,
    entity_type VARCHAR(50),
    entity_id UUID,
    read BOOLEAN,
    priority VARCHAR(10),
    delivery_status VARCHAR(20),
    created_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    seen_at TIMESTAMPTZ,
    has_more BOOLEAN
) AS $$
DECLARE
    v_count INTEGER;
BEGIN
    RETURN QUERY
    WITH filtered_notifications AS (
        SELECT 
            n.id,
            n.user_id,
            n.workspace_id,
            n.type,
            n.title,
            n.message,
            n.entity_type,
            n.entity_id,
            n.read,
            COALESCE(n.priority, 'normal')::VARCHAR(10) as priority,
            COALESCE(n.delivery_status, 'created')::VARCHAR(20) as delivery_status,
            n.created_at,
            n.delivered_at,
            n.seen_at
        FROM notifications n
        WHERE n.user_id = p_user_id
        AND n.workspace_id = p_workspace_id
        -- Cursor condition (for pagination)
        AND (
            p_cursor_created_at IS NULL 
            OR (n.created_at, n.id) < (p_cursor_created_at, p_cursor_id)
        )
        -- Optional filters
        AND (NOT p_unread_only OR n.read = FALSE)
        AND (p_priority IS NULL OR n.priority = p_priority)
        AND (
            p_category IS NULL 
            OR (
                CASE p_category
                    WHEN 'mentions' THEN n.type IN ('mention', 'comment_reply', 'comment_added', 'document_comment')
                    WHEN 'tasks' THEN n.type IN ('task_assigned', 'task_reassigned', 'assignment', 'task_completed', 'task_updated', 'task_deadline_changed', 'task_due_soon', 'task_overdue', 'subtask_completed')
                    WHEN 'deals' THEN n.type IN ('deal_won', 'deal_lost', 'deal_stage_changed')
                    WHEN 'documents' THEN n.type IN ('document_shared', 'document_comment')
                    WHEN 'team' THEN n.type IN ('team_invitation', 'workspace_role_changed', 'crm_contact_added')
                    WHEN 'achievements' THEN n.type IN ('achievement_unlocked')
                    ELSE TRUE
                END
            )
        )
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT p_limit + 1  -- Fetch one extra to check if there's more
    )
    SELECT 
        fn.*,
        (COUNT(*) OVER () > p_limit)::BOOLEAN as has_more
    FROM filtered_notifications fn
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_paginated_notifications TO authenticated;

-- ============================================
-- 5. FUNCTION: Mark notification as delivered
-- ============================================
CREATE OR REPLACE FUNCTION mark_notification_delivered(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET 
        delivery_status = 'delivered',
        delivered_at = NOW()
    WHERE id = p_notification_id
    AND user_id = p_user_id
    AND delivery_status = 'created';
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_notification_delivered TO authenticated;

-- ============================================
-- 6. FUNCTION: Mark notification as seen
-- ============================================
CREATE OR REPLACE FUNCTION mark_notification_seen(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET 
        delivery_status = CASE WHEN delivery_status = 'delivered' THEN 'seen' ELSE delivery_status END,
        seen_at = COALESCE(seen_at, NOW())
    WHERE id = p_notification_id
    AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_notification_seen TO authenticated;

-- ============================================
-- 7. FUNCTION: Mark notification as acknowledged (clicked/dismissed)
-- ============================================
CREATE OR REPLACE FUNCTION mark_notification_acknowledged(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET 
        delivery_status = 'acknowledged',
        acknowledged_at = NOW(),
        read = TRUE  -- Also mark as read
    WHERE id = p_notification_id
    AND user_id = p_user_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_notification_acknowledged TO authenticated;

-- ============================================
-- 8. UPDATE should_notify_user TO RESPECT PRIORITY
-- ============================================
-- Urgent notifications bypass quiet hours

CREATE OR REPLACE FUNCTION should_notify_user(
    p_user_id UUID,
    p_workspace_id UUID,
    p_notification_type VARCHAR(50),
    p_channel VARCHAR(20) DEFAULT 'in_app',
    p_priority VARCHAR(10) DEFAULT 'normal'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_prefs notification_preferences;
    v_current_time TIME := CURRENT_TIME;
    v_in_quiet_hours BOOLEAN;
BEGIN
    -- Urgent priority always gets through
    IF p_priority = 'urgent' THEN
        RETURN true;
    END IF;

    -- Get preferences
    SELECT * INTO v_prefs
    FROM notification_preferences
    WHERE user_id = p_user_id
    AND (workspace_id = p_workspace_id OR workspace_id IS NULL)
    ORDER BY workspace_id NULLS LAST
    LIMIT 1;
    
    -- If no preferences, default to true
    IF NOT FOUND THEN
        RETURN true;
    END IF;
    
    -- Check channel enabled
    IF p_channel = 'email' AND NOT v_prefs.email_enabled THEN
        RETURN false;
    END IF;
    
    IF p_channel = 'in_app' AND NOT v_prefs.in_app_enabled THEN
        RETURN false;
    END IF;
    
    -- Check quiet hours (only for in-app, and only for normal/low priority)
    IF p_channel = 'in_app' AND v_prefs.quiet_hours_enabled AND p_priority IN ('low', 'normal') THEN
        IF v_prefs.quiet_hours_start <= v_prefs.quiet_hours_end THEN
            v_in_quiet_hours := v_current_time BETWEEN v_prefs.quiet_hours_start AND v_prefs.quiet_hours_end;
        ELSE
            v_in_quiet_hours := v_current_time >= v_prefs.quiet_hours_start OR v_current_time <= v_prefs.quiet_hours_end;
        END IF;
        
        IF v_in_quiet_hours THEN
            RETURN false;
        END IF;
    END IF;
    
    -- Check specific notification type preference
    CASE
        WHEN p_notification_type LIKE '%mention%' THEN RETURN v_prefs.notify_mentions;
        WHEN p_notification_type LIKE '%comment%' THEN RETURN v_prefs.notify_comments;
        WHEN p_notification_type LIKE '%task_assignment%' THEN RETURN v_prefs.notify_task_assignments;
        WHEN p_notification_type LIKE '%task_update%' OR p_notification_type LIKE '%task_completed%' THEN RETURN v_prefs.notify_task_updates;
        WHEN p_notification_type LIKE '%task_due%' THEN RETURN v_prefs.notify_task_due_soon;
        WHEN p_notification_type LIKE '%task_overdue%' THEN RETURN v_prefs.notify_task_overdue;
        WHEN p_notification_type LIKE '%deal_update%' THEN RETURN v_prefs.notify_deal_updates;
        WHEN p_notification_type LIKE '%deal_won%' THEN RETURN v_prefs.notify_deal_won;
        WHEN p_notification_type LIKE '%deal_lost%' THEN RETURN v_prefs.notify_deal_lost;
        WHEN p_notification_type LIKE '%document%' THEN RETURN v_prefs.notify_document_shares;
        WHEN p_notification_type LIKE '%team%' OR p_notification_type LIKE '%workspace%' THEN RETURN v_prefs.notify_team_updates;
        WHEN p_notification_type LIKE '%achievement%' THEN RETURN v_prefs.notify_achievements;
        ELSE RETURN true;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. NOTIFICATION AUDIT LOG TABLE (Optional - for detailed tracking)
-- ============================================
CREATE TABLE IF NOT EXISTS notification_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'created', 'delivered', 'seen', 'read', 'acknowledged', 'deleted', 'retry_failed'
    action_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB, -- Additional context (e.g., error details, client info)
    
    -- Index for querying notification history
    CONSTRAINT idx_notification_audit_notification_action UNIQUE (notification_id, action, action_at)
);

CREATE INDEX IF NOT EXISTS idx_notification_audit_notification 
ON notification_audit_log(notification_id);

CREATE INDEX IF NOT EXISTS idx_notification_audit_user_action 
ON notification_audit_log(user_id, action, action_at DESC);

-- RLS
ALTER TABLE notification_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification audit"
    ON notification_audit_log FOR SELECT
    USING (user_id = auth.uid());

-- ============================================
-- 10. TRIGGER: Auto-log notification events
-- ============================================
CREATE OR REPLACE FUNCTION log_notification_event()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO notification_audit_log (notification_id, user_id, action, metadata)
        VALUES (NEW.id, NEW.user_id, 'created', jsonb_build_object('type', NEW.type, 'priority', NEW.priority));
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Log delivery status changes
        IF OLD.delivery_status IS DISTINCT FROM NEW.delivery_status THEN
            INSERT INTO notification_audit_log (notification_id, user_id, action, metadata)
            VALUES (NEW.id, NEW.user_id, NEW.delivery_status, jsonb_build_object(
                'previous_status', OLD.delivery_status,
                'retry_count', NEW.retry_count
            ));
        END IF;
        -- Log read status changes
        IF OLD.read IS DISTINCT FROM NEW.read AND NEW.read = TRUE THEN
            INSERT INTO notification_audit_log (notification_id, user_id, action, metadata)
            VALUES (NEW.id, NEW.user_id, 'read', NULL);
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO notification_audit_log (notification_id, user_id, action, metadata)
        VALUES (OLD.id, OLD.user_id, 'deleted', NULL);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS trg_notification_audit ON notifications;
CREATE TRIGGER trg_notification_audit
    AFTER INSERT OR UPDATE OR DELETE ON notifications
    FOR EACH ROW EXECUTE FUNCTION log_notification_event();

-- ============================================
-- VERIFICATION
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Notification pagination and audit migration completed successfully';
    RAISE NOTICE 'New columns: priority, delivery_status, delivered_at, seen_at, acknowledged_at, retry_count, last_error';
    RAISE NOTICE 'New functions: get_paginated_notifications, mark_notification_delivered, mark_notification_seen, mark_notification_acknowledged';
    RAISE NOTICE 'New table: notification_audit_log';
END $$;
