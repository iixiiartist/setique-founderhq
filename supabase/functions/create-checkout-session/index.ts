// Supabase Edge Function: create-checkout-session
// Creates a Stripe Checkout Session for subscription purchases

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Stripe
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Parse request body
    const {
      workspaceId,
      planType,
      seatCount,
      lineItems,
      customerEmail,
      successUrl,
      cancelUrl,
      metadata
    } = await req.json()

    // Validate required fields
    if (!workspaceId || !planType || !lineItems || !customerEmail) {
      throw new Error('Missing required fields')
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: lineItems,
      customer_email: customerEmail,
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        ...metadata,
        workspace_id: workspaceId,
        plan_type: planType,
        seat_count: seatCount?.toString() || '1',
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          plan_type: planType,
          seat_count: seatCount?.toString() || '1',
        },
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    })

    return new Response(
      JSON.stringify({
        sessionId: session.id,
        url: session.url,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
