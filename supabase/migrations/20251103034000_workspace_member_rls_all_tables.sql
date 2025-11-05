-- Migration: Add workspace-scoped RLS policies for all content tables
-- Purpose: Allow workspace members (owners + invited members) to access shared content
-- Date: 2025-11-03

-- Helper function to check if user is workspace member (owner OR invited member)
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- Check if user is workspace owner
    SELECT 1 FROM workspaces
    WHERE id = workspace_uuid AND owner_id = auth.uid()
    UNION
    -- Check if user is invited member
    SELECT 1 FROM workspace_members
    WHERE workspace_id = workspace_uuid AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TASKS TABLE RLS POLICIES
-- ============================================================

-- Drop existing task policies if they exist
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Tasks: Workspace members can SELECT
CREATE POLICY "workspace_members_select_tasks"
ON tasks FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Tasks: Workspace members can INSERT
CREATE POLICY "workspace_members_insert_tasks"
ON tasks FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id));

-- Tasks: Workspace members can UPDATE
CREATE POLICY "workspace_members_update_tasks"
ON tasks FOR UPDATE TO authenticated
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

-- Tasks: Workspace members can DELETE
CREATE POLICY "workspace_members_delete_tasks"
ON tasks FOR DELETE TO authenticated
USING (is_workspace_member(workspace_id));

-- ============================================================
-- CRM ITEMS TABLE RLS POLICIES
-- ============================================================

-- Enable RLS on crm_items table
ALTER TABLE crm_items ENABLE ROW LEVEL SECURITY;

-- CRM Items: Workspace members can SELECT
CREATE POLICY "workspace_members_select_crm_items"
ON crm_items FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- CRM Items: Workspace members can INSERT
CREATE POLICY "workspace_members_insert_crm_items"
ON crm_items FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id));

-- CRM Items: Workspace members can UPDATE
CREATE POLICY "workspace_members_update_crm_items"
ON crm_items FOR UPDATE TO authenticated
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

-- CRM Items: Workspace members can DELETE
CREATE POLICY "workspace_members_delete_crm_items"
ON crm_items FOR DELETE TO authenticated
USING (is_workspace_member(workspace_id));

-- ============================================================
-- CONTACTS TABLE RLS POLICIES
-- ============================================================

-- Enable RLS on contacts table
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- Contacts: Workspace members can SELECT
CREATE POLICY "workspace_members_select_contacts"
ON contacts FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Contacts: Workspace members can INSERT
CREATE POLICY "workspace_members_insert_contacts"
ON contacts FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id));

-- Contacts: Workspace members can UPDATE
CREATE POLICY "workspace_members_update_contacts"
ON contacts FOR UPDATE TO authenticated
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

-- Contacts: Workspace members can DELETE
CREATE POLICY "workspace_members_delete_contacts"
ON contacts FOR DELETE TO authenticated
USING (is_workspace_member(workspace_id));

-- ============================================================
-- MEETINGS TABLE RLS POLICIES
-- ============================================================

-- Enable RLS on meetings table
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Meetings: Workspace members can SELECT
CREATE POLICY "workspace_members_select_meetings"
ON meetings FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Meetings: Workspace members can INSERT
CREATE POLICY "workspace_members_insert_meetings"
ON meetings FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id));

-- Meetings: Workspace members can UPDATE
CREATE POLICY "workspace_members_update_meetings"
ON meetings FOR UPDATE TO authenticated
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

-- Meetings: Workspace members can DELETE
CREATE POLICY "workspace_members_delete_meetings"
ON meetings FOR DELETE TO authenticated
USING (is_workspace_member(workspace_id));

-- ============================================================
-- MARKETING ITEMS TABLE RLS POLICIES
-- ============================================================

-- Enable RLS on marketing_items table
ALTER TABLE marketing_items ENABLE ROW LEVEL SECURITY;

