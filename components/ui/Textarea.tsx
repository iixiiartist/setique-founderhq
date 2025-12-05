/**
 * Textarea Component
 * Multi-line text input with consistent styling
 */

import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helpText, className = '', id, required, ...props }, ref) => {
    const textareaId = id || `textarea-${label?.replace(/\s+/g, '-').toLowerCase()}`;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {required && <span className="ml-1 text-red-500">*</span>}
          </label>
        )}
        
        <textarea
          ref={ref}
          id={textareaId}
          required={required}
          className={`
            w-full bg-white border border-gray-200 
            text-slate-900 rounded-xl
            py-2.5 px-4 text-sm
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400
            disabled:bg-gray-50 disabled:cursor-not-allowed disabled:text-gray-500
            transition-colors duration-200 resize-none
            ${error ? 'border-red-300 focus:border-red-400 focus:ring-red-500/10' : ''}
            ${className}
          `}
          {...props}
        />
        
        {helpText && !error && (
          <p className="text-xs text-gray-500 mt-1.5">{helpText}</p>
        )}
        
        {error && (
          <p className="text-xs text-red-600 mt-1.5" role="alert">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
