-- Add assignment fields to marketing_items table
-- This enables team collaboration on marketing campaigns
ALTER TABLE marketing_items 
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS assigned_to_name TEXT;

-- Create index for efficient filtering by assignee
CREATE INDEX IF NOT EXISTS idx_marketing_assigned ON marketing_items(assigned_to);

-- Add comment for documentation
COMMENT ON COLUMN marketing_items.assigned_to IS 'User ID of the team member assigned to this marketing campaign';
COMMENT ON COLUMN marketing_items.assigned_to_name IS 'Display name of the assigned user (denormalized for performance)';
