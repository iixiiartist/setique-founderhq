import React from 'react';
import { SquareSpinner } from '../shared/Loading';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

// Modern design: Rounded, soft shadows, slate colors
const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-slate-900 text-white hover:bg-slate-800 border-transparent',
  secondary: 'bg-gray-100 text-slate-900 hover:bg-gray-200 border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 border-transparent',
  ghost: 'bg-transparent text-slate-700 hover:bg-gray-100 border-transparent',
  outline: 'bg-white text-slate-900 hover:bg-gray-50 border-gray-200',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 border-transparent',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'py-1.5 px-3 text-sm',
  md: 'py-2.5 px-4 text-sm',
  lg: 'py-3 px-6 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`
        font-semibold cursor-pointer
        transition-all duration-200 border rounded-xl
        shadow-sm hover:shadow-md
        active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <SquareSpinner size="xs" />
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
