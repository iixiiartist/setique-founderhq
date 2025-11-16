# Stripe Edge Functions Implementation Guide

## Overview

This guide covers the production-ready Stripe integration using Supabase Edge Functions. The system supports both **admin-controlled plan assignment** (existing) and **paid Stripe subscriptions** (new).

## Architecture

### Dual Plan Assignment System

1. **Admin-Controlled** (Free):
   - Admins can assign any plan to any user
   - No payment required
   - Managed through AdminTab UI
   - Uses `admin_update_user_plan()` database function

2. **Stripe-Controlled** (Paid):
   - Users purchase subscriptions via Stripe Checkout
   - Automatic subscription management
   - Syncs to database via webhooks
   - Uses Edge Functions for all operations

## Deployed Edge Functions

All functions are deployed to: `https://jffnzpdcmdalxqhkfymx.supabase.co/functions/v1/`

### 1. create-checkout-session
**Purpose**: Initiates Stripe Checkout for new subscriptions

**Endpoint**: `POST /create-checkout-session`

**Request Body**:
```json
{
  "workspaceId": "uuid",
  "planType": "power-individual" | "team-pro",
  "seatCount": 2,
  "successUrl": "https://yourdomain.com/success",
  "cancelUrl": "https://yourdomain.com/cancel",
  "customerEmail": "user@example.com",
  "metadata": {}
}
```

**Response**:
```json
{
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

**Client Usage**:
```typescript
import { stripeEdgeFunctions } from './services/stripeEdgeFunctions';

const { url } = await stripeEdgeFunctions.createCheckoutSession({
  workspaceId: workspace.id,
  planType: 'team-pro',
  seatCount: 5,
  successUrl: `${window.location.origin}/success`,
  cancelUrl: `${window.location.origin}/cancel`,
  customerEmail: user.email,
});

// Redirect to Stripe Checkout
window.location.href = url;
```

### 2. create-portal-session
**Purpose**: Generates Stripe Customer Portal access

**Endpoint**: `POST /create-portal-session`

**Request Body**:
```json
{
  "customerId": "cus_...",
  "returnUrl": "https://yourdomain.com/settings"
}
```

**Response**:
```json
{
  "url": "https://billing.stripe.com/..."
}
```

**Client Usage**:
```typescript
const { url } = await stripeEdgeFunctions.createPortalSession({
  customerId: workspace.stripeCustomerId,
  returnUrl: `${window.location.origin}/settings`,
});

window.location.href = url;
```

### 3. update-subscription-seats
**Purpose**: Modifies team plan seat count

**Endpoint**: `POST /update-subscription-seats`

**Request Body**:
```json
{
  "subscriptionId": "sub_...",
  "workspaceId": "uuid",
  "seatCount": 10
}
```

**Response**:
```json
{
  "success": true
}
```

**Client Usage**:
```typescript
await stripeEdgeFunctions.updateSubscriptionSeats({
  subscriptionId: workspace.stripeSubscriptionId,
  workspaceId: workspace.id,
  seatCount: 10,
});
```

### 4. cancel-subscription
**Purpose**: Cancels subscription (immediate or at period end)

**Endpoint**: `POST /cancel-subscription`

**Request Body**:
```json
{
  "subscriptionId": "sub_...",
  "workspaceId": "uuid",
  "immediate": false
}
```

**Response**:
```json
{
  "success": true,
  "status": "active" | "canceled"
}
```

### 5. reactivate-subscription
**Purpose**: Resumes a canceled subscription

**Endpoint**: `POST /reactivate-subscription`

**Request Body**:
```json
{
  "subscriptionId": "sub_...",
  "workspaceId": "uuid"
}
```

**Response**:
```json
{
  "success": true,
  "status": "active"
}
```

### 6. stripe-webhook
**Purpose**: Processes Stripe webhook events

**Endpoint**: `POST /stripe-webhook`

**Handled Events**:
- `checkout.session.completed` - New subscription created
- `customer.subscription.created` - Subscription lifecycle events
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid` - Payment successful
- `invoice.payment_failed` - Payment failed

**Webhook Configuration**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://jffnzpdcmdalxqhkfymx.supabase.co/functions/v1/stripe-webhook`
3. Select events: checkout.session.completed, customer.subscription.*, invoice.*
4. Copy webhook signing secret
5. Add to Supabase: `STRIPE_WEBHOOK_SECRET`

## Environment Variables

All variables are already configured in Supabase Edge Functions:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_POWER_INDIVIDUAL=price_...
STRIPE_PRICE_TEAM_PRO_BASE=price_...
STRIPE_PRICE_TEAM_PRO_SEAT=price_...
STRIPE_MIN_TEAM_SEATS=2

# Supabase Configuration
SUPABASE_URL=https://jffnzpdcmdalxqhkfymx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

## Database Schema

