/**
 * Tooltip Component
 * Hover tooltip for additional information - uses Portal for proper z-index handling
 */

import React, { createContext, useContext, useState, ReactNode, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface TooltipProviderProps {
  children: ReactNode;
  delayDuration?: number;
}

export function TooltipProvider({ children }: TooltipProviderProps) {
  return <>{children}</>;
}

interface TooltipContextValue {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLDivElement>;
}

const TooltipContext = createContext<TooltipContextValue | null>(null);

interface TooltipProps {
  children: ReactNode;
}

export function Tooltip({ children }: TooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  return (
    <TooltipContext.Provider value={{ isOpen, setIsOpen, triggerRef }}>
      <div ref={triggerRef} className="inline-flex">{children}</div>
    </TooltipContext.Provider>
  );
}

interface TooltipTriggerProps {
  children: ReactNode;
  asChild?: boolean;
}

export function TooltipTrigger({ children, asChild }: TooltipTriggerProps) {
  const context = useContext(TooltipContext);
  if (!context) throw new Error('TooltipTrigger must be used within Tooltip');

  const handleMouseEnter = () => context.setIsOpen(true);
  const handleMouseLeave = () => context.setIsOpen(false);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleMouseEnter,
      onBlur: handleMouseLeave,
    });
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
    </div>
  );
}

interface TooltipContentProps {
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  sideOffset?: number;
}

export function TooltipContent({ 
  children, 
  side = 'top', 
  className = '',
  sideOffset = 8 
}: TooltipContentProps) {
  const context = useContext(TooltipContext);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const contentRef = useRef<HTMLDivElement>(null);
  
  if (!context) throw new Error('TooltipContent must be used within Tooltip');

  // Calculate position based on trigger element
  const updatePosition = useCallback(() => {
    if (!context.triggerRef.current || !context.isOpen) return;
    
    const triggerRect = context.triggerRef.current.getBoundingClientRect();
    const contentRect = contentRef.current?.getBoundingClientRect();
    const contentWidth = contentRect?.width || 100;
    const contentHeight = contentRect?.height || 30;
    
    let top = 0;
    let left = 0;
    
    switch (side) {
      case 'top':
        top = triggerRect.top - contentHeight - sideOffset;
        left = triggerRect.left + (triggerRect.width / 2) - (contentWidth / 2);
        break;
      case 'right':
        top = triggerRect.top + (triggerRect.height / 2) - (contentHeight / 2);
        left = triggerRect.right + sideOffset;
        break;
      case 'bottom':
        top = triggerRect.bottom + sideOffset;
        left = triggerRect.left + (triggerRect.width / 2) - (contentWidth / 2);
        break;
      case 'left':
        top = triggerRect.top + (triggerRect.height / 2) - (contentHeight / 2);
        left = triggerRect.left - contentWidth - sideOffset;
        break;
    }
    
    // Ensure tooltip stays within viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Clamp horizontal
    if (left < 8) left = 8;
    if (left + contentWidth > viewportWidth - 8) {
      left = viewportWidth - contentWidth - 8;
    }
    
    // Clamp vertical
    if (top < 8) top = 8;
    if (top + contentHeight > viewportHeight - 8) {
      top = viewportHeight - contentHeight - 8;
    }
    
    setPosition({ top, left });
  }, [context.triggerRef, context.isOpen, side, sideOffset]);

  useEffect(() => {
    if (!context.isOpen) return;
    
    // Small delay to ensure content is rendered
    const timer = setTimeout(updatePosition, 0);
    
    return () => clearTimeout(timer);
  }, [context.isOpen, updatePosition]);

  const content = (
    <AnimatePresence>
      {context.isOpen && (
        <motion.div
          ref={contentRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className={`
            fixed z-[9999] px-2.5 py-1.5 text-xs font-medium
            bg-slate-900 text-white
            rounded-lg shadow-lg whitespace-nowrap pointer-events-none
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

export default Tooltip;
