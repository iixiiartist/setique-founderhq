// supabase/functions/huddle-ai-run/index.ts
// Handles AI invocation in Huddle - Groq + You.com integration with streaming
// Security: Pre/post moderation, server-side tool permissions, context budgeting, usage tracking

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/apiAuth.ts';

// PAID_PLANS: Plans that have AI access (must match constants.ts)
// Server-side enforcement prevents client bypass
const PAID_PLANS = ['team-pro'] as const;

// Rate limits per plan (requests per hour for workspace)
const PLAN_RATE_LIMITS: Record<string, number> = {
  free: 0, // Free plan has no AI access
  'team-pro': 500,
};

// Per-user rate limits (requests per hour per user within workspace)
const USER_RATE_LIMITS: Record<string, number> = {
  free: 0, // Free plan has no AI access
  'team-pro': 100,
};

// Token costs for api_balance (estimated tokens per request)
const ESTIMATED_TOKENS_PER_REQUEST = 2500;
const TOKEN_COST_MULTIPLIER = 0.001; // Cost units per token

// Streaming configuration
const STREAMING_CONFIG = {
  GROQ_TIMEOUT_MS: 60000, // 60 second hard timeout for Groq API
  HEARTBEAT_INTERVAL_MS: 15000, // Send heartbeat every 15 seconds
  MAX_RETRIES: 2,
  RETRY_DELAY_MS: 1000,
};

// Allowed models (server-side allowlist to prevent malformed/costly requests)
const ALLOWED_MODELS = [
  'llama-3.3-70b-versatile',
  'llama-3.1-70b-versatile', 
  'llama-3.1-8b-instant',
  'meta-llama/llama-guard-4-12b',
];

// Context budgeting limits (characters)
const CONTEXT_LIMITS = {
  MAX_PROMPT_LENGTH: 10000,
  MAX_CONTEXT_PER_ENTITY: 200, // chars per task/contact/deal etc
  MAX_ENTITIES_PER_TYPE: 15,
  MAX_DOCUMENT_CONTENT: 2000,
  MAX_FORM_SUBMISSION_DATA: 1500,
  MAX_TOTAL_CONTEXT: 15000,
};

// PII patterns for redaction
const PII_PATTERNS = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN-REDACTED]' }, // SSN
  { pattern: /\b\d{16}\b/g, replacement: '[CARD-REDACTED]' }, // Credit card (no spaces)
  { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, replacement: '[CARD-REDACTED]' }, // Credit card
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: '[EMAIL-REDACTED]' }, // Email
  { pattern: /\b(?:\+?1[-.]?)?\(?[0-9]{3}\)?[-.]?[0-9]{3}[-.]?[0-9]{4}\b/g, replacement: '[PHONE-REDACTED]' }, // US Phone
];

// Content moderation settings
const BLOCKED_PATTERNS = [
  /\b(password|secret|api[_-]?key|token)\s*[:=]/i,
  /\b(ssn|social\s+security)\b/i,
  /\b(credit\s+card|card\s+number)\b/i,
];

// High-severity moderation categories that should block
const HIGH_SEVERITY_CATEGORIES = ['S1', 'S3', 'S4', 'S9', 'S11'];

// Tool permissions by role
const TOOL_PERMISSIONS: Record<string, string[]> = {
  owner: ['all'], // Owners can use all tools
  admin: ['all'],
  member: [
    'create_task',
    'create_note',
    'create_contact',
    'create_calendar_event',
    'web_search',
  ],
  viewer: ['web_search'], // Viewers can only search
};

