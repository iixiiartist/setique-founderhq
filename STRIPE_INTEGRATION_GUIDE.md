# FounderHQ - Complete Stripe Integration Guide

This guide walks you through setting up Stripe subscriptions for FounderHQ's 3-tier pricing model.

## 📋 Pricing Structure

- **Free**: $0/month (no Stripe needed)
- **Power**: $49/month (single product)
- **Team Pro**: $99/month base + $25/user/month (2 products: base + per-seat)

## 🚀 Quick Setup (15 minutes)

### Step 1: Create Stripe Account

1. Go to https://stripe.com and sign up
2. Complete your business profile
3. Switch to **Test Mode** (toggle in top right) for testing

### Step 2: Create Products in Stripe

#### A. Power Plan ($49/month)

1. Go to https://dashboard.stripe.com/test/products
2. Click **"+ Add product"**
3. Fill in:
   - **Name**: `FounderHQ Power`
   - **Description**: `Unlimited AI requests, 5GB storage, unlimited files`
   - **Pricing model**: Standard pricing
   - **Price**: `$49.00`
   - **Billing period**: Monthly
   - **Currency**: USD
4. Click **"Save product"**
5. **Copy the Price ID** (looks like `price_xxxxxxxxxxxxx`) - you'll need this!

#### B. Team Pro Base ($99/month)

1. Click **"+ Add product"** again
2. Fill in:
   - **Name**: `FounderHQ Team Pro - Base`
   - **Description**: `Team collaboration base price`
   - **Pricing model**: Standard pricing
   - **Price**: `$99.00`
   - **Billing period**: Monthly
   - **Currency**: USD
3. Click **"Save product"**
4. **Copy the Price ID**

#### C. Team Pro Per-Seat ($25/month)

1. Click **"+ Add product"** again
2. Fill in:
   - **Name**: `FounderHQ Team Pro - Per User`
   - **Description**: `Additional team member`
   - **Pricing model**: Standard pricing
   - **Price**: `$25.00`
   - **Billing period**: Monthly
   - **Currency**: USD
3. Click **"Save product"**
4. **Copy the Price ID**

### Step 3: Get Stripe API Keys

1. Go to https://dashboard.stripe.com/test/apikeys
2. Copy **Publishable key** (starts with `pk_test_`)
3. Click **"Reveal test key"** and copy **Secret key** (starts with `sk_test_`)

### Step 4: Configure Environment Variables

#### A. Local Development (.env file)

Create/update `.env` file in your project root:

```bash
# Supabase (you should already have these)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Groq AI key is server-side only (set via Supabase secrets)
# npx supabase secrets set GROQ_API_KEY=your_groq_key

# Stripe Publishable Key (safe for frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx

# Stripe Price IDs (from Step 2)
VITE_STRIPE_PRICE_POWER=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_TEAM_PRO_BASE=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_TEAM_PRO_SEAT=price_xxxxxxxxxxxxx
```

#### B. Supabase Edge Functions (Server-side)

Set the Stripe secret key in Supabase:

```bash
# Make sure you're logged in to Supabase CLI
supabase login

# Link your project (if not already linked)
supabase link --project-ref your_project_id

# Set the secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
```

#### C. Netlify Environment Variables

1. Go to https://app.netlify.com
2. Select your FounderHQ site
3. Go to **Site settings** > **Environment variables**
4. Add these variables:
   - `VITE_STRIPE_PUBLISHABLE_KEY` = `pk_test_xxxxxxxxxxxxx`
   - `VITE_STRIPE_PRICE_POWER` = `price_xxxxxxxxxxxxx`
   - `VITE_STRIPE_PRICE_TEAM_PRO_BASE` = `price_xxxxxxxxxxxxx`
   - `VITE_STRIPE_PRICE_TEAM_PRO_SEAT` = `price_xxxxxxxxxxxxx`

### Step 5: Deploy Stripe Edge Functions

Deploy all Stripe-related functions to Supabase:

```bash
# Deploy checkout session creator
supabase functions deploy create-checkout-session

# Deploy customer portal session creator
supabase functions deploy create-portal-session

# Deploy webhook handler (processes Stripe events)
supabase functions deploy stripe-webhook

# Deploy seat count updater (for team plans)
supabase functions deploy update-subscription-seats
```

### Step 6: Set Up Stripe Webhooks

Webhooks keep your database in sync with Stripe events (successful payments, cancellations, etc).

