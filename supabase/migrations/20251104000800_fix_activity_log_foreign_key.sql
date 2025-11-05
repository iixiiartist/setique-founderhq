-- Fix activity_log foreign key to reference profiles instead of auth.users
-- This allows proper JOINs to get user names and avatars

-- Drop the old foreign key constraint
ALTER TABLE activity_log 
  DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;

-- Add new foreign key constraint referencing profiles
ALTER TABLE activity_log 
  ADD CONSTRAINT activity_log_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Add comment
COMMENT ON COLUMN activity_log.user_id IS 'References profiles table for user information';

