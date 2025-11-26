# Stripe Production Deployment Checklist

## ✅ Completed Steps

### 1. Edge Functions Deployed
- ✅ create-checkout-session
- ✅ create-portal-session
- ✅ update-subscription-seats
- ✅ cancel-subscription
- ✅ reactivate-subscription
- ✅ stripe-webhook

**Deployment Status**: All functions successfully deployed to `https://jffnzpdcmdalxqhkfymx.supabase.co/functions/v1/`

### 2. Client Integration Complete
- ✅ Created `src/services/stripeEdgeFunctions.ts` - TypeScript client for Edge Functions
- ✅ Updated `components/SettingsTab.tsx` - Added "Manage Subscription" button
- ✅ Updated `components/PricingPage.tsx` - Integrated checkout flow
- ✅ Created `components/CheckoutSuccessPage.tsx` - Post-checkout success page

### 3. Environment Variables Configured
You confirmed all variables are set in Supabase Edge Functions:
- ✅ STRIPE_SECRET_KEY
- ✅ STRIPE_WEBHOOK_SECRET
- ✅ STRIPE_PRICE_POWER_INDIVIDUAL
- ✅ STRIPE_PRICE_TEAM_PRO_BASE
- ✅ STRIPE_PRICE_TEAM_PRO_SEAT
- ✅ STRIPE_MIN_TEAM_SEATS
- ✅ SUPABASE_URL
- ✅ SUPABASE_SERVICE_ROLE_KEY

## 🔄 Remaining Steps

### 4. Configure Stripe Webhook

**Action Required**: Point Stripe webhook to your deployed function

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter URL: `https://jffnzpdcmdalxqhkfymx.supabase.co/functions/v1/stripe-webhook`
4. Select events to listen to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
5. Copy the webhook signing secret
6. Verify `STRIPE_WEBHOOK_SECRET` in Supabase matches this signing secret

**Verification**: After setup, send a test event from Stripe Dashboard

### 5. Add Success Route to Router

**File to Update**: Your main routing file (likely `App.tsx` or `routes.tsx`)

**Add this route**:
```tsx
import { CheckoutSuccessPage } from './components/CheckoutSuccessPage';

// In your router configuration:
<Route path="/success" element={<CheckoutSuccessPage />} />
```

**Purpose**: Handles Stripe's redirect after successful checkout

### 6. Test Payment Flow End-to-End

#### Test Mode Testing (Recommended First)
1. Switch Stripe to test mode
2. Use test API keys in Supabase Edge Functions
3. Test checkout with card: `4242 4242 4242 4242`
4. Verify:
   - [ ] Checkout session creates successfully
   - [ ] User redirects to Stripe Checkout
   - [ ] After payment, redirects to `/success`
   - [ ] Webhook receives `checkout.session.completed` event
   - [ ] Database updates with subscription data
   - [ ] Workspace plan_type changes to purchased plan
   - [ ] Settings page shows correct plan

#### Production Testing
1. Switch to live API keys
2. Complete a real $1 test transaction
3. Verify same flow as test mode
4. Cancel test subscription via customer portal

### 7. Update Database Schema (If Needed)

**Verify these columns exist in `workspaces` table**:
```sql
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
```

**Run in Supabase SQL Editor** if not already done.

### 8. Monitor Edge Function Logs

