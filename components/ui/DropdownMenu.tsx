/**
 * DropdownMenu Component
 * Dropdown menu with items and separators - uses Portal for proper z-index handling
 */

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  if (!context) throw new Error('DropdownMenuContent must be used within DropdownMenu');

  // Calculate position based on trigger element
  const updatePosition = useCallback(() => {
    if (!context.triggerRef.current || !context.isOpen) return;
    
    const triggerRect = context.triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current?.getBoundingClientRect();
    const contentWidth = contentRect?.width || 160;
    const contentHeight = contentRect?.height || 100;
    
    let top = triggerRect.bottom + 4; // 4px gap
    let left = triggerRect.left;
    
    // Adjust for alignment
    switch (align) {
      case 'start':
        left = triggerRect.left;
        break;
      case 'center':
        left = triggerRect.left + (triggerRect.width / 2) - (contentWidth / 2);
        break;
      case 'end':
        left = triggerRect.right - contentWidth;
        break;
    }
    
    // Ensure dropdown stays within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Clamp horizontal position
    if (left < 8) left = 8;
    if (left + contentWidth > viewportWidth - 8) {
      left = viewportWidth - contentWidth - 8;
    }
    
    // If dropdown would go below viewport, show above trigger
    if (top + contentHeight > viewportHeight - 8) {
      top = triggerRect.top - contentHeight - 4;
    }
    
    // Clamp vertical position
    if (top < 8) top = 8;
    
    setPosition({ top, left });
  }, [context.triggerRef, context.isOpen, align]);

  // Update position on open and resize
  useEffect(() => {
    if (!context.isOpen) return;
    
    const timer = setTimeout(updatePosition, 0);
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [context.isOpen, updatePosition]);

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

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        context.setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [context.isOpen, context.setIsOpen]);

  const content = (
    <AnimatePresence>
      {context.isOpen && (
        <motion.div
          ref={contentRef}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15 }}
          className={`
            fixed z-[9999] min-w-[10rem] py-1
            bg-white 
            border border-gray-200
            rounded-xl shadow-xl
            ${className}
          `}
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render via portal to body
  if (typeof document !== 'undefined') {
    return createPortal(content, document.body);
  }
  
  return null;
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
