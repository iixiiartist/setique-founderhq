-- Add invited_by column to workspace_members table
-- Run this in Supabase Dashboard → SQL Editor

-- Add the invited_by column if it doesn't exist
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'workspace_members' AND column_name = 'invited_by'
  ) THEN
    ALTER TABLE workspace_members ADD COLUMN invited_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

SELECT 'workspace_members table updated! invited_by column added.' as status;
