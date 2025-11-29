/* eslint-env deno */

/**
 * API Balance Top-up
 * Creates a Stripe checkout session for adding API balance
 * 
 * POST /api-balance-topup
 * Body: { workspaceId, amountCents, successUrl, cancelUrl }
 * 
 * amountCents: Amount in cents (minimum $5 = 500 cents)
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  stripe,
  supabaseAdmin,
  jsonResponse,
  corsHeaders,
} from '../_shared/config.ts';

// Minimum top-up is $5
const MINIMUM_TOPUP_CENTS = 500;
// Maximum top-up is $1000
const MAXIMUM_TOPUP_CENTS = 100000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.json();
    const {
      workspaceId,
      amountCents,
      successUrl,
      cancelUrl,
      customerEmail,
    } = body;

    // Validate required fields
    if (!workspaceId || !amountCents || !successUrl || !cancelUrl) {
      return jsonResponse({ 
        error: 'Missing required fields: workspaceId, amountCents, successUrl, cancelUrl' 
      }, { status: 400 });
    }

    // Validate amount
    const amount = Number(amountCents);
    if (isNaN(amount) || amount < MINIMUM_TOPUP_CENTS) {
      return jsonResponse({ 
        error: `Minimum top-up amount is $${(MINIMUM_TOPUP_CENTS / 100).toFixed(2)}` 
      }, { status: 400 });
    }

    if (amount > MAXIMUM_TOPUP_CENTS) {
      return jsonResponse({ 
        error: `Maximum top-up amount is $${(MAXIMUM_TOPUP_CENTS / 100).toFixed(2)}` 
      }, { status: 400 });
    }

    // Verify workspace exists
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .select('id, name, owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return jsonResponse({ error: 'Workspace not found' }, { status: 404 });
    }

    // Check for existing Stripe customer from subscription
    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    const customerId = existingSubscription?.stripe_customer_id || undefined;

    // Calculate how many API calls this will provide
    const estimatedCalls = amount * 10; // 0.1 cents per call = 10 calls per cent

    // Create Stripe checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      metadata: {
        type: 'api_balance_topup',
        workspace_id: workspaceId,
        amount_cents: amount.toString(),
        estimated_calls: estimatedCalls.toString(),
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            unit_amount: amount,
            product_data: {
              name: 'API Balance Top-up',
              description: `Add $${(amount / 100).toFixed(2)} to your API balance (~${estimatedCalls.toLocaleString()} API calls)`,
              metadata: {
                type: 'api_balance',
              },
            },
          },
          quantity: 1,
        },
      ],
      // Allow customer to adjust quantity up to reasonable limit
      payment_intent_data: {
        metadata: {
          type: 'api_balance_topup',
          workspace_id: workspaceId,
          amount_cents: amount.toString(),
        },
      },
    });

    return jsonResponse({ 
      sessionId: session.id, 
      url: session.url,
      estimatedCalls,
    });
  } catch (error) {
    console.error('api-balance-topup error:', error);
    return jsonResponse({ error: error.message }, { status: 500 });
  }
});
