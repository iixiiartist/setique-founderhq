-- Test the get_user_workspaces function
-- Run this in Supabase SQL Editor to see if it works

-- First check if function exists
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname = 'get_user_workspaces';

-- Test the function with a specific user ID
-- Replace with your actual user ID
SELECT * FROM get_user_workspaces('f8722baa-9f38-44bf-81ef-ec167dc135c3'::uuid);

-- Check if workspaces exist
SELECT * FROM workspaces WHERE owner_id = 'f8722baa-9f38-44bf-81ef-ec167dc135c3'::uuid;

-- Check workspace members
SELECT * FROM workspace_members WHERE user_id = 'f8722baa-9f38-44bf-81ef-ec167dc135c3'::uuid;
