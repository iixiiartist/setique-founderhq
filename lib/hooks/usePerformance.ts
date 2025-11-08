import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * useDebounce Hook
 * Debounces a value by delaying updates until after the specified delay period has passed without changes.
 * 
 * @param value - The value to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @returns The debounced value
 * 
 * @example
 * const [searchQuery, setSearchQuery] = useState('');
 * const debouncedSearchQuery = useDebounce(searchQuery, 300);
 * 
 * useEffect(() => {
 *   // Only runs after user stops typing for 300ms
 *   fetchSearchResults(debouncedSearchQuery);
 * }, [debouncedSearchQuery]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if value changes (user still typing)
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback Hook
 * Creates a debounced version of a callback function.
 * 
 * @param callback - The function to debounce
 * @param delay - The delay in milliseconds (default: 300ms)
 * @param deps - Dependency array for the callback
 * @returns The debounced callback function
 * 
 * @example
 * const debouncedSearch = useDebouncedCallback(
 *   (query: string) => fetchResults(query),
 *   300,
 *   []
 * );
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300,
  deps: React.DependencyList = []
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Memoize the debounced function
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [callback, delay, ...deps]
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
}

/**
 * useThrottle Hook
 * Throttles a value by only allowing updates at a maximum frequency.
 * Unlike debounce, throttle guarantees execution at regular intervals.
 * 
 * @param value - The value to throttle
 * @param interval - The minimum interval between updates in milliseconds (default: 300ms)
 * @returns The throttled value
 * 
 * @example
 * const [scrollPosition, setScrollPosition] = useState(0);
 * const throttledScrollPosition = useThrottle(scrollPosition, 100);
 */
export function useThrottle<T>(value: T, interval: number = 300): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecutedRef = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastExecution = now - lastExecutedRef.current;

    if (timeSinceLastExecution >= interval) {
      // Enough time has passed, update immediately
      lastExecutedRef.current = now;
      setThrottledValue(value);
    } else {
      // Set a timeout to update after the remaining interval
      const timeoutId = setTimeout(() => {
        lastExecutedRef.current = Date.now();
        setThrottledValue(value);
      }, interval - timeSinceLastExecution);

      return () => clearTimeout(timeoutId);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * useMemoizedCallback Hook
 * Memoizes a callback with specific dependencies to prevent unnecessary re-renders.
 * Similar to useCallback but with more explicit optimization tracking.
 * 
 * @param callback - The function to memoize
 * @param deps - Dependency array
 * @returns The memoized callback
 */
export function useMemoizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T {
  return useCallback(callback, deps);
}

/**
 * useOptimizedList Hook
 * Optimizes list rendering by combining filtering, sorting, and memoization.
 * 
 * @param items - The list of items
 * @param filterFn - Filter function
 * @param sortFn - Sort function
 * @param deps - Additional dependencies for memoization
 * @returns Filtered and sorted list
 * 
 * @example
 * const filteredTasks = useOptimizedList(
 *   tasks,
 *   (task) => task.status === 'incomplete',
 *   (a, b) => b.createdAt - a.createdAt,
 *   [tasks]
 * );
 */
export function useOptimizedList<T>(
  items: T[],
  filterFn?: (item: T) => boolean,
  sortFn?: (a: T, b: T) => number,
  deps: React.DependencyList = []
): T[] {
  return useMemo(() => {
    let result = items;

    if (filterFn) {
      result = result.filter(filterFn);
    }

    if (sortFn) {
      result = [...result].sort(sortFn);
    }

    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, filterFn, sortFn, ...deps]);
}

/**
 * useIntersectionObserver Hook
 * Detects when an element enters/leaves the viewport for lazy loading.
 * 
 * @param ref - Ref to the element to observe
 * @param options - IntersectionObserver options
 * @returns Whether the element is intersecting
 * 
 * @example
 * const ref = useRef<HTMLDivElement>(null);
 * const isVisible = useIntersectionObserver(ref, { threshold: 0.5 });
 */
export function useIntersectionObserver(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      options
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [ref, options]);

  return isIntersecting;
}

/**
 * useOptimizedSearch Hook
 * Combines debouncing with search query management for optimized searching.
 * 
 * @param initialValue - Initial search query
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns [query, debouncedQuery, setQuery]
 * 
 * @example
 * const [query, debouncedQuery, setQuery] = useOptimizedSearch('', 300);
 * 
 * // User types rapidly
 * <input value={query} onChange={(e) => setQuery(e.target.value)} />
 * 
 * // Only search after user stops typing
 * useEffect(() => {
 *   fetchResults(debouncedQuery);
 * }, [debouncedQuery]);
 */
export function useOptimizedSearch(
  initialValue: string = '',
  delay: number = 300
): [string, string, (value: string) => void] {
  const [query, setQuery] = useState(initialValue);
  const debouncedQuery = useDebounce(query, delay);

  return [query, debouncedQuery, setQuery];
}
