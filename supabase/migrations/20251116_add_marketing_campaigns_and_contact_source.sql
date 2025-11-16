-- Migration: Add marketing_campaigns table and contacts.source column
-- Date: 2025-11-16
-- Description: Adds marketing campaign tracking and contact source attribution

-- Add source column to contacts table
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS source TEXT;

-- Create index for faster source queries
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);

-- Add comment to describe the column
COMMENT ON COLUMN contacts.source IS 'Marketing channel or source that generated this contact (e.g., "Google Ads", "LinkedIn", "Referral")';

-- Create marketing_campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    channel TEXT NOT NULL, -- e.g., "Google Ads", "Facebook", "LinkedIn", "Email", "Content"
    status TEXT NOT NULL DEFAULT 'active', -- active, paused, completed
    budget_allocated DECIMAL(12, 2) DEFAULT 0,
    budget_spent DECIMAL(12, 2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    target_audience TEXT,
    campaign_goals TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_status CHECK (status IN ('active', 'paused', 'completed')),
    CONSTRAINT valid_budget CHECK (budget_spent <= budget_allocated)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_workspace ON marketing_campaigns(workspace_id);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_channel ON marketing_campaigns(channel);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_dates ON marketing_campaigns(start_date, end_date);

-- Add RLS policies
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view campaigns in their workspace
DROP POLICY IF EXISTS "Users can view campaigns in their workspace" ON marketing_campaigns;
CREATE POLICY "Users can view campaigns in their workspace"
    ON marketing_campaigns
    FOR SELECT
    USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can insert campaigns in their workspace
DROP POLICY IF EXISTS "Users can insert campaigns in their workspace" ON marketing_campaigns;
CREATE POLICY "Users can insert campaigns in their workspace"
    ON marketing_campaigns
    FOR INSERT
    WITH CHECK (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can update campaigns in their workspace
DROP POLICY IF EXISTS "Users can update campaigns in their workspace" ON marketing_campaigns;
CREATE POLICY "Users can update campaigns in their workspace"
    ON marketing_campaigns
    FOR UPDATE
    USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Users can delete campaigns in their workspace
DROP POLICY IF EXISTS "Users can delete campaigns in their workspace" ON marketing_campaigns;
CREATE POLICY "Users can delete campaigns in their workspace"
    ON marketing_campaigns
    FOR DELETE
    USING (
        workspace_id IN (
            SELECT workspace_id 
            FROM workspace_members 
            WHERE user_id = auth.uid()
        )
    );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_marketing_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marketing_campaigns_updated_at ON marketing_campaigns;
CREATE TRIGGER marketing_campaigns_updated_at
    BEFORE UPDATE ON marketing_campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_marketing_campaigns_updated_at();

-- Add comments for documentation
COMMENT ON TABLE marketing_campaigns IS 'Marketing campaign tracking and ROI measurement';
COMMENT ON COLUMN marketing_campaigns.channel IS 'Marketing channel (e.g., "Google Ads", "Facebook", "LinkedIn", "Email", "Content")';
COMMENT ON COLUMN marketing_campaigns.status IS 'Campaign status: active, paused, or completed';
COMMENT ON COLUMN marketing_campaigns.budget_allocated IS 'Total budget allocated for this campaign';
COMMENT ON COLUMN marketing_campaigns.budget_spent IS 'Amount spent so far on this campaign';
COMMENT ON COLUMN marketing_campaigns.target_audience IS 'Description of the target audience for this campaign';
COMMENT ON COLUMN marketing_campaigns.campaign_goals IS 'Goals and objectives for this campaign';

-- Verify migration
DO $$
BEGIN
    -- Check if source column was added
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' AND column_name = 'source'
    ) THEN
        RAISE NOTICE '✓ contacts.source column added successfully';
    END IF;
    
    -- Check if marketing_campaigns table was created
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'marketing_campaigns'
    ) THEN
        RAISE NOTICE '✓ marketing_campaigns table created successfully';
    END IF;
END $$;
