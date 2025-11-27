-- Create activity_logs table for team collaboration tracking
-- Run this in your Supabase SQL Editor

-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    entity_name TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_workspace ON activity_logs(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- Enable Row Level Security
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view activity in their workspaces
CREATE POLICY "Users can view workspace activity" ON activity_logs
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Users can create activity logs in their workspaces
CREATE POLICY "Users can create activity logs" ON activity_logs
    FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Function to automatically log task activity
CREATE OR REPLACE FUNCTION log_task_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(50);
    task_name TEXT;
BEGIN
    -- Determine action type
    IF (TG_OP = 'INSERT') THEN
        action_type := 'task_created';
        task_name := NEW.text;
        
        INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
        VALUES (
            NEW.workspace_id,
            COALESCE(NEW.assigned_to, NEW.user_id),
            action_type,
            'task',
            NEW.id,
            task_name,
            jsonb_build_object(
                'priority', NEW.priority,
                'status', NEW.status,
                'due_date', NEW.due_date
            )
        );
        RETURN NEW;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        task_name := NEW.text;
        
        -- Log status change
        IF (OLD.status <> NEW.status) THEN
            IF (NEW.status = 'Done') THEN
                action_type := 'task_completed';
            ELSE
                action_type := 'task_updated';
            END IF;
            
            INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
            VALUES (
                NEW.workspace_id,
                COALESCE(NEW.assigned_to, NEW.user_id),
                action_type,
                'task',
                NEW.id,
                task_name,
                jsonb_build_object(
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'priority', NEW.priority
                )
            );
        END IF;
        
        RETURN NEW;
        
    ELSIF (TG_OP = 'DELETE') THEN
        action_type := 'task_deleted';
        task_name := OLD.text;
        
        INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
        VALUES (
            OLD.workspace_id,
            COALESCE(OLD.assigned_to, OLD.user_id),
            action_type,
            'task',
            OLD.id,
            task_name,
            jsonb_build_object(
                'priority', OLD.priority,
                'status', OLD.status
            )
        );
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically log deal activity
CREATE OR REPLACE FUNCTION log_deal_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(50);
    deal_name TEXT;
BEGIN
    -- Determine action type
    IF (TG_OP = 'INSERT') THEN
        action_type := 'deal_created';
        deal_name := NEW.title;
        
        INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
        VALUES (
            NEW.workspace_id,
            COALESCE(NEW.assigned_to, NEW.user_id),
            action_type,
            'deal',
            NEW.id,
            deal_name,
            jsonb_build_object(
                'stage', NEW.stage,
                'value', NEW.value,
                'currency', NEW.currency
            )
        );
        RETURN NEW;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        deal_name := NEW.title;
        
        -- Log stage change
        IF (OLD.stage <> NEW.stage) THEN
            IF (NEW.stage = 'closed_won') THEN
                action_type := 'deal_won';
            ELSIF (NEW.stage = 'closed_lost') THEN
                action_type := 'deal_lost';
            ELSE
                action_type := 'deal_stage_changed';
            END IF;
            
            INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
            VALUES (
                NEW.workspace_id,
                COALESCE(NEW.assigned_to, NEW.user_id),
                action_type,
                'deal',
                NEW.id,
                deal_name,
                jsonb_build_object(
                    'old_stage', OLD.stage,
                    'new_stage', NEW.stage,
                    'value', NEW.value,
                    'currency', NEW.currency
                )
            );
        END IF;
        
        RETURN NEW;
        
    ELSIF (TG_OP = 'DELETE') THEN
        action_type := 'deal_deleted';
        deal_name := OLD.title;
        
        INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
        VALUES (
            OLD.workspace_id,
            COALESCE(OLD.assigned_to, OLD.user_id),
            action_type,
            'deal',
            OLD.id,
            deal_name,
            jsonb_build_object(
                'stage', OLD.stage,
                'value', OLD.value
            )
        );
        RETURN OLD;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to automatically log contact activity
CREATE OR REPLACE FUNCTION log_contact_activity()
RETURNS TRIGGER AS $$
DECLARE
    action_type VARCHAR(50);
    contact_name TEXT;
BEGIN
    IF (TG_OP = 'INSERT') THEN
        action_type := 'contact_added';
        contact_name := COALESCE(NEW.name, NEW.email);
        
        INSERT INTO activity_logs (workspace_id, user_id, action, entity_type, entity_id, entity_name, metadata)
        VALUES (
            NEW.workspace_id,
            NEW.user_id,
            action_type,
            'contact',
            NEW.id,
            contact_name,
            jsonb_build_object(
                'type', NEW.type,
                'email', NEW.email
            )
        );
        RETURN NEW;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS task_activity_trigger ON tasks;
CREATE TRIGGER task_activity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION log_task_activity();

DROP TRIGGER IF EXISTS deal_activity_trigger ON deals;
CREATE TRIGGER deal_activity_trigger
    AFTER INSERT OR UPDATE OR DELETE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION log_deal_activity();

DROP TRIGGER IF EXISTS contact_activity_trigger ON contacts;
CREATE TRIGGER contact_activity_trigger
    AFTER INSERT ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION log_contact_activity();

-- Set up pg_cron for task reminders (requires pg_cron extension)
-- Note: pg_cron may require Supabase Pro plan or manual setup

-- First, enable pg_cron if not already enabled
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule task reminder check every hour
-- Replace YOUR_PROJECT_REF with your actual Supabase project reference
-- Replace YOUR_ANON_KEY with your actual anon/service key

/*
SELECT cron.schedule(
    'check-task-reminders',
    '0 * * * *', -- Run every hour at minute 0
    $$
    SELECT net.http_post(
        url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-task-reminders',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer YOUR_ANON_KEY'
        ),
        body := '{}'::jsonb
    );
    $$
);
*/

-- To manually trigger the edge function for testing:
/*
SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-task-reminders',
    headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_ANON_KEY'
    ),
    body := '{}'::jsonb
);
*/

-- Verify the cron job is scheduled
-- SELECT * FROM cron.job;

-- View activity logs
-- SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 20;

COMMENT ON TABLE activity_logs IS 'Tracks team activity for collaboration features';
COMMENT ON FUNCTION log_task_activity() IS 'Automatically logs task create/update/delete actions';
COMMENT ON FUNCTION log_deal_activity() IS 'Automatically logs deal create/update/delete actions';
COMMENT ON FUNCTION log_contact_activity() IS 'Automatically logs contact create actions';
