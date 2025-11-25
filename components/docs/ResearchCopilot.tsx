import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
    AlertTriangle,
    BookmarkPlus,
    ExternalLink,
    Globe,
    History,
    Image as ImageIcon,
    Link as LinkIcon,
    Loader2,
    Maximize2,
    Minimize2,
    Newspaper,
    RefreshCw,
    Send,
    Sparkles,
    X,
} from 'lucide-react';
import { searchWeb } from '../../src/lib/services/youSearchService';
import type { ResearchMode, YouSearchImageResult, YouSearchResponse } from '../../src/lib/services/youSearch.types';
import { telemetry } from '../../lib/services/telemetry';

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

    return (
        <div className={`fixed inset-0 z-40 ${isOpen ? '' : 'pointer-events-none'}`}>
            {isOpen && !isFullscreen && <div className="absolute inset-0 bg-black/20" onClick={onClose} aria-hidden />}
            <div className={`absolute inset-y-0 right-0 flex w-full ${isFullscreen ? 'justify-center px-4 sm:px-6 lg:px-12' : 'justify-end'}`}>
                <aside
                    className={`relative h-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
                        isFullscreen ? 'w-full max-w-6xl rounded-3xl border border-gray-200' : 'w-full max-w-3xl border-l border-gray-200'
                    } ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
                >
                    <div className={`flex items-start justify-between border-b border-gray-100 ${horizontalPadding} py-4`}>
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.35em] text-gray-400">Research Copilot</p>
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
                            <button
                                onClick={handleSendAllToEditor}
                                disabled={!canSendToEditor}
                                className={`inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-semibold transition ${
                                    canSendToEditor ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'
                                }`}
                            >
                                <Send size={14} /> Send to doc
                            </button>
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
                                        <Loader2 className="h-4 w-4 animate-spin" />
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
                                <Loader2 className="h-5 w-5 animate-spin" />
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
                </aside>
            </div>
        </div>
    );
};
