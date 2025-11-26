# 🚨 ADMIN PLAN FIX - QUICK START

## What Happened
All user plans were reset to "free". Your admin account needs to be restored to team-pro.

## ⚡ Quick Fix (5 minutes)

### 1. Run the SQL Script
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy the contents of: `RUN_THIS_ADMIN_FIX.sql`
3. Click **Run** (or F5)
4. Look for SUCCESS messages in the output

### 2. Refresh Your App
1. Go to your app
2. Hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. Navigate to **Admin** tab (🔐 Admin)
4. Verify you see "TEAM PRO" next to your name

### 3. Test Admin Function
1. Find any other user in the list
2. Click **Change Plan**
3. Select a plan and click ✓
4. Should see "Plan updated successfully!" alert

## ✅ Verification Checklist

- [ ] SQL script ran without errors
- [ ] Admin tab shows your account as "TEAM PRO"
- [ ] "Change Plan" button works for other users
- [ ] No console errors in browser

## 🔧 What the Fix Does

1. **Creates/Updates Admin Functions**:
   - `get_all_users_for_admin()` - Lists all users
   - `admin_update_user_plan()` - Changes user plans

2. **Sets Your Account**:
   - Email: joe@setique.com
   - Admin: ✓ Yes
   - Plan: team-pro
   - Seats: 10
   - Duration: 1 year

3. **Updates Both Tables**:
   - `workspaces.plan_type` = 'team-pro'
   - `subscriptions.plan_type` = 'team-pro'

## 📊 Current State (Before Fix)

Run this to see current state:
```sql
SELECT 
    p.email,
    w.plan_type as workspace_plan,
    s.plan_type as subscription_plan
FROM profiles p
LEFT JOIN workspaces w ON w.owner_id = p.id
LEFT JOIN subscriptions s ON s.workspace_id = w.id
WHERE p.email = 'joe@setique.com';
```

## 🎯 After Fix (Expected Result)

```
email              | workspace_plan | subscription_plan
joe@setique.com    | team-pro       | team-pro
```

## 🆘 Troubleshooting

### "Permission denied" error
```sql
-- Verify you're logged in as admin
SELECT email, is_admin FROM profiles WHERE id = auth.uid();
```

### Changes not appearing
1. Clear browser cache
2. Log out and back in
3. Check browser console for errors

### Other users still showing "free"
That's expected! Use the Admin UI "Change Plan" button to update them individually.

## 📝 Files Created

1. **RUN_THIS_ADMIN_FIX.sql** - Main fix script (run this!)
2. **FIX_ADMIN_PLANS.sql** - Detailed version with comments
3. **ADMIN_PLAN_FIX_INSTRUCTIONS.md** - Full documentation
4. **ADMIN_FIX_QUICKSTART.md** - This file

## 💡 Pro Tips

- The admin function is **permanent** - you only need to run this once
- After fixing, you can manage all users through the Admin UI
- Team-pro plans support 2-100 seats (default: 5)
- All plan changes take effect immediately

## 🎉 Success Indicators

You'll know it worked when:
1. ✓ No SQL errors
2. ✓ SUCCESS messages in SQL output
3. ✓ "TEAM PRO" badge in Admin UI
4. ✓ Can change other users' plans
5. ✓ All features unlocked

---

**Need help?** Check the browser console for detailed error messages.
