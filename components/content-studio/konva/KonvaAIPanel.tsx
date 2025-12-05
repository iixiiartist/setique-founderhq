/**
 * Konva AI Panel
 * AI-powered content generation sidebar for the Content Studio
 */

import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Type,
  FileText,
  Target,
  MessageSquare,
  Search,
  List,
} from 'lucide-react';
import { useKonvaContext } from './KonvaContext';
import {
  generateContent,
  ContentType,
  CONTENT_TYPE_LABELS,
  QUICK_PROMPTS,
} from './contentStudioAIService';

interface QuickPromptProps {
  prompt: string;
  onClick: (prompt: string) => void;
}

function QuickPrompt({ prompt, onClick }: QuickPromptProps) {
  return (
    <button
      onClick={() => onClick(prompt)}
      className="text-left text-xs px-2 py-1.5 bg-gray-50 hover:bg-indigo-50 text-gray-600 hover:text-indigo-600 rounded transition-colors truncate"
    >
      {prompt}
    </button>
  );
}

interface ContentTypeButtonProps {
  type: ContentType;
  isActive: boolean;
  onClick: () => void;
}

function getContentTypeIcon(type: ContentType) {
  switch (type) {
    case 'headline':
      return <Type className="w-4 h-4" />;
    case 'bullets':
      return <List className="w-4 h-4" />;
    case 'testimonial':
      return <MessageSquare className="w-4 h-4" />;
    case 'cta':
      return <Target className="w-4 h-4" />;
    case 'body':
      return <FileText className="w-4 h-4" />;
    case 'research':
      return <Search className="w-4 h-4" />;
    default:
      return <Sparkles className="w-4 h-4" />;
  }
}

function ContentTypeButton({ type, isActive, onClick }: ContentTypeButtonProps) {
  const info = CONTENT_TYPE_LABELS[type];
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
        isActive
          ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-300'
          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
      }`}
      title={info.description}
    >
      {getContentTypeIcon(type)}
      <span className="font-medium">{info.label}</span>
    </button>
  );
}

interface GeneratedContentProps {
  content: string;
  onCopy: () => void;
  onInsertAsText: () => void;
  copied: boolean;
}

function GeneratedContent({ content, onCopy, onInsertAsText, copied }: GeneratedContentProps) {
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-indigo-600 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Generated Content
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onCopy}
            className="p-1.5 hover:bg-white/50 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500" />
            )}
          </button>
          <button
            onClick={onInsertAsText}
            className="px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            Insert as Text
          </button>
        </div>
      </div>
      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  );
}

export function KonvaAIPanel() {
  const { state, toggleAIPanel, addCustomElement } = useKonvaContext();
  const [selectedType, setSelectedType] = useState<ContentType>('headline');
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setGeneratedContent(null);

    try {
      const response = await generateContent({
        type: selectedType,
        prompt: prompt.trim(),
        context: context.trim() || undefined,
      });
      setGeneratedContent(response.content);
    } catch (err: any) {
      setError(err.message || 'Failed to generate content');
    } finally {
      setIsLoading(false);
    }
  }, [prompt, context, selectedType]);

  const handleQuickPrompt = useCallback((quickPrompt: string) => {
    setPrompt(quickPrompt);
    setShowQuickPrompts(false);
  }, []);

  const handleCopy = useCallback(() => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedContent]);

  const handleInsertAsText = useCallback(() => {
    if (!generatedContent || !state.document) return;

    const currentPage = state.document.pages[state.currentPageIndex];
    const centerX = currentPage.canvas.width / 2 - 150;
    const centerY = currentPage.canvas.height / 2 - 50;

    addCustomElement({
      id: crypto.randomUUID(),
      type: 'text',
      category: 'text',
      name: `AI ${CONTENT_TYPE_LABELS[selectedType].label}`,
      x: centerX,
      y: centerY,
      text: generatedContent,
      fontSize: 16,
      fontFamily: 'Inter',
      fill: '#1f2937',
      width: 300,
      draggable: true,
      visible: true,
      locked: false,
    } as any);

    // Close panel after inserting
    toggleAIPanel();
  }, [generatedContent, state.document, state.currentPageIndex, selectedType, addCustomElement, toggleAIPanel]);

  const handleRegenerate = useCallback(() => {
    if (prompt.trim()) {
      handleGenerate();
    }
  }, [prompt, handleGenerate]);

  if (!state.isAIPanelOpen) return null;

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-gray-800">AI Assistant</span>
        </div>
        <button
          onClick={toggleAIPanel}
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Content Type Selection */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            Content Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((type) => (
              <ContentTypeButton
                key={type}
                type={type}
                isActive={selectedType === type}
                onClick={() => setSelectedType(type)}
              />
            ))}
          </div>
        </div>

        {/* Quick Prompts */}
        {showQuickPrompts && (
          <div>
            <button
              onClick={() => setShowQuickPrompts(false)}
              className="flex items-center justify-between w-full text-xs font-medium text-gray-500 uppercase tracking-wide mb-2"
            >
              <span>Quick Prompts</span>
              <ChevronUp className="w-3 h-3" />
            </button>
            <div className="flex flex-col gap-1">
              {QUICK_PROMPTS[selectedType].map((qp, i) => (
                <QuickPrompt key={i} prompt={qp} onClick={handleQuickPrompt} />
              ))}
            </div>
          </div>
        )}

        {!showQuickPrompts && (
          <button
            onClick={() => setShowQuickPrompts(true)}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700"
          >
            <ChevronDown className="w-3 h-3" />
            Show quick prompts
          </button>
        )}

        {/* Prompt Input */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            Your Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe what you want to create...`}
            className="w-full h-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                handleGenerate();
              }
            }}
          />
        </div>

        {/* Context (collapsible) */}
        <div>
          <button
            onClick={() => setShowContext(!showContext)}
            className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase tracking-wide mb-2"
          >
            {showContext ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            Add Context (Optional)
          </button>
          {showContext && (
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="Add any relevant context about your business, audience, or brand..."
              className="w-full h-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
            />
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate Content
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Generated Content */}
        {generatedContent && (
          <>
            <GeneratedContent
              content={generatedContent}
              onCopy={handleCopy}
              onInsertAsText={handleInsertAsText}
              copied={copied}
            />
            <button
              onClick={handleRegenerate}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Enter</kbd> to generate
        </p>
      </div>
    </div>
  );
}

export default KonvaAIPanel;
