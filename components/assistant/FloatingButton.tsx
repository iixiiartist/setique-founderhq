import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import './animations.css';

interface FloatingButtonProps {
  onClick: () => void;
  hasUnread: boolean;
  unreadCount?: number;
  className?: string;
  isLoading?: boolean;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  onClick,
  hasUnread,
  unreadCount = 0,
  className = '',
  isLoading = false,
}) => {
  const [isFirstRender, setIsFirstRender] = useState(true);
  
  useEffect(() => {
    console.log('[FloatingButton] MOUNTED and VISIBLE - Check bottom-right corner');
    // Only animate on first render
    const timer = setTimeout(() => setIsFirstRender(false), 500);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6
        w-16 h-16 rounded-full
        bg-blue-600 text-white
        border-4 border-black
        shadow-neo-btn-lg
        hover:shadow-neo-xl
        flex items-center justify-center
        gpu-accelerate
        ${isFirstRender ? 'fab-spring-enter' : ''}
        ${hasUnread ? 'animate-pulse' : ''}
        ${className}
      `}
      style={{
        zIndex: 99999,
        transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
        willChange: 'transform, box-shadow',
        pointerEvents: 'auto'
      }}
      title={isLoading ? "Loading data..." : "Open AI Assistant"}
      aria-label={isLoading ? "Loading data..." : "Open AI Assistant"}
      disabled={isLoading}
      onMouseEnter={(e) => {
        if (!isLoading) e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        if (!isLoading) e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseDown={(e) => {
        if (!isLoading) e.currentTarget.style.transform = 'scale(0.95)';
      }}
      onMouseUp={(e) => {
        if (!isLoading) e.currentTarget.style.transform = 'scale(1.05)';
      }}
    >
      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin" strokeWidth={2.5} />
      ) : (
        <Sparkles className="w-6 h-6" strokeWidth={2.5} />
      )}
      
      {hasUnread && unreadCount > 0 && (
        <span
          className="
            absolute -top-1 -right-1
            min-w-[24px] h-6 px-1
            rounded-full
            bg-red-500 text-white text-xs font-bold
            border-2 border-white
            flex items-center justify-center
            badge-pulse
          "
          aria-label={`${unreadCount} unread messages`}
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </button>
  );
};
