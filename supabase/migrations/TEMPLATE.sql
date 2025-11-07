-- Migration: [Brief description]
-- Created: YYYY-MM-DD
-- Author: [Your name]
-- Description: [Detailed description of what this migration does and why]

-- Prerequisites (if any):
-- - [List any required conditions or previous migrations]

-- Impact:
-- - [Describe what tables/data will be affected]
-- - [Note any breaking changes]

-- ============================================================
-- [SECTION 1: Schema Changes]
-- ============================================================

-- Example: Add new column
-- ALTER TABLE table_name 
-- ADD COLUMN IF NOT EXISTS column_name data_type;

-- Example: Add index for performance
-- CREATE INDEX IF NOT EXISTS idx_name 
-- ON table_name(column_name);

-- ============================================================
-- [SECTION 2: Data Migration]
-- ============================================================

-- Example: Migrate existing data
-- UPDATE table_name 
-- SET new_column = old_column 
-- WHERE condition;

-- ============================================================
-- [SECTION 3: Security/RLS Policies]
-- ============================================================

-- Example: Update RLS policy
-- DROP POLICY IF EXISTS "policy_name" ON table_name;
-- CREATE POLICY "policy_name" ON table_name
-- FOR SELECT USING (condition);

-- ============================================================
-- [SECTION 4: Functions/Triggers]
-- ============================================================

-- Example: Create or update function
-- CREATE OR REPLACE FUNCTION function_name()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Function logic here
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Verification (optional - run separately)
-- ============================================================

-- Queries to verify migration was successful
-- SELECT * FROM table_name WHERE condition;

-- ============================================================
-- Rollback (if needed)
-- ============================================================

-- Instructions to undo this migration if necessary
-- ALTER TABLE table_name DROP COLUMN IF EXISTS column_name;
