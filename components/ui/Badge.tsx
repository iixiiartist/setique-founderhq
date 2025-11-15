import React from 'react';

export type BadgeVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  onRemove?: () => void;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-200 text-gray-800 border-gray-400',
  primary: 'bg-blue-100 text-blue-800 border-blue-500',
  success: 'bg-green-100 text-green-800 border-green-500',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-500',
  danger: 'bg-red-100 text-red-800 border-red-500',
  info: 'bg-purple-100 text-purple-800 border-purple-500',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-0.5',
  lg: 'text-base px-2.5 py-1',
};

export function Badge({
  variant = 'default',
  size = 'md',
  children,
  className = '',
  onRemove,
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 font-mono font-semibold border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="ml-1 hover:opacity-70 transition-opacity focus:outline-none"
          aria-label="Remove"
        >
          ×
        </button>
      )}
    </span>
  );
}
