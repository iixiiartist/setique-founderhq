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

const pricePowerIndividual = Deno.env.get('STRIPE_PRICE_POWER_INDIVIDUAL');
const priceTeamProBase = Deno.env.get('STRIPE_PRICE_TEAM_PRO_BASE');
const priceTeamProSeat = Deno.env.get('STRIPE_PRICE_TEAM_PRO_SEAT');

export const STRIPE_PRICE_IDS = {
  powerIndividual: pricePowerIndividual,
  teamProBase: priceTeamProBase,
  teamProSeat: priceTeamProSeat,
};

export const MINIMUM_TEAM_SEATS = Number(Deno.env.get('STRIPE_MIN_TEAM_SEATS') ?? '2');

export function assertPriceIdsConfigured(plan: string) {
  if (plan === 'power-individual' && !STRIPE_PRICE_IDS.powerIndividual) {
    throw new Error('STRIPE_PRICE_POWER_INDIVIDUAL is not configured');
  }
  if (plan === 'team-pro') {
    if (!STRIPE_PRICE_IDS.teamProBase) {
      throw new Error('STRIPE_PRICE_TEAM_PRO_BASE is not configured');
    }
    if (!STRIPE_PRICE_IDS.teamProSeat) {
      throw new Error('STRIPE_PRICE_TEAM_PRO_SEAT is not configured');
    }
  }
}

export function jsonResponse(body: Record<string, unknown>, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
}
