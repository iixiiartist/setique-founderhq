/// <reference path="../types/deno_http_server.d.ts" />
// supabase/functions/you-agent-run/index.ts
// Edge Function: proxy requests from FounderHQ to You.com custom agents.
// Supports both streaming (SSE passthrough) and non-streaming modes.
// Streaming keeps connection alive to prevent 504 timeouts on long-running queries.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// You.com Agents API endpoint
const YOUCOM_API_URL = "https://api.you.com/v1/agents/runs";

// Rate limiting configuration
const RATE_LIMIT = 10; // requests per minute per user
const RATE_WINDOW_MS = 60_000;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

// Timeout configuration
const STREAM_TIMEOUT_MS = 300_000; // 5 minutes for streaming (client handles keepalive)
const NON_STREAM_TIMEOUT_MS = 120_000; // 2 minutes for non-streaming

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-workspace-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const checkRateLimit = (userId: string): { allowed: boolean; remaining: number; resetIn: number } => {
  const now = Date.now();
  const userLimit = rateLimits.get(userId);

  if (!userLimit || now >= userLimit.resetAt) {
    rateLimits.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return { allowed: true, remaining: RATE_LIMIT - 1, resetIn: RATE_WINDOW_MS };
  }

  if (userLimit.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0, resetIn: userLimit.resetAt - now };
  }

  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT - userLimit.count, resetIn: userLimit.resetAt - now };
};

interface AgentRunRequest {
  agentId?: string;
  input: string;
  stream?: boolean; // If true, returns SSE stream to client instead of accumulating
}

interface WebSearchResult {
  source_type?: string;
  citation_uri?: string;
  provider?: string;
  title?: string;
  snippet?: string;
  thumbnail_url?: string;
  url?: string;
}

interface AgentRunResponse {
  output?: string;
  sources?: {
    title?: string;
    url: string;
    snippet?: string;
  }[];
  metadata?: {
    run_time_ms?: string;
    finished?: boolean;
  };
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Log that we received a request (for debugging)
    console.log('[you-agent-run] Received request');
    
    // Get user ID from auth header if present (for rate limiting)
    // Auth is optional - we validate on client side
    const authHeader = req.headers.get('authorization');
    let userId = 'anonymous';
    
