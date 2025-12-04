/**
 * Cursor-Based Pagination Utilities
 * ==================================
 * Supports efficient infinite scroll without offset performance issues.
 * Works with UUID or timestamp-based cursors.
 */

import { useCallback, useRef, useState } from 'react';
import { useInfiniteQuery, UseInfiniteQueryOptions } from '@tanstack/react-query';

// ============================================================================
// TYPES
// ============================================================================

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  prevCursor: string | null;
  hasMore: boolean;
  totalCount?: number;
}

export interface CursorPaginationOptions {
  /** Initial cursor (null for first page) */
  cursor?: string | null;
  /** Number of items per page */
  limit?: number;
  /** Direction to paginate ('forward' or 'backward') */
  direction?: 'forward' | 'backward';
}

export interface UseCursorPaginationResult<T> {
  /** Current page items */
  items: T[];
  /** All loaded items (flattened from all pages) */
  allItems: T[];
  /** Is currently fetching */
  isLoading: boolean;
  /** Is fetching more items */
  isFetchingNextPage: boolean;
  isFetchingPreviousPage: boolean;
  /** Are there more items to load */
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  /** Load next page */
  fetchNextPage: () => void;
  /** Load previous page */
  fetchPreviousPage: () => void;
  /** Refetch all pages */
  refetch: () => void;
  /** Error if any */
  error: Error | null;
  /** Total count if available */
  totalCount?: number;
}

// ============================================================================
// CURSOR PAGINATION HOOK
// ============================================================================

/**
 * Generic cursor-based pagination hook
 * @param queryKey - React Query key
 * @param fetchFn - Function that fetches a page given a cursor
 * @param options - Pagination options
 */
export function useCursorPagination<T>(
  queryKey: readonly unknown[],
  fetchFn: (cursor: string | null, limit: number, direction: 'forward' | 'backward') => Promise<CursorPage<T>>,
  options?: CursorPaginationOptions & {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    refetchOnWindowFocus?: boolean;
  }
): UseCursorPaginationResult<T> {
  const { limit = 50, direction = 'forward', enabled = true, ...queryOptions } = options || {};

  const query = useInfiniteQuery({
    queryKey: [...queryKey, 'cursor', limit, direction],
    queryFn: async ({ pageParam }) => {
      return fetchFn(pageParam as string | null, limit, direction);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.nextCursor : undefined,
    getPreviousPageParam: (firstPage) => firstPage.prevCursor || undefined,
    enabled,
    ...queryOptions,
  });

  // Flatten all pages into a single array
  const allItems = query.data?.pages.flatMap(page => page.items) ?? [];
  const currentPage = query.data?.pages[query.data.pages.length - 1];
  const items = currentPage?.items ?? [];
  const totalCount = currentPage?.totalCount;

  return {
    items,
    allItems,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    isFetchingPreviousPage: query.isFetchingPreviousPage,
    hasNextPage: query.hasNextPage ?? false,
    hasPreviousPage: query.hasPreviousPage ?? false,
    fetchNextPage: query.fetchNextPage,
    fetchPreviousPage: query.fetchPreviousPage,
    refetch: query.refetch,
    error: query.error as Error | null,
    totalCount,
  };
}

// ============================================================================
// INFINITE SCROLL HOOK
// ============================================================================

export interface UseInfiniteScrollOptions {
  /** Callback when scroll reaches threshold */
  onLoadMore: () => void;
  /** Is currently loading more */
  isLoading: boolean;
  /** Are there more items to load */
  hasMore: boolean;
  /** Distance from bottom to trigger load (in pixels) */
  threshold?: number;
  /** Debounce delay in ms */
  debounceMs?: number;
}

/**
 * Hook to trigger infinite scroll loading
 * Attach the returned ref to a scrollable container
 */
export function useInfiniteScroll(options: UseInfiniteScrollOptions) {
  const { onLoadMore, isLoading, hasMore, threshold = 200, debounceMs = 100 } = options;
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasMore && !isLoading) {
        // Debounce the load more call
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          onLoadMore();
        }, debounceMs);
      }
    },
    [onLoadMore, hasMore, isLoading, debounceMs]
  );

  const setLoadMoreRef = useCallback(
    (node: HTMLDivElement | null) => {
      // Cleanup previous observer
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      if (node) {
        observerRef.current = new IntersectionObserver(handleIntersect, {
          rootMargin: `${threshold}px`,
          threshold: 0,
        });
        observerRef.current.observe(node);
      }

      loadMoreRef.current = node;
    },
    [handleIntersect, threshold]
  );

  return { loadMoreRef: setLoadMoreRef };
}

// ============================================================================
// SCROLL POSITION RESTORATION
// ============================================================================

