import React, { useEffect, useState, useRef } from 'react';
import { Sparkles, Loader2, Lock, MessageCircle } from 'lucide-react';
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
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    console.log('[FloatingButton] MOUNTED and VISIBLE - Check bottom-right corner');
    // Only animate on first render
    const timer = setTimeout(() => setIsFirstRender(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Show tooltip after short hover delay
  useEffect(() => {
    if (isHovered) {
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
  }, [isHovered]);

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
          <Loader2 className="w-7 h-7 animate-spin" strokeWidth={2} />
        </div>
      );
    }
    if (isLockedVariant) {
      return <Lock className="w-6 h-6" strokeWidth={2.5} />;
    }
    return (
      <div className="relative">
        <Sparkles 
          className={`w-7 h-7 transition-all duration-300 ${isHovered ? 'scale-110' : ''}`} 
          strokeWidth={2} 
        />
        {/* Subtle glow effect */}
        <div className="absolute inset-0 blur-sm opacity-40">
          <Sparkles className="w-7 h-7" strokeWidth={2} />
        </div>
      </div>
    );
  };
  
  return (
    <div className="fixed bottom-6 right-6 z-[99999]">
      {/* Animated Tooltip */}
      <div
        className={`
          absolute bottom-full right-0 mb-3
          pointer-events-none
          transition-all duration-200 ease-out
          ${showTooltip && !isLoading ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
        `}
      >
        <div className="
          flex items-center gap-2
          bg-gray-900 text-white
          px-4 py-2.5 rounded-lg
          shadow-lg
          whitespace-nowrap
          text-sm font-medium
          border border-gray-700
        ">
          <MessageCircle className="w-4 h-4 text-blue-400" />
          <span>{tooltipText}</span>
          {/* Tooltip arrow */}
          <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-gray-900 border-r border-b border-gray-700 transform rotate-45" />
        </div>
      </div>

      {/* Ripple effect ring */}
      {hasUnread && !isLoading && (
        <div className="absolute inset-0 w-16 h-16">
          <span className="absolute inset-0 rounded-full bg-blue-400 fab-ripple" />
          <span className="absolute inset-0 rounded-full bg-blue-400 fab-ripple animation-delay-300" />
        </div>
      )}

      {/* Main Button */}
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`
          relative
          w-16 h-16 rounded-full
          border-3 border-black
          flex items-center justify-center
          gpu-accelerate
          transition-all duration-200 ease-out
          ${isFirstRender ? 'fab-spring-enter' : ''}
          ${isHovered && !isLoading ? 'shadow-neo-xl scale-105' : 'shadow-neo-lg'}
          ${isLockedVariant 
            ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700' 
            : 'bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600 text-white'
          }
          ${isLoading ? 'cursor-wait' : 'cursor-pointer'}
          ${className}
          active:scale-95 active:shadow-neo-sm
        `}
        style={{
          willChange: 'transform, box-shadow',
          pointerEvents: 'auto'
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
              min-w-[22px] h-[22px] px-1.5
              rounded-full
              bg-gradient-to-br from-red-500 to-rose-600
              text-white text-xs font-bold
              border-2 border-white
              flex items-center justify-center
              shadow-md
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
            viewBox="0 0 64 64"
          >
            <circle
              className="text-blue-300 opacity-30"
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <circle
              className="text-white loading-ring-stroke"
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="176"
              strokeDashoffset="140"
            />
          </svg>
        )}
      </button>
    </div>
  );
};
