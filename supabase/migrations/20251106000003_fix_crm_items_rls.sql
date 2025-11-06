-- Fix CRM items RLS policies to explicitly include workspace owners
-- This ensures owners can create CRM items without needing a workspace_members entry

-- Drop existing CRM items policies
DROP POLICY IF EXISTS "workspace_members_select_crm_items" ON crm_items;
DROP POLICY IF EXISTS "workspace_members_insert_crm_items" ON crm_items;
DROP POLICY IF EXISTS "workspace_members_update_crm_items" ON crm_items;
DROP POLICY IF EXISTS "workspace_members_delete_crm_items" ON crm_items;
DROP POLICY IF EXISTS "select_crm_items_owner" ON crm_items;
DROP POLICY IF EXISTS "select_crm_items_member" ON crm_items;
DROP POLICY IF EXISTS "insert_crm_items" ON crm_items;
DROP POLICY IF EXISTS "update_crm_items" ON crm_items;
DROP POLICY IF EXISTS "delete_crm_items" ON crm_items;

-- Create new policies that explicitly check workspace ownership

-- SELECT: Owners and members can view
CREATE POLICY "select_crm_items_owner"
ON crm_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = crm_items.workspace_id
        AND w.owner_id = auth.uid()
    )
);

CREATE POLICY "select_crm_items_member"
ON crm_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = crm_items.workspace_id
        AND wm.user_id = auth.uid()
    )
);

-- INSERT: Owners and members can create
CREATE POLICY "insert_crm_items_owner"
ON crm_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = workspace_id
        AND w.owner_id = auth.uid()
    )
);

CREATE POLICY "insert_crm_items_member"
ON crm_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = workspace_id
        AND wm.user_id = auth.uid()
    )
);

-- UPDATE: Owners and members can update
CREATE POLICY "update_crm_items_owner"
ON crm_items FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = crm_items.workspace_id
        AND w.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = crm_items.workspace_id
        AND w.owner_id = auth.uid()
    )
);

CREATE POLICY "update_crm_items_member"
ON crm_items FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = crm_items.workspace_id
        AND wm.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = crm_items.workspace_id
        AND wm.user_id = auth.uid()
    )
);

-- DELETE: Owners and members can delete
CREATE POLICY "delete_crm_items_owner"
ON crm_items FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = crm_items.workspace_id
        AND w.owner_id = auth.uid()
    )
);

CREATE POLICY "delete_crm_items_member"
ON crm_items FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = crm_items.workspace_id
        AND wm.user_id = auth.uid()
    )
);

-- Verify RLS is enabled
ALTER TABLE crm_items ENABLE ROW LEVEL SECURITY;

-- Add helpful comments
COMMENT ON POLICY "select_crm_items_owner" ON crm_items IS 'Workspace owners can view CRM items';
COMMENT ON POLICY "select_crm_items_member" ON crm_items IS 'Workspace members can view CRM items';
COMMENT ON POLICY "insert_crm_items_owner" ON crm_items IS 'Workspace owners can create CRM items';
COMMENT ON POLICY "insert_crm_items_member" ON crm_items IS 'Workspace members can create CRM items';
COMMENT ON POLICY "update_crm_items_owner" ON crm_items IS 'Workspace owners can update CRM items';
COMMENT ON POLICY "update_crm_items_member" ON crm_items IS 'Workspace members can update CRM items';
COMMENT ON POLICY "delete_crm_items_owner" ON crm_items IS 'Workspace owners can delete CRM items';
COMMENT ON POLICY "delete_crm_items_member" ON crm_items IS 'Workspace members can delete CRM items';
