-- Verify the current trigger function is correct
SELECT 
    'Current Trigger Function' as info,
    prosrc as function_body
FROM pg_proc
WHERE proname = 'handle_new_user';

-- Check II XII user metadata
SELECT 
    'II XII User Metadata' as info,
    email,
    raw_user_meta_data->>'invited_to_workspace' as invited_to_workspace,
    raw_user_meta_data->>'name' as name,
    created_at
FROM auth.users
WHERE email = 'iixiiartist@gmail.com';
