/**
 * Toast notification utilities
 * 
 * Provides consistent toast notifications throughout the app
 * using react-hot-toast library.
 */

import toast, { Toaster } from 'react-hot-toast';

// Toast configuration
export const toastConfig = {
  duration: 4000,
  position: 'bottom-right' as const,
  style: {
    border: '3px solid black',
    boxShadow: '4px 4px 0px 0px rgba(0, 0, 0, 1)',
    fontFamily: 'inherit',
  },
  success: {
    iconTheme: {
      primary: '#10b981',
      secondary: 'white',
    },
  },
  error: {
    iconTheme: {
      primary: '#ef4444',
      secondary: 'white',
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
          className="px-3 py-1 bg-black text-white border-2 border-black hover:bg-gray-800 font-bold text-sm"
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
