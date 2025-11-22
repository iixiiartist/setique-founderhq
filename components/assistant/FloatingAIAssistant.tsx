import React from 'react';
import { Tab, TabType } from '../../constants';
import { AppActions, DashboardData } from '../../types';
import { useAssistantState } from '../../hooks/useAssistantState';
import { FloatingButton } from './FloatingButton';
import { AssistantModal } from './AssistantModal';
import type { AssistantMessagePayload } from '../../hooks/useConversationHistory';

const formatRelativeTime = (iso?: string) => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.round(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
};

const formatNotificationMetadata = (metadata?: AssistantMessagePayload['metadata']) => {
  const webMeta = metadata?.webSearch;
  if (!webMeta) return '';
  const parts: string[] = [];
  if (webMeta.provider) {
    parts.push(webMeta.provider);
  }
  if (typeof webMeta.count === 'number') {
    parts.push(`${webMeta.count} source${webMeta.count === 1 ? '' : 's'}`);
  }
  if (webMeta.mode === 'images') {
    parts.push('image references');
  } else if (webMeta.mode === 'news') {
    parts.push('news search');
  }
  if (webMeta.fetchedAt) {
    const relative = formatRelativeTime(webMeta.fetchedAt);
    if (relative) {
      parts.push(relative);
    }
  }
  if (webMeta.query) {
    parts.push(`“${webMeta.query}”`);
  }
  return parts.join(' • ');
};

interface FloatingAIAssistantProps {
  currentTab: TabType;
  actions: AppActions;
  workspaceId?: string;
  onUpgradeNeeded?: () => void;
  companyName: string;
  businessContext: string;
  userContext: string; // Current user info and permissions
  teamContext: string;
  data: DashboardData; // Actual workspace data for context injection
  planType?: string;
  onToggleRef?: (toggle: () => void) => void;
  autoOpenOnMobile?: boolean; // Auto-open assistant on mobile devices
  onDataLoadNeeded?: (tab: TabType) => Promise<void>; // Force load data for current tab
}

