-- Setique Founder Dashboard Database Schema
-- This file contains the SQL schema for setting up the Supabase database

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing objects (for clean re-creation)
-- Note: Only run this on a fresh database or when you want to reset everything!
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS business_profile CASCADE;
DROP TABLE IF EXISTS workspace_members CASCADE;
DROP TABLE IF EXISTS workspace_achievements CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TYPE IF EXISTS expense_category CASCADE;
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS plan_type CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;
DROP TYPE IF EXISTS workspace_role CASCADE;

-- Create custom types
CREATE TYPE task_status AS ENUM ('Todo', 'InProgress', 'Done');
CREATE TYPE priority_level AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE crm_type AS ENUM ('investor', 'customer', 'partner');
CREATE TYPE marketing_type AS ENUM ('Blog Post', 'Newsletter', 'Social Campaign', 'Webinar', 'Other');
CREATE TYPE marketing_status AS ENUM ('Planned', 'In Progress', 'Completed', 'Published', 'Cancelled');
CREATE TYPE plan_type AS ENUM ('free', 'pro-individual', 'power-individual', 'team-starter', 'team-pro');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'unpaid', 'trialing', 'incomplete', 'incomplete_expired');
CREATE TYPE workspace_role AS ENUM ('owner', 'member');

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    settings JSONB DEFAULT '{"desktopNotifications": false}',
    gamification JSONB DEFAULT '{"streak": 0, "lastActivityDate": null, "xp": 0, "level": 1, "achievements": [], "teamAchievements": [], "teamXp": 0, "teamLevel": 1}'
);

-- Create workspaces table (for team collaboration)
CREATE TABLE workspaces (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    plan_type plan_type DEFAULT 'free'
);

-- Create workspace_members table (for team membership)
CREATE TABLE workspace_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role workspace_role DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(workspace_id, user_id)
);

-- Create business_profile table (one per workspace, shared by team)
CREATE TABLE business_profile (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Basic Information
    company_name TEXT NOT NULL,
    industry TEXT,
    company_size TEXT,
    founded_year INTEGER,
    website TEXT,
    
    -- Business Model & Strategy
    business_model TEXT,
    description TEXT,
    target_market TEXT,
    value_proposition TEXT,
    
    -- Goals & Challenges
    primary_goal TEXT,
    key_challenges TEXT,
    growth_stage TEXT,
    
    -- Revenue & Metrics
    current_mrr NUMERIC,
    target_mrr NUMERIC,
    current_arr NUMERIC,
    customer_count INTEGER,
    
    -- Team & Culture
    team_size INTEGER,
    remote_policy TEXT,
    company_values TEXT[],
    
    -- Additional Context
    tech_stack TEXT[],
    competitors TEXT[],
    unique_differentiators TEXT,
    
    -- Status
    is_complete BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create subscriptions table (one per workspace)
CREATE TABLE subscriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    plan_type plan_type DEFAULT 'free',
    status subscription_status DEFAULT 'active',
    
    -- Stripe data
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    stripe_price_id TEXT,
    
    -- Billing
    seat_count INTEGER DEFAULT 1,
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,
    cancel_at_period_end BOOLEAN DEFAULT false,
    
    -- Usage tracking
    ai_usage_count INTEGER DEFAULT 0,
    ai_usage_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    storage_bytes BIGINT DEFAULT 0,
    file_count INTEGER DEFAULT 0
);

-- Create workspace_achievements table (track team achievements)
CREATE TABLE workspace_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    achievement_id TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    unlocked_by_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    UNIQUE(workspace_id, achievement_id)
);

-- Create tasks table
CREATE TABLE tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
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
    notes JSONB DEFAULT '[]'
);

-- Create CRM items table
CREATE TABLE crm_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company TEXT NOT NULL,
    type crm_type NOT NULL,
    priority priority_level DEFAULT 'Medium',
    status TEXT NOT NULL,
    next_action TEXT,
    next_action_date DATE,
    check_size NUMERIC, -- For investors
    deal_value NUMERIC, -- For customers
    opportunity TEXT, -- For partners
    notes JSONB DEFAULT '[]'
);

