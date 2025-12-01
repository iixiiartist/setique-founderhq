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
  sm: 'py-1.5 px-3 text-sm',
  md: 'py-2.5 px-4 text-sm',
  lg: 'py-3 px-4 text-base',
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
          <label htmlFor={selectId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {required && <span className="ml-1 text-red-500" aria-label="required">*</span>}
          </label>
        )}
        
        <select
          ref={ref}
          id={selectId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={`
            bg-white border border-gray-200 text-slate-900 rounded-xl cursor-pointer
            focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400
            disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500
            transition-colors duration-200
            ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-500/10' : ''}
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
          <p id={`${selectId}-help`} className="text-xs text-gray-500 mt-1.5">
            {helpText}
          </p>
        )}
        
        {error && (
          <p id={`${selectId}-error`} className="text-xs text-red-600 mt-1.5" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
