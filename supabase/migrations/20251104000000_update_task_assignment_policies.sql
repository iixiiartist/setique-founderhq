-- Update RLS policies to allow assigned users to manage tasks
-- This allows both task creators AND assigned users to view/update/delete tasks

-- Drop existing task policies
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

-- Recreate policies to include assigned users
CREATE POLICY "Users can view own or assigned tasks" ON tasks 
  FOR SELECT 
  USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can update own or assigned tasks" ON tasks 
  FOR UPDATE 
  USING (auth.uid() = user_id OR auth.uid() = assigned_to);

CREATE POLICY "Users can delete own or assigned tasks" ON tasks 
  FOR DELETE 
  USING (auth.uid() = user_id OR auth.uid() = assigned_to);

-- Note: INSERT policy remains unchanged - only creators can create tasks
-- (they can assign to others during creation)

