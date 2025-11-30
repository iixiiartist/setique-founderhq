-- ============================================================================
-- Forms Engine - Add Missing Columns & Functions
-- Run this in Supabase SQL Editor (safe to run multiple times)
-- ============================================================================

-- Add total_submissions column if it doesn't exist
ALTER TABLE forms ADD COLUMN IF NOT EXISTS total_submissions INTEGER DEFAULT 0;

-- Add default_account_id column if it doesn't exist
ALTER TABLE forms ADD COLUMN IF NOT EXISTS default_account_id UUID;

-- Add missing columns to form_fields
ALTER TABLE form_fields ADD COLUMN IF NOT EXISTS help_text TEXT;

-- Add missing columns to form_submissions
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS account_id UUID;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS completion_time_seconds INTEGER;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS ip_hash TEXT;
ALTER TABLE form_submissions ADD COLUMN IF NOT EXISTS utm_params JSONB;

-- Add missing columns to form_analytics
ALTER TABLE form_analytics ADD COLUMN IF NOT EXISTS field_id TEXT;
ALTER TABLE form_analytics ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE form_analytics ADD COLUMN IF NOT EXISTS ip_hash TEXT;
ALTER TABLE form_analytics ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE form_analytics ADD COLUMN IF NOT EXISTS utm_params JSONB;

-- Update event_type check constraint to include 'field_interaction'
ALTER TABLE form_analytics DROP CONSTRAINT IF EXISTS form_analytics_event_type_check;
ALTER TABLE form_analytics ADD CONSTRAINT form_analytics_event_type_check 
    CHECK (event_type IN (
        'view', 'start', 'field_focus', 'field_complete', 
        'page_change', 'submit', 'abandon', 'share', 'embed_load',
        'field_interaction'
    ));

-- Create increment_form_submissions function
CREATE OR REPLACE FUNCTION increment_form_submissions(p_form_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE forms 
    SET total_submissions = COALESCE(total_submissions, 0) + 1,
        updated_at = NOW()
    WHERE id = p_form_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION increment_form_submissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_form_submissions(UUID) TO anon;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_form_submissions_account_id ON form_submissions(account_id);

-- Success
SELECT 'Forms Engine columns and functions added successfully!' as status;
