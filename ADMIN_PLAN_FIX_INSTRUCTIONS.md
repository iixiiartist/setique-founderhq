# Admin Plan Fix Instructions

## Problem
All user plans were reset to "free" but the admin UI is showing the plans. Need to reassign your admin account and verify the admin function works.

## Solution

### Step 1: Run the Fix Script
1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Open the file: `FIX_ADMIN_PLANS.sql`
4. Execute the entire script

This script will:
- ✅ Check current status of all workspaces and subscriptions
- ✅ Verify/create the `admin_update_user_plan` function
- ✅ Set your admin account (joe@setique.com) to `team-pro` with 10 seats
- ✅ Verify the changes were applied

### Step 2: Verify in Admin UI
1. Go to your app and navigate to the Admin tab (🔐 Admin)
2. Find your user (joe@setique.com)
3. You should now see "TEAM PRO" as your plan
4. Test the "Change Plan" button on any other user to verify functionality

### Step 3: Reassign Other User Plans (if needed)
If other users need their plans restored:
1. In the Admin UI, click "Change Plan" next to any user
2. Select the appropriate plan:
   - **free**: Basic plan (default)
   - **power-individual**: Individual power user (1 seat)
   - **team-pro**: Team plan (2-100 seats, specify number)
3. Click ✓ to save

## What Happened?
The plans were likely reset due to:
- Database migration or schema change
- RLS policy update
- Manual database cleanup
- Missing subscription records

## The Fix
The `admin_update_user_plan` function now:
1. Checks admin authorization
2. Updates both `workspaces.plan_type` AND `subscriptions.plan_type`
3. Ensures proper seat counts
4. Creates subscription records if missing
5. Returns detailed success/error messages

## Function Details
```sql
admin_update_user_plan(
    target_user_id UUID,
    new_plan_type TEXT,      -- 'free', 'power-individual', or 'team-pro'
    new_seats INTEGER        -- Only used for 'team-pro' (default: 5)
)
```

## Verification Queries
Run these in SQL Editor to check status:

```sql
-- Check your admin account
SELECT 
    p.email,
    w.plan_type as workspace_plan,
    s.plan_type as subscription_plan,
    s.seat_count
FROM profiles p
JOIN workspace_members wm ON wm.user_id = p.id AND wm.role = 'owner'
JOIN workspaces w ON w.id = wm.workspace_id
LEFT JOIN subscriptions s ON s.workspace_id = w.id
WHERE p.email = 'joe@setique.com';

-- Check all users and their plans
SELECT 
    p.email,
    w.plan_type as workspace_plan,
    s.plan_type as subscription_plan
FROM profiles p
JOIN workspace_members wm ON wm.user_id = p.id AND wm.role = 'owner'
JOIN workspaces w ON w.id = wm.workspace_id
LEFT JOIN subscriptions s ON s.workspace_id = w.id
ORDER BY p.email;
```

## Troubleshooting

### Admin function not working?
Check if it exists:
```sql
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name = 'admin_update_user_plan';
```

If missing, run the CREATE FUNCTION statement from `FIX_ADMIN_PLANS.sql`.

### Changes not showing in UI?
1. Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Log out and log back in
4. Check browser console for errors

### "Unauthorized" error?
Verify your admin status:
```sql
SELECT email, is_admin FROM profiles WHERE email = 'joe@setique.com';
```

If `is_admin` is false, set it to true:
```sql
UPDATE profiles SET is_admin = true WHERE email = 'joe@setique.com';
```

## Support
If issues persist:
1. Check Supabase logs for errors
2. Verify RLS policies allow admin access
3. Ensure the admin function has SECURITY DEFINER
4. Check that authenticated users can execute the function
