-- Check all tasks for Joe's user ID
SELECT id, title, workspace_id, user_id, created_at, category, priority 
FROM tasks 
WHERE user_id = 'f61f58d6-7ffa-4f05-902c-af4e4edc646e'
ORDER BY created_at DESC
LIMIT 20;

-- Check if any tasks exist without workspace_id
SELECT COUNT(*) as tasks_without_workspace
FROM tasks 
WHERE user_id = 'f61f58d6-7ffa-4f05-902c-af4e4edc646e' 
AND workspace_id IS NULL;

-- Check if any tasks have the workspace_id populated
SELECT COUNT(*) as tasks_with_workspace
FROM tasks 
WHERE user_id = 'f61f58d6-7ffa-4f05-902c-af4e4edc646e' 
AND workspace_id IS NOT NULL;