**During Testing**:
1. Go to [Supabase Dashboard → Edge Functions](https://supabase.com/dashboard/project/jffnzpdcmdalxqhkfymx/functions)
2. Click on each function to view invocations
3. Look for errors in logs
4. Verify webhook events are processing

**Common Issues to Watch**:
- Webhook signature validation failures → Check STRIPE_WEBHOOK_SECRET
- "workspace_id not found" → Verify metadata attached to Stripe objects
- Price ID errors → Verify environment variables match Stripe Dashboard

### 9. Test Customer Portal Access

**Steps**:
1. Subscribe to a plan (test mode)
2. Go to Settings → Click "Manage Subscription"
3. Verify portal opens with:
   - [ ] Current subscription details
   - [ ] Update payment method option
   - [ ] Cancel subscription option
   - [ ] Billing history
4. Test updating payment method
5. Test canceling subscription
6. Verify database updates after portal actions

### 10. Test Seat Count Updates (Team Plans)

**For team-pro subscriptions**:
1. Subscribe with 2 seats
2. Use `update-subscription-seats` function or customer portal
3. Increase to 5 seats
4. Verify:
   - [ ] Stripe subscription updated
   - [ ] Database `seat_count` updated
   - [ ] Settings shows correct seat count
   - [ ] Invoice prorated correctly

### 11. Test Subscription Lifecycle

**Complete Flow Testing**:
1. **Create**: Purchase subscription → Verify active status
2. **Update**: Change seat count → Verify database sync
3. **Cancel**: Cancel at period end → Verify `cancel_at_period_end` flag
4. **Reactivate**: Resume subscription → Verify flag cleared
5. **Immediate Cancel**: Cancel immediately → Verify status changes to canceled
6. **Renewal**: Wait for period end (or use Stripe CLI) → Verify renewal invoice

**Stripe CLI Testing** (for faster testing):
```bash
stripe listen --forward-to https://jffnzpdcmdalxqhkfymx.supabase.co/functions/v1/stripe-webhook

# Trigger events manually
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger customer.subscription.deleted
```

## 📊 Production Readiness Verification

### Security Checklist
- [ ] All Edge Functions use `--no-verify-jwt` flag (public endpoints with auth in body)
- [ ] Webhook signature validation enabled
- [ ] Service role key never exposed to client
- [ ] All Stripe operations use server-side functions
- [ ] Workspace ownership verified before operations

### Performance Checklist
- [ ] React Query cache invalidation working
- [ ] No unnecessary API calls during checkout
- [ ] Edge Function cold starts acceptable (<3 seconds)
- [ ] Database queries optimized

### UX Checklist
- [ ] Loading states during checkout
- [ ] Error messages user-friendly
- [ ] Success page clear and informative
- [ ] Customer portal accessible from settings
- [ ] Plan comparison clear in pricing page

## 🚀 Go-Live Procedure

1. **Backup Current State**
   ```bash
   # Backup database
   pg_dump your_database > backup_$(date +%Y%m%d).sql
   ```

2. **Switch to Production Stripe Keys**
   - Update all `STRIPE_*` environment variables in Supabase
   - Deploy Edge Functions again: `supabase functions deploy --project-ref jffnzpdcmdalxqhkfymx`

3. **Update Webhook Endpoint in Stripe**
   - Change from test webhook to production webhook
   - Use same URL but with production signing secret

4. **Monitor Closely**
   - Watch Edge Function logs for 24 hours
   - Check Stripe Dashboard for webhook delivery
   - Monitor database for sync issues
   - Have rollback plan ready

5. **Test with Real Payment**
   - Complete at least one real subscription
   - Verify full flow works
   - Test customer portal
   - Confirm webhook processing

## 📝 Documentation & Support

### For Your Team
- [ ] Document subscription management process
- [ ] Create admin guide for plan assignment
- [ ] Document troubleshooting steps
- [ ] Set up monitoring alerts

### For Customers
- [ ] Update pricing page with accurate information
- [ ] Add FAQ section about subscriptions
- [ ] Document what happens at renewal
- [ ] Explain cancellation policy

## 🆘 Rollback Plan

If issues arise:

1. **Immediate**: Switch Stripe webhook to pause mode
2. **Temporary Fix**: Use admin panel to manually assign plans
3. **Investigation**: Check Edge Function logs and Stripe events
4. **Resolution**: Fix issue and redeploy
5. **Resume**: Re-enable webhook

## 📞 Support Contacts

- **Stripe Support**: [https://support.stripe.com](https://support.stripe.com)
- **Supabase Support**: [https://supabase.com/support](https://supabase.com/support)
- **Emergency**: Use admin panel for manual plan assignment

## ✨ Success Criteria

Your Stripe integration is production-ready when:
- ✅ All Edge Functions deployed and tested
- ✅ Webhook processing all events successfully
- ✅ Database syncing correctly
- ✅ Customer portal accessible
- ✅ Full subscription lifecycle tested
- ✅ Error handling graceful
- ✅ Monitoring in place
- ✅ Admin override still available

---

**Current Status**: 90% Complete

**Next Immediate Action**: Configure Stripe webhook endpoint and test end-to-end flow

**Estimated Time to Production**: 1-2 hours of testing
