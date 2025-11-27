import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Sparkles, Loader2, Lock, MessageCircle, GripVertical } from 'lucide-react';
import './animations.css';

interface FloatingButtonProps {
  onClick: () => void;
  hasUnread: boolean;
  unreadCount?: number;
  className?: string;
  isLoading?: boolean;
  variant?: 'default' | 'locked';
  tooltip?: string;
}

// Get initial position from localStorage or default to bottom-right
const getInitialPosition = () => {
  if (typeof window === 'undefined') return { x: 24, y: 24 };
  try {
    const saved = localStorage.getItem('floatingButtonPosition');
    if (saved) {
      const pos = JSON.parse(saved);
      // Validate position is within viewport
      const maxX = window.innerWidth - 80;
      const maxY = window.innerHeight - 80;
      return {
        x: Math.min(Math.max(0, pos.x), maxX),
        y: Math.min(Math.max(0, pos.y), maxY),
      };
    }
  } catch {}
  return { x: 24, y: 24 }; // Default bottom-right (using right/bottom offsets)
};

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  onClick,
  hasUnread,
  unreadCount = 0,
  className = '',
  isLoading = false,
  variant = 'default',
  tooltip,
}) => {
  const [isFirstRender, setIsFirstRender] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState(getInitialPosition);
  const [hasDragged, setHasDragged] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; posX: number; posY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    console.log('[FloatingButton] MOUNTED and VISIBLE - Check bottom-right corner');
    // Only animate on first render
    const timer = setTimeout(() => setIsFirstRender(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Show tooltip after short hover delay
  useEffect(() => {
    if (isHovered && !isDragging) {
      hoverTimeoutRef.current = setTimeout(() => setShowTooltip(true), 400);
    } else {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      setShowTooltip(false);
    }
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, [isHovered, isDragging]);

  // Drag handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only start drag on left click
    if (e.button !== 0) return;
    e.preventDefault();
    setHasDragged(false);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
    setIsDragging(true);
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    
    const deltaX = dragStartRef.current.x - e.clientX;
    const deltaY = dragStartRef.current.y - e.clientY;
    
    // Only count as drag if moved more than 5px
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setHasDragged(true);
    }
    
    const newX = Math.max(0, Math.min(window.innerWidth - 80, dragStartRef.current.posX + deltaX));
    const newY = Math.max(0, Math.min(window.innerHeight - 80, dragStartRef.current.posY + deltaY));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      // Save position to localStorage
      try {
        localStorage.setItem('floatingButtonPosition', JSON.stringify(position));
      } catch {}
    }
  }, [isDragging, position]);

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setHasDragged(false);
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      posX: position.x,
      posY: position.y,
    };
    setIsDragging(true);
  }, [position]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging || !dragStartRef.current) return;
    
    const touch = e.touches[0];
    const deltaX = dragStartRef.current.x - touch.clientX;
    const deltaY = dragStartRef.current.y - touch.clientY;
    
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      setHasDragged(true);
    }
    
    const newX = Math.max(0, Math.min(window.innerWidth - 80, dragStartRef.current.posX + deltaX));
    const newY = Math.max(0, Math.min(window.innerHeight - 80, dragStartRef.current.posY + deltaY));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
      try {
        localStorage.setItem('floatingButtonPosition', JSON.stringify(position));
      } catch {}
    }
  }, [isDragging, position]);

  // Global mouse/touch listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Handle click - only trigger if not dragged
  const handleClick = useCallback(() => {
    if (!hasDragged) {
      onClick();
    }
  }, [hasDragged, onClick]);

  const isLockedVariant = variant === 'locked';
  const defaultTooltip = isLoading
    ? 'Loading data...'
    : isLockedVariant
      ? 'Upgrade to unlock AI'
      : 'Ask AI anything';
  const tooltipText = tooltip || defaultTooltip;

  const renderIcon = () => {
    if (isLoading) {
      return (
        <div className="relative">
          <Loader2 className="w-6 h-6 animate-spin" strokeWidth={2} />
        </div>
      );
    }
    if (isLockedVariant) {
      return <Lock className="w-5 h-5" strokeWidth={2.5} />;
    }
    return (
      <div className="relative">
        <Sparkles 
          className={`w-6 h-6 transition-all duration-300 ${isHovered ? 'scale-110' : ''}`} 
          strokeWidth={2} 
        />
      </div>
    );
  };
  
  return (
    <div 
      ref={containerRef}
      className={`fixed z-[99999] ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{
        right: `${position.x}px`,
        bottom: `${position.y}px`,
      }}
    >
      {/* Animated Tooltip */}
      <div
        className={`
          absolute bottom-full right-0 mb-3
          pointer-events-none
          transition-all duration-200 ease-out
          ${showTooltip && !isLoading && !isDragging ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        `}
      >
        <div className="
          flex items-center gap-2
          bg-gray-900/95 backdrop-blur-sm text-white
          px-4 py-2.5 rounded-xl
          shadow-soft-xl
          whitespace-nowrap
          text-sm font-medium
        ">
          <MessageCircle className="w-4 h-4 text-blue-400" />
          <span>{isDragging ? 'Drag to reposition' : tooltipText}</span>
          {/* Tooltip arrow */}
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-gray-900/95 transform rotate-45 rounded-sm" />
        </div>
      </div>

      {/* Drag hint on hover */}
      {isHovered && !isDragging && !isLoading && (
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none">
          <GripVertical size={14} className="text-gray-400" />
        </div>
      )}

      {/* Ripple effect ring */}
      {hasUnread && !isLoading && !isDragging && (
        <div className="absolute inset-0 w-14 h-14">
          <span className="absolute inset-0 rounded-full bg-blue-400/60 fab-ripple" />
          <span className="absolute inset-0 rounded-full bg-blue-400/60 fab-ripple animation-delay-300" />
        </div>
      )}

      {/* Main Button */}
      <button
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative
          w-14 h-14 rounded-2xl
          flex items-center justify-center
          gpu-accelerate
          transition-all duration-300 ease-out
          ${isFirstRender ? 'fab-spring-enter' : ''}
          ${isHovered && !isLoading && !isDragging ? 'shadow-soft-2xl scale-105 -translate-y-1' : 'shadow-soft-xl'}
          ${isDragging ? 'scale-110 shadow-2xl ring-2 ring-blue-400/50' : ''}
          ${isLockedVariant 
            ? 'bg-gradient-to-br from-gray-400 to-gray-500 text-white' 
            : 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white'
          }
          ${isLoading ? 'cursor-wait' : isDragging ? 'cursor-grabbing' : 'cursor-grab'}
          ${className}
          active:scale-95 active:shadow-soft-lg
        `}
        style={{
          willChange: 'transform, box-shadow',
          pointerEvents: 'auto',
          touchAction: 'none', // Prevent scroll while dragging on mobile
        }}
        aria-label={tooltipText}
        disabled={isLoading}
      >
        {renderIcon()}
        
        {/* Notification Badge */}
        {hasUnread && unreadCount > 0 && (
          <span
            className="
              absolute -top-1 -right-1
              min-w-[20px] h-[20px] px-1.5
              rounded-full
              bg-gradient-to-br from-red-500 to-rose-600
              text-white text-[10px] font-bold
              border-2 border-white
              flex items-center justify-center
              shadow-soft-md
              badge-bounce
            "
            aria-label={`${unreadCount} unread messages`}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Loading progress ring */}
        {isLoading && (
          <svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 56 56"
          >
            <circle
              className="text-blue-300 opacity-30"
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            />
            <circle
              className="text-white loading-ring-stroke"
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="150"
              strokeDashoffset="120"
            />
          </svg>
        )}
      </button>
    </div>
  );
};
