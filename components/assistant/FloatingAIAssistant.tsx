import React from 'react';
import { TabType } from '../../constants';
import { AppActions } from '../../types';
import { useAssistantState } from '../../hooks/useAssistantState';
import { FloatingButton } from './FloatingButton';
import { AssistantModal } from './AssistantModal';

interface FloatingAIAssistantProps {
  currentTab: TabType;
  actions: AppActions;
  workspaceId?: string;
  onUpgradeNeeded?: () => void;
  companyName: string;
  businessContext: string;
  teamContext: string;
  planType?: string;
  onToggleRef?: (toggle: () => void) => void;
  autoOpenOnMobile?: boolean; // Auto-open assistant on mobile devices
}

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({
  currentTab,
  actions,
  workspaceId,
  onUpgradeNeeded,
  companyName,
  businessContext,
  teamContext,
  planType,
  onToggleRef,
  autoOpenOnMobile = true, // Default to true for mobile-first experience
}) => {
  const {
    isOpen,
    selectedContext,
    hasUnread,
    unreadCount,
    toggle,
    minimize,
    setContext,
    markUnread,
  } = useAssistantState(currentTab);
  
  // Auto-open on mobile devices (on first mount only)
  React.useEffect(() => {
    if (autoOpenOnMobile && !isOpen) {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      if (isMobile) {
        // Small delay to ensure smooth animation
        const timer = setTimeout(() => {
          toggle();
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, []); // Empty dependency array = run only once on mount
  
  // Expose toggle function to parent via callback ref
  React.useEffect(() => {
    if (onToggleRef) {
      onToggleRef(toggle);
    }
  }, [toggle, onToggleRef]);
  
  // Don't show AI assistant for free plans
  if (planType === 'free') {
    return null;
  }
  
  return (
    <>
      {/* Floating Button (always visible when minimized) */}
      {!isOpen && (
        <FloatingButton
          onClick={toggle}
          hasUnread={hasUnread}
          unreadCount={unreadCount}
        />
      )}
      
      {/* Assistant Modal (visible when open) */}
      <AssistantModal
        isOpen={isOpen}
        onMinimize={minimize}
        currentTab={selectedContext}
        onContextChange={setContext}
        actions={actions}
        workspaceId={workspaceId}
        onUpgradeNeeded={onUpgradeNeeded}
        companyName={companyName}
        businessContext={businessContext}
        teamContext={teamContext}
        onNewMessage={markUnread}
      />
    </>
  );
};