    if (authHeader) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } },
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          userId = user.id;
          console.log('[you-agent-run] Authenticated user:', userId);
        }
      } catch (e) {
        console.warn('[you-agent-run] Auth check failed, using anonymous rate limit');
      }
    }

    // Rate limiting (still applies even without auth)
    const rateCheck = checkRateLimit(userId);
    if (!rateCheck.allowed) {
      console.warn(`[you-agent-run] Rate limit exceeded for ${userId}`);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please wait before making more agent requests.',
          resetIn: Math.ceil(rateCheck.resetIn / 1000),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Remaining': String(rateCheck.remaining),
            'X-RateLimit-Reset': String(Math.ceil(rateCheck.resetIn / 1000)),
          },
        }
      );
    }

    // Get API key
    const apiKey = Deno.env.get('YOUCOM_API_KEY');
    if (!apiKey) {
      console.error('[you-agent-run] YOUCOM_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'You.com API key not configured. Contact support.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    const body = await req.json() as AgentRunRequest;

    if (!body.agentId) {
      return new Response(
        JSON.stringify({ error: 'agentId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!body.input?.trim()) {
      return new Response(
        JSON.stringify({ error: 'input is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[you-agent-run] User ${userId} running agent ${body.agentId}, stream=${body.stream ?? false}`);

    // Build You.com Agents API payload
    const youPayload = {
      agent: body.agentId,
      input: body.input.trim(),
      stream: true,  // Always use streaming from You.com for best results
    };

    console.log(`[you-agent-run] Calling You.com API with agent: ${body.agentId}`);

    // Call You.com agents API with abort controller for timeout
    const controller = new AbortController();
    const timeoutMs = body.stream ? STREAM_TIMEOUT_MS : NON_STREAM_TIMEOUT_MS;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const youRes = await fetch(YOUCOM_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(youPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(`[you-agent-run] You.com API response status: ${youRes.status}`);

      if (!youRes.ok) {
        const errorText = await youRes.text();
        console.error(`[you-agent-run] You.com API error (${youRes.status}):`, errorText);
        
        let errorMessage = 'Agent request failed';
        if (youRes.status === 400) {
          errorMessage = 'Invalid request - check agent ID';
        } else if (youRes.status === 401 || youRes.status === 403) {
          errorMessage = 'API authentication failed';
        } else if (youRes.status === 429) {
          errorMessage = 'Rate limited by You.com';
        }
        
        return new Response(
          JSON.stringify({ error: errorMessage, details: errorText }),
          { status: youRes.status >= 500 ? 502 : youRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If client requested streaming, pass through the SSE stream
      if (body.stream) {
        console.log('[you-agent-run] Streaming response to client. You.com status:', youRes.status, 'Headers:', JSON.stringify(Object.fromEntries(youRes.headers.entries())));
        return streamResponse(youRes, rateCheck.remaining);
      }

      // Otherwise, process the SSE stream and accumulate the response (original behavior)
      const result = await processSSEStream(youRes);
      
      console.log(`[you-agent-run] Success for user ${userId}, output length: ${result.output?.length || 0}`);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      });

    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[you-agent-run] Request timed out');
        return new Response(
          JSON.stringify({ error: 'Agent request timed out. The research may be taking longer than expected. Please try a simpler query.' }),
          { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw fetchError;
    }

  } catch (err: unknown) {
    console.error('[you-agent-run] Unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Stream SSE response from You.com API directly to client
 * This keeps the connection alive and prevents 504 timeouts
 */
function streamResponse(youRes: Response, remaining: number): Response {
  const reader = youRes.body?.getReader();
  if (!reader) {
    return new Response(
      JSON.stringify({ error: 'No response body from You.com API' }),
      { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create a transform stream that passes through data and sends periodic keepalives
  let lastActivity = Date.now();
  const KEEPALIVE_INTERVAL = 15000; // Send keepalive every 15 seconds
  let keepaliveTimer: number | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial comment as keepalive to establish connection
      controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
      
      // Set up keepalive timer
      keepaliveTimer = setInterval(() => {
        const now = Date.now();
        if (now - lastActivity > KEEPALIVE_INTERVAL - 1000) {
          try {
            controller.enqueue(new TextEncoder().encode(': keepalive\n\n'));
            console.log('[you-agent-run] Sent keepalive');
          } catch {
            // Stream may be closed
          }
        }
      }, KEEPALIVE_INTERVAL) as unknown as number;
    },
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        lastActivity = Date.now();
        
        if (done) {
          if (keepaliveTimer) clearInterval(keepaliveTimer);
          controller.close();
          console.log('[you-agent-run] Stream complete - closed by You.com');
          return;
        }
        
        // Log data chunks for debugging (first 200 chars of first chunk)
        if (value && value.length > 0) {
          const text = new TextDecoder().decode(value);
          console.log('[you-agent-run] Received chunk, length:', value.length, 'preview:', text.substring(0, 200));
        }
        
        controller.enqueue(value);
      } catch (err) {
        if (keepaliveTimer) clearInterval(keepaliveTimer);
        console.error('[you-agent-run] Stream error:', err);
        controller.error(err);
      }
    },
    cancel() {
      if (keepaliveTimer) clearInterval(keepaliveTimer);
      reader.releaseLock();
      console.log('[you-agent-run] Stream cancelled');
    }
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-RateLimit-Remaining': String(remaining),
    },
  });
}

/**
 * Process SSE stream from You.com API and accumulate the full response
 */
async function processSSEStream(response: Response): Promise<AgentRunResponse> {
  const result: AgentRunResponse = {
    output: '',
    sources: [],
    metadata: {},
  };

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let fullRawData = '';

  console.log('[you-agent-run] Starting SSE stream processing...');

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('[you-agent-run] SSE stream ended');
        break;
      }

      const chunk = decoder.decode(value, { stream: true });
      fullRawData += chunk;
    }
  } finally {
    reader.releaseLock();
  }

  console.log('[you-agent-run] Full raw response length:', fullRawData.length);

  // Normalize line endings - You.com uses \r\n
  const normalizedData = fullRawData.replace(/\r\n/g, '\n');
  
  // Split by double newline to get SSE events
  const events = normalizedData.split('\n\n');
  console.log('[you-agent-run] Total SSE events found:', events.length);

  let eventCount = 0;
  for (const event of events) {
    const trimmed = event.trim();
    if (!trimmed) continue;
    
    // Skip ping comments (lines starting with :)
    if (trimmed.startsWith(':')) {
      continue;
    }
    
    eventCount++;

    // Parse SSE event
    const lines = trimmed.split('\n');
    let eventType = '';
    let dataLines: string[] = [];
    
    for (const line of lines) {
      if (line.startsWith('event:')) {
        eventType = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      } else if (line.startsWith('id:')) {
        // Ignore id field
      } else if (line.startsWith(':')) {
        // Skip comments
      }
    }

    const data = dataLines.join('\n');
    if (!data) continue;

    // Log first few events for debugging
    if (eventCount <= 5) {
      console.log(`[you-agent-run] Event ${eventCount}: type="${eventType}", data=${data.substring(0, 200)}`);
    }

    try {
      const parsed = JSON.parse(data);
      const type = parsed.type || eventType;
      
      switch (type) {
        case 'response.output_text.delta':
          // The delta text is in response.delta
          const delta = parsed.response?.delta;
          if (delta && typeof delta === 'string') {
            result.output = (result.output || '') + delta;
          }
          break;
          
        case 'response.output_content.full':
          // Handle web search results (sources)
          if (parsed.response?.type === 'web_search.results' && Array.isArray(parsed.response?.full)) {
            const sources = parsed.response.full.map((item: WebSearchResult) => ({
              title: item.title,
              url: item.url || item.citation_uri,
              snippet: item.snippet,
            })).filter((s: { url?: string }) => s.url);
            result.sources = [...(result.sources || []), ...sources];
            console.log(`[you-agent-run] Found ${sources.length} sources`);
          }
          break;
          
        case 'response.done':
          if (parsed.response) {
            result.metadata = {
              run_time_ms: parsed.response.run_time_ms,
              finished: parsed.response.finished,
            };
          }
          console.log('[you-agent-run] Response done, output length:', result.output?.length || 0);
          break;
          
        case 'response.created':
        case 'response.starting':
        case 'response.output_item.added':
        case 'response.output_item.done':
          // Status events - ignore
          break;
          
        default:
          console.log(`[you-agent-run] Unknown event type: ${type}`);
      }
    } catch (parseErr) {
      console.warn('[you-agent-run] Failed to parse:', data.substring(0, 100));
    }
  }

  console.log(`[you-agent-run] Processed ${eventCount} events, final output length: ${result.output?.length || 0}`);

  // Deduplicate sources
  if (result.sources && result.sources.length > 0) {
    const seen = new Set<string>();
    result.sources = result.sources.filter(s => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }

  return result;
}
