# Stripe Integration Setup Guide

This guide will help you set up Stripe for payment processing in the Setique Founder Dashboard.

## Prerequisites

- Stripe account (create at https://stripe.com)
- Supabase project with CLI installed
- Access to your project's environment variables

## Step 1: Create Stripe Products & Prices

### In Stripe Dashboard (https://dashboard.stripe.com):

#### Individual Plans

1. **Pro Individual - $29/month**
   - Product Name: "Pro Individual"
   - Recurring: Monthly
   - Price: $29.00
   - Copy the Price ID (e.g., `price_xxx`)

2. **Power Individual - $99/month**
   - Product Name: "Power Individual"
   - Recurring: Monthly
   - Price: $99.00
   - Copy the Price ID

#### Team Plans (Base + Per-Seat)

3. **Team Starter Base - $49/month**
   - Product Name: "Team Starter - Base"
   - Recurring: Monthly
   - Price: $49.00
   - Copy the Price ID

4. **Team Starter Seat - $15/month per seat**
   - Product Name: "Team Starter - Per Seat"
   - Recurring: Monthly
   - Price: $15.00
   - Copy the Price ID

5. **Team Pro Base - $149/month**
   - Product Name: "Team Pro - Base"
   - Recurring: Monthly
   - Price: $149.00
   - Copy the Price ID

6. **Team Pro Seat - $12/month per seat**
   - Product Name: "Team Pro - Per Seat"
   - Recurring: Monthly
   - Price: $12.00
   - Copy the Price ID

## Step 2: Configure Environment Variables

### Frontend (.env file):

```bash
# Stripe Publishable Key (safe to expose in frontend)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Stripe Price IDs
VITE_STRIPE_PRICE_PRO_INDIVIDUAL=price_xxx
VITE_STRIPE_PRICE_POWER_INDIVIDUAL=price_xxx
VITE_STRIPE_PRICE_TEAM_STARTER_BASE=price_xxx
VITE_STRIPE_PRICE_TEAM_STARTER_SEAT=price_xxx
VITE_STRIPE_PRICE_TEAM_PRO_BASE=price_xxx
VITE_STRIPE_PRICE_TEAM_PRO_SEAT=price_xxx
```

### Supabase Edge Functions:

```bash
# Set Stripe Secret Key (use Supabase CLI)
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_secret_key_here
```

## Step 3: Deploy Supabase Edge Functions

```bash
# Navigate to project directory
cd supabase

# Deploy create-checkout-session function
supabase functions deploy create-checkout-session

# Deploy create-portal-session function
supabase functions deploy create-portal-session

# Deploy webhook handler (after creating webhook endpoint)
supabase functions deploy stripe-webhook
```

## Step 4: Configure Stripe Webhooks

1. Go to Stripe Dashboard > Developers > Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen for:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the "Signing secret" (starts with `whsec_`)
6. Set it in Supabase:
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_signing_secret
   ```

## Step 5: Enable Stripe Customer Portal

1. Go to Stripe Dashboard > Settings > Customer Portal
2. Enable the Customer Portal
3. Configure allowed actions:
   - ✅ Cancel subscriptions
   - ✅ Update payment method
   - ✅ View invoice history
   - ✅ Update billing information
4. Set cancellation behavior:
   - [ ] Cancel immediately
   - [x] Cancel at period end (recommended)

## Step 6: Test Integration

### Test Mode:

1. Use Stripe test mode keys (pk_test_* and sk_test_*)
2. Test card numbers:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Requires 3D Secure: `4000 0025 0000 3155`
3. Use any future expiry date and any CVC

### Test Scenarios:

- [ ] Subscribe to Pro Individual plan
- [ ] Subscribe to Team Starter with 3 seats
- [ ] Update seat count (add/remove seats)
- [ ] Access Customer Portal
- [ ] Cancel subscription
- [ ] Reactivate subscription
- [ ] Payment failure handling

## Step 7: Go Live

1. Complete Stripe account verification
2. Switch to live mode in Stripe Dashboard
3. Create production products and prices (same structure)
4. Update environment variables with live keys
5. Update webhook endpoint to production URL
6. Test with real payment method

## Usage in Code

### Create Checkout Session:

```typescript
import { StripeService } from '@/lib/services/stripe';

// Subscribe to Pro Individual
await StripeService.redirectToCheckout({
  workspaceId: 'workspace-uuid',
  planType: 'pro-individual'
});

// Subscribe to Team Starter with 5 seats
await StripeService.redirectToCheckout({
  workspaceId: 'workspace-uuid',
  planType: 'team-starter',
  seatCount: 5
});
```

### Manage Subscription:

```typescript
// Open Customer Portal
await StripeService.redirectToCustomerPortal('workspace-uuid');

// Update seat count
await StripeService.updateSeatCount('workspace-uuid', 7);

// Cancel subscription
await StripeService.cancelSubscription('workspace-uuid');
```

## Troubleshooting

### "Stripe publishable key not found"
- Ensure `.env` file has `VITE_STRIPE_PUBLISHABLE_KEY`
- Restart dev server after updating `.env`

### "Failed to create checkout session"
- Check Supabase Edge Function logs
- Verify `STRIPE_SECRET_KEY` is set in Supabase secrets
- Ensure Price IDs are correct

### Webhook not receiving events
- Verify webhook endpoint URL is correct
- Check that webhook signing secret is set
- Test webhook with Stripe CLI: `stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook`

### Payment not reflecting in database
- Check webhook handler logs
- Verify RLS policies allow service role to update subscriptions
- Ensure webhook event is in the list of subscribed events

## Security Notes

- ✅ **DO** use Stripe Publishable Key in frontend
- ✅ **DO** store Secret Key only in Supabase Edge Functions
- ✅ **DO** verify webhook signatures
- ✅ **DO** use HTTPS for webhooks
- ❌ **DON'T** commit `.env` file to git
- ❌ **DON'T** expose Secret Key in frontend
- ❌ **DON'T** skip webhook signature verification

## Support

- Stripe Documentation: https://stripe.com/docs
- Supabase Edge Functions: https://supabase.com/docs/guides/functions
- Stripe Test Cards: https://stripe.com/docs/testing
