-- Complete Database Rebuild Script
-- Run this in Supabase Dashboard → SQL Editor
-- This will add all missing tables and fix RLS policies

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create missing types (with IF NOT EXISTS equivalent)
DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('Todo', 'InProgress', 'Done');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE crm_type AS ENUM ('investor', 'customer', 'partner');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE marketing_type AS ENUM ('Blog Post', 'Newsletter', 'Social Campaign', 'Webinar', 'Other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE marketing_status AS ENUM ('Planned', 'In Progress', 'Completed', 'Published', 'Cancelled');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE plan_type AS ENUM ('free', 'pro-individual', 'power-individual', 'team-starter', 'team-pro');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE workspace_role AS ENUM ('owner', 'member');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE expense_category AS ENUM ('Software/SaaS', 'Marketing', 'Office', 'Legal', 'Contractors', 'Travel', 'Meals', 'Equipment', 'Subscriptions', 'Other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('Credit Card', 'Debit Card', 'Bank Transfer', 'Cash', 'PayPal', 'Other');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM ('mention', 'assignment', 'comment', 'task_completed', 'system');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_action_type AS ENUM ('task_created', 'task_updated', 'task_completed', 'task_deleted', 'crm_created', 'crm_updated', 'contact_added', 'meeting_scheduled', 'comment_added', 'comment_updated', 'comment_deleted');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- profiles table already exists, skip
-- CREATE TABLE profiles (
--     id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
--     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
--     email TEXT NOT NULL,
--     full_name TEXT,
--     avatar_url TEXT,
--     settings JSONB DEFAULT '{"desktopNotifications": false}',
--     gamification JSONB DEFAULT '{"streak": 0, "lastActivityDate": null, "xp": 0, "level": 1, "achievements": [], "teamAchievements": [], "teamXp": 0, "teamLevel": 1}'
-- );

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    plan_type plan_type DEFAULT 'free',
    team_xp INTEGER DEFAULT 0,
    team_level INTEGER DEFAULT 1
);

-- Create workspace_members table
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role workspace_role DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Create workspace_invitations table
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

-- Create business_profile table
CREATE TABLE IF NOT EXISTS business_profile (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_name TEXT NOT NULL,
    industry TEXT,
    company_size TEXT,
    founded_year INTEGER,
    website TEXT,
    business_model TEXT,
    description TEXT,
    target_market TEXT,
    value_proposition TEXT,
    primary_goal TEXT,
    key_challenges TEXT,
    growth_stage TEXT,
    current_mrr NUMERIC,
    target_mrr NUMERIC,
    current_arr NUMERIC,
    customer_count INTEGER,
    team_size INTEGER,
    remote_policy TEXT,
    company_values TEXT[],
    tech_stack TEXT[],
    competitors TEXT[],
    unique_differentiators TEXT,
    is_complete BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    plan_type plan_type DEFAULT 'free',
    status subscription_status DEFAULT 'active',
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    seat_count INTEGER DEFAULT 1,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    ai_usage_count INTEGER DEFAULT 0,
    ai_usage_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    storage_bytes BIGINT DEFAULT 0,
    file_count INTEGER DEFAULT 0
);

-- Create workspace_achievements table
CREATE TABLE IF NOT EXISTS workspace_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unlocked_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    UNIQUE(workspace_id, achievement_id)
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    text TEXT NOT NULL,
    status task_status DEFAULT 'Todo',
    priority priority_level DEFAULT 'Medium',
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    category TEXT NOT NULL,
    crm_item_id UUID,
    contact_id UUID,
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    notes JSONB DEFAULT '[]'
);

-- Create CRM items table
CREATE TABLE IF NOT EXISTS crm_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company TEXT NOT NULL,
    type crm_type NOT NULL,
    priority priority_level DEFAULT 'Medium',
    status TEXT NOT NULL,
    next_action TEXT,
    next_action_date DATE,
    check_size NUMERIC,
    deal_value NUMERIC,
    opportunity TEXT,
    notes JSONB DEFAULT '[]'
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    crm_item_id UUID REFERENCES crm_items(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    linkedin TEXT DEFAULT '',
    notes JSONB DEFAULT '[]'
);

-- Create meetings table
CREATE TABLE IF NOT EXISTS meetings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    title TEXT NOT NULL,
    attendees TEXT NOT NULL,
    summary TEXT NOT NULL
);

-- Create marketing items table
CREATE TABLE IF NOT EXISTS marketing_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title TEXT NOT NULL,
    type marketing_type NOT NULL,
    status marketing_status DEFAULT 'Planned',
    due_date DATE,
    notes JSONB DEFAULT '[]'
);

