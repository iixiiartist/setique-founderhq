/* eslint-env deno */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  stripe,
  STRIPE_PRICE_IDS,
  MINIMUM_TEAM_SEATS,
  jsonResponse,
  supabaseAdmin,
} from '../_shared/config.ts';
import { updateSubscriptionRecord } from '../_shared/subscriptions.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.json();
    const { subscriptionId, seatCount, workspaceId } = body;

    if (!subscriptionId || !workspaceId) {
      return jsonResponse({ error: 'subscriptionId and workspaceId are required' }, { status: 400 });
    }

    if (!seatCount || seatCount < MINIMUM_TEAM_SEATS) {
      return jsonResponse({ error: `Seat count must be at least ${MINIMUM_TEAM_SEATS}` }, { status: 400 });
    }

    if (!STRIPE_PRICE_IDS.teamProSeat) {
      return jsonResponse({ error: 'STRIPE_PRICE_TEAM_PRO_SEAT is not configured' }, { status: 500 });
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ['items.data.price'],
    });

    const seatItem = subscription.items.data.find((item) => item.price?.id === STRIPE_PRICE_IDS.teamProSeat);

    if (!seatItem) {
      return jsonResponse({ error: 'Seat line item not found on subscription' }, { status: 400 });
    }

    await stripe.subscriptionItems.update(seatItem.id, { quantity: seatCount });

    const refreshedSubscription = await stripe.subscriptions.retrieve(subscriptionId);
    await updateSubscriptionRecord(workspaceId, refreshedSubscription);

    await supabaseAdmin
      .from('subscriptions')
      .update({ seat_count: seatCount })
      .eq('workspace_id', workspaceId);

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('update-subscription-seats error', error);
    return jsonResponse({ error: error.message }, { status: 500 });
  }
});
