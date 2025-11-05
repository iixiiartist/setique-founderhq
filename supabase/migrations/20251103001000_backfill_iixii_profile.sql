-- Backfill missing profile for iixiiartist user
-- This user was created but doesn't have a profile record

INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email) as full_name,
    au.created_at,
    NOW() as updated_at
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
AND au.id = 'd6591678-7d3d-46c3-8854-99410fa8786e'
ON CONFLICT (id) DO NOTHING;

