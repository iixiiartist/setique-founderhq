import React, { useEffect, useRef, useState } from 'react';
import { Minus, X } from 'lucide-react';
import { TabType } from '../../constants';
import { AppActions } from '../../types';
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
  teamContext: string;
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
  teamContext,
  onNewMessage,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const config = getAssistantConfig(currentTab);
  
  // Trigger animation state
  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);
  
  // Get system prompt for current context
  const systemPrompt = config?.getSystemPrompt({
    companyName,
    businessContext,
    teamContext,
  }) || '';
  
  // Handle Escape key to minimize
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onMinimize();
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
  }, [isOpen, onMinimize]);
  
  if (!config) {
    return null;
  }
  
  return (
    <>
      {/* Backdrop - subtle for better UX */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/10 z-[998] backdrop-fade-enter"
          onClick={onMinimize}
          aria-hidden="true"
        />
      )}
      
      {/* Modal */}
      <div
        ref={modalRef}
        className={`
          fixed z-[999]
          bg-white border-3 border-black
          shadow-neo-xl
          focus:outline-none
          gpu-accelerate
          
          /* Desktop positioning and size */
          bottom-24 right-6
          w-[min(450px,calc(100vw-3rem))] 
          h-[min(650px,calc(100vh-8rem))]
          
          /* Mobile full-screen */
          max-md:!bottom-0 max-md:!right-0 
          max-md:!w-full max-md:!h-full
          max-md:!rounded-none
          
          ${isOpen ? 'modal-spring-enter' : 'modal-spring-exit'}
          
          ${isOpen 
            ? 'opacity-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 translate-y-8 pointer-events-none'
          }
        `}
        style={{
          willChange: isAnimating ? 'transform, opacity' : 'auto'
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
          bg-gradient-to-r from-blue-50 to-purple-50
          flex-shrink-0
        ">
          <AssistantContextSwitcher 
            currentTab={currentTab}
            onChange={onContextChange}
          />
          
          <div className="flex items-center gap-2">
            <button
              onClick={onMinimize}
              className="
                p-2 rounded
                hover:bg-gray-100 
                border-2 border-black
                transition-colors
              "
              aria-label="Minimize assistant"
              title="Minimize (Esc)"
            >
              <Minus className="w-4 h-4" strokeWidth={3} />
            </button>
            
            {onClose && (
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
            allowFullscreen={true}
            autoFullscreenMobile={false}
            businessContext={businessContext}
            teamContext={teamContext}
          />
        </div>
      </div>
    </>
  );
};
