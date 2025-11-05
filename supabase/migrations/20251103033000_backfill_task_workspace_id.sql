-- Add workspace_id to all tables and backfill existing data
-- Migration: 20251103033000_add_workspace_id_to_all_tables.sql

-- =====================================================
-- STEP 1: Add workspace_id column to tables that don't have it
-- =====================================================

-- Add workspace_id to crm_items
ALTER TABLE crm_items 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to contacts
ALTER TABLE contacts 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to meetings
ALTER TABLE meetings 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to marketing_items
ALTER TABLE marketing_items 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to financial_logs
ALTER TABLE financial_logs 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- Add workspace_id to documents
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE;

-- expenses already has workspace_id in schema

-- =====================================================
-- STEP 2: Backfill workspace_id for all tables
-- =====================================================

-- TASKS: Assign to workspace owned by user_id
UPDATE tasks t
SET workspace_id = w.id,
    updated_at = NOW()
FROM workspaces w
WHERE t.workspace_id IS NULL
  AND t.user_id = w.owner_id;

-- Handle tasks where user is a member (not owner)
UPDATE tasks t
SET workspace_id = wm.workspace_id,
    updated_at = NOW()
FROM workspace_members wm
WHERE t.workspace_id IS NULL
  AND t.user_id = wm.user_id;

-- CRM ITEMS
UPDATE crm_items ci
SET workspace_id = w.id,
    updated_at = NOW()
FROM workspaces w
WHERE ci.workspace_id IS NULL
  AND ci.user_id = w.owner_id;

UPDATE crm_items ci
SET workspace_id = wm.workspace_id,
    updated_at = NOW()
FROM workspace_members wm
WHERE ci.workspace_id IS NULL
  AND ci.user_id = wm.user_id;

-- CONTACTS
UPDATE contacts c
SET workspace_id = w.id,
    updated_at = NOW()
FROM workspaces w
WHERE c.workspace_id IS NULL
  AND c.user_id = w.owner_id;

UPDATE contacts c
SET workspace_id = wm.workspace_id,
    updated_at = NOW()
FROM workspace_members wm
WHERE c.workspace_id IS NULL
  AND c.user_id = wm.user_id;

-- MEETINGS
UPDATE meetings m
SET workspace_id = w.id,
    updated_at = NOW()
FROM workspaces w
WHERE m.workspace_id IS NULL
  AND m.user_id = w.owner_id;

UPDATE meetings m
SET workspace_id = wm.workspace_id,
    updated_at = NOW()
FROM workspace_members wm
WHERE m.workspace_id IS NULL
  AND m.user_id = wm.user_id;

-- MARKETING ITEMS
UPDATE marketing_items mi
SET workspace_id = w.id,
    updated_at = NOW()
FROM workspaces w
WHERE mi.workspace_id IS NULL
  AND mi.user_id = w.owner_id;

UPDATE marketing_items mi
SET workspace_id = wm.workspace_id,
    updated_at = NOW()
FROM workspace_members wm
WHERE mi.workspace_id IS NULL
  AND mi.user_id = wm.user_id;

-- FINANCIAL LOGS
UPDATE financial_logs fl
SET workspace_id = w.id,
    updated_at = NOW()
FROM workspaces w
WHERE fl.workspace_id IS NULL
  AND fl.user_id = w.owner_id;

UPDATE financial_logs fl
SET workspace_id = wm.workspace_id,
    updated_at = NOW()
FROM workspace_members wm
WHERE fl.workspace_id IS NULL
  AND fl.user_id = wm.user_id;

-- EXPENSES
UPDATE expenses e
SET workspace_id = w.id,
    updated_at = NOW()
FROM workspaces w
WHERE e.workspace_id IS NULL
  AND e.user_id = w.owner_id;

UPDATE expenses e
SET workspace_id = wm.workspace_id,
    updated_at = NOW()
FROM workspace_members wm
WHERE e.workspace_id IS NULL
  AND e.user_id = wm.user_id;

-- DOCUMENTS
UPDATE documents d
SET workspace_id = w.id,
    updated_at = NOW()
FROM workspaces w
WHERE d.workspace_id IS NULL
  AND d.user_id = w.owner_id;

UPDATE documents d
SET workspace_id = wm.workspace_id,
    updated_at = NOW()
FROM workspace_members wm
WHERE d.workspace_id IS NULL
  AND d.user_id = wm.user_id;

-- =====================================================
-- STEP 3: Create indexes for workspace_id columns
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_crm_items_workspace_id ON crm_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_contacts_workspace_id ON contacts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_meetings_workspace_id ON meetings(workspace_id);
CREATE INDEX IF NOT EXISTS idx_marketing_items_workspace_id ON marketing_items(workspace_id);
CREATE INDEX IF NOT EXISTS idx_financial_logs_workspace_id ON financial_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_expenses_workspace_id ON expenses(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents(workspace_id);

-- =====================================================
-- STEP 4: Log results
-- =====================================================

DO $$
DECLARE
    tasks_count INTEGER;
    crm_count INTEGER;
    contacts_count INTEGER;
    meetings_count INTEGER;
    marketing_count INTEGER;
    financial_count INTEGER;
    expenses_count INTEGER;
    documents_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tasks_count FROM tasks WHERE workspace_id IS NOT NULL;
    SELECT COUNT(*) INTO crm_count FROM crm_items WHERE workspace_id IS NOT NULL;
    SELECT COUNT(*) INTO contacts_count FROM contacts WHERE workspace_id IS NOT NULL;
    SELECT COUNT(*) INTO meetings_count FROM meetings WHERE workspace_id IS NOT NULL;
    SELECT COUNT(*) INTO marketing_count FROM marketing_items WHERE workspace_id IS NOT NULL;
    SELECT COUNT(*) INTO financial_count FROM financial_logs WHERE workspace_id IS NOT NULL;
    SELECT COUNT(*) INTO expenses_count FROM expenses WHERE workspace_id IS NOT NULL;
    SELECT COUNT(*) INTO documents_count FROM documents WHERE workspace_id IS NOT NULL;
    
    RAISE NOTICE '✓ Workspace ID backfill complete for all tables:';
    RAISE NOTICE '  - Tasks: %', tasks_count;
    RAISE NOTICE '  - CRM Items: %', crm_count;
    RAISE NOTICE '  - Contacts: %', contacts_count;
    RAISE NOTICE '  - Meetings: %', meetings_count;
    RAISE NOTICE '  - Marketing Items: %', marketing_count;
    RAISE NOTICE '  - Financial Logs: %', financial_count;
    RAISE NOTICE '  - Expenses: %', expenses_count;
    RAISE NOTICE '  - Documents: %', documents_count;
END $$;

COMMENT ON TABLE tasks IS 'Tasks - workspace_id added and backfilled';
COMMENT ON TABLE crm_items IS 'CRM Items - workspace_id added and backfilled';
COMMENT ON TABLE contacts IS 'Contacts - workspace_id added and backfilled';
COMMENT ON TABLE meetings IS 'Meetings - workspace_id added and backfilled';
COMMENT ON TABLE marketing_items IS 'Marketing Items - workspace_id added and backfilled';
COMMENT ON TABLE financial_logs IS 'Financial Logs - workspace_id added and backfilled';
COMMENT ON TABLE expenses IS 'Expenses - workspace_id backfilled';
COMMENT ON TABLE documents IS 'Documents - workspace_id added and backfilled';


