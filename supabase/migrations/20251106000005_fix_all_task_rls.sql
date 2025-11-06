-- Fix RLS policies for all content tables to work for workspace owners
-- Workspace owners don't always have explicit workspace_members entries
-- This replaces the workspace_members-only checks with explicit owner + member policies

-- ============================================================
-- TASKS TABLE
-- ============================================================

-- Drop ALL existing task policies (from various migrations)
DROP POLICY IF EXISTS "Workspace members can view all workspace tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own or assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own or assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks in their workspace" ON tasks;
DROP POLICY IF EXISTS "workspace_members_select_tasks" ON tasks;
DROP POLICY IF EXISTS "workspace_members_insert_tasks" ON tasks;
DROP POLICY IF EXISTS "workspace_members_update_tasks" ON tasks;
DROP POLICY IF EXISTS "workspace_members_delete_tasks" ON tasks;
DROP POLICY IF EXISTS "select_tasks_owner" ON tasks;
DROP POLICY IF EXISTS "select_tasks_member" ON tasks;
DROP POLICY IF EXISTS "insert_tasks_owner" ON tasks;
DROP POLICY IF EXISTS "insert_tasks_member" ON tasks;
DROP POLICY IF EXISTS "update_tasks_owner" ON tasks;
DROP POLICY IF EXISTS "update_tasks_member" ON tasks;
DROP POLICY IF EXISTS "delete_tasks_owner" ON tasks;
DROP POLICY IF EXISTS "delete_tasks_member" ON tasks;

-- SELECT: Owners and members can view
CREATE POLICY "select_tasks_owner"
ON tasks FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = tasks.workspace_id
        AND w.owner_id = auth.uid()
    )
);

CREATE POLICY "select_tasks_member"
ON tasks FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = tasks.workspace_id
        AND wm.user_id = auth.uid()
    )
);

-- INSERT: Owners and members can create
CREATE POLICY "insert_tasks_owner"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_id
        AND w.owner_id = auth.uid()
    )
);

CREATE POLICY "insert_tasks_member"
ON tasks FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_id
        AND wm.user_id = auth.uid()
    )
);

-- UPDATE: Owners can update all, members can update own/assigned
CREATE POLICY "update_tasks_owner"
ON tasks FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = tasks.workspace_id
        AND w.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = tasks.workspace_id
        AND w.owner_id = auth.uid()
    )
);

CREATE POLICY "update_tasks_member"
ON tasks FOR UPDATE
TO authenticated
USING (
    (auth.uid() = tasks.user_id OR auth.uid() = tasks.assigned_to)
    AND EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = tasks.workspace_id
        AND wm.user_id = auth.uid()
    )
)
WITH CHECK (
    (auth.uid() = tasks.user_id OR auth.uid() = tasks.assigned_to)
    AND EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = tasks.workspace_id
        AND wm.user_id = auth.uid()
    )
);

-- DELETE: Owners can delete all, members can delete own/assigned
CREATE POLICY "delete_tasks_owner"
ON tasks FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = tasks.workspace_id
        AND w.owner_id = auth.uid()
    )
);

CREATE POLICY "delete_tasks_member"
ON tasks FOR DELETE
TO authenticated
USING (
    (auth.uid() = tasks.user_id OR auth.uid() = tasks.assigned_to)
    AND EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = tasks.workspace_id
        AND wm.user_id = auth.uid()
    )
);

-- Verify RLS is enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CONTACTS, MEETINGS, MARKETING_ITEMS, FINANCIAL_LOGS, DOCUMENTS, EXPENSES
-- These already have is_workspace_member() which checks owners, but let's be explicit
-- ============================================================

-- Note: The is_workspace_member() function already handles both owners and members:
-- CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID)
-- RETURNS BOOLEAN AS $$
-- BEGIN
--   RETURN EXISTS (
--     SELECT 1 FROM workspaces WHERE id = workspace_uuid AND owner_id = auth.uid()
--     UNION
--     SELECT 1 FROM workspace_members WHERE workspace_id = workspace_uuid AND user_id = auth.uid()
--   );
-- END;
-- $$ LANGUAGE plpgsql SECURITY DEFINER;

-- The existing policies using is_workspace_member() should work fine:
-- - workspace_members_select_contacts
-- - workspace_members_insert_contacts
-- - workspace_members_update_contacts
-- - workspace_members_delete_contacts
-- (same for meetings, marketing_items, financial_logs, documents, expenses)

-- Add helpful comments
COMMENT ON POLICY "select_tasks_owner" ON tasks IS 'Workspace owners can view all tasks';
COMMENT ON POLICY "select_tasks_member" ON tasks IS 'Workspace members can view all tasks';
COMMENT ON POLICY "insert_tasks_owner" ON tasks IS 'Workspace owners can create tasks';
COMMENT ON POLICY "insert_tasks_member" ON tasks IS 'Workspace members can create tasks';
COMMENT ON POLICY "update_tasks_owner" ON tasks IS 'Workspace owners can update all tasks';
COMMENT ON POLICY "update_tasks_member" ON tasks IS 'Workspace members can update own/assigned tasks';
COMMENT ON POLICY "delete_tasks_owner" ON tasks IS 'Workspace owners can delete all tasks';
COMMENT ON POLICY "delete_tasks_member" ON tasks IS 'Workspace members can delete own/assigned tasks';
