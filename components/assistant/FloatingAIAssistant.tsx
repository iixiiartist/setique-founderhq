import React from 'react';
import { Tab, TabType } from '../../constants';
import { AppActions, DashboardData } from '../../types';
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
  
  // Enhanced toggle that ensures data is loaded before opening
  const toggle = React.useCallback(async () => {
    if (!isOpen && onDataLoadNeeded) {
      // Check if current tab needs data before opening AI
      let needsData = false;
      
      switch (currentTab) {
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
    if (!autoOpenOnMobile) return;
    
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
    if (isMobile) {
      // Small delay to ensure smooth animation
      const timer = setTimeout(() => {
        toggle();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array = run only once on mount
  
  // Expose toggle function to parent via callback ref
  React.useEffect(() => {
    if (onToggleRef) {
      onToggleRef(toggle);
    }
  }, [toggle, onToggleRef]);
  
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
      willShowButton: !isOpen
    });
  }, [isOpen, hasUnread, currentTab, workspaceId, companyName]);

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
        onNewMessage={markUnread}
      />
    </>
  );
};
