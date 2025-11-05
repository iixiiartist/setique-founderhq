-- Test if the function exists and check its definition
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_workspace_members_with_profiles';

-- Try to call the function (replace with your workspace ID)
-- SELECT * FROM get_workspace_members_with_profiles('81a0cb25-8191-4f11-add8-6be68daf2994');
