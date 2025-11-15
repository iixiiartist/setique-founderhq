-- Migration: Add subtasks support to tasks table
-- Date: 2024-11-15
-- Purpose: Add subtasks array for sophisticated nested task management

-- Add subtasks column as JSONB array
ALTER TABLE tasks 
ADD COLUMN subtasks JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN tasks.subtasks IS 'Array of subtask objects with id, text, completed, createdAt, completedAt';

-- Create index for querying subtasks
CREATE INDEX idx_tasks_subtasks ON tasks USING GIN (subtasks);
