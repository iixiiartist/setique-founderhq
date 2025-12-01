/**
 * useCrmSelection Hook
 * 
 * Shared hook for selection state in CRM components.
 * Combines bulk selection with view item selection.
 * Used by both AccountManager and ContactManager (legacy and refactored).
 */

import { useState, useCallback, useMemo } from 'react';
import { useBulkSelection } from './useBulkSelection';

export interface UseCrmSelectionOptions<T> {
  /** Initial selection mode state */
  initialBulkMode?: boolean;
  /** Callback when view item changes */
  onViewItemChange?: (item: T | null) => void;
  /** Get ID from item */
  getItemId?: (item: T) => string;
}

export interface UseCrmSelectionReturn<T> {
  // View selection (single item detail view)
  viewItem: T | null;
  setViewItem: (item: T | null) => void;
  clearViewItem: () => void;
  
  // Bulk selection (multi-select mode)
  isSelectionMode: boolean;
  selectedIds: Set<string>;
  selectedCount: number;
  toggleSelectionMode: () => void;
  enableSelectionMode: () => void;
  disableSelectionMode: () => void;
  toggleItem: (id: string) => void;
  selectItem: (id: string) => void;
  deselectItem: (id: string) => void;
  isSelected: (id: string) => boolean;
  selectAll: (items: T[]) => void;
  clearSelection: () => void;
  areAllSelected: (items: T[]) => boolean;
  areSomeSelected: (items: T[]) => boolean;
  
  // Get selected items from a list
  getSelectedItems: (items: T[]) => T[];
}

export function useCrmSelection<T extends { id: string }>(
  options: UseCrmSelectionOptions<T> = {}
): UseCrmSelectionReturn<T> {
  const {
    initialBulkMode = false,
    onViewItemChange,
    getItemId = (item) => item.id,
  } = options;

  // Single item view selection
  const [viewItem, setViewItemState] = useState<T | null>(null);

  // Use the shared bulk selection hook
  const bulkSelection = useBulkSelection<string>({
    initialMode: initialBulkMode,
  });

  // Set view item with callback
  const setViewItem = useCallback((item: T | null) => {
    setViewItemState(item);
    onViewItemChange?.(item);
  }, [onViewItemChange]);

  const clearViewItem = useCallback(() => {
    setViewItemState(null);
    onViewItemChange?.(null);
  }, [onViewItemChange]);

  // Select all items from a list
  const selectAll = useCallback((items: T[]) => {
    const ids = items.map(getItemId);
    bulkSelection.selectAll(ids);
  }, [bulkSelection, getItemId]);

  // Check if all items in a list are selected
  const areAllSelected = useCallback((items: T[]) => {
    const ids = items.map(getItemId);
    return bulkSelection.areAllSelected(ids);
  }, [bulkSelection, getItemId]);

  // Check if some items are selected
  const areSomeSelected = useCallback((items: T[]) => {
    const ids = items.map(getItemId);
    return bulkSelection.areSomeSelected(ids);
  }, [bulkSelection, getItemId]);

  // Get selected items from a list
  const getSelectedItems = useCallback((items: T[]) => {
    return items.filter(item => bulkSelection.selectedIds.has(getItemId(item)));
  }, [bulkSelection.selectedIds, getItemId]);

  return {
    // View selection
    viewItem,
    setViewItem,
    clearViewItem,
    
    // Bulk selection (pass through from useBulkSelection)
    isSelectionMode: bulkSelection.isSelectionMode,
    selectedIds: bulkSelection.selectedIds,
    selectedCount: bulkSelection.selectedCount,
    toggleSelectionMode: bulkSelection.toggleSelectionMode,
    enableSelectionMode: bulkSelection.enableSelectionMode,
    disableSelectionMode: bulkSelection.disableSelectionMode,
    toggleItem: bulkSelection.toggleItem,
    selectItem: bulkSelection.selectItem,
    deselectItem: bulkSelection.deselectItem,
    isSelected: bulkSelection.isSelected,
    selectAll,
    clearSelection: bulkSelection.clearSelection,
    areAllSelected,
    areSomeSelected,
    getSelectedItems,
  };
}

export default useCrmSelection;
