/* eslint-env deno */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import type Stripe from 'https://esm.sh/stripe@16.10.0?target=deno';
import { stripe, jsonResponse } from '../_shared/config.ts';
import {
  updateSubscriptionRecord,
  getWorkspaceIdBySubscriptionId,
} from '../_shared/subscriptions.ts';

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
if (!webhookSecret) {
  throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
}

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : session.subscription?.id;

  if (!subscriptionId) {
    console.warn('checkout.session.completed missing subscription id');
    return;
  }

  const workspaceId = (session.metadata?.workspace_id || session.client_reference_id) as string | undefined;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const resolvedWorkspaceId = workspaceId || (subscription.metadata?.workspace_id as string | undefined);

  if (!resolvedWorkspaceId) {
    console.warn('No workspace id attached to checkout session');
    return;
  }

  await updateSubscriptionRecord(resolvedWorkspaceId, subscription);
}

async function handleSubscriptionEvent(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const workspaceId = (subscription.metadata?.workspace_id as string | undefined)
    ?? await getWorkspaceIdBySubscriptionId(subscription.id);

  if (!workspaceId) {
    console.warn('Subscription event missing workspace id', subscription.id);
    return;
  }

  await updateSubscriptionRecord(workspaceId, subscription);
}

async function handleInvoiceEvent(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  if (!invoice.subscription) return;

  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription.id;

  const workspaceId = await getWorkspaceIdBySubscriptionId(subscriptionId);
  if (!workspaceId) {
    console.warn('Invoice event missing workspace binding');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await updateSubscriptionRecord(workspaceId, subscription);
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return jsonResponse({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error('Invalid Stripe signature', err);
    return jsonResponse({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionEvent(event);
        break;
      case 'invoice.paid':
      case 'invoice.payment_failed':
        await handleInvoiceEvent(event);
        break;
      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('stripe-webhook handler error', error);
    return jsonResponse({ error: error.message }, { status: 500 });
  }
});
