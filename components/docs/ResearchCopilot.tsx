import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
    AlertTriangle,
    BookmarkPlus,
    Check,
    Copy,
    ExternalLink,
    FileText,
    Globe,
    History,
    Image as ImageIcon,
    Lightbulb,
    Link as LinkIcon,
    Maximize2,
    Minimize2,
    Newspaper,
    PenTool,
    RefreshCw,
    Rocket,
    Send,
    Sparkles,
    Target,
    TrendingUp,
    Users,
    X,
    Zap,
} from 'lucide-react';
import { searchWeb } from '../../src/lib/services/youSearchService';
import type { ResearchMode, YouSearchImageResult, YouSearchResponse } from '../../src/lib/services/youSearch.types';
import { telemetry } from '../../lib/services/telemetry';
import { useYouAgent } from '../../hooks/useYouAgent';
import { useCopyToClipboard } from '../../hooks';

interface ResearchCopilotProps {
    isOpen: boolean;
    onClose: () => void;
    editor: Editor | null;
    docTitle: string;
    docTypeLabel: string;
    workspaceName?: string | null;
    tags: string[];
    workspaceId: string;
    docId?: string;
    cacheTtlMs?: number;
}

interface ResearchHistoryItem {
    id: string;
    query: string;
    mode: ResearchMode;
    timestamp: number;
}

interface ResearchCacheEntry {
    response: YouSearchResponse;
    timestamp: number;
}

// Top-level tab: Research (web search) vs AI Writer (generate content)
type CopilotTab = 'research' | 'writer';

// AI Writer goal types for quick generation
type AIWriterGoal = 'freeform' | 'section' | 'summary' | 'bullets' | 'analysis';

const aiWriterGoals: Array<{ id: AIWriterGoal; label: string; icon: React.ReactNode; placeholder: string }> = [
    { id: 'freeform', label: 'Write anything', icon: <PenTool size={14} />, placeholder: 'e.g. Write a product overview for our AI platform...' },
    { id: 'section', label: 'Add section', icon: <FileText size={14} />, placeholder: 'e.g. Write a competitive analysis section...' },
    { id: 'summary', label: 'Summarize', icon: <Sparkles size={14} />, placeholder: 'e.g. Summarize the key market trends for 2025...' },
    { id: 'bullets', label: 'Key points', icon: <Target size={14} />, placeholder: 'e.g. List 5 key benefits of our solution...' },
    { id: 'analysis', label: 'Deep analysis', icon: <Lightbulb size={14} />, placeholder: 'e.g. Analyze the competitive landscape for fintech...' },
];

// Section icons for AI-generated content (same pattern as AgentResponsePresenter)
const SECTION_ICONS: Record<string, React.ReactNode> = {
    'snapshot': <FileText size={16} className="text-slate-700" />,
    'overview': <FileText size={16} className="text-slate-700" />,
    'company': <FileText size={16} className="text-slate-700" />,
    'icp': <Target size={16} className="text-slate-600" />,
    'customer': <Users size={16} className="text-slate-600" />,
    'pain': <Zap size={16} className="text-slate-600" />,
    'problem': <Zap size={16} className="text-slate-600" />,
    'trend': <TrendingUp size={16} className="text-slate-500" />,
    'market': <TrendingUp size={16} className="text-slate-500" />,
    'competitive': <Target size={16} className="text-slate-700" />,
    'landscape': <Target size={16} className="text-slate-700" />,
    'angle': <Lightbulb size={16} className="text-slate-500" />,
    'outreach': <Lightbulb size={16} className="text-slate-500" />,
    'gtm': <Rocket size={16} className="text-slate-600" />,
    'recommendation': <Lightbulb size={16} className="text-slate-500" />,
    'signal': <AlertTriangle size={16} className="text-slate-600" />,
    'risk': <AlertTriangle size={16} className="text-slate-700" />,
    'summary': <FileText size={16} className="text-slate-600" />,
    'takeaway': <FileText size={16} className="text-slate-600" />,
    'benefit': <Sparkles size={16} className="text-slate-600" />,
    'feature': <Rocket size={16} className="text-slate-600" />,
};

const getIconForHeading = (heading: string): React.ReactNode => {
    const lower = heading.toLowerCase();
    for (const [key, icon] of Object.entries(SECTION_ICONS)) {
        if (lower.includes(key)) return icon;
    }
    return <FileText size={16} className="text-gray-400" />;
};

const modeOptions: Array<{ id: ResearchMode; label: string; icon: React.ReactNode; helper: string }> = [
    { id: 'search', label: 'Web', icon: <Globe size={14} />, helper: 'Top web sources' },
    { id: 'news', label: 'News', icon: <Newspaper size={14} />, helper: 'Recent coverage' },
    { id: 'images', label: 'Images', icon: <ImageIcon size={14} />, helper: 'Visual references' },
    { id: 'rag', label: 'Deep Dive', icon: <Sparkles size={14} />, helper: 'Synthesized summary' },
];

const comingSoonModes: ResearchMode[] = ['news', 'images', 'rag'];

