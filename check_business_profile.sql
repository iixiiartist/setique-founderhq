-- Check if Joe's workspace has a business profile
SELECT 
    w.id as workspace_id,
    w.name as workspace_name,
    w.owner_id,
    bp.id as business_profile_id,
    bp.company_name,
    bp.created_at as profile_created
FROM workspaces w
LEFT JOIN business_profile bp ON bp.workspace_id = w.id
WHERE w.id = '81a0cb25-8191-4f11-add8-6be68daf2994';

-- Also check the workspace name
SELECT id, name, owner_id, created_at 
FROM workspaces 
WHERE owner_id = 'f61f58d6-7ffa-4f05-902c-af4e4edc646e';
