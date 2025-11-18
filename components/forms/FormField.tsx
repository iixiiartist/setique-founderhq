import React from 'react';
import { useController, useFormContext } from 'react-hook-form';

type InputType = 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'date' | 'time' | 'datetime-local' | 'textarea';

export interface FormFieldProps {
  name: string;
  label: string;
  type?: InputType;
  placeholder?: string;
  helpText?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  min?: number | string;
  max?: number | string;
  step?: number | string;
  autoComplete?: string;
  autoFocus?: boolean;
  rows?: number;
}

export function FormField({
  name,
  label,
  type = 'text',
  placeholder,
  helpText,
  required,
  disabled,
  className = '',
  min,
  max,
  step,
  autoComplete,
  autoFocus,
  rows,
}: FormFieldProps) {
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

  const isTextarea = type === 'textarea';

  return (
    <div className={`space-y-1 ${className}`}>
      <label htmlFor={id} className="block font-mono text-sm font-semibold text-black">
        {label}
        {required && <span className="ml-1 text-red-600" aria-label="required">*</span>}
      </label>
      
      {isTextarea ? (
        <textarea
          {...field}
          id={id}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows ?? 3}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={`
            w-full bg-white border-2 text-black p-2 rounded-none
            focus:outline-none transition-colors
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
            ${error 
              ? 'border-red-500 focus:border-red-600' 
              : 'border-black focus:border-blue-500'
            }
          `}
        />
      ) : (
        <input
          {...field}
          id={id}
          type={type}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
          step={step}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={describedBy}
          className={`
            w-full bg-white border-2 text-black p-2 rounded-none
            focus:outline-none transition-colors
            disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-500
            ${error 
              ? 'border-red-500 focus:border-red-600' 
              : 'border-black focus:border-blue-500'
            }
          `}
        />
      )}
      
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
