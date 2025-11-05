-- Add task assignment feature
-- This migration adds the ability to assign tasks to specific team members

-- Add assigned_to column to tasks table (only if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE tasks 
    ADD COLUMN assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create index for performance when filtering by assignee (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_tasks_assigned_to'
  ) THEN
    CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN tasks.assigned_to IS 'The user this task is assigned to (can be null for unassigned tasks)';

