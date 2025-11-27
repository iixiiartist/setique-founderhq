-- Platform Tasks Migration Verification Script
-- Run this BEFORE the migration to see current state

-- Check current task count by category
SELECT 
  category,
  COUNT(*) as task_count
FROM tasks
WHERE category IN ('platformTasks', 'productsServicesTasks')
GROUP BY category
ORDER BY category;

-- Show sample tasks that will be affected
SELECT 
  id,
  text,
  category,
  created_at
FROM tasks
WHERE category = 'platformTasks'
ORDER BY created_at DESC
LIMIT 5;
