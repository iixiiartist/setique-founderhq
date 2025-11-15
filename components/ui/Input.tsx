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
  sm: 'p-1 text-sm',
  md: 'p-2 text-base',
  lg: 'p-3 text-lg',
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
          <label htmlFor={inputId} className="block font-mono text-sm font-semibold text-black mb-1">
            {label}
            {required && <span className="ml-1 text-red-600" aria-label="required">*</span>}
          </label>
        )}
        
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={`
            bg-white border-2 text-black rounded-none
            focus:outline-none transition-colors
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
            ${error 
              ? 'border-red-500 focus:border-red-600' 
              : 'border-black focus:border-blue-500'
            }
            ${sizeStyles[size]}
            ${fullWidth ? 'w-full' : ''}
            ${className}
          `}
          {...props}
        />
        
        {helpText && !error && (
          <p id={`${inputId}-help`} className="text-xs text-gray-600 mt-1">
            {helpText}
          </p>
        )}
        
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-red-600 font-semibold mt-1" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
