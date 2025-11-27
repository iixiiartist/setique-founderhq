// hooks/useYouAgent.ts
// React hook for running You.com custom agents

import { useState, useCallback } from 'react';
import type { YouAgentSlug } from '../lib/config/youAgents';
import { 
  runYouAgent, 
  YouAgentError,
  type RunAgentResponse 
} from '../lib/services/youAgentClient';

export interface UseYouAgentState {
  loading: boolean;
  error: string | null;
  errorCode: YouAgentError['code'] | null;
  lastResponse: RunAgentResponse | null;
  resetIn: number | null;
}

export interface UseYouAgentReturn extends UseYouAgentState {
  run: (input: string, context?: Record<string, unknown>) => Promise<RunAgentResponse>;
  reset: () => void;
}

export function useYouAgent(agent: YouAgentSlug): UseYouAgentReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<YouAgentError['code'] | null>(null);
  const [lastResponse, setLastResponse] = useState<RunAgentResponse | null>(null);
  const [resetIn, setResetIn] = useState<number | null>(null);

  const run = useCallback(async (input: string, context?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setResetIn(null);

    try {
      const response = await runYouAgent({
        agent,
        input,
        context,
      });
      
      setLastResponse(response);
      return response;
    } catch (err) {
      console.error('[useYouAgent] Error:', err);
      
      if (err instanceof YouAgentError) {
        setError(err.message);
        setErrorCode(err.code);
        if (err.resetIn) {
          setResetIn(err.resetIn);
        }
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setErrorCode('unknown');
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [agent]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setErrorCode(null);
    setLastResponse(null);
    setResetIn(null);
  }, []);

  return {
    run,
    reset,
    loading,
    error,
    errorCode,
    lastResponse,
    resetIn,
  };
}
