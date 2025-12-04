-- Migration: Add Agent Notification Preferences
-- Date: 2025-12-04
-- Purpose: Add columns for agent, market brief, and sync notification preferences

-- ============================================
-- 1. ADD NEW PREFERENCE COLUMNS
-- ============================================

-- Add notify_agent_updates column
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS notify_agent_updates BOOLEAN DEFAULT true;

-- Add notify_market_briefs column
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS notify_market_briefs BOOLEAN DEFAULT true;

-- Add notify_sync_updates column (default false - can be noisy)
ALTER TABLE notification_preferences 
ADD COLUMN IF NOT EXISTS notify_sync_updates BOOLEAN DEFAULT false;

-- ============================================
-- 2. UPDATE should_notify_user FUNCTION
-- ============================================
-- Add support for agent_updates, market_brief, and sync_updates preference types

CREATE OR REPLACE FUNCTION should_notify_user(
    p_user_id UUID,
    p_workspace_id UUID,
    p_notification_type TEXT,
    p_channel TEXT DEFAULT 'in_app'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_prefs notification_preferences;
    v_in_quiet_hours BOOLEAN := false;
    v_current_time TIME;
BEGIN
    -- Get user preferences (workspace-specific first, then global)
    SELECT * INTO v_prefs
    FROM notification_preferences
    WHERE user_id = p_user_id
    AND (workspace_id = p_workspace_id OR workspace_id IS NULL)
    ORDER BY workspace_id NULLS LAST
    LIMIT 1;
    
    -- If no preferences found, default to allowing notifications
    IF NOT FOUND THEN
        RETURN true;
    END IF;
    
    -- Check channel-level settings
    IF p_channel = 'in_app' AND NOT v_prefs.in_app_enabled THEN
        RETURN false;
    END IF;
    
    IF p_channel = 'email' AND NOT v_prefs.email_enabled THEN
        RETURN false;
    END IF;
    
    -- Check quiet hours (only for in_app)
    IF p_channel = 'in_app' AND v_prefs.quiet_hours_enabled THEN
        v_current_time := LOCALTIME;
        
        -- Handle quiet hours that span midnight
        IF v_prefs.quiet_hours_start > v_prefs.quiet_hours_end THEN
            v_in_quiet_hours := v_current_time >= v_prefs.quiet_hours_start 
                             OR v_current_time <= v_prefs.quiet_hours_end;
        ELSE
            v_in_quiet_hours := v_current_time >= v_prefs.quiet_hours_start 
                            AND v_current_time <= v_prefs.quiet_hours_end;
        END IF;
        
        IF v_in_quiet_hours THEN
            RETURN false;
        END IF;
    END IF;
    
    -- Check notification type preferences
    CASE p_notification_type
        WHEN 'mention' THEN RETURN v_prefs.notify_mentions;
        WHEN 'comment' THEN RETURN v_prefs.notify_comments;
        WHEN 'task_assignment' THEN RETURN v_prefs.notify_task_assignments;
        WHEN 'task_update' THEN RETURN v_prefs.notify_task_updates;
        WHEN 'task_due_soon' THEN RETURN v_prefs.notify_task_due_soon;
        WHEN 'task_overdue' THEN RETURN v_prefs.notify_task_overdue;
        WHEN 'deal_update' THEN RETURN v_prefs.notify_deal_updates;
        WHEN 'deal_won' THEN RETURN v_prefs.notify_deal_won;
        WHEN 'deal_lost' THEN RETURN v_prefs.notify_deal_lost;
        WHEN 'document_share' THEN RETURN v_prefs.notify_document_shares;
        WHEN 'team_update' THEN RETURN v_prefs.notify_team_updates;
        WHEN 'achievement' THEN RETURN v_prefs.notify_achievements;
        -- New agent/background job types
        WHEN 'agent_updates' THEN RETURN COALESCE(v_prefs.notify_agent_updates, true);
        WHEN 'market_brief' THEN RETURN COALESCE(v_prefs.notify_market_briefs, true);
        WHEN 'sync_updates' THEN RETURN COALESCE(v_prefs.notify_sync_updates, false);
        ELSE RETURN true; -- Default to true for unknown types
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. CREATE/UPDATE user_workspace_settings TABLE
-- ============================================
-- This table stores per-user, per-workspace settings like desktop notifications

CREATE TABLE IF NOT EXISTS user_workspace_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, workspace_id)
);

-- Enable RLS
ALTER TABLE user_workspace_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "Users can view own workspace settings" ON user_workspace_settings;
CREATE POLICY "Users can view own workspace settings"
    ON user_workspace_settings FOR SELECT
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own workspace settings" ON user_workspace_settings;
CREATE POLICY "Users can insert own workspace settings"
    ON user_workspace_settings FOR INSERT
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own workspace settings" ON user_workspace_settings;
CREATE POLICY "Users can update own workspace settings"
    ON user_workspace_settings FOR UPDATE
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own workspace settings" ON user_workspace_settings;
CREATE POLICY "Users can delete own workspace settings"
    ON user_workspace_settings FOR DELETE
    USING (user_id = auth.uid());

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_user_workspace_settings_lookup 
    ON user_workspace_settings(user_id, workspace_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_user_workspace_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_workspace_settings_updated_at ON user_workspace_settings;
CREATE TRIGGER user_workspace_settings_updated_at
    BEFORE UPDATE ON user_workspace_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_user_workspace_settings_updated_at();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_workspace_settings TO authenticated;

-- ============================================
-- 4. VERIFICATION
-- ============================================
DO $$
DECLARE
    col_count INTEGER;
BEGIN
    -- Count new columns
    SELECT COUNT(*) INTO col_count
    FROM information_schema.columns
    WHERE table_name = 'notification_preferences'
    AND column_name IN ('notify_agent_updates', 'notify_market_briefs', 'notify_sync_updates');
    
    RAISE NOTICE '=== AGENT NOTIFICATION PREFERENCES ===';
    RAISE NOTICE 'New preference columns added: % (should be 3)', col_count;
    
    IF col_count = 3 THEN
        RAISE NOTICE 'SUCCESS: Agent notification preferences are ready!';
    ELSE
        RAISE WARNING 'Some columns may not have been added correctly';
    END IF;
END $$;
