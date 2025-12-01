import React, { useEffect } from 'react';

interface ToastProps {
    message: string;
    type: 'info' | 'success';
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000); // Auto-dismiss after 3 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    const baseClasses = "fixed top-5 right-5 max-w-sm p-4 rounded-xl shadow-lg z-[100] flex items-center gap-3 border";
    const typeClasses = {
        info: "bg-white border-gray-200 text-slate-700",
        success: "bg-emerald-50 border-emerald-100 text-emerald-800",
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`} role="alert" aria-live="assertive">
            {type === 'success' && (
                <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
            <span className="flex-grow text-sm">{message}</span>
            <button 
                onClick={onClose} 
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100" 
                aria-label="Close notification"
            >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
};

export default Toast;