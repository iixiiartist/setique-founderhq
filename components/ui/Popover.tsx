/**
 * Popover Component
 * Floating content panel triggered by click
 */

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PopoverContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement>;
}

const PopoverContext = createContext<PopoverContextValue | null>(null);

interface PopoverProps {
  children: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({ children, open, onOpenChange }: PopoverProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const setIsOpen = (newOpen: boolean) => {
    if (isControlled && onOpenChange) {
      onOpenChange(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  return (
    <PopoverContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      <div className="relative inline-flex">{children}</div>
    </PopoverContext.Provider>
  );
}

interface PopoverTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export function PopoverTrigger({ children, asChild }: PopoverTriggerProps) {
  const context = useContext(PopoverContext);
  if (!context) throw new Error('PopoverTrigger must be used within Popover');

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

interface PopoverContentProps {
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function PopoverContent({ 
  children, 
  side = 'bottom', 
  align = 'center',
  className = '' 
}: PopoverContentProps) {
  const context = useContext(PopoverContext);
  const contentRef = useRef<HTMLDivElement>(null);
  if (!context) throw new Error('PopoverContent must be used within Popover');

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

  const sideClasses = {
    top: 'bottom-full mb-2',
    right: 'left-full ml-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
  };

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
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={`
            absolute z-[100] min-w-[10rem]
            bg-white 
            border border-gray-200
            rounded-xl shadow-lg
            ${sideClasses[side]}
            ${side === 'top' || side === 'bottom' ? alignClasses[align] : 'top-0'}
            ${className}
          `}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Popover;