-- Create contacts table
CREATE TABLE contacts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    crm_item_id UUID REFERENCES crm_items(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    linkedin TEXT DEFAULT '',
    notes JSONB DEFAULT '[]'
);

-- Create meetings table
CREATE TABLE meetings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    title TEXT NOT NULL,
    attendees TEXT NOT NULL,
    summary TEXT NOT NULL
);

-- Create marketing items table
CREATE TABLE marketing_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    title TEXT NOT NULL,
    type marketing_type NOT NULL,
    status marketing_status DEFAULT 'Planned',
    due_date DATE,
    notes JSONB DEFAULT '[]'
);

-- Create financial logs table
CREATE TABLE financial_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date DATE NOT NULL,
    mrr NUMERIC NOT NULL DEFAULT 0,
    gmv NUMERIC NOT NULL DEFAULT 0,
    signups INTEGER NOT NULL DEFAULT 0
);

-- Create expense categories enum
CREATE TYPE expense_category AS ENUM (
    'Software/SaaS',
    'Marketing',
    'Office',
    'Legal',
    'Contractors',
    'Travel',
    'Meals',
    'Equipment',
    'Subscriptions',
    'Other'
);

-- Create payment method enum
CREATE TYPE payment_method AS ENUM (
    'Credit Card',
    'Debit Card',
    'Bank Transfer',
    'Cash',
    'PayPal',
    'Other'
);

-- Create expenses table
CREATE TABLE expenses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    workspace_id UUID, -- Will be used later for team features
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

-- Create documents table
CREATE TABLE documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    content TEXT NOT NULL, -- Base64 encoded
    module TEXT NOT NULL,
    company_id UUID REFERENCES crm_items(id) ON DELETE SET NULL,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    notes JSONB DEFAULT '[]'
);

-- Create indexes for better performance
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_category ON tasks(category);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

CREATE INDEX idx_crm_items_user_id ON crm_items(user_id);
CREATE INDEX idx_crm_items_type ON crm_items(type);
CREATE INDEX idx_crm_items_status ON crm_items(status);

CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_contacts_crm_item_id ON contacts(crm_item_id);

CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_contact_id ON meetings(contact_id);
CREATE INDEX idx_meetings_timestamp ON meetings(timestamp);

CREATE INDEX idx_marketing_items_user_id ON marketing_items(user_id);
CREATE INDEX idx_marketing_items_status ON marketing_items(status);
CREATE INDEX idx_marketing_items_due_date ON marketing_items(due_date);

CREATE INDEX idx_financial_logs_user_id ON financial_logs(user_id);
CREATE INDEX idx_financial_logs_date ON financial_logs(date);

CREATE INDEX idx_expenses_user_id ON expenses(user_id);
CREATE INDEX idx_expenses_workspace_id ON expenses(workspace_id);
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category);

CREATE INDEX idx_documents_user_id ON documents(user_id);
CREATE INDEX idx_documents_module ON documents(module);

-- Create functions for automatic updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_crm_items_updated_at BEFORE UPDATE ON crm_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_meetings_updated_at BEFORE UPDATE ON meetings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marketing_items_updated_at BEFORE UPDATE ON marketing_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_financial_logs_updated_at BEFORE UPDATE ON financial_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Profiles: Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Tasks: Users can only access their own tasks
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- CRM Items: Users can only access their own CRM items
CREATE POLICY "Users can view own crm_items" ON crm_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own crm_items" ON crm_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own crm_items" ON crm_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own crm_items" ON crm_items FOR DELETE USING (auth.uid() = user_id);

-- Contacts: Users can only access their own contacts
CREATE POLICY "Users can view own contacts" ON contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own contacts" ON contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own contacts" ON contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own contacts" ON contacts FOR DELETE USING (auth.uid() = user_id);

-- Meetings: Users can only access their own meetings
CREATE POLICY "Users can view own meetings" ON meetings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meetings" ON meetings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meetings" ON meetings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meetings" ON meetings FOR DELETE USING (auth.uid() = user_id);

-- Marketing Items: Users can only access their own marketing items
CREATE POLICY "Users can view own marketing_items" ON marketing_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own marketing_items" ON marketing_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own marketing_items" ON marketing_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own marketing_items" ON marketing_items FOR DELETE USING (auth.uid() = user_id);

