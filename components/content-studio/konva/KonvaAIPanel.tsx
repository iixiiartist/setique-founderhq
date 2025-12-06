/**
 * Konva AI Panel
 * AI-powered content generation sidebar for the Content Studio
 * Supports both text generation and layout element generation
 */

import React, { useState, useCallback } from 'react';
import {
  Sparkles,
  X,
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
  Layout,
  Layers,
  AlertCircle,
  Zap,
} from 'lucide-react';
import { useKonvaContext } from './KonvaContext';
import {
  generateContent,
  generateElements,
  ContentType,
  CONTENT_TYPE_LABELS,
  QUICK_PROMPTS,
  LAYOUT_TYPE_LABELS,
  LAYOUT_QUICK_PROMPTS,
  getQuotaInfo,
  StreamingCallbacks,
} from './contentStudioAIService';
import { AiGenerationType, AiSummary } from './aiSchema';
import { KonvaElement } from './types';

// ============================================================================
// Sub-components
// ============================================================================

interface QuickPromptProps {
  prompt: string;
  onClick: (prompt: string) => void;
}

function QuickPrompt({ prompt, onClick }: QuickPromptProps) {
  return (
    <button
      onClick={() => onClick(prompt)}
      className="text-left text-xs px-2 py-1.5 bg-gray-50 hover:bg-gray-200 text-gray-600 hover:text-gray-900 rounded transition-colors truncate"
    >
      {prompt}
    </button>
  );
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

function getLayoutTypeIcon(type: AiGenerationType) {
  switch (type) {
    case 'hero-section':
      return <Layout className="w-4 h-4" />;
    case 'feature-grid':
      return <Layers className="w-4 h-4" />;
    case 'testimonial-card':
      return <MessageSquare className="w-4 h-4" />;
    case 'cta-block':
      return <Target className="w-4 h-4" />;
    case 'stats-row':
      return <Zap className="w-4 h-4" />;
    default:
      return <Layout className="w-4 h-4" />;
  }
}

interface ContentTypeButtonProps {
  type: ContentType;
  isActive: boolean;
  onClick: () => void;
}

function ContentTypeButton({ type, isActive, onClick }: ContentTypeButtonProps) {
  const info = CONTENT_TYPE_LABELS[type];
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
        isActive
          ? 'bg-gray-900 text-white ring-1 ring-gray-700'
          : 'bg-gray-50 text-gray-600 hover:bg-gray-200'
      }`}
      title={info.description}
    >
      {getContentTypeIcon(type)}
      <span className="font-medium">{info.label}</span>
    </button>
  );
}

interface LayoutTypeButtonProps {
  type: AiGenerationType;
  isActive: boolean;
  onClick: () => void;
}

function LayoutTypeButton({ type, isActive, onClick }: LayoutTypeButtonProps) {
  const info = LAYOUT_TYPE_LABELS[type];
  if (!info) return null;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
        isActive
          ? 'bg-gray-900 text-white ring-1 ring-gray-700'
          : 'bg-gray-50 text-gray-600 hover:bg-gray-200'
      }`}
      title={info.description}
    >
      {getLayoutTypeIcon(type)}
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
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          Generated Content
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onCopy}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-4 h-4 text-gray-900" />
            ) : (
              <Copy className="w-4 h-4 text-gray-500" />
            )}
          </button>
          <button
            onClick={onInsertAsText}
            className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
          >
            Insert as Text
          </button>
        </div>
      </div>
      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
        {content}
      </div>
    </div>
  );
}

interface GeneratedElementsProps {
  elements: KonvaElement[];
  summary?: AiSummary;
  onInsert: () => void;
}

