-- Fix UPDATE policy to include WITH CHECK clause
-- This ensures assigned users can update tasks

-- Drop and recreate the UPDATE policy with both USING and WITH CHECK
DROP POLICY IF EXISTS "Users can update own or assigned tasks" ON tasks;

CREATE POLICY "Users can update own or assigned tasks" ON tasks 
  FOR UPDATE 
  USING (
    (auth.uid() = user_id OR auth.uid() = assigned_to)
    AND workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    (auth.uid() = user_id OR auth.uid() = assigned_to)
    AND workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

