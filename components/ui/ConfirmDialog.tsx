/**
 * Confirm Dialog Component
 * Styled replacement for native browser confirm() and prompt() dialogs
 */

import React, { useState, useEffect, useRef, createContext, useContext, ReactNode, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Info, AlertCircle, CheckCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type DialogType = 'confirm' | 'prompt' | 'alert';
export type DialogVariant = 'default' | 'danger' | 'warning' | 'success' | 'info';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: DialogVariant;
}

interface PromptDialogOptions extends ConfirmDialogOptions {
  defaultValue?: string;
  placeholder?: string;
  inputType?: 'text' | 'email' | 'number';
  validation?: (value: string) => string | null; // Return error message or null if valid
}

interface AlertDialogOptions {
  title: string;
  message: string;
  buttonText?: string;
  variant?: DialogVariant;
}

interface DialogState {
  isOpen: boolean;
  type: DialogType;
  options: ConfirmDialogOptions | PromptDialogOptions | AlertDialogOptions;
  resolve: ((value: boolean | string | null) => void) | null;
}

// ============================================================================
// Context
// ============================================================================

interface DialogContextValue {
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  prompt: (options: PromptDialogOptions) => Promise<string | null>;
  alert: (options: AlertDialogOptions) => Promise<void>;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useConfirmDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useConfirmDialog must be used within ConfirmDialogProvider');
  }
  return context;
}

// ============================================================================
// Provider
// ============================================================================

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState>({
    isOpen: false,
    type: 'confirm',
    options: { title: '', message: '' },
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        type: 'confirm',
        options,
        resolve: resolve as any,
      });
    });
  }, []);

  const prompt = useCallback((options: PromptDialogOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        type: 'prompt',
        options,
        resolve: resolve as any,
      });
    });
  }, []);

  const alert = useCallback((options: AlertDialogOptions): Promise<void> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        type: 'alert',
        options,
        resolve: () => resolve() as any,
      });
    });
  }, []);

  const handleClose = useCallback((result: boolean | string | null) => {
    state.resolve?.(result);
    setState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [state.resolve]);

  return (
    <DialogContext.Provider value={{ confirm, prompt, alert }}>
      {children}
      <ConfirmDialogContent
        isOpen={state.isOpen}
        type={state.type}
        options={state.options}
        onClose={handleClose}
      />
    </DialogContext.Provider>
  );
}

// ============================================================================
// Dialog Content
// ============================================================================

interface ConfirmDialogContentProps {
  isOpen: boolean;
  type: DialogType;
  options: ConfirmDialogOptions | PromptDialogOptions | AlertDialogOptions;
  onClose: (result: boolean | string | null) => void;
}

function ConfirmDialogContent({ isOpen, type, options, onClose }: ConfirmDialogContentProps) {
  const [inputValue, setInputValue] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset input when dialog opens
  useEffect(() => {
    if (isOpen && type === 'prompt') {
      const promptOptions = options as PromptDialogOptions;
      setInputValue(promptOptions.defaultValue || '');
      setInputError(null);
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, type, options]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(type === 'confirm' ? false : null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, type, onClose]);

  const handleConfirm = () => {
    if (type === 'prompt') {
      const promptOptions = options as PromptDialogOptions;
      if (promptOptions.validation) {
        const error = promptOptions.validation(inputValue);
        if (error) {
          setInputError(error);
          return;
        }
      }
      onClose(inputValue);
    } else {
      onClose(true);
    }
  };

  const handleCancel = () => {
    onClose(type === 'confirm' ? false : null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type === 'prompt') {
      handleConfirm();
    }
  };

  const variant = (options as any).variant || 'default';
  
  const getIcon = () => {
    switch (variant) {
      case 'danger':
        return <AlertTriangle className="w-6 h-6 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-amber-500" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-500" />;
      default:
        return type === 'alert' ? <Info className="w-6 h-6 text-gray-500" /> : null;
    }
  };

  const getButtonClasses = () => {
    switch (variant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white';
      case 'success':
        return 'bg-green-600 hover:bg-green-700 text-white';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
          />
          
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15 }}
            className="fixed left-1/2 top-1/2 z-[100] -translate-x-1/2 -translate-y-1/2 w-full max-w-md"
          >
            <div className="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-start gap-3 p-5 pb-0">
                {getIcon()}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {options.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {options.message}
                  </p>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Prompt Input */}
              {type === 'prompt' && (
                <div className="px-5 pt-4">
                  <input
                    ref={inputRef}
                    type={(options as PromptDialogOptions).inputType || 'text'}
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      setInputError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={(options as PromptDialogOptions).placeholder || ''}
                    className={`
                      w-full px-4 py-2.5 rounded-lg border text-sm
                      focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                      ${inputError 
                        ? 'border-red-300 bg-red-50' 
                        : 'border-gray-300 bg-white'
                      }
                    `}
                  />
                  {inputError && (
                    <p className="mt-1.5 text-xs text-red-600">{inputError}</p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 p-5 pt-4">
                {type !== 'alert' && (
                  <button
                    onClick={handleCancel}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    {(options as ConfirmDialogOptions).cancelText || 'Cancel'}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${getButtonClasses()}`}
                >
                  {type === 'alert' 
                    ? (options as AlertDialogOptions).buttonText || 'OK'
                    : (options as ConfirmDialogOptions).confirmText || 'Confirm'
                  }
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default ConfirmDialogProvider;
