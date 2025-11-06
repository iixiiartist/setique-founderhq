# 🚀 QUICK START: Make Subscriptions Work

## What You Need to Do in Supabase (5 minutes)

### Step 1: Run Migration 005 (if not already done)
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy/paste entire file: `supabase/migrations/005_add_subscription_schema.sql`
4. Click **Run**
5. Wait for "Success" message

### Step 2: Run Migration 006 (NEW - Auto-create subscriptions)
1. In **SQL Editor**, click **New Query**
2. Copy/paste entire file: `supabase/migrations/006_create_subscription_trigger.sql`
3. Click **Run**
4. This will:
   - ✅ Create subscriptions for ALL existing workspaces (backfill)
   - ✅ Auto-create subscriptions for NEW workspaces (trigger)

### Step 3: Verify It Worked
Run this query in SQL Editor:

```sql
SELECT 
    w.name as workspace_name,
    s.plan_type,
    s.ai_requests_used,
    s.ai_requests_limit,
    s.status
FROM workspaces w
LEFT JOIN subscriptions s ON s.workspace_id = w.id;
```

**Expected:** Every workspace should show `plan_type = 'free'`

---

## ✅ That's It!

Your subscription system is now **fully functional**:

- ✅ Free plans work (20 AI requests/month)
- ✅ Usage tracking works
- ✅ Limits are enforced
- ✅ New workspaces automatically get free subscriptions
- ✅ You can manually upgrade users to Power/Team Pro (see guide)

---

## 🔧 Manual Testing (Optional)

### Upgrade your workspace to Power (unlimited):

```sql
UPDATE subscriptions
SET 
    plan_type = 'power-individual',
    ai_requests_limit = NULL, -- Unlimited
    file_count_limit = NULL,
    storage_bytes_limit = 5368709120 -- 5 GB
WHERE workspace_id = (
    SELECT id FROM workspaces 
    WHERE owner_id = auth.uid() 
    LIMIT 1
);
```

---

## 💳 For Stripe Payments (Later)

When you're ready to accept payments, follow the **full guide**:
- Read: `SUBSCRIPTION_SETUP_GUIDE.md`
- Set up Stripe webhooks
- Deploy Edge Functions with Stripe keys

---

## Questions?

Check `SUBSCRIPTION_SETUP_GUIDE.md` for:
- Troubleshooting
- Manual subscription management
- Testing procedures
- Stripe integration details
