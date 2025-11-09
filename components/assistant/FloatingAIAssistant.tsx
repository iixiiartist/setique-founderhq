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