const buildCacheKey = (query: string, mode: ResearchMode) => `${mode}:${query.toLowerCase()}`;
const formatDisplayUrl = (url?: string) => {
    if (!url) return '';
    try {
        const { hostname } = new URL(url);
        return hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
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

const getDocHtml = (editor: Editor | null) => {
    if (!editor || typeof editor.getHTML !== 'function') return '';
    return editor.getHTML();
};

const findCitationNumberByUrl = (editor: Editor | null, url?: string) => {
    if (!editor || !url) return null;
    const html = getDocHtml(editor);
    if (!html) return null;
    const regex = new RegExp(`data-source-url="${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*data-citation-number="(\\d+)"`, 'i');
    const match = html.match(regex);
    return match ? Number(match[1]) : null;
};

const getNextCitationNumber = (editor: Editor | null) => {
    const html = getDocHtml(editor);
    if (!html) return 1;
    const matches = [...html.matchAll(/data-citation-number="(\d+)"/g)];
    if (!matches.length) return 1;
    return Math.max(...matches.map((match) => Number(match[1]))) + 1;
};

const insertAtDocumentEnd = (editor: Editor | null, content: string) => {
    if (!editor || !content) return;
    const docSize = editor.state.doc.content.size;
    editor.commands.insertContentAt({ from: docSize, to: docSize }, content, { updateSelection: false });
};

const ensureReferencesSection = (editor: Editor | null) => {
    if (!editor) return;
    const html = getDocHtml(editor);
    if (html.includes('data-doc-references="true"')) return;
    insertAtDocumentEnd(
        editor,
        '<hr class="doc-reference-divider" data-doc-references-divider="true" />' +
            '<h3 id="doc-references" data-doc-references="true">References</h3>'
    );
};

const buildFootnoteHtml = (citationNumber: number, snippet: string, url?: string, title?: string) => {
    const normalizedSnippet = snippet.replace(/\s+/g, ' ').trim();
    const safeUrl = escapeHtml(url ?? '');
    const safeTitle = escapeHtml(title ?? 'Source');
    const snippetPreview = escapeHtml(truncateText(normalizedSnippet));
    const displayUrl = formatDisplayUrl(url);
    const linkHtml = url
        ? ` <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayUrl || safeUrl)}</a>`
        : '';

    const displayTextParts: string[] = [];
    if (title) displayTextParts.push(title.trim());
    if (normalizedSnippet) displayTextParts.push(normalizedSnippet);
    let displayText = displayTextParts.join(' — ');
    if (url) {
        displayText += displayText ? ` (${url})` : url;
    }

    const safeDisplayText = escapeHtml(displayText || title || normalizedSnippet || url || `Reference ${citationNumber}`);

    return `<p class="doc-footnote" id="cite-note-${citationNumber}" data-source-url="${safeUrl}" data-citation-number="${citationNumber}" data-footnote-display="${safeDisplayText}">
        <strong>[${citationNumber}]</strong> ${safeTitle}${snippetPreview ? ` — ${snippetPreview}` : ''}${linkHtml}
    </p>`;
};

const buildInsertHtml = (snippet: string, url?: string, title?: string) => {
    const safeSnippet = escapeHtml(snippet.trim()).replace(/\n/g, '<br />');
    const safeTitle = escapeHtml(title ?? 'Source');
    const safeUrl = escapeHtml(normalizeUrl(url));

    if (!safeSnippet) {
        return `<p><strong>Source:</strong> <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeTitle}</a></p>`;
    }

    if (safeUrl) {
        return `<p>${safeSnippet}</p><p><strong>Source:</strong> <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${safeTitle}</a></p>`;
    }

    return `<p>${safeSnippet}</p>`;
};

const buildImageInsertHtml = (image: YouSearchImageResult) => {
    const normalizedUrl = normalizeUrl(image.url) || undefined;
    const safeImageUrl = escapeHtml(image.imageUrl ?? '');
    const safeCaption = escapeHtml(image.title || 'Research image');
    const safeUrl = normalizedUrl ? escapeHtml(normalizedUrl) : '';
    const displayUrl = normalizedUrl ? escapeHtml(formatDisplayUrl(normalizedUrl) || normalizedUrl) : '';
    const sourceLink = normalizedUrl
        ? ` · <a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${displayUrl}</a>`
        : '';

    return `<figure class="doc-research-image" data-source-url="${safeUrl}">
        <img src="${safeImageUrl}" alt="${safeCaption}" />
        <figcaption>${safeCaption}${sourceLink}</figcaption>
    </figure>`;
};

const formatFetchedAgo = (iso?: string | null) => {
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

const STORAGE_PREFIX = 'researchCopilot';
const HISTORY_LIMIT = 5;

/**
 * Convert markdown to HTML for TipTap editor insertion
 */
function convertMarkdownToHtml(markdown: string): string {
    let html = markdown;
    
    // Headers (process in order from h4 to h1 to avoid conflicts)
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    
    // Bold and italic
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Bullet lists - simple approach
    const lines = html.split('\n');
    let inList = false;
    const processedLines: string[] = [];
    
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (!inList) {
                processedLines.push('<ul>');
                inList = true;
            }
            processedLines.push(`<li>${trimmed.slice(2)}</li>`);
        } else if (trimmed.match(/^\d+\. /)) {
            if (!inList) {
                processedLines.push('<ol>');
                inList = true;
            }
            processedLines.push(`<li>${trimmed.replace(/^\d+\. /, '')}</li>`);
        } else {
            if (inList) {
                // Find the last list tag - compatible with ES2022
                const lastListTag = [...processedLines].reverse().find(l => l === '<ul>' || l === '<ol>');
                processedLines.push(lastListTag === '<ol>' ? '</ol>' : '</ul>');
                inList = false;
            }
            if (trimmed && !trimmed.startsWith('<h') && !trimmed.startsWith('<ul') && !trimmed.startsWith('<ol') && !trimmed.startsWith('</')) {
                processedLines.push(`<p>${trimmed}</p>`);
            } else if (trimmed) {
                processedLines.push(trimmed);
            }
        }
    }
    
    if (inList) {
        processedLines.push('</ul>');
    }
    
    return processedLines.join('');
}

/**
 * Render markdown to React elements for preview (similar to AgentResponsePresenter)
 */
function renderAIWriterMarkdown(text: string): React.ReactNode {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let currentList: { type: 'ul' | 'ol', items: string[] } | null = null;
    let key = 0;

    const flushList = () => {
        if (currentList) {
            const ListTag = currentList.type === 'ol' ? 'ol' : 'ul';
            const listClass = currentList.type === 'ol' 
                ? 'list-decimal list-inside space-y-1.5 my-3 ml-4 text-gray-700'
                : 'list-disc list-inside space-y-1.5 my-3 ml-4 text-gray-700';
            
            elements.push(
                <ListTag key={key++} className={listClass}>
                    {currentList.items.map((item, i) => (
                        <li key={i} className="text-sm leading-relaxed">{formatAIWriterInline(item)}</li>
                    ))}
                </ListTag>
            );
            currentList = null;
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();

        // Empty line
        if (trimmedLine === '') {
            flushList();
            continue;
        }

        // Horizontal rule
        if (/^(-{3,}|_{3,}|\*{3,})$/.test(trimmedLine)) {
            flushList();
            elements.push(<hr key={key++} className="my-4 border-gray-200" />);
            continue;
        }

        // Headings
        const headingMatch = trimmedLine.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
            flushList();
            const level = headingMatch[1].length;
            const content = headingMatch[2].replace(/\*\*/g, '');
            
            const headingClasses: Record<number, string> = {
                1: 'text-xl font-semibold text-slate-900 mt-6 mb-3 flex items-center gap-2',
                2: 'text-lg font-semibold text-slate-900 mt-5 mb-2 flex items-center gap-2',
                3: 'text-base font-semibold text-slate-800 mt-4 mb-2 flex items-center gap-2',
                4: 'text-sm font-medium text-slate-700 mt-3 mb-2 flex items-center gap-2',
            };

            const headingClass = headingClasses[level] || headingClasses[4];
            const icon = getIconForHeading(content);
            
            if (level === 1) {
                elements.push(<h2 key={key++} className={headingClass}>{icon}<span>{content}</span></h2>);
            } else if (level === 2) {
                elements.push(<h3 key={key++} className={headingClass}>{icon}<span>{content}</span></h3>);
            } else {
                elements.push(<h4 key={key++} className={headingClass}>{icon}<span>{content}</span></h4>);
            }
            continue;
        }

        // Numbered list item
        const orderedMatch = trimmedLine.match(/^(\d+)\.\s+(.+)$/);
        if (orderedMatch) {
            if (!currentList || currentList.type !== 'ol') {
                flushList();
                currentList = { type: 'ol', items: [] };
            }
            currentList.items.push(orderedMatch[2]);
            continue;
        }

        // Bullet list item
        const unorderedMatch = trimmedLine.match(/^[-*+]\s+(.+)$/);
        if (unorderedMatch) {
            if (!currentList || currentList.type !== 'ul') {
                flushList();
                currentList = { type: 'ul', items: [] };
            }
            currentList.items.push(unorderedMatch[1]);
            continue;
        }

        // Blockquote
        if (trimmedLine.startsWith('>')) {
            flushList();
            const quoteContent = trimmedLine.slice(1).trim();
            elements.push(
                <blockquote key={key++} className="border-l-4 border-slate-300 pl-4 py-2 my-3 bg-slate-50 rounded-r-lg text-slate-700 italic text-sm">
                    {formatAIWriterInline(quoteContent)}
                </blockquote>
            );
            continue;
        }

        // Regular paragraph
        flushList();
        elements.push(
            <p key={key++} className="text-gray-700 text-sm leading-relaxed my-2">
                {formatAIWriterInline(trimmedLine)}
            </p>
        );
    }

    flushList();
    return <>{elements}</>;
}

/**
 * Format inline markdown: bold, italic, links
 */
function formatAIWriterInline(text: string): React.ReactNode {
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
        // Links [text](url)
        const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/);
        if (linkMatch) {
            parts.push(
                <a 
                    key={key++} 
                    href={linkMatch[2]} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-slate-900 underline underline-offset-2 hover:text-slate-600 font-medium transition-colors"
                >
                    {linkMatch[1]}
                </a>
            );
            remaining = remaining.slice(linkMatch[0].length);
            continue;
        }

        // Bold **text**
        const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
        if (boldMatch) {
            parts.push(<strong key={key++} className="font-semibold text-gray-900">{boldMatch[1]}</strong>);
            remaining = remaining.slice(boldMatch[0].length);
            continue;
        }

        // Italic *text*
        const italicMatch = remaining.match(/^\*([^*]+)\*/);
        if (italicMatch && !remaining.startsWith('**')) {
            parts.push(<em key={key++} className="italic">{italicMatch[1]}</em>);
            remaining = remaining.slice(italicMatch[0].length);
            continue;
        }

        // Inline code `code`
        const codeMatch = remaining.match(/^`([^`]+)`/);
        if (codeMatch) {
            parts.push(
                <code key={key++} className="px-1.5 py-0.5 bg-slate-100 text-slate-800 border border-slate-200 rounded text-xs font-mono">
                    {codeMatch[1]}
                </code>
            );
            remaining = remaining.slice(codeMatch[0].length);
            continue;
        }

        // Find next special character
        const nextSpecial = remaining.search(/[[*`]/);
        if (nextSpecial === -1) {
            parts.push(remaining);
            break;
        } else if (nextSpecial === 0) {
            parts.push(remaining[0]);
            remaining = remaining.slice(1);
        } else {
            parts.push(remaining.slice(0, nextSpecial));
            remaining = remaining.slice(nextSpecial);
        }
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
}

