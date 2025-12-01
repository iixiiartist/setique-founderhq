import { useState, useCallback, useMemo } from 'react';

/**
 * Pagination state
 */
export interface PaginationState {
  /** Current page number (1-indexed) */
  page: number;
  /** Items per page */
  pageSize: number;
  /** Total number of items */
  totalItems: number;
}

/**
 * Pagination controls and computed values
 */
export interface UsePaginationReturn<T> extends PaginationState {
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a previous page */
  hasPrevious: boolean;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Start index for current page (0-indexed) */
  startIndex: number;
  /** End index for current page (exclusive) */
  endIndex: number;
  /** Items to display on current page */
  pageItems: T[];
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  previousPage: () => void;
  /** Go to first page */
  firstPage: () => void;
  /** Go to last page */
  lastPage: () => void;
  /** Change page size */
  setPageSize: (size: number) => void;
  /** Set total items (useful when pagination is server-side) */
  setTotalItems: (total: number) => void;
  /** Reset to first page */
  reset: () => void;
  /** Range of page numbers to show in pagination UI */
  pageRange: number[];
}

/**
 * Options for usePagination hook
 */
export interface UsePaginationOptions {
  /** Initial page (default: 1) */
  initialPage?: number;
  /** Initial page size (default: 10) */
  initialPageSize?: number;
  /** Number of page buttons to show in pagination UI (default: 5) */
  siblingCount?: number;
}

/**
 * Hook for managing pagination state with client-side data.
 * 
 * @param items - Array of all items to paginate
 * @param options - Configuration options
 * @returns Pagination state and controls
 * 
 * @example
 * // Basic usage with array
 * const { pageItems, page, totalPages, nextPage, previousPage } = usePagination(users);
 * 
 * @example
 * // With custom page size
 * const pagination = usePagination(users, { initialPageSize: 20 });
 * 
 * @example
 * // In a table component
 * const { pageItems, page, totalPages, goToPage, hasPrevious, hasNext } = usePagination(data);
 * 
 * return (
 *   <>
 *     <Table data={pageItems} />
 *     <Pagination
 *       currentPage={page}
 *       totalPages={totalPages}
 *       onPageChange={goToPage}
 *       hasPrevious={hasPrevious}
 *       hasNext={hasNext}
 *     />
 *   </>
 * );
 */
export function usePagination<T>(
  items: T[],
  options: UsePaginationOptions = {}
): UsePaginationReturn<T> {
  const {
    initialPage = 1,
    initialPageSize = 10,
    siblingCount = 2
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Ensure page is within valid range
  const validPage = Math.min(Math.max(1, page), totalPages);
  if (validPage !== page) {
    setPage(validPage);
  }

  const hasPrevious = validPage > 1;
  const hasNext = validPage < totalPages;

  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const pageItems = useMemo(() => {
    return items.slice(startIndex, endIndex);
  }, [items, startIndex, endIndex]);

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.min(Math.max(1, newPage), totalPages));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNext) {
      setPage(prev => prev + 1);
    }
  }, [hasNext]);

  const previousPage = useCallback(() => {
    if (hasPrevious) {
      setPage(prev => prev - 1);
    }
  }, [hasPrevious]);

  const firstPage = useCallback(() => {
    setPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setPage(totalPages);
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1); // Reset to first page when page size changes
  }, []);

  const setTotalItems = useCallback((_total: number) => {
    // For client-side pagination, totalItems is derived from items.length
    // This is a no-op but included for API consistency with server-side pagination
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
    setPageSizeState(initialPageSize);
  }, [initialPage, initialPageSize]);

  // Calculate page range for pagination UI
  const pageRange = useMemo(() => {
    const range: number[] = [];
    const leftSiblingIndex = Math.max(validPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(validPage + siblingCount, totalPages);

    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      range.push(i);
    }

    return range;
  }, [validPage, totalPages, siblingCount]);

  return {
    page: validPage,
    pageSize,
    totalItems,
    totalPages,
    hasPrevious,
    hasNext,
    startIndex,
    endIndex,
    pageItems,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    setTotalItems,
    reset,
    pageRange
  };
}

/**
 * Options for useServerPagination hook
 */
export interface UseServerPaginationOptions {
  /** Initial page (default: 1) */
  initialPage?: number;
  /** Initial page size (default: 10) */
  initialPageSize?: number;
  /** Initial total items count */
  initialTotalItems?: number;
  /** Number of page buttons to show (default: 5) */
  siblingCount?: number;
}

/**
 * Hook for managing pagination state with server-side data.
 * Use this when data is fetched from a server based on page/pageSize.
 * 
 * @param options - Configuration options
 * @returns Pagination state and controls
 * 
 * @example
 * const { page, pageSize, setTotalItems, goToPage } = useServerPagination();
 * 
 * useEffect(() => {
 *   fetchUsers({ page, pageSize }).then(response => {
 *     setUsers(response.data);
 *     setTotalItems(response.total);
 *   });
 * }, [page, pageSize]);
 */
export function useServerPagination(
  options: UseServerPaginationOptions = {}
): Omit<UsePaginationReturn<never>, 'pageItems'> {
  const {
    initialPage = 1,
    initialPageSize = 10,
    initialTotalItems = 0,
    siblingCount = 2
  } = options;

  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalItems, setTotalItemsState] = useState(initialTotalItems);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const validPage = Math.min(Math.max(1, page), totalPages);
  if (validPage !== page && totalItems > 0) {
    setPage(validPage);
  }

  const hasPrevious = validPage > 1;
  const hasNext = validPage < totalPages;

  const startIndex = (validPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);

  const goToPage = useCallback((newPage: number) => {
    const maxPage = Math.max(1, Math.ceil(totalItems / pageSize));
    setPage(Math.min(Math.max(1, newPage), maxPage));
  }, [totalItems, pageSize]);

  const nextPage = useCallback(() => {
    if (hasNext) {
      setPage(prev => prev + 1);
    }
  }, [hasNext]);

  const previousPage = useCallback(() => {
    if (hasPrevious) {
      setPage(prev => prev - 1);
    }
  }, [hasPrevious]);

  const firstPage = useCallback(() => {
    setPage(1);
  }, []);

  const lastPage = useCallback(() => {
    setPage(totalPages);
  }, [totalPages]);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPage(1);
  }, []);

  const setTotalItems = useCallback((total: number) => {
    setTotalItemsState(total);
  }, []);

  const reset = useCallback(() => {
    setPage(initialPage);
    setPageSizeState(initialPageSize);
    setTotalItemsState(initialTotalItems);
  }, [initialPage, initialPageSize, initialTotalItems]);

  const pageRange = useMemo(() => {
    const range: number[] = [];
    const leftSiblingIndex = Math.max(validPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(validPage + siblingCount, totalPages);

    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      range.push(i);
    }

    return range;
  }, [validPage, totalPages, siblingCount]);

  return {
    page: validPage,
    pageSize,
    totalItems,
    totalPages,
    hasPrevious,
    hasNext,
    startIndex,
    endIndex,
    goToPage,
    nextPage,
    previousPage,
    firstPage,
    lastPage,
    setPageSize,
    setTotalItems,
    reset,
    pageRange
  };
}

export default usePagination;
