// supabase/functions/notification-maintenance/index.ts
// Scheduled Edge Function for notification maintenance tasks
// - Retry failed deliveries
// - Archive old read notifications
// - Cleanup expired notifications
// - Cleanup rate limit records
// 
// Schedule with Supabase cron: every 5 minutes for retries, hourly for cleanup

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MaintenanceTask {
  name: string;
  enabled: boolean;
}

interface MaintenanceRequest {
  tasks?: MaintenanceTask[];
  archiveOlderThanDays?: number;
  retryBatchSize?: number;
}

interface MaintenanceResult {
  task: string;
  success: boolean;
  count: number;
  error?: string;
  durationMs: number;
}

interface MaintenanceResponse {
  success: boolean;
  results: MaintenanceResult[];
  totalDurationMs: number;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  const results: MaintenanceResult[] = [];

  try {
    // This function should be called with service role key or via cron
    // For security, verify the request is from a trusted source
    const authHeader = req.headers.get('Authorization');
    const cronSecret = req.headers.get('x-cron-secret');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const expectedCronSecret = Deno.env.get('NOTIFICATION_CRON_SECRET');

    // Allow if: valid service key OR valid cron secret
    const isServiceRole = authHeader?.includes(supabaseServiceKey);
    const isValidCron = expectedCronSecret && cronSecret === expectedCronSecret;

    if (!isServiceRole && !isValidCron) {
      // Also allow if the request comes from Supabase cron (no auth header)
      const isSupabaseCron = req.headers.get('x-supabase-cron') === 'true';
      if (!isSupabaseCron) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Parse request options
    let options: MaintenanceRequest = {};
    try {
      if (req.method === 'POST') {
        options = await req.json();
      }
    } catch {
      // Use defaults if no body
    }

    const {
      tasks = [
        { name: 'retryFailed', enabled: true },
        { name: 'archiveOld', enabled: true },
        { name: 'cleanupExpired', enabled: true },
        { name: 'cleanupRateLimits', enabled: true },
      ],
      archiveOlderThanDays = 30,
      retryBatchSize = 100,
    } = options;

    // Task: Retry failed notifications
    if (tasks.find(t => t.name === 'retryFailed' && t.enabled)) {
      const taskStart = Date.now();
      try {
        const { data, error } = await supabase
          .rpc('process_notification_retries', { p_batch_size: retryBatchSize });

        if (error) throw error;

        const successCount = (data || []).filter((r: any) => r.success).length;
        const failCount = (data || []).filter((r: any) => !r.success).length;

        results.push({
          task: 'retryFailed',
          success: true,
          count: successCount,
          durationMs: Date.now() - taskStart,
        });

        console.log(`[notification-maintenance] Retried ${successCount} notifications, ${failCount} failed`);
      } catch (err) {
        results.push({
          task: 'retryFailed',
          success: false,
          count: 0,
          error: err.message,
          durationMs: Date.now() - taskStart,
        });
        console.error('[notification-maintenance] Retry task failed:', err);
      }
    }

    // Task: Archive old read notifications
    if (tasks.find(t => t.name === 'archiveOld' && t.enabled)) {
      const taskStart = Date.now();
      try {
        const { data, error } = await supabase
          .rpc('archive_old_notifications', { p_older_than_days: archiveOlderThanDays });

        if (error) throw error;

        results.push({
          task: 'archiveOld',
          success: true,
          count: data || 0,
          durationMs: Date.now() - taskStart,
        });

        console.log(`[notification-maintenance] Archived ${data} old notifications`);
      } catch (err) {
        results.push({
          task: 'archiveOld',
          success: false,
          count: 0,
          error: err.message,
          durationMs: Date.now() - taskStart,
        });
        console.error('[notification-maintenance] Archive task failed:', err);
      }
    }

    // Task: Cleanup expired notifications
    if (tasks.find(t => t.name === 'cleanupExpired' && t.enabled)) {
      const taskStart = Date.now();
      try {
        const { data, error } = await supabase
          .rpc('cleanup_expired_notifications');

        if (error) throw error;

        results.push({
          task: 'cleanupExpired',
          success: true,
          count: data || 0,
          durationMs: Date.now() - taskStart,
        });

        console.log(`[notification-maintenance] Cleaned up ${data} expired notifications`);
      } catch (err) {
        results.push({
          task: 'cleanupExpired',
          success: false,
          count: 0,
          error: err.message,
          durationMs: Date.now() - taskStart,
        });
        console.error('[notification-maintenance] Cleanup expired task failed:', err);
      }
    }

    // Task: Cleanup old rate limit records
    if (tasks.find(t => t.name === 'cleanupRateLimits' && t.enabled)) {
      const taskStart = Date.now();
      try {
        const { data, error } = await supabase
          .rpc('cleanup_old_rate_limits');

        if (error) throw error;

        results.push({
          task: 'cleanupRateLimits',
          success: true,
          count: data || 0,
          durationMs: Date.now() - taskStart,
        });

        console.log(`[notification-maintenance] Cleaned up ${data} rate limit records`);
      } catch (err) {
        results.push({
          task: 'cleanupRateLimits',
          success: false,
          count: 0,
          error: err.message,
          durationMs: Date.now() - taskStart,
        });
        console.error('[notification-maintenance] Rate limit cleanup failed:', err);
      }
    }

    const response: MaintenanceResponse = {
      success: results.every(r => r.success),
      results,
      totalDurationMs: Date.now() - startTime,
    };

    console.log(`[notification-maintenance] Completed in ${response.totalDurationMs}ms`);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[notification-maintenance] Unexpected error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        results,
        totalDurationMs: Date.now() - startTime,
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
