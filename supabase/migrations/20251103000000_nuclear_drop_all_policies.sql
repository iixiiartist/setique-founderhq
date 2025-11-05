-- Nuclear option: Drop ALL policies and recreate only the simple ones
-- This ensures no old policies from schema.sql are lingering

-- Drop ALL policies on workspaces
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workspaces' AND schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON workspaces', r.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on workspace_members
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'workspace_members' AND schemaname = 'public') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON workspace_members', r.policyname);
    END LOOP;
END $$;

-- Now create the ONLY two policies we need
CREATE POLICY "workspaces_select_owner_only" ON workspaces
    FOR SELECT
    USING (owner_id = auth.uid());

CREATE POLICY "workspace_members_select_policy" ON workspace_members
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR
        workspace_id IN (
            SELECT id 
            FROM workspaces 
            WHERE owner_id = auth.uid()
        )
    );

