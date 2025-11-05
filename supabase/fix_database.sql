-- Fix Database Script
-- Run this in Supabase Dashboard → SQL Editor
-- This will add missing tables and fix RLS policies

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create missing types
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('Todo', 'InProgress', 'Done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE crm_type AS ENUM ('investor', 'customer', 'partner');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE marketing_type AS ENUM ('Blog Post', 'Newsletter', 'Social Campaign', 'Webinar', 'Other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE marketing_status AS ENUM ('Planned', 'In Progress', 'Completed', 'Published', 'Cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE expense_category AS ENUM (
        'Software/SaaS', 'Marketing', 'Office', 'Legal', 'Contractors',
        'Travel', 'Meals', 'Equipment', 'Subscriptions', 'Other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM (
        'Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'PayPal', 'Other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM ('free', 'pro-individual', 'power-individual', 'team-starter', 'team-pro');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workspace_role AS ENUM ('owner', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('mention', 'assignment', 'comment', 'task_completed', 'system');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_action_type AS ENUM (
        'task_created', 'task_updated', 'task_completed', 'task_deleted',
        'crm_created', 'crm_updated', 'contact_added', 'meeting_scheduled',
        'comment_added', 'comment_updated', 'comment_deleted'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    type notification_type NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create task_comments table
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    content TEXT NOT NULL,
    mentions TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activity_log table
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    action activity_action_type NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workspace_invitations table if missing
CREATE TABLE IF NOT EXISTS workspace_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    email TEXT NOT NULL,
    role workspace_role DEFAULT 'member',
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    token TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON notifications(workspace_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_workspace_id ON task_comments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_workspace_id ON activity_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;

-- Drop old profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "workspace_members_can_view_profiles" ON profiles;

-- Create correct profiles RLS policy
CREATE POLICY "workspace_members_can_view_profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR
    EXISTS (
      SELECT 1
      FROM workspace_members wm1
      INNER JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
      WHERE wm1.user_id = auth.uid()
      AND wm2.user_id = profiles.id
    )
  );

CREATE POLICY "users_can_update_own_profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- Notifications RLS policies
DROP POLICY IF EXISTS "users_can_select_own_notifications" ON notifications;
CREATE POLICY "users_can_select_own_notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_update_own_notifications" ON notifications;
CREATE POLICY "users_can_update_own_notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_delete_own_notifications" ON notifications;
CREATE POLICY "users_can_delete_own_notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "system_can_insert_notifications" ON notifications;
CREATE POLICY "system_can_insert_notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Task comments RLS policies
DROP POLICY IF EXISTS "workspace_members_can_view_comments" ON task_comments;
CREATE POLICY "workspace_members_can_view_comments"
  ON task_comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = task_comments.workspace_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "workspace_members_can_insert_comments" ON task_comments;
CREATE POLICY "workspace_members_can_insert_comments"
  ON task_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = task_comments.workspace_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users_can_update_own_comments" ON task_comments;
CREATE POLICY "users_can_update_own_comments"
  ON task_comments FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_delete_own_comments" ON task_comments;
CREATE POLICY "users_can_delete_own_comments"
  ON task_comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Activity log RLS policies
DROP POLICY IF EXISTS "workspace_members_can_view_activity" ON activity_log;
CREATE POLICY "workspace_members_can_view_activity"
  ON activity_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = activity_log.workspace_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "workspace_members_can_insert_activity" ON activity_log;
CREATE POLICY "workspace_members_can_insert_activity"
  ON activity_log FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_id = activity_log.workspace_id
      AND user_id = auth.uid()
    )
  );

-- Create trigger for task_comments updated_at
DROP TRIGGER IF EXISTS trigger_update_task_comment_updated_at ON task_comments;
CREATE TRIGGER trigger_update_task_comment_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Done!
SELECT 'Database fixed successfully!' as status;
