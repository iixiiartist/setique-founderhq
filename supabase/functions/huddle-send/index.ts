// supabase/functions/huddle-send/index.ts
// Handles message sending with validation, moderation, and realtime broadcast

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendMessageRequest {
  room_id: string;
  body: string;
  body_format?: 'markdown' | 'plain';
  thread_root_id?: string;
  attachments?: Array<{
    id: string;
    type: 'upload' | 'file_library' | 'document' | 'form';
    name: string;
    mime?: string;
    size?: number;
    url?: string;
    source_id?: string;
  }>;
  linked_entities?: {
    tasks?: string[];
    contacts?: string[];
    deals?: string[];
    documents?: string[];
    forms?: string[];
    files?: string[];
  };
  mentions?: string[]; // user IDs mentioned
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Get user's JWT from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT for RLS
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get current user
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: SendMessageRequest = await req.json();
    const { room_id, body: messageBody, body_format, thread_root_id, attachments, linked_entities, mentions } = body;

    // Validate required fields
    if (!room_id || !messageBody?.trim()) {
      return new Response(
        JSON.stringify({ error: 'room_id and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check room access (RLS will also enforce, but we want better error messages)
    const { data: room, error: roomError } = await supabaseUser
      .from('huddle_rooms')
      .select('id, workspace_id, is_private, settings')
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      return new Response(
        JSON.stringify({ error: 'Room not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Content moderation check
    const moderationResult = await checkModeration(messageBody);
    if (moderationResult.flagged) {
      return new Response(
        JSON.stringify({ 
          error: 'Message flagged by moderation',
          reason: moderationResult.reason 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build metadata
    const metadata: Record<string, any> = {};
    if (linked_entities && Object.keys(linked_entities).length > 0) {
      metadata.linked_entities = linked_entities;
    }
    if (mentions && mentions.length > 0) {
      metadata.mentions = mentions;
    }

    // Insert message
    const { data: message, error: insertError } = await supabaseUser
      .from('huddle_messages')
      .insert({
        room_id,
        workspace_id: room.workspace_id,
        user_id: user.id,
        body: messageBody.trim(),
        body_format: body_format || 'markdown',
        thread_root_id: thread_root_id || null,
        attachments: attachments || [],
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
      })
      .select(`
        *,
        user:profiles!huddle_messages_user_id_fkey(id, name, avatar_url)
      `)
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to send message', detail: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create notifications for mentions
    if (mentions && mentions.length > 0) {
      await createMentionNotifications(supabaseAdmin, {
        workspace_id: room.workspace_id,
        room_id,
        message_id: message.id,
        sender_id: user.id,
        mentioned_user_ids: mentions,
      });
    }

    // Create notification for thread reply
    if (thread_root_id) {
      await createThreadReplyNotification(supabaseAdmin, {
        workspace_id: room.workspace_id,
        room_id,
        message_id: message.id,
        thread_root_id,
        sender_id: user.id,
      });
    }

    return new Response(
      JSON.stringify({ success: true, message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Huddle send error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Simple moderation check (extend with your moderationService)
async function checkModeration(content: string): Promise<{ flagged: boolean; reason?: string }> {
  // Basic checks - extend with AI moderation if needed
  const blockedPatterns = [
    /\b(spam|scam)\b/i,
    // Add more patterns as needed
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(content)) {
      return { flagged: true, reason: 'Content policy violation' };
    }
  }

  // TODO: Integrate with lib/services/moderationService for AI moderation
  
  return { flagged: false };
}

// Create notifications for @mentions
async function createMentionNotifications(
  supabase: any,
  params: {
    workspace_id: string;
    room_id: string;
    message_id: string;
    sender_id: string;
    mentioned_user_ids: string[];
  }
) {
  const { workspace_id, room_id, message_id, sender_id, mentioned_user_ids } = params;
  
  // Filter out self-mentions
  const recipients = mentioned_user_ids.filter(id => id !== sender_id);
  if (recipients.length === 0) return;

  // Get sender name
  const { data: sender } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', sender_id)
    .single();

  // Insert notifications
  const notifications = recipients.map(user_id => ({
    workspace_id,
    user_id,
    type: 'huddle_mention',
    title: `${sender?.name || 'Someone'} mentioned you`,
    message: 'You were mentioned in Huddle',
    data: { room_id, message_id },
  }));

  await supabase.from('notifications').insert(notifications);
}

// Create notification for thread reply
async function createThreadReplyNotification(
  supabase: any,
  params: {
    workspace_id: string;
    room_id: string;
    message_id: string;
    thread_root_id: string;
    sender_id: string;
  }
) {
  const { workspace_id, room_id, message_id, thread_root_id, sender_id } = params;

  // Get thread root author
  const { data: threadRoot } = await supabase
    .from('huddle_messages')
    .select('user_id')
    .eq('id', thread_root_id)
    .single();

  if (!threadRoot || threadRoot.user_id === sender_id) return;

  // Get sender name
  const { data: sender } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', sender_id)
    .single();

  await supabase.from('notifications').insert({
    workspace_id,
    user_id: threadRoot.user_id,
    type: 'huddle_thread_reply',
    title: `${sender?.name || 'Someone'} replied to your message`,
    message: 'New reply in your Huddle thread',
    data: { room_id, message_id, thread_root_id },
  });
}
