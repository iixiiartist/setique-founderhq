import React from 'react';
import { useController, useFormContext } from 'react-hook-form';

export interface SelectFieldProps {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SelectField({
  name,
  label,
  options,
  placeholder = 'Select an option',
  helpText,
  required,
  disabled,
  className = '',
}: SelectFieldProps) {
  const { control } = useFormContext();
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  const id = `field-${name}`;
  const describedBy = helpText ? `${id}-help` : error ? `${id}-error` : undefined;

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className="block font-mono text-sm font-semibold text-black">
        {label}
        {required && <span className="ml-1 text-red-600" aria-label="required">*</span>}
      </label>
      
      <select
        {...field}
        id={id}
        disabled={disabled}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={describedBy}
        className={`
          w-full bg-white border-2 text-black p-2 rounded-none
          focus:outline-none transition-colors cursor-pointer
          disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
          ${error 
            ? 'border-red-500 focus:border-red-600' 
            : 'border-black focus:border-blue-500'
          }
        `}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {helpText && !error && (
        <p id={`${id}-help`} className="text-xs text-gray-600">
          {helpText}
        </p>
      )}
      
      {error && (
        <p id={`${id}-error`} className="text-xs text-red-600 font-semibold" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
