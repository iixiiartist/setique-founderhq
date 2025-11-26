# Subscription System Testing Guide

## ✅ What We Just Fixed
- Added `ai_requests_used` column to subscriptions table
- Added `ai_requests_limit` column to subscriptions table
- Both migrations applied successfully

## 🧪 Testing Checklist

### 1. Verify Subscription Table Structure
**Run in Supabase SQL Editor:**
```sql
-- Check subscription table columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;
```

**Expected columns:**
- `id`, `workspace_id`, `plan_type`, `status`
- `ai_requests_used` (INTEGER, DEFAULT 0)
- `ai_requests_limit` (INTEGER, DEFAULT 1000)
- `seat_count`, `stripe_customer_id`, `stripe_subscription_id`
- Timestamps: `created_at`, `updated_at`, `trial_ends_at`, `canceled_at`

### 2. Check Current Subscription Status
**Run in Supabase SQL Editor:**
```sql
-- View all subscriptions
SELECT 
    s.id,
    s.workspace_id,
    w.name as workspace_name,
    s.plan_type,
    s.status,
    s.ai_requests_used,
    s.ai_requests_limit,
    s.seat_count,
    s.created_at
FROM subscriptions s
LEFT JOIN workspaces w ON s.workspace_id = w.id
ORDER BY s.created_at DESC;
```

**What to verify:**
- ✅ Your workspace has a subscription record
- ✅ `plan_type` is set (should be 'free', 'pro-individual', etc.)
- ✅ `ai_requests_used` shows current usage (should be 0 or low number)
- ✅ `ai_requests_limit` matches your plan (free=20, pro=500, unlimited=999999)
- ✅ `status` is 'active' or 'trialing'

### 3. Test AI Usage Tracking

**In the app (Dashboard tab):**
1. Open browser DevTools (F12) → Console tab
2. Click on the AI Assistant input
3. Send a test message: "What tasks do I have today?"
4. Watch console for: `[Database] AI request tracking...`

**Then run in SQL Editor:**
```sql
-- Check if usage was incremented
SELECT 
    workspace_id,
    plan_type,
    ai_requests_used,
    ai_requests_limit,
    (ai_requests_limit - ai_requests_used) as remaining_requests
FROM subscriptions
WHERE workspace_id = (
    SELECT id FROM workspaces 
    WHERE owner_id = auth.uid()
    LIMIT 1
);
```

**Expected behavior:**
- ✅ `ai_requests_used` increments by 1 after each AI request
- ✅ Console shows successful tracking log
- ✅ No errors in console

### 4. Test Usage Limits Enforcement

**Test with free plan (20 request limit):**
```sql
-- Temporarily set your workspace to free plan with high usage
UPDATE subscriptions
SET 
    plan_type = 'free',
    ai_requests_used = 19,  -- One request away from limit
    ai_requests_limit = 20
WHERE workspace_id = (
    SELECT id FROM workspaces 
    WHERE owner_id = auth.uid()
    LIMIT 1
);
```

**In the app:**
1. Send AI message → Should work (request 20/20)
2. Send another AI message → Should be blocked with error

**Expected console output:**
```
AI usage limit reached. Used: 20, Limit: 20
```

**Reset after test:**
```sql
-- Reset to pro plan with normal usage
UPDATE subscriptions
SET 
    plan_type = 'pro-individual',
    ai_requests_used = 0,
    ai_requests_limit = 500
WHERE workspace_id = (
    SELECT id FROM workspaces 
    WHERE owner_id = auth.uid()
    LIMIT 1
);
```

### 5. Test Plan Types and Limits

**Verify plan limits are correct:**
```typescript
// From lib/services/database.ts
const limits = {
  'free': 20,                    // ✅ 20 requests/month
  'pro-individual': 500,          // ✅ 500 requests/month
  'power-individual': 999999,     // ✅ Unlimited
  'team-starter': 500 * seats,    // ✅ 500 per user
  'team-pro': 999999,             // ✅ Unlimited
};
```

