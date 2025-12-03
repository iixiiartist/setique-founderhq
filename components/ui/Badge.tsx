import React from 'react';
import { X } from 'lucide-react';

export type BadgeVariant = 'default' | 'filled' | 'outline' | 'success' | 'warning' | 'danger' | 'primary' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  onRemove?: () => void;
}

// Modern design: Pill-shaped badges with subtle colors
const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-gray-100 text-slate-700 border-transparent',
  filled: 'bg-slate-900 text-white border-transparent',
  outline: 'bg-transparent text-slate-700 border-gray-300',
  success: 'bg-emerald-50 text-emerald-700 border-transparent',
  warning: 'bg-amber-50 text-amber-700 border-transparent',
  danger: 'bg-red-50 text-red-700 border-transparent',
  primary: 'bg-blue-50 text-blue-700 border-transparent',
  info: 'bg-sky-50 text-sky-700 border-transparent',
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-0.5',
  lg: 'text-sm px-3 py-1',
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
        inline-flex items-center gap-1 font-medium rounded-full border
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
          className="ml-0.5 -mr-1 p-0.5 rounded-full hover:bg-black/10 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-current"
          aria-label="Remove badge"
        >
          <X className="w-3 h-3" aria-hidden="true" />
        </button>
      )}
    </span>
  );
}
