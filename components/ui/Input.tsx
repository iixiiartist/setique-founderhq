import React from 'react';

export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helpText?: string;
  size?: InputSize;
  fullWidth?: boolean;
}

const sizeStyles: Record<InputSize, string> = {
  sm: 'py-1.5 px-3 text-sm',
  md: 'py-2.5 px-4 text-sm',
  lg: 'py-3 px-4 text-base',
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helpText,
      size = 'md',
      fullWidth = true,
      className = '',
      id,
      required,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${label?.replace(/\s+/g, '-').toLowerCase()}`;
    const describedBy = helpText ? `${inputId}-help` : error ? `${inputId}-error` : undefined;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {required && <span className="ml-1 text-red-500" aria-label="required">*</span>}
          </label>
        )}
        
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={`
            bg-white border border-gray-200 text-slate-900 rounded-xl
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400
            disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500
            transition-colors duration-200
            ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-500/10' : ''}
            ${sizeStyles[size]}
            ${fullWidth ? 'w-full' : ''}
            ${className}
          `}
          {...props}
        />
        
        {helpText && !error && (
          <p id={`${inputId}-help`} className="text-xs text-gray-500 mt-1.5">
            {helpText}
          </p>
        )}
        
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600 mt-1.5" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
