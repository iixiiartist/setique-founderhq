/* eslint-env deno */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { stripe, jsonResponse } from '../_shared/config.ts';
import { updateSubscriptionRecord } from '../_shared/subscriptions.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.json();
    const { subscriptionId, immediate = false, workspaceId } = body;

    if (!subscriptionId || !workspaceId) {
      return jsonResponse({ error: 'subscriptionId and workspaceId are required' }, { status: 400 });
    }

    let subscription;
    if (immediate) {
      subscription = await stripe.subscriptions.cancel(subscriptionId);
    } else {
      subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });
    }

    await updateSubscriptionRecord(workspaceId, subscription);

    return jsonResponse({ success: true, status: subscription.status });
  } catch (error) {
    console.error('cancel-subscription error', error);
    return jsonResponse({ error: error.message }, { status: 500 });
  }
});
