/* eslint-env deno */

/**
 * API Balance Auto-Reload Management
 * 
 * Actions:
 * - setup: Create Stripe SetupIntent to save payment method
 * - toggle: Enable/disable auto-reload
 * - update: Update threshold and reload amount
 * - remove: Remove saved payment method
 * - trigger: Process auto-reload (called by balance check)
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  stripe,
  supabaseAdmin,
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
    const { action, workspaceId } = body;

    if (!workspaceId) {
      return jsonResponse({ error: 'Missing workspaceId' }, { status: 400 });
    }

    // Verify workspace exists
    const { data: workspace, error: workspaceError } = await supabaseAdmin
      .from('workspaces')
      .select('id, name, owner_id')
      .eq('id', workspaceId)
      .single();

    if (workspaceError || !workspace) {
      return jsonResponse({ error: 'Workspace not found' }, { status: 404 });
    }

    switch (action) {
      case 'setup':
        return await handleSetup(body, workspace);
      case 'toggle':
        return await handleToggle(body);
      case 'update':
        return await handleUpdate(body);
      case 'remove':
        return await handleRemove(body);
      case 'trigger':
        return await handleTrigger(body);
      default:
        return jsonResponse({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('api-balance-auto-reload error:', error);
    return jsonResponse({ error: error.message }, { status: 500 });
  }
});

/**
 * Setup: Create Stripe Checkout Session in setup mode to save payment method
 */
async function handleSetup(
  body: { workspaceId: string; thresholdCents: number; reloadAmountCents: number; successUrl: string; cancelUrl: string },
  workspace: { id: string; name: string; owner_id: string }
) {
  const { workspaceId, thresholdCents, reloadAmountCents, successUrl, cancelUrl } = body;

  if (!successUrl || !cancelUrl) {
    return jsonResponse({ error: 'Missing successUrl or cancelUrl' }, { status: 400 });
  }

  // Validate thresholds
  if (thresholdCents < 100 || thresholdCents > 10000) {
    return jsonResponse({ error: 'Threshold must be between $1 and $100' }, { status: 400 });
  }
  if (reloadAmountCents < 500 || reloadAmountCents > 50000) {
    return jsonResponse({ error: 'Reload amount must be between $5 and $500' }, { status: 400 });
  }

  // Check for existing Stripe customer from subscription
  const { data: existingSubscription } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  let customerId = existingSubscription?.stripe_customer_id;

  // Create customer if needed
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: {
        workspace_id: workspaceId,
        workspace_name: workspace.name,
      },
    });
    customerId = customer.id;
  }

  // Create Checkout Session in setup mode
  const session = await stripe.checkout.sessions.create({
    mode: 'setup',
    payment_method_types: ['card'],
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      type: 'api_auto_reload_setup',
      workspace_id: workspaceId,
      threshold_cents: thresholdCents.toString(),
      reload_amount_cents: reloadAmountCents.toString(),
    },
  });

  return jsonResponse({ sessionId: session.id, url: session.url });
}

/**
 * Toggle: Enable/disable auto-reload
 */
