-- Migration: Add Business Profile Schema
-- Date: 2025-11-01
-- Description: Adds business_profile table for workspace context and AI personalization

-- Create business_profile table (one per workspace)
CREATE TABLE IF NOT EXISTS business_profile (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Basic Business Information
    company_name TEXT NOT NULL,
    industry TEXT,
    company_size TEXT, -- e.g., "1-10", "11-50", "51-200", "201-500", "500+"
    founded_year INTEGER,
    website TEXT,
    
    -- Business Model & Strategy
    business_model TEXT, -- e.g., "B2B SaaS", "Marketplace", "E-commerce", "Services"
    description TEXT, -- Elevator pitch / brief description
    target_market TEXT, -- Who are your customers?
    value_proposition TEXT, -- What problem do you solve?
    
    -- Goals & Challenges
    primary_goal TEXT, -- e.g., "Acquire customers", "Raise funding", "Build product"
    key_challenges TEXT, -- What obstacles are you facing?
    growth_stage TEXT, -- e.g., "Idea", "MVP", "Early Traction", "Growth", "Scale"
    
    -- Revenue & Metrics
    current_mrr INTEGER, -- Monthly Recurring Revenue in cents
    target_mrr INTEGER, -- Target MRR goal in cents
    current_arr INTEGER, -- Annual Recurring Revenue in cents
    customer_count INTEGER,
    
    -- Team & Culture
    team_size INTEGER,
    remote_policy TEXT, -- e.g., "Fully Remote", "Hybrid", "In-Office"
    company_values TEXT[], -- Array of values like ["Innovation", "Customer First", "Transparency"]
    
    -- Additional Context (for AI personalization)
    tech_stack TEXT[], -- Technologies used, e.g., ["React", "Python", "AWS"]
    competitors TEXT[], -- List of competitor names
    unique_differentiators TEXT, -- What makes you different?
    
    -- Metadata
    is_complete BOOLEAN DEFAULT FALSE, -- Has the profile been fully filled out?
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for business_profile
CREATE INDEX IF NOT EXISTS idx_business_profile_workspace_id ON business_profile(workspace_id);
CREATE INDEX IF NOT EXISTS idx_business_profile_industry ON business_profile(industry);
CREATE INDEX IF NOT EXISTS idx_business_profile_growth_stage ON business_profile(growth_stage);
CREATE INDEX IF NOT EXISTS idx_business_profile_is_complete ON business_profile(is_complete);

-- Create trigger for updated_at on business_profile
DROP TRIGGER IF EXISTS update_business_profile_updated_at ON business_profile;
CREATE TRIGGER update_business_profile_updated_at 
    BEFORE UPDATE ON business_profile 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS on business_profile table
ALTER TABLE business_profile ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for business_profile
DROP POLICY IF EXISTS "Users can view business profiles of their workspaces" ON business_profile;
CREATE POLICY "Users can view business profiles of their workspaces" ON business_profile 
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE workspaces.id = business_profile.workspace_id 
            AND (
                workspaces.owner_id = auth.uid()
                OR
                EXISTS (
                    SELECT 1 FROM workspace_members 
                    WHERE workspace_members.workspace_id = business_profile.workspace_id 
                    AND workspace_members.user_id = auth.uid()
                )
            )
        )
    );

DROP POLICY IF EXISTS "Workspace owners can create business profiles" ON business_profile;
CREATE POLICY "Workspace owners can create business profiles" ON business_profile 
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE workspaces.id = business_profile.workspace_id 
            AND workspaces.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Workspace owners can update business profiles" ON business_profile;
CREATE POLICY "Workspace owners can update business profiles" ON business_profile 
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE workspaces.id = business_profile.workspace_id 
            AND workspaces.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Workspace owners can delete business profiles" ON business_profile;
CREATE POLICY "Workspace owners can delete business profiles" ON business_profile 
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM workspaces 
            WHERE workspaces.id = business_profile.workspace_id 
            AND workspaces.owner_id = auth.uid()
        )
    );

-- Add comments for documentation
COMMENT ON TABLE business_profile IS 'Business profile information for workspace context and AI personalization. One profile per workspace.';
COMMENT ON COLUMN business_profile.workspace_id IS 'Links to workspace - one profile per workspace (enforced by UNIQUE constraint)';
COMMENT ON COLUMN business_profile.description IS 'Elevator pitch or brief business description';
COMMENT ON COLUMN business_profile.target_market IS 'Target customer segment or market';
COMMENT ON COLUMN business_profile.value_proposition IS 'Core value proposition - what problem you solve';
COMMENT ON COLUMN business_profile.current_mrr IS 'Current Monthly Recurring Revenue in cents';
COMMENT ON COLUMN business_profile.target_mrr IS 'Target MRR goal in cents';
COMMENT ON COLUMN business_profile.current_arr IS 'Annual Recurring Revenue in cents';
COMMENT ON COLUMN business_profile.company_values IS 'Array of company values for culture context';
COMMENT ON COLUMN business_profile.tech_stack IS 'Technologies used, for AI context about technical capabilities';
COMMENT ON COLUMN business_profile.competitors IS 'List of competitor names for market context';
COMMENT ON COLUMN business_profile.unique_differentiators IS 'What makes the business unique/different';
COMMENT ON COLUMN business_profile.is_complete IS 'Whether the onboarding profile has been fully completed';
COMMENT ON COLUMN business_profile.completed_at IS 'When the profile was marked as complete';

-- Function to automatically mark profile as complete when all required fields are filled
CREATE OR REPLACE FUNCTION check_business_profile_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Mark as complete if all core fields are filled
    IF NEW.company_name IS NOT NULL 
       AND NEW.industry IS NOT NULL
       AND NEW.business_model IS NOT NULL
       AND NEW.description IS NOT NULL
       AND NEW.target_market IS NOT NULL
       AND NEW.primary_goal IS NOT NULL
       AND NEW.growth_stage IS NOT NULL
       AND NEW.is_complete = FALSE
    THEN
        NEW.is_complete = TRUE;
        NEW.completed_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-complete profile
DROP TRIGGER IF EXISTS check_profile_completion ON business_profile;
CREATE TRIGGER check_profile_completion
    BEFORE INSERT OR UPDATE ON business_profile
    FOR EACH ROW
    EXECUTE FUNCTION check_business_profile_completion();

-- Predefined Options (for reference in application)
/*
COMPANY_SIZE_OPTIONS:
- "1-10 employees"
- "11-50 employees"
- "51-200 employees"
- "201-500 employees"
- "500+ employees"
- "Just me"

BUSINESS_MODEL_OPTIONS:
- "B2B SaaS"
- "B2C SaaS"
- "Marketplace"
- "E-commerce"
- "Consulting/Services"
- "Agency"
- "Hardware"
- "Other"

GROWTH_STAGE_OPTIONS:
- "Idea Stage"
- "Building MVP"
- "Early Traction"
- "Growth Stage"
- "Scaling"
- "Mature"

PRIMARY_GOAL_OPTIONS:
- "Acquire First Customers"
- "Achieve Product-Market Fit"
- "Grow Revenue"
- "Raise Funding"
- "Build Product"
- "Hire Team"
- "Expand Market"

REMOTE_POLICY_OPTIONS:
- "Fully Remote"
- "Hybrid"
- "In-Office"
- "Remote-First"

INDUSTRY_OPTIONS (common):
- "SaaS/Software"
- "E-commerce"
- "FinTech"
- "HealthTech"
- "EdTech"
- "Marketing/AdTech"
- "Real Estate"
- "Manufacturing"
- "Consulting"
- "Other"
*/