1. Go to https://dashboard.stripe.com/test/webhooks/create
2. Click **"Add endpoint"**
3. **Endpoint URL**: `https://your-project-ref.supabase.co/functions/v1/stripe-webhook`
   - Replace `your-project-ref` with your Supabase project ID
   - Example: `https://jffnzpdcmdalxqhkfymx.supabase.co/functions/v1/stripe-webhook`
4. **Events to send**: Select these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Click **"Add endpoint"**
6. Copy the **Signing secret** (starts with `whsec_`)
7. Set it in Supabase:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
   ```

### Step 7: Test the Integration

#### A. Test Power Plan Subscription

1. Go to your FounderHQ landing page
2. Click **"Subscribe Now"** on the Power plan
3. You'll be redirected to Stripe Checkout
4. Use test card: `4242 4242 4242 4242`
   - Expiry: any future date
   - CVC: any 3 digits
   - ZIP: any 5 digits
5. Complete the checkout
6. You should be redirected back with subscription active!

#### B. Test Customer Portal

1. Log into FounderHQ
2. Go to Settings > Billing
3. Click **"Manage Subscription"**
4. You should see Stripe Customer Portal
5. Try updating payment method, viewing invoices, etc.

### Step 8: Go Live (When Ready)

1. Switch Stripe to **Live Mode** (toggle in dashboard)
2. Create the same 3 products in Live Mode
3. Get Live API keys from https://dashboard.stripe.com/apikeys
4. Update environment variables with **Live keys** (pk_live_ and sk_live_)
5. Create Live webhook endpoint (same steps as test)
6. Update Netlify and Supabase with Live keys

## 🧪 Test Cards

Stripe provides test cards for different scenarios:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`
- **Insufficient Funds**: `4000 0000 0000 9995`

Use any future expiry date, any CVC, and any ZIP code.

## 🔍 Troubleshooting

### "Stripe publishable key not found"
- Make sure `.env` file exists and has `VITE_STRIPE_PUBLISHABLE_KEY`
- Restart your dev server after adding env variables

### "Failed to create checkout session"
- Check Supabase Edge Functions logs: `supabase functions logs create-checkout-session`
- Verify `STRIPE_SECRET_KEY` is set in Supabase secrets
- Make sure Edge Function is deployed

### "No active Stripe subscription found"
- Check Supabase `subscriptions` table
- Webhook might not have fired - check Stripe webhook logs
- Manually trigger webhook in Stripe dashboard

### Webhook not receiving events
- Verify webhook URL is correct
- Check Edge Function logs: `supabase functions logs stripe-webhook`
- Ensure `STRIPE_WEBHOOK_SECRET` is set correctly

## 📊 Monitoring

### Stripe Dashboard
- View subscriptions: https://dashboard.stripe.com/test/subscriptions
- Check payments: https://dashboard.stripe.com/test/payments
- Monitor webhooks: https://dashboard.stripe.com/test/webhooks

### Supabase Dashboard
- Check subscriptions table: Supabase Dashboard > Table Editor > subscriptions
- View Edge Function logs: Supabase Dashboard > Edge Functions > Logs

## 🔒 Security Notes

- **Never commit** `.env` file to git
- **Never expose** `STRIPE_SECRET_KEY` in frontend code
- Use **environment variables** for all sensitive keys
- Enable **Row Level Security** on subscriptions table
- Verify webhook signatures (already implemented in webhook handler)

## 💰 Pricing Summary

| Plan | Monthly Cost | AI Requests | Storage | Files | Team |
|------|-------------|-------------|---------|-------|------|
| Free | $0 | 20 | 100 MB | 25 | 1 user |
| Power | $49 | Unlimited | 5 GB | Unlimited | 1 user |
| Team Pro | $99 + $25/user | Unlimited/user | 10 GB | Unlimited | Unlimited |

## 📞 Support

- Stripe Support: https://support.stripe.com
- Stripe Discord: https://stripe.com/discord
- Supabase Discord: https://discord.supabase.com

## ✅ Checklist

- [ ] Created Stripe account
- [ ] Created 3 products (Power, Team Pro Base, Team Pro Seat)
- [ ] Copied all Price IDs
- [ ] Added Stripe keys to `.env` file
- [ ] Set `STRIPE_SECRET_KEY` in Supabase
- [ ] Deployed Edge Functions
- [ ] Set up webhook endpoint
- [ ] Set `STRIPE_WEBHOOK_SECRET` in Supabase
- [ ] Tested Power plan subscription
- [ ] Tested customer portal access
- [ ] Added variables to Netlify
- [ ] Tested on production site

---

**Ready to launch!** 🚀 Once you complete this checklist, your Stripe integration will be fully functional.
