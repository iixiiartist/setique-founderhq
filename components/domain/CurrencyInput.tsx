import React, { useState, useEffect, forwardRef } from 'react';

export interface CurrencyInputProps {
  name?: string;
  label?: string;
  value: number;
  onChange: (value: number) => void;
  currency?: string;
  currencySymbol?: string;
  min?: number;
  max?: number;
  placeholder?: string;
  helpText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  allowNegative?: boolean;
  showSymbol?: boolean;
  locale?: string;
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      name,
      label,
      value,
      onChange,
      currency = 'USD',
      currencySymbol = '$',
      min = 0,
      max,
      placeholder,
      helpText,
      error,
      required = false,
      disabled = false,
      className = '',
      allowNegative = false,
      showSymbol = true,
      locale = 'en-US',
    },
    ref
  ) => {
    const [displayValue, setDisplayValue] = useState('');
    const [isFocused, setIsFocused] = useState(false);

    // Format number for display
    const formatNumber = (num: number): string => {
      if (isNaN(num)) return '';
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(num);
    };

    // Update display when value prop changes
    useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatNumber(value));
      }
    }, [value, isFocused, locale]);

    const handleFocus = () => {
      setIsFocused(true);
      // Show raw number on focus for easier editing
      setDisplayValue(value === 0 ? '' : value.toString());
    };

    const handleBlur = () => {
      setIsFocused(false);
      // Parse and validate
      const numValue = parseFloat(displayValue.replace(/,/g, '')) || 0;
      let finalValue = numValue;

      // Apply min/max constraints
      if (!allowNegative && finalValue < 0) finalValue = 0;
      if (min !== undefined && finalValue < min) finalValue = min;
      if (max !== undefined && finalValue > max) finalValue = max;

      onChange(finalValue);
      setDisplayValue(formatNumber(finalValue));
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value;

      // Allow only numbers, decimal point, comma, and minus (if negative allowed)
      const regex = allowNegative ? /^-?\d*\.?\d*$/ : /^\d*\.?\d*$/;
      const cleanInput = input.replace(/,/g, '');

      if (regex.test(cleanInput) || cleanInput === '' || cleanInput === '-') {
        setDisplayValue(input);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Allow: backspace, delete, tab, escape, enter, decimal point
      if (
        e.key === 'Backspace' ||
        e.key === 'Delete' ||
        e.key === 'Tab' ||
        e.key === 'Escape' ||
        e.key === 'Enter' ||
        e.key === '.' ||
        e.key === 'ArrowLeft' ||
        e.key === 'ArrowRight' ||
        e.key === 'Home' ||
        e.key === 'End' ||
        (allowNegative && e.key === '-')
      ) {
        return;
      }

      // Allow Ctrl/Cmd shortcuts
      if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x', 'z'].includes(e.key)) {
        return;
      }

      // Block non-numeric keys
      if (!/^\d$/.test(e.key)) {
        e.preventDefault();
      }
    };

    const inputId = name || `currency-input-${Math.random().toString(36).slice(2, 11)}`;
    const hasError = !!error;

    return (
      <div className={className}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block font-mono text-sm font-semibold text-black mb-1"
          >
            {label} {required && <span className="text-red-600">*</span>}
          </label>
        )}

        {/* Input with Currency Symbol */}
        <div className="relative">
          {showSymbol && (
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 font-mono font-bold text-gray-700 pointer-events-none">
              {currencySymbol}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || '0.00'}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined
            }
            className={`w-full bg-white border-2 text-black p-2 rounded-none focus:outline-none transition-colors ${
              showSymbol ? 'pl-8' : 'pl-2'
            } ${
              hasError
                ? 'border-red-600 focus:border-red-600'
                : 'border-black focus:border-blue-500'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
          />
        </div>

        {/* Error Message */}
        {error && (
          <p id={`${inputId}-error`} className="mt-1 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}

        {/* Help Text */}
        {helpText && !error && (
          <p id={`${inputId}-help`} className="mt-1 text-xs text-gray-600">
            {helpText}
          </p>
        )}

        {/* Value Preview (when not focused) */}
        {!isFocused && value !== 0 && !error && (
          <p className="mt-1 text-xs text-gray-500 font-mono">
            {currency !== 'USD' && `${currency} `}
            {currencySymbol}
            {formatNumber(value)}
          </p>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';
