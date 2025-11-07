-- Add due_time column to marketing_items table
-- Run this in your Supabase SQL Editor

ALTER TABLE marketing_items 
ADD COLUMN IF NOT EXISTS due_time TEXT;

COMMENT ON COLUMN marketing_items.due_time IS 'Time in HH:MM format (24-hour) for marketing item due date';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'marketing_items' 
AND column_name = 'due_time';