-- Create financial logs table
CREATE TABLE IF NOT EXISTS financial_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE NOT NULL,
    mrr NUMERIC NOT NULL DEFAULT 0,
    gmv NUMERIC NOT NULL DEFAULT 0,
    signups INTEGER NOT NULL DEFAULT 0
);

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    content TEXT NOT NULL,
    module TEXT NOT NULL,
    company_id UUID REFERENCES crm_items(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    notes JSONB DEFAULT '[]'
);

-- Create expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE NOT NULL,
    category expense_category NOT NULL,
    amount NUMERIC NOT NULL,
    description TEXT NOT NULL,
    vendor TEXT,
    payment_method payment_method,
    receipt_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    notes JSONB DEFAULT '[]'
);

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

-- Create ALL indexes
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_crm_items_user_id ON crm_items(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_items_workspace_id ON crm_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_items_type ON crm_items(type);
CREATE INDEX IF NOT EXISTS idx_crm_items_status ON crm_items(status);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_id ON contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_crm_item_id ON contacts(crm_item_id);
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_workspace_id ON meetings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meetings_contact_id ON meetings(contact_id);
CREATE INDEX IF NOT EXISTS idx_meetings_timestamp ON meetings(timestamp);
CREATE INDEX IF NOT EXISTS idx_marketing_items_user_id ON marketing_items(user_id);
CREATE INDEX IF NOT EXISTS idx_marketing_items_workspace_id ON marketing_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_marketing_items_status ON marketing_items(status);
CREATE INDEX IF NOT EXISTS idx_marketing_items_due_date ON marketing_items(due_date);
CREATE INDEX IF NOT EXISTS idx_financial_logs_user_id ON financial_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_financial_logs_workspace_id ON financial_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_financial_logs_date ON financial_logs(date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_workspace_id ON expenses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_module ON documents(module);
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

-- Create update_updated_at function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at (with DROP IF EXISTS)
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_business_profile_updated_at ON business_profile;
CREATE TRIGGER update_business_profile_updated_at BEFORE UPDATE ON business_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_crm_items_updated_at ON crm_items;
CREATE TRIGGER update_crm_items_updated_at BEFORE UPDATE ON crm_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_meetings_updated_at ON meetings;
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_marketing_items_updated_at ON marketing_items;
CREATE TRIGGER update_marketing_items_updated_at BEFORE UPDATE ON marketing_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_financial_logs_updated_at ON financial_logs;
CREATE TRIGGER update_financial_logs_updated_at BEFORE UPDATE ON financial_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_expenses_updated_at ON expenses;
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_task_comments_updated_at ON task_comments;
CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies (safe cleanup)
DO $$ DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Profiles RLS (CRITICAL - allows workspace members to see each other)
CREATE POLICY "workspace_members_can_view_profiles" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR EXISTS (
    SELECT 1 FROM workspace_members wm1
    INNER JOIN workspace_members wm2 ON wm1.workspace_id = wm2.workspace_id
    WHERE wm1.user_id = auth.uid() AND wm2.user_id = profiles.id
  ));
CREATE POLICY "users_can_update_own_profile" ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "users_can_insert_own_profile" ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- Workspaces RLS (simplified to avoid recursion)
CREATE POLICY "owners_can_view_workspaces" ON workspaces FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE POLICY "members_can_view_via_membership" ON workspaces FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_members WHERE workspace_members.workspace_id = workspaces.id AND workspace_members.user_id = auth.uid()
  ));
CREATE POLICY "owners_can_insert_workspaces" ON workspaces FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "owners_can_update_workspaces" ON workspaces FOR UPDATE TO authenticated USING (owner_id = auth.uid());
CREATE POLICY "owners_can_delete_workspaces" ON workspaces FOR DELETE TO authenticated USING (owner_id = auth.uid());

-- Workspace Members RLS (simplified to avoid recursion)
CREATE POLICY "users_can_view_own_memberships" ON workspace_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "users_can_view_same_workspace_members" ON workspace_members FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM workspace_members wm 
    WHERE wm.workspace_id = workspace_members.workspace_id 
    AND wm.user_id = auth.uid()
  ));
CREATE POLICY "owners_can_manage_workspace_members" ON workspace_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id AND owner_id = auth.uid()));

