// supabase/functions/api-v1-agents/index.ts
// Premium API - AI Agents endpoint
// POST /api/v1/agents/run - Run an AI agent query
// GET /api/v1/agents/history - Get agent run history

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import {
  createApiHandler,
  successResponse,
  errorResponse,
  corsHeaders,
  type ApiRequestContext,
  type ApiScope,
} from '../_shared/apiAuth.ts';
import { triggerWebhook } from '../_shared/webhookTrigger.ts';

// ============================================
// CONSTANTS
// ============================================

const YOUCOM_API_URL = 'https://api.you.com/v1/agents/runs';
const DEFAULT_AGENT_ID = 'founderhq-research'; // Can be overridden
const MAX_INPUT_LENGTH = 10000;
const TIMEOUT_MS = 120_000; // 2 minutes

// ============================================
// TYPES
// ============================================

interface AgentRunInput {
  query: string;
  agent_id?: string;
  context?: string;
  include_sources?: boolean;
}

interface AgentRunResponse {
  run_id: string;
  output: string;
  sources: {
    title: string;
    url: string;
    snippet?: string;
  }[];
  metadata: {
    agent_id: string;
    run_time_ms: number;
    tokens_used?: number;
  };
}

interface AgentHistoryParams {
  limit?: number;
  offset?: number;
}

// ============================================
// HANDLERS
// ============================================

async function runAgent(
  ctx: ApiRequestContext,
  input: AgentRunInput
): Promise<Response> {
  const { supabase, workspaceId, keyId } = ctx;

  // Validate input
  if (!input.query || input.query.trim() === '') {
    return errorResponse('Query is required', 400, 'validation_error');
  }

  if (input.query.length > MAX_INPUT_LENGTH) {
    return errorResponse(`Query exceeds maximum length of ${MAX_INPUT_LENGTH} characters`, 400, 'validation_error');
  }

  // Get You.com API key from secrets
  const youApiKey = Deno.env.get('YOU_API_KEY');
  if (!youApiKey) {
    console.error('[api-v1-agents] YOU_API_KEY not configured');
    return errorResponse('Agent service not configured', 503, 'service_unavailable');
  }

  const agentId = input.agent_id || Deno.env.get('YOU_AGENT_ID') || DEFAULT_AGENT_ID;
  const startTime = Date.now();

  // Build the prompt with optional context
  let fullPrompt = input.query;
  if (input.context) {
    fullPrompt = `Context: ${input.context}\n\nQuery: ${input.query}`;
  }

  try {
    // Call You.com API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const youResponse = await fetch(YOUCOM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${youApiKey}`,
      },
      body: JSON.stringify({
        agent_id: agentId,
        input: fullPrompt,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!youResponse.ok) {
      const errorText = await youResponse.text();
      console.error(`[api-v1-agents] You.com API error (${youResponse.status}):`, errorText);
      
      if (youResponse.status === 429) {
        return errorResponse('Agent rate limit exceeded. Please try again later.', 429, 'rate_limited');
      }
      
      return errorResponse('Agent service error', 502, 'upstream_error');
    }

    const youData = await youResponse.json();
    const runTimeMs = Date.now() - startTime;

    // Parse sources from You.com response
    const sources: AgentRunResponse['sources'] = [];
    if (youData.web_search_results && Array.isArray(youData.web_search_results)) {
      for (const result of youData.web_search_results) {
        if (result.citation_uri || result.url) {
          sources.push({
            title: result.title || 'Source',
            url: result.citation_uri || result.url,
            snippet: result.snippet,
          });
        }
      }
    }

    // Generate run ID
    const runId = crypto.randomUUID();

    // Log the agent run for history
    await supabase
      .from('agent_runs')
      .insert({
        id: runId,
        workspace_id: workspaceId,
        api_key_id: keyId,
        agent_id: agentId,
        query: input.query,
        context: input.context || null,
        output: youData.output || youData.answer || '',
        sources: sources,
        run_time_ms: runTimeMs,
        created_at: new Date().toISOString(),
      })
      .catch(err => console.error('[api-v1-agents] Failed to log run:', err));

    const response: AgentRunResponse = {
      run_id: runId,
      output: youData.output || youData.answer || '',
      sources: input.include_sources !== false ? sources : [],
      metadata: {
        agent_id: agentId,
        run_time_ms: runTimeMs,
      },
    };

    // Trigger webhook for completed agent run
    triggerWebhook(supabase, {
      workspaceId,
      eventType: 'agent.run_completed',
      entityId: runId,
      payload: {
        run_id: runId,
        agent_id: agentId,
        query: input.query,
        run_time_ms: runTimeMs,
        sources_count: sources.length,
      },
    }).catch(err => console.error('[api-v1-agents] Webhook trigger error:', err));

    return successResponse(response);
  } catch (err) {
    // Trigger webhook for failed agent run
    triggerWebhook(supabase, {
      workspaceId,
      eventType: 'agent.run_failed',
      entityId: crypto.randomUUID(),
      payload: {
        query: input.query,
        error: err instanceof Error ? err.message : 'Unknown error',
        agent_id: input.agent_id || DEFAULT_AGENT_ID,
      },
    }).catch(webhookErr => console.error('[api-v1-agents] Webhook trigger error:', webhookErr));

    if (err instanceof Error && err.name === 'AbortError') {
      return errorResponse('Agent request timed out', 504, 'timeout');
    }
    console.error('[api-v1-agents] Run error:', err);
    return errorResponse('Failed to run agent', 500, 'internal_error');
  }
}

