# Add Time Columns Migration Guide

## Problem
The application is trying to save `due_time` and `next_action_time` fields but they don't exist in the database yet.

**Error:** `Could not find the 'due_time' column of 'tasks' in the schema cache`

## Solution

### Step 1: Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query**

### Step 2: Run the Migration
1. Copy the contents of `add_time_columns.sql`
2. Paste into the SQL Editor
3. Click **Run** or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

### Step 3: Verify the Changes
The script includes a verification query that will show you the new columns:
- `tasks.due_time` (TEXT, nullable)
- `crm_items.next_action_time` (TEXT, nullable)

You should see output like:
```
table_name    | column_name        | data_type | is_nullable
--------------+--------------------+-----------+-------------
crm_items     | next_action_time   | text      | YES
tasks         | due_time           | text      | YES
```

### Step 4: Refresh Your App
After running the migration:
1. Hard refresh your browser (`Ctrl+Shift+R` or `Cmd+Shift+R`)
2. Try creating a task with a time again
3. The error should be resolved!

## What This Migration Does

### Adds to `tasks` table:
- **due_time**: TEXT column to store time in HH:MM format (e.g., "14:30" for 2:30 PM)
- Nullable (optional) - tasks without specific times will have NULL

### Adds to `crm_items` table:
- **next_action_time**: TEXT column to store time in HH:MM format
- Nullable (optional) - CRM actions without specific times will have NULL

### Marketing Items
If you have a `marketing_items` table, uncomment those lines in the SQL script.

## Important Notes

1. **Data Type**: We use TEXT instead of TIME because:
   - Easier to work with in JavaScript (no timezone conversions)
   - Stores simple HH:MM format
   - Matches how the app handles time fields

2. **Nullable**: All time fields are optional (NULL allowed):
   - Backward compatible with existing records
   - Tasks/actions can exist without specific times
   - Only filled in when user explicitly sets a time

3. **Format**: Time is stored in 24-hour format (HH:MM):
   - "09:00" = 9:00 AM
   - "14:30" = 2:30 PM
   - "23:45" = 11:45 PM
   - The UI converts to 12-hour format for display

## Troubleshooting

### If you still see errors after migration:
1. Check that the columns were actually created:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'tasks' AND column_name = 'due_time';
   ```

2. Clear Supabase's schema cache (automatic after migration, but if needed):
   - Wait 1-2 minutes for PostgREST to refresh
   - Or restart your Supabase project (Project Settings → General → Restart project)

3. Verify your RLS policies don't block the new columns:
   ```sql
   -- Check RLS policies on tasks table
   SELECT * FROM pg_policies WHERE tablename = 'tasks';
   ```

### If columns already exist:
The script uses `IF NOT EXISTS` so it's safe to run multiple times without errors.

## Next Steps

After the migration is complete, you can:
- ✅ Create tasks with specific times
- ✅ Add next action times to CRM items
- ✅ Schedule events on the calendar
- ✅ View events in the hourly timeline

All time-based features will now work correctly!