// Structured logging helper
function log(level: 'info' | 'warn' | 'error', requestId: string, message: string, data?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    requestId,
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

interface AIRunRequest {
  room_id: string;
  thread_root_id?: string;
  prompt: string;
  user_timezone?: string;
  context_options: {
    include_recent_messages?: boolean;
    message_count?: number;
    include_thread?: boolean;
    include_workspace_data?: boolean;
    workspace_data_types?: ('tasks' | 'contacts' | 'deals' | 'documents' | 'forms' | 'pipeline' | 'accounts')[];
    include_web_research?: boolean;
    web_research_query?: string;
    selected_files?: string[];
    selected_documents?: string[];
    selected_forms?: string[];
  };
  tool_options: {
    allow_task_creation?: boolean;
    allow_contact_creation?: boolean;
    allow_account_creation?: boolean;
    allow_deal_creation?: boolean;
    allow_expense_creation?: boolean;
    allow_revenue_creation?: boolean;
    allow_note_creation?: boolean;
    allow_calendar_event_creation?: boolean;
    allow_marketing_campaign_creation?: boolean;
    allow_web_search?: boolean;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const encoder = new TextEncoder();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const groqApiKey = Deno.env.get('GROQ_API_KEY')!;
    // Support both new and legacy env var names for You.com API key
    const youComApiKey = Deno.env.get('YOUCOM_API_KEY') || Deno.env.get('YOU_COM_API_KEY');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: AIRunRequest = await req.json();
    const { room_id, thread_root_id, prompt, context_options, tool_options, user_timezone } = body;

    // Generate request ID for logging
    const requestId = crypto.randomUUID();
    const startTime = Date.now();

    // Content moderation: Check prompt length
    if (prompt.length > CONTEXT_LIMITS.MAX_PROMPT_LENGTH) {
      log('warn', requestId, 'Prompt too long', { promptLength: prompt.length, maxLength: CONTEXT_LIMITS.MAX_PROMPT_LENGTH });
      return new Response(
        JSON.stringify({ error: 'Prompt too long. Please keep your message under 10,000 characters.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Content moderation: Check for sensitive patterns
    for (const pattern of BLOCKED_PATTERNS) {
      if (pattern.test(prompt)) {
        log('warn', requestId, 'Blocked pattern detected in prompt', { pattern: pattern.toString() });
        return new Response(
          JSON.stringify({ error: 'Your message appears to contain sensitive information. Please remove any passwords, API keys, or personal identifiers.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // PRE-MODERATION: Check prompt with Llama Guard before processing
    const preModResult = await checkContentWithLlamaGuard(groqApiKey, prompt, 'input');
    if (!preModResult.safe) {
      const isHighSeverity = preModResult.categories.some((c: string) => HIGH_SEVERITY_CATEGORIES.includes(c));
      if (isHighSeverity) {
        log('warn', requestId, 'Pre-moderation blocked (high severity)', { 
          categories: preModResult.categories,
          severity: 'high',
        });
        return new Response(
          JSON.stringify({ error: 'Your message was flagged for safety concerns and cannot be processed.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // Log medium/low severity but allow to proceed with caution
      log('warn', requestId, 'Pre-moderation flagged (proceeding with caution)', { 
        categories: preModResult.categories,
        severity: 'medium/low',
      });
    }

    // Validate room access and get settings
    const { data: room, error: roomError } = await supabaseUser
      .from('huddle_rooms')
      .select('id, workspace_id, settings, name')
      .eq('id', room_id)
      .single();

    if (roomError || !room) {
      log('warn', requestId, 'Room not found', { roomId: room_id, error: roomError?.message });
      return new Response(
        JSON.stringify({ error: 'Room not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if AI is allowed in this room
    if (!room.settings?.ai_allowed) {
      log('info', requestId, 'AI not allowed in room', { roomId: room_id, roomName: room.name });
      return new Response(
        JSON.stringify({ error: 'AI is not enabled in this room' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's role in workspace for permission checks
    const { data: membership } = await supabaseAdmin
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', room.workspace_id)
      .eq('user_id', user.id)
      .single();

    const userRole = membership?.role || 'viewer';
    log('info', requestId, 'User role fetched', { userId: user.id, role: userRole });

    // Check API balance/plan limits
    const { data: workspace } = await supabaseAdmin
      .from('workspaces')
      .select('plan_type, api_balance')
      .eq('id', room.workspace_id)
      .single();

    const planType = (workspace?.plan_type || 'free').toLowerCase();
    const currentBalance = workspace?.api_balance ?? 0; // Default to 0 for unpaid

    // SERVER-SIDE PLAN ENFORCEMENT: Block free tier from AI access
    // This prevents client-side bypass of the paywall
    const isPaidPlan = (PAID_PLANS as readonly string[]).includes(planType);
    if (!isPaidPlan) {
      log('warn', requestId, 'AI access denied - free plan', { 
        workspaceId: room.workspace_id,
        planType,
      });
      return new Response(
        JSON.stringify({ 
          error: 'AI assistant is a premium feature. Please upgrade your plan to access AI capabilities.',
          upgrade_required: true,
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if workspace has sufficient api_balance
    const estimatedCost = ESTIMATED_TOKENS_PER_REQUEST * TOKEN_COST_MULTIPLIER;
    if (currentBalance < estimatedCost) {
      log('warn', requestId, 'Insufficient API balance', { 
        workspaceId: room.workspace_id,
        currentBalance,
        estimatedCost,
      });
      return new Response(
        JSON.stringify({ error: 'Insufficient API balance. Please upgrade your plan or contact support.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: Workspace-level (existing)
    const workspaceRateLimit = PLAN_RATE_LIMITS[planType] || PLAN_RATE_LIMITS.free;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { count: workspaceRequests } = await supabaseAdmin
      .from('huddle_messages')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', room.workspace_id)
      .eq('is_ai', true)
      .gte('created_at', oneHourAgo);
    
    if ((workspaceRequests || 0) >= workspaceRateLimit) {
      log('warn', requestId, 'Workspace rate limit exceeded', { 
        workspaceId: room.workspace_id, 
        planType, 
        rateLimit: workspaceRateLimit, 
        recentRequests: workspaceRequests 
      });
      return new Response(
        JSON.stringify({ 
          error: `Workspace AI rate limit exceeded. Your ${planType} plan allows ${workspaceRateLimit} AI requests per hour.` 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting: Per-user within workspace
    const userRateLimit = USER_RATE_LIMITS[planType] || USER_RATE_LIMITS.free;
    const { count: userRequests } = await supabaseAdmin
      .from('huddle_messages')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', room.workspace_id)
      .eq('metadata->>ai_request_user_id', user.id)
      .gte('created_at', oneHourAgo);

    if ((userRequests || 0) >= userRateLimit) {
      log('warn', requestId, 'User rate limit exceeded', { 
        workspaceId: room.workspace_id,
        userId: user.id,
        userRateLimit, 
        userRequests 
      });
      return new Response(
        JSON.stringify({ 
          error: `You've reached your personal AI limit (${userRateLimit} requests/hour). Please wait before trying again.` 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('info', requestId, 'AI request started', {
      workspaceId: room.workspace_id,
      roomId: room_id,
      roomName: room.name,
      userId: user.id,
      userRole,
      planType,
      promptLength: prompt.length,
    });

    // Build context with token budgeting
    const context = await buildContext(supabaseUser, supabaseAdmin, {
      room_id,
      thread_root_id,
      workspace_id: room.workspace_id,
      user_id: user.id,
      options: context_options,
      youComApiKey,
    });

    // Build tools based on options AND user role (server-side permission check)
    const aiCanWrite = room.settings?.ai_can_write !== false;
    const allowedToolsForRole = TOOL_PERMISSIONS[userRole] || TOOL_PERMISSIONS.viewer;
    const tools = buildTools(tool_options, aiCanWrite, youComApiKey, allowedToolsForRole);
    log('info', requestId, 'Context and tools built', {
      aiCanWrite,
      userRole,
      allowedToolsForRole,
      toolCount: tools.length,
      tools: tools.map((t: any) => t.function?.name),
      contextTypes: context_options.workspace_data_types,
    });

    // First, post the user's prompt as a message - MUST succeed before AI processing
    const { data: userMessage, error: userMessageError } = await supabaseUser
      .from('huddle_messages')
      .insert({
        room_id,
        workspace_id: room.workspace_id,
        user_id: user.id,
        body: prompt,
        thread_root_id,
        metadata: { 
          ai_request: true,
          ai_request_user_id: user.id, // For per-user rate limiting queries
          request_id: requestId,
        },
      })
      .select()
      .single();

    // FAIL CLOSED: If user message insert fails, abort entirely
    if (userMessageError || !userMessage) {
      log('error', requestId, 'Failed to insert user message - aborting AI request', {
        error: userMessageError?.message,
        roomId: room_id,
        userId: user.id,
      });
      return new Response(
        JSON.stringify({ error: 'Failed to save your message. Please try again.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    log('info', requestId, 'User message persisted', { messageId: userMessage.id });

    // Extract room name for system prompt
    const roomName = room.name || 'Direct Message';

    // Create streaming response with abort support
    const requestAbortController = new AbortController();
    
    // Listen for client disconnect
    req.signal?.addEventListener('abort', () => {
      log('info', requestId, 'Client disconnected, aborting AI request');
      requestAbortController.abort();
    });

    const stream = new ReadableStream({
      async start(controller) {
        // Heartbeat interval to keep connection alive
        let heartbeatInterval: number | undefined;
        let lastActivity = Date.now();
        
        const sendHeartbeat = () => {
          if (Date.now() - lastActivity > STREAMING_CONFIG.HEARTBEAT_INTERVAL_MS) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`));
            lastActivity = Date.now();
          }
        };
        
        heartbeatInterval = setInterval(sendHeartbeat, STREAMING_CONFIG.HEARTBEAT_INTERVAL_MS);
        
        const cleanup = () => {
          if (heartbeatInterval) clearInterval(heartbeatInterval);
        };
        
        try {
          // Check if request was aborted
          if (requestAbortController.signal.aborted) {
            cleanup();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'cancelled', reason: 'Request cancelled by client' })}\n\n`));
            controller.close();
            return;
          }

          // Call Groq API with streaming
          // Model selection based on context:
          // - Compound for web search queries (has built-in web search)
          // - GPT-OSS-120b for complex reasoning/tool use
          // - Llama 3.3 70b for general chat
          const needsWebSearch = context_options.include_web_research || 
            context.webSources?.length > 0 || 
            /search|look up|find out|what is|current|latest|today|news/i.test(prompt);
          
          const needsComplexReasoning = /analyze|compare|evaluate|calculate|explain why|reasoning/i.test(prompt);
          
          // Select optimal model based on task (from allowlist)
          let selectedModel = 'llama-3.3-70b-versatile'; // Default: fast, versatile
          let useCompoundBuiltInTools = false;
          
          if (needsWebSearch && !youComApiKey) {
            // Use Compound for web search when You.com isn't available
            // Note: compound not in allowlist, fallback to default with web search tool
            selectedModel = 'llama-3.3-70b-versatile';
          } else if (needsComplexReasoning || tools.length > 5) {
            // Use larger model for complex tasks
            selectedModel = 'llama-3.3-70b-versatile';
          }
          
          // Validate model is in allowlist
          if (!ALLOWED_MODELS.includes(selectedModel)) {
            log('warn', requestId, 'Invalid model selection, using default', { requested: selectedModel });
            selectedModel = 'llama-3.3-70b-versatile';
          }
          
          log('info', requestId, 'Model selected', { 
            model: selectedModel, 
            needsWebSearch, 
            needsComplexReasoning,
            toolCount: tools.length,
          });
          
          // Create timeout for Groq API call
          const groqAbortController = new AbortController();
          const timeoutId = setTimeout(() => {
            groqAbortController.abort();
            log('error', requestId, 'Groq API timeout', { timeoutMs: STREAMING_CONFIG.GROQ_TIMEOUT_MS });
          }, STREAMING_CONFIG.GROQ_TIMEOUT_MS);
          
          // Combine abort signals
          requestAbortController.signal.addEventListener('abort', () => groqAbortController.abort());
          
          const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: selectedModel,
              messages: [
                {
                  role: 'system',
                  content: buildSystemPrompt(roomName, context, user_timezone),
                },
                ...context.recentMessages.map((m: any) => ({
                  role: m.is_ai ? 'assistant' : 'user',
                  // SECURITY: Sanitize user chat messages to prevent prompt injection via chat history
                  content: m.is_ai 
                    ? (m.body || '') // AI messages are trusted
                    : sanitizeChatMessage(m.user?.name ? `${m.user.name}: ${m.body}` : (m.body || '')),
                })),
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              tools: (!useCompoundBuiltInTools && tools.length > 0) ? tools : undefined,
              tool_choice: (!useCompoundBuiltInTools && tools.length > 0) ? 'auto' : undefined,
              stream: true,
              max_tokens: 2048,
              temperature: 0.7,
            }),
            signal: groqAbortController.signal,
          });
          
          clearTimeout(timeoutId);

          if (!groqResponse.ok) {
            const errorText = await groqResponse.text();
            log('error', requestId, 'Groq API error', { status: groqResponse.status, error: errorText });
            
            // If we have web sources, still provide a helpful response
            if (context.webSources?.length > 0) {
              const fallbackContent = `I encountered an issue with AI processing, but here are the web search results:\n\n${context.webSources.map((s: any, i: number) => 
                `**${i + 1}. ${s.title}**\n${s.snippet || 'No description available.'}\n[Source](${s.url})`
              ).join('\n\n')}`;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: fallbackContent })}\n\n`));
              
              // Save the fallback message
              await supabaseAdmin
                .from('huddle_messages')
                .insert({
                  room_id,
                  workspace_id: room.workspace_id,
                  user_id: null,
                  body: fallbackContent,
                  thread_root_id: thread_root_id || null,
                  is_ai: true,
                  metadata: { 
                    web_sources: context.webSources, 
                    error: `Groq API error: ${groqResponse.status}`,
                    request_id: requestId,
                  },
                });
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'complete', web_sources: context.webSources })}\n\n`));
              cleanup();
              controller.close();
              return;
            }
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: 'AI request failed', 
              detail: groqResponse.status === 503 ? 'Service temporarily unavailable. Please try again.' : 'Unable to process request',
            })}\n\n`));
            cleanup();
            controller.close();
            return;
          }

          const reader = groqResponse.body?.getReader();
          if (!reader) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', error: 'No response stream' })}\n\n`));
            cleanup();
            controller.close();
            return;
          }

          let fullContent = '';
          // Use a Map to reassemble streamed tool calls by index
          const toolCallsMap = new Map<number, { id: string; name: string; arguments: string }>();

          while (true) {
            // Check for abort
            if (requestAbortController.signal.aborted) {
              reader.cancel();
              log('info', requestId, 'Stream aborted by client');
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'cancelled' })}\n\n`));
              cleanup();
              controller.close();
              return;
            }
            
            const { done, value } = await reader.read();
            if (done) break;
            
            lastActivity = Date.now(); // Update activity timestamp

            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;

                if (delta?.content) {
                  fullContent += delta.content;
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: delta.content })}\n\n`));
                }

                if (delta?.tool_calls) {
                  // Reassemble tool calls by index - Groq streams fragments
                  for (const tc of delta.tool_calls) {
                    const idx = tc.index ?? 0;
                    const existing = toolCallsMap.get(idx) || { id: '', name: '', arguments: '' };
                    
                    if (tc.id) {
                      existing.id = tc.id;
                    }
                    if (tc.function?.name) {
                      existing.name = tc.function.name;
                    }
                    if (tc.function?.arguments) {
                      existing.arguments += tc.function.arguments;
                    }
                    
                    toolCallsMap.set(idx, existing);
                  }
                }
              } catch (e) {
                // Skip unparseable chunks
              }
            }
          }

          // Convert map to array of complete tool calls
          let toolCalls = Array.from(toolCallsMap.values()).filter(tc => tc.name && tc.arguments);
          
          // Fallback: Parse text-based tool calls that Llama sometimes outputs
          // e.g., <function:create_task({"text": "...", ...})></function>
          if (toolCalls.length === 0 && fullContent) {
            // Match <function:tool_name({...json...})></function>
            const textToolMatch = fullContent.match(/<function:(\w+)\((\{[\s\S]*?\})\)><\/function>/);
            if (textToolMatch) {
              const [fullMatch, toolName, argsStr] = textToolMatch;
              console.log('Found text-based tool call:', toolName, argsStr);
              try {
                // Parse the JSON arguments
                const parsedArgs = JSON.parse(argsStr);
                toolCalls = [{ id: 'fallback_call_0', name: toolName, arguments: JSON.stringify(parsedArgs) }];
                console.log('Successfully parsed text-based tool call:', toolName, parsedArgs);
                // Remove the function tag from content so it doesn't show in the message
                fullContent = fullContent.replace(fullMatch, '').trim();
              } catch (e) {
                console.error('Failed to parse text-based tool call JSON:', e, 'Raw:', argsStr);
              }
            }
          }
          
          log('info', requestId, 'Tool calls detected', { 
            count: toolCalls.length, 
            tools: toolCalls.map(tc => tc.name),
            contentLength: fullContent.length,
          });

          // Execute tool calls if any (with server-side role permission check and idempotency)
          const toolResults = [];
          const executedToolIds = new Set<string>();
          
          // WRITE TOOLS that require ai_can_write permission
          const WRITE_TOOLS = [
            'create_task', 'create_note', 'create_contact', 'create_account',
            'create_expense', 'create_calendar_event', 'create_invoice', 'create_product'
          ];
          
          for (const tc of toolCalls) {
            // SECURITY: Defense-in-depth check for write permissions at execution time
            // Even if tools shouldn't be offered when aiCanWrite=false, verify before executing
            const isWriteTool = WRITE_TOOLS.includes(tc.name);
            if (isWriteTool && !aiCanWrite) {
              log('warn', requestId, 'Blocking write tool - room has ai_can_write disabled', { 
                tool: tc.name, 
                roomId: room.id,
              });
              toolResults.push({ ...tc, error: 'Write tools are disabled for this room' });
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', tool: tc.name, error: 'Write tools are disabled for this room' })}\n\n`));
              continue;
            }
            
            // IDEMPOTENCY: Generate deterministic tool call ID using workspace+room+tool
            const toolCallHash = await generateToolCallHash(tc, room.workspace_id, room.id);
            
            // Check if this exact tool call was already executed
            if (executedToolIds.has(toolCallHash)) {
              log('warn', requestId, 'Skipping duplicate tool call', { tool: tc.name, hash: toolCallHash });
              continue;
            }
            
            // Check database for previously executed tool calls with same hash
            const { data: existingExecution } = await supabaseAdmin
              .from('ai_tool_executions')
              .select('id, result')
              .eq('tool_call_hash', toolCallHash)
              .eq('workspace_id', room.workspace_id)
              .single();
            
            if (existingExecution) {
              log('info', requestId, 'Returning cached tool result', { tool: tc.name, hash: toolCallHash });
              toolResults.push({ ...tc, result: existingExecution.result, cached: true });
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', tool: tc.name, result: existingExecution.result, cached: true })}\n\n`));
              continue;
            }
            
            executedToolIds.add(toolCallHash);
            
            try {
              log('info', requestId, 'Executing tool', { tool: tc.name, hash: toolCallHash });
              const result = await executeToolCall(supabaseAdmin, tc, room.workspace_id, user.id, youComApiKey, allowedToolsForRole, requestId);
              
              // Persist tool execution for idempotency and audit
              await supabaseAdmin
                .from('ai_tool_executions')
                .insert({
                  tool_call_hash: toolCallHash,
                  request_id: requestId,
                  workspace_id: room.workspace_id,
                  user_id: user.id,
                  tool_name: tc.name,
                  tool_arguments: tc.arguments,
                  result: result,
                  success: result?.success === true,
                })
                .onConflict('tool_call_hash')
                .ignore(); // Ignore if already exists (race condition safety)
              
              log('info', requestId, 'Tool execution completed', { tool: tc.name, success: result?.success });
              toolResults.push({ ...tc, result });
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', tool: tc.name, result })}\n\n`));
            } catch (e) {
              log('error', requestId, 'Tool execution failed', { tool: tc.name, error: e.message });
              toolResults.push({ ...tc, error: e.message });
              // Send error to client so they know what went wrong
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', tool: tc.name, error: e.message })}\n\n`));
            }
          }

          // If tools were executed, generate a follow-up response or success message
          let finalContent = fullContent;
          if (toolResults.length > 0) {
            // First, generate basic success messages as fallback
            const successMessages = toolResults
              .filter(tr => tr.result?.success)
              .map(tr => {
                if (tr.name === 'create_task') return `✅ Created task: "${tr.result.title}" in ${tr.result.category}`;
                if (tr.name === 'create_contact') return `✅ Created contact: "${tr.result.name}"`;
                if (tr.name === 'create_account') return `✅ Created account: "${tr.result.name}" (${tr.result.type})`;
                if (tr.name === 'create_deal') return `✅ Created deal: "${tr.result.name}" - $${tr.result.value || 0} (${tr.result.stage})`;
                if (tr.name === 'create_expense') return `✅ Logged expense: $${tr.result.amount} - ${tr.result.description}`;
                if (tr.name === 'create_revenue') return `✅ Recorded revenue: $${tr.result.amount} - ${tr.result.description}`;
                if (tr.name === 'create_note') return `✅ Created note: "${tr.result.title}"`;
                if (tr.name === 'create_calendar_event') return `✅ Created event: "${tr.result.title}" on ${tr.result.start_time}`;
                if (tr.name === 'create_marketing_campaign') return `✅ Created campaign: "${tr.result.name}" (${tr.result.channel})`;
                if (tr.name === 'web_search') return tr.result.summary || `🔍 Web search completed`;
                return `✅ ${tr.name} completed`;
              });
            
            const errorMessages = toolResults
              .filter(tr => tr.error || tr.result?.error)
              .map(tr => `❌ ${tr.name} failed: ${tr.error || tr.result?.error}`);
            
            // Use success/error messages as the response
            const allMessages = [...successMessages, ...errorMessages];
            if (allMessages.length > 0) {
              finalContent = allMessages.join('\n');
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: '\n\n' + finalContent })}\n\n`));
            }
          }

          // POST-MODERATION: Check AI output before saving/displaying
          let messageBody = finalContent;
          const postModResult = await checkContentWithLlamaGuard(groqApiKey, messageBody || '', 'output');
          
          if (!postModResult.safe) {
            const isHighSeverity = postModResult.categories.some((c: string) => HIGH_SEVERITY_CATEGORIES.includes(c));
            if (isHighSeverity) {
              log('warn', requestId, 'Post-moderation blocked AI output (high severity)', { 
                categories: postModResult.categories,
              });
              messageBody = 'I apologize, but I cannot provide that response. Please try rephrasing your question.';
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                type: 'moderation_blocked',
                reason: 'Response flagged for safety concerns',
              })}\n\n`));
            } else {
              log('warn', requestId, 'Post-moderation flagged AI output (low/medium)', { 
                categories: postModResult.categories,
              });
            }
          }

          if (!messageBody && context.webSources?.length > 0) {
            messageBody = `Based on my web search, here's what I found:\n\n${context.webSources.map((s: any, i: number) => 
              `**${i + 1}. ${s.title}**\n${s.snippet || 'No description available.'}\n[Source](${s.url})`
            ).join('\n\n')}`;
            // Stream this content to the client
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'content', content: messageBody })}\n\n`));
          }

          // Prepare AI metadata with moderation info
          const aiMetadata: Record<string, any> = {
            ai_request_id: userMessage?.id,
            ai_request_user_id: user.id,
            request_id: requestId,
            moderation: {
              pre: { safe: preModResult.safe, categories: preModResult.categories },
              post: { safe: postModResult.safe, categories: postModResult.categories },
            },
          };
          if (toolResults.length > 0) {
            aiMetadata.tool_calls = toolResults;
          }
          if (context.webSources?.length > 0) {
            aiMetadata.web_sources = context.webSources;
          }

          const { data: aiMessage } = await supabaseAdmin
            .from('huddle_messages')
            .insert({
              room_id,
              workspace_id: room.workspace_id,
              user_id: null, // AI message
              body: messageBody || 'I apologize, but I was unable to generate a response. Please try again.',
              thread_root_id: thread_root_id || userMessage?.id, // Reply in thread
              is_ai: true,
              metadata: aiMetadata,
            })
            .select()
            .single();

          // USAGE TRACKING: Log token usage and decrement api_balance
          const endTime = Date.now();
          const latencyMs = endTime - startTime;
          
          // Estimate token usage (rough approximation)
          const promptTokens = Math.ceil(prompt.length / 4);
          const contextTokens = Math.ceil(JSON.stringify(context).length / 4);
          const responseTokens = Math.ceil((messageBody || '').length / 4);
          const totalTokens = promptTokens + contextTokens + responseTokens;
          const usageCost = totalTokens * TOKEN_COST_MULTIPLIER;

          // ATOMIC balance debit using RPC to prevent race-condition overdrafts
          // STRICT BILLING: Request fails if billing cannot be processed
          const { data: debitResult, error: debitError } = await supabaseAdmin
            .rpc('debit_api_balance', {
              p_workspace_id: room.workspace_id,
              p_amount: usageCost,
            })
            .single();
          
          // STRICT BILLING ENFORCEMENT: Fail the request if billing fails
          if (debitError || !debitResult?.success) {
            const billingErrorMsg = debitError?.message || debitResult?.error_message || 'Billing processing failed';
            log('error', requestId, 'API balance debit failed - blocking response', {
              workspaceId: room.workspace_id,
              usageCost,
              error: billingErrorMsg,
            });
            
            // Delete the AI message since we can't bill for it
            if (aiMessage?.id) {
              await supabaseAdmin
                .from('huddle_messages')
                .delete()
                .eq('id', aiMessage.id);
            }
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: 'Unable to process billing. Please try again.',
              retryable: true,
            })}\n\n`));
            
            cleanup();
            controller.close();
            return;
          }
          
          const newBalance = debitResult.new_balance;

          // Log usage for analytics
          log('info', requestId, 'AI request completed', {
            workspaceId: room.workspace_id,
            userId: user.id,
            latencyMs,
            promptTokens,
            contextTokens,
            responseTokens,
            totalTokens,
            usageCost,
            remainingBalance: newBalance,
            toolsExecuted: toolResults.map(tr => tr.name),
            moderationPre: preModResult.safe ? 'pass' : preModResult.categories,
            moderationPost: postModResult.safe ? 'pass' : postModResult.categories,
          });

          // Send completion event
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
            type: 'complete', 
            message_id: aiMessage?.id,
            tool_calls: toolResults,
            web_sources: context.webSources,
            usage: { tokens: totalTokens, latency_ms: latencyMs },
          })}\n\n`));

          cleanup();
          controller.close();
        } catch (error) {
          cleanup();
          log('error', requestId, 'Streaming error', { error: error.message });
          
          // Check if it was an abort/timeout
          if (error.name === 'AbortError') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: 'Request timed out', 
              retryable: true,
            })}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
              type: 'error', 
              error: error.message,
            })}\n\n`));
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Huddle AI error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// Llama Guard content moderation - FAIL CLOSED on all errors
async function checkContentWithLlamaGuard(
  groqApiKey: string,
  content: string,
  direction: 'input' | 'output',
  requestId?: string
): Promise<{ safe: boolean; categories: string[]; error?: string }> {
  if (!content?.trim()) {
    return { safe: true, categories: [] };
  }

  try {
    const role = direction === 'input' ? 'User' : 'Agent';
    const prompt = `<|begin_of_text|><|start_header_id|>user<|end_header_id|>

Task: Check if there is unsafe content in '${role}' messages according to our safety policy.

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
${role}: ${content.slice(0, 4000)}
<END CONVERSATION>

Provide your safety assessment for ONLY THE LAST ${role} message:
- First line must read 'safe' or 'unsafe'.
- If unsafe, a second line must include a comma-separated list of violated categories.<|eot_id|><|start_header_id|>assistant<|end_header_id|>`;

    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for moderation

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-guard-4-12b',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
        max_tokens: 50,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // FAIL CLOSED: On API error, block BOTH input and output
      // This prevents unsafe content from slipping through when Groq is down
      console.warn(`Llama Guard API error (${response.status}), failing closed`);
      if (requestId) {
        log('warn', requestId, 'Moderation API error - FAIL CLOSED', { 
          direction, 
          status: response.status,
          action: 'blocked',
        });
      }
      return { 
        safe: false, // FAIL CLOSED - block on any API error
        categories: ['API_ERROR'],
        error: `Moderation API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const text = (data.choices?.[0]?.message?.content || '').trim().toLowerCase();
    const lines = text.split('\n').filter((l: string) => l.trim());
    
    const isSafe = lines[0]?.includes('safe') && !lines[0]?.includes('unsafe');
    const categories: string[] = [];
    
    if (!isSafe && lines[1]) {
      const matches = lines[1].match(/s\d+/gi) || [];
      categories.push(...matches.map((c: string) => c.toUpperCase()));
    }

    return { safe: isSafe, categories };
  } catch (error) {
    // FAIL CLOSED on network/timeout errors - block BOTH input and output
    console.warn('Llama Guard check failed:', error);
    if (requestId) {
      log('warn', requestId, 'Moderation check failed - FAIL CLOSED', { 
        direction, 
        error: error.message,
        action: 'blocked',
      });
    }
    return { 
      safe: false, // FAIL CLOSED - block on any error
      categories: ['CHECK_ERROR'],
      error: error.message,
    };
  }
}

// Generate deterministic hash for tool call idempotency
// SECURITY: Hash is independent of requestId to prevent duplicate execution on retries
// Uses workspace_id + room_id + tool name + arguments to create a stable hash
async function generateToolCallHash(
  toolCall: { id: string; name: string; arguments: string },
  workspaceId: string,
  roomId: string
): Promise<string> {
  // Create a deterministic string from tool call details EXCLUDING requestId
  // This ensures retries of the same prompt don't re-execute the same tool
  const data = `${workspaceId}:${roomId}:${toolCall.name}:${toolCall.arguments}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
}

// Redact PII from text content
function redactPII(text: string): string {
  if (!text) return text;
  let result = text;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

// Redact PII from object values recursively
function redactObjectPII(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === 'string') return redactPII(obj);
  if (Array.isArray(obj)) return obj.map(redactObjectPII);
  if (typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip fields that are likely not PII
      if (['id', 'created_at', 'updated_at', 'status', 'type'].includes(key)) {
        result[key] = value;
      } else {
        result[key] = redactObjectPII(value);
      }
    }
    return result;
  }
  return obj;
}

// Sanitize untrusted content (web search results, shared docs) to prevent prompt injection
function sanitizeUntrustedContent(content: string, source: string): string {
  if (!content) return '';
  
  // Remove potential prompt injection patterns
  const sanitized = content
    // Remove instruction-like patterns
    .replace(/(?:ignore|disregard|forget)\s+(?:the\s+)?(?:above|previous|all)\s+instructions?/gi, '[FILTERED]')
    .replace(/(?:you\s+are|act\s+as|pretend\s+to\s+be|roleplay\s+as)/gi, '[FILTERED]')
    .replace(/(?:system\s*:?\s*prompt|assistant\s*:?\s*|user\s*:?\s*)/gi, '[FILTERED]')
    // Remove code/script tags that could confuse the model
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    // Strip HTML tags but keep text content
    .replace(/<[^>]+>/g, ' ')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
  
  // Wrap in clear provenance marker
  return `[From ${source}]: "${sanitized.substring(0, 500)}${sanitized.length > 500 ? '...' : ''}"`;
}

// Sanitize chat messages to prevent prompt injection via chat history
// SECURITY: User messages in chat history could contain malicious instructions
function sanitizeChatMessage(message: string): string {
  if (!message) return '';
  
  return message
    // Remove patterns that try to override system instructions
    .replace(/(?:ignore|disregard|forget)\s+(?:the\s+)?(?:above|previous|all)\s+instructions?/gi, '[filtered]')
    .replace(/(?:you\s+are|act\s+as|pretend\s+to\s+be|roleplay\s+as)\s+(?:now\s+)?/gi, '[filtered] ')
    .replace(/(?:new\s+)?system\s*:?\s*(?:prompt|instruction|message)/gi, '[filtered]')
    // Don't allow fake role prefixes that could confuse the model
    .replace(/^(?:system|assistant)\s*:/gi, 'user:')
    // Limit message length to prevent context stuffing attacks
    .substring(0, 2000);
}

// Build context from various sources with token budgeting
async function buildContext(
  supabaseUser: any,
  supabaseAdmin: any,
  params: {
    room_id: string;
    thread_root_id?: string;
    workspace_id: string;
    user_id: string;
    options: AIRunRequest['context_options'];
    youComApiKey?: string;
  }
) {
  const { room_id, thread_root_id, workspace_id, options, youComApiKey } = params;
  const context: any = {
    recentMessages: [],
    workspaceData: {},
    webSources: [],
    _contextSize: 0, // Track context size for budgeting
  };

  // Helper to check and update context budget
  const addToContext = (data: any, key: string): boolean => {
    const size = JSON.stringify(data).length;
    if (context._contextSize + size > CONTEXT_LIMITS.MAX_TOTAL_CONTEXT) {
      console.warn(`Context budget exceeded, skipping ${key}`);
      return false;
    }
    context._contextSize += size;
    return true;
  };

  // Get recent messages
  if (options.include_recent_messages !== false) {
    const messageCount = options.message_count || 20;
    
    let query = supabaseUser
      .from('huddle_messages')
      .select(`
        id, body, is_ai, created_at,
        user:profiles!huddle_messages_user_id_fkey(id, full_name)
      `)
      .eq('room_id', room_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(messageCount);

    // If thread context requested, get thread messages
    if (options.include_thread && thread_root_id) {
      query = supabaseUser
        .from('huddle_messages')
        .select(`
          id, body, is_ai, created_at,
          user:profiles!huddle_messages_user_id_fkey(id, full_name)
        `)
        .or(`id.eq.${thread_root_id},thread_root_id.eq.${thread_root_id}`)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(50);
    }

    const { data: messages } = await query;
    context.recentMessages = (messages || []).reverse();
  }

  // Get workspace data if requested (with budgeting)
  if (options.include_workspace_data && options.workspace_data_types?.length) {
    for (const dataType of options.workspace_data_types) {
      // Check if we have budget remaining
      if (context._contextSize >= CONTEXT_LIMITS.MAX_TOTAL_CONTEXT) {
        console.warn('Context budget exhausted, skipping remaining data types');
        break;
      }

      switch (dataType) {
        case 'tasks':
          const { data: tasks } = await supabaseUser
            .from('tasks')
            .select('id, text, status, priority, due_date')
            .eq('workspace_id', workspace_id)
            .neq('status', 'completed')
            .limit(CONTEXT_LIMITS.MAX_ENTITIES_PER_TYPE);
          if (tasks && addToContext(tasks, 'tasks')) {
            context.workspaceData.tasks = tasks;
          }
          break;

        case 'contacts':
          const { data: contacts } = await supabaseUser
            .from('contacts')
            .select('id, name, email, company, title')
            .eq('workspace_id', workspace_id)
            .limit(CONTEXT_LIMITS.MAX_ENTITIES_PER_TYPE);
          if (contacts && addToContext(contacts, 'contacts')) {
            context.workspaceData.contacts = contacts;
          }
          break;

        case 'accounts':
          // Get CRM accounts (companies/organizations)
          const { data: accounts } = await supabaseUser
            .from('crm_items')
            .select('id, name, type, status, priority, website, industry, employee_count, annual_revenue, created_at')
            .eq('workspace_id', workspace_id)
            .order('created_at', { ascending: false })
            .limit(CONTEXT_LIMITS.MAX_ENTITIES_PER_TYPE);
          if (accounts && addToContext(accounts, 'accounts')) {
            context.workspaceData.accounts = accounts;
          }
          break;

        case 'deals':
          const { data: deals } = await supabaseUser
            .from('deals')
            .select('id, name, value, stage, probability')
            .eq('workspace_id', workspace_id)
            .limit(CONTEXT_LIMITS.MAX_ENTITIES_PER_TYPE);
          if (deals && addToContext(deals, 'deals')) {
            context.workspaceData.deals = deals;
          }
          break;

        case 'pipeline':
          const { data: pipeline } = await supabaseUser
            .from('deals')
            .select('stage, value')
            .eq('workspace_id', workspace_id);
          
          // Aggregate pipeline data
          const pipelineSummary = (pipeline || []).reduce((acc: any, deal: any) => {
            if (!acc[deal.stage]) acc[deal.stage] = { count: 0, value: 0 };
            acc[deal.stage].count++;
            acc[deal.stage].value += deal.value || 0;
            return acc;
          }, {});
          if (addToContext(pipelineSummary, 'pipeline')) {
            context.workspaceData.pipeline = pipelineSummary;
          }
          break;

        case 'forms':
          // Get recent forms with submission counts
          const { data: forms } = await supabaseUser
            .from('forms')
            .select('id, title, type, status, created_at, submissions_count')
            .eq('workspace_id', workspace_id)
            .order('created_at', { ascending: false })
            .limit(CONTEXT_LIMITS.MAX_ENTITIES_PER_TYPE);
          
          // Get recent form submissions with form title (limited)
          const { data: formSubmissions } = await supabaseUser
            .from('form_submissions')
            .select(`
              id, data, email, status, created_at, completed_at,
              form:forms!inner(id, title, type)
            `)
            .eq('workspace_id', workspace_id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(CONTEXT_LIMITS.MAX_ENTITIES_PER_TYPE);
          
          // Truncate submission data to prevent context overflow and redact PII
          const truncatedSubmissions = (formSubmissions || []).map((s: any) => ({
            ...s,
            email: s.email ? redactPII(s.email) : null,
            data: redactObjectPII(truncateObject(s.data, CONTEXT_LIMITS.MAX_FORM_SUBMISSION_DATA)),
          }));

          if (forms && addToContext(forms, 'forms')) {
            context.workspaceData.forms = forms;
          }
          if (truncatedSubmissions.length && addToContext(truncatedSubmissions, 'formSubmissions')) {
            context.workspaceData.formSubmissions = truncatedSubmissions;
          }
          break;

        case 'documents':
          // Get recent GTM documents (metadata only for listing)
          const { data: documents } = await supabaseUser
            .from('gtm_docs')
            .select('id, title, doc_type, created_at, updated_at')
            .eq('workspace_id', workspace_id)
            .eq('is_deleted', false)
            .order('updated_at', { ascending: false })
            .limit(CONTEXT_LIMITS.MAX_ENTITIES_PER_TYPE);
          
          if (documents && addToContext(documents, 'documents')) {
            context.workspaceData.documents = documents;
          }
          break;
      }
    }
  }

  // Handle specific selected items if provided (with budgeting)
  if (options.selected_forms?.length) {
    const { data: selectedForms } = await supabaseUser
      .from('forms')
      .select('id, title, type, status')
      .eq('workspace_id', workspace_id)
      .in('id', options.selected_forms.slice(0, 5)); // Limit selected forms
    
    // Get submissions for selected forms
    const { data: selectedSubmissions } = await supabaseUser
      .from('form_submissions')
      .select('id, form_id, data, email, status, created_at')
      .eq('workspace_id', workspace_id)
      .in('form_id', options.selected_forms.slice(0, 5))
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(30); // Reduced from 50
    
    // Truncate submission data and redact PII
    const truncatedSelectedSubmissions = (selectedSubmissions || []).map((s: any) => ({
      ...s,
      email: s.email ? redactPII(s.email) : null,
      data: redactObjectPII(truncateObject(s.data, CONTEXT_LIMITS.MAX_FORM_SUBMISSION_DATA)),
    }));

    if (selectedForms && addToContext(selectedForms, 'selectedForms')) {
      context.selectedForms = selectedForms;
    }
    if (truncatedSelectedSubmissions.length && addToContext(truncatedSelectedSubmissions, 'selectedFormSubmissions')) {
      context.selectedFormSubmissions = truncatedSelectedSubmissions;
    }
  }

  if (options.selected_documents?.length) {
    // Get full document content for selected documents (limited + truncated)
    // Use content_plain for AI context (plain text extraction from rich content)
    const { data: selectedDocs } = await supabaseUser
      .from('gtm_docs')
      .select('id, title, doc_type, content_plain, created_at, updated_at')
      .eq('workspace_id', workspace_id)
      .eq('is_deleted', false)
      .in('id', options.selected_documents.slice(0, 3)); // Limit to 3 docs
    
    // Truncate document content
    const truncatedDocs = (selectedDocs || []).map((d: any) => ({
      id: d.id,
      title: d.title,
      doc_type: d.doc_type,
      content: d.content_plain?.substring(0, CONTEXT_LIMITS.MAX_DOCUMENT_CONTENT) || '',
      created_at: d.created_at,
      updated_at: d.updated_at,
      _truncated: (d.content_plain?.length || 0) > CONTEXT_LIMITS.MAX_DOCUMENT_CONTENT,
    }));

    if (truncatedDocs.length && addToContext(truncatedDocs, 'selectedDocuments')) {
      context.selectedDocuments = truncatedDocs;
    }
  }

  if (options.selected_files?.length) {
    // Get file metadata from documents_metadata table
    const { data: selectedFiles } = await supabaseUser
      .from('documents_metadata')
      .select('id, name, file_type, file_size, description, created_at')
      .eq('workspace_id', workspace_id)
      .in('id', options.selected_files.slice(0, 5)); // Limit files
    
    if (selectedFiles && addToContext(selectedFiles, 'selectedFiles')) {
      context.selectedFiles = selectedFiles;
    }
  }

  // Web research via You.com (with timeout and content sanitization)
  if (options.include_web_research && options.web_research_query && youComApiKey) {
    try {
      const params = new URLSearchParams();
      params.set('query', options.web_research_query);
      params.set('num_web_results', '5');
      
      // Add timeout for web search
      const searchController = new AbortController();
      const searchTimeout = setTimeout(() => searchController.abort(), 10000); // 10s timeout
      
      const searchResponse = await fetch(`https://api.ydc-index.io/search?${params.toString()}`, {
        headers: { 'X-API-Key': youComApiKey },
        signal: searchController.signal,
      });
      
      clearTimeout(searchTimeout);
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        // Handle multiple response structures from You.com API
        const hitsSource = searchData.hits || searchData.results?.web || searchData.results || [];
        context.webSources = (Array.isArray(hitsSource) ? hitsSource : []).slice(0, 5).map((hit: any) => {
          // Extract hostname for source attribution
          let hostname = '';
          try {
            hostname = new URL(hit.url || hit.link || '').hostname;
          } catch { 
            hostname = 'unknown source';
          }
          
          return {
            title: (hit.title || hit.name || '').substring(0, 200),
            url: hit.url || hit.link || '',
            // Sanitize snippet to prevent prompt injection from web content
            snippet: sanitizeUntrustedContent(
              hit.description || hit.snippet || hit.summary || '', 
              hostname
            ),
          };
        }).filter((s: any) => s.url || s.title);
      }
    } catch (e) {
      console.error('You.com search error:', e);
    }
  }

  // Log final context size
  console.log(`Context built: ${context._contextSize} chars, budget: ${CONTEXT_LIMITS.MAX_TOTAL_CONTEXT}`);

  return context;
}

// Helper to truncate object values to a max size
function truncateObject(obj: any, maxSize: number): any {
  if (!obj) return obj;
  const str = JSON.stringify(obj);
  if (str.length <= maxSize) return obj;
  
  // Try to preserve structure by truncating string values
  const result: any = {};
  let currentSize = 2; // for {}
  
  for (const [key, value] of Object.entries(obj)) {
    const keySize = key.length + 3; // for "key":
    if (typeof value === 'string') {
      const remaining = maxSize - currentSize - keySize - 2;
      if (remaining > 20) {
        result[key] = value.substring(0, remaining) + (value.length > remaining ? '...' : '');
        currentSize += keySize + result[key].length + 2;
      }
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      result[key] = value;
      currentSize += keySize + String(value).length;
    }
    if (currentSize >= maxSize - 10) break;
  }
  
  return result;
}

// Build system prompt
function buildSystemPrompt(roomName: string, context: any, userTimezone?: string): string {
  // Get current date/time for the AI in user's timezone
  const now = new Date();
  const timezone = userTimezone || 'America/New_York'; // Default to Eastern if not provided
  
  const currentDate = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: timezone
  });
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: timezone
  });

  let prompt = `You are an AI assistant in the Huddle chat room "${roomName || 'this room'}". 
You help team members with questions, provide insights from workspace data, and assist with tasks.

CURRENT DATE AND TIME: ${currentDate} at ${currentTime}
When users mention relative dates like "next Tuesday", "tomorrow", "next week", calculate the actual date based on today's date above.

IMPORTANT - When to use tools:
- ONLY use create_task when the user EXPLICITLY asks to "create a task", "add a task", "make a task", etc.
- ONLY use other creation tools when the user EXPLICITLY requests creating that specific item
- If the user asks a QUESTION (like "do we have...", "what are...", "show me..."), DO NOT use any tools - just answer the question based on the context provided
- Questions about data should be answered with information, not by creating new items

Guidelines:
- Be concise and helpful
- Use markdown formatting for readability  
- When referencing workspace data, be specific with names and numbers
- If asked about data that isn't in your context, say you don't have that information available
- For dates, always use YYYY-MM-DD format when calling tools
`;

  if (Object.keys(context.workspaceData).length > 0) {
    prompt += `\n\nWorkspace Context:\n`;
    
    if (context.workspaceData.tasks?.length) {
      prompt += `\nActive Tasks (${context.workspaceData.tasks.length}):\n`;
      context.workspaceData.tasks.slice(0, 10).forEach((t: any) => {
        prompt += `- ${t.text} [${t.status}] ${t.due_date ? `Due: ${t.due_date}` : ''}\n`;
      });
    }

    if (context.workspaceData.deals?.length) {
      prompt += `\nActive Deals (${context.workspaceData.deals.length}):\n`;
      context.workspaceData.deals.slice(0, 10).forEach((d: any) => {
        prompt += `- ${d.name}: $${d.value || 0} (${d.stage}, ${d.probability || 0}% probability)\n`;
      });
    }

    if (context.workspaceData.pipeline) {
      prompt += `\nPipeline Summary:\n`;
      for (const [stage, data] of Object.entries(context.workspaceData.pipeline) as any) {
        prompt += `- ${stage}: ${data.count} deals, $${data.value.toLocaleString()}\n`;
      }
    }

    if (context.workspaceData.contacts?.length) {
      prompt += `\nRecent Contacts (${context.workspaceData.contacts.length}):\n`;
      context.workspaceData.contacts.slice(0, 5).forEach((c: any) => {
        prompt += `- ${c.name}${c.title ? ` (${c.title})` : ''}${c.company ? ` at ${c.company}` : ''}\n`;
      });
    }

    if (context.workspaceData.accounts?.length) {
      prompt += `\nCRM Accounts (${context.workspaceData.accounts.length}):\n`;
      context.workspaceData.accounts.forEach((a: any) => {
        const revenue = a.annual_revenue ? `$${Number(a.annual_revenue).toLocaleString()} ARR` : '';
        const employees = a.employee_count ? `${a.employee_count} employees` : '';
        const details = [a.industry, revenue, employees].filter(Boolean).join(', ');
        prompt += `- ${a.name}${a.type ? ` [${a.type}]` : ''}${a.status ? ` (${a.status})` : ''}${details ? ` - ${details}` : ''}\n`;
      });
    }

    if (context.workspaceData.forms?.length) {
      prompt += `\nForms (${context.workspaceData.forms.length}):\n`;
      context.workspaceData.forms.slice(0, 5).forEach((f: any) => {
        prompt += `- ${f.title} [${f.type}/${f.status}] - ${f.submissions_count || 0} submissions\n`;
      });
    }

    if (context.workspaceData.formSubmissions?.length) {
      prompt += `\nRecent Form Submissions (${context.workspaceData.formSubmissions.length}):\n`;
      context.workspaceData.formSubmissions.slice(0, 10).forEach((s: any) => {
        const formTitle = s.form?.title || 'Unknown Form';
        const submittedAt = s.completed_at ? new Date(s.completed_at).toLocaleDateString() : 'N/A';
        const email = s.email || 'Anonymous';
        // Summarize key data fields
        const dataKeys = Object.keys(s.data || {}).slice(0, 3);
        const dataSummary = dataKeys.length > 0 ? ` (${dataKeys.join(', ')})` : '';
        prompt += `- ${formTitle}: ${email} on ${submittedAt}${dataSummary}\n`;
      });
    }

    if (context.workspaceData.documents?.length) {
      prompt += `\nGTM Documents (${context.workspaceData.documents.length}):\n`;
      context.workspaceData.documents.slice(0, 8).forEach((d: any) => {
        const updatedAt = d.updated_at ? new Date(d.updated_at).toLocaleDateString() : '';
        prompt += `- ${d.title} [${d.doc_type}]${updatedAt ? ` - Updated: ${updatedAt}` : ''}\n`;
      });
    }
  }

  // Add selected items context (more detailed since user specifically chose them)
  if (context.selectedForms?.length || context.selectedFormSubmissions?.length) {
    prompt += `\n\nSelected Forms Context:\n`;
    
    if (context.selectedForms?.length) {
      prompt += `Forms:\n`;
      context.selectedForms.forEach((f: any) => {
        prompt += `- ${f.title} (${f.type}, ${f.status})\n`;
      });
    }
    
    if (context.selectedFormSubmissions?.length) {
      prompt += `\nSubmissions Data:\n`;
      context.selectedFormSubmissions.forEach((s: any) => {
        prompt += `\nSubmission from ${s.email || 'Anonymous'} (${new Date(s.created_at).toLocaleDateString()}):\n`;
        // Include all submission data since user specifically selected this
        for (const [key, value] of Object.entries(s.data || {})) {
          prompt += `  - ${key}: ${JSON.stringify(value)}\n`;
        }
      });
    }
  }

  if (context.selectedDocuments?.length) {
    prompt += `\n\nSelected Documents:\n`;
    context.selectedDocuments.forEach((d: any) => {
      prompt += `\n--- ${d.title} (${d.doc_type}) ---\n`;
      // Include document content (truncated if too long)
      const content = d.content?.substring(0, 3000) || '';
      prompt += `${content}${d.content?.length > 3000 ? '\n[Content truncated...]' : ''}\n`;
    });
  }

  if (context.selectedFiles?.length) {
    prompt += `\n\nSelected Files:\n`;
    context.selectedFiles.forEach((f: any) => {
      prompt += `- ${f.name} (${f.file_type}, ${f.file_size ? Math.round(f.file_size / 1024) + 'KB' : 'unknown size'})`;
      if (f.description) prompt += ` - ${f.description}`;
      prompt += `\n`;
    });
  }

  if (context.webSources?.length > 0) {
    prompt += `\n\nWeb Research Results:\n`;
    context.webSources.forEach((s: any, i: number) => {
      prompt += `${i + 1}. ${s.title}\n   ${s.snippet}\n   Source: ${s.url}\n\n`;
    });
    prompt += `When using web research, cite your sources.`;
  }

  return prompt;
}

// Build available tools with server-side permission enforcement
function buildTools(
  options: AIRunRequest['tool_options'], 
  aiCanWrite: boolean, 
  youComApiKey?: string,
  allowedToolsForRole: string[] = ['all']
): any[] {
  const tools: any[] = [];

  // Helper to check if tool is allowed for user's role
  const isToolAllowed = (toolName: string): boolean => {
    if (allowedToolsForRole.includes('all')) return true;
    return allowedToolsForRole.includes(toolName);
  };

  // Only add write tools if room allows, user requested, AND user role permits
  if (aiCanWrite) {
    if (options.allow_task_creation && isToolAllowed('create_task')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a new task in the workspace. ALWAYS use this tool when the user asks to create, add, or make a task.',
          parameters: {
            type: 'object',
            properties: {
              text: { type: 'string', description: 'Task description/title - what needs to be done' },
              category: { 
                type: 'string', 
                enum: ['productsServicesTasks', 'investorTasks', 'customerTasks', 'partnerTasks', 'marketingTasks', 'financialTasks'],
                description: 'Task category/module: productsServicesTasks (general/default), investorTasks (investor-related), customerTasks (customer-related), partnerTasks (partner-related), marketingTasks (marketing), financialTasks (financial). Default to productsServicesTasks if unclear.'
              },
              priority: { type: 'string', enum: ['Low', 'Medium', 'High'], description: 'Task priority (capitalized). Default to Medium if not specified.' },
              due_date: { type: 'string', description: 'Due date in YYYY-MM-DD format' },
            },
            required: ['text'],
          },
        },
      });
    }

    if (options.allow_note_creation && isToolAllowed('create_note')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_note',
          description: 'Create a note or document draft',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Note title' },
              content: { type: 'string', description: 'Note content in markdown' },
            },
            required: ['title', 'content'],
          },
        },
      });
    }

    if (options.allow_contact_creation && isToolAllowed('create_contact')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_contact',
          description: 'Create a new contact in the CRM. Use this when the user wants to add a person or company to their contacts.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Full name of the contact' },
              email: { type: 'string', description: 'Email address' },
              phone: { type: 'string', description: 'Phone number' },
              company: { type: 'string', description: 'Company or organization name' },
              title: { type: 'string', description: 'Job title or role' },
              notes: { type: 'string', description: 'Additional notes about the contact' },
            },
            required: ['name'],
          },
        },
      });
    }

    if (options.allow_account_creation && isToolAllowed('create_account')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_account',
          description: 'Create a new CRM account (investor, customer, partner, or lead). Use this when the user wants to add a company or organization to track in the CRM.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Company or account name' },
              type: { type: 'string', enum: ['investor', 'customer', 'partner', 'lead'], description: 'Type of account' },
              industry: { type: 'string', description: 'Industry or sector' },
              website: { type: 'string', description: 'Company website URL' },
              description: { type: 'string', description: 'Description or notes about the account' },
              stage: { type: 'string', description: 'Current stage (e.g., new, qualified, proposal, negotiation)' },
              value: { type: 'number', description: 'Deal value or investment amount' },
            },
            required: ['name'],
          },
        },
      });
    }

    if (options.allow_expense_creation && isToolAllowed('create_expense')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_expense',
          description: 'Record a business expense. Use this when the user wants to log spending, costs, or purchases.',
          parameters: {
            type: 'object',
            properties: {
              amount: { type: 'number', description: 'Expense amount in dollars' },
              description: { type: 'string', description: 'Description of the expense' },
              category: { type: 'string', enum: ['Payroll', 'Marketing', 'Software', 'Office', 'Travel', 'Legal', 'Professional Services', 'Equipment', 'Utilities', 'Insurance', 'Taxes', 'Other'], description: 'Expense category' },
              date: { type: 'string', description: 'Expense date in YYYY-MM-DD format (defaults to today)' },
              vendor: { type: 'string', description: 'Vendor or supplier name' },
              expense_type: { type: 'string', enum: ['operating', 'marketing', 'sales', 'rd'], description: 'Type of expense for reporting' },
            },
            required: ['amount', 'description'],
          },
        },
      });
    }

    if (options.allow_revenue_creation && isToolAllowed('create_revenue')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_revenue',
          description: 'Record a revenue transaction (invoice, payment, etc). Use this when the user wants to log income or sales.',
          parameters: {
            type: 'object',
            properties: {
              amount: { type: 'number', description: 'Revenue amount in dollars' },
              description: { type: 'string', description: 'Description of the revenue' },
              transaction_type: { type: 'string', enum: ['invoice', 'payment', 'recurring', 'refund'], description: 'Type of transaction' },
              status: { type: 'string', enum: ['pending', 'paid', 'overdue', 'cancelled'], description: 'Transaction status' },
              date: { type: 'string', description: 'Transaction date in YYYY-MM-DD format (defaults to today)' },
              customer_name: { type: 'string', description: 'Customer or client name' },
            },
            required: ['amount', 'description'],
          },
        },
      });
    }

    if (options.allow_deal_creation && isToolAllowed('create_deal')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_deal',
          description: 'Create a new deal in the sales pipeline. Use this when the user wants to track a potential sale or opportunity.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Deal name or title' },
              value: { type: 'number', description: 'Deal value in dollars' },
              stage: { type: 'string', enum: ['lead', 'qualified', 'proposal', 'negotiation', 'closed_won', 'closed_lost'], description: 'Deal pipeline stage' },
              probability: { type: 'number', description: 'Win probability percentage (0-100)' },
              expected_close_date: { type: 'string', description: 'Expected close date in YYYY-MM-DD format' },
              contact_name: { type: 'string', description: 'Primary contact name for this deal' },
              company_name: { type: 'string', description: 'Company or account name' },
              notes: { type: 'string', description: 'Additional notes about the deal' },
            },
            required: ['name'],
          },
        },
      });
    }

    if (options.allow_calendar_event_creation && isToolAllowed('create_calendar_event')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_calendar_event',
          description: 'Create a calendar event or meeting. Use this when the user wants to schedule something or add an event to the calendar.',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string', description: 'Event title' },
              description: { type: 'string', description: 'Event description' },
              start_date: { type: 'string', description: 'Start date and time in ISO format (YYYY-MM-DDTHH:mm:ss)' },
              end_date: { type: 'string', description: 'End date and time in ISO format (YYYY-MM-DDTHH:mm:ss)' },
              location: { type: 'string', description: 'Event location or meeting link' },
              event_type: { type: 'string', enum: ['meeting', 'call', 'task', 'reminder', 'other'], description: 'Type of event' },
              all_day: { type: 'boolean', description: 'Whether this is an all-day event' },
            },
            required: ['title', 'start_date'],
          },
        },
      });
    }

    if (options.allow_marketing_campaign_creation && isToolAllowed('create_marketing_campaign')) {
      tools.push({
        type: 'function',
        function: {
          name: 'create_marketing_campaign',
          description: 'Create a marketing campaign. Use this when the user wants to plan or track a marketing initiative.',
          parameters: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Campaign name' },
              description: { type: 'string', description: 'Campaign description and goals' },
              channel: { type: 'string', enum: ['email', 'social', 'content', 'paid_ads', 'seo', 'events', 'other'], description: 'Marketing channel' },
              status: { type: 'string', enum: ['draft', 'planned', 'active', 'paused', 'completed'], description: 'Campaign status' },
              start_date: { type: 'string', description: 'Campaign start date in YYYY-MM-DD format' },
              end_date: { type: 'string', description: 'Campaign end date in YYYY-MM-DD format' },
              budget: { type: 'number', description: 'Campaign budget in dollars' },
              target_audience: { type: 'string', description: 'Target audience description' },
            },
            required: ['name'],
          },
        },
      });
    }
  }

  // Only add web_search tool if the API key is configured and user role allows
  if (options.allow_web_search && youComApiKey && isToolAllowed('web_search')) {
    tools.push({
      type: 'function',
      function: {
        name: 'web_search',
        description: 'Search the web for information',
        parameters: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' },
          },
          required: ['query'],
        },
      },
    });
  }

  return tools;
}

