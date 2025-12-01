import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';
import { Minus, X, Maximize2, Minimize2, Sparkles, Bot, ChevronDown } from 'lucide-react';
import { TabType, Tab } from '../../constants';
import { AppActions, DashboardData } from '../../types';
import { getAssistantConfig } from './assistantConfig';
import ModuleAssistant from '../shared/ModuleAssistant';
import type { AssistantMessagePayload } from '../../hooks/useConversationHistory';
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
  onNewMessage?: (payload: AssistantMessagePayload) => void;
  planType?: string;
}

// Map tab types to friendly display names and colors
const TAB_DISPLAY_INFO: Record<TabType, { label: string; color: string; bgColor: string }> = {
  [Tab.Dashboard]: { label: 'Dashboard', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Calendar]: { label: 'Calendar', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Tasks]: { label: 'Tasks', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.ProductsServices]: { label: 'Products & Services', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Accounts]: { label: 'Accounts', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Investors]: { label: 'Investors', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Customers]: { label: 'Customers', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Partners]: { label: 'Partners', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Marketing]: { label: 'Marketing', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Financials]: { label: 'Financials', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Workspace]: { label: 'Workspace', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Documents]: { label: 'Documents', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Email]: { label: 'Email', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Agents]: { label: 'AI Agents', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Settings]: { label: 'Settings', color: 'text-slate-700', bgColor: 'bg-slate-100' },
  [Tab.Admin]: { label: 'Admin', color: 'text-slate-700', bgColor: 'bg-slate-100' },
};

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
  planType,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const config = getAssistantConfig(currentTab);
  const tabInfo = TAB_DISPLAY_INFO[currentTab] || { label: currentTab, color: 'text-gray-600', bgColor: 'bg-gray-50' };
  
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

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);
  
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
        productsServicesTasks: data.productsServicesTasks?.length || 0,
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
        if (showContextMenu) {
          setShowContextMenu(false);
        } else if (isFullscreen) {
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
  }, [isOpen, isFullscreen, onMinimize, showContextMenu]);
  
  // Modal content component (reused for both normal and fullscreen)
  const modalContent = (
    <div
      ref={modalRef}
      className={`
        ${isAnimating ? 'modal-spring-enter' : ''}
      `}
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
          width: 'min(440px, calc(100vw - 3rem))',
          height: 'min(620px, calc(100vh - 8rem))',
          borderRadius: '24px',
          border: '1px solid rgba(0,0,0,0.1)',
        }),
        zIndex: isFullscreen ? 100000 : 99998,
        backgroundColor: 'white',
        boxShadow: isFullscreen 
          ? 'none' 
          : '0 25px 50px -12px rgba(0, 0, 0, 0.15), 0 12px 24px -8px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        opacity: 1,
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assistant-title"
      tabIndex={-1}
    >
      {/* Enhanced Header */}
      <div className="
        relative
        px-4 py-3
        border-b border-gray-100
        flex items-center justify-between
        bg-gradient-to-r from-slate-800 to-slate-900
        flex-shrink-0
      ">
        {/* Left side - Title and Context */}
        <div className="flex items-center gap-3">
          {/* AI Avatar */}
          <div className="
            w-10 h-10 rounded-xl
            bg-white/20 backdrop-blur-sm
            flex items-center justify-center
            border border-white/30
          ">
            <Bot className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          
          {/* Title and Context Selector */}
          <div className="flex flex-col">
            <h2 id="assistant-title" className="text-white font-semibold text-sm flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              AI Assistant
            </h2>
            
            {/* Context Badge/Dropdown */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowContextMenu(!showContextMenu);
              }}
              className="
                flex items-center gap-1 mt-0.5
                text-xs text-white/90 
                hover:text-white
                transition-colors
              "
            >
              <span className={`
                px-2 py-0.5 rounded-full
                ${tabInfo.bgColor} ${tabInfo.color}
                text-[10px] font-medium
              `}>
                {tabInfo.label}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showContextMenu ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
        
        {/* Right side - Actions */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="
              p-2 rounded-lg
              hover:bg-white/20
              text-white/90 hover:text-white
              transition-all duration-200
            "
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" strokeWidth={2.5} />
            ) : (
              <Maximize2 className="w-4 h-4" strokeWidth={2.5} />
            )}
          </button>
          
          <button
            onClick={isFullscreen ? () => setIsFullscreen(false) : onMinimize}
            className="
              p-2 rounded-lg
              hover:bg-white/20
              text-white/90 hover:text-white
              transition-all duration-200
            "
            aria-label={isFullscreen ? "Exit fullscreen" : "Minimize assistant"}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Minimize (Esc)"}
          >
            <Minus className="w-4 h-4" strokeWidth={2.5} />
          </button>

          {onClose && !isFullscreen && (
            <button
              onClick={onClose}
              className="
                p-2 rounded-lg
                hover:bg-red-500/30
                text-white/90 hover:text-white
                transition-all duration-200
              "
              aria-label="Close assistant"
              title="Close"
            >
              <X className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>

        {/* Context Menu Dropdown */}
        {showContextMenu && (
          <div className="
            absolute top-full left-4 mt-2
            dropdown-modern
            min-w-[180px]
            z-10
          ">
            {Object.entries(TAB_DISPLAY_INFO).map(([tab, info]) => (
              <button
                key={tab}
                onClick={() => {
                  onContextChange(tab as TabType);
                  setShowContextMenu(false);
                }}
                className={`
                  dropdown-modern-item
                  ${currentTab === tab ? 'dropdown-modern-item-active' : ''}
                `}
              >
                <span className={`w-2 h-2 rounded-full ${info.bgColor.replace('50', '500')}`} />
                {info.label}
                {currentTab === tab && (
                  <span className="ml-auto text-gray-500">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Content - ModuleAssistant */}
      <div className="flex-1 overflow-hidden bg-white">
        <ModuleAssistant
          title="AI Assistant"
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
          companyName={companyName}
          crmItems={[...data.investors, ...data.customers, ...data.partners]}
          planType={planType}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Backdrop - Glass morphism effect */}
      {isOpen && (
        <div
          className={`
            fixed inset-0 
            ${isFullscreen ? 'bg-black/50' : 'bg-black/5'} 
            backdrop-blur-[2px]
            backdrop-fade-enter
          `}
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
