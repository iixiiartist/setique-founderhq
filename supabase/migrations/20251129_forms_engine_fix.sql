-- ============================================================================
-- Forms Engine Fix - Add missing columns and functions
-- Run this after 20251129_forms_engine.sql
-- ============================================================================

-- Add total_submissions column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forms' AND column_name = 'total_submissions'
    ) THEN
        ALTER TABLE forms ADD COLUMN total_submissions INTEGER DEFAULT 0;
    END IF;
END $$;

-- Add account_id column to form_submissions if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'form_submissions' AND column_name = 'account_id'
    ) THEN
        ALTER TABLE form_submissions ADD COLUMN account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Add default_account_id column to forms if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'forms' AND column_name = 'default_account_id'
    ) THEN
        ALTER TABLE forms ADD COLUMN default_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create increment_form_submissions function
CREATE OR REPLACE FUNCTION increment_form_submissions(form_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE forms 
    SET total_submissions = COALESCE(total_submissions, 0) + 1,
        updated_at = NOW()
    WHERE id = form_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION increment_form_submissions(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_form_submissions(UUID) TO anon;

-- Create index on form_submissions account_id
CREATE INDEX IF NOT EXISTS idx_form_submissions_account_id ON form_submissions(account_id);
