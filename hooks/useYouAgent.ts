// hooks/useYouAgent.ts
// React hook for running You.com custom agents with streaming support

import { useState, useCallback, useRef } from 'react';
import type { YouAgentSlug } from '../lib/config/youAgents';
import { 
  runYouAgent, 
  YouAgentError,
  type RunAgentResponse,
  type StreamProgressEvent
} from '../lib/services/youAgentClient';

export interface UseYouAgentState {
  loading: boolean;
  error: string | null;
  errorCode: YouAgentError['code'] | null;
  lastResponse: RunAgentResponse | null;
  resetIn: number | null;
  // Streaming state
  streamingOutput: string;
  isStreaming: boolean;
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
  
  // Streaming state
  const [streamingOutput, setStreamingOutput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Track accumulated output during streaming
  const accumulatedOutputRef = useRef('');

  const handleStreamProgress = useCallback((event: StreamProgressEvent) => {
    switch (event.type) {
      case 'delta':
        if (event.delta) {
          accumulatedOutputRef.current += event.delta;
          setStreamingOutput(accumulatedOutputRef.current);
        }
        break;
      case 'done':
        setIsStreaming(false);
        break;
      case 'keepalive':
        // Connection still alive - no action needed
        break;
      case 'error':
        console.error('[useYouAgent] Stream error:', event.error);
        break;
    }
  }, []);

  const run = useCallback(async (input: string, context?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setResetIn(null);
    setStreamingOutput('');
    setIsStreaming(true);
    accumulatedOutputRef.current = '';

    try {
      const response = await runYouAgent({
        agent,
        input,
        context,
        stream: true, // Enable streaming by default
        onProgress: handleStreamProgress,
      });
      
      setLastResponse(response);
      setIsStreaming(false);
      return response;
    } catch (err) {
      console.error('[useYouAgent] Error:', err);
      setIsStreaming(false);
      
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
  }, [agent, handleStreamProgress]);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setErrorCode(null);
    setLastResponse(null);
    setResetIn(null);
    setStreamingOutput('');
    setIsStreaming(false);
    accumulatedOutputRef.current = '';
  }, []);

  return {
    run,
    reset,
    loading,
    error,
    errorCode,
    lastResponse,
    resetIn,
    streamingOutput,
    isStreaming,
  };
}
