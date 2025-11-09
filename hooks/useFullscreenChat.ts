import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing fullscreen/focus mode for chat modules
 * Provides state management, keyboard shortcuts, and mobile detection
 */
export function useFullscreenChat(initialFullscreen = false) {
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen);
  
  // Detect if we're on a mobile device
  const isMobileDevice = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           window.innerWidth < 768;
  }, []);
  
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);
  
  const enterFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, []);
  
  const exitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);
  
  // Handle Escape key to exit fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitFullscreen();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    // Prevent body scroll when fullscreen
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isFullscreen, exitFullscreen]);
  
  return {
    isFullscreen,
    toggleFullscreen,
    enterFullscreen,
    exitFullscreen,
    isMobileDevice,
  };
}
