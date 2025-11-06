// Supabase Edge Function: stripe-webhook
// Handles Stripe webhook events to keep subscriptions in sync

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stripeKey || !webhookSecret) {
      throw new Error('Stripe keys not configured')
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Initialize Supabase client with service role key (bypasses RLS)
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify webhook signature
    const signature = req.headers.get('stripe-signature')
    if (!signature) {
      throw new Error('No signature provided')
    }

    const body = await req.text()
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret)

    console.log('Stripe webhook event:', event.type)

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        await handleCheckoutCompleted(supabase, session)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionUpdated(supabase, subscription)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionDeleted(supabase, subscription)
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoicePaid(supabase, invoice)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        await handleInvoiceFailed(supabase, invoice)
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

// Handle successful checkout
async function handleCheckoutCompleted(supabase: any, session: Stripe.Checkout.Session) {
  const workspaceId = session.metadata?.workspace_id
  const planType = session.metadata?.plan_type
  const seatCount = parseInt(session.metadata?.seat_count || '1')

  if (!workspaceId || !planType) {
    console.error('Missing metadata in checkout session')
    return
  }

  // Get subscription details
  const subscriptionId = session.subscription as string
  const customerId = session.customer as string

  // Create or update subscription record
  const { error } = await supabase
    .from('subscriptions')
    .upsert({
      workspace_id: workspaceId,
      plan_type: planType,
      status: 'active',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      seat_count: seatCount,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      cancel_at_period_end: false,
    }, {
      onConflict: 'workspace_id'
    })

  if (error) {
    console.error('Error creating subscription:', error)
  } else {
    console.log('Subscription created for workspace:', workspaceId)
  }
}

// Handle subscription updates (including seat count changes)
async function handleSubscriptionUpdated(supabase: any, subscription: Stripe.Subscription) {
  const workspaceId = subscription.metadata?.workspace_id
  const planType = subscription.metadata?.plan_type
  const seatCount = parseInt(subscription.metadata?.seat_count || '1')

  if (!workspaceId) {
    console.error('Missing workspace_id in subscription metadata')
    return
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: subscription.status,
      seat_count: seatCount,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error updating subscription:', error)
  } else {
    console.log('Subscription updated for workspace:', workspaceId)
  }
}

// Handle subscription deletion/cancellation
async function handleSubscriptionDeleted(supabase: any, subscription: Stripe.Subscription) {
  const workspaceId = subscription.metadata?.workspace_id

  if (!workspaceId) {
    console.error('Missing workspace_id in subscription metadata')
    return
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id)

  if (error) {
    console.error('Error canceling subscription:', error)
  } else {
    console.log('Subscription canceled for workspace:', workspaceId)
  }
}

// Handle successful invoice payment
async function handleInvoicePaid(supabase: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    return
  }

  // Update subscription status to active
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('Error updating subscription after payment:', error)
  } else {
    console.log('Payment confirmed for subscription:', subscriptionId)
  }
}

// Handle failed invoice payment
async function handleInvoiceFailed(supabase: any, invoice: Stripe.Invoice) {
  const subscriptionId = invoice.subscription as string

  if (!subscriptionId) {
    return
  }

  // Update subscription status to past_due
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'past_due',
    })
    .eq('stripe_subscription_id', subscriptionId)

  if (error) {
    console.error('Error updating subscription after failed payment:', error)
  } else {
    console.log('Payment failed for subscription:', subscriptionId)
  }
}
