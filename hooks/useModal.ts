import { useState, useCallback } from 'react';

/**
 * A reusable hook for managing modal state with optional data payload.
 * Eliminates the need for separate useState calls for each modal.
 * 
 * @example
 * // Single modal
 * const addModal = useModal();
 * <button onClick={addModal.open}>Add Item</button>
 * {addModal.isOpen && <Modal onClose={addModal.close} />}
 * 
 * @example
 * // Modal with data
 * const editModal = useModal<Contact>();
 * <button onClick={() => editModal.openWith(contact)}>Edit</button>
 * {editModal.isOpen && <EditModal contact={editModal.data} onClose={editModal.close} />}
 */
export interface UseModalReturn<T = undefined> {
  isOpen: boolean;
  data: T | null;
  open: () => void;
  openWith: (data: T) => void;
  close: () => void;
  toggle: () => void;
  setData: (data: T | null) => void;
}

export function useModal<T = undefined>(initialOpen = false): UseModalReturn<T> {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const openWith = useCallback((newData: T) => {
    setData(newData);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Clear data after a short delay to allow exit animations
    setTimeout(() => setData(null), 150);
  }, []);

  const toggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  return {
    isOpen,
    data,
    open,
    openWith,
    close,
    toggle,
    setData
  };
}

/**
 * A hook for managing multiple modals with a single state object.
 * Useful when a component has many modals.
 * 
 * @example
 * const modals = useMultiModal(['add', 'edit', 'delete', 'import'] as const);
 * 
 * <button onClick={() => modals.open('add')}>Add</button>
 * <button onClick={() => modals.open('edit')}>Edit</button>
 * 
 * {modals.isOpen('add') && <AddModal onClose={() => modals.close('add')} />}
 * {modals.isOpen('edit') && <EditModal onClose={() => modals.close('edit')} />}
 */
export interface UseMultiModalReturn<K extends string> {
  isOpen: (key: K) => boolean;
  open: (key: K) => void;
  close: (key: K) => void;
  closeAll: () => void;
  toggle: (key: K) => void;
  openKeys: K[];
}

export function useMultiModal<K extends string>(keys: readonly K[]): UseMultiModalReturn<K> {
  const [openModals, setOpenModals] = useState<Set<K>>(new Set());

  const isOpen = useCallback((key: K) => openModals.has(key), [openModals]);

  const open = useCallback((key: K) => {
    setOpenModals(prev => new Set(prev).add(key));
  }, []);

  const close = useCallback((key: K) => {
    setOpenModals(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const closeAll = useCallback(() => {
    setOpenModals(new Set());
  }, []);

  const toggle = useCallback((key: K) => {
    setOpenModals(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  return {
    isOpen,
    open,
    close,
    closeAll,
    toggle,
    openKeys: Array.from(openModals)
  };
}

export default useModal;
