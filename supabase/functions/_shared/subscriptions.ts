/* eslint-env deno */

import type Stripe from 'https://esm.sh/stripe@16.10.0?target=deno';
import { supabaseAdmin, STRIPE_PRICE_IDS } from './config.ts';

const TABLE = 'subscriptions';

const TEAM_SEAT_PRICE_IDS = [
  STRIPE_PRICE_IDS.teamProSeat,
].filter(Boolean) as string[];

function unixToIso(timestamp?: number | null): string | null {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toISOString();
}

export function getSeatCountFromSubscription(subscription: Stripe.Subscription): number {
  const metadataSeatCount = Number(subscription.metadata?.seat_count);
  if (!Number.isNaN(metadataSeatCount) && metadataSeatCount > 0) {
    return metadataSeatCount;
  }

  for (const item of subscription.items.data) {
    if (item.price?.id && TEAM_SEAT_PRICE_IDS.includes(item.price.id) && item.quantity) {
      return item.quantity;
    }
  }

  return 1;
}

export async function updateSubscriptionRecord(
  workspaceId: string,
  subscription: Stripe.Subscription,
) {
  const seatCount = getSeatCountFromSubscription(subscription);
  const planType = (subscription.metadata?.plan_type || 'power-individual') as string;
  const payload = {
    workspace_id: workspaceId,
    plan_type: planType,
    stripe_customer_id: typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id ?? null,
    stripe_subscription_id: subscription.id,
    stripe_price_id: subscription.items.data[0]?.price?.id ?? null,
    status: subscription.status,
    seat_count: seatCount,
    current_period_start: unixToIso(subscription.current_period_start),
    current_period_end: unixToIso(subscription.current_period_end),
    trial_start: unixToIso(subscription.trial_start),
    trial_end: unixToIso(subscription.trial_end),
    canceled_at: unixToIso(subscription.canceled_at),
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    metadata: subscription.metadata ?? {},
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from(TABLE)
    .upsert(payload, { onConflict: 'workspace_id' });

  if (error) {
    throw error;
  }
  
  // Also update workspace plan and seats
  await supabaseAdmin
    .from('workspaces')
    .update({
      plan_type: planType,
      seats: seatCount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', workspaceId);
}

export async function getWorkspaceIdBySubscriptionId(subscriptionId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from(TABLE)
    .select('workspace_id')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.workspace_id ?? null;
}
