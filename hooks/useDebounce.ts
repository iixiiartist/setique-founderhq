import { useEffect, useRef, useCallback, useState } from 'react';

/**
 * Debounce hook that delays executing a function until after a specified delay
 * has elapsed since the last time it was invoked.
 * 
 * @param callback - Function to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Debounced function
 * 
 * @example
 * const debouncedSearch = useDebounce((query: string) => {
 *   fetchResults(query);
 * }, 300);
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const callbackRef = useRef(callback);

  // Update callback ref when callback changes
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * Debounced value hook that returns a debounced version of a value
 * after a specified delay has elapsed since the last change.
 * 
 * @param value - Value to debounce
 * @param delay - Delay in milliseconds (default: 500ms)
 * @returns Debounced value
 * 
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
 * 
 * useEffect(() => {
 *   fetchResults(debouncedSearchTerm);
 * }, [debouncedSearchTerm]);
 */
export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timeout);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Throttle hook that ensures a function is called at most once per specified time period.
 * Unlike debouncing, throttling guarantees the function will be called regularly.
 * 
 * @param callback - Function to throttle
 * @param delay - Minimum time between calls in milliseconds (default: 1000ms)
 * @returns Throttled function
 * 
 * @example
 * const throttledScroll = useThrottle(() => {
 *   handleScrollEvent();
 * }, 100);
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 1000
): (...args: Parameters<T>) => void {
  const lastRunRef = useRef<number>(0);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastRunRef.current >= delay) {
        callbackRef.current(...args);
        lastRunRef.current = now;
      }
    },
    [delay]
  );
}
