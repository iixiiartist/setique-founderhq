-- Add time columns to support time-based scheduling
-- Run this in your Supabase SQL Editor

-- Add due_time column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS due_time TEXT;

COMMENT ON COLUMN tasks.due_time IS 'Time in HH:MM format (24-hour) for task due date';

-- Add next_action_time column to crm_items table
ALTER TABLE crm_items 
ADD COLUMN IF NOT EXISTS next_action_time TEXT;

COMMENT ON COLUMN crm_items.next_action_time IS 'Time in HH:MM format (24-hour) for next action';

-- Add due_time column to marketing_items table
ALTER TABLE marketing_items 
ADD COLUMN IF NOT EXISTS due_time TEXT;

COMMENT ON COLUMN marketing_items.due_time IS 'Time in HH:MM format (24-hour) for marketing item due date';

-- COMMENT ON COLUMN marketing_items.due_time IS 'Time in HH:MM format (24-hour) for marketing item due date';

-- Verify the changes
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable
FROM 
    information_schema.columns
WHERE 
    table_name IN ('tasks', 'crm_items', 'marketing_items')
    AND column_name IN ('due_time', 'next_action_time')
ORDER BY 
    table_name, 
    column_name;
