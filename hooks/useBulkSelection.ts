import { useState, useCallback, useMemo } from 'react';

/**
 * A reusable hook for managing bulk selection state in lists.
 * Handles selection mode toggle, individual selection, select all, and clear.
 * 
 * @example
 * const { 
 *   isSelectionMode, 
 *   selectedIds, 
 *   toggleSelectionMode,
 *   toggleItem, 
 *   selectAll, 
 *   clearSelection,
 *   isSelected,
 *   selectedCount
 * } = useBulkSelection<string>();
 * 
 * // In list items:
 * {isSelectionMode && (
 *   <input 
 *     type="checkbox" 
 *     checked={isSelected(item.id)} 
 *     onChange={() => toggleItem(item.id)} 
 *   />
 * )}
 */
export interface UseBulkSelectionReturn<T> {
  /** Whether bulk selection mode is active */
  isSelectionMode: boolean;
  /** Set of currently selected item IDs */
  selectedIds: Set<T>;
  /** Array of selected IDs (for easier iteration) */
  selectedArray: T[];
  /** Number of selected items */
  selectedCount: number;
  /** Toggle selection mode on/off (clears selection when turning off) */
  toggleSelectionMode: () => void;
  /** Enable selection mode */
  enableSelectionMode: () => void;
  /** Disable selection mode and clear selections */
  disableSelectionMode: () => void;
  /** Toggle selection of a single item */
  toggleItem: (id: T) => void;
  /** Select a single item (adds to selection) */
  selectItem: (id: T) => void;
  /** Deselect a single item */
  deselectItem: (id: T) => void;
  /** Check if an item is selected */
  isSelected: (id: T) => boolean;
  /** Select all items from a given array of IDs */
  selectAll: (allIds: T[]) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Select multiple items at once */
  selectMany: (ids: T[]) => void;
  /** Check if all items in an array are selected */
  areAllSelected: (allIds: T[]) => boolean;
  /** Check if some (but not all) items are selected */
  areSomeSelected: (allIds: T[]) => boolean;
}

export interface UseBulkSelectionOptions {
  /** Initial selection mode state */
  initialMode?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (selectedIds: Set<string>) => void;
  /** Clear selection when mode is disabled */
  clearOnDisable?: boolean;
}

export function useBulkSelection<T = string>(
  options: UseBulkSelectionOptions = {}
): UseBulkSelectionReturn<T> {
  const { 
    initialMode = false, 
    onSelectionChange,
    clearOnDisable = true 
  } = options;

  const [isSelectionMode, setIsSelectionMode] = useState(initialMode);
  const [selectedIds, setSelectedIds] = useState<Set<T>>(new Set());

  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.size;

  const updateSelection = useCallback((newSelection: Set<T>) => {
    setSelectedIds(newSelection);
    onSelectionChange?.(newSelection as unknown as Set<string>);
  }, [onSelectionChange]);

  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode(prev => {
      if (prev && clearOnDisable) {
        updateSelection(new Set());
      }
      return !prev;
    });
  }, [clearOnDisable, updateSelection]);

  const enableSelectionMode = useCallback(() => {
    setIsSelectionMode(true);
  }, []);

  const disableSelectionMode = useCallback(() => {
    setIsSelectionMode(false);
    if (clearOnDisable) {
      updateSelection(new Set());
    }
  }, [clearOnDisable, updateSelection]);

  const toggleItem = useCallback((id: T) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      onSelectionChange?.(next as unknown as Set<string>);
      return next;
    });
  }, [onSelectionChange]);

  const selectItem = useCallback((id: T) => {
    setSelectedIds(prev => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      onSelectionChange?.(next as unknown as Set<string>);
      return next;
    });
  }, [onSelectionChange]);

  const deselectItem = useCallback((id: T) => {
    setSelectedIds(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      onSelectionChange?.(next as unknown as Set<string>);
      return next;
    });
  }, [onSelectionChange]);

  const isSelected = useCallback((id: T) => selectedIds.has(id), [selectedIds]);

  const selectAll = useCallback((allIds: T[]) => {
    const newSelection = new Set(allIds);
    updateSelection(newSelection);
  }, [updateSelection]);

  const clearSelection = useCallback(() => {
    updateSelection(new Set());
  }, [updateSelection]);

  const selectMany = useCallback((ids: T[]) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      ids.forEach(id => next.add(id));
      onSelectionChange?.(next as unknown as Set<string>);
      return next;
    });
  }, [onSelectionChange]);

  const areAllSelected = useCallback((allIds: T[]) => {
    if (allIds.length === 0) return false;
    return allIds.every(id => selectedIds.has(id));
  }, [selectedIds]);

  const areSomeSelected = useCallback((allIds: T[]) => {
    if (allIds.length === 0) return false;
    const selectedCount = allIds.filter(id => selectedIds.has(id)).length;
    return selectedCount > 0 && selectedCount < allIds.length;
  }, [selectedIds]);

  return {
    isSelectionMode,
    selectedIds,
    selectedArray,
    selectedCount,
    toggleSelectionMode,
    enableSelectionMode,
    disableSelectionMode,
    toggleItem,
    selectItem,
    deselectItem,
    isSelected,
    selectAll,
    clearSelection,
    selectMany,
    areAllSelected,
    areSomeSelected
  };
}

export default useBulkSelection;
