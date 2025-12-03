import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/Button';

export interface ConfirmWithInputDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  /** The text that must be typed to confirm */
  confirmationText: string;
  /** Label explaining what to type (e.g., "Type the email address to confirm:") */
  inputLabel: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
}

const variantStyles = {
  danger: {
    icon: '⚠️',
    confirmBg: 'bg-red-600 hover:bg-red-700 text-white',
    iconBg: 'bg-red-100',
    inputFocusBorder: 'focus:border-red-500 focus:ring-red-500',
  },
  warning: {
    icon: '⚠️',
    confirmBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    iconBg: 'bg-amber-100',
    inputFocusBorder: 'focus:border-amber-500 focus:ring-amber-500',
  },
};

export const ConfirmWithInputDialog: React.FC<ConfirmWithInputDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmationText,
  inputLabel,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  const isMatch = inputValue === confirmationText;

  // Reset input when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setInputValue('');
      // Focus input after animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const styles = variantStyles[variant];

  const handleConfirm = () => {
    if (isMatch) {
      onConfirm();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !isLoading) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && !isLoading) {
      onClose();
    }
    if (e.key === 'Enter' && isMatch && !isLoading) {
      handleConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-input-dialog-title"
      aria-describedby="confirm-input-dialog-description"
    >
      <div 
        className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with icon */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-xl ${styles.iconBg} flex items-center justify-center text-2xl flex-shrink-0`}>
              {styles.icon}
            </div>
            <div className="flex-1 min-w-0">
              <h3 
                id="confirm-input-dialog-title" 
                className="text-lg font-bold text-gray-900"
              >
                {title}
              </h3>
              <p 
                id="confirm-input-dialog-description" 
                className="mt-2 text-sm text-gray-600 whitespace-pre-wrap"
              >
                {message}
              </p>
            </div>
          </div>
        </div>

        {/* Input Section */}
        <div className="px-6 pb-4">
          <label className="block text-sm font-medium text-slate-900 mb-2">
            {inputLabel}
          </label>
          <code className="block px-2 py-1 bg-gray-100 rounded-lg border border-gray-200 text-sm font-mono mb-2 select-all">
            {confirmationText}
          </code>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type to confirm..."
            disabled={isLoading}
            className={`w-full px-3 py-2 rounded-xl border border-gray-200 text-sm transition-colors ${styles.inputFocusBorder} ${
              inputValue.length > 0 && !isMatch ? 'bg-gray-50' : ''
            } ${isMatch ? 'bg-green-50 border-green-300' : ''}`}
          />
          {inputValue.length > 0 && !isMatch && (
            <p className="mt-1 text-xs text-gray-600">Text does not match</p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3 justify-end">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <button
            onClick={handleConfirm}
            disabled={isLoading || !isMatch}
            className={`px-4 py-2 font-medium rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${styles.confirmBg}`}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="relative w-4 h-4">
                  <span className="absolute inset-0 border-2 border-current animate-spin" style={{ animationDuration: '1.2s' }} />
                  <span className="absolute inset-0.5 border border-current/40 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
                </span>
                Processing...
              </span>
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmWithInputDialog;