-- Financial Logs: Users can only access their own financial logs
CREATE POLICY "Users can view own financial_logs" ON financial_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own financial_logs" ON financial_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own financial_logs" ON financial_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own financial_logs" ON financial_logs FOR DELETE USING (auth.uid() = user_id);

-- Expenses: Users can only access their own expenses
CREATE POLICY "Users can view own expenses" ON expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own expenses" ON expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own expenses" ON expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own expenses" ON expenses FOR DELETE USING (auth.uid() = user_id);

-- Documents: Users can only access their own documents
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);

-- Workspaces: Users can view workspaces they are members of
CREATE POLICY "Users can view own workspaces" ON workspaces FOR SELECT 
    USING (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM workspace_members WHERE workspace_id = workspaces.id AND user_id = auth.uid()
    ));
CREATE POLICY "Users can create workspaces" ON workspaces FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update workspaces" ON workspaces FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Owners can delete workspaces" ON workspaces FOR DELETE USING (owner_id = auth.uid());

-- Workspace Members: Users can view members of their workspaces
CREATE POLICY "Users can view workspace members" ON workspace_members FOR SELECT 
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM workspace_members wm WHERE wm.workspace_id = workspace_members.workspace_id AND wm.user_id = auth.uid()
    ));
CREATE POLICY "Owners can manage workspace members" ON workspace_members FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM workspaces WHERE id = workspace_members.workspace_id AND owner_id = auth.uid()
    ));

-- Business Profile: Users can view/edit profiles of workspaces they belong to
CREATE POLICY "Users can view workspace business profiles" ON business_profile FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM workspace_members WHERE workspace_id = business_profile.workspace_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM workspaces WHERE id = business_profile.workspace_id AND owner_id = auth.uid()
    ));
CREATE POLICY "Users can create business profiles" ON business_profile FOR INSERT 
    WITH CHECK (EXISTS (
        SELECT 1 FROM workspaces WHERE id = business_profile.workspace_id AND owner_id = auth.uid()
    ));
CREATE POLICY "Users can update business profiles" ON business_profile FOR UPDATE 
    USING (EXISTS (
        SELECT 1 FROM workspace_members WHERE workspace_id = business_profile.workspace_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM workspaces WHERE id = business_profile.workspace_id AND owner_id = auth.uid()
    ));

-- Subscriptions: Users can view subscriptions of workspaces they belong to
CREATE POLICY "Users can view workspace subscriptions" ON subscriptions FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM workspace_members WHERE workspace_id = subscriptions.workspace_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM workspaces WHERE id = subscriptions.workspace_id AND owner_id = auth.uid()
    ));
CREATE POLICY "Owners can manage subscriptions" ON subscriptions FOR ALL 
    USING (EXISTS (
        SELECT 1 FROM workspaces WHERE id = subscriptions.workspace_id AND owner_id = auth.uid()
    ));

-- Workspace Achievements: Users can view achievements of workspaces they belong to
CREATE POLICY "Users can view workspace achievements" ON workspace_achievements FOR SELECT 
    USING (EXISTS (
        SELECT 1 FROM workspace_members WHERE workspace_id = workspace_achievements.workspace_id AND user_id = auth.uid()
    ) OR EXISTS (
        SELECT 1 FROM workspaces WHERE id = workspace_achievements.workspace_id AND owner_id = auth.uid()
    ));

-- Function to automatically create profile, workspace, and subscription on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_workspace_id UUID;
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', '')
    );
    
    -- Create default workspace
    INSERT INTO public.workspaces (owner_id, name, plan_type)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'My Workspace') || '''s Workspace', 'free')
    RETURNING id INTO new_workspace_id;
    
    -- Add user as workspace owner in members table
    INSERT INTO public.workspace_members (workspace_id, user_id, role)
    VALUES (new_workspace_id, NEW.id, 'owner');
    
    -- Create default subscription
    INSERT INTO public.subscriptions (workspace_id, plan_type, status)
    VALUES (new_workspace_id, 'free', 'active');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();