export const ResearchCopilot: React.FC<ResearchCopilotProps> = ({
    isOpen,
    onClose,
    editor,
    docTitle,
    docTypeLabel,
    workspaceName,
    tags,
    workspaceId,
    docId,
    cacheTtlMs = 1000 * 60 * 3,
}) => {
    // Tab state: Research vs AI Writer
    const [activeTab, setActiveTab] = useState<CopilotTab>('research');
    
    // Research mode state
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<ResearchMode>('search');
    const [results, setResults] = useState<YouSearchResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [errorCode, setErrorCode] = useState<'missing-api-key' | null>(null);
    const [history, setHistory] = useState<ResearchHistoryItem[]>([]);
    const [lastQuery, setLastQuery] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [cacheStatus, setCacheStatus] = useState<{ key: string; ageMs: number } | null>(null);
    const cacheRef = useRef<Map<string, ResearchCacheEntry>>(new Map());
    
    // AI Writer mode state
    const [writerPrompt, setWriterPrompt] = useState('');
    const [writerGoal, setWriterGoal] = useState<AIWriterGoal>('freeform');
    const [writerOutput, setWriterOutput] = useState<string | null>(null);
    
    // AI Writer streaming via useYouAgent hook
    const { 
        run: runAgent, 
        loading: agentLoading, 
        error: agentError, 
        streamingOutput, 
        isStreaming,
        reset: resetAgent 
    } = useYouAgent('research_briefing');
    
    // Copy to clipboard hook
    const { isCopied, copy } = useCopyToClipboard();

    const storageKey = `${STORAGE_PREFIX}.cache.${workspaceId}`;
    const historyKey = `${STORAGE_PREFIX}.history.${workspaceId}`;

    const currentComingSoon = comingSoonModes.includes(mode);

    useEffect(() => {
        if (!isOpen) {
            setIsFullscreen(false);
        }
    }, [isOpen]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const stored = sessionStorage.getItem(historyKey);
            if (stored) {
                const parsed = JSON.parse(stored) as ResearchHistoryItem[];
                if (Array.isArray(parsed)) {
                    setHistory(parsed);
                }
            }
        } catch (err) {
            console.warn('[ResearchCopilot] failed to hydrate history', err);
        }
    }, [historyKey]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            const raw = sessionStorage.getItem(storageKey);
            if (!raw) return;
            const parsed = JSON.parse(raw) as Array<{ key: string; timestamp: number; response: YouSearchResponse }>;
            if (!Array.isArray(parsed)) return;
            const map = new Map<string, ResearchCacheEntry>();
            parsed.forEach((entry) => {
                map.set(entry.key, { response: entry.response, timestamp: entry.timestamp });
            });
            cacheRef.current = map;
        } catch (err) {
            console.warn('[ResearchCopilot] failed to hydrate cache', err);
        }
    }, [storageKey]);

    const persistCache = useCallback(() => {
        if (typeof window === 'undefined') return;
        const entries = Array.from(cacheRef.current.entries())
            .slice(-HISTORY_LIMIT)
            .map(([key, entry]) => ({ key, timestamp: entry.timestamp, response: entry.response }));
        try {
            sessionStorage.setItem(storageKey, JSON.stringify(entries));
        } catch (err) {
            console.warn('[ResearchCopilot] failed to persist cache', err);
        }
    }, [storageKey]);

    const persistHistory = useCallback(
        (nextHistory: ResearchHistoryItem[]) => {
            if (typeof window === 'undefined') return;
            try {
                sessionStorage.setItem(historyKey, JSON.stringify(nextHistory));
            } catch (err) {
                console.warn('[ResearchCopilot] failed to persist history', err);
            }
        },
        [historyKey],
    );

    const modeLabel = useCallback((value: ResearchMode) => modeOptions.find((option) => option.id === value)?.label ?? value, []);

    const makeHistoryId = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    const detectErrorCode = (message?: string | null): 'missing-api-key' | null => {
        if (!message) return null;
        const normalized = message.toLowerCase();
        if (normalized.includes('youcom_api_key')) {
            return 'missing-api-key';
        }
        return null;
    };

    const handleInsertWithCitation = (contentHtml: string, snippet: string, normalizedUrl?: string, title?: string) => {
        if (!editor || !contentHtml) return;
        const normalized = normalizedUrl ? normalizeUrl(normalizedUrl) : '';
        const safeUrl = normalized || undefined;
        const existingCitation = safeUrl ? findCitationNumberByUrl(editor, safeUrl) : null;
        const citationNumber = existingCitation ?? getNextCitationNumber(editor);
        const inlineCitation = ` <sup class="doc-citation" data-citation-number="${citationNumber}" id="cite-ref-${citationNumber}"><a href="#cite-note-${citationNumber}" rel="noopener noreferrer">[${citationNumber}]</a></sup>`;

        editor.chain().focus().insertContent(`${contentHtml}${inlineCitation}`).run();

        if (!existingCitation) {
            ensureReferencesSection(editor);
            const footnoteSnippet = snippet?.trim() || title || safeUrl || 'Referenced source';
            const footnoteHtml = buildFootnoteHtml(citationNumber, footnoteSnippet, safeUrl, title);
            insertAtDocumentEnd(editor, footnoteHtml);
        }
    };

    const handleInsertResult = (snippet: string, url?: string, title?: string) => {
        const normalizedUrl = normalizeUrl(url) || undefined;
        const contentHtml = buildInsertHtml(snippet, normalizedUrl, title);
        handleInsertWithCitation(contentHtml, snippet, normalizedUrl, title);
    };

    const handleInsertImage = (image: YouSearchImageResult) => {
        if (!editor || !image?.imageUrl) return;
        const html = buildImageInsertHtml(image);
        const caption = image.title || 'Research image';
        handleInsertWithCitation(html, caption, normalizeUrl(image.url), image.title);
    };

    const recordSearchTelemetry = useCallback(
        (payload: { query: string; mode: ResearchMode; cached: boolean }) => {
            telemetry.track('research_copilot_search', {
                workspaceId,
                docId,
                metadata: {
                    query: payload.query,
                    mode: payload.mode,
                    cached: payload.cached,
                },
            });
        },
        [docId, workspaceId],
    );

    const handleSearch = useCallback(
        async (customQuery?: string, customMode?: ResearchMode, options?: { forceFresh?: boolean }) => {
            const effectiveQuery = (customQuery ?? query).trim();
            const effectiveMode = customMode ?? mode;

            if (comingSoonModes.includes(effectiveMode)) {
                return;
            }

            if (!effectiveQuery) {
                setError('Enter a question or topic to research.');
                setErrorCode(null);
                return;
            }

            const cacheKey = buildCacheKey(effectiveQuery, effectiveMode);
            const cacheEntry = cacheRef.current.get(cacheKey);
            const cacheAge = cacheEntry ? Date.now() - cacheEntry.timestamp : null;
            const cacheFresh = cacheEntry && cacheAge !== null && cacheAge <= cacheTtlMs;

            if (cacheEntry && cacheFresh && !options?.forceFresh) {
                setResults(cacheEntry.response);
                setLastQuery(`${effectiveQuery} (${modeLabel(effectiveMode)})`);
                setCacheStatus({ key: cacheKey, ageMs: cacheAge ?? 0 });
                recordSearchTelemetry({ query: effectiveQuery, mode: effectiveMode, cached: true });
                return;
            }

            try {
                setLoading(true);
                setError(null);
                setErrorCode(null);
                const payload = await searchWeb(effectiveQuery, effectiveMode);
                setResults(payload);
                setLastQuery(`${effectiveQuery} (${modeLabel(effectiveMode)})`);
                cacheRef.current.set(cacheKey, { response: payload, timestamp: Date.now() });
                persistCache();
                setCacheStatus(null);
                setHistory((prev) => {
                    const next = [{ id: makeHistoryId(), query: effectiveQuery, mode: effectiveMode, timestamp: Date.now() }, ...prev].slice(0, HISTORY_LIMIT);
                    persistHistory(next);
                    return next;
                });
                recordSearchTelemetry({ query: effectiveQuery, mode: effectiveMode, cached: false });
            } catch (err: any) {
                console.error('[ResearchCopilot] search failed', err);
                const message = err?.message ?? 'Search failed. Please try again.';
                const code = detectErrorCode(message);
                setErrorCode(code);
                if (code === 'missing-api-key') {
                    setError('Live research needs the You.com API key. Configure YOUCOM_API_KEY in Supabase secrets to continue.');
                } else {
                    setError(message);
                }
            } finally {
                setLoading(false);
            }
        },
        [cacheTtlMs, mode, modeLabel, persistCache, persistHistory, query, recordSearchTelemetry],
    );

    const quickPrompts = useMemo(
        () => [
            `Latest market news about ${docTitle || 'our product'}`,
            `Key stats for ${workspaceName || 'our company'} ${new Date().getFullYear()}`,
            `Competitor analysis for ${tags[0] || 'top competitors'}`,
            'Customer sentiment trends this quarter',
            'Top 5 industry benchmarks to cite',
        ],
        [docTitle, workspaceName, tags],
    );
    
    // AI Writer quick prompts - contextual suggestions
    const writerQuickPrompts = useMemo(
        () => [
            `Write a compelling overview for ${docTitle || 'this document'}`,
            `Create a competitive analysis section for ${tags[0] || 'our market'}`,
            `Draft key benefits and value propositions`,
            `Summarize market trends and opportunities`,
            `List 5 action items based on this research`,
        ],
        [docTitle, tags],
    );
    
    // Build AI Writer input based on goal
    const buildWriterPrompt = useCallback((goal: AIWriterGoal, prompt: string): string => {
        const context = `Document: "${docTitle || 'Untitled'}" (${docTypeLabel})${workspaceName ? ` for ${workspaceName}` : ''}${tags.length ? `. Tags: ${tags.join(', ')}` : ''}`;
        
        switch (goal) {
            case 'section':
                return `Write a well-structured section for a GTM document. ${context}\n\nRequest: ${prompt}\n\nProvide clear headings, structured content with bullet points where appropriate, and actionable insights.`;
            case 'summary':
                return `Provide a concise, executive-level summary. ${context}\n\nRequest: ${prompt}\n\nFormat with key takeaways and clear structure.`;
            case 'bullets':
                return `Create a list of key points. ${context}\n\nRequest: ${prompt}\n\nFormat as clear, actionable bullet points. Be specific and quantify where possible.`;
            case 'analysis':
                return `Provide an in-depth analysis. ${context}\n\nRequest: ${prompt}\n\nInclude market insights, competitive considerations, and strategic recommendations with clear section headings.`;
            case 'freeform':
            default:
                return `${context}\n\nRequest: ${prompt}\n\nProvide well-structured content with clear formatting using headings and bullet points.`;
        }
    }, [docTitle, docTypeLabel, workspaceName, tags]);
    
    // Handle AI Writer generation
    const handleWriterGenerate = useCallback(async () => {
        if (!writerPrompt.trim()) return;
        
        setWriterOutput(null);
        
        const input = buildWriterPrompt(writerGoal, writerPrompt.trim());
        
        telemetry.track('research_copilot_ai_writer', {
            workspaceId,
            docId,
            metadata: {
                goal: writerGoal,
                promptLength: writerPrompt.length,
            },
        });
        
        try {
            const response = await runAgent(input, {
                founderhq_context: {
                    goal: writerGoal,
                    docTitle,
                    docType: docTypeLabel,
                    workspaceName,
                    tags,
                },
            });
            
            if (response?.output) {
                setWriterOutput(response.output);
            }
        } catch (err) {
            console.error('[ResearchCopilot] AI Writer generation failed:', err);
        }
    }, [writerPrompt, writerGoal, buildWriterPrompt, runAgent, workspaceId, docId, docTitle, docTypeLabel, workspaceName, tags]);
    
    // Insert AI Writer output to editor
    const handleInsertWriterOutput = useCallback(() => {
        if (!editor) return;
        
        const contentToInsert = writerOutput || streamingOutput;
        if (!contentToInsert) return;
        
        // Convert markdown to HTML for TipTap
        const html = convertMarkdownToHtml(contentToInsert);
        
        editor.chain().focus().insertContent(html).run();
        
        telemetry.track('research_copilot_ai_writer_insert', {
            workspaceId,
            docId,
            metadata: {
                goal: writerGoal,
                contentLength: contentToInsert.length,
            },
        });
    }, [editor, writerOutput, streamingOutput, workspaceId, docId, writerGoal]);
    
    // Copy AI Writer output
    const handleCopyWriterOutput = useCallback(async () => {
        const contentToCopy = writerOutput || streamingOutput;
        if (!contentToCopy) return;
        await copy(contentToCopy);
    }, [writerOutput, streamingOutput, copy]);
    
    // Reset AI Writer
    const handleResetWriter = useCallback(() => {
        setWriterPrompt('');
        setWriterOutput(null);
        resetAgent();
    }, [resetAgent]);

    const primaryHits = useMemo(() => {
        if (!results) return [];
        if (mode === 'news') {
            return results.news ?? [];
        }
        if (mode === 'images') {
            return [];
        }
        return results.hits ?? [];
    }, [results, mode]);

    const imageResults = useMemo(() => {
        if (mode !== 'images') return [];
        return results?.images ?? [];
    }, [results, mode]);

    const ragAnswer = useMemo(() => {
        if (mode !== 'rag') return null;
        return results?.qa?.answer ?? null;
    }, [results, mode]);

    const metadataCount = useMemo(() => {
        if (!results?.metadata) return null;
        if (typeof results.metadata.count === 'number') {
            return results.metadata.count;
        }
        switch (results.metadata.mode) {
            case 'images':
                return results.images?.length ?? null;
            case 'news':
                return results.news?.length ?? null;
            case 'rag':
                return results.qa ? 1 : null;
            default:
                return results.hits?.length ?? null;
        }
    }, [results]);

    const canSendToEditor = Boolean(editor && (ragAnswer || primaryHits.length > 0 || imageResults.length > 0));
    const disableSearch = loading || currentComingSoon;

    const handleSendAllToEditor = () => {
        if (!editor) return;
        if (mode === 'images' && imageResults.length > 0) {
            imageResults.slice(0, 3).forEach(handleInsertImage);
            return;
        }
        if (ragAnswer) {
            handleInsertResult(ragAnswer, undefined, 'Synthesized Answer');
        }
        primaryHits.slice(0, 3).forEach((hit: any, index: number) => {
            const snippet = hit.description || hit.snippets?.[0] || hit.summary || hit.title;
            const url = hit.url || hit.link;
            const title = hit.title || hit.name || `Source ${index + 1}`;
            if (snippet) {
                handleInsertResult(snippet, url, title);
            }
        });
    };

    const toggleFullscreen = () => setIsFullscreen((prev) => !prev);
    const horizontalPadding = isFullscreen ? 'px-8' : 'px-5';
    
    // Determine if AI Writer has content to show
    const hasWriterContent = Boolean(writerOutput || streamingOutput);
    const displayWriterContent = writerOutput || streamingOutput || '';
    
    // Render markdown content for AI Writer (similar to AgentResponsePresenter)
    const renderedWriterContent = useMemo(() => {
        if (!displayWriterContent) return null;
        return renderAIWriterMarkdown(displayWriterContent);
    }, [displayWriterContent]);

    return (
        <div className={`fixed inset-0 z-40 ${isOpen ? '' : 'pointer-events-none'}`}>
            {isOpen && !isFullscreen && <div className="absolute inset-0 bg-black/20" onClick={onClose} aria-hidden />}
            <div className={`absolute inset-y-0 right-0 flex w-full ${isFullscreen ? 'justify-center px-4 sm:px-6 lg:px-12' : 'justify-end'}`}>
                <aside
                    className={`relative h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
                        isFullscreen ? 'w-full max-w-6xl rounded-3xl border border-gray-200' : 'w-full max-w-3xl border-l border-gray-200'
                    } ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    {/* Header with Tab Switcher */}
                    <div className={`border-b border-gray-100 ${horizontalPadding} py-4`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    {/* Tab Switcher */}
                                    <div className="flex items-center rounded-xl border border-gray-200 bg-gray-50 p-0.5">
                                        <button
                                            onClick={() => setActiveTab('research')}
                                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                                activeTab === 'research' 
                                                    ? 'bg-white text-gray-900 shadow-sm' 
                                                    : 'text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            <Globe size={14} />
                                            Research
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('writer')}
                                            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                                activeTab === 'writer' 
                                                    ? 'bg-white text-gray-900 shadow-sm' 
                                                    : 'text-gray-500 hover:text-gray-700'
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
                                    {tags.slice(0, 2).map((tag) => (
                                        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">#{tag}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {activeTab === 'research' ? (
                                    <button
                                        onClick={handleSendAllToEditor}
                                        disabled={!canSendToEditor}
                                        className={`inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold transition ${
                                            canSendToEditor ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        <Send size={14} /> Send to doc
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleInsertWriterOutput}
                                        disabled={!hasWriterContent}
                                        className={`inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold transition ${
                                            hasWriterContent ? 'bg-gray-900 text-white hover:bg-black' : 'text-gray-400 cursor-not-allowed'
                                        }`}
                                    >
                                        <Send size={14} /> Insert to doc
                                    </button>
                                )}
                                <button
                                    onClick={toggleFullscreen}
                                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100"
                                    aria-label={isFullscreen ? 'Exit fullscreen' : 'Expand research copilot'}
                                >
                                    {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
                                </button>
                                <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-100" aria-label="Close research sidebar">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* AI Writer Mode */}
                    {activeTab === 'writer' && (
                        <>
                            <div className={`border-b border-gray-100 ${horizontalPadding} py-4 space-y-3`}>
                                {/* Goal Selector */}
                                <div className="flex flex-wrap items-center gap-2">
                                    {aiWriterGoals.map((goalOption) => (
                                        <button
                                            key={goalOption.id}
                                            onClick={() => setWriterGoal(goalOption.id)}
                                            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                                                writerGoal === goalOption.id 
                                                    ? 'bg-gray-900 text-white' 
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                        >
                                            {goalOption.icon}
                                            {goalOption.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Prompt Input */}
                                <form
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        handleWriterGenerate();
                                    }}
                                    className="rounded-2xl border border-gray-200 bg-white p-3 shadow-inner"
                                >
                                    <label className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400">
                                        {aiWriterGoals.find(g => g.id === writerGoal)?.label || 'Write anything'}
                                    </label>
                                    <div className="mt-2">
                                        <textarea
                                            value={writerPrompt}
                                            onChange={(e) => setWriterPrompt(e.target.value)}
                                            placeholder={aiWriterGoals.find(g => g.id === writerGoal)?.placeholder || 'Describe what you want to write...'}
                                            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none resize-none"
                                            rows={3}
                                        />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-xs text-gray-400">
                                            {writerPrompt.length > 0 ? `${writerPrompt.length} characters` : 'Type your prompt'}
                                        </span>
                                        <button
                                            type="submit"
                                            disabled={agentLoading || !writerPrompt.trim()}
                                            className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {agentLoading ? (
                                                <>
                                                    <span className="relative w-4 h-4 inline-block">
                                                        <span className="absolute inset-0 border-2 border-current animate-spin rounded-full" style={{ animationDuration: '1.2s' }} />
                                                    </span>
                                                    {isStreaming ? 'Writing...' : 'Starting...'}
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles size={14} />
                                                    Generate
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>

                                {/* Quick Prompts */}
                                <div className="flex flex-wrap gap-2">
                                    {writerQuickPrompts.map((prompt) => (
                                        <button
                                            key={prompt}
                                            onClick={() => {
                                                setWriterPrompt(prompt);
                                            }}
                                            className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-[11px] text-gray-600 hover:border-gray-500 transition"
                                        >
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* AI Writer Results */}
                            <div className={`flex-1 overflow-y-auto ${horizontalPadding} py-4 space-y-4`}>
                                {/* Streaming/Loading State */}
                                {isStreaming && (
                                    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="relative w-5 h-5">
                                                <span className="absolute inset-0 border-2 border-violet-500 animate-spin rounded-full" style={{ animationDuration: '1.2s' }} />
                                            </div>
                                            <span className="text-sm font-semibold text-violet-700">AI is writing...</span>
                                        </div>
                                        <div className="prose prose-sm max-w-none">
                                            {renderedWriterContent}
                                        </div>
                                    </div>
                                )}

                                {/* Error State */}
                                {agentError && !isStreaming && (
                                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                                        <p className="font-semibold flex items-center gap-2">
                                            <AlertTriangle size={16} />
                                            Generation failed
                                        </p>
                                        <p className="mt-1">{agentError}</p>
                                    </div>
                                )}

                                {/* Completed Output */}
                                {hasWriterContent && !isStreaming && (
                                    <div className="space-y-4">
                                        {/* Action Bar */}
                                        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                                            <span className="text-xs text-gray-500">
                                                {displayWriterContent.length.toLocaleString()} characters generated
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={handleCopyWriterOutput}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                                                >
                                                    {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                                    {isCopied ? 'Copied!' : 'Copy'}
                                                </button>
                                                <button
                                                    onClick={handleResetWriter}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                                                >
                                                    <RefreshCw size={14} />
                                                    New
                                                </button>
                                                <button
                                                    onClick={handleInsertWriterOutput}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-900 text-white font-medium rounded-lg shadow-sm hover:shadow-md hover:bg-slate-800 transition-all"
                                                >
                                                    <Send size={14} />
                                                    Insert to Doc
                                                </button>
                                            </div>
                                        </div>

                                        {/* Rendered Content */}
                                        <div className="prose prose-sm max-w-none">
                                            {renderedWriterContent}
                                        </div>
                                    </div>
                                )}

                                {/* Empty State */}
                                {!hasWriterContent && !isStreaming && !agentError && (
                                    <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                                        <div className="mb-3">
                                            <Sparkles size={32} className="mx-auto text-gray-300" />
                                        </div>
                                        <p className="font-semibold text-gray-700 mb-1">AI Writer</p>
                                        <p>Type your prompt above and let AI generate beautiful, structured content for your document.</p>
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Research Mode - Original UI */}
                    {activeTab === 'research' && (
                        <>
                    <div className={`border-b border-gray-100 ${horizontalPadding} py-4 space-y-3`}>
                        <div className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 p-1">
                            {modeOptions.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setMode(option.id)}
                                    className={`flex-1 rounded-2xl px-3 py-2 text-left text-xs font-semibold transition ${
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

                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                handleSearch();
                            }}
                            className="rounded-2xl border border-gray-200 bg-white p-3 shadow-inner"
                        >
                            <label className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400">Ask anything</label>
                            <div className="mt-2 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(event) => setQuery(event.target.value)}
                                    placeholder="e.g. What are the latest AI pricing benchmarks?"
                                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
                                />
                                <button
                                    type="submit"
                                    disabled={disableSearch}
                                    className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="relative w-4 h-4 inline-block">
                                            <span className="absolute inset-0 border-2 border-current animate-spin" style={{ animationDuration: '1.2s' }} />
                                            <span className="absolute inset-0.5 border border-current/40 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
                                        </span>
                                    ) : currentComingSoon ? (
                                        'Coming soon'
                                    ) : (
                                        'Search'
                                    )}
                                </button>
                            </div>
                            {currentComingSoon && (
                                <p className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                                    Mode rolling out soon. Switch to Web search to continue researching today.
                                </p>
                            )}
                            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
                            {lastQuery && !error && !loading && (
                                <p className="mt-2 text-xs text-gray-500">Last search: {lastQuery}</p>
                            )}
                        </form>

                        <div className="flex flex-wrap gap-2">
                            {quickPrompts.map((prompt) => (
                                <button
                                    key={prompt}
                                    onClick={() => {
                                        if (currentComingSoon) return;
                                        setQuery(prompt);
                                        handleSearch(prompt);
                                    }}
                                    disabled={currentComingSoon}
                                    className={`rounded-full border border-dashed border-gray-300 px-3 py-1 text-[11px] text-gray-600 hover:border-gray-500 transition ${
                                        currentComingSoon ? 'cursor-not-allowed opacity-50' : ''
                                    }`}
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className={`flex-1 overflow-y-auto ${horizontalPadding} py-4 space-y-4`}>
                        {loading && (
                            <div className="flex flex-col items-center justify-center gap-2 py-12 text-sm text-gray-500">
                                <span className="relative w-5 h-5 inline-block">
                                    <span className="absolute inset-0 border-2 border-current animate-spin" style={{ animationDuration: '1.2s' }} />
                                    <span className="absolute inset-0.5 border border-current/40 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
                                </span>
                                Searching live sources…
                            </div>
                        )}

                        {!loading && !results && !error && !currentComingSoon && (
                            <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                                Start a web search to pull live insights into your doc. Cite sources with one click.
                            </div>
                        )}

                        {!loading && error && (
                            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 space-y-3">
                                <p>{error}</p>
                                {errorCode === 'missing-api-key' && (
                                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
                                        <p className="font-semibold">Setup checklist for admins:</p>
                                        <ol className="list-decimal space-y-1 pl-4">
                                            <li>Add <code>YOUCOM_API_KEY</code> under Supabase Edge Function secrets.</li>
                                            <li>Redeploy the <code>ai-search</code> Edge Function.</li>
                                            <li>Rerun this search to resume live research.</li>
                                        </ol>
                                    </div>
                                )}
                            </div>
                        )}

                        {!loading && !error && results?.metadata && (
                            <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3 text-[11px] text-gray-600 flex flex-wrap gap-2">
                                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 border border-gray-200">
                                    {results.metadata.provider || 'You.com'}
                                </span>
                                <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 border border-gray-200">
                                    {modeLabel(results.metadata.mode)}
                                </span>
                                {typeof metadataCount === 'number' && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 border border-gray-200">
                                        {metadataCount} result{metadataCount === 1 ? '' : 's'}
                                    </span>
                                )}
                                {results.metadata.durationMs && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 border border-gray-200">
                                        {results.metadata.durationMs}ms
                                    </span>
                                )}
                                {results.metadata.fetchedAt && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 border border-gray-200">
                                        Fetched {formatFetchedAgo(results.metadata.fetchedAt)}
                                    </span>
                                )}
                                {cacheStatus && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700 border border-emerald-200">
                                        Cached • {Math.round(cacheStatus.ageMs / 1000)}s old
                                    </span>
                                )}
                                {cacheStatus && (
                                    <button
                                        type="button"
                                        onClick={() => handleSearch(undefined, undefined, { forceFresh: true })}
                                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-100"
                                    >
                                        <RefreshCw size={12} /> Refresh results
                                    </button>
                                )}
                            </div>
                        )}

                        {!loading && !error && ragAnswer && (
                            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-violet-50 to-indigo-50 p-4">
                                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                                    <Sparkles size={16} /> Synthesized Answer
                                </div>
                                <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">{ragAnswer}</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <button
                                        onClick={() => handleInsertResult(ragAnswer)}
                                        className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-black"
                                    >
                                        <BookmarkPlus size={14} /> Insert Summary
                                    </button>
                                </div>
                            </div>
                        )}

                        {!loading && !error && mode === 'images' && (
                            imageResults.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {imageResults.map((image, index) => (
                                        <div key={`${image.imageUrl}-${index}`} className="rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                                            <div className="aspect-video bg-gray-100 flex items-center justify-center">
                                                {image.imageUrl ? (
                                                    <img src={image.imageUrl} alt={image.title || `Reference image ${index + 1}`} className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="text-xs text-gray-400">No preview</div>
                                                )}
                                            </div>
                                            <div className="p-4 space-y-2">
                                                <div className="text-[11px] uppercase tracking-[0.3em] text-gray-400">Image {index + 1}</div>
                                                <p className="text-sm font-semibold text-gray-900">{image.title || 'Untitled visual'}</p>
                                                {image.source && <p className="text-xs text-gray-500">{image.source}</p>}
                                                <div className="flex flex-wrap gap-2 text-xs">
                                                    <button
                                                        onClick={() => handleInsertImage(image)}
                                                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-100"
                                                    >
                                                        <BookmarkPlus size={14} /> Insert Image Card
                                                    </button>
                                                    {image.url && (
                                                        <a
                                                            href={image.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-50"
                                                        >
                                                            <ExternalLink size={14} /> Open Source
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : results ? (
                                <div className="rounded-2xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                                    No images were returned for this query. Try a more specific visual description.
                                </div>
                            ) : null
                        )}

                        {!loading && !error && mode !== 'images' && primaryHits.length > 0 && (
                            <div className="space-y-3">
                                {primaryHits.map((hit: any, index: number) => {
                                    const snippet = hit.description || hit.snippets?.[0] || '';
                                    const url = hit.url || hit.link;
                                    const title = hit.title || hit.name || `Source ${index + 1}`;
                                    return (
                                        <div key={`${title}-${index}`} className="rounded-2xl border border-gray-200 p-4 shadow-sm">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="text-[11px] uppercase tracking-[0.3em] text-gray-400">Result {index + 1}</p>
                                                    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-base font-semibold text-gray-900 hover:text-blue-600">
                                                        {title}
                                                        <ExternalLink size={14} />
                                                    </a>
                                                    {hit.source && <p className="text-xs text-gray-500">{hit.source}</p>}
                                                </div>
                                            </div>
                                            {snippet && <p className="mt-2 text-sm text-gray-700 leading-relaxed">{snippet}</p>}
                                            {hit.snippets && hit.snippets.length > 1 && (
                                                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
                                                    {hit.snippets.slice(1, 4).map((text: string, idx: number) => (
                                                        <li key={idx}>{text}</li>
                                                    ))}
                                                </ul>
                                            )}
                                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                                <button
                                                    onClick={() => handleInsertResult(snippet || title, url, title)}
                                                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-100"
                                                >
                                                    <LinkIcon size={14} /> Insert Citation
                                                </button>
                                                {snippet && (
                                                    <button
                                                        onClick={() => handleInsertResult(`${snippet}\n\nKey takeaways: ${hit.snippets?.slice(1, 3).join(' ') || ''}`, url, title)}
                                                        className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 font-semibold text-gray-700 hover:bg-gray-100"
                                                    >
                                                        <BookmarkPlus size={14} /> Insert Summary
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {currentComingSoon && !results && (
                            <div className="rounded-3xl border-2 border-dashed border-gray-200 bg-gradient-to-br from-violet-50 via-indigo-50 to-white p-6 text-center shadow-inner">
                                <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1 text-xs font-semibold text-gray-700">
                                    <Sparkles size={14} /> Private beta
                                </div>
                                <h4 className="text-xl font-bold text-gray-900">This mode is almost ready</h4>
                                <p className="mt-2 text-sm text-gray-600">We’re polishing this channel so you can cite it with one click. Switch to Web search to keep researching today.</p>
                            </div>
                        )}
                    </div>

                    {history.length > 0 && (
                        <div className={`border-t border-gray-100 ${horizontalPadding} py-3`}>
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.35em] text-gray-400">
                                <History size={14} /> Recent
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {history.map((item) => (
                                    <button
                                        key={item.id}
                                        onClick={() => handleSearch(item.query, item.mode)}
                                        className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600 hover:border-gray-400"
                                    >
                                        {item.query} · {modeLabel(item.mode)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                        </>
                    )}
                </aside>
            </div>
        </div>
    );
};
