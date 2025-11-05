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

    const baseClasses = "fixed top-5 right-5 max-w-sm p-4 border-2 border-black shadow-neo-lg z-[100] flex items-center gap-4";
    const typeClasses = {
        info: "bg-blue-100",
        success: "bg-green-100",
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]}`} role="alert" aria-live="assertive">
            <span className="flex-grow">{message}</span>
            <button onClick={onClose} className="text-xl font-bold hover:text-red-500 transition-colors" aria-label="Close notification">&times;</button>
        </div>
    );
};

export default Toast;