import React from 'react';

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ label, ...props }) => {
  return (
    <label className="flex items-center space-x-2">
      <input type="checkbox" {...props} className="form-checkbox h-5 w-5 text-blue-600" />
      {label && <span className="text-gray-700 dark:text-gray-300">{label}</span>}
    </label>
  );
};
