// src/lib/services/researchCopilotService.ts
// Client service for the enhanced Research Copilot edge function
// Provides structured research with synthesis and source quality scoring

import { supabase } from '@/lib/supabase';

// ============================================================================
// Types
// ============================================================================

export type ResearchMode = 'quick' | 'deep' | 'competitive' | 'market' | 'synthesis';

export interface ResearchDocContext {
  title?: string;
  type?: string;
  workspace?: string;
  tags?: string[];
}

export interface ResearchOptions {
  maxSources?: number;
  synthesize?: boolean;
  includeCompetitors?: boolean;
  freshness?: 'day' | 'week' | 'month' | 'year';
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet: string;
  quality: number;       // 0-100 quality score
  freshness: 'recent' | 'moderate' | 'dated';
  domain: string;
  type: 'news' | 'article' | 'research' | 'company' | 'government' | 'other';
}

export interface ResearchInsight {
  type: 'key_finding' | 'statistic' | 'trend' | 'opportunity' | 'risk' | 'action';
  title: string;
  content: string;
  confidence: 'high' | 'medium' | 'low';
  sources: number[]; // indices into sources array
}

export interface ResearchSynthesis {
  summary: string;
  insights: ResearchInsight[];
  keyStats: Array<{ label: string; value: string; source?: number }>;
}

export interface ResearchResponse {
  synthesis: ResearchSynthesis;
  sources: ResearchSource[];
  rawAnswer?: string;
  metadata: {
    mode: ResearchMode;
    query: string;
    provider: string;
    durationMs: number;
    sourceCount: number;
    synthesisModel?: string;
  };
}

export interface ResearchError {
  message: string;
  code: 'rate_limit' | 'auth' | 'config' | 'validation' | 'api' | 'unknown';
  resetIn?: number;
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Run enhanced research with synthesis
 * Returns structured insights with quality-scored sources
 */
export async function runResearch(
  query: string,
  mode: ResearchMode = 'quick',
  docContext?: ResearchDocContext,
  options?: ResearchOptions
): Promise<ResearchResponse> {
  const trimmedQuery = query?.trim();

  if (!trimmedQuery) {
    throw createResearchError('Please provide a topic or question to research.', 'validation');
  }

  // Verify user is authenticated before making request
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw createResearchError('Please sign in to use research features.', 'auth');
  }

  console.log('[researchCopilotService] Running research:', { query: trimmedQuery, mode });

  // Explicitly pass auth header - supabase.functions.invoke doesn't always include it
  const { data, error } = await supabase.functions.invoke('research-copilot', {
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
    body: {
      query: trimmedQuery,
      mode,
      docContext,
      options: {
        synthesize: options?.synthesize ?? true,
        maxSources: options?.maxSources ?? 10,
        includeCompetitors: options?.includeCompetitors,
        freshness: options?.freshness,
      },
    },
  });

  if (error) {
    console.error('[researchCopilotService] Error:', error);
    throw normalizeError(error);
  }

  if (!data) {
    throw createResearchError('No data returned from research service', 'api');
  }

  console.log('[researchCopilotService] Success:', {
    sourceCount: data.sources?.length,
    insightCount: data.synthesis?.insights?.length,
    durationMs: data.metadata?.durationMs,
  });

  return data as ResearchResponse;
}

/**
 * Quick research - fast mode for simple lookups
 */
export async function quickResearch(
  query: string,
  docContext?: ResearchDocContext
): Promise<ResearchResponse> {
  return runResearch(query, 'quick', docContext, { synthesize: true });
}

/**
 * Deep research - comprehensive analysis with You.com agents
 */
export async function deepResearch(
  query: string,
  docContext?: ResearchDocContext
): Promise<ResearchResponse> {
  return runResearch(query, 'deep', docContext, { synthesize: true });
}

/**
 * Market research - focused on market data and trends
 */
export async function marketResearch(
  query: string,
  docContext?: ResearchDocContext
): Promise<ResearchResponse> {
  return runResearch(query, 'market', docContext, { synthesize: true });
}

/**
 * Competitive research - focused on competitive analysis
 */
export async function competitiveResearch(
  query: string,
  docContext?: ResearchDocContext
): Promise<ResearchResponse> {
  return runResearch(query, 'competitive', docContext, { 
    synthesize: true, 
    includeCompetitors: true 
  });
}

// ============================================================================
// Helper Functions
// ============================================================================

function createResearchError(message: string, code: ResearchError['code'], resetIn?: number): ResearchError {
  const error = new Error(message) as Error & ResearchError;
  error.code = code;
  if (resetIn) error.resetIn = resetIn;
  return error;
}

function normalizeError(error: unknown): ResearchError {
  if (!error) {
    return createResearchError('Unknown error occurred', 'unknown');
  }

  const errorLike = error as { 
    message?: string; 
    context?: { 
      error?: string;
      message?: string;
      body?: string;
      status?: number;
    } 
  };

  // Check for rate limit
  const context = errorLike.context;
  if (context?.status === 429) {
    return createResearchError(
      'Rate limit exceeded. Please wait before making more research requests.',
      'rate_limit'
    );
  }

  // Extract message from context
  let message = 'Research failed';
  
  if (context?.error && typeof context.error === 'string') {
    message = context.error;
  } else if (context?.message && typeof context.message === 'string') {
    message = context.message;
  } else if (context?.body && typeof context.body === 'string') {
    try {
      const parsed = JSON.parse(context.body);
      if (parsed.error) message = parsed.error;
    } catch {
      message = context.body;
    }
  } else if (errorLike.message) {
    message = errorLike.message;
  }

  // Determine error code
  let code: ResearchError['code'] = 'unknown';
  
  if (context?.status === 401 || context?.status === 403) {
    code = 'auth';
  } else if (context?.status === 400) {
    code = 'validation';
  } else if (context?.status === 503) {
    code = 'config';
  } else if (context?.status && context.status >= 500) {
    code = 'api';
  }

  return createResearchError(message, code);
}

// ============================================================================
// Quality Helpers
// ============================================================================

/**
 * Get quality tier label for a source
 */
export function getQualityTier(quality: number): 'high' | 'medium' | 'low' {
  if (quality >= 70) return 'high';
  if (quality >= 40) return 'medium';
  return 'low';
}

/**
 * Get quality color class for a source
 */
export function getQualityColor(quality: number): string {
  if (quality >= 70) return 'text-green-600';
  if (quality >= 40) return 'text-amber-600';
  return 'text-gray-500';
}

/**
 * Get quality stars (1-3) for a source
 */
export function getQualityStars(quality: number): number {
  if (quality >= 70) return 3;
  if (quality >= 40) return 2;
  return 1;
}

/**
 * Get icon for insight type
 */
export function getInsightIcon(type: ResearchInsight['type']): string {
  const icons: Record<ResearchInsight['type'], string> = {
    key_finding: '💡',
    statistic: '📊',
    trend: '📈',
    opportunity: '🎯',
    risk: '⚠️',
    action: '✅',
  };
  return icons[type] || '📌';
}

/**
 * Get source type icon
 */
export function getSourceTypeIcon(type: ResearchSource['type']): string {
  const icons: Record<ResearchSource['type'], string> = {
    news: '📰',
    article: '📄',
    research: '🔬',
    company: '🏢',
    government: '🏛️',
    other: '🔗',
  };
  return icons[type] || '🔗';
}