function GeneratedElements({ elements, summary, onInsert }: GeneratedElementsProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-700 flex items-center gap-1">
          <Layers className="w-3 h-3" />
          Generated Elements ({elements.length})
        </span>
        <button
          onClick={onInsert}
          className="px-2 py-1 text-xs bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors"
        >
          Insert Elements
        </button>
      </div>
      <div className="text-sm text-gray-700 space-y-1">
        {elements.slice(0, 5).map((el, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="capitalize">{el.type}</span>
            {el.name && <span className="text-gray-400">- {el.name}</span>}
          </div>
        ))}
        {elements.length > 5 && (
          <div className="text-xs text-gray-400">
            +{elements.length - 5} more elements
          </div>
        )}
      </div>
      {summary && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600">
          {summary.warnings.length > 0 && (
            <div className="flex items-center gap-1 text-amber-600">
              <AlertCircle className="w-3 h-3" />
              {summary.warnings.length} warning(s)
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Panel
// ============================================================================

type GenerationMode = 'text' | 'elements';

// Layout types shown in the UI
const LAYOUT_TYPES: AiGenerationType[] = [
  'hero-section',
  'feature-grid',
  'testimonial-card',
  'cta-block',
  'stats-row',
  'custom',
];

export function KonvaAIPanel() {
  const { state, toggleAIPanel, addCustomElement, applyAiPatch } = useKonvaContext();
  
  // Mode: text generation vs element generation
  const [mode, setMode] = useState<GenerationMode>('text');
  
  // Text generation state
  const [selectedType, setSelectedType] = useState<ContentType>('headline');
  const [prompt, setPrompt] = useState('');
  const [context, setContext] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [showQuickPrompts, setShowQuickPrompts] = useState(true);
  
  // Element generation state
  const [selectedLayoutType, setSelectedLayoutType] = useState<AiGenerationType>('hero-section');
  const [generatedElements, setGeneratedElements] = useState<KonvaElement[]>([]);
  const [generationSummary, setGenerationSummary] = useState<AiSummary | undefined>();
  const [progress, setProgress] = useState<{ value: number; message?: string } | null>(null);

  // Get quota info
  const quotaInfo = getQuotaInfo();

  // Text generation handler
  const handleGenerateText = useCallback(async () => {
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

  // Element generation handler
  const handleGenerateElements = useCallback(async () => {
    if (!prompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setGeneratedElements([]);
    setGenerationSummary(undefined);
    setProgress({ value: 0, message: 'Starting generation...' });

    const callbacks: StreamingCallbacks = {
      onPatch: (elements, patchId) => {
        setGeneratedElements(prev => [...prev, ...elements]);
        setProgress({ value: 50, message: `Received ${elements.length} elements...` });
      },
      onProgress: (value, message) => {
        setProgress({ value, message });
      },
      onError: (err) => {
        setError(err);
      },
      onComplete: (summary) => {
        setGenerationSummary(summary);
        setProgress(null);
      },
    };

    try {
      const result = await generateElements({
        type: selectedLayoutType,
        prompt: prompt.trim(),
        context: context.trim() || undefined,
        documentId: state.document?.id,
        options: {
          stream: true,
        },
      }, callbacks);

      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate elements');
    } finally {
      setIsLoading(false);
      setProgress(null);
    }
  }, [prompt, context, selectedLayoutType, state.document?.id]);

  // Handle generation based on mode
  const handleGenerate = useCallback(() => {
    if (mode === 'text') {
      handleGenerateText();
    } else {
      handleGenerateElements();
    }
  }, [mode, handleGenerateText, handleGenerateElements]);

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

    // Clean markdown formatting from content
    const cleanedContent = generatedContent
      .replace(/\*\*([^*]+)\*\*/g, '$1')  // Remove bold **text**
      .replace(/\*([^*]+)\*/g, '$1')       // Remove italic *text*
      .replace(/__([^_]+)__/g, '$1')       // Remove bold __text__
      .replace(/_([^_]+)_/g, '$1')         // Remove italic _text_
      .replace(/^#+\s+/gm, '')             // Remove heading markers
      .replace(/^[-*]\s+/gm, '• ')         // Convert markdown bullets to bullet points
      .replace(/^\d+\.\s+/gm, (m) => m)    // Keep numbered lists
      .trim();

    addCustomElement({
      id: crypto.randomUUID(),
      type: 'text',
      category: 'text',
      name: `AI ${CONTENT_TYPE_LABELS[selectedType].label}`,
      x: centerX,
      y: centerY,
      text: cleanedContent,
      fontSize: 16,
      fontFamily: 'Inter',
      fill: '#1f2937',
      width: 300,
      draggable: true,
      visible: true,
      locked: false,
    } as any);

    toggleAIPanel();
  }, [generatedContent, state.document, state.currentPageIndex, selectedType, addCustomElement, toggleAIPanel]);

  const handleInsertElements = useCallback(() => {
    if (generatedElements.length === 0) return;

    const result = applyAiPatch(generatedElements);
    console.log(`[KonvaAIPanel] Inserted ${result.applied} elements, skipped ${result.skipped}`);
    
    // Clear generated elements after insert
    setGeneratedElements([]);
    setGenerationSummary(undefined);
    toggleAIPanel();
  }, [generatedElements, applyAiPatch, toggleAIPanel]);

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
          <div className="p-1.5 bg-gray-900 rounded-lg">
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

      {/* Mode Toggle */}
      <div className="px-4 py-2 border-b border-gray-100">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setMode('text')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === 'text'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Text
          </button>
          <button
            onClick={() => setMode('elements')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              mode === 'elements'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            Elements
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Type Selection */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
            {mode === 'text' ? 'Content Type' : 'Layout Type'}
          </label>
          <div className="grid grid-cols-2 gap-2">
            {mode === 'text' ? (
              (Object.keys(CONTENT_TYPE_LABELS) as ContentType[]).map((type) => (
                <ContentTypeButton
                  key={type}
                  type={type}
                  isActive={selectedType === type}
                  onClick={() => setSelectedType(type)}
                />
              ))
            ) : (
              LAYOUT_TYPES.map((type) => (
                <LayoutTypeButton
                  key={type}
                  type={type}
                  isActive={selectedLayoutType === type}
                  onClick={() => setSelectedLayoutType(type)}
                />
              ))
            )}
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
              {mode === 'text' ? (
                QUICK_PROMPTS[selectedType].map((qp, i) => (
                  <QuickPrompt key={i} prompt={qp} onClick={handleQuickPrompt} />
                ))
              ) : (
                LAYOUT_QUICK_PROMPTS[selectedLayoutType]?.map((qp, i) => (
                  <QuickPrompt key={i} prompt={qp} onClick={handleQuickPrompt} />
                ))
              )}
            </div>
          </div>
        )}

        {!showQuickPrompts && (
          <button
            onClick={() => setShowQuickPrompts(true)}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900"
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
            placeholder={mode === 'text' 
              ? 'Describe what you want to create...'
              : 'Describe the layout you want to generate...'
            }
            className="w-full h-24 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 resize-none"
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
              className="w-full h-20 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400 resize-none"
            />
          )}
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isLoading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-all bg-gray-900 hover:bg-gray-800"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {progress ? progress.message || 'Generating...' : 'Generating...'}
            </>
          ) : (
            <>
              {mode === 'text' ? <Sparkles className="w-4 h-4" /> : <Layout className="w-4 h-4" />}
              {mode === 'text' ? 'Generate Content' : 'Generate Elements'}
            </>
          )}
        </button>

        {/* Progress Bar */}
        {progress && (
          <div className="space-y-1">
            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gray-700 transition-all duration-300"
                style={{ width: `${progress.value}%` }}
              />
            </div>
            {progress.message && (
              <p className="text-xs text-gray-500">{progress.message}</p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Generated Content (Text Mode) */}
        {mode === 'text' && generatedContent && (
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
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </>
        )}

        {/* Generated Elements (Elements Mode) */}
        {mode === 'elements' && generatedElements.length > 0 && (
          <>
            <GeneratedElements
              elements={generatedElements}
              summary={generationSummary}
              onInsert={handleInsertElements}
            />
            <button
              onClick={handleRegenerate}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </button>
          </>
        )}
      </div>

      {/* Footer with Quota */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-white border rounded text-xs">Enter</kbd>
          </p>
          {quotaInfo && (
            <div className="text-xs text-gray-500">
              {quotaInfo.remaining}/{quotaInfo.limit} remaining
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default KonvaAIPanel;
