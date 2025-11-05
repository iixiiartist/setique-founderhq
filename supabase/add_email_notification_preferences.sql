-- ============================================================================
-- ADD EMAIL NOTIFICATION PREFERENCES
-- ============================================================================
-- Add email notification opt-in/opt-out to profiles
-- ============================================================================

-- Add email_notifications column (default true for new users)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

-- Set existing users to opt-in by default
UPDATE profiles 
SET email_notifications = true 
WHERE email_notifications IS NULL;

-- Verify the column was added
SELECT 
  id,
  email,
  full_name,
  email_notifications
FROM profiles
LIMIT 5;
