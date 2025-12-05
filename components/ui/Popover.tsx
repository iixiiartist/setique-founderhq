/**
 * Popover Component
 * Floating content panel triggered by click - uses Portal for proper z-index handling
 */

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  sideOffset?: number;
}

export function PopoverContent({ 
  children, 
  side = 'bottom', 
  align = 'center',
  className = '',
  sideOffset = 8
}: PopoverContentProps) {
  const context = useContext(PopoverContext);
  const contentRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  
  if (!context) throw new Error('PopoverContent must be used within Popover');

  // Calculate position based on trigger element
  const updatePosition = useCallback(() => {
    if (!context.triggerRef.current || !context.isOpen) return;
    
    const triggerRect = context.triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current?.getBoundingClientRect();
    const contentWidth = contentRect?.width || 256; // fallback width
    const contentHeight = contentRect?.height || 200; // fallback height
    
    let top = 0;
    let left = 0;
    
    // Calculate position based on side
    switch (side) {
      case 'top':
        top = triggerRect.top - contentHeight - sideOffset;
        left = triggerRect.left;
        break;
      case 'right':
        top = triggerRect.top;
        left = triggerRect.right + sideOffset;
        break;
      case 'bottom':
        top = triggerRect.bottom + sideOffset;
        left = triggerRect.left;
        break;
      case 'left':
        top = triggerRect.top;
        left = triggerRect.left - contentWidth - sideOffset;
        break;
    }
    
    // Adjust for alignment (horizontal sides)
    if (side === 'top' || side === 'bottom') {
      switch (align) {
        case 'start':
          // left stays as is
          break;
        case 'center':
          left = triggerRect.left + (triggerRect.width / 2) - (contentWidth / 2);
          break;
        case 'end':
          left = triggerRect.right - contentWidth;
          break;
      }
    }
    
    // Adjust for alignment (vertical sides)
    if (side === 'left' || side === 'right') {
      switch (align) {
        case 'start':
          // top stays as is
          break;
        case 'center':
          top = triggerRect.top + (triggerRect.height / 2) - (contentHeight / 2);
          break;
        case 'end':
          top = triggerRect.bottom - contentHeight;
          break;
      }
    }
    
    // Ensure popover stays within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Clamp horizontal position
    if (left < 8) left = 8;
    if (left + contentWidth > viewportWidth - 8) {
      left = viewportWidth - contentWidth - 8;
    }
    
    // Clamp vertical position
    if (top < 8) top = 8;
    if (top + contentHeight > viewportHeight - 8) {
      top = viewportHeight - contentHeight - 8;
    }
    
    setPosition({ top, left });
  }, [context.triggerRef, context.isOpen, side, align, sideOffset]);

  // Update position on open and resize
  useEffect(() => {
    if (!context.isOpen) return;
    
    // Initial position calculation (small delay to ensure content is rendered)
    const timer = setTimeout(updatePosition, 0);
    
    // Update on scroll/resize
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

    // Close on escape
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

  // Use portal to render outside parent hierarchy
  const content = (
    <AnimatePresence>
      {context.isOpen && (
        <motion.div
          ref={contentRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          className={`
            fixed z-[9999] min-w-[10rem]
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

export default Popover;
