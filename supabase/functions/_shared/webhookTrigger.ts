// supabase/functions/_shared/webhookTrigger.ts
// Helper to trigger webhook events from API endpoints

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================
// TYPES
// ============================================

export type WebhookEventType =
  // Contact events
  | 'contact.created'
  | 'contact.updated'
  | 'contact.deleted'
  // Task events
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'task.deleted'
  // Deal events
  | 'deal.created'
  | 'deal.updated'
  | 'deal.stage_changed'
  | 'deal.won'
  | 'deal.lost'
  | 'deal.deleted'
  // Document events
  | 'document.created'
  | 'document.updated'
  | 'document.deleted'
  // CRM item events
  | 'crm.created'
  | 'crm.updated'
  | 'crm.stage_changed'
  | 'crm.deleted'
  // Financial events
  | 'financial.created'
  | 'financial.updated'
  | 'financial.deleted'
  // Marketing events
  | 'marketing.created'
  | 'marketing.updated'
  | 'marketing.deleted'
  // Product events
  | 'product.created'
  | 'product.updated'
  | 'product.deleted'
  // Calendar events
  | 'calendar.created'
  | 'calendar.updated'
  | 'calendar.deleted'
  // Agent events
  | 'agent.run_started'
  | 'agent.run_completed'
  | 'agent.run_failed'
  // Test events
  | 'test.ping';

export interface WebhookTriggerParams {
  workspaceId: string;
  eventType: WebhookEventType;
  entityId: string;
  payload: Record<string, unknown>;
}

// ============================================
// TRIGGER FUNCTION
// ============================================

/**
 * Triggers a webhook event for a workspace.
 * This queues the event and the webhook-delivery function handles delivery.
 * 
 * @param supabase - Supabase client (service role)
 * @param params - Event parameters
 * @returns Promise with queue result
 */
export async function triggerWebhook(
  supabase: SupabaseClient,
  params: WebhookTriggerParams
): Promise<{ queued: boolean; webhookCount: number; error?: string }> {
  try {
    const { workspaceId, eventType, entityId, payload } = params;
    
    // Check if any webhooks are subscribed to this event
    const { data: webhooks, error: fetchError } = await supabase
      .from('api_webhooks')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .contains('events', [eventType]);
    
    if (fetchError) {
      console.error('[webhookTrigger] Error fetching webhooks:', fetchError);
      return { queued: false, webhookCount: 0, error: fetchError.message };
    }
    
    if (!webhooks || webhooks.length === 0) {
      // No webhooks subscribed, skip silently
      return { queued: false, webhookCount: 0 };
    }
    
    // Queue deliveries for each webhook
    const deliveries = webhooks.map((webhook) => ({
      webhook_id: webhook.id,
      event_type: eventType,
      event_id: entityId,
      payload: payload,
      status: 'pending',
      attempts: 0,
      max_attempts: 5,
    }));
    
    const { error: insertError } = await supabase
      .from('api_webhook_deliveries')
      .insert(deliveries);
    
    if (insertError) {
      console.error('[webhookTrigger] Error inserting deliveries:', insertError);
      return { queued: false, webhookCount: 0, error: insertError.message };
    }
    
    // Note: Actual delivery is handled by the webhook-delivery function
    // which can be called via cron job or immediately via invoke
    
    return { queued: true, webhookCount: webhooks.length };
  } catch (error) {
    console.error('[webhookTrigger] Unexpected error:', error);
    return { 
      queued: false, 
      webhookCount: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Triggers webhook and immediately attempts delivery.
 * Use this for real-time delivery; use triggerWebhook for queued delivery.
 */
export async function triggerWebhookImmediate(
  supabase: SupabaseClient,
  params: WebhookTriggerParams
): Promise<{ delivered: number; failed: number; error?: string }> {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Call the webhook-delivery function directly
    const response = await fetch(
      `${supabaseUrl}/functions/v1/webhook-delivery?action=queue`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify(params),
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      return { delivered: 0, failed: 0, error: errorText };
    }
    
    const result = await response.json();
    return {
      delivered: result.delivered || 0,
      failed: result.failed || 0,
    };
  } catch (error) {
    console.error('[webhookTrigger] Immediate delivery error:', error);
    return {
      delivered: 0,
      failed: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
