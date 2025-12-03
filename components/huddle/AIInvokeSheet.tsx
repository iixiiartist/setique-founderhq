// components/huddle/AIInvokeSheet.tsx
// Side sheet for invoking AI with context picker and streaming response

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Globe, Sparkles, CheckSquare, Users, DollarSign, FileText, ClipboardList, MessageSquare } from 'lucide-react';

// Context item for AI
interface AIContextItem {
  type: string;
  enabled: boolean;
}

interface AIInvokeSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoke: (prompt: string, context: AIContextItem[], useWebSearch: boolean, threadRootId?: string) => void;
  isLoading: boolean;
  streamingResponse?: string;
  roomName?: string;
  threadRootId?: string | null;
}

// Available context sources
const CONTEXT_SOURCES = [
  { id: 'tasks', label: 'Tasks', icon: CheckSquare, description: 'Include recent tasks' },
  { id: 'contacts', label: 'Contacts', icon: Users, description: 'Include CRM contacts' },
  { id: 'deals', label: 'Deals', icon: DollarSign, description: 'Include deal pipeline' },
  { id: 'documents', label: 'Documents', icon: FileText, description: 'Include GTM docs' },
  { id: 'forms', label: 'Forms', icon: ClipboardList, description: 'Include form responses' },
  { id: 'messages', label: 'Recent Messages', icon: MessageSquare, description: 'Include chat history' },
];

