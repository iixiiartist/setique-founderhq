-- Check if joe@setique.com is set as admin
SELECT 
    id,
    email,
    is_admin,
    created_at
FROM profiles
WHERE email = 'joe@setique.com';

-- If not admin, set it now
UPDATE profiles 
SET is_admin = true 
WHERE email = 'joe@setique.com'
RETURNING id, email, is_admin;
