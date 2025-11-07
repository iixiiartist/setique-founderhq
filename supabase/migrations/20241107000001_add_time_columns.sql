-- Migration: Add time columns to tasks and marketing_items
-- Created: 2024-11-07
-- Description: Adds due_time column to tasks and marketing_items tables,
--              and next_action_time to crm_items table for better scheduling

-- Add due_time to tasks
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS due_time TEXT;

COMMENT ON COLUMN tasks.due_time IS 'Time in HH:MM format (24-hour) for task due date';

-- Add due_time to marketing_items
ALTER TABLE marketing_items 
ADD COLUMN IF NOT EXISTS due_time TEXT;

COMMENT ON COLUMN marketing_items.due_time IS 'Time in HH:MM format (24-hour) for marketing item due date';

-- Add next_action_time to crm_items
ALTER TABLE crm_items
ADD COLUMN IF NOT EXISTS next_action_time TEXT;

COMMENT ON COLUMN crm_items.next_action_time IS 'Time in HH:MM format (24-hour) for next action';

-- Verify columns were added
SELECT 
    table_name, 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('tasks', 'marketing_items', 'crm_items')
AND column_name IN ('due_time', 'next_action_time')
ORDER BY table_name, column_name;