**Test each plan:**
```sql
-- Test Pro Individual
UPDATE subscriptions
SET plan_type = 'pro-individual', ai_requests_used = 0
WHERE workspace_id = (SELECT id FROM workspaces WHERE owner_id = auth.uid() LIMIT 1);
-- Expected limit: 500

-- Test Power Individual (Unlimited)
UPDATE subscriptions
SET plan_type = 'power-individual', ai_requests_used = 500
WHERE workspace_id = (SELECT id FROM workspaces WHERE owner_id = auth.uid() LIMIT 1);
-- Should still allow AI requests (unlimited)

-- Test Team Starter with 3 seats
UPDATE subscriptions
SET plan_type = 'team-starter', seat_count = 3, ai_requests_used = 0
WHERE workspace_id = (SELECT id FROM workspaces WHERE owner_id = auth.uid() LIMIT 1);
-- Expected limit: 1500 (500 * 3 seats)
```

### 6. Test Auto-Creation of Subscriptions

**Delete your subscription to test auto-creation:**
```sql
-- ⚠️ ONLY FOR TESTING - This will delete your subscription
DELETE FROM subscriptions
WHERE workspace_id = (
    SELECT id FROM workspaces 
    WHERE owner_id = auth.uid()
    LIMIT 1
);
```

**In the app:**
1. Send an AI message
2. Check console for: `No subscription found, creating free plan subscription`
3. Verify free plan was created with 20 request limit

**Verify auto-created subscription:**
```sql
SELECT * FROM subscriptions
WHERE workspace_id = (SELECT id FROM workspaces WHERE owner_id = auth.uid() LIMIT 1);
-- Should show: plan_type='free', ai_requests_used=1, status='active'
```

### 7. Test Settings Tab Display

**In the app (Settings tab):**
1. Navigate to Settings → Subscription section
2. Verify it shows:
   - ✅ Current plan type
   - ✅ AI requests used / limit
   - ✅ Seat count (for team plans)
   - ✅ Status (Active/Trialing/Canceled)

### 8. Check RLS Policies

**Verify only workspace members can see subscription:**
```sql
-- Check RLS policies on subscriptions table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'subscriptions';
```

**Expected policies:**
- ✅ SELECT policy: Only workspace members can view
- ✅ INSERT policy: Only workspace owner can create
- ✅ UPDATE policy: Only workspace owner can update

### 9. Test Error Handling

**Test missing workspace:**
```sql
-- Temporarily remove your workspace_id from subscription
UPDATE subscriptions
SET workspace_id = 'invalid-uuid-that-does-not-exist'
WHERE workspace_id = (SELECT id FROM workspaces WHERE owner_id = auth.uid() LIMIT 1);
```

**In the app:**
- Send AI message
- Should create new subscription or show graceful error

**Restore:**
```sql
UPDATE subscriptions
SET workspace_id = (SELECT id FROM workspaces WHERE owner_id = auth.uid() LIMIT 1)
WHERE workspace_id = 'invalid-uuid-that-does-not-exist';
```

### 10. Monitor Usage Logs (Optional)

**Check AI usage logs table:**
```sql
-- View recent AI usage
SELECT 
    u.user_id,
    p.full_name,
    u.workspace_id,
    u.prompt_tokens,
    u.completion_tokens,
    u.total_tokens,
    u.model,
    u.created_at
FROM ai_usage_logs u
LEFT JOIN profiles p ON u.user_id = p.id
ORDER BY u.created_at DESC
LIMIT 20;
```

## 🎯 Success Criteria

All these should pass:
- ✅ Subscription exists for your workspace
- ✅ AI usage increments correctly
- ✅ Usage limits are enforced
- ✅ Plan types have correct limits
- ✅ Auto-creation works when subscription missing
- ✅ Settings tab displays subscription info
- ✅ RLS policies protect subscription data
- ✅ No console errors during AI requests
- ✅ Graceful error handling when limits reached

## 🐛 Common Issues

**Issue: "column ai_requests_used does not exist"**
- ✅ FIXED - You already ran the migration

**Issue: AI requests not incrementing**
- Check console for errors
- Verify `incrementAIUsage()` is being called
- Check RLS policies aren't blocking UPDATE

**Issue: Always shows "limit reached"**
- Check `ai_requests_used` vs `ai_requests_limit`
- Verify plan_type is set correctly
- Reset usage: `UPDATE subscriptions SET ai_requests_used = 0 WHERE workspace_id = ...`

**Issue: No subscription found**
- Auto-creation should handle this
- Manually create: Run migration 005_add_subscription_schema.sql

## 📝 Current Test Status

Run through the checklist above and report:
1. Which tests passed ✅
2. Which tests failed ❌
3. Any error messages or unexpected behavior

After testing, we can either:
- Fix any issues found
- Proceed with landing page development
- Deploy to Netlify
