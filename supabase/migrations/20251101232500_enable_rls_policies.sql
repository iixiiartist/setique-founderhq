-- Enable RLS and add policies for workspace tables
-- Run this in Supabase SQL Editor

-- Enable RLS on workspace tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_achievements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete workspaces" ON workspaces;

DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage workspace members" ON workspace_members;

DROP POLICY IF EXISTS "Users can view workspace business profiles" ON business_profile;
DROP POLICY IF EXISTS "Users can create business profiles" ON business_profile;
DROP POLICY IF EXISTS "Users can update business profiles" ON business_profile;

DROP POLICY IF EXISTS "Users can view workspace subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Owners can manage subscriptions" ON subscriptions;

DROP POLICY IF EXISTS "Users can view workspace achievements" ON workspace_achievements;

-- Workspaces: Users can view workspaces they own OR are members of
CREATE POLICY "Users can view own workspaces" ON workspaces FOR SELECT 
    USING (
        owner_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = workspaces.id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create workspaces" ON workspaces FOR INSERT 
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update workspaces" ON workspaces FOR UPDATE 
    USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete workspaces" ON workspaces FOR DELETE 
    USING (owner_id = auth.uid());

-- Workspace Members: Users can view members of their workspaces
CREATE POLICY "Users can view workspace members" ON workspace_members FOR SELECT 
    USING (
        user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM workspace_members wm 
            WHERE wm.workspace_id = workspace_members.workspace_id 
            AND wm.user_id = auth.uid()
        )
    );

CREATE POLICY "Owners can manage workspace members" ON workspace_members FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = workspace_members.workspace_id 
            AND owner_id = auth.uid()
        )
    );

-- Business Profile: Users can view/edit profiles of workspaces they belong to
CREATE POLICY "Users can view workspace business profiles" ON business_profile FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = business_profile.workspace_id 
            AND user_id = auth.uid()
        ) 
        OR EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = business_profile.workspace_id 
            AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can create business profiles" ON business_profile FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = business_profile.workspace_id 
            AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update business profiles" ON business_profile FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = business_profile.workspace_id 
            AND user_id = auth.uid()
        ) 
        OR EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = business_profile.workspace_id 
            AND owner_id = auth.uid()
        )
    );

-- Subscriptions: Users can view subscriptions of workspaces they belong to
CREATE POLICY "Users can view workspace subscriptions" ON subscriptions FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = subscriptions.workspace_id 
            AND user_id = auth.uid()
        ) 
        OR EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = subscriptions.workspace_id 
            AND owner_id = auth.uid()
        )
    );

CREATE POLICY "Owners can manage subscriptions" ON subscriptions FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = subscriptions.workspace_id 
            AND owner_id = auth.uid()
        )
    );

-- Workspace Achievements: Users can view achievements of workspaces they belong to
CREATE POLICY "Users can view workspace achievements" ON workspace_achievements FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM workspace_members 
            WHERE workspace_id = workspace_achievements.workspace_id 
            AND user_id = auth.uid()
        ) 
        OR EXISTS (
            SELECT 1 FROM workspaces 
            WHERE id = workspace_achievements.workspace_id 
            AND owner_id = auth.uid()
        )
    );

