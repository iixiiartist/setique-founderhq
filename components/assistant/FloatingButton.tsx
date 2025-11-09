import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import './animations.css';

interface FloatingButtonProps {
  onClick: () => void;
  hasUnread: boolean;
  unreadCount?: number;
  className?: string;
}

export const FloatingButton: React.FC<FloatingButtonProps> = ({
  onClick,
  hasUnread,
  unreadCount = 0,
  className = '',
}) => {
  const [isFirstRender, setIsFirstRender] = useState(true);
  
  useEffect(() => {
    // Only animate on first render
    const timer = setTimeout(() => setIsFirstRender(false), 500);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <button
      onClick={onClick}
      className={`
        fixed bottom-6 right-6 z-50
        w-14 h-14 rounded-full
        bg-blue-600 text-white
        border-3 border-black
        shadow-neo-btn-lg
        hover:shadow-neo-xl
        flex items-center justify-center
        gpu-accelerate
        ${isFirstRender ? 'fab-spring-enter' : ''}
        ${hasUnread ? 'animate-pulse' : ''}
        ${className}
      `}
      style={{
        transition: 'transform 0.15s ease-out, box-shadow 0.15s ease-out',
        willChange: 'transform, box-shadow'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.95)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      aria-label="Open AI Assistant"
      title="Open AI Assistant"
    >
      <Sparkles className="w-6 h-6" strokeWidth={2.5} />
      
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
