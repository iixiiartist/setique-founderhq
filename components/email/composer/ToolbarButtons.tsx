import React from 'react';
import { ChevronDown } from 'lucide-react';

// Toolbar button component for consistent styling
interface ToolbarButtonProps {
    onClick: () => void;
    isActive?: boolean;
    disabled?: boolean;
    title: string;
    children: React.ReactNode;
    className?: string;
}

export function ToolbarButton({
    onClick,
    isActive,
    disabled,
    title,
    children,
    className = ''
}: ToolbarButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className={`
                p-1.5 rounded-md transition-all duration-150
                ${isActive
                    ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
                ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                ${className}
            `}
            title={title}
        >
            {children}
        </button>
    );
}

// Dropdown button with indicator
interface DropdownButtonProps {
    onClick: () => void;
    isOpen: boolean;
    title: string;
    children: React.ReactNode;
    indicator?: React.ReactNode;
}

export function DropdownButton({
    onClick,
    isOpen,
    title,
    children,
    indicator,
}: DropdownButtonProps) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`
                flex items-center gap-0.5 p-1.5 rounded-md transition-all duration-150
                ${isOpen
                    ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-300'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }
            `}
            title={title}
        >
            {children}
            {indicator}
            <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
    );
}

export default ToolbarButton;
