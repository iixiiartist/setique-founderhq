-- Backfill profiles for any auth.users that don't have a profile yet
-- This handles cases where users were created before the trigger was set up

INSERT INTO public.profiles (id, email, created_at)
SELECT 
    au.id,
    au.email,
    au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

