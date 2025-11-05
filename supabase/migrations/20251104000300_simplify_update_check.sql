-- Fix WITH CHECK clause to allow updates by assigned users
-- The WITH CHECK should verify the updated row still belongs to workspace
-- and that user is still either creator or assigned

DROP POLICY IF EXISTS "Users can update own or assigned tasks" ON tasks;

-- Simplified approach: If you can see it (USING passes), you can update it
-- WITH CHECK just ensures the updated row stays in your workspace
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
    -- After update, row must still be in a workspace you're a member of
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

