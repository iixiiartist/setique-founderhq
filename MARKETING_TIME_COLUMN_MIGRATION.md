# Marketing Time Column Migration

## Issue
Marketing items can't be updated because the `due_time` column doesn't exist in the `marketing_items` table.

## Error
```
Could not find the 'due_time' column of 'marketing_items' in the schema cache
```

## Solution
Run the SQL migration to add the `due_time` column to the `marketing_items` table.

## Instructions

### Option 1: Run Specific Migration (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `add_marketing_time_column.sql`
4. Click **Run**

### Option 2: Run Complete Migration
If you haven't run the time columns migration yet:
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `add_time_columns.sql`
4. Click **Run**

This will add:
- `due_time` to `tasks` table
- `next_action_time` to `crm_items` table  
- `due_time` to `marketing_items` table

## Verification
After running the migration, you should be able to:
- ✅ Edit marketing items and save changes
- ✅ Set due dates and times for marketing content
- ✅ See marketing items on the calendar with correct times

## What This Enables
- Marketing campaigns can have specific due dates AND times
- Calendar displays marketing items at the correct time of day
- Updates to marketing items preserve both date and time information
