import React from 'react';

export type SelectSize = 'sm' | 'md' | 'lg';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  options: SelectOption[];
  placeholder?: string;
  error?: string;
  helpText?: string;
  size?: SelectSize;
  fullWidth?: boolean;
}

const sizeStyles: Record<SelectSize, string> = {
  sm: 'p-1 text-sm',
  md: 'p-2 text-base',
  lg: 'p-3 text-lg',
};

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      options,
      placeholder = 'Select an option',
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
    const selectId = id || `select-${label?.replace(/\s+/g, '-').toLowerCase()}`;
    const describedBy = helpText ? `${selectId}-help` : error ? `${selectId}-error` : undefined;

    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label htmlFor={selectId} className="block font-mono text-sm font-semibold text-black mb-1">
            {label}
            {required && <span className="ml-1 text-red-600" aria-label="required">*</span>}
          </label>
        )}
        
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={`
            bg-white border-2 text-black rounded-none cursor-pointer
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
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        
        {helpText && !error && (
          <p id={`${selectId}-help`} className="text-xs text-gray-600 mt-1">
            {helpText}
          </p>
        )}
        
        {error && (
          <p id={`${selectId}-error`} className="text-xs text-red-600 font-semibold mt-1" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
