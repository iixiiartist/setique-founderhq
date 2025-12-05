/**
 * ScrollArea Component
 * Scrollable container with custom styling
 */

import React from 'react';

export interface ScrollAreaProps {
  children: React.ReactNode;
  className?: string;
}

export function ScrollArea({ children, className = '' }: ScrollAreaProps) {
  return (
    <div
      className={`overflow-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent ${className}`}
    >
      {children}
    </div>
  );
}

export default ScrollArea;
