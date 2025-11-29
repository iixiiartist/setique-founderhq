// lib/services/youAgentClient.ts
// Client to call the you-agent-run edge function
// Supports both streaming (SSE) and non-streaming modes

import { supabase } from '../supabase';
import type { YouAgentSlug } from '../config/youAgents';
import { YOU_AGENTS } from '../config/youAgents';

export interface RunAgentParams {
  agent: YouAgentSlug;
  input: string;
  stream?: boolean; // If true, streams response progressively (recommended for long queries)
  onProgress?: (event: StreamProgressEvent) => void; // Called during streaming
  context?: {
    urls?: string[];
    founderhq_context?: {
      goal?: string;
      notes?: string;
      businessContext?: string;
      product?: string;
      icp?: string;
      region?: string;
      deal_context?: string;
    };
    [key: string]: unknown;
  };
}

export interface StreamProgressEvent {
  type: 'delta' | 'sources' | 'done' | 'keepalive' | 'error';
  delta?: string; // Text chunk for 'delta' type
  sources?: AgentSource[]; // Sources for 'sources' type
  output?: string; // Full accumulated output for 'done' type
  error?: string; // Error message for 'error' type
  metadata?: Record<string, unknown>;
}

export interface AgentSource {
  title?: string;
  url: string;
  snippet?: string;
}

export interface RunAgentResponse {
  output?: string;
  sections?: {
    type: string;
    content: string;
  }[];
  sources?: AgentSource[];
  metadata?: Record<string, unknown>;
  error?: string;
}

export class YouAgentError extends Error {
  constructor(
    message: string,
    public readonly code: 'rate_limit' | 'auth' | 'config' | 'api' | 'timeout' | 'network' | 'unknown',
    public readonly resetIn?: number
  ) {
    super(message);
    this.name = 'YouAgentError';
  }
}

/**
 * Run a You.com custom agent via the edge function
 * By default uses streaming to prevent timeouts on long-running queries.
 * 
 * @param params.stream - If true (default), uses SSE streaming to prevent timeouts
 * @param params.onProgress - Callback for streaming progress updates
 */
export async function runYouAgent(params: RunAgentParams): Promise<RunAgentResponse> {
  const { agent, input, context, stream = true, onProgress } = params;
  const agentConfig = YOU_AGENTS[agent];

  if (!agentConfig) {
    throw new YouAgentError(`Unknown agent slug: ${agent}`, 'config');
  }

  if (!agentConfig.enabled) {
    throw new YouAgentError(`Agent "${agentConfig.label}" is not enabled`, 'config');
  }

  if (!agentConfig.id) {
    throw new YouAgentError(`Agent "${agentConfig.label}" is not configured with a You.com agent ID`, 'config');
  }

  // Get the current session to ensure we have auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new YouAgentError('You must be logged in to use AI agents', 'auth');
  }

  console.log('[youAgentClient] Invoking agent:', agentConfig.id, 'stream:', stream);

  // Use streaming mode by default to prevent 504 timeouts
  if (stream) {
    return runYouAgentStreaming(agentConfig.id, input, context, session.access_token, onProgress);
  }

  // Non-streaming mode (legacy - may timeout on long queries)
  return runYouAgentNonStreaming(agentConfig.id, input, context, session.access_token);
}

/**
 * Streaming implementation - keeps connection alive with SSE
 */
async function runYouAgentStreaming(
  agentId: string,
  input: string,
  context: RunAgentParams['context'],
  accessToken: string,
  onProgress?: (event: StreamProgressEvent) => void
): Promise<RunAgentResponse> {
  // Longer timeout for streaming (5 minutes)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 300000);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/you-agent-run`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          agentId,
          input,
          context,
          stream: true,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
      return handleErrorResponse(response);
    }

    // Process SSE stream
    const result = await processSSEStream(response, onProgress);
    
    if (!result.output) {
      throw new YouAgentError('No response from agent', 'api');
    }

    return result;

  } catch (err: unknown) {
    clearTimeout(timeoutId);
    throw normalizeError(err);
  }
}

/**
 * Process SSE stream from edge function and accumulate response
 */