export const FloatingAIAssistant: React.FC<FloatingAIAssistantProps> = ({
  currentTab,
  actions,
  workspaceId,
  onUpgradeNeeded,
  companyName,
  businessContext,
  userContext,
  teamContext,
  data,
  planType,
  onToggleRef,
  autoOpenOnMobile = true, // Default to true for mobile-first experience
  onDataLoadNeeded,
}) => {
  const normalizedPlanType = planType || 'free';
  const assistantUnlocked = true;
  const {
    isOpen,
    selectedContext,
    hasUnread,
    unreadCount,
    toggle: originalToggle,
    minimize,
    setContext,
    markUnread,
  } = useAssistantState(currentTab);
  
  const [isLoadingData, setIsLoadingData] = React.useState(false);
  const desktopNotificationsEnabled = data?.settings?.desktopNotifications;

  const handleUpgradeClick = React.useCallback(() => {
    if (onUpgradeNeeded) {
      onUpgradeNeeded();
    } else {
      console.info('[FloatingAIAssistant] Upgrade required to use AI assistant');
    }
  }, [onUpgradeNeeded]);
  
  const handleAssistantMessage = React.useCallback((payload: AssistantMessagePayload) => {
    markUnread();
    if (isOpen) {
      return;
    }

    if (!desktopNotificationsEnabled) {
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    try {
      const metadataLine = formatNotificationMetadata(payload.metadata);
      const textSnippet = payload.text?.trim().slice(0, 200) || 'New assistant reply ready.';
      const body = metadataLine ? `${textSnippet}\n${metadataLine}` : textSnippet;
      new Notification('Setique AI Assistant', {
        body,
        tag: `ai-assistant-${Date.now()}`,
      });
    } catch (error) {
      console.error('[FloatingAIAssistant] Failed to show assistant notification:', error);
    }
  }, [markUnread, isOpen, desktopNotificationsEnabled]);
  
  // Enhanced toggle that ensures data is loaded before opening
  const toggle = React.useCallback(async () => {
    if (!isOpen && onDataLoadNeeded) {
      // Check if current tab needs data before opening AI
      let needsData = false;
      
      switch (currentTab) {
        case Tab.Tasks:
          needsData = data.productsServicesTasks.length === 0 && (!data.crmTasks || data.crmTasks.length === 0);
          break;
        case Tab.Accounts:
          needsData = (!data.crmItems || data.crmItems.length === 0) && data.investors.length === 0;
          break;
        case Tab.Investors:
          needsData = data.investors.length === 0;
          break;
        case Tab.Customers:
          needsData = data.customers.length === 0;
          break;
        case Tab.Partners:
          needsData = data.partners.length === 0;
          break;
        case Tab.Marketing:
          needsData = data.marketing.length === 0;
          break;
        case Tab.Financials:
          needsData = data.financials.length === 0 && data.expenses.length === 0;
          break;
        case Tab.ProductsServices:
          needsData = data.productsServicesTasks.length === 0;
          break;
        case Tab.Calendar:
          // Calendar needs multiple data sources
          needsData = data.productsServicesTasks.length === 0;
          break;
        default:
          needsData = false;
      }
      
      if (needsData) {
        console.log(`[FloatingAIAssistant] Data needed for ${currentTab}, loading...`);
        setIsLoadingData(true);
        try {
          await onDataLoadNeeded(currentTab);
          console.log(`[FloatingAIAssistant] Data loaded for ${currentTab}`);
        } catch (error) {
          console.error('[FloatingAIAssistant] Failed to load data:', error);
        } finally {
          setIsLoadingData(false);
        }
      }
    }
    
    // Toggle the modal
    originalToggle();
  }, [isOpen, currentTab, data, onDataLoadNeeded, originalToggle]);
  
  // Auto-open on mobile devices (on first mount only)
  React.useEffect(() => {
    if (!autoOpenOnMobile || !assistantUnlocked) return;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile) {
      // Small delay to ensure smooth animation
      const timer = setTimeout(() => {
        toggle();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoOpenOnMobile, assistantUnlocked, toggle]);
  
  // Expose toggle function to parent via callback ref
  React.useEffect(() => {
    if (onToggleRef) {
      onToggleRef(assistantUnlocked ? toggle : handleUpgradeClick);
    }
  }, [assistantUnlocked, handleUpgradeClick, onToggleRef, toggle]);

  React.useEffect(() => {
    if (!assistantUnlocked && isOpen) {
      minimize();
    }
  }, [assistantUnlocked, isOpen, minimize]);
  
  // Don't show AI assistant for free plans (disabled for local development testing)
  // TODO: Re-enable before production deployment
  // if (planType === 'free') {
  //   return null;
  // }
  
    // Debug logging
  React.useEffect(() => {
    console.log('[FloatingAIAssistant] Rendering:', {
      isOpen,
      hasUnread,
      currentTab,
      workspaceId,
      companyName,
      plan: normalizedPlanType,
      willShowButton: !isOpen,
      assistantUnlocked,
    });
  }, [assistantUnlocked, companyName, currentTab, hasUnread, isOpen, normalizedPlanType, workspaceId]);

  // Log when component mounts
  React.useEffect(() => {
    console.log('[FloatingAIAssistant] MOUNTED - Button should be visible at bottom-right');
  }, []);
  
  // DEBUG: Log data being passed
  React.useEffect(() => {
    console.log('[FloatingAIAssistant] DATA CHECK:', {
      investors: data.investors?.length || 0,
      customers: data.customers?.length || 0,
      partners: data.partners?.length || 0,
      marketing: data.marketing?.length || 0,
      productsServicesTasks: data.productsServicesTasks?.length || 0,
      investorTasks: data.investorTasks?.length || 0,
      customerTasks: data.customerTasks?.length || 0,
      financials: data.financials?.length || 0,
      expenses: data.expenses?.length || 0,
      documents: data.documents?.length || 0,
      // Show first item to verify data structure
      sampleInvestor: data.investors?.[0] ? { 
        company: data.investors[0].company, 
        status: data.investors[0].status 
      } : 'none',
      sampleMarketing: data.marketing?.[0] ? {
        title: data.marketing[0].title,
        status: data.marketing[0].status
      } : 'none'
    });
  }, [data]);
  
  if (!assistantUnlocked) {
    return (
      <FloatingButton
        onClick={handleUpgradeClick}
        hasUnread={false}
        unreadCount={0}
        variant="locked"
        tooltip="Upgrade to unlock the AI assistant"
      />
    );
  }

  return (
    <>
      {/* Floating Button (always visible when minimized) */}
      {!isOpen && (
        <FloatingButton
          onClick={toggle}
          hasUnread={hasUnread}
          unreadCount={unreadCount}
          isLoading={isLoadingData}
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
        userContext={userContext}
        teamContext={teamContext}
        data={data}
        onNewMessage={handleAssistantMessage}
        planType={normalizedPlanType}
      />
    </>
  );
};