async function handleToggle(body: { workspaceId: string; enabled: boolean }) {
  const { workspaceId, enabled } = body;

  // Check if auto-reload settings exist
  const { data: existing, error: fetchError } = await supabaseAdmin
    .from('api_balance_auto_reload')
    .select('id, stripe_payment_method_id')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (fetchError) {
    console.error('Error fetching auto-reload settings:', fetchError);
    return jsonResponse({ error: 'Failed to fetch settings' }, { status: 500 });
  }

  if (!existing) {
    return jsonResponse({ error: 'Auto-reload not set up yet' }, { status: 400 });
  }

  if (!existing.stripe_payment_method_id && enabled) {
    return jsonResponse({ error: 'No payment method on file' }, { status: 400 });
  }

  // Update enabled status
  const { error: updateError } = await supabaseAdmin
    .from('api_balance_auto_reload')
    .update({ 
      is_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId);

  if (updateError) {
    console.error('Error updating auto-reload:', updateError);
    return jsonResponse({ error: 'Failed to update settings' }, { status: 500 });
  }

  return jsonResponse({ success: true, enabled });
}

/**
 * Update: Change threshold and reload amount
 */
async function handleUpdate(body: { workspaceId: string; thresholdCents: number; reloadAmountCents: number }) {
  const { workspaceId, thresholdCents, reloadAmountCents } = body;

  // Validate
  if (thresholdCents < 100 || thresholdCents > 10000) {
    return jsonResponse({ error: 'Threshold must be between $1 and $100' }, { status: 400 });
  }
  if (reloadAmountCents < 500 || reloadAmountCents > 50000) {
    return jsonResponse({ error: 'Reload amount must be between $5 and $500' }, { status: 400 });
  }

  // Update settings
  const { error: updateError } = await supabaseAdmin
    .from('api_balance_auto_reload')
    .update({ 
      threshold_cents: thresholdCents,
      reload_amount_cents: reloadAmountCents,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId);

  if (updateError) {
    console.error('Error updating auto-reload settings:', updateError);
    return jsonResponse({ error: 'Failed to update settings' }, { status: 500 });
  }

  return jsonResponse({ success: true });
}

/**
 * Remove: Delete payment method and disable auto-reload
 */
async function handleRemove(body: { workspaceId: string }) {
  const { workspaceId } = body;

  // Get current settings
  const { data: existing } = await supabaseAdmin
    .from('api_balance_auto_reload')
    .select('stripe_payment_method_id')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (existing?.stripe_payment_method_id) {
    // Detach payment method from Stripe
    try {
      await stripe.paymentMethods.detach(existing.stripe_payment_method_id);
    } catch (err) {
      console.warn('Failed to detach payment method:', err);
      // Continue anyway - might already be detached
    }
  }

  // Delete the record
  const { error: deleteError } = await supabaseAdmin
    .from('api_balance_auto_reload')
    .delete()
    .eq('workspace_id', workspaceId);

  if (deleteError) {
    console.error('Error deleting auto-reload settings:', deleteError);
    return jsonResponse({ error: 'Failed to remove settings' }, { status: 500 });
  }

  return jsonResponse({ success: true });
}

/**
 * Trigger: Process auto-reload when balance is low
 * This is called by the API balance check function
 */
async function handleTrigger(body: { workspaceId: string }) {
  const { workspaceId } = body;

  // Get auto-reload settings
  const { data: settings, error: settingsError } = await supabaseAdmin
    .from('api_balance_auto_reload')
    .select('*')
    .eq('workspace_id', workspaceId)
    .single();

  if (settingsError || !settings) {
    return jsonResponse({ error: 'Auto-reload not configured' }, { status: 400 });
  }

  if (!settings.is_enabled) {
    return jsonResponse({ error: 'Auto-reload is disabled' }, { status: 400 });
  }

  if (!settings.stripe_payment_method_id) {
    return jsonResponse({ error: 'No payment method on file' }, { status: 400 });
  }

  // Check current balance
  const { data: workspace } = await supabaseAdmin
    .from('workspaces')
    .select('api_balance_cents')
    .eq('id', workspaceId)
    .single();

  if (!workspace) {
    return jsonResponse({ error: 'Workspace not found' }, { status: 404 });
  }

  // Only trigger if balance is below threshold
  if (workspace.api_balance_cents >= settings.threshold_cents) {
    return jsonResponse({ 
      triggered: false, 
      reason: 'Balance above threshold',
      balance: workspace.api_balance_cents,
      threshold: settings.threshold_cents,
    });
  }

  // Get customer ID
  const { data: subscription } = await supabaseAdmin
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('workspace_id', workspaceId)
    .maybeSingle();

  if (!subscription?.stripe_customer_id) {
    await recordReloadError(workspaceId, 'No Stripe customer found');
    return jsonResponse({ error: 'No Stripe customer found' }, { status: 400 });
  }

  try {
    // Create PaymentIntent with saved payment method
    const paymentIntent = await stripe.paymentIntents.create({
      amount: settings.reload_amount_cents,
      currency: 'usd',
      customer: subscription.stripe_customer_id,
      payment_method: settings.stripe_payment_method_id,
      off_session: true,
      confirm: true,
      metadata: {
        type: 'api_auto_reload',
        workspace_id: workspaceId,
        threshold_cents: settings.threshold_cents.toString(),
      },
    });

    if (paymentIntent.status === 'succeeded') {
      // Add balance
      const { error: balanceError } = await supabaseAdmin.rpc('add_api_balance', {
        p_workspace_id: workspaceId,
        p_amount_cents: settings.reload_amount_cents,
        p_type: 'topup',
        p_description: `Auto-reload: $${(settings.reload_amount_cents / 100).toFixed(2)}`,
        p_stripe_payment_intent_id: paymentIntent.id,
        p_metadata: { auto_reload: true },
      });

      if (balanceError) {
        console.error('Failed to add balance after successful payment:', balanceError);
        // Payment succeeded but balance add failed - needs manual intervention
        await recordReloadError(workspaceId, 'Payment succeeded but balance add failed');
        return jsonResponse({ error: 'Balance add failed after payment' }, { status: 500 });
      }

      // Update auto-reload record
      await supabaseAdmin
        .from('api_balance_auto_reload')
        .update({
          last_reload_at: new Date().toISOString(),
          last_reload_error: null,
          consecutive_failures: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('workspace_id', workspaceId);

      return jsonResponse({ 
        triggered: true, 
        amount: settings.reload_amount_cents,
        paymentIntentId: paymentIntent.id,
      });
    } else {
      await recordReloadError(workspaceId, `Payment status: ${paymentIntent.status}`);
      return jsonResponse({ 
        error: 'Payment not completed',
        status: paymentIntent.status,
      }, { status: 400 });
    }
  } catch (err) {
    console.error('Auto-reload payment failed:', err);
    await recordReloadError(workspaceId, err.message);
    
    // Check if we should disable auto-reload after too many failures
    const { data: updated } = await supabaseAdmin
      .from('api_balance_auto_reload')
      .select('consecutive_failures')
      .eq('workspace_id', workspaceId)
      .single();

    if (updated && updated.consecutive_failures >= 3) {
      // Disable auto-reload after 3 consecutive failures
      await supabaseAdmin
        .from('api_balance_auto_reload')
        .update({ is_enabled: false })
        .eq('workspace_id', workspaceId);
    }

    return jsonResponse({ error: err.message }, { status: 400 });
  }
}

/**
 * Record a reload error
 */
async function recordReloadError(workspaceId: string, errorMessage: string) {
  await supabaseAdmin
    .from('api_balance_auto_reload')
    .update({
      last_reload_error: errorMessage,
      consecutive_failures: supabaseAdmin.sql`consecutive_failures + 1`,
      updated_at: new Date().toISOString(),
    })
    .eq('workspace_id', workspaceId);
}
