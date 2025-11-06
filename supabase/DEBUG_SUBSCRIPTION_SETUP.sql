-- Step 1: Check if subscriptions table exists
SELECT EXISTS (
    SELECT FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'subscriptions'
) as subscriptions_table_exists;

-- Step 2: If table exists, check your workspace
SELECT 
    id,
    name,
    owner_id,
    created_at
FROM workspaces
WHERE owner_id = auth.uid();

-- Step 3: Check if workspace owner matches auth user
SELECT 
    auth.uid() as current_user_id,
    (SELECT id FROM workspaces WHERE owner_id = auth.uid() LIMIT 1) as workspace_id;