async function getAgentHistory(
  ctx: ApiRequestContext,
  params: AgentHistoryParams
): Promise<Response> {
  const { supabase, workspaceId } = ctx;
  const limit = Math.min(params.limit || 20, 100);
  const offset = params.offset || 0;

  const { data, error, count } = await supabase
    .from('agent_runs')
    .select('id, agent_id, query, output, sources, run_time_ms, created_at', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    // Table might not exist yet - return empty
    if (error.code === '42P01') {
      return successResponse({
        runs: [],
        pagination: { total: 0, limit, offset, has_more: false },
      });
    }
    console.error('[api-v1-agents] History error:', error);
    return errorResponse('Failed to fetch agent history', 500, 'database_error');
  }

  return successResponse({
    runs: data || [],
    pagination: {
      total: count || 0,
      limit,
      offset,
      has_more: (count || 0) > offset + limit,
    },
  });
}

// ============================================
// ROUTER
// ============================================

async function handleRequest(ctx: ApiRequestContext, req: Request): Promise<Response> {
  const url = new URL(req.url);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const method = req.method;

  // POST /agents/run or POST /agents (run agent)
  if (method === 'POST') {
    const action = pathParts[1];
    if (!action || action === 'run') {
      try {
        const input = await req.json() as AgentRunInput;
        return runAgent(ctx, input);
      } catch {
        return errorResponse('Invalid JSON body', 400, 'invalid_request');
      }
    }
  }

  // GET /agents/history
  if (method === 'GET') {
    const action = pathParts[1];
    if (action === 'history') {
      const params: AgentHistoryParams = {
        limit: parseInt(url.searchParams.get('limit') || '20'),
        offset: parseInt(url.searchParams.get('offset') || '0'),
      };
      return getAgentHistory(ctx, params);
    }
  }

  return errorResponse('Not found', 404, 'not_found');
}

// ============================================
// MAIN
// ============================================

function getRequiredScopes(req: Request): ApiScope[] {
  // Agent operations require agents:run scope
  return ['agents:run'];
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const requiredScopes = getRequiredScopes(req);

  const handler = createApiHandler(handleRequest, {
    requiredScopes,
    allowedMethods: ['GET', 'POST'],
  });

  return handler(req);
});
