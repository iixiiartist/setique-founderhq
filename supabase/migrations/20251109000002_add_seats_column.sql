-- Migration: Add seats column to workspaces table
-- Created: 2025-11-09
-- Purpose: Support team plan seat limits

-- Add seats column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'workspaces' 
        AND column_name = 'seats'
    ) THEN
        ALTER TABLE workspaces ADD COLUMN seats INTEGER;
        
        -- Set default seats based on existing plan_type
        UPDATE workspaces SET seats = 1 WHERE plan_type = 'power-individual';
        UPDATE workspaces SET seats = 5 WHERE plan_type IN ('team-starter', 'team-pro');
        -- Free plans have NULL seats (unlimited for single user)
        
        RAISE NOTICE 'Added seats column to workspaces table';
    ELSE
        RAISE NOTICE 'Seats column already exists';
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN workspaces.seats IS 'Number of team member seats for paid plans. NULL for free plans.';
