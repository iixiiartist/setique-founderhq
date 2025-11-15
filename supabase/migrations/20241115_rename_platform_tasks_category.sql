-- Migration: Rename platform tasks category to products_services_tasks
-- Date: 2024-11-15
-- Purpose: Update existing task categories after Tab.Platform → Tab.ProductsServices rebranding

-- Update all tasks with platformTasks category to productsServicesTasks
UPDATE tasks 
SET category = 'productsServicesTasks' 
WHERE category = 'platformTasks';

-- Verify the migration (optional - comment out if not needed)
-- SELECT 
--   COUNT(*) as updated_count,
--   category
-- FROM tasks
-- WHERE category = 'productsServicesTasks'
-- GROUP BY category;
