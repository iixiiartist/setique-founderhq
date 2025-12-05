/**
 * DropdownMenu Component
 * Dropdown menu with items and separators
 */

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DropdownMenuContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement>;
}

const DropdownMenuContext = createContext<DropdownMenuContextValue | null>(null);

interface DropdownMenuProps {
  children: ReactNode;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <DropdownMenuContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      <div className="relative inline-flex">{children}</div>
    </DropdownMenuContext.Provider>
  );
}

interface DropdownMenuTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export function DropdownMenuTrigger({ children, asChild }: DropdownMenuTriggerProps) {
  const context = useContext(DropdownMenuContext);
  if (!context) throw new Error('DropdownMenuTrigger must be used within DropdownMenu');

  const handleClick = () => context.setIsOpen(!context.isOpen);

  if (asChild && React.isValidElement(children)) {
    return (
      <div ref={context.triggerRef}>
        {React.cloneElement(children as React.ReactElement<any>, {
          onClick: handleClick,
          'aria-expanded': context.isOpen,
        })}
      </div>
    );
  }

  return (
    <div ref={context.triggerRef} onClick={handleClick}>
      {children}
    </div>
  );
}

interface DropdownMenuContentProps {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function DropdownMenuContent({ 
  children, 
  align = 'end',
  className = '' 
}: DropdownMenuContentProps) {
  const context = useContext(DropdownMenuContext);
  const contentRef = useRef<HTMLDivElement>(null);
  if (!context) throw new Error('DropdownMenuContent must be used within DropdownMenu');

  // Close on click outside
  useEffect(() => {
    if (!context.isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (
        contentRef.current &&
        !contentRef.current.contains(e.target as Node) &&
        context.triggerRef.current &&
        !context.triggerRef.current.contains(e.target as Node)
      ) {
        context.setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [context.isOpen]);

  const alignClasses = {
    start: 'left-0',
    center: 'left-1/2 -translate-x-1/2',
    end: 'right-0',
  };

  return (
    <AnimatePresence>
      {context.isOpen && (
        <motion.div
          ref={contentRef}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className={`
            absolute z-[100] top-full mt-1 min-w-[10rem] py-1
            bg-white 
            border border-gray-200
            rounded-xl shadow-lg
            ${alignClasses[align]}
            ${className}
          `}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

interface DropdownMenuItemProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function DropdownMenuItem({ 
  children, 
  onClick, 
  disabled = false,
  className = '' 
}: DropdownMenuItemProps) {
  const context = useContext(DropdownMenuContext);

  const handleClick = () => {
    if (disabled) return;
    onClick?.();
    context?.setIsOpen(false);
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`
        w-full flex items-center px-3 py-2 text-xs text-left
        text-gray-700
        hover:bg-gray-100
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors whitespace-nowrap
        ${className}
      `}
    >
      {children}
    </button>
  );
}

export function DropdownMenuSeparator() {
  return <div className="h-px bg-gray-200 my-1" />;
}

export default DropdownMenu;
