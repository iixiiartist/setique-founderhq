import React, { useEffect, useRef } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    triggerRef?: React.RefObject<HTMLElement | null>;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, triggerRef }) => {
    const modalRef = useRef<HTMLDivElement>(null);
    const titleId = `modal-title-${Math.random().toString(36).substring(2, 9)}`;

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

            // Set initial focus
            firstElement?.focus();

            document.addEventListener('keydown', handleTabKeyPress);
            document.addEventListener('keydown', handleEscapeKeyPress);

            return () => {
                document.removeEventListener('keydown', handleTabKeyPress);
                document.removeEventListener('keydown', handleEscapeKeyPress);
                // Return focus to the trigger element if it exists
                triggerRef?.current?.focus();
            };
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
            className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-2 sm:p-4"
            onClick={handleBackdropClick}
            aria-modal="true"
            role="dialog"
            aria-labelledby={titleId}
        >
            <div ref={modalRef} className="bg-white p-4 sm:p-6 border-2 border-black shadow-neo-lg w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-3 sm:mb-4 shrink-0">
                    <h2 id={titleId} className="text-xl sm:text-2xl font-bold truncate pr-2">{title}</h2>
                    <button onClick={onClose} className="text-3xl font-bold hover:text-red-500 transition-colors flex-shrink-0" aria-label="Close modal">&times;</button>
                </div>
                <div className="overflow-y-auto custom-scrollbar pr-1 sm:pr-2 -mr-1 sm:-mr-2">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;