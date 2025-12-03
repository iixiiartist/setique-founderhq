import { useState, useCallback } from 'react';

/**
 * A reusable hook for confirmation dialogs before destructive actions.
 * Replaces the pattern of using window.confirm() throughout the codebase.
 * 
 * @example
 * const deleteConfirm = useConfirmAction({
 *   title: 'Delete Contact',
 *   message: 'Are you sure you want to delete this contact?',
 *   confirmLabel: 'Delete',
 *   variant: 'danger'
 * });
 * 
 * // Trigger confirmation
 * const handleDelete = () => {
 *   deleteConfirm.requestConfirm(contact, async (contact) => {
 *     await deleteContact(contact.id);
 *   });
 * };
 * 
 * // In render:
 * {deleteConfirm.isOpen && (
 *   <ConfirmDialog
 *     title={deleteConfirm.title}
 *     message={deleteConfirm.message}
 *     onConfirm={deleteConfirm.confirm}
 *     onCancel={deleteConfirm.cancel}
 *     variant={deleteConfirm.variant}
 *   />
 * )}
 */

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmActionConfig {
  /** Dialog title */
  title: string;
  /** Dialog message (can be a function for dynamic messages) */
  message: string | ((data: any) => string);
  /** Confirm button label */
  confirmLabel?: string;
  /** Cancel button label */
  cancelLabel?: string;
  /** Visual variant */
  variant?: ConfirmVariant;
  /** Loading state during action */
  showLoading?: boolean;
}

export interface UseConfirmActionReturn<T> {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Alias for isOpen (for backwards compatibility) */
  isConfirming: boolean;
  /** Whether the action is being processed */
  isProcessing: boolean;
  /** The data being confirmed (the item to delete, etc.) */
  data: T | null;
  /** Dialog title */
  title: string;
  /** Dialog message */
  message: string;
  /** Confirm button label */
  confirmLabel: string;
  /** Cancel button label */
  cancelLabel: string;
  /** Visual variant */
  variant: ConfirmVariant;
  /** Current state object (for components that need state.title, state.message, etc.) */
  state: {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel: string;
    variant: ConfirmVariant;
  };
  /** Request confirmation for an action */
  requestConfirm: (data: T, onConfirm: (data: T) => Promise<void> | void) => void;
  /** Execute the confirmed action (can also accept inline config) */
  confirm: ((config?: DynamicConfirmConfig) => Promise<void>) & (() => Promise<void>);
  /** Handle confirm callback (for ConfirmDialog component) */
  handleConfirm: () => Promise<void>;
  /** Cancel and close the dialog */
  cancel: () => void;
  /** Reset state completely */
  reset: () => void;
}

/** Config that can be passed dynamically to confirm() */
interface DynamicConfirmConfig {
  title: string;
  message: string;
  variant?: ConfirmVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => Promise<void> | void;
}

