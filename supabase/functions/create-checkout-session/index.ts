/* eslint-env deno */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  stripe,
  STRIPE_PRICE_IDS,
  MINIMUM_TEAM_SEATS,
  supabaseAdmin,
  assertPriceIdsConfigured,
  jsonResponse,
  corsHeaders,
} from '../_shared/config.ts';

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
      planType,
      seatCount = 1,
      successUrl,
      cancelUrl,
      customerEmail,
      metadata = {},
    } = body;

    if (!workspaceId || !planType || !successUrl || !cancelUrl) {
      return jsonResponse({ error: 'Missing required fields' }, { status: 400 });
    }

    const normalizedPlan = planType as string;
    assertPriceIdsConfigured(normalizedPlan);

    let lineItems: Array<{ price: string; quantity: number }> = [];
    const requestedSeatCount = Number(seatCount) || 1;
    const sanitizedSeatCount = Math.max(MINIMUM_TEAM_SEATS, requestedSeatCount);

    if (normalizedPlan === 'team-pro') {
      // Team Pro: Base price ($49 includes owner) + extra seats at $25 each
      const extraSeats = Math.max(0, sanitizedSeatCount - 1);
      lineItems = [{ price: STRIPE_PRICE_IDS.teamProBase!, quantity: 1 }];
      if (extraSeats > 0) {
        lineItems.push({ price: STRIPE_PRICE_IDS.teamProSeat!, quantity: extraSeats });
      }
    } else {
      return jsonResponse({ error: 'Unsupported plan type. Only team-pro is available.' }, { status: 400 });
    }

    const { data: existingSubscription } = await supabaseAdmin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    const customerId = existingSubscription?.stripe_customer_id || undefined;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      allow_promotion_codes: true,
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId,
      customer_email: customerId ? undefined : customerEmail,
      metadata: {
        workspace_id: workspaceId,
        plan_type: normalizedPlan,
        seat_count: sanitizedSeatCount.toString(),
        ...metadata,
      },
      subscription_data: {
        metadata: {
          workspace_id: workspaceId,
          plan_type: normalizedPlan,
          seat_count: sanitizedSeatCount.toString(),
          ...metadata,
        },
      },
      line_items: lineItems,
    });

    return jsonResponse({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('create-checkout-session error', error);
    return jsonResponse({ error: error.message }, { status: 500 });
  }
});
