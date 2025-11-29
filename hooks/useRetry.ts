// hooks/useRetry.ts
// React hook for retryable async operations with loading and error states

import { useState, useCallback, useRef } from 'react';
import { withRetry, RetryOptions, isTransientError } from '../lib/utils/retry';
import { logger, EndOperationFn } from '../lib/utils/logger';
import { handleError, ErrorHandlerOptions } from '../lib/services/errorService';

export interface UseRetryOptions extends RetryOptions {
  /** Error handling options */
  errorHandling?: ErrorHandlerOptions;
  /** Reset error state on new attempt */
  resetOnRetry?: boolean;
}

export interface UseRetryState<T> {
  /** Current data from successful operation */
  data: T | null;
  /** Current error if operation failed */
  error: Error | null;
  /** Whether operation is in progress */
  isLoading: boolean;
  /** Whether operation has ever succeeded */
  hasSucceeded: boolean;
  /** Number of retry attempts made */
  attemptCount: number;
}

export interface UseRetryReturn<T> extends UseRetryState<T> {
  /** Execute the operation with retry logic */
  execute: () => Promise<T | null>;
  /** Execute with new parameters */
  executeWith: <P>(params: P, fn: (params: P) => Promise<T>) => Promise<T | null>;
  /** Manually reset state */
  reset: () => void;
  /** Manually retry last operation */
  retry: () => Promise<T | null>;
}

const DEFAULT_OPTIONS: UseRetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  resetOnRetry: true,
  errorHandling: {
    showToast: true,
  },
};

/**
 * Hook for retryable async operations
 * 
 * @example
 * const { execute, data, isLoading, error, retry } = useRetry(
 *   () => fetchData(),
 *   { maxAttempts: 3 }
 * );
 * 
 * // Execute on mount
 * useEffect(() => { execute(); }, [execute]);
 * 
 * // Show retry button on error
 * {error && <button onClick={retry}>Retry</button>}
 */
export function useRetry<T>(
  operation: () => Promise<T>,
  options?: UseRetryOptions
): UseRetryReturn<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const [state, setState] = useState<UseRetryState<T>>({
    data: null,
    error: null,
    isLoading: false,
    hasSucceeded: false,
    attemptCount: 0,
  });

  const operationRef = useRef(operation);
  operationRef.current = operation;

  const lastParamsRef = useRef<{ fn: (...args: unknown[]) => Promise<T>; params: unknown } | null>(null);

  const reset = useCallback(() => {
    setState({
      data: null,
      error: null,
      isLoading: false,
      hasSucceeded: false,
      attemptCount: 0,
    });
    lastParamsRef.current = null;
  }, []);

  const executeOperation = useCallback(async <P>(
    fn: (params?: P) => Promise<T>,
    params?: P
  ): Promise<T | null> => {
    // Reset error if configured
    if (opts.resetOnRetry) {
      setState(prev => ({ ...prev, error: null }));
    }

    setState(prev => ({ ...prev, isLoading: true }));
    
    let attemptCount = 0;
    const endOperation: EndOperationFn = logger.startOperation('useRetry', {
      operation: fn.name || 'anonymous',
    });

    try {
      const result = await withRetry(
        () => {
          attemptCount++;
          return fn(params);
        },
        {
          maxAttempts: opts.maxAttempts,
          initialDelayMs: opts.initialDelayMs,
          maxDelayMs: opts.maxDelayMs,
          backoffMultiplier: opts.backoffMultiplier,
          isRetryable: opts.isRetryable || isTransientError,
          onRetry: (attempt, err, delayMs) => {
            logger.info(`[useRetry] Retry attempt ${attempt}, waiting ${delayMs}ms`);
            opts.onRetry?.(attempt, err, delayMs);
          },
        }
      );

      setState({
        data: result,
        error: null,
        isLoading: false,
        hasSucceeded: true,
        attemptCount,
      });

      endOperation({ success: true, context: { attemptCount } });
      return result;

    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      
      setState(prev => ({
        ...prev,
        error,
        isLoading: false,
        attemptCount,
      }));

      // Handle error with centralized service
      if (opts.errorHandling) {
        handleError(error, {
          ...opts.errorHandling,
          context: { 
            ...opts.errorHandling.context, 
            attemptCount,
            operation: fn.name || 'anonymous',
          },
        });
      }

      endOperation({ error, context: { attemptCount } });
      return null;
    }
  }, [opts]);

  const execute = useCallback(async (): Promise<T | null> => {
    lastParamsRef.current = null;
    return executeOperation(operationRef.current);
  }, [executeOperation]);

  const executeWith = useCallback(async <P>(
    params: P,
    fn: (params: P) => Promise<T>
  ): Promise<T | null> => {
    lastParamsRef.current = { fn, params };
    return executeOperation(fn, params);
  }, [executeOperation]);

  const retry = useCallback(async (): Promise<T | null> => {
    if (lastParamsRef.current) {
      const { fn, params } = lastParamsRef.current;
      return executeOperation(fn as (p: unknown) => Promise<T>, params);
    }
    return execute();
  }, [execute, executeOperation]);

  return {
    ...state,
    execute,
    executeWith,
    reset,
    retry,
  };
}

/**
 * Hook for mutation operations with retry
 * Similar to useRetry but optimized for mutations (POST, PUT, DELETE)
 */
export function useRetryMutation<TData, TParams>(
  mutationFn: (params: TParams) => Promise<TData>,
  options?: UseRetryOptions
): {
  mutate: (params: TParams) => Promise<TData | null>;
  mutateAsync: (params: TParams) => Promise<TData>;
  data: TData | null;
  error: Error | null;
  isLoading: boolean;
  reset: () => void;
} {
  const { executeWith, data, error, isLoading, reset } = useRetry<TData>(
    () => Promise.reject(new Error('No params provided')),
    options
  );

  const mutate = useCallback(async (params: TParams): Promise<TData | null> => {
    return executeWith(params, mutationFn);
  }, [executeWith, mutationFn]);

  const mutateAsync = useCallback(async (params: TParams): Promise<TData> => {
    const result = await executeWith(params, mutationFn);
    if (result === null) {
      throw error || new Error('Mutation failed');
    }
    return result;
  }, [executeWith, mutationFn, error]);

  return {
    mutate,
    mutateAsync,
    data,
    error,
    isLoading,
    reset,
  };
}
