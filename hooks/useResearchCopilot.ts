// hooks/useResearchCopilot.ts
// React hook for the enhanced Research Copilot with synthesis and quality scoring

import { useState, useCallback, useRef } from 'react';
import {
  runResearch,
  quickResearch,
  deepResearch,
  marketResearch,
  competitiveResearch,
  type ResearchMode,
  type ResearchDocContext,
  type ResearchOptions,
  type ResearchResponse,
  type ResearchError,
} from '../src/lib/services/researchCopilotService';

export interface UseResearchCopilotState {
  loading: boolean;
  error: string | null;
  errorCode: ResearchError['code'] | null;
  resetIn: number | null;
  response: ResearchResponse | null;
  // Convenience accessors
  synthesis: ResearchResponse['synthesis'] | null;
  sources: ResearchResponse['sources'];
  rawAnswer: string | null;
  metadata: ResearchResponse['metadata'] | null;
}

export interface UseResearchCopilotReturn extends UseResearchCopilotState {
  // Research methods
  research: (query: string, mode?: ResearchMode, options?: ResearchOptions) => Promise<ResearchResponse | null>;
  quickSearch: (query: string) => Promise<ResearchResponse | null>;
  deepDive: (query: string) => Promise<ResearchResponse | null>;
  marketAnalysis: (query: string) => Promise<ResearchResponse | null>;
  competitiveAnalysis: (query: string) => Promise<ResearchResponse | null>;
  // Utils
  reset: () => void;
  setDocContext: (context: ResearchDocContext) => void;
}

export function useResearchCopilot(
  initialDocContext?: ResearchDocContext
): UseResearchCopilotReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ResearchError['code'] | null>(null);
  const [resetIn, setResetIn] = useState<number | null>(null);
  const [response, setResponse] = useState<ResearchResponse | null>(null);
  
  const docContextRef = useRef<ResearchDocContext | undefined>(initialDocContext);

  const setDocContext = useCallback((context: ResearchDocContext) => {
    docContextRef.current = context;
  }, []);

  const handleError = useCallback((err: unknown) => {
    console.error('[useResearchCopilot] Error:', err);
    
    const researchError = err as ResearchError;
    setError(researchError.message || 'Research failed. Please try again.');
    setErrorCode(researchError.code || 'unknown');
    
    if (researchError.resetIn) {
      setResetIn(researchError.resetIn);
    }
  }, []);

  const research = useCallback(async (
    query: string,
    mode: ResearchMode = 'quick',
    options?: ResearchOptions
  ): Promise<ResearchResponse | null> => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setResetIn(null);

    try {
      const result = await runResearch(query, mode, docContextRef.current, options);
      setResponse(result);
      return result;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const quickSearch = useCallback(async (query: string): Promise<ResearchResponse | null> => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setResetIn(null);

    try {
      const result = await quickResearch(query, docContextRef.current);
      setResponse(result);
      return result;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const deepDive = useCallback(async (query: string): Promise<ResearchResponse | null> => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setResetIn(null);

    try {
      const result = await deepResearch(query, docContextRef.current);
      setResponse(result);
      return result;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const marketAnalysis = useCallback(async (query: string): Promise<ResearchResponse | null> => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setResetIn(null);

    try {
      const result = await marketResearch(query, docContextRef.current);
      setResponse(result);
      return result;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const competitiveAnalysis = useCallback(async (query: string): Promise<ResearchResponse | null> => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setResetIn(null);

    try {
      const result = await competitiveResearch(query, docContextRef.current);
      setResponse(result);
      return result;
    } catch (err) {
      handleError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setErrorCode(null);
    setResetIn(null);
    setResponse(null);
  }, []);

  return {
    // State
    loading,
    error,
    errorCode,
    resetIn,
    response,
    // Convenience accessors
    synthesis: response?.synthesis ?? null,
    sources: response?.sources ?? [],
    rawAnswer: response?.rawAnswer ?? null,
    metadata: response?.metadata ?? null,
    // Methods
    research,
    quickSearch,
    deepDive,
    marketAnalysis,
    competitiveAnalysis,
    reset,
    setDocContext,
  };
}

export type { 
  ResearchMode, 
  ResearchDocContext, 
  ResearchOptions, 
  ResearchResponse,
  ResearchError,
} from '../src/lib/services/researchCopilotService';

export {
  getQualityTier,
  getQualityColor,
  getQualityStars,
  getInsightIcon,
  getSourceTypeIcon,
} from '../src/lib/services/researchCopilotService';
