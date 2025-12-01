import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, className = '', ...props }) => {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group">
      <div className="relative">
        <input 
          type="checkbox" 
          {...props} 
          className={`
            appearance-none w-5 h-5 border border-gray-300 bg-white rounded-md
            checked:bg-slate-900 checked:border-slate-900
            focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:ring-offset-1
            disabled:opacity-50 disabled:cursor-not-allowed
            cursor-pointer transition-all duration-200
            ${className}
          `}
        />
        {/* Checkmark */}
        <svg 
          className="absolute top-0.5 left-0.5 w-4 h-4 text-white pointer-events-none opacity-0 peer-checked:opacity-100"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      {label && <span className="text-slate-700 text-sm group-hover:text-slate-900 transition-colors">{label}</span>}
    </label>
  );
};
