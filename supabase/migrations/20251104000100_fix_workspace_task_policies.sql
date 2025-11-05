-- Fix task RLS policies for workspace collaboration
-- Allow workspace members to see all workspace tasks, and edit assigned/owned tasks

-- Drop existing task policies
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can view own or assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own or assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own or assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert own tasks" ON tasks;

-- View: Workspace members can see ALL workspace tasks
CREATE POLICY "Workspace members can view all workspace tasks" ON tasks 
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Update: Can update tasks you created OR are assigned to (within your workspace)
CREATE POLICY "Users can update own or assigned tasks" ON tasks 
  FOR UPDATE 
  USING (
    (auth.uid() = user_id OR auth.uid() = assigned_to)
    AND workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Delete: Can delete tasks you created OR are assigned to (within your workspace)
CREATE POLICY "Users can delete own or assigned tasks" ON tasks 
  FOR DELETE 
  USING (
    (auth.uid() = user_id OR auth.uid() = assigned_to)
    AND workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Insert: Can create tasks in your workspace
CREATE POLICY "Users can insert tasks in their workspace" ON tasks 
  FOR INSERT 
  WITH CHECK (
    auth.uid() = user_id
    AND workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

