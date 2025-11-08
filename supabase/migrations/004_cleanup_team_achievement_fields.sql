-- Migration: Cleanup Team Achievement Fields from Profiles
-- Date: 2025-11-08
-- Description: Removes duplicate team achievement tracking fields from profiles.gamification JSONB
--              Establishes workspace_achievements table + workspaces.team_xp/team_level as single source of truth

-- Step 1: Update default value for new profiles (remove team fields)
ALTER TABLE profiles 
ALTER COLUMN gamification 
SET DEFAULT '{"streak": 0, "lastActivityDate": null, "xp": 0, "level": 1, "achievements": []}'::jsonb;

-- Step 2: Remove team achievement fields from existing profiles
-- This preserves solo gamification data while removing unused team fields
UPDATE profiles 
SET gamification = gamification - 'teamAchievements' - 'teamXp' - 'teamLevel'
WHERE gamification ? 'teamAchievements' 
   OR gamification ? 'teamXp' 
   OR gamification ? 'teamLevel';

-- Step 3: Verify workspaces table has team_xp and team_level columns
-- These were added in migration 003_add_team_achievements_schema.sql
-- Just ensure they have proper defaults if NULL
UPDATE workspaces 
SET team_xp = 0 
WHERE team_xp IS NULL;

UPDATE workspaces 
SET team_level = 1 
WHERE team_level IS NULL;

-- Step 4: Add NOT NULL constraints for future records
ALTER TABLE workspaces 
ALTER COLUMN team_xp SET DEFAULT 0,
ALTER COLUMN team_xp SET NOT NULL;

ALTER TABLE workspaces 
ALTER COLUMN team_level SET DEFAULT 1,
ALTER COLUMN team_level SET NOT NULL;

-- Add helpful comments
COMMENT ON COLUMN profiles.gamification IS 'Solo player gamification data: XP, level, streak, achievements (JSONB). Team achievements tracked separately in workspace_achievements table.';
COMMENT ON COLUMN workspaces.team_xp IS 'Total team experience points from unlocked workspace achievements';
COMMENT ON COLUMN workspaces.team_level IS 'Team level calculated from team_xp using fixed thresholds';

-- Verification query (can be run manually to confirm cleanup)
-- SELECT 
--   id,
--   email,
--   gamification
-- FROM profiles
-- WHERE gamification ? 'teamAchievements' OR gamification ? 'teamXp' OR gamification ? 'teamLevel'
-- LIMIT 10;
-- Expected result: 0 rows

-- Verification for workspaces
-- SELECT id, company_name, team_xp, team_level
-- FROM workspaces
-- WHERE team_xp IS NULL OR team_level IS NULL;
-- Expected result: 0 rows
