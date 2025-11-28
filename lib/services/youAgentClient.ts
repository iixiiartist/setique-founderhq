// lib/services/youAgentClient.ts
// Client to call the you-agent-run edge function

import { supabase } from '../supabase';
import type { YouAgentSlug } from '../config/youAgents';
import { YOU_AGENTS } from '../config/youAgents';

export interface RunAgentParams {
  agent: YouAgentSlug;
  input: string;
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
 * Note: This can take 30-120+ seconds for complex research queries
 */
export async function runYouAgent(params: RunAgentParams): Promise<RunAgentResponse> {
  const { agent, input, context } = params;
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

  console.log('[youAgentClient] Invoking agent:', agentConfig.id, 'with session:', !!session);

  // Create an AbortController for client-side timeout
  // We set this slightly higher than the edge function timeout to let it handle errors gracefully
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 130000); // 130s timeout (edge function has 120s)

  try {
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/you-agent-run`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          agentId: agentConfig.id,
          input,
          context,
          stream: false,
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    // Handle non-OK responses
    if (!response.ok) {
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
          'The AI agent is taking longer than expected. This can happen with complex research queries. Please try again with a simpler query.',
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

    const data = await response.json();

    // Check for error in response body
    if (data.error) {
      throw new YouAgentError(data.error, 'api');
    }

    if (!data.output) {
      throw new YouAgentError('No response from agent', 'api');
    }

    return data as RunAgentResponse;

  } catch (err: unknown) {
    clearTimeout(timeoutId);

    // Re-throw YouAgentError as-is
    if (err instanceof YouAgentError) {
      throw err;
    }

    // Handle abort (timeout)
    if (err instanceof Error && err.name === 'AbortError') {
      throw new YouAgentError(
        'The request timed out. AI research can take up to 2 minutes for complex queries. Please try again.',
        'timeout'
      );
    }

    // Handle network errors (including CORS failures which happen on 504 without proper headers)
    if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new YouAgentError(
        'Network error. The AI agent may have timed out. Please try again with a simpler query.',
        'network'
      );
    }

    // Unknown error
    console.error('[youAgentClient] Unexpected error:', err);
    throw new YouAgentError(
      err instanceof Error ? err.message : 'An unexpected error occurred',
      'unknown'
    );
  }
}

function tryParseJson(str: unknown): Record<string, unknown> | null {
  if (typeof str !== 'string') return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
