// supabase/functions/batch-notifications/index.ts
// Edge Function for server-side batch notification creation
// Handles fan-out to large audiences efficiently using the service key

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BatchNotificationRequest {
  workspaceId: string;
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  excludeUserIds?: string[];
  targetUserIds?: string[]; // If null, sends to all workspace members
}

interface BatchNotificationResponse {
  success: boolean;
  created: number;
  skipped: number;
  rateLimited: boolean;
  error?: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for server-side operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Also create a client with the user's token to verify they have access
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    });

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body: BatchNotificationRequest = await req.json();
    const {
      workspaceId,
      type,
      title,
      message,
      entityType,
      entityId,
      priority = 'normal',
      actionUrl,
      metadata = {},
      excludeUserIds = [],
      targetUserIds,
    } = body;

    // Validate required fields
    if (!workspaceId || !type || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: workspaceId, type, title, message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is a member of the workspace
    const { data: membership, error: membershipError } = await supabaseUser
      .from('workspace_members')
      .select('id, role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'Not a member of this workspace' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check rate limit (using service role)
    const { data: withinLimit, error: rateLimitError } = await supabaseAdmin
      .rpc('check_notification_rate_limit', {
        p_workspace_id: workspaceId,
        p_limit_per_minute: 100
      });

    if (rateLimitError) {
      console.error('[batch-notifications] Rate limit check error:', rateLimitError);
    }

    if (withinLimit === false) {
      const response: BatchNotificationResponse = {
        success: false,
        created: 0,
        skipped: 0,
        rateLimited: true,
        error: 'Rate limit exceeded. Please wait before sending more notifications.',
      };
      return new Response(
        JSON.stringify(response),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Always exclude the sender from receiving their own notification
    const finalExcludeIds = [...new Set([...excludeUserIds, user.id])];

    // Call the server-side batch insert function
    const { data: results, error: insertError } = await supabaseAdmin
      .rpc('create_workspace_notification', {
        p_workspace_id: workspaceId,
        p_type: type,
        p_title: title,
        p_message: message,
        p_entity_type: entityType || null,
        p_entity_id: entityId || null,
        p_priority: priority,
        p_action_url: actionUrl || null,
        p_metadata: metadata,
        p_exclude_user_ids: finalExcludeIds,
        p_target_user_ids: targetUserIds || null,
      });

    if (insertError) {
      console.error('[batch-notifications] Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to create notifications', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Count results
    const created = (results || []).filter((r: any) => r.created).length;
    const skipped = (results || []).filter((r: any) => !r.created).length;

    console.log(`[batch-notifications] Created ${created} notifications, skipped ${skipped} (preferences)`);

    const response: BatchNotificationResponse = {
      success: true,
      created,
      skipped,
      rateLimited: false,
    };

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[batch-notifications] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
