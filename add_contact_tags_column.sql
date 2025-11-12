-- Migration: Add missing columns to contacts table
-- This enables tags, phone, and title functionality for contact management

-- Add tags column as a JSONB array (stores array of tag strings)
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- Add phone column (optional text field)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Add title column (optional text field for job title)
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add an index for better query performance on tags
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN (tags);

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'contacts' AND column_name IN ('tags', 'phone', 'title')
ORDER BY column_name;