export const AIInvokeSheet: React.FC<AIInvokeSheetProps> = ({
  isOpen,
  onClose,
  onInvoke,
  isLoading,
  streamingResponse,
  roomName,
  threadRootId,
}) => {
  const [prompt, setPrompt] = useState('');
  const [selectedContext, setSelectedContext] = useState<AIContextItem[]>([
    { type: 'messages', enabled: true },
  ]);
  const [useWebSearch, setUseWebSearch] = useState(false);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const responseRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // Auto-scroll response
  useEffect(() => {
    if (responseRef.current && streamingResponse) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [streamingResponse]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle close with cleanup
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Manage body scroll when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position to ref (persists across renders)
      scrollPositionRef.current = window.scrollY;
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.width = '100%';
      
      return () => {
        // Restore body scroll
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        // Restore scroll position from ref
        window.scrollTo(0, scrollPositionRef.current);
      };
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, handleClose]);

  // Toggle context source
  const toggleContext = (sourceId: string) => {
    setSelectedContext(prev => {
      const existing = prev.find(c => c.type === sourceId);
      if (existing) {
        return prev.filter(c => c.type !== sourceId);
      }
      return [...prev, { type: sourceId, enabled: true }];
    });
  };

  // Check if context is selected
  const isContextSelected = (sourceId: string) => {
    return selectedContext.some(c => c.type === sourceId);
  };

  // Handle invoke
  const handleInvoke = () => {
    if (!prompt.trim() || isLoading) return;
    onInvoke(prompt, selectedContext, useWebSearch, threadRootId || undefined);
  };

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleInvoke();
    }
  };

  if (!isOpen) return null;

  const sheetContent = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={handleClose}
        aria-hidden="true"
      />
      
      {/* Sheet - full screen on mobile, side panel on desktop */}
      <div 
        ref={sheetRef}
        className="fixed inset-0 sm:inset-auto sm:right-0 sm:top-0 sm:h-full sm:w-[480px] sm:max-w-full bg-white shadow-xl sm:shadow-2xl z-50 flex flex-col animate-slide-in-up sm:animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-invoke-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-gray-200">
          <div>
            <h2 id="ai-invoke-title" className="text-base sm:text-lg font-bold text-gray-900">Ask AI</h2>
            {threadRootId ? (
              <p className="text-xs sm:text-sm text-gray-700">Replying in thread</p>
            ) : roomName && (
              <p className="text-xs sm:text-sm text-gray-500">in #{roomName}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          {/* Prompt input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What would you like to know?
            </label>
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your workspace data, get summaries, or request analysis..."
              rows={3}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 sm:px-4 sm:py-3 text-sm sm:text-base focus:border-gray-400 focus:outline-none resize-none"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-400 hidden sm:block">
              Press Ctrl+Enter to send
            </p>
          </div>

          {/* Context picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Include context from:
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
              {CONTEXT_SOURCES.map(source => {
                const IconComponent = source.icon;
                return (
                <button
                  key={source.id}
                  onClick={() => toggleContext(source.id)}
                  disabled={isLoading}
                  className={`flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl border-2 transition-all text-left min-h-[52px] ${
                    isContextSelected(source.id)
                      ? 'border-gray-400 bg-gray-100'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  } disabled:opacity-50`}
                >
                  <IconComponent size={16} className="text-gray-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-medium text-gray-900">
                      {source.label}
                    </div>
                    <div className="text-xs text-gray-500 truncate hidden sm:block">
                      {source.description}
                    </div>
                  </div>
                  {isContextSelected(source.id) && (
                    <Check size={14} className="text-gray-700 flex-shrink-0 sm:w-4 sm:h-4" />
                  )}
                </button>
              )})}
            </div>
          </div>

          {/* Web search toggle */}
          <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-2 sm:gap-3">
              <Globe size={20} className="text-gray-500 sm:w-6 sm:h-6" />
              <div>
                <div className="text-xs sm:text-sm font-medium text-gray-900">
                  Web Search
                </div>
                <div className="text-xs text-gray-500 hidden sm:block">
                  Search the web for additional context
                </div>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={useWebSearch}
                onChange={(e) => setUseWebSearch(e.target.checked)}
                disabled={isLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
            </label>
          </div>

          {/* Streaming response */}
          {streamingResponse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AI Response:
              </label>
              <div
                ref={responseRef}
                className="p-3 sm:p-4 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl border border-gray-300 max-h-[200px] sm:max-h-[300px] overflow-y-auto"
              >
                <div className="prose prose-sm max-w-none text-gray-800 text-sm leading-relaxed">
                  {streamingResponse.split('\n').map((line, i) => {
                    // Handle numbered list items
                    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
                    if (numberedMatch) {
                      return (
                        <div key={i} className="flex gap-2 mb-2">
                          <span className="flex-shrink-0 w-5 h-5 bg-gray-300 text-gray-700 rounded text-xs font-bold flex items-center justify-center">
                            {numberedMatch[1]}
                          </span>
                          <span className="flex-1">{numberedMatch[2]}</span>
                        </div>
                      );
                    }
                    // Handle headers
                    if (line.startsWith('## ')) {
                      return <h3 key={i} className="font-bold text-gray-900 mt-3 mb-1">{line.slice(3)}</h3>;
                    }
                    if (line.startsWith('# ')) {
                      return <h2 key={i} className="font-bold text-gray-900 mt-3 mb-1 text-base">{line.slice(2)}</h2>;
                    }
                    // Handle URLs
                    if (line.includes('http')) {
                      const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
                      if (urlMatch) {
                        const parts = line.split(urlMatch[0]);
                        return (
                          <p key={i} className="mb-1">
                            {parts[0]}
                            <a href={urlMatch[0]} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-gray-900 underline break-all">
                              {urlMatch[0]}
                            </a>
                            {parts[1]}
                          </p>
                        );
                      }
                    }
                    // Handle Source: lines
                    if (line.trim().startsWith('Source:')) {
                      return (
                        <p key={i} className="text-xs text-gray-700 mb-2">{line}</p>
                      );
                    }
                    // Regular lines
                    if (line.trim()) {
                      return <p key={i} className="mb-1">{line}</p>;
                    }
                    return <br key={i} />;
                  })}
                  {isLoading && (
                    <span className="inline-block w-2 h-4 bg-gray-1000 animate-pulse ml-0.5" />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Quick prompts */}
          {!streamingResponse && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick prompts:
              </label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {[
                  'Summarize recent activity',
                  'What tasks are overdue?',
                  'Show deal pipeline status',
                  'Draft a follow-up email',
                  'Analyze form responses',
                ].map((quickPrompt) => (
                  <button
                    key={quickPrompt}
                    onClick={() => setPrompt(quickPrompt)}
                    disabled={isLoading}
                    className="px-2.5 py-1.5 sm:px-3 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 min-h-[36px]"
                  >
                    {quickPrompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-t-2 border-gray-200 bg-gray-50">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-3 sm:px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors min-h-[44px] text-sm sm:text-base"
            >
              Cancel
            </button>
            <button
              onClick={handleInvoke}
              disabled={!prompt.trim() || isLoading}
              className="flex-1 px-3 sm:px-4 py-2.5 bg-black text-white rounded-xl hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 min-h-[44px] text-sm sm:text-base"
            >
              {isLoading ? (
                <>
                  <span className="relative w-4 h-4 inline-block"><span className="absolute inset-0 border-2 border-white animate-spin" style={{ animationDuration: '1.2s' }} /><span className="absolute inset-0.5 border border-white/40 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} /></span>
                  <span className="hidden sm:inline">Processing...</span>
                  <span className="sm:hidden">...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} className="sm:w-[18px] sm:h-[18px]" />
                  Ask AI
                </>
              )}
            </button>
          </div>
          
          <p className="mt-2 sm:mt-3 text-xs text-center text-gray-400">
            AI responses will be posted to the channel
          </p>
          
          {/* Active context indicator */}
          {(selectedContext.filter(c => c.enabled).length > 0 || useWebSearch) && (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
              <span className="text-xs text-gray-400">Using:</span>
              {selectedContext.filter(c => c.enabled).map(ctx => {
                const source = CONTEXT_SOURCES.find(s => s.id === ctx.type);
                if (!source) return null;
                const IconComponent = source.icon;
                return (
                  <span key={ctx.type} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-200 text-gray-700 rounded-full text-xs">
                    <IconComponent size={10} />
                    {source.label}
                  </span>
                );
              })}
              {useWebSearch && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  <Globe size={10} />
                  Web
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Animation styles */}
      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes slide-in-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
        .animate-slide-in-up {
          animation: slide-in-up 0.2s ease-out;
        }
        @media (min-width: 640px) {
          .sm\\:animate-slide-in-right {
            animation: slide-in-right 0.2s ease-out;
          }
        }
      `}</style>
    </>
  );

  // Use portal to render at document root level
  return createPortal(sheetContent, document.body);
};

export default AIInvokeSheet;
