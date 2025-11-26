-- Migration: Notification System Overhaul
-- Date: 2025-12-01
-- Purpose: Production-ready notification system with preferences, email notifications, and activity tracking

-- ============================================
-- 1. NOTIFICATION PREFERENCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    
    -- In-app notification settings
    in_app_enabled BOOLEAN DEFAULT true,
    
    -- Email notification settings
    email_enabled BOOLEAN DEFAULT true,
    email_frequency VARCHAR(20) DEFAULT 'instant', -- 'instant', 'daily', 'weekly', 'never'
    email_digest_time TIME DEFAULT '09:00:00', -- Time to send daily/weekly digests
    email_digest_day INTEGER DEFAULT 1, -- Day of week for weekly digest (1=Monday)
    
    -- Notification categories (what to notify about)
    notify_mentions BOOLEAN DEFAULT true,
    notify_comments BOOLEAN DEFAULT true,
    notify_task_assignments BOOLEAN DEFAULT true,
    notify_task_updates BOOLEAN DEFAULT true,
    notify_task_due_soon BOOLEAN DEFAULT true,
    notify_task_overdue BOOLEAN DEFAULT true,
    notify_deal_updates BOOLEAN DEFAULT true,
    notify_deal_won BOOLEAN DEFAULT true,
    notify_deal_lost BOOLEAN DEFAULT true,
    notify_document_shares BOOLEAN DEFAULT true,
    notify_team_updates BOOLEAN DEFAULT true,
    notify_achievements BOOLEAN DEFAULT true,
    
    -- Quiet hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint per user per workspace (or global if workspace is null)
    UNIQUE(user_id, workspace_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_preferences_workspace ON notification_preferences(workspace_id);

-- RLS policies
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
    ON notification_preferences FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert own notification preferences"
    ON notification_preferences FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own notification preferences"
    ON notification_preferences FOR UPDATE
    USING (user_id = auth.uid());

CREATE POLICY "Users can delete own notification preferences"
    ON notification_preferences FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- 2. EMAIL NOTIFICATION QUEUE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS email_notification_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    
    -- Email content
    to_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'sent', 'failed', 'queued_for_digest'
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- For digest emails
    digest_type VARCHAR(20), -- 'daily', 'weekly'
    scheduled_for TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_notification_queue(status, scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_user ON email_notification_queue(user_id, created_at DESC);

-- RLS for email queue (service role only for writing)
ALTER TABLE email_notification_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email queue"
    ON email_notification_queue FOR SELECT
    USING (user_id = auth.uid());

-- ============================================
-- 3. ENHANCE EXISTING NOTIFICATIONS TABLE
-- ============================================
-- Add new columns if they don't exist
DO $$
BEGIN
    -- Add priority column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'priority') THEN
        ALTER TABLE notifications ADD COLUMN priority VARCHAR(10) DEFAULT 'normal';
    END IF;
    
    -- Add action_url column for clickable notifications
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'action_url') THEN
        ALTER TABLE notifications ADD COLUMN action_url TEXT;
    END IF;
    
    -- Add email_sent column to track email notification status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'email_sent') THEN
        ALTER TABLE notifications ADD COLUMN email_sent BOOLEAN DEFAULT false;
    END IF;
    
    -- Add email_sent_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'email_sent_at') THEN
        ALTER TABLE notifications ADD COLUMN email_sent_at TIMESTAMPTZ;
    END IF;
    
    -- Add metadata column for additional context
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'metadata') THEN
        ALTER TABLE notifications ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Add expires_at for auto-expiring notifications
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'expires_at') THEN
        ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- ============================================
