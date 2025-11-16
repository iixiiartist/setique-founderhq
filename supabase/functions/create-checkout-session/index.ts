/* eslint-env deno */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  stripe,
  STRIPE_PRICE_IDS,
  MINIMUM_TEAM_SEATS,
  supabaseAdmin,
  assertPriceIdsConfigured,
  jsonResponse,
} from '../_shared/config.ts';

serve(async (req) => {
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
    const sanitizedSeatCount = normalizedPlan === 'team-pro'
      ? Math.max(MINIMUM_TEAM_SEATS, requestedSeatCount)
      : 1;

    if (normalizedPlan === 'power-individual') {
      lineItems = [{ price: STRIPE_PRICE_IDS.powerIndividual!, quantity: 1 }];
    } else if (normalizedPlan === 'team-pro') {
      lineItems = [
        { price: STRIPE_PRICE_IDS.teamProBase!, quantity: 1 },
        { price: STRIPE_PRICE_IDS.teamProSeat!, quantity: sanitizedSeatCount },
      ];
    } else {
      return jsonResponse({ error: 'Unsupported plan type' }, { status: 400 });
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