-- Marketing Items: Workspace members can SELECT
CREATE POLICY "workspace_members_select_marketing_items"
ON marketing_items FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Marketing Items: Workspace members can INSERT
CREATE POLICY "workspace_members_insert_marketing_items"
ON marketing_items FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id));

-- Marketing Items: Workspace members can UPDATE
CREATE POLICY "workspace_members_update_marketing_items"
ON marketing_items FOR UPDATE TO authenticated
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

-- Marketing Items: Workspace members can DELETE
CREATE POLICY "workspace_members_delete_marketing_items"
ON marketing_items FOR DELETE TO authenticated
USING (is_workspace_member(workspace_id));

-- ============================================================
-- FINANCIAL LOGS TABLE RLS POLICIES
-- ============================================================

-- Enable RLS on financial_logs table
ALTER TABLE financial_logs ENABLE ROW LEVEL SECURITY;

-- Financial Logs: Workspace members can SELECT
CREATE POLICY "workspace_members_select_financial_logs"
ON financial_logs FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Financial Logs: Workspace members can INSERT
CREATE POLICY "workspace_members_insert_financial_logs"
ON financial_logs FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id));

-- Financial Logs: Workspace members can UPDATE
CREATE POLICY "workspace_members_update_financial_logs"
ON financial_logs FOR UPDATE TO authenticated
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

-- Financial Logs: Workspace members can DELETE
CREATE POLICY "workspace_members_delete_financial_logs"
ON financial_logs FOR DELETE TO authenticated
USING (is_workspace_member(workspace_id));

-- ============================================================
-- DOCUMENTS TABLE RLS POLICIES
-- ============================================================

-- Enable RLS on documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Documents: Workspace members can SELECT
CREATE POLICY "workspace_members_select_documents"
ON documents FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Documents: Workspace members can INSERT
CREATE POLICY "workspace_members_insert_documents"
ON documents FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id));

-- Documents: Workspace members can UPDATE
CREATE POLICY "workspace_members_update_documents"
ON documents FOR UPDATE TO authenticated
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

-- Documents: Workspace members can DELETE
CREATE POLICY "workspace_members_delete_documents"
ON documents FOR DELETE TO authenticated
USING (is_workspace_member(workspace_id));

-- ============================================================
-- EXPENSES TABLE RLS POLICIES
-- ============================================================

-- Enable RLS on expenses table
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Expenses: Workspace members can SELECT
CREATE POLICY "workspace_members_select_expenses"
ON expenses FOR SELECT TO authenticated
USING (is_workspace_member(workspace_id));

-- Expenses: Workspace members can INSERT
CREATE POLICY "workspace_members_insert_expenses"
ON expenses FOR INSERT TO authenticated
WITH CHECK (is_workspace_member(workspace_id));

-- Expenses: Workspace members can UPDATE
CREATE POLICY "workspace_members_update_expenses"
ON expenses FOR UPDATE TO authenticated
USING (is_workspace_member(workspace_id))
WITH CHECK (is_workspace_member(workspace_id));

-- Expenses: Workspace members can DELETE
CREATE POLICY "workspace_members_delete_expenses"
ON expenses FOR DELETE TO authenticated
USING (is_workspace_member(workspace_id));

-- ============================================================
-- VERIFICATION
-- ============================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✓ Workspace-scoped RLS policies applied to all content tables:';
  RAISE NOTICE '  - tasks';
  RAISE NOTICE '  - crm_items';
  RAISE NOTICE '  - contacts';
  RAISE NOTICE '  - meetings';
  RAISE NOTICE '  - marketing_items';
  RAISE NOTICE '  - financial_logs';
  RAISE NOTICE '  - documents';
  RAISE NOTICE '  - expenses';
  RAISE NOTICE '';
  RAISE NOTICE 'All workspace members (owners + invited) can now:';
  RAISE NOTICE '  - SELECT (view) shared content';
  RAISE NOTICE '  - INSERT (create) new content';
  RAISE NOTICE '  - UPDATE (modify) existing content';
  RAISE NOTICE '  - DELETE (remove) content';
END $$;

