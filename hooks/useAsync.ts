import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * State for async operations
 */
export interface AsyncState<T> {
  /** The data returned from the async operation */
  data: T | null;
  /** Error if the operation failed */
  error: Error | null;
  /** Whether the operation is currently loading */
  isLoading: boolean;
  /** Whether the operation has completed successfully at least once */
  isSuccess: boolean;
  /** Whether the operation has failed */
  isError: boolean;
}

/**
 * Options for useAsync hook
 */
export interface UseAsyncOptions<T> {
  /** Initial data value */
  initialData?: T | null;
  /** Whether to execute immediately on mount */
  immediate?: boolean;
  /** Callback when operation succeeds */
  onSuccess?: (data: T) => void;
  /** Callback when operation fails */
  onError?: (error: Error) => void;
  /** Reset state before each execution */
  resetOnExecute?: boolean;
}

/**
 * Return type for useAsync hook
 */
export interface UseAsyncReturn<T, Args extends unknown[]> extends AsyncState<T> {
  /** Execute the async operation */
  execute: (...args: Args) => Promise<T | null>;
  /** Reset state to initial values */
  reset: () => void;
  /** Set data manually */
  setData: (data: T | null) => void;
}

/**
 * Hook for managing async operations with loading, error, and success states.
 * 
 * @param asyncFunction - The async function to execute
 * @param options - Configuration options
 * @returns Async state and control functions
 * 
 * @example
 * // Basic usage
 * const { data, isLoading, error, execute } = useAsync(fetchUsers);
 * 
 * // Execute on button click
 * <button onClick={() => execute()} disabled={isLoading}>
 *   {isLoading ? 'Loading...' : 'Load Users'}
 * </button>
 * 
 * @example
 * // With immediate execution
 * const { data, isLoading } = useAsync(
 *   () => fetchUserById(userId),
 *   { immediate: true }
 * );
 * 
 * @example
 * // With callbacks
 * const { execute } = useAsync(saveUser, {
 *   onSuccess: (data) => toast.success('User saved!'),
 *   onError: (error) => toast.error(error.message)
 * });
 */
export function useAsync<T, Args extends unknown[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T, Args> {
  const {
    initialData = null,
    immediate = false,
    onSuccess,
    onError,
    resetOnExecute = false
  } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    error: null,
    isLoading: immediate,
    isSuccess: false,
    isError: false
  });

  // Keep track of the latest async function
  const asyncFunctionRef = useRef(asyncFunction);
  asyncFunctionRef.current = asyncFunction;

  // Track mounted state to avoid updates after unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (...args: Args): Promise<T | null> => {
    if (resetOnExecute) {
      setState({
        data: initialData,
        error: null,
        isLoading: true,
        isSuccess: false,
        isError: false
      });
    } else {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const result = await asyncFunctionRef.current(...args);
      
      if (mountedRef.current) {
        setState({
          data: result,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false
        });
        onSuccess?.(result);
      }
      
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          error: errorObj,
          isLoading: false,
          isSuccess: false,
          isError: true
        }));
        onError?.(errorObj);
      }
      
      return null;
    }
  }, [initialData, onSuccess, onError, resetOnExecute]);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false
    });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  // Execute immediately if option is set
  useEffect(() => {
    if (immediate) {
      execute(...([] as unknown as Args));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    execute,
    reset,
    setData
  };
}

/**
 * Hook for managing async operations that fetch data based on dependencies.
 * Automatically re-fetches when dependencies change.
 * 
 * @param asyncFunction - The async function to execute
 * @param deps - Dependencies that trigger re-fetch when changed
 * @param options - Configuration options
 * @returns Async state and control functions
 * 
 * @example
 * const { data, isLoading, refetch } = useAsyncEffect(
 *   () => fetchUserById(userId),
 *   [userId]
 * );
 */
export function useAsyncEffect<T>(
  asyncFunction: () => Promise<T>,
  deps: React.DependencyList,
  options: Omit<UseAsyncOptions<T>, 'immediate'> = {}
): UseAsyncReturn<T, []> {
  const { initialData = null, onSuccess, onError, resetOnExecute = true } = options;

  const [state, setState] = useState<AsyncState<T>>({
    data: initialData,
    error: null,
    isLoading: true,
    isSuccess: false,
    isError: false
  });

  const asyncFunctionRef = useRef(asyncFunction);
  asyncFunctionRef.current = asyncFunction;
  
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const execute = useCallback(async (): Promise<T | null> => {
    if (resetOnExecute) {
      setState({
        data: initialData,
        error: null,
        isLoading: true,
        isSuccess: false,
        isError: false
      });
    } else {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
    }

    try {
      const result = await asyncFunctionRef.current();
      
      if (mountedRef.current) {
        setState({
          data: result,
          error: null,
          isLoading: false,
          isSuccess: true,
          isError: false
        });
        onSuccess?.(result);
      }
      
      return result;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          error: errorObj,
          isLoading: false,
          isSuccess: false,
          isError: true
        }));
        onError?.(errorObj);
      }
      
      return null;
    }
  }, [initialData, onSuccess, onError, resetOnExecute]);

  const reset = useCallback(() => {
    setState({
      data: initialData,
      error: null,
      isLoading: false,
      isSuccess: false,
      isError: false
    });
  }, [initialData]);

  const setData = useCallback((data: T | null) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  // Execute when dependencies change
  useEffect(() => {
    execute();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    ...state,
    execute,
    reset,
    setData
  };
}

export default useAsync;
