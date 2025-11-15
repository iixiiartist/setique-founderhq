import React, { useEffect, useRef } from 'react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    triggerRef?: React.RefObject<HTMLElement | null>;
    size?: ModalSize;
    headerActions?: React.ReactNode;
    footer?: React.ReactNode;
    hideCloseButton?: boolean;
}

const sizeStyles: Record<ModalSize, string> = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    full: 'max-w-[95vw] min-h-[90vh]',
};

const Modal: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    triggerRef,
    size = 'md',
    headerActions,
    footer,
    hideCloseButton = false,
}) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const titleIdRef = useRef(`modal-title-${Math.random().toString(36).substring(2, 9)}`);
    const hasInitiallyFocusedRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            const modalNode = modalRef.current;
            if (!modalNode) return;

            // Focus trapping
            const focusableElements = modalNode.querySelectorAll<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleTabKeyPress = (e: KeyboardEvent) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey) {
                        if (document.activeElement === firstElement) {
                            e.preventDefault();
                            lastElement?.focus();
                        }
                    } else {
                        if (document.activeElement === lastElement) {
                            e.preventDefault();
                            firstElement?.focus();
                        }
                    }
                }
            };
            
            // Close on escape
            const handleEscapeKeyPress = (e: KeyboardEvent) => {
                if (e.key === 'Escape') {
                    onClose();
                }
            };

            // Set initial focus only on first open
            if (!hasInitiallyFocusedRef.current) {
                firstElement?.focus();
                hasInitiallyFocusedRef.current = true;
            }

            document.addEventListener('keydown', handleTabKeyPress);
            document.addEventListener('keydown', handleEscapeKeyPress);

            return () => {
                document.removeEventListener('keydown', handleTabKeyPress);
                document.removeEventListener('keydown', handleEscapeKeyPress);
                // Return focus to the trigger element if it exists
                triggerRef?.current?.focus();
            };
        } else {
            // Reset when modal closes
            hasInitiallyFocusedRef.current = false;
        }
    }, [isOpen, onClose, triggerRef]);


    if (!isOpen) return null;

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };
    
    return (
        <div 
            className="fixed inset-0 z-[100] flex justify-center items-center p-2 sm:p-4"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
            onClick={handleBackdropClick}
            aria-modal="true"
            role="dialog"
            aria-labelledby={titleIdRef.current}
        >
            <div 
                ref={modalRef} 
                className={`bg-white p-4 sm:p-6 border-2 border-black shadow-neo-lg w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col backdrop-blur-sm ${sizeStyles[size]}`}
            >
                <div className="flex justify-between items-center mb-3 sm:mb-4 shrink-0 gap-2">
                    <h2 id={titleIdRef.current} className="text-xl sm:text-2xl font-bold truncate pr-2">{title}</h2>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {headerActions}
                        {!hideCloseButton && (
                            <button 
                                onClick={onClose} 
                                className="text-3xl font-bold hover:text-red-500 transition-colors" 
                                aria-label="Close modal"
                            >
                                &times;
                            </button>
                        )}
                    </div>
                </div>
                <div className="overflow-y-auto custom-scrollbar pr-1 sm:pr-2 -mr-1 sm:-mr-2 flex-1">
                    {children}
                </div>
                {footer && (
                    <div className="mt-4 pt-4 border-t-2 border-gray-200 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Modal;