export function useConfirmAction<T = any>(
  config?: ConfirmActionConfig
): UseConfirmActionReturn<T> {
  const {
    title: initialTitle = '',
    message: initialMessage = '',
    confirmLabel: initialConfirmLabel = 'Confirm',
    cancelLabel: initialCancelLabel = 'Cancel',
    variant: initialVariant = 'danger',
    showLoading = true
  } = config || {};

  const [isOpen, setIsOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [data, setData] = useState<T | null>(null);
  const [pendingAction, setPendingAction] = useState<((data: T) => Promise<void> | void) | null>(null);
  
  // Dynamic state for inline confirm() calls
  const [dynamicTitle, setDynamicTitle] = useState(initialTitle);
  const [dynamicMessage, setDynamicMessage] = useState<string>(typeof initialMessage === 'string' ? initialMessage : '');
  const [dynamicConfirmLabel, setDynamicConfirmLabel] = useState(initialConfirmLabel);
  const [dynamicCancelLabel, setDynamicCancelLabel] = useState(initialCancelLabel);
  const [dynamicVariant, setDynamicVariant] = useState<ConfirmVariant>(initialVariant);

  // Get the resolved message (handle function messages)
  const resolvedMessage = typeof initialMessage === 'function' && data 
    ? initialMessage(data) 
    : dynamicMessage || (initialMessage as string);

  const requestConfirm = useCallback((
    itemData: T,
    onConfirm: (data: T) => Promise<void> | void
  ) => {
    setData(itemData);
    setPendingAction(() => onConfirm);
    setIsOpen(true);
  }, []);

  // Confirm can be called with inline config (for FileLibraryTab pattern)
  // or without args (for the standard pattern)
  const confirm = useCallback(async (inlineConfig?: DynamicConfirmConfig) => {
    if (inlineConfig) {
      // Dynamic confirm with inline config
      setDynamicTitle(inlineConfig.title);
      setDynamicMessage(inlineConfig.message);
      setDynamicVariant(inlineConfig.variant || 'danger');
      setDynamicConfirmLabel(inlineConfig.confirmLabel || 'Confirm');
      setDynamicCancelLabel(inlineConfig.cancelLabel || 'Cancel');
      setPendingAction(() => inlineConfig.onConfirm);
      setIsOpen(true);
      return;
    }

    // Standard confirm (execute pending action)
    if (!pendingAction) return;

    if (showLoading) {
      setIsProcessing(true);
    }

    try {
      if (data !== null) {
        await pendingAction(data);
      } else {
        // For dynamic confirms where no data was set
        await (pendingAction as () => Promise<void> | void)();
      }
    } finally {
      setIsProcessing(false);
      setIsOpen(false);
      setData(null);
      setPendingAction(null);
    }
  }, [pendingAction, data, showLoading]);

  // Alias for confirm() without args - used by ConfirmDialog onConfirm
  const handleConfirm = useCallback(async () => {
    await confirm();
  }, [confirm]);

  const cancel = useCallback(() => {
    setIsOpen(false);
    setData(null);
    setPendingAction(null);
    setIsProcessing(false);
  }, []);

  const reset = useCallback(() => {
    setIsOpen(false);
    setIsProcessing(false);
    setData(null);
    setPendingAction(null);
  }, []);

  const currentTitle = dynamicTitle || initialTitle;
  const currentConfirmLabel = dynamicConfirmLabel || initialConfirmLabel;
  const currentCancelLabel = dynamicCancelLabel || initialCancelLabel;
  const currentVariant = dynamicVariant || initialVariant;

  return {
    isOpen,
    isConfirming: isOpen, // Alias for backwards compatibility
    isProcessing,
    data,
    title: currentTitle,
    message: resolvedMessage,
    confirmLabel: currentConfirmLabel,
    cancelLabel: currentCancelLabel,
    variant: currentVariant,
    // State object for components that access confirmAction.state.title, etc.
    state: {
      title: currentTitle,
      message: resolvedMessage,
      confirmLabel: currentConfirmLabel,
      cancelLabel: currentCancelLabel,
      variant: currentVariant,
    },
    requestConfirm,
    confirm,
    handleConfirm,
    cancel,
    reset
  };
}

/**
 * Pre-configured confirmation for delete actions.
 */
export function useDeleteConfirm<T = any>(
  entityName: string = 'item'
) {
  return useConfirmAction<T>({
    title: `Delete ${entityName}`,
    message: (data: any) => {
      const name = data?.name || data?.title || data?.company || data?.subject || entityName;
      return `Are you sure you want to delete "${name}"? This action cannot be undone.`;
    },
    confirmLabel: 'Delete',
    variant: 'danger'
  });
}

/**
 * Pre-configured confirmation for bulk delete actions.
 */
export function useBulkDeleteConfirm(entityName: string = 'items') {
  return useConfirmAction<{ count: number }>({
    title: `Delete ${entityName}`,
    message: (data) => 
      `Are you sure you want to delete ${data.count} ${entityName}? This action cannot be undone.`,
    confirmLabel: 'Delete All',
    variant: 'danger'
  });
}

/**
 * Pre-configured confirmation for discard changes actions.
 */
export function useDiscardChangesConfirm() {
  return useConfirmAction<void>({
    title: 'Discard Changes',
    message: 'You have unsaved changes. Are you sure you want to discard them?',
    confirmLabel: 'Discard',
    variant: 'warning'
  });
}

export default useConfirmAction;
