-- Check if your email is confirmed
-- Run this in Supabase SQL Editor

SELECT 
    id,
    email,
    email_confirmed_at,
    confirmed_at,
    created_at,
    last_sign_in_at,
    CASE 
        WHEN email_confirmed_at IS NOT NULL OR confirmed_at IS NOT NULL 
        THEN '✅ EMAIL CONFIRMED' 
        ELSE '❌ EMAIL NOT CONFIRMED' 
    END as status
FROM auth.users
WHERE email = 'joe@setique.com';

-- If email is not confirmed, you can manually confirm it:
-- UPDATE auth.users 
-- SET email_confirmed_at = NOW(), confirmed_at = NOW() 
-- WHERE email = 'joe@setique.com';
