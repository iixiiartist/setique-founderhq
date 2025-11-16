/* eslint-env deno */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { stripe, jsonResponse } from '../_shared/config.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const body = await req.json();
    const { customerId, returnUrl } = body;

    if (!customerId || !returnUrl) {
      return jsonResponse({ error: 'customerId and returnUrl are required' }, { status: 400 });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error('create-portal-session error', error);
    return jsonResponse({ error: error.message }, { status: 500 });
  }
});
