-- Migration: Add Workspace and Team Schema
-- Date: 2025-11-01
-- Description: Adds workspace tables for team collaboration

-- Create workspace role enum (if not exists)
DO $$ BEGIN
    CREATE TYPE workspace_role AS ENUM ('owner', 'member');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create workspaces table
CREATE TABLE IF NOT EXISTS workspaces (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    plan_type TEXT DEFAULT 'free' NOT NULL,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    
    -- For team plans
    seat_count INTEGER DEFAULT 1,
    
    -- Usage tracking (will be used with subscription limits)
    ai_usage_count INTEGER DEFAULT 0,
    ai_usage_reset_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    storage_bytes_used BIGINT DEFAULT 0,
    file_count INTEGER DEFAULT 0
);

-- Create workspace_members table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS workspace_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
    role workspace_role DEFAULT 'member' NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Ensure a user can only be in a workspace once
    UNIQUE(workspace_id, user_id)
);

-- Create indexes for workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_plan_type ON workspaces(plan_type);

-- Create indexes for workspace_members
CREATE INDEX IF NOT EXISTS idx_workspace_members_workspace_id ON workspace_members(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user_id ON workspace_members(user_id);

-- Create trigger for updated_at on workspaces
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at 
    BEFORE UPDATE ON workspaces 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on workspaces table
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workspaces
DROP POLICY IF EXISTS "Users can view workspaces they own or are members of" ON workspaces;
CREATE POLICY "Users can view workspaces they own or are members of" ON workspaces 
    FOR SELECT USING (
        auth.uid() = owner_id 
        OR 
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_members.workspace_id = workspaces.id 
            AND workspace_members.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can create their own workspaces" ON workspaces;
CREATE POLICY "Users can create their own workspaces" ON workspaces 
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Workspace owners can update their workspaces" ON workspaces;
CREATE POLICY "Workspace owners can update their workspaces" ON workspaces 
    FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Workspace owners can delete their workspaces" ON workspaces;
CREATE POLICY "Workspace owners can delete their workspaces" ON workspaces 
    FOR DELETE USING (auth.uid() = owner_id);

-- Enable RLS on workspace_members table
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workspace_members
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
CREATE POLICY "Users can view members of their workspaces" ON workspace_members 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspace_members wm2 
            WHERE wm2.workspace_id = workspace_members.workspace_id 
            AND wm2.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Workspace owners can add members" ON workspace_members;
CREATE POLICY "Workspace owners can add members" ON workspace_members 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE workspaces.id = workspace_members.workspace_id 
            AND workspaces.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Workspace owners can remove members" ON workspace_members;
CREATE POLICY "Workspace owners can remove members" ON workspace_members 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE workspaces.id = workspace_members.workspace_id 
            AND workspaces.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Members can leave workspaces" ON workspace_members;
CREATE POLICY "Members can leave workspaces" ON workspace_members 
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically create a default workspace for new users
CREATE OR REPLACE FUNCTION create_default_workspace_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create a personal workspace for the new user
    INSERT INTO workspaces (owner_id, name, plan_type)
    VALUES (NEW.id, COALESCE(NEW.full_name, 'My Workspace') || '''s Workspace', 'free');
    
    -- Note: We don't add to workspace_members since owner has direct access via owner_id
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create workspace on user signup
DROP TRIGGER IF EXISTS create_workspace_on_signup ON profiles;
CREATE TRIGGER create_workspace_on_signup
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_default_workspace_for_user();

-- Add workspace_id to existing tables (nullable for backward compatibility)
-- These will allow data to be scoped to a workspace for team collaboration

-- Add workspace_id to tasks
DO $$ BEGIN
    ALTER TABLE tasks ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);

-- Add workspace_id to crm_items
DO $$ BEGIN
    ALTER TABLE crm_items ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
CREATE INDEX IF NOT EXISTS idx_crm_items_workspace_id ON crm_items(workspace_id);

-- Add workspace_id to contacts
DO $$ BEGIN
    ALTER TABLE contacts ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_id ON contacts(workspace_id);

-- Add workspace_id to meetings
DO $$ BEGIN
    ALTER TABLE meetings ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
CREATE INDEX IF NOT EXISTS idx_meetings_workspace_id ON meetings(workspace_id);

-- Add workspace_id to marketing_items
DO $$ BEGIN
    ALTER TABLE marketing_items ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
CREATE INDEX IF NOT EXISTS idx_marketing_items_workspace_id ON marketing_items(workspace_id);

-- Add workspace_id to financial_logs
DO $$ BEGIN
    ALTER TABLE financial_logs ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
CREATE INDEX IF NOT EXISTS idx_financial_logs_workspace_id ON financial_logs(workspace_id);

-- Add workspace_id to documents
DO $$ BEGIN
    ALTER TABLE documents ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id);

-- Note: expenses table already has workspace_id from the previous migration

-- Update RLS policies to allow workspace members to access shared data
-- (This will be refined in a later migration once we integrate workspace selection in the UI)

COMMENT ON TABLE workspaces IS 'Workspaces for team collaboration. Each user has a default personal workspace.';
COMMENT ON TABLE workspace_members IS 'Members of workspaces. Owner has direct access via workspaces.owner_id.';
COMMENT ON COLUMN workspaces.plan_type IS 'Subscription plan: free, pro-individual, power-individual, team-starter, team-pro';
COMMENT ON COLUMN workspaces.seat_count IS 'Number of seats for team plans';
COMMENT ON COLUMN workspaces.ai_usage_count IS 'AI API calls this billing period';
COMMENT ON COLUMN workspaces.ai_usage_reset_date IS 'When AI usage counter resets (monthly)';
COMMENT ON COLUMN workspaces.storage_bytes_used IS 'Total storage used by workspace in bytes';
COMMENT ON COLUMN workspaces.file_count IS 'Number of files in workspace';

