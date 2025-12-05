/**
 * RadioGroup Component
 * Radio button group for single selection
 */

import React, { createContext, useContext, ReactNode } from 'react';

interface RadioGroupContextValue {
  value: string;
  onChange: (value: string) => void;
  name: string;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  name?: string;
}

export function RadioGroup({ 
  value, 
  onValueChange, 
  children, 
  className = '',
  name = 'radio-group'
}: RadioGroupProps) {
  return (
    <RadioGroupContext.Provider value={{ value, onChange: onValueChange, name }}>
      <div className={`space-y-2 ${className}`} role="radiogroup">
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

interface RadioGroupItemProps {
  value: string;
  id?: string;
  disabled?: boolean;
  className?: string;
}

export function RadioGroupItem({ 
  value, 
  id, 
  disabled = false,
  className = '' 
}: RadioGroupItemProps) {
  const context = useContext(RadioGroupContext);
  if (!context) throw new Error('RadioGroupItem must be used within RadioGroup');

  const isChecked = context.value === value;
  const inputId = id || `${context.name}-${value}`;

  return (
    <div className={`relative ${className}`}>
      <input
        type="radio"
        id={inputId}
        name={context.name}
        value={value}
        checked={isChecked}
        onChange={() => context.onChange(value)}
        disabled={disabled}
        className="sr-only peer"
      />
      <label
        htmlFor={inputId}
        className={`
          w-4 h-4 rounded-full border-2 cursor-pointer
          flex items-center justify-center
          transition-colors
          ${isChecked 
            ? 'border-indigo-600 bg-indigo-600' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isChecked && (
          <div className="w-1.5 h-1.5 rounded-full bg-white" />
        )}
      </label>
    </div>
  );
}

export default RadioGroup;
