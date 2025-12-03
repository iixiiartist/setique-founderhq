import React from 'react';
import { AlertTriangle, Trash2, Info } from 'lucide-react';
import { Button } from '../ui/Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  /** Alias for confirmLabel (backwards compatibility) */
  confirmText?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const variantConfig = {
  danger: {
    Icon: Trash2,
    confirmBg: 'bg-red-600 hover:bg-red-700 text-white',
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    ariaLabel: 'Delete action',
  },
  warning: {
    Icon: AlertTriangle,
    confirmBg: 'bg-amber-600 hover:bg-amber-700 text-white',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    ariaLabel: 'Warning',
  },
  info: {
    Icon: Info,
    confirmBg: 'bg-slate-900 hover:bg-slate-800 text-white',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    ariaLabel: 'Information',
  },
};

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const config = variantConfig[variant];
  const { Icon } = config;
  const resolvedConfirmLabel = confirmLabel || confirmText || 'Confirm';

  const handleConfirm = () => {
    onConfirm();
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
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50"
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
    >
      <div 
        className="bg-white rounded-2xl border border-gray-200 shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with icon */}
        <div className="p-6 pb-4">
          <div className="flex items-start gap-4">
            <div 
              className={`w-12 h-12 rounded-xl ${config.iconBg} flex items-center justify-center flex-shrink-0`}
              aria-label={config.ariaLabel}
              role="img"
            >
              <Icon className={`w-6 h-6 ${config.iconColor}`} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 
                id="confirm-dialog-title" 
                className="text-lg font-bold text-gray-900"
              >
                {title}
              </h3>
              <p 
                id="confirm-dialog-description" 
                className="mt-2 text-sm text-gray-600"
              >
                {message}
              </p>
            </div>
          </div>
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
            disabled={isLoading}
            className={`px-4 py-2 font-medium rounded-xl shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${config.confirmBg}`}
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
              resolvedConfirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