async function processSSEStream(
  response: Response,
  onProgress?: (event: StreamProgressEvent) => void
): Promise<RunAgentResponse> {
  const result: RunAgentResponse = {
    output: '',
    sources: [],
    metadata: {},
  };

  const reader = response.body?.getReader();
  if (!reader) {
    throw new YouAgentError('No response body', 'api');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  console.log('[youAgentClient] Starting SSE stream processing...');

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        console.log('[youAgentClient] Stream ended');
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      // Process complete events in buffer
      const lines = buffer.split('\n\n');
      buffer = lines.pop() || ''; // Keep incomplete event in buffer

      for (const eventBlock of lines) {
        const event = parseSSEEvent(eventBlock);
        if (!event) continue;

        // Handle keepalive
        if (event.type === 'keepalive') {
          onProgress?.({ type: 'keepalive' });
          continue;
        }

        // Process event data
        processEventData(event, result, onProgress);
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Notify completion
  onProgress?.({ 
    type: 'done', 
    output: result.output, 
    sources: result.sources,
    metadata: result.metadata 
  });

  // Deduplicate sources
  if (result.sources && result.sources.length > 0) {
    const seen = new Set<string>();
    result.sources = result.sources.filter(s => {
      if (seen.has(s.url)) return false;
      seen.add(s.url);
      return true;
    });
  }

  console.log('[youAgentClient] Stream complete, output length:', result.output?.length || 0);
  return result;
}

interface SSEEvent {
  type: string;
  data: string;
}

function parseSSEEvent(eventBlock: string): SSEEvent | null {
  const trimmed = eventBlock.trim();
  if (!trimmed) return null;

  // Handle keepalive comments
  if (trimmed.startsWith(': keepalive') || trimmed === ':') {
    return { type: 'keepalive', data: '' };
  }

  // Skip other comments
  if (trimmed.startsWith(':')) {
    return null;
  }

  let eventType = '';
  const dataLines: string[] = [];

  for (const line of trimmed.split('\n')) {
    if (line.startsWith('event:')) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  const data = dataLines.join('\n');
  return { type: eventType || 'message', data };
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

function processEventData(
  event: SSEEvent,
  result: RunAgentResponse,
  onProgress?: (event: StreamProgressEvent) => void
): void {
  if (!event.data) return;

  try {
    const parsed = JSON.parse(event.data);
    const type = parsed.type || event.type;

    switch (type) {
      case 'response.output_text.delta': {
        const delta = parsed.response?.delta;
        if (delta && typeof delta === 'string') {
          result.output = (result.output || '') + delta;
          onProgress?.({ type: 'delta', delta });
        }
        break;
      }
      
      case 'response.output_content.full': {
        if (parsed.response?.type === 'web_search.results' && Array.isArray(parsed.response?.full)) {
          const sources = parsed.response.full.map((item: WebSearchResult) => ({
            title: item.title,
            url: item.url || item.citation_uri,
            snippet: item.snippet,
          })).filter((s: { url?: string }) => s.url);
          result.sources = [...(result.sources || []), ...sources];
          onProgress?.({ type: 'sources', sources });
        }
        break;
      }
      
      case 'response.done': {
        if (parsed.response) {
          result.metadata = {
            run_time_ms: parsed.response.run_time_ms,
            finished: parsed.response.finished,
          };
        }
        break;
      }
    }
  } catch {
    // Ignore parse errors for individual events
  }
}

/**
 * Non-streaming implementation (legacy - may timeout on long queries)
 */
async function runYouAgentNonStreaming(
  agentId: string,
  input: string,
  context: RunAgentParams['context'],
  accessToken: string
): Promise<RunAgentResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 130000);

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/you-agent-run`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          agentId,
          input,
          context,
          stream: false,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return handleErrorResponse(response);
    }

    const data = await response.json();

    if (data.error) {
      throw new YouAgentError(data.error, 'api');
    }

    if (!data.output) {
      throw new YouAgentError('No response from agent', 'api');
    }

    return data as RunAgentResponse;

  } catch (err: unknown) {
    clearTimeout(timeoutId);
    throw normalizeError(err);
  }
}

async function handleErrorResponse(response: Response): Promise<never> {
  let errorData: { error?: string; resetIn?: number } = {};
  try {
    errorData = await response.json();
  } catch {
    // Response might not be JSON
  }

  if (response.status === 429) {
    throw new YouAgentError(
      errorData.error || 'Rate limit exceeded. Please wait before making more requests.',
      'rate_limit',
      errorData.resetIn
    );
  }

  if (response.status === 401 || response.status === 403) {
    throw new YouAgentError('Authentication required. Please sign in again.', 'auth');
  }

  if (response.status === 504) {
    throw new YouAgentError(
      'The AI agent is taking longer than expected. Please try a simpler or more specific query.',
      'timeout'
    );
  }

  if (response.status >= 500) {
    throw new YouAgentError(
      errorData.error || 'Server error. Please try again in a moment.',
      'api'
    );
  }

  throw new YouAgentError(
    errorData.error || `Request failed with status ${response.status}`,
    'api'
  );
}

function normalizeError(err: unknown): YouAgentError {
  if (err instanceof YouAgentError) {
    return err;
  }

  if (err instanceof Error && err.name === 'AbortError') {
    return new YouAgentError(
      'The request timed out. Please try again with a simpler query.',
      'timeout'
    );
  }

  if (err instanceof TypeError && err.message.includes('fetch')) {
    return new YouAgentError(
      'Network error. Please check your connection and try again.',
      'network'
    );
  }

  console.error('[youAgentClient] Unexpected error:', err);
  return new YouAgentError(
    err instanceof Error ? err.message : 'An unexpected error occurred',
    'unknown'
  );
}
