/* eslint-env deno */

import Stripe from 'https://esm.sh/stripe@16.10.0?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const STRIPE_API_VERSION = '2023-10-16';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: STRIPE_API_VERSION,
});
stripe.setMaxNetworkRetries(2);

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL environment variable');
}

if (!supabaseServiceKey) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

const priceTeamProBase = Deno.env.get('STRIPE_PRICE_TEAM_PRO_BASE');
const priceTeamProSeat = Deno.env.get('STRIPE_PRICE_TEAM_PRO_SEAT');

// Simplified pricing: only Team Pro (base + per-seat)
export const STRIPE_PRICE_IDS = {
  teamProBase: priceTeamProBase,
  teamProSeat: priceTeamProSeat,
};

// Minimum team seats is now 1 (owner included in base price)
export const MINIMUM_TEAM_SEATS = Number(Deno.env.get('STRIPE_MIN_TEAM_SEATS') ?? '1');

export function assertPriceIdsConfigured(plan: string) {
  if (plan === 'team-pro') {
    if (!STRIPE_PRICE_IDS.teamProBase) {
      throw new Error('STRIPE_PRICE_TEAM_PRO_BASE is not configured');
    }
    if (!STRIPE_PRICE_IDS.teamProSeat) {
      throw new Error('STRIPE_PRICE_TEAM_PRO_SEAT is not configured');
    }
  }
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function jsonResponse(body: Record<string, unknown>, init?: ResponseInit) {
  const headers = new Headers({
    'Content-Type': 'application/json',
    ...corsHeaders,
  });

  if (init?.headers) {
    const extra = new Headers(init.headers);
    extra.forEach((value, key) => headers.set(key, value));
  }

  const responseInit: ResponseInit = {
    ...init,
    headers,
  };

  return new Response(JSON.stringify(body), responseInit);
}
