/// <reference path="../types/deno_http_server.d.ts" />
// supabase/functions/you-agent-run/index.ts
// Edge Function: proxy requests from FounderHQ to You.com custom agents.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const YOUCOM_API_URL = "https://api.you.com/v1/agents/runs";

// Rate limiting configuration
const RATE_LIMIT = 10; // requests per minute per user (lower for agents as they're more expensive)
const RATE_WINDOW_MS = 60_000;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  Deno.env.get('ALLOWED_ORIGIN') || 'https://founderhq.setique.com',
  'http://localhost:3001',
  'http://localhost:3000',
];

const getAllowedOrigin = (req: Request): string => {
  const origin = req.headers.get('origin') || '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    return origin;
  }
  return ALLOWED_ORIGINS[0];
};

const corsHeaders = (req: Request): Record<string, string> => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(req),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-workspace-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
});

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
  context?: Record<string, unknown>;
  stream?: boolean;
}

interface AgentRunResponse {
  output?: string;
  sections?: {
    type: string;
    content: string;
  }[];
  sources?: {
    title?: string;
    url: string;
    snippet?: string;
  }[];
  metadata?: Record<string, unknown>;
  error?: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(req),
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    // Initialize Supabase client to verify user
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('[you-agent-run] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    // Rate limiting
    const rateCheck = checkRateLimit(user.id);
    if (!rateCheck.allowed) {
      console.warn(`[you-agent-run] Rate limit exceeded for user ${user.id}`);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded. Please wait before making more agent requests.',
          resetIn: Math.ceil(rateCheck.resetIn / 1000),
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders(req),
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
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
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
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    if (!body.input?.trim()) {
      return new Response(
        JSON.stringify({ error: 'input is required' }),
        {
          status: 400,
          headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`[you-agent-run] User ${user.id} running agent ${body.agentId}`);

    // Build You.com API payload
    const youPayload = {
      agent: body.agentId,
      input: body.input.trim(),
      context: body.context ?? {},
      stream: body.stream ?? false,
    };

    // Call You.com agents API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for agents

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

      if (!youRes.ok) {
        const errorText = await youRes.text();
        console.error(`[you-agent-run] You.com API error (${youRes.status}):`, errorText);
        
        return new Response(
          JSON.stringify({
            error: `Agent request failed: ${youRes.status === 429 ? 'Rate limited by You.com' : 'API error'}`,
            details: youRes.status,
          }),
          {
            status: youRes.status >= 500 ? 502 : youRes.status,
            headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          }
        );
      }

      const youJson = await youRes.json();

      // Normalize the response for the frontend
      const normalizedResponse: AgentRunResponse = normalizeAgentResponse(youJson);

      console.log(`[you-agent-run] Success for user ${user.id}, agent ${body.agentId}`);

      return new Response(JSON.stringify(normalizedResponse), {
        status: 200,
        headers: {
          ...corsHeaders(req),
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateCheck.remaining),
        },
      });

    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.error('[you-agent-run] Request timeout');
        return new Response(
          JSON.stringify({ error: 'Agent request timed out. Please try again.' }),
          {
            status: 504,
            headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
          }
        );
      }
      throw fetchError;
    }

  } catch (err: unknown) {
    console.error('[you-agent-run] Unexpected error:', err);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
      }
    );
  }
});

/**
 * Normalize You.com agent response into a consistent format
 */
function normalizeAgentResponse(raw: Record<string, unknown>): AgentRunResponse {
  const response: AgentRunResponse = {};

  // Extract main output text
  if (typeof raw.output === 'string') {
    response.output = raw.output;
  } else if (Array.isArray(raw.output)) {
    // Handle chunked output format
    const textChunks = raw.output
      .filter((chunk: unknown) => {
        if (typeof chunk === 'object' && chunk !== null) {
          const c = chunk as Record<string, unknown>;
          return c.type === 'text' || c.text || c.content;
        }
        return typeof chunk === 'string';
      })
      .map((chunk: unknown) => {
        if (typeof chunk === 'string') return chunk;
        const c = chunk as Record<string, unknown>;
        return (c.text || c.content || '') as string;
      });
    response.output = textChunks.join('\n');
  } else if (raw.text) {
    response.output = raw.text as string;
  } else if (raw.content) {
    response.output = raw.content as string;
  }

  // Extract sources/citations if available
  if (Array.isArray(raw.sources)) {
    response.sources = raw.sources.map((s: unknown) => {
      const source = s as Record<string, unknown>;
      return {
        title: source.title as string | undefined,
        url: (source.url || source.link || source.source) as string,
        snippet: (source.snippet || source.description) as string | undefined,
      };
    }).filter(s => s.url);
  } else if (Array.isArray(raw.citations)) {
    response.sources = raw.citations.map((c: unknown) => {
      const citation = c as Record<string, unknown>;
      return {
        title: citation.title as string | undefined,
        url: (citation.url || citation.link) as string,
        snippet: citation.snippet as string | undefined,
      };
    }).filter(s => s.url);
  }

  // Extract metadata
  if (raw.metadata && typeof raw.metadata === 'object') {
    response.metadata = raw.metadata as Record<string, unknown>;
  }

  return response;
}
