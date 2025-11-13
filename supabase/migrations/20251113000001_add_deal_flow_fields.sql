-- ============================================================================
-- Add Deal Flow Management Fields to CRM Items
-- ============================================================================
-- Adds comprehensive deal tracking fields for investors, customers, and partners
-- Includes: website, industry, description, investment stage, deal stage, partner type
-- ============================================================================

-- Step 1: Add general information fields (applicable to all CRM types)
ALTER TABLE crm_items 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;

-- Step 2: Add investor-specific fields
ALTER TABLE crm_items 
ADD COLUMN IF NOT EXISTS investment_stage TEXT; -- Pre-Seed, Seed, Series A, B, C, Growth

-- Step 3: Add customer-specific fields
ALTER TABLE crm_items 
ADD COLUMN IF NOT EXISTS deal_stage TEXT; -- Lead, Qualified, Proposal, Negotiation, Closed Won, Closed Lost

-- Step 4: Add partner-specific fields
ALTER TABLE crm_items 
ADD COLUMN IF NOT EXISTS partner_type TEXT; -- Technology, Marketing, Distribution, Integration, Referral, Strategic

-- Step 5: Create indexes for filtering and searching
CREATE INDEX IF NOT EXISTS idx_crm_items_industry ON crm_items(industry);
CREATE INDEX IF NOT EXISTS idx_crm_items_investment_stage ON crm_items(investment_stage);
CREATE INDEX IF NOT EXISTS idx_crm_items_deal_stage ON crm_items(deal_stage);
CREATE INDEX IF NOT EXISTS idx_crm_items_partner_type ON crm_items(partner_type);

-- Step 6: Add comment documentation
COMMENT ON COLUMN crm_items.website IS 'Company website URL';
COMMENT ON COLUMN crm_items.industry IS 'Industry sector (e.g., SaaS, Fintech, Healthcare)';
COMMENT ON COLUMN crm_items.description IS 'Brief description of the company and relationship';
COMMENT ON COLUMN crm_items.investment_stage IS 'Investment stage for investors: Pre-Seed, Seed, Series A, B, C+, Growth';
COMMENT ON COLUMN crm_items.deal_stage IS 'Sales stage for customers: Lead, Qualified, Proposal, Negotiation, Closed Won, Closed Lost';
COMMENT ON COLUMN crm_items.partner_type IS 'Partnership type: Technology, Marketing, Distribution, Integration, Referral, Strategic';
