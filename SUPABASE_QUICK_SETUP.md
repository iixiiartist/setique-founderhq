# 🚀 Supabase Quick Setup - Fix Authentication

## Current Issue: Email Confirmation Required

You're seeing: `Error signing in: AuthApiError: Email not confirmed`

This is because Supabase requires email confirmation by default. For development, you should disable this.

---

## ✅ Fix 1: Disable Email Confirmation (Recommended for Development)

### Step-by-step:

1. **Go to Supabase Dashboard:**
   - Open: https://supabase.com/dashboard (select your project)

2. **Navigate to Authentication Settings:**
   - Click **Authentication** in left sidebar
   - Click **Providers** tab
   - Find **Email** provider

3. **Disable Email Confirmation:**
   - Scroll down to **Email Settings**
   - Find **"Confirm email"** toggle
   - **Turn OFF** (should be gray/disabled)
   - Click **Save**

4. **Test Again:**
   - Go back to http://localhost:3000
   - Click "Sign up instead"
   - Enter your details
   - You should be logged in immediately!

---

## ✅ Fix 2: Confirm Email Manually (Alternative)

If you want to keep email confirmation enabled:

### Option A: Check Email
1. Check your email inbox (the one you signed up with)
2. Look for email from Supabase
3. Click the confirmation link
4. Return to app and sign in

### Option B: Manual Confirmation in Dashboard
1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Find your user in the list
3. Click on the user row
4. Look for **Email Confirmed** field
5. If it says "false", click the user and manually confirm

---

## ✅ Fix 3: Run Schema Setup

Make sure the database schema and trigger are set up:

### 1. Check if schema is deployed:

Go to Supabase Dashboard → **SQL Editor** and run:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

**Expected tables:**
- contacts
- crm_items
- documents
- financial_logs
- marketing_items
- meetings
- profiles ← Important!
- tasks

### 2. If profiles table is missing, run the full schema:

1. Go to **SQL Editor** → **New Query**
2. Copy ALL contents from `supabase/schema.sql`
3. Paste into the SQL editor
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. Wait for "Success. No rows returned"

### 3. Verify the trigger exists:

```sql
-- Check for the user creation trigger
SELECT trigger_name, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```

**Expected result:**
- trigger_name: `on_auth_user_created`
- event_object_table: `users`
- action_statement: `EXECUTE FUNCTION public.handle_new_user()`

If this doesn't return anything, the trigger is missing and needs to be created.

---

## 🔍 Troubleshooting

### Error: "Failed to load resource: 401"

**Cause:** RLS policies blocking insert to profiles table

**Fix:**
1. Check RLS policy for profiles INSERT:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'INSERT';
   ```

2. Should have policy: `"Users can insert own profile"`
   ```sql
   CREATE POLICY "Users can insert own profile" ON profiles 
   FOR INSERT WITH CHECK (auth.uid() = id);
   ```

3. If missing, run the full schema.sql again

### Error: "Email not confirmed"

**Fix:** Disable email confirmation (see Fix 1 above)

### Error: "Invalid login credentials"

**Causes:**
1. Wrong email/password
2. User doesn't exist yet - try signing up first
3. Email not confirmed (if confirmation is enabled)

---

## 📋 Quick Test After Setup

1. **Clear any existing user:**
   - Go to Supabase Dashboard → Authentication → Users
   - Delete any test users if they exist

2. **Sign Up Fresh:**
   ```
   Email: test@example.com
   Password: TestPass123!
   Full Name: Test User
   ```

3. **Verify Profile Created:**
   - Go to Supabase Dashboard → Table Editor → profiles
   - You should see a row with your email

4. **Test Logout/Login:**
   - Click "Sign Out" in top-right
   - Click "Sign In" on login page
   - Enter same credentials
   - Should log you in successfully

---

## ✅ Expected Behavior After Fix

### Sign Up Flow:
1. Enter email, password, full name
2. Click "Sign Up"
3. ✅ User created in `auth.users`
4. ✅ Profile created in `profiles` table (via trigger)
5. ✅ Immediately logged in
6. ✅ Dashboard loads with empty data

### Sign In Flow:
1. Enter email, password
2. Click "Sign In"
3. ✅ Authenticated
4. ✅ Dashboard loads
5. ✅ Data loads from Supabase (if any exists)

---

## 🎯 Recommended Settings for Development

Go to **Authentication** → **Settings**:

- ✅ Email provider: **Enabled**
- ❌ Confirm email: **Disabled** (for dev)
- ✅ Secure email change: **Disabled** (for dev)
- ❌ Double confirm email change: **Disabled** (for dev)
- Session duration: **604800** (7 days)

**For Production:** Re-enable email confirmation!

---

## 🔗 Useful Links

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Authentication Docs:** https://supabase.com/docs/guides/auth
- **RLS Policies Docs:** https://supabase.com/docs/guides/auth/row-level-security

---

## 🆘 Still Having Issues?

Check browser console for specific errors:

1. **401 Unauthorized:** RLS policy blocking access
2. **400 Bad Request:** Invalid credentials or email not confirmed
3. **404 Not Found:** Supabase URL or table doesn't exist
4. **500 Server Error:** Database schema issue

Run the schema.sql file again if you see table/trigger errors.

---

**After following Fix 1 above, refresh the page and try signing up again!** 🚀
