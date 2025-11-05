-- Add admin functionality to bypass all plan limits
-- Migration: Add is_admin flag to profiles table

-- Add is_admin column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN profiles.is_admin IS 'Admin users bypass all plan limits and restrictions';

-- Set your user as admin (replace with your actual user ID)
-- You can find your user ID from the console logs: f8722baa-9f38-44bf-81ef-ec167dc135c3
UPDATE profiles 
SET is_admin = TRUE 
WHERE id = 'f8722baa-9f38-44bf-81ef-ec167dc135c3';

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_user_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    admin_status BOOLEAN;
BEGIN
    SELECT is_admin INTO admin_status
    FROM profiles
    WHERE id = user_id;
    
    RETURN COALESCE(admin_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the function
GRANT EXECUTE ON FUNCTION is_user_admin(UUID) TO authenticated;

COMMENT ON FUNCTION is_user_admin IS 'Check if a user has admin privileges';