/**
 * Hook to save and restore scroll position
 * Useful for navigating away and back to a list
 */
export function useScrollRestoration(key: string) {
  const [savedPosition, setSavedPosition] = useState<number | null>(null);
  
  const savePosition = useCallback((element: HTMLElement | null) => {
    if (element) {
      const position = element.scrollTop;
      sessionStorage.setItem(`scroll_${key}`, String(position));
      setSavedPosition(position);
    }
  }, [key]);

  const restorePosition = useCallback((element: HTMLElement | null) => {
    if (element) {
      const saved = sessionStorage.getItem(`scroll_${key}`);
      if (saved) {
        element.scrollTop = parseInt(saved, 10);
      }
    }
  }, [key]);

  const clearPosition = useCallback(() => {
    sessionStorage.removeItem(`scroll_${key}`);
    setSavedPosition(null);
  }, [key]);

  return { savedPosition, savePosition, restorePosition, clearPosition };
}

// ============================================================================
// CURSOR UTILITIES
// ============================================================================

/**
 * Create a cursor from an item's ID and timestamp
 */
export function createCursor(id: string, timestamp: string | number): string {
  const ts = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  return `${ts}_${id}`;
}

/**
 * Parse a cursor back into ID and timestamp
 */
export function parseCursor(cursor: string): { id: string; timestamp: number } | null {
  const parts = cursor.split('_');
  if (parts.length < 2) return null;
  
  const timestamp = parseInt(parts[0], 10);
  const id = parts.slice(1).join('_');
  
  if (isNaN(timestamp)) return null;
  
  return { id, timestamp };
}

/**
 * Compare two cursors for ordering
 * Returns -1 if a < b, 1 if a > b, 0 if equal
 */
export function compareCursors(a: string, b: string): number {
  const parsedA = parseCursor(a);
  const parsedB = parseCursor(b);
  
  if (!parsedA || !parsedB) return 0;
  
  if (parsedA.timestamp < parsedB.timestamp) return -1;
  if (parsedA.timestamp > parsedB.timestamp) return 1;
  return parsedA.id.localeCompare(parsedB.id);
}

// ============================================================================
// KEYSET PAGINATION FOR SUPABASE
// ============================================================================

/**
 * Build keyset pagination query for Supabase
 * More efficient than offset for large datasets
 */
export function buildKeysetQuery(
  baseQuery: any,
  cursor: string | null,
  limit: number,
  direction: 'forward' | 'backward' = 'forward',
  orderColumn: string = 'created_at',
  idColumn: string = 'id'
) {
  let query = baseQuery;

  if (cursor) {
    const parsed = parseCursor(cursor);
    if (parsed) {
      const timestamp = new Date(parsed.timestamp).toISOString();
      
      if (direction === 'forward') {
        // For forward pagination, get items older than cursor
        query = query
          .or(`${orderColumn}.lt.${timestamp},and(${orderColumn}.eq.${timestamp},${idColumn}.lt.${parsed.id})`)
          .order(orderColumn, { ascending: false })
          .order(idColumn, { ascending: false });
      } else {
        // For backward pagination, get items newer than cursor
        query = query
          .or(`${orderColumn}.gt.${timestamp},and(${orderColumn}.eq.${timestamp},${idColumn}.gt.${parsed.id})`)
          .order(orderColumn, { ascending: true })
          .order(idColumn, { ascending: true });
      }
    }
  } else {
    // No cursor, start from beginning
    query = query
      .order(orderColumn, { ascending: direction !== 'forward' })
      .order(idColumn, { ascending: direction !== 'forward' });
  }

  return query.limit(limit + 1); // Fetch one extra to check hasMore
}

/**
 * Process keyset query results
 */
export function processKeysetResults<T extends { id: string; created_at?: string }>(
  data: T[] | null,
  limit: number,
  direction: 'forward' | 'backward',
  orderColumn: string = 'created_at'
): CursorPage<T> {
  if (!data || data.length === 0) {
    return {
      items: [],
      nextCursor: null,
      prevCursor: null,
      hasMore: false,
    };
  }

  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  // Reverse if backward pagination
  if (direction === 'backward') {
    items.reverse();
  }

  const firstItem = items[0];
  const lastItem = items[items.length - 1];
  
  const getTimestamp = (item: T) => {
    const value = (item as any)[orderColumn];
    return value ? new Date(value).getTime() : Date.now();
  };

  return {
    items,
    nextCursor: hasMore ? createCursor(lastItem.id, getTimestamp(lastItem)) : null,
    prevCursor: firstItem ? createCursor(firstItem.id, getTimestamp(firstItem)) : null,
    hasMore,
  };
}