### subscriptions table
```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  plan_type plan_type NOT NULL,
  status TEXT,
  seat_count INTEGER,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### workspaces table (relevant columns)
```sql
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE workspaces ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
```

## Client Integration Examples

### Example 1: Upgrade to Team Pro
```typescript
import { stripeEdgeFunctions } from './services/stripeEdgeFunctions';
import { useWorkspace } from './contexts/WorkspaceContext';

function UpgradeButton() {
  const { workspace } = useWorkspace();

  const handleUpgrade = async () => {
    try {
      const { url } = await stripeEdgeFunctions.createCheckoutSession({
        workspaceId: workspace.id,
        planType: 'team-pro',
        seatCount: 5,
        successUrl: `${window.location.origin}/success`,
        cancelUrl: `${window.location.origin}/settings`,
        customerEmail: user.email,
      });

      window.location.href = url;
    } catch (error) {
      console.error('Upgrade failed:', error);
    }
  };

  return <button onClick={handleUpgrade}>Upgrade to Team Pro</button>;
}
```

### Example 2: Manage Subscription (Customer Portal)
```typescript
function ManageSubscriptionButton() {
  const { workspace } = useWorkspace();

  const handleManage = async () => {
    try {
      const { url } = await stripeEdgeFunctions.createPortalSession({
        customerId: workspace.stripeCustomerId,
        returnUrl: `${window.location.origin}/settings`,
      });

      window.location.href = url;
    } catch (error) {
      console.error('Portal access failed:', error);
    }
  };

  return <button onClick={handleManage}>Manage Subscription</button>;
}
```

### Example 3: Update Seat Count
```typescript
function SeatCountManager() {
  const { workspace } = useWorkspace();
  const [seatCount, setSeatCount] = useState(workspace.seatCount);

  const handleUpdateSeats = async () => {
    try {
      await stripeEdgeFunctions.updateSubscriptionSeats({
        subscriptionId: workspace.stripeSubscriptionId,
        workspaceId: workspace.id,
        seatCount,
      });

      // Refresh workspace data
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
    } catch (error) {
      console.error('Seat update failed:', error);
    }
  };

  return (
    <div>
      <input
        type="number"
        value={seatCount}
        onChange={(e) => setSeatCount(Number(e.target.value))}
        min={2}
      />
      <button onClick={handleUpdateSeats}>Update Seats</button>
    </div>
  );
}
```

## Testing Checklist

### Stripe Test Mode
1. Use test API keys: `sk_test_...`
2. Use test card: `4242 4242 4242 4242`
3. Test webhook events with Stripe CLI:
   ```bash
   stripe listen --forward-to https://jffnzpdcmdalxqhkfymx.supabase.co/functions/v1/stripe-webhook
   stripe trigger checkout.session.completed
   ```

### Production Testing
- [ ] Verify all Edge Functions deployed successfully
- [ ] Confirm environment variables set in Supabase
- [ ] Test checkout session creation
- [ ] Test customer portal access
- [ ] Test seat count updates
- [ ] Test subscription cancellation
- [ ] Test subscription reactivation
- [ ] Verify webhook signature validation
- [ ] Confirm database sync after Stripe events
- [ ] Test both admin-controlled and Stripe-controlled plan assignments

## Security Considerations

1. **Webhook Signature Verification**: All webhook events validate Stripe signatures
2. **JWT Authentication**: All Edge Functions require valid Supabase JWT
3. **Service Role Key**: Used only in Edge Functions, never exposed to client
4. **Workspace Validation**: Functions verify workspace ownership before operations
5. **Metadata Tracking**: All Stripe objects include workspace_id for auditing

## Monitoring & Logging

### Edge Function Logs
View logs in Supabase Dashboard:
1. Go to Edge Functions section
2. Select function
3. View Invocations tab

### Stripe Dashboard
Monitor subscription lifecycle:
1. Customers - View customer details
2. Subscriptions - Track subscription status
3. Events - View webhook delivery status
4. Logs - Debug API calls

## Troubleshooting

### Issue: Webhook not receiving events
**Solution**: 
1. Check webhook endpoint in Stripe Dashboard
2. Verify STRIPE_WEBHOOK_SECRET is correct
3. Test with Stripe CLI: `stripe listen --forward-to <url>`

### Issue: Checkout session creation fails
**Solution**:
1. Verify price IDs are correct
2. Check plan_type matches enum values
3. Ensure seat count >= STRIPE_MIN_TEAM_SEATS

### Issue: Database not syncing
**Solution**:
1. Check Edge Function logs for errors
2. Verify workspace_id in metadata
3. Confirm RLS policies allow updates

## Deployment Status

✅ All Edge Functions deployed (November 16, 2025)
✅ Shared utilities configured
✅ Client service layer created
✅ Environment variables configured
✅ Webhook endpoint ready

## Next Steps

1. **Update SettingsTab**: Add Stripe checkout/portal buttons
2. **Update Subscription Banner**: Integrate Edge Functions
3. **Configure Stripe Webhook**: Point to deployed webhook function
4. **Test End-to-End**: Complete subscription flow
5. **Monitor Production**: Watch for webhook events and Edge Function invocations
