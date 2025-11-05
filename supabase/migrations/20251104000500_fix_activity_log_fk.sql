-- Fix activity_log foreign key to reference profiles instead of auth.users
-- This allows Supabase PostgREST to automatically resolve the join

-- First, drop the existing foreign key constraint
ALTER TABLE activity_log DROP CONSTRAINT IF EXISTS activity_log_user_id_fkey;

-- Add foreign key to profiles table (which itself references auth.users)
ALTER TABLE activity_log 
  ADD CONSTRAINT activity_log_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE;

-- Add comment
COMMENT ON CONSTRAINT activity_log_user_id_fkey ON activity_log IS 'Foreign key to profiles table for user information';

