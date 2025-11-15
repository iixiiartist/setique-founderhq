-- Check if subtasks column exists and add if missing
-- Run this in your Supabase SQL Editor

-- Check if the column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'tasks' 
        AND column_name = 'subtasks'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE tasks 
        ADD COLUMN subtasks JSONB DEFAULT '[]'::jsonb;
        
        -- Add comment
        COMMENT ON COLUMN tasks.subtasks IS 'Array of subtask objects with id, text, completed, createdAt, completedAt';
        
        -- Create GIN index for efficient querying
        CREATE INDEX idx_tasks_subtasks ON tasks USING GIN (subtasks);
        
        RAISE NOTICE 'Subtasks column added successfully!';
    ELSE
        RAISE NOTICE 'Subtasks column already exists!';
    END IF;
END $$;

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks' 
AND column_name = 'subtasks';
