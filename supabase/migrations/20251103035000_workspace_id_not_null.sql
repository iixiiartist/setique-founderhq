-- Migration: Make workspace_id NOT NULL on all content tables
-- Purpose: Prevent orphaned content - all content MUST belong to a workspace
-- Date: 2025-11-03
-- Safe because: Migration 20251103033000 already backfilled all existing data

-- ============================================================
-- MAKE WORKSPACE_ID NOT NULL ON ALL CONTENT TABLES
-- ============================================================

-- Tasks table
ALTER TABLE tasks
ALTER COLUMN workspace_id SET NOT NULL;

-- CRM Items table
ALTER TABLE crm_items
ALTER COLUMN workspace_id SET NOT NULL;

-- Contacts table
ALTER TABLE contacts
ALTER COLUMN workspace_id SET NOT NULL;

-- Meetings table
ALTER TABLE meetings
ALTER COLUMN workspace_id SET NOT NULL;

-- Marketing Items table
ALTER TABLE marketing_items
ALTER COLUMN workspace_id SET NOT NULL;

-- Financial Logs table
ALTER TABLE financial_logs
ALTER COLUMN workspace_id SET NOT NULL;

-- Documents table
ALTER TABLE documents
ALTER COLUMN workspace_id SET NOT NULL;

-- Expenses table
ALTER TABLE expenses
ALTER COLUMN workspace_id SET NOT NULL;

-- ============================================================
-- VERIFICATION
-- ============================================================

DO $$
DECLARE
  table_name TEXT;
  null_count INTEGER;
BEGIN
  RAISE NOTICE '✓ workspace_id is now NOT NULL on all content tables:';
  
  FOR table_name IN 
    SELECT unnest(ARRAY['tasks', 'crm_items', 'contacts', 'meetings', 'marketing_items', 'financial_logs', 'documents', 'expenses'])
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I WHERE workspace_id IS NULL', table_name) INTO null_count;
    RAISE NOTICE '  - %: NOT NULL constraint applied (% NULL values)', table_name, null_count;
    
    IF null_count > 0 THEN
      RAISE EXCEPTION 'ERROR: Table % still has % NULL workspace_id values!', table_name, null_count;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Data integrity enforced: All content must belong to a workspace.';
END $$;

