import { useState, useMemo, useCallback } from 'react';
import { useDebouncedValue } from './useDebounce';

/**
 * A reusable hook for filtering, sorting, and paginating lists.
 * Handles search, multi-field filtering, sorting, and pagination.
 * 
 * @example
 * const {
 *   filteredItems,
 *   searchQuery,
 *   setSearchQuery,
 *   filters,
 *   setFilter,
 *   clearFilters,
 *   sortBy,
 *   sortOrder,
 *   setSorting,
 *   totalCount,
 *   hasActiveFilters
 * } = useFilteredList(items, {
 *   searchFields: ['name', 'email', 'company'],
 *   initialSort: { field: 'name', order: 'asc' }
 * });
 */

export type SortOrder = 'asc' | 'desc';

export interface FilterConfig<T> {
  /** Fields to search across when using the search query */
  searchFields?: (keyof T)[];
  /** Custom search function for complex searching */
  customSearch?: (item: T, query: string) => boolean;
  /** Initial sort configuration */
  initialSort?: {
    field: keyof T;
    order: SortOrder;
  };
  /** Debounce delay for search in milliseconds */
  searchDebounce?: number;
  /** Custom sort comparator */
  customSort?: (a: T, b: T, field: keyof T, order: SortOrder) => number;
}

export interface FilterState<T> {
  [key: string]: string | number | boolean | string[] | undefined;
}

export interface UseFilteredListReturn<T> {
  /** The filtered and sorted items */
  filteredItems: T[];
  /** Current search query */
  searchQuery: string;
  /** Set the search query */
  setSearchQuery: (query: string) => void;
  /** Debounced search query (for performance) */
  debouncedSearchQuery: string;
  /** Current filter state */
  filters: FilterState<T>;
  /** Set a specific filter */
  setFilter: <K extends keyof FilterState<T>>(key: K, value: FilterState<T>[K]) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Clear a specific filter */
  clearFilter: (key: string) => void;
  /** Current sort field */
  sortBy: keyof T | null;
  /** Current sort order */
  sortOrder: SortOrder;
  /** Set sorting configuration */
  setSorting: (field: keyof T, order?: SortOrder) => void;
  /** Toggle sort order for current field */
  toggleSortOrder: () => void;
  /** Total count of filtered items */
  totalCount: number;
  /** Original item count */
  originalCount: number;
  /** Whether any filters are active */
  hasActiveFilters: boolean;
  /** Reset all filters, search, and sorting to initial state */
  reset: () => void;
}

export function useFilteredList<T extends Record<string, any>>(
  items: T[],
  config: FilterConfig<T> = {}
): UseFilteredListReturn<T> {
  const {
    searchFields = [],
    customSearch,
    initialSort,
    searchDebounce = 300,
    customSort
  } = config;

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, searchDebounce);

  // Filter state
  const [filters, setFilters] = useState<FilterState<T>>({});

  // Sort state
  const [sortBy, setSortBy] = useState<keyof T | null>(initialSort?.field ?? null);
  const [sortOrder, setSortOrder] = useState<SortOrder>(initialSort?.order ?? 'asc');

  // Filter setter
  const setFilter = useCallback(<K extends keyof FilterState<T>>(
    key: K, 
    value: FilterState<T>[K]
  ) => {
    setFilters(prev => {
      // Remove the filter if value is empty
      if (value === '' || value === undefined || value === null || 
          (Array.isArray(value) && value.length === 0)) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: value };
    });
  }, []);

  // Clear specific filter
  const clearFilter = useCallback((key: string) => {
    setFilters(prev => {
      const { [key]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  // Set sorting
  const setSorting = useCallback((field: keyof T, order?: SortOrder) => {
    setSortBy(field);
    if (order) {
      setSortOrder(order);
    } else if (sortBy === field) {
      // Toggle order if same field
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortOrder('asc');
    }
  }, [sortBy]);

  // Toggle sort order
  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  }, []);

  // Reset everything
  const reset = useCallback(() => {
    setSearchQuery('');
    setFilters({});
    setSortBy(initialSort?.field ?? null);
    setSortOrder(initialSort?.order ?? 'asc');
  }, [initialSort]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return debouncedSearchQuery.trim() !== '' || Object.keys(filters).length > 0;
  }, [debouncedSearchQuery, filters]);

  // Apply filtering and sorting
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Apply search filter
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      
      if (customSearch) {
        result = result.filter(item => customSearch(item, query));
      } else if (searchFields.length > 0) {
        result = result.filter(item => {
          return searchFields.some(field => {
            const value = item[field];
            if (value === null || value === undefined) return false;
            if (typeof value === 'string') {
              return value.toLowerCase().includes(query);
            }
            if (typeof value === 'number') {
              return value.toString().includes(query);
            }
            if (Array.isArray(value)) {
              return value.some(v => 
                typeof v === 'string' && v.toLowerCase().includes(query)
              );
            }
            return false;
          });
        });
      }
    }

    // Apply custom filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      
      result = result.filter(item => {
        const itemValue = item[key];
        
        // Array filter (e.g., tags)
        if (Array.isArray(value)) {
          if (Array.isArray(itemValue)) {
            return value.some(v => itemValue.includes(v));
          }
          return value.includes(itemValue);
        }
        
        // Boolean filter
        if (typeof value === 'boolean') {
          return itemValue === value;
        }
        
        // String/exact match filter
        return itemValue === value;
      });
    });

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        if (customSort) {
          return customSort(a, b, sortBy, sortOrder);
        }

        let aVal: any = a[sortBy];
        let bVal: any = b[sortBy];

        // Handle null/undefined
        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';

        // Handle dates
        if (aVal instanceof Date) aVal = aVal.getTime();
        if (bVal instanceof Date) bVal = bVal.getTime();

        // String comparison
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const comparison = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
          return sortOrder === 'asc' ? comparison : -comparison;
        }

        // Numeric comparison
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }

        // Fallback
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortOrder === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [items, debouncedSearchQuery, filters, sortBy, sortOrder, searchFields, customSearch, customSort]);

  return {
    filteredItems,
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,
    filters,
    setFilter,
    clearFilters,
    clearFilter,
    sortBy,
    sortOrder,
    setSorting,
    toggleSortOrder,
    totalCount: filteredItems.length,
    originalCount: items.length,
    hasActiveFilters,
    reset
  };
}

export default useFilteredList;
