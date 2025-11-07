-- Check task dates to see why they're not showing on calendar
SELECT 
    id,
    text,
    category,
    due_date,
    due_time,
    created_at
FROM tasks
WHERE workspace_id = '06ce0397-0587-4f25-abbd-7aefd4072bb3'
ORDER BY created_at DESC
LIMIT 10;
