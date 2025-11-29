-- Migration: Allow standalone contacts (not linked to CRM items)
-- Date: 2025-11-29
-- Description: Makes crm_item_id nullable on contacts table to support
--              standalone contacts imported from emails or other sources

-- Make crm_item_id nullable
ALTER TABLE contacts 
ALTER COLUMN crm_item_id DROP NOT NULL;

-- Add a source_email column to track where the contact came from
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS source_email TEXT;

-- Add comment
COMMENT ON COLUMN contacts.crm_item_id IS 'Optional reference to a CRM item. NULL for standalone contacts.';
COMMENT ON COLUMN contacts.source_email IS 'Email address from which this contact was extracted (if applicable).';

-- Update RLS policy to allow standalone contacts
-- (Existing policies should work since they check workspace_id, not crm_item_id)

-- Verification
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'contacts' 
        AND column_name = 'crm_item_id' 
        AND is_nullable = 'YES'
    ) THEN
        RAISE NOTICE '✓ contacts.crm_item_id is now nullable';
    END IF;
END $$;
