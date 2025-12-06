// components/docs/EnhancedResearchCopilot.tsx
// Enhanced Research Copilot with synthesis, quality scoring, and structured insights
// Uses the new research-copilot edge function for superior results

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
    AlertTriangle,
    BookmarkPlus,
    Check,
    ChevronDown,
    ChevronUp,
    Copy,
    ExternalLink,
    FileText,
    Globe,
    Lightbulb,
    Link as LinkIcon,
    Maximize2,
    Minimize2,
    RefreshCw,
    Rocket,
    Send,
    Sparkles,
    Star,
    Target,
    TrendingUp,
    X,
    Zap,
} from 'lucide-react';
import {
    useResearchCopilot,
    type ResearchMode,
    type ResearchDocContext,
    getQualityStars,
    getInsightIcon,
    getSourceTypeIcon,
} from '../../hooks/useResearchCopilot';
import type { ResearchSource, ResearchInsight } from '../../src/lib/services/researchCopilotService';
import { useYouAgent } from '../../hooks/useYouAgent';
import { useCopyToClipboard } from '../../hooks';
import { telemetry } from '../../lib/services/telemetry';

// ============================================================================
// Types
// ============================================================================

interface EnhancedResearchCopilotProps {
    isOpen: boolean;
    onClose: () => void;
    editor: Editor | null;
    docTitle: string;
    docTypeLabel: string;
    workspaceName?: string | null;
    tags: string[];
    workspaceId: string;
    docId?: string;
}

type CopilotTab = 'research' | 'writer';

type AIWriterGoal = 'freeform' | 'section' | 'summary' | 'bullets' | 'analysis';

// ============================================================================
// Constants
// ============================================================================

const researchModes: Array<{ id: ResearchMode; label: string; icon: React.ReactNode; helper: string }> = [
    { id: 'quick', label: 'Quick', icon: <Zap size={14} />, helper: 'Fast web search' },
    { id: 'deep', label: 'Deep Dive', icon: <Sparkles size={14} />, helper: 'Comprehensive analysis' },
    { id: 'market', label: 'Market', icon: <TrendingUp size={14} />, helper: 'Market intelligence' },
    { id: 'competitive', label: 'Competitive', icon: <Target size={14} />, helper: 'Competitive analysis' },
];

const aiWriterGoals: Array<{ id: AIWriterGoal; label: string; icon: React.ReactNode; placeholder: string }> = [
    { id: 'freeform', label: 'Write anything', icon: <FileText size={14} />, placeholder: 'e.g. Write a product overview for our AI platform...' },
    { id: 'section', label: 'Add section', icon: <FileText size={14} />, placeholder: 'e.g. Write a competitive analysis section...' },
    { id: 'summary', label: 'Summarize', icon: <Sparkles size={14} />, placeholder: 'e.g. Summarize the key market trends for 2025...' },
    { id: 'bullets', label: 'Key points', icon: <Target size={14} />, placeholder: 'e.g. List 5 key benefits of our solution...' },
    { id: 'analysis', label: 'Deep analysis', icon: <Lightbulb size={14} />, placeholder: 'e.g. Analyze the competitive landscape for fintech...' },
];

const INSIGHT_TYPE_LABELS: Record<ResearchInsight['type'], string> = {
    key_finding: 'Key Finding',
    statistic: 'Statistic',
    trend: 'Trend',
    opportunity: 'Opportunity',
    risk: 'Risk',
    action: 'Action Item',
};

// ============================================================================
// Helpers
// ============================================================================

const escapeHtml = (text: string) =>
    text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const truncateText = (value: string, length = 220) => {
    if (!value) return '';
    return value.length > length ? `${value.slice(0, length)}…` : value;
};

const normalizeUrl = (value?: string) => {
    if (!value) return '';
    try {
        const url = new URL(value);
        return url.toString();
    } catch {
        try {
            const url = new URL(`https://${value}`);
            return url.toString();
        } catch {
            return value;
        }
    }
};

const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
};

const getConfidenceColor = (confidence: 'high' | 'medium' | 'low'): string => {
    switch (confidence) {
        case 'high': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        case 'medium': return 'text-amber-600 bg-amber-50 border-amber-200';
        case 'low': return 'text-gray-500 bg-gray-50 border-gray-200';
    }
};

// ============================================================================
// Star Rating Component
// ============================================================================