-- Tasks RLS (workspace members can view all workspace tasks)
CREATE POLICY "workspace_members_can_view_tasks" ON tasks FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid()));
CREATE POLICY "workspace_members_can_insert_tasks" ON tasks FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid()));
CREATE POLICY "workspace_members_can_update_tasks" ON tasks FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = tasks.workspace_id AND user_id = auth.uid()));
CREATE POLICY "workspace_members_can_delete_tasks" ON tasks FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Notifications RLS
CREATE POLICY "users_can_view_own_notifications" ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users_can_update_own_notifications" ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users_can_delete_own_notifications" ON notifications FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "system_can_insert_notifications" ON notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Task Comments RLS
CREATE POLICY "workspace_members_can_view_comments" ON task_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = task_comments.workspace_id AND user_id = auth.uid()));
CREATE POLICY "workspace_members_can_insert_comments" ON task_comments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = task_comments.workspace_id AND user_id = auth.uid()));
CREATE POLICY "users_can_update_own_comments" ON task_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "users_can_delete_own_comments" ON task_comments FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Activity Log RLS
CREATE POLICY "workspace_members_can_view_activity" ON activity_log FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = activity_log.workspace_id AND user_id = auth.uid()));
CREATE POLICY "workspace_members_can_insert_activity" ON activity_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = activity_log.workspace_id AND user_id = auth.uid()));

-- CRM, Contacts, Meetings, Marketing, Financial, Documents, Expenses RLS (similar pattern)
CREATE POLICY "workspace_members_can_view_crm" ON crm_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = crm_items.workspace_id AND user_id = auth.uid()));
CREATE POLICY "workspace_members_can_manage_crm" ON crm_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = crm_items.workspace_id AND user_id = auth.uid()));

CREATE POLICY "workspace_members_can_view_contacts" ON contacts FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = contacts.workspace_id AND user_id = auth.uid()));
CREATE POLICY "workspace_members_can_manage_contacts" ON contacts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = contacts.workspace_id AND user_id = auth.uid()));

CREATE POLICY "workspace_members_can_view_meetings" ON meetings FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = meetings.workspace_id AND user_id = auth.uid()));
CREATE POLICY "workspace_members_can_manage_meetings" ON meetings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = meetings.workspace_id AND user_id = auth.uid()));

CREATE POLICY "workspace_members_can_view_marketing" ON marketing_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = marketing_items.workspace_id AND user_id = auth.uid()));
CREATE POLICY "workspace_members_can_manage_marketing" ON marketing_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = marketing_items.workspace_id AND user_id = auth.uid()));

CREATE POLICY "workspace_members_can_view_financial" ON financial_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = financial_logs.workspace_id AND user_id = auth.uid()));
CREATE POLICY "workspace_members_can_manage_financial" ON financial_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = financial_logs.workspace_id AND user_id = auth.uid()));

CREATE POLICY "workspace_members_can_view_documents" ON documents FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = documents.workspace_id AND user_id = auth.uid()));
CREATE POLICY "workspace_members_can_manage_documents" ON documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = documents.workspace_id AND user_id = auth.uid()));

CREATE POLICY "workspace_members_can_view_expenses" ON expenses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = expenses.workspace_id AND user_id = auth.uid()));
CREATE POLICY "workspace_members_can_manage_expenses" ON expenses FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = expenses.workspace_id AND user_id = auth.uid()));

CREATE POLICY "workspace_members_can_view_business_profile" ON business_profile FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = business_profile.workspace_id AND user_id = auth.uid()));
CREATE POLICY "workspace_members_can_manage_business_profile" ON business_profile FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = business_profile.workspace_id AND user_id = auth.uid()));

CREATE POLICY "workspace_members_can_view_subscriptions" ON subscriptions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = subscriptions.workspace_id AND user_id = auth.uid()));
CREATE POLICY "owners_can_manage_subscriptions" ON subscriptions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspaces WHERE id = subscriptions.workspace_id AND owner_id = auth.uid()));

CREATE POLICY "workspace_members_can_view_achievements" ON workspace_achievements FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspace_achievements.workspace_id AND user_id = auth.uid()));

CREATE POLICY "workspace_members_can_view_invitations" ON workspace_invitations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM workspace_members WHERE workspace_id = workspace_invitations.workspace_id AND user_id = auth.uid()));
CREATE POLICY "owners_can_manage_invitations" ON workspace_invitations FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM workspaces WHERE id = workspace_invitations.workspace_id AND owner_id = auth.uid()));

-- Create handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
    
    -- Create default workspace
    INSERT INTO public.workspaces (owner_id, name, plan_type)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'My') || '''s Workspace', 'free')
    RETURNING id INTO new_workspace_id;
    
    -- Add user as workspace member
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'owner');
    
    -- Create subscription
    INSERT INTO public.subscriptions (workspace_id, plan_type, status)
    VALUES (new_workspace_id, 'free', 'active');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Success message
SELECT 'Database rebuilt successfully! You can now sign up with your accounts.' as status;



