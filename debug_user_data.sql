-- Debug II XII user data
SELECT 
    'Auth User Data' as source,
    u.id,
    u.email,
    u.raw_user_meta_data->>'name' as metadata_name,
    u.raw_user_meta_data->>'invited_to_workspace' as invited_to_workspace,
    u.raw_user_meta_data as full_metadata,
    u.created_at
FROM auth.users u
WHERE u.email = 'iixiiartist@gmail.com'

UNION ALL

SELECT 
    'Profile Data' as source,
    p.id,
    p.email,
    p.full_name as metadata_name,
    NULL as invited_to_workspace,
    NULL as full_metadata,
    p.created_at
FROM profiles p
WHERE p.email = 'iixiiartist@gmail.com';

-- Also check what workspace they're in
SELECT 
    'Workspace Membership' as info,
    wm.workspace_id,
    w.name as workspace_name,
    w.owner_id,
    wm.role
FROM workspace_members wm
JOIN workspaces w ON w.id = wm.workspace_id
WHERE wm.user_id IN (SELECT id FROM auth.users WHERE email = 'iixiiartist@gmail.com');