const QualityStars: React.FC<{ quality: number }> = ({ quality }) => {
    const stars = getQualityStars(quality);
    return (
        <span className="inline-flex items-center gap-0.5">
            {[1, 2, 3].map((n) => (
                <Star
                    key={n}
                    size={12}
                    className={n <= stars ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
                />
            ))}
        </span>
    );
};

// ============================================================================
// Insight Card Component
// ============================================================================

const InsightCard: React.FC<{
    insight: ResearchInsight;
    sources: ResearchSource[];
    onInsert: (content: string, url?: string, title?: string) => void;
}> = ({ insight, sources, onInsert }) => {
    const icon = getInsightIcon(insight.type);
    const label = INSIGHT_TYPE_LABELS[insight.type];
    const confidenceClass = getConfidenceColor(insight.confidence);

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{icon}</span>
                    <span className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full border ${confidenceClass}`}>
                        {label}
                    </span>
                </div>
                <button
                    onClick={() => onInsert(insight.content, undefined, insight.title)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                    title="Insert to document"
                >
                    <BookmarkPlus size={14} />
                </button>
            </div>
            <h4 className="mt-2 font-semibold text-gray-900 text-sm">{insight.title}</h4>
            <p className="mt-1 text-gray-600 text-sm leading-relaxed">{insight.content}</p>
            {insight.sources.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {insight.sources.map((sourceIdx) => {
                        const source = sources[sourceIdx];
                        if (!source) return null;
                        return (
                            <a
                                key={sourceIdx}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-gray-500 hover:text-gray-700 underline"
                                title={source.title}
                            >
                                [{sourceIdx + 1}]
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// Source Card Component
// ============================================================================

const SourceCard: React.FC<{
    source: ResearchSource;
    index: number;
    onInsert: (content: string, url?: string, title?: string) => void;
}> = ({ source, index, onInsert }) => {
    const [expanded, setExpanded] = useState(false);
    const typeIcon = getSourceTypeIcon(source.type);

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono text-gray-500">
                            [{index + 1}]
                        </span>
                        <span className="text-sm">{typeIcon}</span>
                        <QualityStars quality={source.quality} />
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                            source.freshness === 'recent' ? 'bg-green-100 text-green-700' :
                            source.freshness === 'moderate' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                        }`}>
                            {source.freshness}
                        </span>
                    </div>
                    <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-gray-900 hover:text-blue-600 text-sm flex items-center gap-1"
                    >
                        {truncateText(source.title, 60)}
                        <ExternalLink size={12} />
                    </a>
                    <p className="text-xs text-gray-500 mt-0.5">{source.domain}</p>
                </div>
            </div>
            
            {source.snippet && (
                <div className="mt-2">
                    <p className={`text-sm text-gray-600 ${expanded ? '' : 'line-clamp-2'}`}>
                        {source.snippet}
                    </p>
                    {source.snippet.length > 150 && (
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="mt-1 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                        >
                            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {expanded ? 'Show less' : 'Show more'}
                        </button>
                    )}
                </div>
            )}
            
            <div className="mt-2 flex gap-2">
                <button
                    onClick={() => onInsert(source.snippet || source.title, source.url, source.title)}
                    className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100"
                >
                    <LinkIcon size={12} /> Cite
                </button>
                <button
                    onClick={() => onInsert(source.snippet || source.title, source.url, source.title)}
                    className="text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-gray-100"
                >
                    <BookmarkPlus size={12} /> Insert
                </button>
            </div>
        </div>
    );
};

// ============================================================================
// Key Stats Component
// ============================================================================

