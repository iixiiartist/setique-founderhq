# Apply Trigger Fix for Duplicate Workspace Bug

## Problem
Invited users are ending up in separate workspaces instead of being added to the inviter's workspace. This is caused by a race condition in the `handle_new_user()` trigger.

## Solution
The trigger has been updated to check for **both 'pending' and 'accepted'** invitation statuses, plus check user metadata for `invited_to_workspace` field.

## How to Apply

### Option 1: Supabase Dashboard (RECOMMENDED)
1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the entire content from: `supabase/migrations/20251103023000_conditional_workspace_creation.sql`
4. Click **Run** to execute

### Option 2: Supabase CLI (if you have local setup)
```powershell
cd "G:\setique-founder-dashboard (2)"
npx supabase db push
```

## After Applying

### Step 1: Verify the Fix is Applied
Run this query in SQL Editor to check the function was updated:
```sql
SELECT prosrc FROM pg_proc WHERE proname = 'handle_new_user';
```

Look for this line in the output:
```sql
AND status IN ('pending', 'accepted')
```

### Step 2: Clean Up Test Data
Delete II XII's auto-created workspace:
```sql
-- First, find II XII's user ID
SELECT id, email FROM auth.users WHERE email LIKE '%XII%';

-- Then delete their workspace (replace <user_id> with actual ID)
DELETE FROM workspaces 
WHERE owner_id = '<user_id>' 
AND owner_id != 'f61f58d6-7ffa-4f05-902c-af4e4edc646e'; -- Don't delete Joe's!

-- Verify II XII is still a member of Joe's workspace
SELECT * FROM workspace_members 
WHERE user_id = '<user_id>';
```

### Step 3: Test the Invite Flow Again
1. Delete II XII user completely:
   ```sql
   DELETE FROM auth.users WHERE email = '<II XII email>';
   ```

2. Joe sends a fresh invitation from the dashboard

3. Click the invite link and complete signup

4. **VERIFY:** II XII should see Joe's workspace content, NOT a new workspace setup screen

## Expected Behavior After Fix
- ✅ Invited user gets account created automatically
- ✅ Invited user is added to inviter's workspace
- ✅ Invited user does NOT get their own workspace created
- ✅ Invited user sees inviter's workspace content immediately
- ❌ No "complete business profile" prompt for invited users

## Rollback (if needed)
If something goes wrong, you can restore the old trigger:
```sql
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.email);
    
    -- Always create workspace (old behavior)
    INSERT INTO public.workspaces (owner_id, name)
    VALUES (NEW.id, NEW.email || '''s Workspace');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```
