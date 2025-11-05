-- Update existing user profiles to populate missing names
-- This fixes users who were created before the trigger update
-- Run this in Supabase Dashboard → SQL Editor

-- Update iixiiartist user with a default name
UPDATE profiles
SET 
    full_name = COALESCE(full_name, email),
    updated_at = NOW()
WHERE id = '3a191135-bf21-4e74-a0c1-851feb74c091'
AND (full_name IS NULL OR full_name = '');

-- Also update any other users with missing names
UPDATE profiles
SET 
    full_name = email,
    updated_at = NOW()
WHERE full_name IS NULL OR full_name = '';

-- Verify the updates
SELECT 
    id,
    email,
    full_name,
    CASE 
        WHEN full_name IS NOT NULL AND full_name != '' THEN '✓ Has Name'
        ELSE '✗ Missing Name'
    END as name_status
FROM profiles
ORDER BY created_at DESC;

SELECT 'User profiles updated with default names!' as status;
