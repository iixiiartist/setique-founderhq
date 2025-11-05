-- Comprehensive fix for ALL circular RLS dependencies
-- The issue: Many policies reference workspace_members, which references workspaces, creating cycles
-- Solution: Temporarily simplify ALL policies to only check direct ownership

-- ============================================
-- WORKSPACES TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view own workspaces" ON workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can update workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owners can delete workspaces" ON workspaces;

-- Simplified: Only owners can see their workspaces (no member access for now)
CREATE POLICY "Users can view own workspaces" ON workspaces FOR SELECT 
    USING (owner_id = auth.uid());

CREATE POLICY "Users can create workspaces" ON workspaces FOR INSERT 
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update workspaces" ON workspaces FOR UPDATE 
    USING (owner_id = auth.uid());

CREATE POLICY "Owners can delete workspaces" ON workspaces FOR DELETE 
    USING (owner_id = auth.uid());

-- ============================================
-- WORKSPACE_MEMBERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view workspace members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage workspace members" ON workspace_members;

-- Simplified: Users can see their own membership records + workspace owners can see all members
CREATE POLICY "Users can view workspace members" ON workspace_members FOR SELECT 
    USING (
        user_id = auth.uid() 
        OR workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can manage workspace members" ON workspace_members FOR ALL 
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

-- ============================================
-- BUSINESS_PROFILE TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view workspace business profiles" ON business_profile;
DROP POLICY IF EXISTS "Users can create business profiles" ON business_profile;
DROP POLICY IF EXISTS "Users can update business profiles" ON business_profile;

-- Simplified: Only workspace owners (no member access for now)
CREATE POLICY "Users can view workspace business profiles" ON business_profile FOR SELECT 
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can create business profiles" ON business_profile FOR INSERT 
    WITH CHECK (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Users can update business profiles" ON business_profile FOR UPDATE 
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

-- ============================================
-- SUBSCRIPTIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view workspace subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Owners can manage subscriptions" ON subscriptions;

-- Simplified: Only workspace owners
CREATE POLICY "Users can view workspace subscriptions" ON subscriptions FOR SELECT 
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can manage subscriptions" ON subscriptions FOR ALL 
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

-- ============================================
-- WORKSPACE_ACHIEVEMENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Users can view workspace achievements" ON workspace_achievements;
DROP POLICY IF EXISTS "Owners can manage workspace achievements" ON workspace_achievements;

-- Simplified: Only workspace owners
CREATE POLICY "Users can view workspace achievements" ON workspace_achievements FOR SELECT 
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

CREATE POLICY "Owners can manage workspace achievements" ON workspace_achievements FOR ALL 
    USING (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    )
    WITH CHECK (
        workspace_id IN (SELECT id FROM workspaces WHERE owner_id = auth.uid())
    );

