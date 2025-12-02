// supabase/functions/webhook-delivery/index.ts
// Edge function for delivering webhooks to external systems
// Handles: event queuing, HMAC signing, retries with exponential backoff

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/apiAuth.ts';

// ============================================
// TYPES
// ============================================

interface WebhookEvent {
  workspaceId: string;
  eventType: string;
  entityId: string;
  payload: Record<string, unknown>;
}

interface Webhook {
  id: string;
  workspace_id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  is_active: boolean;
  consecutive_failures: number;
}

interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  event_id: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  attempts: number;
  max_attempts: number;
  next_retry_at: string | null;
}

// ============================================
// HMAC SIGNATURE
// ============================================

async function createHmacSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);
  
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============================================
// DELIVERY LOGIC
// ============================================

async function deliverWebhook(
  supabase: any,
  delivery: WebhookDelivery,
  webhook: Webhook
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  const startTime = Date.now();
  
  try {
    const payload = JSON.stringify({
      event: delivery.event_type,
      event_id: delivery.event_id,
      timestamp: new Date().toISOString(),
      data: delivery.payload,
    });
    
    const signature = await createHmacSignature(payload, webhook.secret);
    
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': `sha256=${signature}`,
        'X-Webhook-Event': delivery.event_type,
        'X-Webhook-Delivery': delivery.id,
        'User-Agent': 'FounderHQ-Webhooks/1.0',
      },
      body: payload,
    });
    
    const responseTime = Date.now() - startTime;
    const responseBody = await response.text().catch(() => '');
    
    // Update delivery record
    if (response.ok) {
      await supabase
        .from('api_webhook_deliveries')
        .update({
          status: 'delivered',
          attempts: delivery.attempts + 1,
          response_status: response.status,
          response_body: responseBody.substring(0, 1000),
          response_time_ms: responseTime,
          delivered_at: new Date().toISOString(),
          next_retry_at: null,
        })
        .eq('id', delivery.id);
      
      // Reset consecutive failures on webhook
      await supabase
        .from('api_webhooks')
        .update({
          consecutive_failures: 0,
          last_triggered_at: new Date().toISOString(),
          last_error: null,
        })
        .eq('id', webhook.id);
      
      return { success: true, statusCode: response.status };
    } else {
      throw new Error(`HTTP ${response.status}: ${responseBody.substring(0, 200)}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const responseTime = Date.now() - startTime;
    const newAttempts = delivery.attempts + 1;
    
    // Calculate next retry with exponential backoff
    let nextRetry: string | null = null;
    let newStatus: 'retrying' | 'failed' = 'failed';
    
    if (newAttempts < delivery.max_attempts) {
      // Exponential backoff: 1min, 5min, 15min, 30min, 60min
      const delays = [60, 300, 900, 1800, 3600];
      const delaySeconds = delays[Math.min(newAttempts - 1, delays.length - 1)];
      nextRetry = new Date(Date.now() + delaySeconds * 1000).toISOString();
      newStatus = 'retrying';
    }
    
    // Update delivery
    await supabase
      .from('api_webhook_deliveries')
      .update({
        status: newStatus,
        attempts: newAttempts,
        last_error: errorMessage,
        response_time_ms: responseTime,
        next_retry_at: nextRetry,
      })
      .eq('id', delivery.id);
    
    // Increment consecutive failures
    await supabase
      .from('api_webhooks')
      .update({
        consecutive_failures: webhook.consecutive_failures + 1,
        last_error: errorMessage,
      })
      .eq('id', webhook.id);
    
    // Auto-disable webhook after 10 consecutive failures
    if (webhook.consecutive_failures + 1 >= 10) {
      await supabase
        .from('api_webhooks')
        .update({ is_active: false })
        .eq('id', webhook.id);
    }
    
    return { success: false, error: errorMessage };
  }
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    
    // ============================================
    // ACTION: QUEUE EVENT
    // ============================================
    if (req.method === 'POST' && action === 'queue') {
      const event: WebhookEvent = await req.json();
      
      // Find active webhooks for this workspace that subscribe to this event
      const { data: webhooks, error: webhookError } = await supabase
        .from('api_webhooks')
        .select('*')
        .eq('workspace_id', event.workspaceId)
        .eq('is_active', true)
        .contains('events', [event.eventType]);
      
      if (webhookError) throw webhookError;
      
      if (!webhooks || webhooks.length === 0) {
        return new Response(
          JSON.stringify({ queued: 0, message: 'No webhooks subscribed to this event' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Create delivery records for each webhook
      const deliveries = webhooks.map((webhook: Webhook) => ({
        webhook_id: webhook.id,
        event_type: event.eventType,
        event_id: event.entityId,
        payload: event.payload,
        status: 'pending',
        attempts: 0,
        max_attempts: 5,
      }));
      
      const { data: insertedDeliveries, error: insertError } = await supabase
        .from('api_webhook_deliveries')
        .insert(deliveries)
        .select();
      
      if (insertError) throw insertError;
      
      // Immediately attempt delivery for each webhook
      const results = await Promise.all(
        insertedDeliveries.map(async (delivery: WebhookDelivery) => {
          const webhook = webhooks.find((w: Webhook) => w.id === delivery.webhook_id);
          if (webhook) {
            return deliverWebhook(supabase, delivery, webhook);
          }
          return { success: false, error: 'Webhook not found' };
        })
      );
      
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      return new Response(
        JSON.stringify({
          queued: insertedDeliveries.length,
          delivered: successful,
          failed: failed,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ============================================
    // ACTION: PROCESS RETRIES
    // ============================================
    if (req.method === 'POST' && action === 'retry') {
      // Find deliveries that need to be retried
      const { data: pendingDeliveries, error: fetchError } = await supabase
        .from('api_webhook_deliveries')
        .select('*, webhook:api_webhooks(*)')
        .in('status', ['pending', 'retrying'])
        .lte('next_retry_at', new Date().toISOString())
        .limit(50);
      
      if (fetchError) throw fetchError;
      
      if (!pendingDeliveries || pendingDeliveries.length === 0) {
        return new Response(
          JSON.stringify({ processed: 0, message: 'No pending retries' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const results = await Promise.all(
        pendingDeliveries.map(async (delivery: any) => {
          if (delivery.webhook && delivery.webhook.is_active) {
            return deliverWebhook(supabase, delivery, delivery.webhook);
          }
          // Mark as failed if webhook is inactive
          await supabase
            .from('api_webhook_deliveries')
            .update({ status: 'failed', last_error: 'Webhook disabled' })
            .eq('id', delivery.id);
          return { success: false, error: 'Webhook disabled' };
        })
      );
      
      const successful = results.filter(r => r.success).length;
      
      return new Response(
        JSON.stringify({
          processed: pendingDeliveries.length,
          delivered: successful,
          failed: pendingDeliveries.length - successful,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // ============================================
    // ACTION: TEST WEBHOOK
    // ============================================
    if (req.method === 'POST' && action === 'test') {
      const { webhookId } = await req.json();
      
      const { data: webhook, error: webhookError } = await supabase
        .from('api_webhooks')
        .select('*')
        .eq('id', webhookId)
        .single();
      
      if (webhookError || !webhook) {
        return new Response(
          JSON.stringify({ error: 'Webhook not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Create a test delivery
      const testPayload = {
        message: 'This is a test webhook delivery from FounderHQ',
        timestamp: new Date().toISOString(),
      };
      
      const { data: delivery, error: insertError } = await supabase
        .from('api_webhook_deliveries')
        .insert({
          webhook_id: webhook.id,
          event_type: 'test.ping',
          event_id: crypto.randomUUID(),
          payload: testPayload,
          status: 'pending',
          attempts: 0,
          max_attempts: 1,
        })
        .select()
        .single();
      
      if (insertError) throw insertError;
      
      const result = await deliverWebhook(supabase, delivery, webhook);
      
      return new Response(
        JSON.stringify({
          success: result.success,
          statusCode: result.statusCode,
          error: result.error,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ error: 'Invalid action. Use ?action=queue|retry|test' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Webhook delivery error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
