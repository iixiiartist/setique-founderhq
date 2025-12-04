import { supabase } from "@/lib/supabase";
import { generateMockYouSearchResponse } from "./mockYouSearchData";
import type { ResearchMode, YouSearchResponse } from "./youSearch.types";

type FunctionsErrorLike = {
  message?: string;
  context?: Record<string, unknown> & {
    status?: number;
    response_status?: number;
    response?: { status?: number };
  };
};

type AIProvider = 'youcom' | 'groq';

const normalizeFlag = (value: string | undefined) => value?.toLowerCase().trim();
const mockFlag = normalizeFlag(import.meta.env.VITE_USE_MOCK_AI_SEARCH);
const forceMock = mockFlag === 'true';

const extractFunctionsErrorMessage = (error: unknown): string => {
  if (!error) {
    return 'Unexpected error while calling ai-search';
  }

  const errorLike = error as { message?: string; context?: any };
  const context = errorLike?.context;

  const possibleValues: Array<unknown> = [
    context?.error,
    context?.message,
    context?.body,
    context?.response_body,
    context?.details,
  ];

  for (const value of possibleValues) {
    if (!value) continue;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed?.error === 'string') {
          return parsed.error;
        }
        if (typeof parsed?.message === 'string') {
          return parsed.message;
        }
      } catch {
        return value;
      }
      continue;
    }

    if (typeof value === 'object') {
      const maybeError = value as { error?: string; message?: string };
      if (typeof maybeError?.error === 'string') {
        return maybeError.error;
      }
      if (typeof maybeError?.message === 'string') {
        return maybeError.message;
      }
    }
  }

  return errorLike?.message || 'Edge Function returned an unknown error';
};

const getStatusCode = (error: unknown): number | null => {
  const context = (error as FunctionsErrorLike | undefined)?.context;
  if (!context) return null;
  if (typeof context.status === 'number') return context.status;
  if (typeof context.response_status === 'number') return context.response_status;
  if (typeof context.response?.status === 'number') return context.response.status;
  return null;
};

export interface YouSearchOptions {
  count?: number;
  /** 
   * AI provider to use: 'groq' for Groq Compound (faster), 'youcom' for You.com 
   * Defaults to 'groq' for search/rag modes if GROQ_API_KEY is configured
   */
  provider?: AIProvider;
  /** Use faster but less comprehensive model (groq/compound-mini) */
  fast?: boolean;
}

const shouldFallbackToMock = (): boolean => forceMock;

const returnMockResponse = (query: string, mode: ResearchMode): YouSearchResponse => {
  console.warn('[youSearchService] Mock research is enabled. Disable VITE_USE_MOCK_AI_SEARCH to hide synthetic links.');
  return generateMockYouSearchResponse(query, mode);
};

export const searchWeb = async (
  query: string,
  mode: ResearchMode = 'search',
  options: YouSearchOptions = {},
): Promise<YouSearchResponse> => {
  const trimmedQuery = query?.trim();

  if (!trimmedQuery) {
    throw new Error('Please provide a topic or question to research.');
  }

  if (forceMock) {
    return generateMockYouSearchResponse(trimmedQuery, mode);
  }

  const requestBody: Record<string, unknown> = {
    query: trimmedQuery,
    mode,
  };

  if (typeof options.count === 'number') {
    requestBody.count = options.count;
  }

  // Pass provider preference to edge function
  if (options.provider) {
    requestBody.provider = options.provider;
  }

  // Pass fast mode flag
  if (options.fast) {
    requestBody.fast = true;
  }

  console.log('[youSearchService] Calling ai-search with:', { query: trimmedQuery, mode, options });
  
  const { data, error } = await supabase.functions.invoke('ai-search', {
    body: requestBody,
  });

  if (error) {
    console.error('[youSearchService] Error calling ai-search function:', error);
    const friendlyMessage = extractFunctionsErrorMessage(error);
    const statusCode = getStatusCode(error);
    
    // Provide more specific error messages
    if (statusCode === 401) {
      throw new Error('Authentication required. Please sign in to use web search.');
    }
    if (statusCode === 429) {
      throw new Error('Too many requests. Please wait a moment before searching again.');
    }
    if (statusCode === 500 || statusCode === 502) {
      throw new Error('Web search service is temporarily unavailable. Please check that GROQ_API_KEY or YOUCOM_API_KEY is configured in Supabase secrets.');
    }
    
    if (shouldFallbackToMock()) {
      return returnMockResponse(trimmedQuery, mode);
    }
    throw new Error(friendlyMessage);
  }

  if (!data) {
    console.warn('[youSearchService] No data returned from ai-search');
    if (shouldFallbackToMock()) {
      return returnMockResponse(trimmedQuery, mode);
    }
    throw new Error('No data returned from ai-search');
  }

  console.log('[youSearchService] Received response:', { 
    hasHits: !!data.hits?.length, 
    hasQa: !!data.qa?.answer,
    provider: data.metadata?.provider 
  });
  
  return data as YouSearchResponse;
};

/**
 * Fast web search using Groq Compound (preferred for quick lookups)
 * Falls back to You.com if Groq is unavailable
 */
export const searchWebFast = async (
  query: string,
  options: Omit<YouSearchOptions, 'provider' | 'fast'> = {},
): Promise<YouSearchResponse> => {
  return searchWeb(query, 'search', { 
    ...options, 
    provider: 'groq', 
    fast: true 
  });
};

/**
 * Deep research using Groq Compound RAG mode
 * Good for synthesized answers with sources
 */
export const researchDeep = async (
  query: string,
  options: Omit<YouSearchOptions, 'provider'> = {},
): Promise<YouSearchResponse> => {
  return searchWeb(query, 'rag', { 
    ...options, 
    provider: 'groq' 
  });
};
