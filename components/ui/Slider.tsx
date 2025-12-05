/**
 * Slider Component
 * A range slider for numeric value selection
 */

import React from 'react';

export interface SliderProps {
  value: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange: (value: number[]) => void;
  className?: string;
  disabled?: boolean;
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  className = '',
  disabled = false,
}: SliderProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onValueChange([Number(e.target.value)]);
  };

  const percentage = ((value[0] - min) / (max - min)) * 100;

  return (
    <div className={`relative w-full h-5 flex items-center ${className}`}>
      <div className="absolute w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="absolute h-full bg-indigo-600 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={handleChange}
        disabled={disabled}
        className="absolute w-full h-2 opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div
        className="absolute w-4 h-4 bg-white border-2 border-indigo-600 rounded-full shadow-sm transition-all pointer-events-none"
        style={{ left: `calc(${percentage}% - 8px)` }}
      />
    </div>
  );
}

export default Slider;
