# Marketing Items RLS Policy Fix

## Issue
Creating marketing campaigns fails with error:
```
new row violates row-level security policy for table "marketing_items"
```

## Root Cause
The `marketing_items` table has Row-Level Security (RLS) enabled but the policies are either:
1. Missing
2. Incorrectly configured
3. Not checking workspace membership properly

## Solution
Run the `fix_marketing_rls.sql` script to create proper RLS policies.

## Instructions

1. **Go to Supabase Dashboard**
   - Navigate to your project at https://supabase.com/dashboard

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar

3. **Run the Fix**
   - Copy the contents of `fix_marketing_rls.sql`
   - Paste into the SQL Editor
   - Click **Run**

4. **Verify**
   - The script will show you the created policies at the end
   - Try creating a marketing campaign in the app

## What This Does

Creates 4 RLS policies for `marketing_items`:
- ✅ **SELECT** - Users can view marketing items in their workspace
- ✅ **INSERT** - Users can create marketing items in their workspace  
- ✅ **UPDATE** - Users can edit marketing items in their workspace
- ✅ **DELETE** - Users can delete marketing items in their workspace

All policies check that the user is a member of the workspace (via `workspace_members` table).

## After Running

Marketing campaigns should:
- ✅ Create successfully
- ✅ Appear in the list immediately
- ✅ Be editable and deletable
- ✅ Show up on the calendar with dates/times

## Note About Workspace Members

**Important**: The logs show your workspace has 0 members, which might be why RLS is blocking you. The policies check `workspace_members` table.

You may also need to ensure you're added as a workspace member. If the issue persists after running the RLS fix, run this additional query:

\`\`\`sql
-- Check if you're in workspace_members
SELECT * FROM workspace_members 
WHERE user_id = auth.uid();

-- If no results, you need to be added (should happen automatically on workspace creation)
-- Check the workspace creation trigger or manually insert:
INSERT INTO workspace_members (workspace_id, user_id, role, joined_at)
SELECT w.id, w.owner_id, 'owner', w.created_at
FROM workspaces w
WHERE w.owner_id = auth.uid()
AND NOT EXISTS (
  SELECT 1 FROM workspace_members wm 
  WHERE wm.workspace_id = w.id AND wm.user_id = w.owner_id
);
\`\`\`
