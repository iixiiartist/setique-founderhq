# Stripe Integration - Quick Reference

## 🎯 What's Been Implemented

Your platform now supports **dual plan assignment**:

1. **Admin-Controlled** (Existing - Still Works)
   - Admins assign plans for free via AdminTab
   - No payment required
   - Full control over all users

2. **Stripe-Controlled** (New - Production Ready)
   - Users purchase subscriptions via Stripe
   - Automatic billing and renewals
   - Self-service via customer portal

## 📁 New Files Created

### Edge Functions (Deployed)
- `supabase/functions/_shared/config.ts` - Stripe/Supabase clients
- `supabase/functions/_shared/subscriptions.ts` - Database sync utilities
- `supabase/functions/create-checkout-session/index.ts` - Initiate checkout
- `supabase/functions/create-portal-session/index.ts` - Customer portal access
- `supabase/functions/update-subscription-seats/index.ts` - Modify seats
- `supabase/functions/cancel-subscription/index.ts` - Cancel subscription
- `supabase/functions/reactivate-subscription/index.ts` - Resume subscription
- `supabase/functions/stripe-webhook/index.ts` - Process Stripe events

### Client Code
- `src/services/stripeEdgeFunctions.ts` - TypeScript client for Edge Functions
- `components/CheckoutSuccessPage.tsx` - Post-checkout success page

### Documentation
- `STRIPE_EDGE_FUNCTIONS_GUIDE.md` - Complete implementation guide
- `STRIPE_PRODUCTION_DEPLOYMENT_CHECKLIST.md` - Deployment steps

## ✏️ Modified Files

### components/SettingsTab.tsx
**Added**: "Manage Subscription" button that opens Stripe Customer Portal
```tsx
// Shows when user has Stripe subscription
{workspace?.stripeCustomerId && (
  <button onClick={openCustomerPortal}>
    Manage Subscription
  </button>
)}
```

### components/PricingPage.tsx
**Updated**: Now uses Edge Functions instead of direct Stripe API
```tsx
// Checkout now goes through Edge Function
const { url } = await stripeEdgeFunctions.createCheckoutSession({...});
window.location.href = url;
```

## 🔗 Function URLs

All deployed to: `https://jffnzpdcmdalxqhkfymx.supabase.co/functions/v1/`

- `/create-checkout-session` - POST: Start subscription purchase
- `/create-portal-session` - POST: Open customer portal
- `/update-subscription-seats` - POST: Change seat count
- `/cancel-subscription` - POST: Cancel subscription
- `/reactivate-subscription` - POST: Resume subscription
- `/stripe-webhook` - POST: Process Stripe events

## 🔐 Environment Variables (Already Set)

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_POWER_INDIVIDUAL
STRIPE_PRICE_TEAM_PRO_BASE
STRIPE_PRICE_TEAM_PRO_SEAT
STRIPE_MIN_TEAM_SEATS
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

## 🚀 Quick Start Testing

### 1. Configure Stripe Webhook (5 min)
```
1. Go to Stripe Dashboard → Webhooks
2. Add endpoint: https://jffnzpdcmdalxqhkfymx.supabase.co/functions/v1/stripe-webhook
3. Select events: checkout.session.completed, customer.subscription.*, invoice.*
4. Verify webhook secret matches STRIPE_WEBHOOK_SECRET
```

### 2. Add Success Route (2 min)
```tsx
// In your router (App.tsx or routes file)
import { CheckoutSuccessPage } from './components/CheckoutSuccessPage';

<Route path="/success" element={<CheckoutSuccessPage />} />
```

### 3. Test Checkout Flow (10 min)
```
1. Go to Settings → Click "Upgrade Plan"
2. Select a plan
3. Use test card: 4242 4242 4242 4242
4. Complete checkout
5. Verify redirect to /success
6. Check Settings shows correct plan
```

### 4. Test Customer Portal (5 min)
```
1. Go to Settings → Click "Manage Subscription"
2. Verify portal opens
3. Test updating payment method
4. Test canceling subscription
```

## 💡 Usage Examples

### From Client Code
```typescript
import { stripeEdgeFunctions } from './services/stripeEdgeFunctions';

// Start checkout
const { url } = await stripeEdgeFunctions.createCheckoutSession({
  workspaceId: workspace.id,
  planType: 'team-pro',
  seatCount: 5,
  successUrl: `${window.location.origin}/success`,
  cancelUrl: window.location.href,
});
window.location.href = url;

// Open customer portal
const { url } = await stripeEdgeFunctions.createPortalSession({
  customerId: workspace.stripeCustomerId,
  returnUrl: window.location.href,
});
window.location.href = url;

// Update seats
await stripeEdgeFunctions.updateSubscriptionSeats({
  subscriptionId: workspace.stripeSubscriptionId,
  workspaceId: workspace.id,
  seatCount: 10,
});
```

## 🔍 Monitoring & Debugging

### View Edge Function Logs
```
Supabase Dashboard → Edge Functions → Select function → Invocations tab
```

### View Stripe Events
```
Stripe Dashboard → Developers → Events
Filter by endpoint to see webhook deliveries
```

### Check Database Sync
```sql
-- View subscriptions
SELECT * FROM subscriptions WHERE workspace_id = 'your-workspace-id';

-- View workspace plan
SELECT id, plan_type, seat_count, stripe_customer_id, stripe_subscription_id
FROM workspaces WHERE id = 'your-workspace-id';
```

### Common Debug Points
1. **Checkout fails**: Check Edge Function logs for error details
2. **Webhook not working**: Verify signature secret and event selection
3. **Database not updating**: Check webhook logs, verify workspace_id in metadata
4. **Portal not accessible**: Ensure stripe_customer_id exists in database

## 📊 Database Schema

### Key Tables
```sql
-- subscriptions: Tracks Stripe subscription data
workspace_id, stripe_customer_id, stripe_subscription_id, 
plan_type, status, seat_count, current_period_start, 
current_period_end, cancel_at_period_end

-- workspaces: Main workspace data
id, plan_type, seat_count, stripe_customer_id, stripe_subscription_id
```

## 🎭 Both Systems Work Together

### Admin Override
- Admins can still assign plans manually via AdminTab
- Admin assignments don't require Stripe
- Good for: comps, testing, special cases

### Stripe Payments
- Users purchase plans via Stripe Checkout
- Automatic renewals and billing
- Good for: production revenue, self-service

### Conflict Resolution
- Admin assignments take precedence
- Stripe webhooks update only if no admin override
- Both systems log to same database tables

## ✅ Current Status

- ✅ All Edge Functions deployed
- ✅ Client integration complete
- ✅ Environment variables configured
- ⏳ Webhook endpoint needs configuration
- ⏳ Success route needs to be added
- ⏳ End-to-end testing pending

## 📞 Next Actions

1. **Configure Stripe webhook** (5 min)
2. **Add `/success` route** (2 min)
3. **Test full checkout flow** (15 min)
4. **Go live!** 🚀

---

**All code is deployed and ready. Just need webhook config and route setup to start accepting payments!**
