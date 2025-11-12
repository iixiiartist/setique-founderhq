import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Minus, X, Maximize2, Minimize2 } from 'lucide-react';
import { TabType } from '../../constants';
import { AppActions, DashboardData } from '../../types';
import { AssistantContextSwitcher } from './AssistantContextSwitcher';
import { getAssistantConfig } from './assistantConfig';
import ModuleAssistant from '../shared/ModuleAssistant';
import './animations.css';

interface AssistantModalProps {
  isOpen: boolean;
  onMinimize: () => void;
  onClose?: () => void;
  currentTab: TabType;
  onContextChange: (tab: TabType) => void;
  actions: AppActions;
  workspaceId?: string;
  onUpgradeNeeded?: () => void;
  companyName: string;
  businessContext: string;
  userContext: string; // Current user info and permissions
  teamContext: string;
  data: DashboardData;
  onNewMessage?: () => void;
}

export const AssistantModal: React.FC<AssistantModalProps> = ({
  isOpen,
  onMinimize,
  onClose,
  currentTab,
  onContextChange,
  actions,
  workspaceId,
  onUpgradeNeeded,
  companyName,
  businessContext,
  userContext,
  teamContext,
  data,
  onNewMessage,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const config = getAssistantConfig(currentTab);
  
  // Debug: Check if modal ref is set
  useEffect(() => {
    if (isOpen && modalRef.current) {
      console.log('[AssistantModal] Modal DOM element created:', {
        element: modalRef.current,
        position: modalRef.current.getBoundingClientRect(),
        styles: window.getComputedStyle(modalRef.current),
        visible: modalRef.current.offsetHeight > 0
      });
    }
  }, [isOpen]);
  
  // Trigger animation state
  useEffect(() => {
    if (isOpen) {
      console.log('[AssistantModal] Opening modal for tab:', currentTab);
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 400);
      return () => clearTimeout(timer);
    } else {
      console.log('[AssistantModal] Modal closed');
    }
  }, [isOpen, currentTab]);
  
  // Get system prompt for current context with actual data
  const systemPrompt = config.getSystemPrompt({
    companyName,
    businessContext,
    userContext,
    teamContext,
    data,
  });
  
  // DEBUG: Log when data changes to verify system prompt regeneration
  useEffect(() => {
    console.log('[AssistantModal] Data changed, system prompt will regenerate:', {
      currentTab,
      dataCheck: {
        investors: data.investors?.length || 0,
        customers: data.customers?.length || 0,
        partners: data.partners?.length || 0,
        marketing: data.marketing?.length || 0,
        platformTasks: data.platformTasks?.length || 0,
        investorTasks: data.investorTasks?.length || 0,
        customerTasks: data.customerTasks?.length || 0,
        marketingTasks: data.marketingTasks?.length || 0,
        financials: data.financials?.length || 0,
        expenses: data.expenses?.length || 0,
        documents: data.documents?.length || 0
      }
    });
  }, [data, currentTab]);
  
  // Handle Escape key - exit fullscreen first, then minimize
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          onMinimize();
        }
      }
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Focus trap - focus the modal when opened
      modalRef.current?.focus();
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, isFullscreen, onMinimize]);
  
  // Modal content component (reused for both normal and fullscreen)
  const modalContent = (
    <div
      ref={modalRef}
      style={{
        position: 'fixed',
        ...(isFullscreen ? {
          inset: 0,
          width: '100vw',
          height: '100vh',
          borderRadius: 0,
          border: 'none',
        } : {
          bottom: '96px',
          right: '24px',
          width: 'min(450px, calc(100vw - 3rem))',
          height: 'min(650px, calc(100vh - 8rem))',
          border: '4px solid #9333ea',
          borderRadius: '8px',
        }),
        zIndex: isFullscreen ? 100000 : 99998,
        backgroundColor: 'white',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        display: 'flex',
        flexDirection: 'column',
        opacity: 1,
        pointerEvents: 'auto',
        transition: 'all 0.3s ease-in-out',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-title"
      tabIndex={-1}
    >
      {/* Header */}
      <div className="
        h-14 px-4 border-b-3 border-black
        flex items-center justify-between gap-4
        bg-gradient-to-r from-blue-50 to-blue-100
        flex-shrink-0
      ">
        <AssistantContextSwitcher 
          currentTab={currentTab}
          onChange={onContextChange}
        />
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="
              p-2 rounded
              hover:bg-gray-100 
              border-2 border-black
              transition-colors
            "
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" strokeWidth={3} />
            ) : (
              <Maximize2 className="w-4 h-4" strokeWidth={3} />
            )}
          </button>
          
          <button
            onClick={isFullscreen ? () => setIsFullscreen(false) : onMinimize}
            className="
              p-2 rounded
              hover:bg-gray-100 
              border-2 border-black
              transition-colors
            "
            aria-label={isFullscreen ? "Exit fullscreen" : "Minimize assistant"}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Minimize (Esc)"}
          >
            <Minus className="w-4 h-4" strokeWidth={3} />
          </button>
          
          {onClose && !isFullscreen && (
            <button
              onClick={onClose}
              className="
                p-2 rounded
                hover:bg-red-100 
                border-2 border-black
                transition-colors
              "
              aria-label="Close assistant"
              title="Close"
            >
              <X className="w-4 h-4" strokeWidth={3} />
            </button>
          )}
        </div>
      </div>
      
      {/* Content - ModuleAssistant */}
      <div className="h-[calc(100%-56px)] overflow-hidden bg-white">
        <ModuleAssistant
          title={config.title}
          systemPrompt={systemPrompt}
          actions={actions}
          currentTab={currentTab}
          workspaceId={workspaceId}
          onUpgradeNeeded={onUpgradeNeeded}
          compact={false}
          onNewMessage={onNewMessage}
          allowFullscreen={false}
          autoFullscreenMobile={false}
          businessContext={businessContext}
          teamContext={teamContext}
          crmItems={[...data.investors, ...data.customers, ...data.partners]}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop - subtle for better UX, darker in fullscreen */}
      {isOpen && (
        <div
          className={`fixed inset-0 ${isFullscreen ? 'bg-black/30' : 'bg-black/10'} backdrop-fade-enter`}
          style={{ zIndex: isFullscreen ? 99999 : 99997 }}
          onClick={isFullscreen ? () => setIsFullscreen(false) : onMinimize}
          aria-hidden="true"
        />
      )}
      
      {/* Modal - Use portal for fullscreen, normal rendering otherwise */}
      {isOpen && (
        isFullscreen 
          ? ReactDOM.createPortal(modalContent, document.body)
          : modalContent
      )}
    </>
  );
};