-- 4. ACTIVITY LOG TABLE (if not exists)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Activity details
    action_type VARCHAR(50) NOT NULL, -- 'task_created', 'deal_won', 'comment_added', etc.
    entity_type VARCHAR(50) NOT NULL, -- 'task', 'deal', 'contact', 'document', etc.
    entity_id UUID NOT NULL,
    entity_name VARCHAR(255),
    
    -- Additional context
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_workspace ON activity_log(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_user ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- RLS for activity log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity in their workspace"
    ON activity_log FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert activity in their workspace"
    ON activity_log FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 5. FUNCTION: Get default notification preferences
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_notification_preferences(
    p_user_id UUID,
    p_workspace_id UUID DEFAULT NULL
)
RETURNS notification_preferences AS $$
DECLARE
    v_prefs notification_preferences;
BEGIN
    -- Try to get existing preferences
    SELECT * INTO v_prefs
    FROM notification_preferences
    WHERE user_id = p_user_id
    AND (workspace_id = p_workspace_id OR (workspace_id IS NULL AND p_workspace_id IS NULL));
    
    -- If not found, create default preferences
    IF NOT FOUND THEN
        INSERT INTO notification_preferences (user_id, workspace_id)
        VALUES (p_user_id, p_workspace_id)
        RETURNING * INTO v_prefs;
    END IF;
    
    RETURN v_prefs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. FUNCTION: Check if user should receive notification
-- ============================================
CREATE OR REPLACE FUNCTION should_notify_user(
    p_user_id UUID,
    p_workspace_id UUID,
    p_notification_type VARCHAR(50),
    p_channel VARCHAR(20) DEFAULT 'in_app' -- 'in_app' or 'email'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_prefs notification_preferences;
    v_current_time TIME := CURRENT_TIME;
    v_in_quiet_hours BOOLEAN;
BEGIN
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
    
    -- Check quiet hours (only for in-app)
    IF p_channel = 'in_app' AND v_prefs.quiet_hours_enabled THEN
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
        WHEN p_notification_type IN ('task_assigned', 'task_reassigned') THEN RETURN v_prefs.notify_task_assignments;
        WHEN p_notification_type LIKE 'task_%' THEN RETURN v_prefs.notify_task_updates;
        WHEN p_notification_type = 'task_due_soon' THEN RETURN v_prefs.notify_task_due_soon;
        WHEN p_notification_type = 'task_overdue' THEN RETURN v_prefs.notify_task_overdue;
        WHEN p_notification_type = 'deal_won' THEN RETURN v_prefs.notify_deal_won;
        WHEN p_notification_type = 'deal_lost' THEN RETURN v_prefs.notify_deal_lost;
        WHEN p_notification_type LIKE 'deal_%' THEN RETURN v_prefs.notify_deal_updates;
        WHEN p_notification_type LIKE 'document_%' THEN RETURN v_prefs.notify_document_shares;
        WHEN p_notification_type LIKE 'workspace_%' OR p_notification_type LIKE 'team_%' THEN RETURN v_prefs.notify_team_updates;
        WHEN p_notification_type LIKE 'achievement%' THEN RETURN v_prefs.notify_achievements;
        ELSE RETURN true;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. FUNCTION: Get recent activity feed
-- ============================================
CREATE OR REPLACE FUNCTION get_activity_feed(
    p_workspace_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_entity_type VARCHAR(50) DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    user_name VARCHAR(255),
    user_avatar TEXT,
    action_type VARCHAR(50),
    entity_type VARCHAR(50),
    entity_id UUID,
    entity_name VARCHAR(255),
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.user_id,
        p.full_name as user_name,
        p.avatar_url as user_avatar,
        a.action_type,
        a.entity_type,
        a.entity_id,
        a.entity_name,
        a.description,
        a.metadata,
        a.created_at
    FROM activity_log a
    LEFT JOIN profiles p ON p.id = a.user_id
    WHERE a.workspace_id = p_workspace_id
    AND (p_entity_type IS NULL OR a.entity_type = p_entity_type)
    ORDER BY a.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. TRIGGER: Auto-update notification_preferences.updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_notification_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notification_preferences_updated ON notification_preferences;
CREATE TRIGGER trigger_notification_preferences_updated
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_preferences_timestamp();

-- ============================================
-- 9. COMMENTS TABLE CHECK/CREATION
-- ============================================
-- Ensure task_comments table exists (for comment management)
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    mentions UUID[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_comments_workspace ON task_comments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON task_comments(user_id);

-- RLS for task_comments if not already set
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'task_comments' 
        AND policyname = 'Users can view comments in their workspace'
    ) THEN
        ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view comments in their workspace"
            ON task_comments FOR SELECT
            USING (
                workspace_id IN (
                    SELECT workspace_id FROM workspace_members 
                    WHERE user_id = auth.uid()
                )
            );
        
        CREATE POLICY "Users can create comments in their workspace"
            ON task_comments FOR INSERT
            WITH CHECK (
                workspace_id IN (
                    SELECT workspace_id FROM workspace_members 
                    WHERE user_id = auth.uid()
                )
            );
        
        CREATE POLICY "Users can update own comments"
            ON task_comments FOR UPDATE
            USING (user_id = auth.uid());
        
        CREATE POLICY "Users can delete own comments"
            ON task_comments FOR DELETE
            USING (user_id = auth.uid());
    END IF;
END $$;

-- ============================================
-- 10. VERIFICATION
-- ============================================
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'notification_preferences',
        'email_notification_queue',
        'activity_log',
        'task_comments'
    );
    
    IF table_count >= 3 THEN
        RAISE NOTICE 'SUCCESS: Notification system tables created/verified';
    ELSE
        RAISE WARNING 'Only % of 4 notification tables found', table_count;
    END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON notification_preferences TO authenticated;
GRANT ALL ON email_notification_queue TO authenticated;
GRANT SELECT, INSERT ON activity_log TO authenticated;
GRANT ALL ON task_comments TO authenticated;
