-- Check workspace members
SELECT * FROM workspace_members WHERE workspace_id = '81a0cb25-8191-4f11-add8-6be68daf2994';

-- Check if business profile exists
SELECT id, workspace_id, company_name, industry, is_complete FROM business_profile WHERE workspace_id = '81a0cb25-8191-4f11-add8-6be68daf2994';
