-- Fix task deletion policies to allow workspace owners and assignees to delete tasks
-- This fixes the issue where owners couldn't delete tasks created by team members

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- Create new policy that allows:
-- 1. Users to delete their own tasks (user_id = auth.uid())
-- 2. Workspace owners to delete any task in their workspace
-- 3. Users to delete tasks assigned to them
CREATE POLICY "Users can delete workspace tasks" ON tasks FOR DELETE USING (
    -- User created the task
    auth.uid() = user_id
    OR
    -- User is assigned to the task
    auth.uid() = assigned_to
    OR
    -- User is the workspace owner
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = tasks.workspace_id
        AND w.owner_id = auth.uid()
    )
);

-- Also update the UPDATE policy to match the same logic
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;

CREATE POLICY "Users can update workspace tasks" ON tasks FOR UPDATE USING (
    -- User created the task
    auth.uid() = user_id
    OR
    -- User is assigned to the task
    auth.uid() = assigned_to
    OR
    -- User is the workspace owner
    EXISTS (
        SELECT 1 FROM workspaces w
        WHERE w.id = tasks.workspace_id
        AND w.owner_id = auth.uid()
    )
);

-- Update the SELECT policy to allow viewing tasks in the same workspace
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;

CREATE POLICY "Users can view workspace tasks" ON tasks FOR SELECT USING (
    -- User created the task
    auth.uid() = user_id
    OR
    -- User is assigned to the task
    auth.uid() = assigned_to
    OR
    -- User is a member of the workspace
    EXISTS (
        SELECT 1 FROM workspace_members wm
        WHERE wm.workspace_id = tasks.workspace_id
        AND wm.user_id = auth.uid()
    )
);

-- Add helpful comments
COMMENT ON POLICY "Users can delete workspace tasks" ON tasks IS 'Allows task creators, assignees, and workspace owners to delete tasks';
COMMENT ON POLICY "Users can update workspace tasks" ON tasks IS 'Allows task creators, assignees, and workspace owners to update tasks';
COMMENT ON POLICY "Users can view workspace tasks" ON tasks IS 'Allows workspace members to view all tasks, creators and assignees to view their tasks';
