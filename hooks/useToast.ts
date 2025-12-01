import { useState, useCallback } from 'react';

/**
 * Toast/notification types
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification item
 */
export interface Toast {
  /** Unique identifier */
  id: string;
  /** Toast message */
  message: string;
  /** Toast type for styling */
  type: ToastType;
  /** Optional title */
  title?: string;
  /** Duration in ms before auto-dismiss (0 = no auto-dismiss) */
  duration?: number;
  /** Timestamp when toast was created */
  createdAt: number;
}

/**
 * Options for creating a toast
 */
export interface ToastOptions {
  /** Toast type (default: 'info') */
  type?: ToastType;
  /** Optional title */
  title?: string;
  /** Duration in ms before auto-dismiss (default: 5000, 0 = no auto-dismiss) */
  duration?: number;
}

/**
 * Return type for useToast hook
 */
export interface UseToastReturn {
  /** Array of current toasts */
  toasts: Toast[];
  /** Add a new toast */
  addToast: (message: string, options?: ToastOptions) => string;
  /** Remove a toast by id */
  removeToast: (id: string) => void;
  /** Clear all toasts */
  clearToasts: () => void;
  /** Shorthand for success toast */
  success: (message: string, title?: string) => string;
  /** Shorthand for error toast */
  error: (message: string, title?: string) => string;
  /** Shorthand for warning toast */
  warning: (message: string, title?: string) => string;
  /** Shorthand for info toast */
  info: (message: string, title?: string) => string;
}

/**
 * Hook for managing toast notifications.
 * 
 * @param defaultDuration - Default duration for toasts in ms (default: 5000)
 * @returns Toast state and control functions
 * 
 * @example
 * // Basic usage
 * const { toasts, success, error } = useToast();
 * 
 * // Show success toast
 * success('Item saved successfully!');
 * 
 * // Show error toast
 * error('Failed to save item');
 * 
 * @example
 * // With custom options
 * const { addToast } = useToast();
 * 
 * addToast('Custom toast', {
 *   type: 'warning',
 *   title: 'Warning',
 *   duration: 10000
 * });
 * 
 * @example
 * // Render toasts
 * return (
 *   <div className="toast-container">
 *     {toasts.map(toast => (
 *       <div key={toast.id} className={`toast toast-${toast.type}`}>
 *         {toast.title && <strong>{toast.title}</strong>}
 *         <p>{toast.message}</p>
 *         <button onClick={() => removeToast(toast.id)}>×</button>
 *       </div>
 *     ))}
 *   </div>
 * );
 */
export function useToast(defaultDuration: number = 5000): UseToastReturn {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const addToast = useCallback((message: string, options: ToastOptions = {}): string => {
    const {
      type = 'info',
      title,
      duration = defaultDuration
    } = options;

    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const toast: Toast = {
      id,
      message,
      type,
      title,
      duration,
      createdAt: Date.now()
    };

    setToasts(prev => [...prev, toast]);

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [defaultDuration, removeToast]);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const success = useCallback((message: string, title?: string): string => {
    return addToast(message, { type: 'success', title });
  }, [addToast]);

  const error = useCallback((message: string, title?: string): string => {
    return addToast(message, { type: 'error', title });
  }, [addToast]);

  const warning = useCallback((message: string, title?: string): string => {
    return addToast(message, { type: 'warning', title });
  }, [addToast]);

  const info = useCallback((message: string, title?: string): string => {
    return addToast(message, { type: 'info', title });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    clearToasts,
    success,
    error,
    warning,
    info
  };
}

export default useToast;
