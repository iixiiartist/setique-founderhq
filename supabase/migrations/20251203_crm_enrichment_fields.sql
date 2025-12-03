-- ============================================================================
-- CRM Enrichment Fields Migration
-- ============================================================================
-- Adds company enrichment fields to support auto-fill from website data
-- Fields: location, company_size, founded_year, linkedin, twitter
-- ============================================================================

-- Add enrichment fields to crm_items table
ALTER TABLE crm_items 
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS company_size TEXT,
ADD COLUMN IF NOT EXISTS founded_year TEXT,
ADD COLUMN IF NOT EXISTS linkedin TEXT,
ADD COLUMN IF NOT EXISTS twitter TEXT;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_crm_items_location ON crm_items(location);

-- Add column documentation
COMMENT ON COLUMN crm_items.location IS 'Company headquarters location (e.g., San Francisco, CA)';
COMMENT ON COLUMN crm_items.company_size IS 'Employee count range (e.g., 50-200 employees)';
COMMENT ON COLUMN crm_items.founded_year IS 'Year the company was founded';
COMMENT ON COLUMN crm_items.linkedin IS 'LinkedIn company page URL';
COMMENT ON COLUMN crm_items.twitter IS 'Twitter/X profile URL';

-- Verify the migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'crm_items' 
AND column_name IN ('location', 'company_size', 'founded_year', 'linkedin', 'twitter')
ORDER BY column_name;
