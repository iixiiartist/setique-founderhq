// supabase/functions/huddle-send/index.ts
// Handles message sending with validation, moderation, rate limiting, and realtime broadcast

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/apiAuth.ts';

// Rate limiting configuration
const RATE_LIMITS = {
  messages_per_minute: 20,
  messages_per_hour: 200,
  max_message_length: 10000,
  max_attachments: 10,
  max_attachment_size: 10 * 1024 * 1024, // 10MB
};

// Allowed MIME types for attachments
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'text/plain', 'text/csv', 'text/markdown',
  'application/json',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// High-severity moderation categories that should block
const HIGH_SEVERITY_CATEGORIES = ['S1', 'S3', 'S4', 'S9', 'S11'];

// Structured logging
function log(level: 'info' | 'warn' | 'error', requestId: string, message: string, data?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    requestId,
    service: 'huddle-send',
    message,
    ...data,
  };
  if (level === 'error') {
    console.error(JSON.stringify(logEntry));
  } else if (level === 'warn') {
    console.warn(JSON.stringify(logEntry));
  } else {
    console.log(JSON.stringify(logEntry));
  }
}

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

    // Generate request ID for logging
    const requestId = crypto.randomUUID();

    // Validate required fields
    if (!room_id || !messageBody?.trim()) {
      return new Response(
        JSON.stringify({ error: 'room_id and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate message length
    if (messageBody.length > RATE_LIMITS.max_message_length) {
      log('warn', requestId, 'Message too long', { length: messageBody.length, max: RATE_LIMITS.max_message_length });
      return new Response(
        JSON.stringify({ error: `Message too long. Maximum ${RATE_LIMITS.max_message_length} characters allowed.` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate attachments
    // SECURITY TODO: Add virus scanning integration (VirusTotal API, ClamAV, etc.)
    // Current validation only checks MIME type and size - does NOT detect malware
    if (attachments && attachments.length > 0) {
      if (attachments.length > RATE_LIMITS.max_attachments) {
        return new Response(
          JSON.stringify({ error: `Too many attachments. Maximum ${RATE_LIMITS.max_attachments} allowed.` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      for (const attachment of attachments) {
        // Check MIME type
        // WARNING: MIME types can be spoofed - this is not malware detection
        if (attachment.mime && !ALLOWED_MIME_TYPES.includes(attachment.mime)) {
          log('warn', requestId, 'Blocked attachment type', { mime: attachment.mime, name: attachment.name });
          return new Response(
            JSON.stringify({ error: `File type not allowed: ${attachment.mime}` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Check file size
        if (attachment.size && attachment.size > RATE_LIMITS.max_attachment_size) {
          return new Response(
            JSON.stringify({ error: `File too large: ${attachment.name}. Maximum ${RATE_LIMITS.max_attachment_size / 1024 / 1024}MB allowed.` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Log attachment for potential audit (no AV scan currently)
        log('info', requestId, 'Attachment validated (no AV scan)', { 
          name: attachment.name, 
          mime: attachment.mime,
          size: attachment.size,
        });
      }
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

    // RATE LIMITING: Check per-user message rate
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString();
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count: messagesLastMinute } = await supabaseAdmin
      .from('huddle_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('workspace_id', room.workspace_id)
      .gte('created_at', oneMinuteAgo);
    
    if ((messagesLastMinute || 0) >= RATE_LIMITS.messages_per_minute) {
      log('warn', requestId, 'Rate limit exceeded (per minute)', { 
        userId: user.id, 
        count: messagesLastMinute,
        limit: RATE_LIMITS.messages_per_minute,
      });
      return new Response(
        JSON.stringify({ 
          error: 'You are sending messages too quickly. Please wait a moment.',
          retry_after: 60,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '60' } }
      );
    }
    
    const { count: messagesLastHour } = await supabaseAdmin
      .from('huddle_messages')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('workspace_id', room.workspace_id)
      .gte('created_at', oneHourAgo);
    
    if ((messagesLastHour || 0) >= RATE_LIMITS.messages_per_hour) {
      log('warn', requestId, 'Rate limit exceeded (per hour)', { 
        userId: user.id, 
        count: messagesLastHour,
        limit: RATE_LIMITS.messages_per_hour,
      });
      return new Response(
        JSON.stringify({ 
          error: 'Hourly message limit reached. Please try again later.',
          retry_after: 3600,
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '3600' } }
      );
    }

    // Content moderation check (FAIL CLOSED for high severity)
    const moderationResult = await checkModeration(messageBody, requestId);
    if (moderationResult.flagged) {
      log('warn', requestId, 'Message blocked by moderation', { 
        userId: user.id,
        reason: moderationResult.reason,
        categories: moderationResult.categories,
      });
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
        user:profiles!huddle_messages_user_id_fkey(id, full_name, avatar_url)
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

// Simple moderation check using Llama Guard 4 - FAIL CLOSED on high-severity errors
async function checkModeration(content: string, requestId?: string): Promise<{ flagged: boolean; reason?: string; categories?: string[] }> {
  // Skip short/empty content
  if (!content || content.length < 3) {
    return { flagged: false };
  }

  // Basic heuristic checks first (fast path)
  const blockedPatterns = [
    /\b(spam|scam)\b/i,
  ];

  for (const pattern of blockedPatterns) {
    if (pattern.test(content)) {
      return { flagged: true, reason: 'Content policy violation' };
    }
  }

  // Try Llama Guard for AI-powered moderation
  const groqApiKey = Deno.env.get('GROQ_API_KEY');
  if (!groqApiKey) {
    // No API key, fall back to heuristics only
    if (requestId) {
      log('warn', requestId, 'Moderation skipped - no GROQ_API_KEY configured', {});
    }
    return { flagged: false };
  }

  try {
    const llamaGuardPrompt = `<|begin_of_text|><|start_header_id|>user<|end_header_id|>

Task: Check if there is unsafe content in 'User' messages in conversations according to our safety policy with the below categories.

<BEGIN UNSAFE CONTENT CATEGORIES>
S1: Violent Crimes
S2: Non-Violent Crimes
S3: Sex-Related Crimes
S4: Child Sexual Exploitation
S5: Defamation
S6: Specialized Advice
S7: Privacy
S8: Intellectual Property
S9: Indiscriminate Weapons
S10: Hate
S11: Suicide & Self-Harm
S12: Sexual Content
S13: Elections
S14: Code Interpreter Abuse
<END UNSAFE CONTENT CATEGORIES>

<BEGIN CONVERSATION>

User: ${content.slice(0, 2000)}

<END CONVERSATION>

Provide your safety assessment for ONLY THE LAST User message in the above conversation:
- First line must read 'safe' or 'unsafe'.
- If unsafe, a second line must include a comma-separated list of violated categories.<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;

    // Add timeout to moderation request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-guard-4-12b',
        messages: [{ role: 'user', content: llamaGuardPrompt }],
        temperature: 0,
        max_tokens: 50,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // FAIL CLOSED on API error - block the message to be safe
      if (requestId) {
        log('error', requestId, 'Moderation API error - failing closed', { status: response.status });
      }
      return { 
        flagged: true, 
        reason: 'Unable to verify message safety. Please try again.',
        categories: ['API_ERROR'],
      };
    }

    const data = await response.json();
    const result = (data.choices?.[0]?.message?.content || '').trim().toLowerCase();
    const lines = result.split('\n').filter((l: string) => l.trim());
    
    const isSafe = lines[0]?.includes('safe') && !lines[0]?.includes('unsafe');
    
    if (!isSafe) {
      // Parse categories from second line
      const categories: string[] = [];
      if (lines[1]) {
        const categoryMatches = lines[1].match(/s\d+/gi) || [];
        categories.push(...categoryMatches.map((c: string) => c.toUpperCase()));
      }
      
      // Map category codes to human-readable names
      const categoryNames: Record<string, string> = {
        'S1': 'Violent Crimes',
        'S4': 'Child Safety',
        'S10': 'Hate Speech',
        'S11': 'Self-Harm',
        'S12': 'Inappropriate Content',
      };
      
      const reason = categories.length > 0 
        ? `Flagged: ${categories.map(c => categoryNames[c] || c).join(', ')}`
        : 'Content policy violation';
        
      return { flagged: true, reason, categories };
    }
    
    return { flagged: false };
  } catch (error) {
    // FAIL CLOSED on errors - block the message
    if (requestId) {
      log('error', requestId, 'Moderation check failed - failing closed', { error: error.message });
    }
    return { 
      flagged: true, 
      reason: 'Unable to verify message safety. Please try again.',
      categories: ['CHECK_ERROR'],
    };
  }
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