const KeyStats: React.FC<{
    stats: Array<{ label: string; value: string; source?: number }>;
    sources: ResearchSource[];
    onInsert: (content: string) => void;
}> = ({ stats, sources, onInsert }) => {
    if (stats.length === 0) return null;

    return (
        <div className="grid grid-cols-2 gap-2">
            {stats.map((stat, idx) => (
                <div
                    key={idx}
                    className="rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white p-3 text-center cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => onInsert(`**${stat.label}**: ${stat.value}`)}
                >
                    <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
                    {typeof stat.source === 'number' && sources[stat.source] && (
                        <p className="text-[10px] text-gray-400 mt-1">
                            Source: [{stat.source + 1}]
                        </p>
                    )}
                </div>
            ))}
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export const EnhancedResearchCopilot: React.FC<EnhancedResearchCopilotProps> = ({
    isOpen,
    onClose,
    editor,
    docTitle,
    docTypeLabel,
    workspaceName,
    tags,
    workspaceId,
    docId,
}) => {
    // Tab state
    const [activeTab, setActiveTab] = useState<CopilotTab>('research');
    const [isFullscreen, setIsFullscreen] = useState(false);
    
    // Research state
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<ResearchMode>('quick');
    const [showRaw, setShowRaw] = useState(false);
    
    // AI Writer state
    const [writerPrompt, setWriterPrompt] = useState('');
    const [writerGoal, setWriterGoal] = useState<AIWriterGoal>('freeform');
    const [writerOutput, setWriterOutput] = useState<string | null>(null);
    
    // Hooks
    const { isCopied, copy } = useCopyToClipboard();
    const {
        run: runAgent,
        loading: agentLoading,
        error: agentError,
        streamingOutput,
        isStreaming,
        reset: resetAgent,
    } = useYouAgent('research_briefing');
    
    // Research hook with document context
    const docContext: ResearchDocContext = useMemo(() => ({
        title: docTitle,
        type: docTypeLabel,
        workspace: workspaceName ?? undefined,
        tags,
    }), [docTitle, docTypeLabel, workspaceName, tags]);
    
    const {
        loading,
        error,
        errorCode,
        response,
        synthesis,
        sources,
        rawAnswer,
        metadata,
        research,
        reset: resetResearch,
        setDocContext,
    } = useResearchCopilot(docContext);

    // Update doc context when it changes
    useEffect(() => {
        setDocContext(docContext);
    }, [docContext, setDocContext]);

    // Reset fullscreen on close
    useEffect(() => {
        if (!isOpen) setIsFullscreen(false);
    }, [isOpen]);

    // Quick prompts
    const quickPrompts = useMemo(() => [
        `Latest market trends for ${docTitle || 'this product'}`,
        `Competitive landscape in ${tags[0] || 'our market'}`,
        `Key statistics for ${workspaceName || 'our industry'} ${new Date().getFullYear()}`,
        'Top 5 industry benchmarks to cite',
    ], [docTitle, workspaceName, tags]);

    const writerQuickPrompts = useMemo(() => [
        `Write a compelling overview for ${docTitle || 'this document'}`,
        `Create a competitive analysis section`,
        `Draft key benefits and value propositions`,
        `List 5 action items from this research`,
    ], [docTitle]);

    // Handlers
    const handleSearch = useCallback(async (customQuery?: string, customMode?: ResearchMode) => {
        const searchQuery = (customQuery ?? query).trim();
        const searchMode = customMode ?? mode;
        
        if (!searchQuery) return;

        telemetry.track('enhanced_research_search', {
            workspaceId,
            docId,
            metadata: { query: searchQuery, mode: searchMode },
        });

        await research(searchQuery, searchMode);
    }, [query, mode, research, workspaceId, docId]);

    const handleInsertContent = useCallback((content: string, url?: string, title?: string) => {
        if (!editor || !content) return;

        const safeContent = escapeHtml(content).replace(/\n/g, '<br />');
        let html = `<p>${safeContent}</p>`;
        
        if (url) {
            const safeUrl = escapeHtml(normalizeUrl(url));
            const safeTitle = escapeHtml(title || url);
            html += `<p><em>Source: <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeTitle}</a></em></p>`;
        }

        editor.chain().focus().insertContent(html).run();

        telemetry.track('enhanced_research_insert', {
            workspaceId,
            docId,
            metadata: { hasUrl: Boolean(url) },
        });
    }, [editor, workspaceId, docId]);

    const handleInsertSynthesis = useCallback(() => {
        if (!editor || !synthesis) return;

        const parts: string[] = [];
        
        // Add summary
        if (synthesis.summary) {
            parts.push(`<h3>Research Summary</h3><p>${escapeHtml(synthesis.summary)}</p>`);
        }

        // Add key stats
        if (synthesis.keyStats.length > 0) {
            parts.push('<h4>Key Statistics</h4><ul>');
            synthesis.keyStats.forEach(stat => {
                parts.push(`<li><strong>${escapeHtml(stat.label)}:</strong> ${escapeHtml(stat.value)}</li>`);
            });
            parts.push('</ul>');
        }

        // Add insights
        if (synthesis.insights.length > 0) {
            parts.push('<h4>Key Insights</h4><ul>');
            synthesis.insights.forEach(insight => {
                parts.push(`<li><strong>${escapeHtml(insight.title)}:</strong> ${escapeHtml(insight.content)}</li>`);
            });
            parts.push('</ul>');
        }

        editor.chain().focus().insertContent(parts.join('')).run();

        telemetry.track('enhanced_research_insert_synthesis', {
            workspaceId,
            docId,
        });
    }, [editor, synthesis, workspaceId, docId]);

    const handleWriterGenerate = useCallback(async () => {
        if (!writerPrompt.trim()) return;

        const context = `Document: "${docTitle || 'Untitled'}" (${docTypeLabel})${workspaceName ? ` for ${workspaceName}` : ''}`;
        const goalMap: Record<AIWriterGoal, string> = {
            freeform: `${context}\n\nRequest: ${writerPrompt}\n\nProvide well-structured content with clear formatting.`,
            section: `Write a well-structured section for a GTM document. ${context}\n\nRequest: ${writerPrompt}`,
            summary: `Provide a concise, executive-level summary. ${context}\n\nRequest: ${writerPrompt}`,
            bullets: `Create a list of key points. ${context}\n\nRequest: ${writerPrompt}`,
            analysis: `Provide an in-depth analysis. ${context}\n\nRequest: ${writerPrompt}`,
        };

        telemetry.track('enhanced_research_writer', {
            workspaceId,
            docId,
            metadata: { goal: writerGoal },
        });

        try {
            const response = await runAgent(goalMap[writerGoal], {
                founderhq_context: { goal: writerGoal, docTitle, docType: docTypeLabel, workspaceName, tags },
            });
            if (response?.output) {
                setWriterOutput(response.output);
            }
        } catch (err) {
            console.error('[EnhancedResearchCopilot] Writer error:', err);
        }
    }, [writerPrompt, writerGoal, docTitle, docTypeLabel, workspaceName, tags, runAgent, workspaceId, docId]);

    const handleInsertWriterOutput = useCallback(() => {
        if (!editor) return;
        const content = writerOutput || streamingOutput;
        if (!content) return;

        // Convert markdown to basic HTML
        let html = content
            .replace(/^### (.+)$/gm, '<h4>$1</h4>')
            .replace(/^## (.+)$/gm, '<h3>$1</h3>')
            .replace(/^# (.+)$/gm, '<h2>$1</h2>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/^- (.+)$/gm, '<li>$1</li>')
            .replace(/\n/g, '<br />');

        editor.chain().focus().insertContent(html).run();
    }, [editor, writerOutput, streamingOutput]);

    const horizontalPadding = isFullscreen ? 'px-8' : 'px-5';
    const hasWriterContent = Boolean(writerOutput || streamingOutput);

    return (
        <div className={`fixed inset-0 z-40 ${isOpen ? '' : 'pointer-events-none'}`}>
            {isOpen && !isFullscreen && <div className="absolute inset-0 bg-black/20" onClick={onClose} aria-hidden />}
            <div className={`absolute inset-y-0 right-0 flex w-full ${isFullscreen ? 'justify-center px-4 sm:px-6 lg:px-12' : 'justify-end'}`}>
                <aside
                    className={`relative h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
                        isFullscreen ? 'w-full max-w-6xl rounded-3xl border border-gray-200' : 'w-full max-w-3xl border-l border-gray-200'
                    } ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    {/* Header */}
                    <div className={`border-b border-gray-100 ${horizontalPadding} py-4`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-0.5">
                                        <button
                                            onClick={() => setActiveTab('research')}
                                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                                activeTab === 'research' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            <Globe size={14} />
                                            Research
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('writer')}
                                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                                activeTab === 'writer' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            <Sparkles size={14} />
                                            AI Writer
                                        </button>
                                    </div>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{docTitle || 'Untitled Doc'}</h3>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                    <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5">📄 {docTypeLabel}</span>
                                    {workspaceName && (
                                        <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5">🏢 {workspaceName}</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {activeTab === 'research' && synthesis && (
                                    <button
                                        onClick={handleInsertSynthesis}
                                        className="inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-black"
                                    >
                                        <Send size={14} /> Insert Summary
                                    </button>
                                )}
                                {activeTab === 'writer' && hasWriterContent && (
                                    <button
                                        onClick={handleInsertWriterOutput}
                                        className="inline-flex items-center gap-2 rounded-full bg-gray-900 text-white px-3 py-1.5 text-xs font-semibold hover:bg-black"
                                    >
                                        <Send size={14} /> Insert to Doc
                                    </button>
                                )}
                                <button onClick={() => setIsFullscreen(!isFullscreen)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
                                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>
                                <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Research Tab */}
                    {activeTab === 'research' && (
                        <>
                            {/* Search Controls */}
                            <div className={`border-b border-gray-100 ${horizontalPadding} py-4 space-y-3`}>
                                {/* Mode Selector */}
                                <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1">
                                    {researchModes.map((option) => (
                                        <button
                                            key={option.id}
                                            onClick={() => setMode(option.id)}
                                            className={`flex-1 rounded-xl px-3 py-2 text-left text-xs font-semibold transition ${
                                                mode === option.id ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500'
                                            }`}
                                        >
                                            <div className="flex items-center gap-1 text-sm">
                                                {option.icon}
                                                <span>{option.label}</span>
                                            </div>
                                            <p className="text-[11px] text-gray-400">{option.helper}</p>
                                        </button>
                                    ))}
                                </div>

                                {/* Search Input */}
                                <form
                                    onSubmit={(e) => { e.preventDefault(); handleSearch(); }}
                                    className="rounded-2xl border border-gray-200 bg-white p-3 shadow-inner"
                                >
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400">Research Query</label>
                                    <div className="mt-2 flex items-center gap-2">
                                        <input
                                            type="text"
                                            value={query}
                                            onChange={(e) => setQuery(e.target.value)}
                                            placeholder="e.g. What are the latest AI pricing benchmarks?"
                                            className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                                        />
                                        <button
                                            type="submit"
                                            disabled={loading || !query.trim()}
                                            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {loading ? (
                                                <span className="animate-spin">⏳</span>
                                            ) : (
                                                <>
                                                    <Sparkles size={14} />
                                                    Research
                                                </>
                                            )}
                                        </button>
                                    </div>
                                    {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                                </form>

                                {/* Quick Prompts */}
                                <div className="flex flex-wrap gap-2">
                                    {quickPrompts.map((prompt) => (
                                        <button
                                            key={prompt}
                                            onClick={() => { setQuery(prompt); handleSearch(prompt); }}
                                            className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-[11px] text-gray-600 hover:border-gray-500 transition"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Results */}
                            <div className={`flex-1 overflow-y-auto ${horizontalPadding} py-4 space-y-4`}>
                                {/* Loading */}
                                {loading && (
                                    <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-gray-500">
                                        <div className="relative w-8 h-8">
                                            <span className="absolute inset-0 border-2 border-gray-300 rounded-full animate-ping" />
                                            <span className="absolute inset-0 border-2 border-gray-600 rounded-full animate-spin" />
                                        </div>
                                        <p>Researching with AI synthesis...</p>
                                        <p className="text-xs text-gray-400">This may take 10-30 seconds for deep research</p>
                                    </div>
                                )}

                                {/* Empty State */}
                                {!loading && !response && !error && (
                                    <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                                        <Rocket className="mx-auto mb-3 text-gray-300" size={40} />
                                        <p className="font-semibold text-gray-700">Enhanced Research Copilot</p>
                                        <p className="mt-1">Get synthesized insights with quality-scored sources. Type a query above to start.</p>
                                    </div>
                                )}

                                {/* Metadata */}
                                {!loading && metadata && (
                                    <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-2 text-[11px] text-gray-600 flex flex-wrap gap-2">
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 border border-gray-200">
                                            {metadata.provider}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 border border-gray-200">
                                            {researchModes.find(m => m.id === metadata.mode)?.label || metadata.mode}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 border border-gray-200">
                                            {metadata.sourceCount} sources
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 border border-gray-200">
                                            {formatDuration(metadata.durationMs)}
                                        </span>
                                        {metadata.synthesisModel && (
                                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-violet-700 border border-violet-200">
                                                ✨ Synthesized
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Synthesis Summary */}
                                {!loading && synthesis && synthesis.summary && (
                                    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-violet-900">
                                            <Sparkles size={16} /> AI Synthesis
                                        </div>
                                        <p className="mt-2 text-sm text-gray-700 leading-relaxed">{synthesis.summary}</p>
                                        <button
                                            onClick={() => handleInsertContent(synthesis.summary)}
                                            className="mt-3 inline-flex items-center gap-1 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                                        >
                                            <BookmarkPlus size={14} /> Insert Summary
                                        </button>
                                    </div>
                                )}

                                {/* Key Stats */}
                                {!loading && synthesis && synthesis.keyStats.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Key Statistics</h4>
                                        <KeyStats
                                            stats={synthesis.keyStats}
                                            sources={sources}
                                            onInsert={(content) => handleInsertContent(content)}
                                        />
                                    </div>
                                )}

                                {/* Insights */}
                                {!loading && synthesis && synthesis.insights.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Key Insights</h4>
                                        <div className="space-y-2">
                                            {synthesis.insights.map((insight, idx) => (
                                                <InsightCard
                                                    key={idx}
                                                    insight={insight}
                                                    sources={sources}
                                                    onInsert={handleInsertContent}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Sources */}
                                {!loading && sources.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                                            Sources ({sources.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {sources.map((source, idx) => (
                                                <SourceCard
                                                    key={idx}
                                                    source={source}
                                                    index={idx}
                                                    onInsert={handleInsertContent}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Raw Answer Toggle */}
                                {!loading && rawAnswer && (
                                    <div>
                                        <button
                                            onClick={() => setShowRaw(!showRaw)}
                                            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                                        >
                                            {showRaw ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            {showRaw ? 'Hide raw response' : 'Show raw response'}
                                        </button>
                                        {showRaw && (
                                            <div className="mt-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
                                                <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono">
                                                    {rawAnswer}
                                                </pre>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* AI Writer Tab */}
                    {activeTab === 'writer' && (
                        <>
                            <div className={`border-b border-gray-100 ${horizontalPadding} py-4 space-y-3`}>
                                {/* Goal Selector */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {aiWriterGoals.map((goal) => (
                                        <button
                                            key={goal.id}
                                            onClick={() => setWriterGoal(goal.id)}
                                            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                                writerGoal === goal.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            {goal.icon}
                                            {goal.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Prompt Input */}
                                <form onSubmit={(e) => { e.preventDefault(); handleWriterGenerate(); }} className="rounded-2xl border border-gray-200 bg-white p-3 shadow-inner">
                                    <textarea
                                        value={writerPrompt}
                                        onChange={(e) => setWriterPrompt(e.target.value)}
                                        placeholder={aiWriterGoals.find(g => g.id === writerGoal)?.placeholder}
                                        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none resize-none"
                                        rows={3}
                                    />
                                    <div className="mt-2 flex items-center justify-end">
                                        <button
                                            type="submit"
                                            disabled={agentLoading || !writerPrompt.trim()}
                                            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50 flex items-center gap-2"
                                        >
                                            {agentLoading ? (
                                                <span className="animate-spin">⏳</span>
                                            ) : (
                                                <Sparkles size={14} />
                                            )}
                                            Generate
                                        </button>
                                    </div>
                                </form>

                                {/* Quick Prompts */}
                                <div className="flex flex-wrap gap-2">
                                    {writerQuickPrompts.map((prompt) => (
                                        <button
                                            key={prompt}
                                            onClick={() => setWriterPrompt(prompt)}
                                            className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-[11px] text-gray-600 hover:border-gray-500"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Writer Output */}
                            <div className={`flex-1 overflow-y-auto ${horizontalPadding} py-4`}>
                                {isStreaming && (
                                    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <span className="animate-spin">⏳</span>
                                            <span className="text-sm font-semibold text-violet-700">AI is writing...</span>
                                        </div>
                                        <div className="prose prose-sm max-w-none">
                                            <pre className="whitespace-pre-wrap text-sm text-gray-700">{streamingOutput}</pre>
                                        </div>
                                    </div>
                                )}

                                {agentError && !isStreaming && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                        <AlertTriangle size={16} className="inline mr-2" />
                                        {agentError}
                                    </div>
                                )}

                                {hasWriterContent && !isStreaming && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                                            <span className="text-xs text-gray-500">
                                                {(writerOutput || streamingOutput || '').length.toLocaleString()} characters
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => copy(writerOutput || streamingOutput || '')}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-100 border border-gray-200 rounded-lg"
                                                >
                                                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                                                    {isCopied ? 'Copied!' : 'Copy'}
                                                </button>
                                                <button
                                                    onClick={() => { setWriterOutput(null); resetAgent(); }}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-100 border border-gray-200 rounded-lg"
                                                >
                                                    <RefreshCw size={14} />
                                                    New
                                                </button>
                                            </div>
                                        </div>
                                        <div className="prose prose-sm max-w-none">
                                            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">{writerOutput || streamingOutput}</pre>
                                        </div>
                                    </div>
                                )}

                                {!hasWriterContent && !isStreaming && !agentError && (
                                    <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                                        <Sparkles size={32} className="mx-auto text-gray-300 mb-3" />
                                        <p className="font-semibold text-gray-700">AI Writer</p>
                                        <p className="mt-1">Generate structured content for your document.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
};

export default EnhancedResearchCopilot;
