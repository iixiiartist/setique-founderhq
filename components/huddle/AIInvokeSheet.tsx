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
      
      {/* Sheet */}
      <div 
        ref={sheetRef}
        className="fixed right-0 top-0 h-full w-[480px] max-w-full bg-white shadow-2xl z-50 flex flex-col animate-slide-in-right"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-invoke-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200">
          <div>
            <h2 id="ai-invoke-title" className="text-lg font-bold text-gray-900">Ask AI</h2>
            {threadRootId ? (
              <p className="text-sm text-purple-600">Replying in thread</p>
            ) : roomName && (
              <p className="text-sm text-gray-500">in #{roomName}</p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
              rows={4}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:border-purple-400 focus:outline-none resize-none"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-gray-400">
              Press Ctrl+Enter to send
            </p>
          </div>

          {/* Context picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Include context from:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CONTEXT_SOURCES.map(source => {
                const IconComponent = source.icon;
                return (
                <button
                  key={source.id}
                  onClick={() => toggleContext(source.id)}
                  disabled={isLoading}
                  className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left ${
                    isContextSelected(source.id)
                      ? 'border-purple-400 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  } disabled:opacity-50`}
                >
                  <IconComponent size={16} className="text-gray-500" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900">
                      {source.label}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {source.description}
                    </div>
                  </div>
                  {isContextSelected(source.id) && (
                    <Check size={16} className="text-purple-600" />
                  )}
                </button>
              )})}
            </div>
          </div>

          {/* Web search toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <div className="flex items-center gap-3">
              <Globe size={24} className="text-gray-500" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Web Search
                </div>
                <div className="text-xs text-gray-500">
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
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
                className="p-4 bg-purple-50 rounded-xl border-2 border-purple-100 max-h-[300px] overflow-y-auto"
              >
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
                    {streamingResponse}
                    {isLoading && (
                      <span className="inline-block w-2 h-4 bg-purple-500 animate-pulse ml-0.5" />
                    )}
                  </pre>
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
              <div className="flex flex-wrap gap-2">
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
                    className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
                  >
                    {quickPrompt}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="flex-1 px-4 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInvoke}
              disabled={!prompt.trim() || isLoading}
              className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  Ask AI
                </>
              )}
            </button>
          </div>
          
          <p className="mt-3 text-xs text-center text-gray-400">
            AI responses will be posted to the channel
          </p>
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
        .animate-slide-in-right {
          animation: slide-in-right 0.2s ease-out;
        }
      `}</style>
    </>
  );

  // Use portal to render at document root level
  return createPortal(sheetContent, document.body);
};

export default AIInvokeSheet;
