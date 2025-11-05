-- ============================================================================
-- PHASE 1: CRM COLLABORATION - ASSIGNMENTS
-- ============================================================================
-- Add assignment fields to crm_items and contacts tables
-- Enable company and contact assignments to workspace members
-- ============================================================================

-- Step 1: Add assignment fields to crm_items (companies)
ALTER TABLE crm_items 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_crm_items_assigned_to ON crm_items(assigned_to);

-- Step 2: Add assignment and attribution fields to contacts
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_to_name TEXT,
ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_contacts_assigned_to ON contacts(assigned_to);

-- Step 3: Add attendee tracking to meetings
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS attendee_ids UUID[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS logged_by_name TEXT;

-- Create GIN index for array queries
CREATE INDEX IF NOT EXISTS idx_meetings_attendee_ids ON meetings USING GIN(attendee_ids);

-- Step 4: Backfill created_by_name for existing contacts (optional, can be done later)
-- This helps with attribution display
UPDATE contacts 
SET created_by_name = profiles.full_name
FROM profiles
WHERE contacts.user_id = profiles.id
  AND contacts.created_by_name IS NULL;

-- Step 5: Verify the changes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('crm_items', 'contacts', 'meetings')
  AND column_name IN ('assigned_to', 'assigned_to_name', 'created_by_name', 'attendee_ids', 'logged_by_name')
ORDER BY table_name, column_name;

-- Step 6: Verify indexes were created
SELECT 
  tablename, 
  indexname
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND (indexname LIKE '%assigned_to%' OR indexname LIKE '%attendee%')
ORDER BY tablename, indexname;
