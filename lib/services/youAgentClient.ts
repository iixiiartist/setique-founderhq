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
    public readonly code: 'rate_limit' | 'auth' | 'config' | 'api' | 'timeout' | 'unknown',
    public readonly resetIn?: number
  ) {
    super(message);
    this.name = 'YouAgentError';
  }
}

/**
 * Run a You.com custom agent via the edge function
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

  const { data, error } = await supabase.functions.invoke('you-agent-run', {
    body: {
      agentId: agentConfig.id,
      input,
      context,
      stream: false,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (error) {
    console.error('[youAgentClient] Edge function error:', error);
    
    // Try to extract error details
    const errorContext = error as { context?: { status?: number; response_body?: string } };
    const status = errorContext?.context?.status;
    
    if (status === 429) {
      const body = tryParseJson(errorContext?.context?.response_body);
      const resetIn = typeof body?.resetIn === 'number' ? body.resetIn : undefined;
      throw new YouAgentError(
        'Rate limit exceeded. Please wait before making more requests.',
        'rate_limit',
        resetIn
      );
    }
    
    if (status === 401) {
      throw new YouAgentError('Authentication required. Please sign in.', 'auth');
    }
    
    if (status === 504) {
      throw new YouAgentError('Agent request timed out. Please try again.', 'timeout');
    }

    throw new YouAgentError(
      error.message || 'Failed to run agent',
      'api'
    );
  }

  if (!data) {
    throw new YouAgentError('No response from agent', 'api');
  }

  // Check for error in response body
  if (data.error) {
    throw new YouAgentError(data.error, 'api');
  }

  return data as RunAgentResponse;
}

function tryParseJson(str: unknown): Record<string, unknown> | null {
  if (typeof str !== 'string') return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
