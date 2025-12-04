/**
 * Toast notification utilities
 * 
 * Provides consistent toast notifications throughout the app
 * using react-hot-toast library.
 */

import toast, { Toaster } from 'react-hot-toast';

// Toast configuration - Modern soft design
export const toastConfig = {
  duration: 4000,
  position: 'bottom-right' as const,
  style: {
    borderRadius: '12px',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.05)',
    fontFamily: 'inherit',
    padding: '12px 16px',
    background: 'white',
  },
  success: {
    iconTheme: {
      primary: '#10b981',
      secondary: 'white',
    },
    style: {
      borderRadius: '12px',
      border: '1px solid rgba(16, 185, 129, 0.2)',
      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15), 0 2px 4px rgba(0, 0, 0, 0.05)',
      background: 'linear-gradient(to right, rgba(16, 185, 129, 0.05), white)',
    },
  },
  error: {
    iconTheme: {
      primary: '#ef4444',
      secondary: 'white',
    },
    style: {
      borderRadius: '12px',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15), 0 2px 4px rgba(0, 0, 0, 0.05)',
      background: 'linear-gradient(to right, rgba(239, 68, 68, 0.05), white)',
    },
  },
};

/**
 * Show success toast
 */
export function showSuccess(message: string) {
  toast.success(message, toastConfig);
}

/**
 * Show error toast
 */
export function showError(message: string) {
  toast.error(message, toastConfig);
}

/**
 * Show info toast
 */
export function showInfo(message: string) {
  toast(message, {
    ...toastConfig,
    icon: '\u2139\uFE0F',
  });
}

/**
 * Show loading toast (returns toast ID for updating)
 */
export function showLoading(message: string) {
  return toast.loading(message, toastConfig);
}

/**
 * Update an existing toast
 */
export function updateToast(toastId: string, message: string, type: 'success' | 'error') {
  if (type === 'success') {
    toast.success(message, { id: toastId, ...toastConfig });
  } else {
    toast.error(message, { id: toastId, ...toastConfig });
  }
}

/**
 * Show toast with undo action
 */
export function showWithUndo(message: string, onUndo: () => void) {
  toast.success(
    (t) => (
      <div className="flex items-center gap-3">
        <span>{message}</span>
        <button
          onClick={() => {
            onUndo();
            toast.dismiss(t.id);
          }}
          className="px-3 py-1.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium text-sm transition-colors"
        >
          UNDO
        </button>
      </div>
    ),
    {
      ...toastConfig,
      duration: 5000, // Give more time for undo
    }
  );
}

/**
 * Toast container component - should be rendered once at app root
 */
export { Toaster };
