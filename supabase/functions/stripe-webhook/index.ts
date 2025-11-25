/* eslint-env deno */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
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

// Admin client for webhook events table
const getAdminClient = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );
};

// Idempotency check - returns true if event should be processed
async function checkAndRecordEvent(event: Stripe.Event): Promise<{ shouldProcess: boolean; attempts: number }> {
  const supabase = getAdminClient();
  
  // Check if already processed
  const { data: existing } = await supabase
    .from('webhook_events')
    .select('id, status, attempts')
    .eq('event_id', event.id)
    .single();

  if (existing?.status === 'completed') {
    console.log(`[stripe-webhook] Event ${event.id} already processed, skipping`);
    return { shouldProcess: false, attempts: existing.attempts };
  }

  // Insert or update to 'processing'
  const { error: upsertError } = await supabase
    .from('webhook_events')
    .upsert({
      event_id: event.id,
      event_type: event.type,
      status: 'processing',
      payload: event.data.object,
      attempts: (existing?.attempts || 0) + 1
    }, { onConflict: 'event_id' });

  if (upsertError) {
    console.error('[stripe-webhook] Failed to record event', upsertError);
    // Continue processing anyway - better to potentially double-process than miss
  }

  return { shouldProcess: true, attempts: (existing?.attempts || 0) + 1 };
}

// Mark event as completed or failed
async function finalizeEvent(eventId: string, success: boolean, errorMessage?: string) {
  const supabase = getAdminClient();
  
  await supabase
    .from('webhook_events')
    .update({
      status: success ? 'completed' : 'failed',
      processed_at: success ? new Date().toISOString() : null,
      error_message: errorMessage || null
    })
    .eq('event_id', eventId);
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

  // Idempotency check
  const { shouldProcess } = await checkAndRecordEvent(event);
  if (!shouldProcess) {
    return jsonResponse({ received: true, skipped: true });
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

    // Mark as completed
    await finalizeEvent(event.id, true);
    return jsonResponse({ received: true });
  } catch (error) {
    console.error('stripe-webhook handler error', error);
    // Mark as failed
    await finalizeEvent(event.id, false, error.message);
    return jsonResponse({ error: 'Processing failed' }, { status: 500 });
  }
});
