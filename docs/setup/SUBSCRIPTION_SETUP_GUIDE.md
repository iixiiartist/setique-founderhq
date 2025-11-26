# Subscription System Setup Guide for Supabase

## 🚀 Quick Setup (5 Minutes)

### Step 1: Run the Subscription Migrations

**In Supabase Dashboard → SQL Editor:**

1. **Run migration 005** (if not already done):
   ```sql
   -- Copy and paste the entire content of:
   -- supabase/migrations/005_add_subscription_schema.sql
   ```

2. **Run migration 006** (NEW - Auto-create subscriptions):
   ```sql
   -- Copy and paste the entire content of:
   -- supabase/migrations/006_create_subscription_trigger.sql
   ```

This will:
- ✅ Create the `subscriptions` table
- ✅ Set up all database functions (check limits, increment usage, etc.)
- ✅ Create RLS policies (security)
- ✅ Auto-create FREE subscriptions for all existing workspaces
- ✅ Auto-create FREE subscriptions for NEW workspaces (trigger)

### Step 2: Verify Subscriptions Exist

Run this in Supabase SQL Editor:

```sql
-- Check if all workspaces have subscriptions
SELECT 
    w.id as workspace_id,
    w.name as workspace_name,
    s.plan_type,
    s.ai_requests_used,
    s.ai_requests_limit,
    s.status
FROM workspaces w
LEFT JOIN subscriptions s ON s.workspace_id = w.id
ORDER BY w.created_at DESC;
```

**Expected result:** Every workspace should have a subscription (plan_type = 'free' by default)

---

## 💳 Stripe Integration (Optional - For Paid Plans)

### Step 3: Set Up Stripe Webhook

**Only needed if you want to accept payments now.**

1. **Get your Stripe Secret Key:**
   - Go to https://dashboard.stripe.com/apikeys
   - Copy "Secret key" (starts with `sk_test_` or `sk_live_`)

2. **Add to Supabase Edge Function Secrets:**
   ```bash
   # In your terminal:
   cd supabase
   supabase secrets set STRIPE_SECRET_KEY=sk_test_your_key_here
   ```

3. **Deploy Edge Functions:**
   ```bash
   supabase functions deploy create-checkout-session
   supabase functions deploy create-portal-session
   ```

4. **Create Stripe Webhook:**
   - Go to: https://dashboard.stripe.com/webhooks
   - Click "Add endpoint"
   - URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook`
   - Events to listen to:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

5. **Get Webhook Secret and add to Supabase:**
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
   ```

---

## ✅ Testing the System

### Test 1: Check AI Limits

Run this in Supabase SQL Editor (replace `YOUR_WORKSPACE_ID`):

```sql
-- Check if AI request is allowed
SELECT check_ai_limit('YOUR_WORKSPACE_ID');

-- View subscription details
SELECT 
    plan_type,
    ai_requests_used,
    ai_requests_limit,
    status
FROM subscriptions
WHERE workspace_id = 'YOUR_WORKSPACE_ID';
```

### Test 2: Increment AI Usage

```sql
-- Simulate AI request
SELECT increment_ai_usage('YOUR_WORKSPACE_ID');

-- Verify count increased
SELECT ai_requests_used FROM subscriptions 
WHERE workspace_id = 'YOUR_WORKSPACE_ID';
```

### Test 3: Test in Your App

1. Open your app at `http://localhost:3001`
2. Sign in
3. Open browser console (F12)
4. Try using AI assistant
5. Look for logs:
   ```
   [Database] AI Limit Check: 1/20 (free), Allowed: true
   [Groq] Checking AI limit for workspace: ...
   [Database] Incremented AI usage: 2
   ```

---

## 🔧 Manual Subscription Management

### Upgrade a Workspace to Power Plan

```sql
UPDATE subscriptions
SET 
    plan_type = 'power-individual',
    ai_requests_limit = NULL, -- Unlimited
    file_count_limit = NULL, -- Unlimited
    storage_bytes_limit = 5368709120, -- 5 GB
    updated_at = NOW()
WHERE workspace_id = 'YOUR_WORKSPACE_ID';
```

### Upgrade to Team Pro

```sql
UPDATE subscriptions
SET 
    plan_type = 'team-pro',
    seat_count = 5, -- Adjust number of seats
    ai_requests_limit = NULL, -- Unlimited
    file_count_limit = NULL, -- Unlimited
    storage_bytes_limit = 10737418240, -- 10 GB
    updated_at = NOW()
WHERE workspace_id = 'YOUR_WORKSPACE_ID';
```

### Reset AI Usage (for testing)

```sql
UPDATE subscriptions
SET 
    ai_requests_used = 0,
    ai_requests_reset_at = NOW(),
    updated_at = NOW()
WHERE workspace_id = 'YOUR_WORKSPACE_ID';
```

---

## 📊 Current Plan Features

| Plan | Price | AI Requests | Files | Storage |
|------|-------|-------------|-------|---------|
| **Free** | $0/month | 20/month | 25 | 100 MB |
| **Power** | $99/month | Unlimited | Unlimited | 5 GB |
| **Team Pro** | $149/month + $25/user | Unlimited per user | Unlimited per user | 10 GB shared |

---

## 🐛 Troubleshooting

### "Column subscriptions.ai_requests_used does not exist"

**Solution:** Run migration 005 and 006 (see Step 1)

### "No subscription found for workspace"

**Solution:** Run the backfill query from migration 006:

```sql
INSERT INTO subscriptions (
    workspace_id, plan_type, status, ai_requests_used, 
    ai_requests_reset_at, storage_bytes_used, file_count_used, 
    seat_count, used_seats
)
SELECT 
    w.id, 'free', 'active', 0, NOW(), 0, 0, 1, 1
FROM workspaces w
WHERE NOT EXISTS (
    SELECT 1 FROM subscriptions s WHERE s.workspace_id = w.id
);
```

### AI requests still blocked on free plan

**Check current usage:**

```sql
SELECT 
    plan_type,
    ai_requests_used,
    ai_requests_limit,
    status,
    ai_requests_reset_at
FROM subscriptions
WHERE workspace_id = 'YOUR_WORKSPACE_ID';
```

**If ai_requests_used >= 20, either:**

1. Wait 30 days for auto-reset
2. Manually reset (see above)
3. Upgrade to Power plan (unlimited)

---

## 🎯 What's Already Working

✅ **Database Schema:** Tables, functions, triggers all created  
✅ **Auto-Creation:** New workspaces automatically get free subscriptions  
✅ **Usage Tracking:** AI requests are counted per workspace  
✅ **Limit Checking:** App checks limits before allowing AI requests  
✅ **RLS Policies:** Security rules prevent unauthorized access  
✅ **Edge Functions:** Stripe checkout/portal ready to deploy  

## ⏭️ Next Steps

### For Testing Only (No Payments)
1. ✅ Run migrations 005 + 006
2. ✅ Test in browser console
3. ✅ Manually upgrade test workspaces to Power/Team Pro

### For Production (Accept Payments)
1. ✅ Complete "Testing Only" steps
2. Set up Stripe webhook (Step 3)
3. Create Stripe Products and Prices
4. Add Stripe Price IDs to env variables
5. Test checkout flow end-to-end

---

## 📞 Need Help?

If you get stuck:
1. Check Supabase logs: Dashboard → Logs → Function Logs
2. Check browser console for errors
3. Verify migrations ran successfully: Dashboard → Database → Migrations

**Current Status:** System is 95% ready! Just need to run the migrations in Supabase.
