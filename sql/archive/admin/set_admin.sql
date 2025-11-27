-- Make yourself an admin
-- Run this in Supabase SQL Editor to grant admin access to your account

-- Replace 'your@email.com' with your actual email
UPDATE profiles 
SET is_admin = true 
WHERE email = 'joe@setique.com';

-- Verify admin status
SELECT 
    id,
    email,
    full_name,
    is_admin,
    created_at
FROM profiles 
WHERE email = 'joe@setique.com';

-- To remove admin access later:
-- UPDATE profiles SET is_admin = false WHERE email = 'your@email.com';
