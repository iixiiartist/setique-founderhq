// Supabase Edge Function: update-subscription-seats
// Updates the seat count for team subscriptions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!stripeKey) {
      throw new Error('STRIPE_SECRET_KEY not configured')
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing')
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { subscriptionId, seatCount, workspaceId } = await req.json()

    // Validate required fields
    if (!subscriptionId || !seatCount || !workspaceId) {
      throw new Error('Missing required fields')
    }

    if (seatCount < 2) {
      throw new Error('Team plans require at least 2 seats')
    }

    // Get the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId)

    // Find the per-seat price item in the subscription
    const seatItem = subscription.items.data.find(item => 
      item.price.metadata?.type === 'per_seat' || 
      item.price.nickname?.toLowerCase().includes('per user') ||
      item.price.nickname?.toLowerCase().includes('per seat')
    )

    if (!seatItem) {
      throw new Error('Could not find per-seat item in subscription')
    }

    // Update the quantity of the per-seat item
    await stripe.subscriptionItems.update(seatItem.id, {
      quantity: seatCount,
      proration_behavior: 'create_prorations', // Pro-rate the price change
    })

    // Update metadata on the subscription
    await stripe.subscriptions.update(subscriptionId, {
      metadata: {
        ...subscription.metadata,
        seat_count: seatCount.toString(),
      }
    })

    // Update in Supabase database
    const { error: dbError } = await supabase
      .from('subscriptions')
      .update({
        seat_count: seatCount,
      })
      .eq('workspace_id', workspaceId)

    if (dbError) {
      console.error('Error updating database:', dbError)
      // Don't throw - Stripe is updated, webhook will sync this later
    }

    return new Response(
      JSON.stringify({
        success: true,
        seatCount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error updating subscription seats:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