// Execute a tool call with server-side permission validation and audit logging
async function executeToolCall(
  supabase: any,
  toolCall: { name: string; arguments: string },
  workspace_id: string,
  user_id: string,
  youComApiKey?: string,
  allowedToolsForRole: string[] = ['all'],
  requestId?: string
): Promise<any> {
  // SERVER-SIDE PERMISSION CHECK: Reject tool calls not allowed for this role
  const isToolAllowed = allowedToolsForRole.includes('all') || allowedToolsForRole.includes(toolCall.name);
  if (!isToolAllowed) {
    if (requestId) {
      log('warn', requestId, 'Tool permission denied', { 
        tool: toolCall.name, 
        allowedTools: allowedToolsForRole,
        userId: user_id,
      });
    }
    return { 
      success: false, 
      error: `Permission denied: You don't have access to use ${toolCall.name}` 
    };
  }

  let args: any;
  try {
    args = JSON.parse(toolCall.arguments);
  } catch (e) {
    return { success: false, error: 'Invalid tool arguments: failed to parse JSON' };
  }

  // Basic validation for required fields based on tool
  const validateRequired = (fields: string[], toolName: string) => {
    const missing = fields.filter(f => !args[f] || (typeof args[f] === 'string' && !args[f].trim()));
    if (missing.length > 0) {
      throw new Error(`Missing required field(s) for ${toolName}: ${missing.join(', ')}`);
    }
  };

  // Validate numeric fields are actually numbers
  const validateNumber = (field: string, min?: number, max?: number) => {
    if (args[field] !== undefined) {
      const num = Number(args[field]);
      if (isNaN(num)) throw new Error(`${field} must be a number`);
      if (min !== undefined && num < min) throw new Error(`${field} must be at least ${min}`);
      if (max !== undefined && num > max) throw new Error(`${field} must be at most ${max}`);
      args[field] = num; // Ensure it's stored as number
    }
  };

  // Validate date format (YYYY-MM-DD)
  const validateDate = (field: string) => {
    if (args[field] && !/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/.test(args[field])) {
      throw new Error(`${field} must be in YYYY-MM-DD or ISO format`);
    }
  };

  switch (toolCall.name) {
    case 'create_task':
      validateRequired(['text'], 'create_task');
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          workspace_id,
          user_id: user_id,
          text: args.text,
          category: args.category || 'productsServicesTasks',
          priority: args.priority || 'Medium',
          due_date: args.due_date || null,
          status: 'Todo',
        })
        .select()
        .single();
      
      if (taskError) throw new Error(taskError.message);
      return { success: true, task_id: task.id, title: args.text, category: task.category };

    case 'create_note':
      validateRequired(['title', 'content'], 'create_note');
      const { data: note, error: noteError } = await supabase
        .from('documents')
        .insert({
          workspace_id,
          created_by: user_id,
          title: args.title,
          content: args.content,
          type: 'note',
        })
        .select()
        .single();
      
      if (noteError) throw new Error(noteError.message);
      return { success: true, note_id: note.id, title: note.title };

    case 'create_contact':
      validateRequired(['name'], 'create_contact');
      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          workspace_id,
          created_by: user_id,
          name: args.name,
          email: args.email || null,
          phone: args.phone || null,
          company: args.company || null,
          title: args.title || null,
          notes: args.notes || null,
        })
        .select()
        .single();
      
      if (contactError) throw new Error(contactError.message);
      return { success: true, contact_id: contact.id, name: contact.name };

    case 'create_account':
      validateRequired(['name'], 'create_account');
      validateNumber('value', 0);
      const { data: account, error: accountError } = await supabase
        .from('crm_items')
        .insert({
          workspace_id,
          user_id: user_id,
          name: args.name,
          type: args.type || 'lead',
          industry: args.industry || null,
          website: args.website || null,
          description: args.description || null,
          stage: args.stage || 'new',
          value: args.value || null,
          currency: 'USD',
        })
        .select()
        .single();
      
      if (accountError) throw new Error(accountError.message);
      return { success: true, account_id: account.id, name: account.name, type: account.type };

    case 'create_expense':
      validateRequired(['amount', 'description'], 'create_expense');
      validateNumber('amount', 0);
      validateDate('date');
      const today = new Date().toISOString().split('T')[0];
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          workspace_id,
          user_id: user_id,
          amount: args.amount,
          description: args.description,
          category: args.category || 'Other',
          date: args.date || today,
          vendor: args.vendor || null,
          expense_type: args.expense_type || 'operating',
        })
        .select()
        .single();
      
      if (expenseError) throw new Error(expenseError.message);
      return { success: true, expense_id: expense.id, amount: expense.amount, description: expense.description };

    case 'create_revenue':
      validateRequired(['amount', 'description'], 'create_revenue');
      validateNumber('amount', 0);
      validateDate('date');
      const todayDate = new Date().toISOString().split('T')[0];
      const { data: revenue, error: revenueError } = await supabase
        .from('revenue_transactions')
        .insert({
          workspace_id,
          user_id: user_id,
          amount: args.amount,
          description: args.description,
          transaction_type: args.transaction_type || 'payment',
          status: args.status || 'paid',
          transaction_date: args.date || todayDate,
          customer_name: args.customer_name || null,
          currency: 'USD',
        })
        .select()
        .single();
      
      if (revenueError) throw new Error(revenueError.message);
      return { success: true, revenue_id: revenue.id, amount: revenue.amount, description: revenue.description };

    case 'create_deal':
      validateRequired(['name'], 'create_deal');
      validateNumber('value', 0);
      validateNumber('probability', 0, 100);
      validateDate('expected_close_date');
      const { data: deal, error: dealError } = await supabase
        .from('deals')
        .insert({
          workspace_id,
          user_id: user_id,
          name: args.name,
          value: args.value || 0,
          stage: args.stage || 'lead',
          probability: args.probability || null,
          expected_close_date: args.expected_close_date || null,
          contact_name: args.contact_name || null,
          company_name: args.company_name || null,
          notes: args.notes || null,
          currency: 'USD',
        })
        .select()
        .single();
      
      if (dealError) throw new Error(dealError.message);
      return { success: true, deal_id: deal.id, name: deal.name, value: deal.value, stage: deal.stage };

    case 'create_calendar_event':
      validateRequired(['title', 'start_date'], 'create_calendar_event');
      validateDate('start_date');
      validateDate('end_date');
      const { data: calEvent, error: calEventError } = await supabase
        .from('calendar_events')
        .insert({
          workspace_id,
          user_id: user_id,
          title: args.title,
          description: args.description || null,
          start_time: args.start_date,
          end_time: args.end_date || args.start_date,
          location: args.location || null,
          event_type: args.event_type || 'other',
          all_day: args.all_day || false,
        })
        .select()
        .single();
      
      if (calEventError) throw new Error(calEventError.message);
      return { success: true, event_id: calEvent.id, title: calEvent.title, start_time: calEvent.start_time };

    case 'create_marketing_campaign':
      validateRequired(['name'], 'create_marketing_campaign');
      validateNumber('budget', 0);
      validateDate('start_date');
      validateDate('end_date');
      const { data: campaign, error: campaignError } = await supabase
        .from('marketing_campaigns')
        .insert({
          workspace_id,
          created_by: user_id,
          name: args.name,
          description: args.description || null,
          channel: args.channel || 'other',
          status: args.status || 'draft',
          start_date: args.start_date || null,
          end_date: args.end_date || null,
          budget: args.budget || null,
          target_audience: args.target_audience || null,
        })
        .select()
        .single();
      
      if (campaignError) throw new Error(campaignError.message);
      return { success: true, campaign_id: campaign.id, name: campaign.name, channel: campaign.channel };

    case 'web_search':
      // Perform actual web search via You.com
      if (!youComApiKey) {
        return { success: false, error: 'Web search not configured - missing API key' };
      }
      try {
        const searchQuery = args.query;
        const params = new URLSearchParams();
        params.set('query', searchQuery);
        params.set('num_web_results', '5');
        const searchResponse = await fetch(
          `https://api.ydc-index.io/search?${params.toString()}`,
          { headers: { 'X-API-Key': youComApiKey } }
        );
        if (!searchResponse.ok) {
          throw new Error(`Search API returned ${searchResponse.status}`);
        }
        const searchData = await searchResponse.json();
        // Handle multiple response structures from You.com API
        const hitsSource = searchData.hits || searchData.results?.web || searchData.results || [];
        const results = (Array.isArray(hitsSource) ? hitsSource : []).slice(0, 5).map((hit: any) => ({
          title: hit.title || hit.name || '',
          url: hit.url || hit.link || '',
          snippet: hit.description || hit.snippet || hit.summary || '',
        })).filter((r: any) => r.url || r.title);
        return {
          success: true,
          query: searchQuery,
          results,
          summary: results.length > 0
            ? `Found ${results.length} results for "${searchQuery}":\n${results.map((r: any, i: number) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   Source: ${r.url}`).join('\n\n')}`
            : `No results found for "${searchQuery}"`,
        };
      } catch (e) {
        console.error('Web search error:', e);
        return { success: false, error: `Web search failed: ${e.message}` };
      }

    default:
      throw new Error(`Unknown tool: ${toolCall.name}`);
  }
}
