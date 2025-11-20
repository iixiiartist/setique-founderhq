import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { Editor } from '@tiptap/react';
import {
  AlertTriangle,
  BookOpenText,
  CheckCircle2,
  Globe,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react';
import { DOC_TYPE_ICONS, DOC_TYPE_LABELS } from '../../constants';
import type { DocType, DashboardData, BusinessProfile } from '../../types';
import type { AIWorkspaceContext } from '../../hooks/useAIWorkspaceContext';
import { getAiResponse, type Content, type GenerateContentResponse } from '../../services/groqService';
import { searchWeb } from '@/src/lib/services/youSearchService';
import type { YouSearchImageResult, YouSearchResponse } from '@/src/lib/services/youSearch.types';

interface Position {
  top: number;
  left: number;
}

interface ToneOption {
  id: string;
  label: string;
  helper: string;
}

interface FormatOption {
  id: string;
  label: string;
  helper: string;
  instruction: string;
}

interface SelectionState {
  text: string;
  range: { from: number; to: number } | null;
  wordCount: number;
}

interface AICommandPaletteProps {
  editor: Editor;
  position: Position;
  onClose: () => void;
  workspaceContext: AIWorkspaceContext;
  docType: DocType;
  data: DashboardData;
  docTitle: string;
  workspaceName: string | null;
  tags: string[];
}

const QUICK_ACTIONS = [
  'Summarize this for an investor update',
  'Rewrite to be more concise and active',
  'Create bullet action items with owners and dates',
  'Draft a follow-up email referencing this section',
  'Highlight risks, blockers, and next steps',
  'Translate this into a customer-facing snippet',
];

const DOC_TYPE_SUGGESTIONS: Partial<Record<DocType, string[]>> = {
  campaign: [
    'Draft a launch announcement for this campaign',
    'Outline paid + organic channels with KPIs',
    'Create experiment ideas with success metrics',
  ],
  brief: [
    'Turn this into an executive-ready GTM brief',
    'Pull out the 3 must-win moments from this brief',
  ],
  battlecard: [
    'List differentiators vs top competitor',
    'Rewrite objection handling for an AE call',
  ],
  outbound_template: [
    'Create a 4-touch outbound sequence',
    'Rewrite this template for a CFO buyer',
  ],
  persona: [
    'Summarize pains, triggers, and desired outcomes',
    'Turn persona insights into talk-track bullets',
  ],
  competitive_snapshot: [
    'Create a TL;DR of competitive threats',
    'Write board-ready notes on this competitor',
  ],
};

const TONE_OPTIONS: ToneOption[] = [
  { id: 'neutral', label: 'Neutral', helper: 'Default balanced voice' },
  { id: 'friendly', label: 'Friendly', helper: 'Warmer copy, conversational' },
  { id: 'authoritative', label: 'Authoritative', helper: 'Confident, exec-ready' },
  { id: 'bold', label: 'Bold', helper: 'Energetic, launch-ready language' },
  { id: 'urgent', label: 'Urgent', helper: 'Time-sensitive CTA focus' },
];

const FORMAT_OPTIONS: FormatOption[] = [
  { id: 'auto', label: 'Auto', helper: 'Let AI pick the format', instruction: '' },
  {
    id: 'bullets',
    label: 'Bullets',
    helper: 'Short bullets with emojis allowed',
    instruction: 'Respond as a bulleted list. Each bullet must start with an emoji + bold heading.',
  },
  {
    id: 'summary',
    label: 'Exec summary',
    helper: '2-3 tight paragraphs',
    instruction: 'Respond with two concise paragraphs targeted at busy executives.',
  },
  {
    id: 'actions',
    label: 'Action plan',
    helper: 'Numbered with owners/dates',
    instruction: 'Respond with a numbered action plan. Each line must include owner, due date, and success metric.',
  },
  {
    id: 'table',
    label: 'Table',
    helper: 'Markdown table output',
    instruction: 'Return a Markdown table comparing options with columns: Item, Summary, Owner, Due date, Source.',
  },
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const selectionToSnippet = (selection: SelectionState): string => {
  if (!selection.text) {
    return 'The user has no selection and wants net-new content at the cursor.';
  }
  return `The user highlighted the following section (${selection.wordCount} words). Rewrite or extend it:\n"""${selection.text}"""`;
};

const summarizeBusinessProfile = (profile?: BusinessProfile | null): string => {
  if (!profile) {
    return 'No business profile provided. Assume an early-stage B2B SaaS team unless noted.';
  }

  const parts: string[] = [];
  parts.push(`${profile.companyName} • ${profile.industry ?? 'Industry N/A'} • ${profile.growthStage ?? 'stage unknown'}`);
  if (profile.targetMarket) parts.push(`Target market: ${profile.targetMarket}`);
  if (profile.valueProposition) parts.push(`Value prop: ${profile.valueProposition}`);
  if (profile.primaryGoal) parts.push(`Primary goal: ${profile.primaryGoal}`);
  if (profile.keyChallenges) parts.push(`Challenges: ${profile.keyChallenges}`);
  if (profile.uniqueDifferentiators) parts.push(`Differentiators: ${profile.uniqueDifferentiators}`);
  if (profile.competitors?.length) parts.push(`Competitors: ${profile.competitors.join(', ')}`);
  return parts.join('\n');
};

const buildRelatedDocsSnippet = (workspaceContext: AIWorkspaceContext): string => {
  if (!workspaceContext.relatedDocs?.length) {
    return 'No related docs available.';
  }
  const list = workspaceContext.relatedDocs
    .slice(0, 3)
    .map((doc, index) => `${index + 1}. ${doc.title} (${doc.docType}) • tags: ${(doc.tags || []).join(', ')}`)
    .join('\n');
  return `Related docs for quick context:\n${list}`;
};

const buildDocMetaSnippet = (
  docTitle: string,
  docType: DocType,
  tags: string[],
  workspaceName: string | null,
): string => {
  const label = DOC_TYPE_LABELS[docType] ?? docType;
  const icon = DOC_TYPE_ICONS[docType] ?? '📝';
  return `${icon} Document: ${docTitle || 'Untitled'} (type: ${label}) in workspace ${workspaceName ?? 'Unknown workspace'}.\nTags: ${
    tags.length ? tags.join(', ') : 'none provided.'
  }`;
};

const formatResearchForPrompt = (results: YouSearchResponse | null): string => {
  if (!results?.hits?.length) return '';
  const snippets = results.hits.slice(0, 5).map((hit, index) => {
    const source = hit.source ? `${hit.source} • ` : '';
    return `[${index + 1}] ${hit.title ?? hit.url}\n${source}${hit.description ?? ''}\n${hit.url}`;
  });
  return `WEB SEARCH RESULTS (cite as [n]):\n${snippets.join('\n\n')}`;
};

const buildSystemPrompt = (docType: DocType, workspaceName: string | null): string => {
  const label = DOC_TYPE_LABELS[docType] ?? docType;
  return `You are Setique's embedded GTM writing copilot for workspace ${workspaceName ?? 'Unknown'}. You specialize in ${label} documents.\n- Preserve factual accuracy and cite any external research inline using [n].\n- Never hallucinate data, companies, or metrics.\n- Maintain inclusive, bias-free language.\n- When text is highlighted, assume the user wants that exact section improved unless they say otherwise.\n- Prefer Markdown-friendly output that pastes cleanly into TipTap.`;
};

const extractModelText = (response: GenerateContentResponse): string => {
  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts?.length) {
    return '';
  }
  const textPart = candidate.content.parts.find((part) => 'text' in part && typeof part.text === 'string');
  return textPart?.text?.trim() ?? '';
};

const buildDocDataSummary = (docType: DocType, data: DashboardData): string => {
  switch (docType) {
    case 'campaign': {
      const campaigns = data.marketing ?? [];
      return `Marketing snapshot: ${campaigns.length} active initiatives. Recent campaign: ${campaigns[0]?.name ?? 'N/A'}.`;
    }
    case 'battlecard': {
      const competitors = data.businessProfile?.competitors ?? [];
      return `Known competitors: ${competitors.length ? competitors.join(', ') : 'not captured yet.'}`;
    }
    case 'persona': {
      const personas = data.productsServices ?? [];
      return `Products/Services tracked: ${personas.length}. Use job-to-be-done framing when possible.`;
    }
    default:
      return `Workspace has ${data.documents?.length ?? 0} shared documents and ${data.productsServicesTasks?.length ?? 0} GTM tasks.`;
  }
};

const buildResearchQuery = (
  promptValue: string,
  selection: string,
  docTitle: string,
  docType: DocType,
  workspaceName: string | null,
): string => {
  const keywords: string[] = [];
  if (workspaceName) keywords.push(workspaceName);
  keywords.push(DOC_TYPE_LABELS[docType] ?? docType);
  keywords.push(docTitle || 'GTM doc');
  if (selection) {
    keywords.push(selection.split(/\s+/).slice(0, 12).join(' '));
  }
  keywords.push(promptValue);
  return keywords.join(' ').slice(0, 240).trim();
};

export const AICommandPalette: React.FC<AICommandPaletteProps> = ({
  editor,
  position,
  onClose,
  workspaceContext,
  docType,
  data,
  docTitle,
  workspaceName,
  tags,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [clampedPosition, setClampedPosition] = useState<Position>({ top: position.top, left: position.left });
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<ToneOption>(TONE_OPTIONS[0]);
  const [formatOption, setFormatOption] = useState<FormatOption>(FORMAT_OPTIONS[0]);
  const [selection, setSelection] = useState<SelectionState>({ text: '', range: null, wordCount: 0 });
  const [insertMode, setInsertMode] = useState<'replace' | 'append'>('replace');
  const [webResearch, setWebResearch] = useState<YouSearchResponse | null>(null);
  const [isFetchingResearch, setIsFetchingResearch] = useState(false);
  const [researchError, setResearchError] = useState<string | null>(null);
  const [autoResearch, setAutoResearch] = useState(true);
  const [imageResults, setImageResults] = useState<YouSearchImageResult[]>([]);
  const [isFetchingImages, setIsFetchingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasSeededPrompt = useRef(false);

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;

    const updatePosition = () => {
      const node = containerRef.current;
      const width = node?.offsetWidth ?? 440;
      const height = node?.offsetHeight ?? 360;
      const margin = 16;
      const scrollY = window.scrollY || 0;
      const scrollX = window.scrollX || 0;
      const viewportTop = position.top - scrollY;
      const viewportLeft = position.left - scrollX;
      const maxLeft = window.innerWidth - width - margin;
      const maxTop = window.innerHeight - height - margin;
      setClampedPosition({
        top: clamp(viewportTop, margin, Math.max(margin, maxTop)),
        left: clamp(viewportLeft, margin, Math.max(margin, maxLeft)),
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [position.left, position.top]);

  useEffect(() => {
    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      const text = editor.state.doc.textBetween(from, to, ' ');
      setSelection({
        text: text.trim(),
        range: from === to ? null : { from, to },
        wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
      });
      if (!hasSeededPrompt.current) {
        const docPrompt = DOC_TYPE_SUGGESTIONS[docType]?.[0] ?? QUICK_ACTIONS[0];
        setPrompt(text.trim() ? `Improve this section: ${text.trim()}` : docPrompt);
        hasSeededPrompt.current = true;
      }
    };

    updateSelection();
    editor.on('selectionUpdate', updateSelection);
    return () => {
      editor.off('selectionUpdate', updateSelection);
    };
  }, [docType, editor]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const docSummary = useMemo(() => buildDocDataSummary(docType, data), [data, docType]);

  const fetchResearch = useCallback(
    async (mode: 'manual' | 'auto' | 'inline' = 'manual'): Promise<YouSearchResponse | null> => {
      const basePrompt = prompt.trim();
      if (!basePrompt) {
        if (mode === 'manual') setResearchError('Enter a prompt before running research.');
        return null;
      }
      const query = buildResearchQuery(basePrompt, selection.text, docTitle, docType, workspaceName);
      setIsFetchingResearch(true);
      setResearchError(null);
      try {
        const results = await searchWeb(query, 'search', { count: 5 });
        setWebResearch(results);
        return results;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to fetch research.';
        setResearchError(message);
        if (mode === 'inline') {
          throw new Error(message);
        }
        return null;
      } finally {
        setIsFetchingResearch(false);
      }
    },
    [docTitle, docType, prompt, selection.text, workspaceName],
  );

  useEffect(() => {
    if (!autoResearch || webResearch || !prompt.trim()) return;
    fetchResearch('auto').catch(() => undefined);
  }, [autoResearch, fetchResearch, prompt, webResearch]);

  const handleFetchImages = useCallback(async () => {
    const basePrompt = prompt.trim() || selection.text;
    if (!basePrompt) {
      setImageError('Provide a prompt or select text before fetching images.');
      return;
    }
    const query = `${docTitle} ${DOC_TYPE_LABELS[docType] ?? docType} reference`;
    setIsFetchingImages(true);
    setImageError(null);
    try {
      const payload = await searchWeb(query, 'images', { count: 6 });
      setImageResults(payload.images ?? []);
    } catch (error) {
      setImageError(error instanceof Error ? error.message : 'Unable to fetch images');
    } finally {
      setIsFetchingImages(false);
    }
  }, [docTitle, docType, prompt, selection.text]);

  const insertImage = useCallback(
    (image: YouSearchImageResult) => {
      if (!image.imageUrl) return;
      editor.chain().focus().setResizableImage({ src: image.imageUrl, alt: image.title ?? 'Reference image' }).run();
      setStatusMessage('Inserted reference image.');
    },
    [editor],
  );

  const runPrompt = useCallback(
    async (overridePrompt?: string) => {
      const effectivePrompt = (overridePrompt ?? prompt).trim();
      if (!effectivePrompt) {
        setErrorMessage('Please enter a prompt.');
        return;
      }
      setIsSubmitting(true);
      setStatusMessage(null);
      setErrorMessage(null);

      let researchSnippet = '';
      if (autoResearch) {
        try {
          const existing = webResearch ?? (await fetchResearch('inline'));
          researchSnippet = formatResearchForPrompt(existing);
        } catch (error) {
          setErrorMessage(error instanceof Error ? error.message : 'Research failed, continuing without it.');
        }
      }

      const userContext = [
        `Task: ${effectivePrompt}`,
        selectionToSnippet(selection),
        buildDocMetaSnippet(docTitle, docType, tags, workspaceName),
        summarizeBusinessProfile(workspaceContext.businessProfile),
        buildRelatedDocsSnippet(workspaceContext),
        docSummary,
        tone.id !== 'neutral' ? `Tone: ${tone.label}. ${tone.helper}` : '',
        formatOption.instruction ? `Format instruction: ${formatOption.instruction}` : '',
        researchSnippet,
        'Return Markdown-safe output. Cite research sources inline (e.g., [1]).',
      ]
        .filter(Boolean)
        .join('\n\n');

      const history: Content[] = [
        {
          role: 'user',
          parts: [{ text: userContext }],
        },
      ];

      try {
        const aiResponse = await getAiResponse(history, buildSystemPrompt(docType, workspaceName), false, workspaceContext.workspaceId);
        const text = extractModelText(aiResponse);
        if (!text) {
          throw new Error('AI returned an empty response.');
        }
        editor.chain().focus();
        if (insertMode === 'replace' && selection.range) {
          editor.commands.insertContentAt(selection.range, text);
        } else {
          editor.commands.insertContent(`\n${text}\n`);
        }
        setStatusMessage('✨ Inserted AI output');
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Failed to generate response.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      autoResearch,
      docSummary,
      docTitle,
      docType,
      editor,
      fetchResearch,
      formatOption.instruction,
      insertMode,
      prompt,
      selection,
      tags,
      tone.helper,
      tone.id,
      tone.label,
      webResearch,
      workspaceContext,
      workspaceName,
    ],
  );

  const suggestionPills = useMemo(() => {
    const docSpecific = DOC_TYPE_SUGGESTIONS[docType] ?? [];
    return [...docSpecific, ...QUICK_ACTIONS].slice(0, 6);
  }, [docType]);

  return (
    <div className="fixed inset-0 z-[120] pointer-events-none">
      <div
        ref={containerRef}
        className="pointer-events-auto absolute w-[min(560px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl"
        style={{ top: clampedPosition.top, left: clampedPosition.left }}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">AI command palette</p>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
              <span className="text-lg">{DOC_TYPE_ICONS[docType] ?? '✨'}</span>
              <span>{DOC_TYPE_LABELS[docType] ?? docType}</span>
              <span className="text-slate-300">•</span>
              <span>{workspaceName ?? 'Workspace'}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Close AI command palette"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="rounded-xl border border-slate-200 bg-white/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-600">Prompt</label>
              <div className="flex items-center gap-2 text-[11px] text-slate-400">
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${
                    insertMode === 'replace' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                  onClick={() => setInsertMode('replace')}
                >
                  Rewrite
                </button>
                <button
                  type="button"
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${
                    insertMode === 'append' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                  onClick={() => setInsertMode('append')}
                >
                  Append
                </button>
              </div>
            </div>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              className="mt-2 h-28 w-full resize-none rounded-lg border border-slate-200 bg-white/70 p-3 text-sm text-slate-800 outline-none focus:border-slate-400"
              placeholder="Ask the AI to improve this section or create something new..."
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {suggestionPills.map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => runPrompt(pill)}
                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Tone</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {TONE_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`rounded-lg border px-3 py-1 text-xs ${
                      tone.id === option.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-transparent bg-white text-slate-600 shadow'
                    }`}
                    onClick={() => setTone(option)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Format</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {FORMAT_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`rounded-lg border px-3 py-1 text-xs ${
                      formatOption.id === option.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-transparent bg-white text-slate-600 shadow'
                    }`}
                    onClick={() => setFormatOption(option)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Globe size={16} />
                <span>Live research</span>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500">
                <span>{autoResearch ? 'On' : 'Off'}</span>
                <div
                  className={`relative h-5 w-9 rounded-full transition ${autoResearch ? 'bg-slate-900' : 'bg-slate-300'}`}
                  onClick={() => setAutoResearch((prev) => !prev)}
                >
                  <span
                    className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 transform rounded-full bg-white shadow transition ${
                      autoResearch ? 'translate-x-4' : 'translate-x-1'
                    }`}
                  />
                </div>
              </label>
            </div>
            <p className="mt-1 text-xs text-slate-500">Pull 3-5 fresh sources from the web and cite them inline.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"
                onClick={() => fetchResearch('manual')}
                disabled={isFetchingResearch}
              >
                {isFetchingResearch ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Refresh sources
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"
                onClick={handleFetchImages}
                disabled={isFetchingImages}
              >
                {isFetchingImages ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}
                Reference images
              </button>
            </div>
            {researchError && (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <AlertTriangle size={14} />
                {researchError}
              </div>
            )}
            {webResearch?.hits?.length ? (
              <div className="mt-3 space-y-2 text-xs text-slate-600">
                {webResearch.hits.slice(0, 3).map((hit, index) => (
                  <div key={hit.url ?? index} className="rounded-lg border border-slate-200/70 bg-white/70 p-2">
                    <p className="font-semibold text-slate-700">[{index + 1}] {hit.title ?? 'Untitled source'}</p>
                    <p className="line-clamp-2 text-slate-500">{hit.description}</p>
                    <p className="mt-1 text-[11px] text-slate-400">{hit.source ?? hit.url}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          {imageResults.length > 0 && (
            <div className="rounded-xl border border-slate-200/80 bg-white/60 p-3">
              <div className="flex itemsender etc...import React, {import React, {import React, {import React, {// temporary marker

  useCallback,

  useEffect,  useCallback,

  useLayoutEffect,

  useMemo,  useEffect,  useCallback,

  useRef,

  useState,  useLayoutEffect,

} from 'react';

import type { Editor } from '@tiptap/react';  useMemo,  useEffect,  useState,import React, { useState, useEffect, useRef, useMemo, useCallback, useLayoutEffect } from 'react';

import {

  AlertTriangle,  useRef,

  BookOpenText,

  CheckCircle2,  useState,  useLayoutEffect,

  Globe,

  Image as ImageIcon,} from 'react';

  Loader2,

  RefreshCw,import type { Editor } from '@tiptap/react';  useMemo,  useEffect,import { Editor } from '@tiptap/react';

  Sparkles,

  X,import {

} from 'lucide-react';

import { DOC_TYPE_ICONS, DOC_TYPE_LABELS } from '../../constants';  AlertTriangle,  useRef,

import type { DocType, DashboardData, BusinessProfile } from '../../types';

import type { AIWorkspaceContext } from '../../hooks/useAIWorkspaceContext';  BookOpenText,

import { getAiResponse, type Content, type GenerateContentResponse } from '../../services/groqService';

import { searchWeb } from '@/src/lib/services/youSearchService';  CheckCircle2,  useState,  useRef,import { DocType, DashboardData } from '../../types';

import type { YouSearchImageResult, YouSearchResponse } from '@/src/lib/services/youSearch.types';

  Globe,

interface Position {

  top: number;  Image as ImageIcon,} from 'react';

  left: number;

}  Loader2,



interface ToneOption {  RefreshCw,import type { Editor } from '@tiptap/react';  useMemo,import { DOC_TYPE_LABELS } from '../../constants';

  id: string;

  label: string;  Sparkles,

  helper: string;

}  Wand2,import {



interface FormatOption {  X,

  id: string;

  label: string;} from 'lucide-react';  AlertTriangle,  useCallback,import { AIWorkspaceContext } from '../../hooks/useAIWorkspaceContext';

  helper: string;

  instruction: string;import { DOC_TYPE_ICONS, DOC_TYPE_LABELS } from '../../constants';

}

import type { DocType, DashboardData, BusinessProfile } from '../../types';  BookOpenText,

interface SelectionState {

  text: string;import type { AIWorkspaceContext } from '../../hooks/useAIWorkspaceContext';

  range: { from: number; to: number } | null;

  wordCount: number;import { getAiResponse, type Content, type GenerateContentResponse } from '../../services/groqService';  CheckCircle2,  useLayoutEffect,import { getAiResponse } from '../../services/groqService';

}

import { searchWeb } from '@/src/lib/services/youSearchService';

interface AICommandPaletteProps {

  editor: Editor;import type { YouSearchImageResult, YouSearchResponse } from '@/src/lib/services/youSearch.types';  Globe,

  position: Position;

  onClose: () => void;

  workspaceContext: AIWorkspaceContext;

  docType: DocType;interface Position {  Image as ImageIcon,} from 'react';import { searchWeb } from '@/src/lib/services/youSearchService';

  data: DashboardData;

  docTitle: string;  top: number;

  workspaceName: string | null;

  tags: string[];  left: number;  Loader2,

}

}

const QUICK_ACTIONS = [

  'Summarize this for an investor update',  RefreshCw,import { Editor } from '@tiptap/react';import type { YouSearchImageResult, YouSearchMetadata } from '@/src/lib/services/youSearch.types';

  'Rewrite to be more concise and active',

  'Create bullet action items with owners and dates',interface ToneOption {

  'Draft a follow-up email referencing this section',

  'Highlight risks, blockers, and next steps',  id: string;  Sparkles,

  'Translate this into a customer-facing snippet',

];  label: string;



const DOC_TYPE_SUGGESTIONS: Partial<Record<DocType, string[]>> = {  helper: string;  Wand2,import { DocType, DashboardData } from '../../types';

  campaign: [

    'Draft a launch announcement for this campaign',}

    'Outline paid + organic channels with KPIs',

    'Create experiment ideas with success metrics',  X,

  ],

  brief: [interface FormatOption {

    'Turn this into an executive-ready GTM brief',

    'Pull out the 3 must-win moments from this brief',  id: string;} from 'lucide-react';import { DOC_TYPE_LABELS } from '../../constants';// Helper to extract text from AI response

  ],

  battlecard: [  label: string;

    'List differentiators vs top competitor',

    'Rewrite objection handling for an AE call',  helper: string;import { DOC_TYPE_ICONS, DOC_TYPE_LABELS } from '../../constants';

  ],

  outbound_template: [  instruction: string;

    'Create a 4-touch outbound sequence',

    'Rewrite this template for a CFO buyer',}import type { DocType, DashboardData, BusinessProfile } from '../../types';import { AIWorkspaceContext } from '../../hooks/useAIWorkspaceContext';function extractTextFromResponse(response: any): string {

  ],

  persona: [

    'Summarize pains, triggers, and desired outcomes',

    'Turn persona insights into talk-track bullets',interface SelectionState {import type { AIWorkspaceContext } from '../../hooks/useAIWorkspaceContext';

  ],

  competitive_snapshot: [  text: string;

    'Create a TL;DR of competitive threats',

    'Write board-ready notes on this competitor',  range: { from: number; to: number } | null;import { getAiResponse, type Content, type GenerateContentResponse } from '../../services/groqService';import { getAiResponse } from '../../services/groqService';  if (!response.candidates || response.candidates.length === 0) {

  ],

};  wordCount: number;



const TONE_OPTIONS: ToneOption[] = [}import { searchWeb } from '@/src/lib/services/youSearchService';

  { id: 'neutral', label: 'Neutral', helper: 'Default balanced voice' },

  { id: 'friendly', label: 'Friendly', helper: 'Warmer copy, conversational' },

  { id: 'authoritative', label: 'Authoritative', helper: 'Confident, exec-ready' },

  { id: 'bold', label: 'Bold', helper: 'Energetic, launch-ready language' },interface AICommandPaletteProps {import type { YouSearchImageResult, YouSearchResponse } from '@/src/lib/services/youSearch.types';import { searchWeb } from '@/src/lib/services/youSearchService';    throw new Error('No response from AI');

  { id: 'urgent', label: 'Urgent', helper: 'Time-sensitive CTA focus' },

];  editor: Editor;



const FORMAT_OPTIONS: FormatOption[] = [  position: Position;

  { id: 'auto', label: 'Auto', helper: 'Let AI pick the format', instruction: '' },

  {  onClose: () => void;

    id: 'bullets',

    label: 'Bullets',  workspaceContext: AIWorkspaceContext;interface Position {import type { YouSearchImageResult, YouSearchMetadata } from '@/src/lib/services/youSearch.types';  }

    helper: 'Short bullets with emojis allowed',

    instruction: 'Respond as a bulleted list. Each bullet must start with an emoji + bold heading.',  docType: DocType;

  },

  {  data: DashboardData;  top: number;

    id: 'summary',

    label: 'Exec summary',  docTitle: string;

    helper: '2-3 tight paragraphs',

    instruction: 'Respond with two concise paragraphs targeted at busy executives.',  workspaceName: string | null;  left: number;  

  },

  {  tags: string[];

    id: 'actions',

    label: 'Action plan',}}

    helper: 'Numbered with owners/dates',

    instruction: 'Respond with a numbered action plan. Each line must include owner, due date, and success metric.',

  },

  {const QUICK_ACTIONS = [function extractTextFromResponse(response: any): string {  const candidate = response.candidates[0];

    id: 'table',

    label: 'Table',  'Summarize this for an investor update',

    helper: 'Markdown table output',

    instruction: 'Return a Markdown table comparing options with columns: Item, Summary, Owner, Due date, Source.',  'Rewrite to be more concise and active',interface ToneOption {

  },

];  'Create bullet action items with owners and dates',



const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);  'Draft a follow-up email that references this section',  id: string;  if (!response.candidates || response.candidates.length === 0) {  const parts = candidate.content.parts;



const selectionToSnippet = (selection: SelectionState): string => {  'Highlight risks, blockers, and next steps',

  if (!selection.text) {

    return 'The user has no selection and wants net-new content at the cursor.';  'Translate this into a customer-facing snippet',  label: string;

  }

  return `The user highlighted the following section (${selection.wordCount} words). Rewrite or extend it:\n"""${selection.text}"""`;];

};

  helper: string;    throw new Error('No response from AI');  

const summarizeBusinessProfile = (profile?: BusinessProfile | null): string => {

  if (!profile) {const DOC_TYPE_SUGGESTIONS: Partial<Record<DocType, string[]>> = {

    return 'No business profile provided. Assume an early-stage B2B SaaS team unless noted.';

  }  campaign: [}



  const parts: string[] = [];    'Draft a launch announcement for this campaign',

  parts.push(`${profile.companyName} • ${profile.industry ?? 'Industry N/A'} • ${profile.growthStage ?? 'stage unknown'}`);

  if (profile.targetMarket) parts.push(`Target market: ${profile.targetMarket}`);    'Outline paid + organic channels with KPIs',  }  if (!parts || parts.length === 0) {

  if (profile.valueProposition) parts.push(`Value prop: ${profile.valueProposition}`);

  if (profile.primaryGoal) parts.push(`Primary goal: ${profile.primaryGoal}`);    'Create experiment ideas for this campaign',

  if (profile.keyChallenges) parts.push(`Challenges: ${profile.keyChallenges}`);

  if (profile.uniqueDifferentiators) parts.push(`Differentiators: ${profile.uniqueDifferentiators}`);  ],interface FormatOption {

  if (profile.competitors?.length) parts.push(`Competitors: ${profile.competitors.join(', ')}`);

  return parts.join('\n');  brief: [

};

    'Turn this into an executive-ready GTM brief',  id: string;    throw new Error('No content in AI response');

const buildRelatedDocsSnippet = (workspaceContext: AIWorkspaceContext): string => {

  if (!workspaceContext.relatedDocs?.length) {    'Pull out the 3 must-win moments from this brief',

    return 'No related docs available.';

  }  ],  label: string;

  const list = workspaceContext.relatedDocs

    .slice(0, 3)  battlecard: [

    .map((doc, index) => `${index + 1}. ${doc.title} (${doc.docType}) • tags: ${(doc.tags || []).join(', ')}`)

    .join('\n');    'List differentiators vs top competitor',  helper: string;  const candidate = response.candidates[0];  }

  return `Related docs for quick context:\n${list}`;

};    'Rewrite objection handling for an AE call',



const buildDocMetaSnippet = (  ],  instruction: string;

  docTitle: string,

  docType: DocType,  outbound_template: [

  tags: string[],

  workspaceName: string | null,    'Create a 4-touch outbound sequence',}  const parts = candidate.content.parts;  

): string => {

  const label = DOC_TYPE_LABELS[docType] ?? docType;    'Rewrite this template for CFO buyer',

  const icon = DOC_TYPE_ICONS[docType] ?? '📝';

  return `${icon} Document: ${docTitle || 'Untitled'} (type: ${label}) in workspace ${workspaceName ?? 'Unknown workspace'}.\nTags: ${  ],

    tags.length ? tags.join(', ') : 'none provided.'

  }`;  persona: [

};

    'Summarize pains, triggers, and desired outcomes',interface SelectionState {  // Extract text from parts

const formatResearchForPrompt = (results: YouSearchResponse | null): string => {

  if (!results?.hits?.length) return '';    'Turn persona insights into talk-track bullets',

  const snippets = results.hits.slice(0, 5).map((hit, index) => {

    const source = hit.source ? `${hit.source} • ` : '';  ],  text: string;

    return `[${index + 1}] ${hit.title ?? hit.url}\n${source}${hit.description ?? ''}\n${hit.url}`;

  });  competitive_snapshot: [

  return `WEB SEARCH RESULTS (cite as [n]):\n${snippets.join('\n\n')}`;

};    'Create a TL;DR of competitive threats',  range: { from: number; to: number } | null;  if (!parts || parts.length === 0) {  const textParts = parts



const buildSystemPrompt = (docType: DocType, workspaceName: string | null): string => {    'Write board-ready notes on this competitor',

  const label = DOC_TYPE_LABELS[docType] ?? docType;

  return `You are Setique's embedded GTM writing copilot for workspace ${workspaceName ?? 'Unknown'}. You specialize in ${label} documents.\n- Preserve factual accuracy and cite any external research inline using [n].\n- Never hallucinate data, companies, or metrics.\n- Maintain inclusive, bias-free language.\n- When text is highlighted, assume the user wants that exact section improved unless they say otherwise.\n- Prefer Markdown-friendly output that pastes cleanly into TipTap.`;  ],  wordCount: number;

};

};

const extractModelText = (response: GenerateContentResponse): string => {

  const candidate = response.candidates?.[0];}    throw new Error('No content in AI response');    .filter((part: any) => part.text)

  if (!candidate?.content?.parts?.length) {

    return '';const TONE_OPTIONS: ToneOption[] = [

  }

  const textPart = candidate.content.parts.find((part) => 'text' in part && typeof part.text === 'string');  { id: 'neutral', label: 'Neutral', helper: 'Default balanced voice' },

  return textPart?.text?.trim() ?? '';

};  { id: 'friendly', label: 'Friendly', helper: 'Warmer copy, conversational' },



const buildDocDataSummary = (docType: DocType, data: DashboardData): string => {  { id: 'authoritative', label: 'Authoritative', helper: 'Confident, executive-ready' },interface AICommandPaletteProps {  }    .map((part: any) => part.text)

  switch (docType) {

    case 'campaign': {  { id: 'bold', label: 'Bold', helper: 'Energetic, launch-ready language' },

      const campaigns = data.marketing ?? [];

      return `Marketing snapshot: ${campaigns.length} active initiatives. Recent campaign: ${campaigns[0]?.name ?? 'N/A'}.`;  { id: 'urgent', label: 'Urgent', helper: 'Time-sensitive CTA focus' },  editor: Editor;

    }

    case 'battlecard': {];

      const competitors = data.businessProfile?.competitors ?? [];

      return `Known competitors: ${competitors.length ? competitors.join(', ') : 'not captured yet.'}`;  position: Position;    .join('\n');

    }

    case 'persona': {const FORMAT_OPTIONS: FormatOption[] = [

      const personas = data.productsServices ?? [];

      return `Products/Services tracked: ${personas.length}. Use job-to-be-done framing when possible.`;  { id: 'auto', label: 'Auto', helper: 'Let AI pick the best format', instruction: '' },  onClose: () => void;

    }

    default:  {

      return `Workspace has ${data.documents?.length ?? 0} shared documents and ${data.productsServicesTasks?.length ?? 0} GTM tasks.`;

  }    id: 'bullets',  workspaceContext: AIWorkspaceContext;  const textParts = parts  

};

    label: 'Bullets',

const buildResearchQuery = (

  promptValue: string,    helper: 'Short bullet list with emojis allowed',  docType: DocType;

  selection: string,

  docTitle: string,    instruction: 'Respond as a bulleted list. Each bullet must start with an emoji + bold heading.',

  docType: DocType,

  workspaceName: string | null,  },  data: DashboardData;    .filter((part: any) => part.text)  return textParts || '';

): string => {

  const keywords: string[] = [];  {

  if (workspaceName) keywords.push(workspaceName);

  keywords.push(DOC_TYPE_LABELS[docType] ?? docType);    id: 'summary',  docTitle: string;

  keywords.push(docTitle || 'GTM doc');

  if (selection) {    label: 'Exec summary',

    keywords.push(selection.split(/\s+/).slice(0, 12).join(' '));

  }    helper: '2-3 tight paragraphs',  workspaceName: string | null;    .map((part: any) => part.text)}

  keywords.push(promptValue);

  return keywords.join(' ').slice(0, 240).trim();    instruction: 'Respond with two concise paragraphs targeted at busy executives.',

};

  },  tags: string[];

export const AICommandPalette: React.FC<AICommandPaletteProps> = ({

  editor,  {

  position,

  onClose,    id: 'actions',}    .join('\n');

  workspaceContext,

  docType,    label: 'Action plan',

  data,

  docTitle,    helper: 'Numbered list with owners/dates',

  workspaceName,

  tags,    instruction: 'Respond with a numbered action plan. Each line must include owner, due date, and success metric.',

}) => {

  const containerRef = useRef<HTMLDivElement>(null);  },const QUICK_ACTIONS = [// Convert HTML to clean text for AI context

  const [clampedPosition, setClampedPosition] = useState<Position>({ top: position.top, left: position.left });

  const [prompt, setPrompt] = useState('');  {

  const [tone, setTone] = useState<ToneOption>(TONE_OPTIONS[0]);

  const [formatOption, setFormatOption] = useState<FormatOption>(FORMAT_OPTIONS[0]);    id: 'table',  'Summarize this for an investor update',

  const [selection, setSelection] = useState<SelectionState>({ text: '', range: null, wordCount: 0 });

  const [insertMode, setInsertMode] = useState<'replace' | 'append'>('replace');    label: 'Table',

  const [webResearch, setWebResearch] = useState<YouSearchResponse | null>(null);

  const [isFetchingResearch, setIsFetchingResearch] = useState(false);    helper: 'Markdown table output',  'Rewrite to be more concise and active',  return textParts || '';function htmlToText(html: string): string {

  const [researchError, setResearchError] = useState<string | null>(null);

  const [autoResearch, setAutoResearch] = useState(true);    instruction: 'Return a Markdown table that compares options with columns: Item, Summary, Owner, Due date, Source.',

  const [imageResults, setImageResults] = useState<YouSearchImageResult[]>([]);

  const [isFetchingImages, setIsFetchingImages] = useState(false);  },  'Create bullet action items with owners and dates',

  const [imageError, setImageError] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);];

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);  'Draft a follow-up email that references this section',}  const div = document.createElement('div');

  const hasSeededPrompt = useRef(false);

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

  useLayoutEffect(() => {

    if (typeof window === 'undefined') return;  'Highlight risks, blockers, and next steps',



    const updatePosition = () => {const selectionToSnippet = (selection: SelectionState): string => {

      const node = containerRef.current;

      const width = node?.offsetWidth ?? 440;  if (!selection.text) {  'Translate this into a customer-facing snippet',  div.innerHTML = html;

      const height = node?.offsetHeight ?? 360;

      const margin = 16;    return 'The user has no selection and wants you to add net-new content into the cursor position.';

      const scrollY = window.scrollY || 0;

      const scrollX = window.scrollX || 0;  }];

      const viewportTop = position.top - scrollY;

      const viewportLeft = position.left - scrollX;

      const maxLeft = window.innerWidth - width - margin;

      const maxTop = window.innerHeight - height - margin;  return `The user highlighted the following section (${selection.wordCount} words). Rewrite or extend it:\n"""${selection.text}"""`;function htmlToText(html: string): string {  return div.textContent || div.innerText || '';

      setClampedPosition({

        top: clamp(viewportTop, margin, Math.max(margin, maxTop)),};

        left: clamp(viewportLeft, margin, Math.max(margin, maxLeft)),

      });const DOC_TYPE_SUGGESTIONS: Partial<Record<DocType, string[]>> = {

    };

const summarizeBusinessProfile = (profile?: BusinessProfile | null): string => {

    updatePosition();

    window.addEventListener('resize', updatePosition);  if (!profile) {  campaign: [  const div = document.createElement('div');}

    window.addEventListener('scroll', updatePosition, true);

    return () => {    return 'No business profile was provided. Assume an early-stage B2B startup unless the user says otherwise.';

      window.removeEventListener('resize', updatePosition);

      window.removeEventListener('scroll', updatePosition, true);  }    'Draft a launch announcement for this campaign',

    };

  }, [position.left, position.top]);



  useEffect(() => {  const parts: string[] = [];    'Outline paid + organic channels with KPIs',  div.innerHTML = html;

    const updateSelection = () => {

      const { from, to } = editor.state.selection;  parts.push(`${profile.companyName} • ${profile.industry ?? 'Industry N/A'} • ${profile.growthStage ?? 'stage unknown'}`);

      const text = editor.state.doc.textBetween(from, to, ' ');

      setSelection({  if (profile.targetMarket) parts.push(`Target market: ${profile.targetMarket}`);    'Create experiment ideas for this campaign',

        text: text.trim(),

        range: from === to ? null : { from, to },  if (profile.valueProposition) parts.push(`Value prop: ${profile.valueProposition}`);

        wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,

      });  if (profile.primaryGoal) parts.push(`Primary goal: ${profile.primaryGoal}`);  ],  return div.textContent || div.innerText || '';const escapeHtml = (value: string) =>

      if (!hasSeededPrompt.current) {

        const docPrompt = DOC_TYPE_SUGGESTIONS[docType]?.[0] ?? QUICK_ACTIONS[0];  if (profile.keyChallenges) parts.push(`Challenges: ${profile.keyChallenges}`);

        setPrompt(text.trim() ? `Improve this section: ${text.trim()}` : docPrompt);

        hasSeededPrompt.current = true;  if (profile.uniqueDifferentiators) parts.push(`Differentiators: ${profile.uniqueDifferentiators}`);  brief: [

      }

    };  if (profile.competitors?.length) parts.push(`Competitors: ${profile.competitors.join(', ')}`);



    updateSelection();  return parts.join('\n');    'Turn this into an executive-ready GTM brief',}  value

    editor.on('selectionUpdate', updateSelection);

    return () => {};

      editor.off('selectionUpdate', updateSelection);

    };    'Pull out the 3 must-win moments from this brief',

  }, [docType, editor]);

const buildRelatedDocsSnippet = (workspaceContext: AIWorkspaceContext): string => {

  useEffect(() => {

    const handleKeyDown = (event: KeyboardEvent) => {  if (!workspaceContext.relatedDocs?.length) {  ],    .replace(/&/g, '&amp;')

      if (event.key === 'Escape') {

        event.preventDefault();    return 'No related docs available.';

        onClose();

      }  }  battlecard: [

    };

    document.addEventListener('keydown', handleKeyDown);  const list = workspaceContext.relatedDocs

    return () => document.removeEventListener('keydown', handleKeyDown);

  }, [onClose]);    .slice(0, 3)    'List differentiators vs top competitor',const escapeHtml = (value: string) =>    .replace(/</g, '&lt;')



  useEffect(() => {    .map((doc, index) => `${index + 1}. ${doc.title} (${doc.docType}) • tags: ${(doc.tags || []).join(', ')}`)

    const handleClickOutside = (event: MouseEvent) => {

      if (!containerRef.current) return;    .join('\n');    'Rewrite objection handling for an AE call',

      if (!containerRef.current.contains(event.target as Node)) {

        onClose();  return `Related docs for quick context:\n${list}`;

      }

    };};  ],  value    .replace(/>/g, '&gt;')

    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);

  }, [onClose]);

const buildDocMetaSnippet = (  outbound_template: [

  const docSummary = useMemo(() => buildDocDataSummary(docType, data), [data, docType]);

  docTitle: string,

  const fetchResearch = useCallback(

    async (mode: 'manual' | 'auto' | 'inline' = 'manual'): Promise<YouSearchResponse | null> => {  docType: DocType,    'Create a 4-touch outbound sequence',    .replace(/&/g, '&amp;')    .replace(/"/g, '&quot;')

      const basePrompt = prompt.trim();

      if (!basePrompt) {  tags: string[],

        if (mode === 'manual') setResearchError('Enter a prompt before running research.');

        return null;  workspaceName: string | null,    'Rewrite this template for CFO buyer',

      }

      const query = buildResearchQuery(basePrompt, selection.text, docTitle, docType, workspaceName);): string => {

      setIsFetchingResearch(true);

      setResearchError(null);  const label = DOC_TYPE_LABELS[docType] ?? docType;  ],    .replace(/</g, '&lt;')    .replace(/'/g, '&#39;');

      try {

        const results = await searchWeb(query, 'search', { count: 5 });  const icon = DOC_TYPE_ICONS[docType] ?? '📝';

        setWebResearch(results);

        return results;  return `${icon} Document: ${docTitle || 'Untitled'} (type: ${label}) in workspace ${workspaceName ?? 'Unknown workspace'}.\nTags: ${  persona: [

      } catch (error) {

        const message = error instanceof Error ? error.message : 'Failed to fetch research.';    tags.length ? tags.join(', ') : 'none provided.'

        setResearchError(message);

        if (mode === 'inline') {  }`;    'Summarize pains, triggers, and desired outcomes',    .replace(/>/g, '&gt;')

          throw new Error(message);

        }};

        return null;

      } finally {    'Turn persona insights into talk-track bullets',

        setIsFetchingResearch(false);

      }const formatResearchForPrompt = (results: YouSearchResponse | null): string => {

    },

    [docTitle, docType, prompt, selection.text, workspaceName],  if (!results?.hits?.length) return '';  ],    .replace(/"/g, '&quot;')const normalizeUrl = (value?: string | null) => {

  );

  const snippets = results.hits.slice(0, 5).map((hit, index) => {

  useEffect(() => {

    if (!autoResearch || webResearch || !prompt.trim()) return;    const source = hit.source ? `${hit.source} • ` : '';  competitive_snapshot: [

    fetchResearch('auto').catch(() => undefined);

  }, [autoResearch, fetchResearch, prompt, webResearch]);    return `[${index + 1}] ${hit.title ?? hit.url}\n${source}${hit.description ?? ''}\n${hit.url}`;



  const handleFetchImages = useCallback(async () => {  });    'Create a TL;DR of competitive threats',    .replace(/'/g, '&#39;');  if (!value) return '';

    const basePrompt = prompt.trim() || selection.text;

    if (!basePrompt) {  return `WEB SEARCH RESULTS (cite as [n]):\n${snippets.join('\n\n')}`;

      setImageError('Provide a prompt or select text before fetching images.');

      return;};    'Write board-ready notes on this competitor',

    }

    const query = `${docTitle} ${DOC_TYPE_LABELS[docType] ?? docType} reference`;

    setIsFetchingImages(true);

    setImageError(null);const buildSystemPrompt = (docType: DocType, workspaceName: string | null): string => {  ],  try {

    try {

      const payload = await searchWeb(query, 'images', { count: 6 });  const label = DOC_TYPE_LABELS[docType] ?? docType;

      setImageResults(payload.images ?? []);

    } catch (error) {  return `You are Setique's embedded GTM writing copilot for workspace ${workspaceName ?? 'Unknown'}. You specialize in ${label} documents.\n- Always preserve factual accuracy and cite any external research inline using [n].\n- Never hallucinate data, companies, or metrics.\n- Maintain inclusive, bias-free language.\n- When the user highlights text, assume they want that exact section improved unless they explicitly ask for something else.\n- Prefer Markdown-friendly output that pastes cleanly into TipTap.`;};

      setImageError(error instanceof Error ? error.message : 'Unable to fetch images');

    } finally {};

      setIsFetchingImages(false);

    }const normalizeUrl = (value?: string | null) => {    return new URL(value).toString();

  }, [docTitle, docType, prompt, selection.text]);

const extractModelText = (response: GenerateContentResponse): string => {

  const insertImage = useCallback(

    (image: YouSearchImageResult) => {  const candidate = response.candidates?.[0];const TONE_OPTIONS: ToneOption[] = [

      if (!image.imageUrl) return;

      editor.chain().focus().setResizableImage({ src: image.imageUrl, alt: image.title ?? 'Reference image' }).run();  if (!candidate?.content?.parts?.length) {

      setStatusMessage('Inserted reference image.');

    },    return '';  { id: 'neutral', label: 'Neutral', helper: 'Default balanced voice' },  if (!value) return '';  } catch {

    [editor],

  );  }



  const runPrompt = useCallback(  const textPart = candidate.content.parts.find((part) => 'text' in part && typeof part.text === 'string');  { id: 'friendly', label: 'Friendly', helper: 'Warmer copy, conversational' },

    async (overridePrompt?: string) => {

      const effectivePrompt = (overridePrompt ?? prompt).trim();  return textPart?.text?.trim() ?? '';

      if (!effectivePrompt) {

        setErrorMessage('Please enter a prompt.');};  { id: 'authoritative', label: 'Authoritative', helper: 'Confident, executive-ready' },  try {    try {

        return;

      }

      setIsSubmitting(true);

      setStatusMessage(null);const buildDocDataSummary = (docType: DocType, data: DashboardData): string => {  { id: 'bold', label: 'Bold', helper: 'Energetic, launch-ready language' },

      setErrorMessage(null);

  switch (docType) {

      let researchSnippet = '';

      if (autoResearch) {    case 'campaign': {  { id: 'urgent', label: 'Urgent', helper: 'Time-sensitive CTA focus' },    return new URL(value).toString();      return new URL(`https://${value}`).toString();

        try {

          const existing = webResearch ?? (await fetchResearch('inline'));      const campaigns = data.marketing ?? [];

          researchSnippet = formatResearchForPrompt(existing);

        } catch (error) {      return `Marketing snapshot: ${campaigns.length} active initiatives. Recent campaign: ${campaigns[0]?.name ?? 'N/A'}.`;];

          setErrorMessage(error instanceof Error ? error.message : 'Research failed, continuing without it.');

        }    }

      }

    case 'battlecard': {  } catch {    } catch {

      const userContext = [

        `Task: ${effectivePrompt}`,      const competitors = data.businessProfile?.competitors ?? [];

        selectionToSnippet(selection),

        buildDocMetaSnippet(docTitle, docType, tags, workspaceName),      return `Known competitors: ${competitors.length ? competitors.join(', ') : 'not captured yet.'}`;const FORMAT_OPTIONS: FormatOption[] = [

        summarizeBusinessProfile(workspaceContext.businessProfile),

        buildRelatedDocsSnippet(workspaceContext),    }

        docSummary,

        tone.id !== 'neutral' ? `Tone: ${tone.label}. ${tone.helper}` : '',    case 'persona': {  { id: 'auto', label: 'Auto', helper: 'Let AI pick the best format', instruction: '' },    try {      return value;

        formatOption.instruction ? `Format instruction: ${formatOption.instruction}` : '',

        researchSnippet,      const personas = data.productsServices ?? [];

        'Return Markdown-safe output. Cite research sources inline (e.g., [1]).',

      ]      return `Products/Services tracked: ${personas.length}. Use job-to-be-done framing when possible.`;  {

        .filter(Boolean)

        .join('\n\n');    }



      const history: Content[] = [    default:    id: 'bullets',      return new URL(`https://${value}`).toString();    }

        {

          role: 'user',      return `Workspace has ${data.documents?.length ?? 0} shared documents and ${data.productsServicesTasks?.length ?? 0} GTM tasks.`;

          parts: [{ text: userContext }],

        },  }    label: 'Bullets',

      ];

};

      try {

        const aiResponse = await getAiResponse(history, buildSystemPrompt(docType, workspaceName), false, workspaceContext.workspaceId);    helper: 'Short bullet list with emojis allowed',    } catch {  }

        const text = extractModelText(aiResponse);

        if (!text) {const buildResearchQuery = (

          throw new Error('AI returned an empty response.');

        }  promptValue: string,    instruction: 'Respond as a bulleted list. Each bullet must start with an emoji + bold heading.',

        editor.chain().focus();

        if (insertMode === 'replace' && selection.range) {  selection: string,

          editor.commands.insertContentAt(selection.range, text);

        } else {  docTitle: string,  },      return value;};

          editor.commands.insertContent(`\n${text}\n`);

        }  docType: DocType,

        setStatusMessage('✨ Inserted AI output');

      } catch (error) {  workspaceName: string | null,  {

        setErrorMessage(error instanceof Error ? error.message : 'Failed to generate response.');

      } finally {): string => {

        setIsSubmitting(false);

      }  const keywords: string[] = [];    id: 'summary',    }

    },

    [  if (workspaceName) keywords.push(workspaceName);

      autoResearch,

      docSummary,  keywords.push(DOC_TYPE_LABELS[docType] ?? docType);    label: 'Exec summary',

      docTitle,

      docType,  keywords.push(docTitle || 'GTM doc');

      editor,

      fetchResearch,  if (selection) {    helper: '2-3 tight paragraphs',  }const buildImageInsertHtml = (image: YouSearchImageResult) => {

      formatOption.instruction,

      insertMode,    keywords.push(selection.split(/\s+/).slice(0, 12).join(' '));

      prompt,

      selection,  }    instruction: 'Respond with two concise paragraphs targeted at busy executives.',

      tags,

      tone.helper,  keywords.push(promptValue);

      tone.id,

      tone.label,  return keywords.join(' ').slice(0, 240).trim();  },};  if (!image.imageUrl) return '';

      webResearch,

      workspaceContext,};

      workspaceName,

    ],  {

  );

export const AICommandPalette: React.FC<AICommandPaletteProps> = ({

  const suggestionPills = useMemo(() => {

    const docSpecific = DOC_TYPE_SUGGESTIONS[docType] ?? [];  editor,    id: 'actions',  const caption = escapeHtml(image.title || 'Research visual');

    return [...docSpecific, ...QUICK_ACTIONS].slice(0, 6);

  }, [docType]);  position,



  return (  onClose,    label: 'Action plan',

    <div className="fixed inset-0 z-[120] pointer-events-none">

      <div  workspaceContext,

        ref={containerRef}

        className="pointer-events-auto absolute w-[min(560px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl"  docType,    helper: 'Numbered list with owners/dates',const buildImageInsertHtml = (image: YouSearchImageResult) => {  const imageUrl = escapeHtml(image.imageUrl);

        style={{ top: clampedPosition.top, left: clampedPosition.left }}

      >  data,

        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4">

          <div>  docTitle,    instruction: 'Respond with a numbered action plan. Each line must include owner, due date, and success metric.',

            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">AI command palette</p>

            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">  workspaceName,

              <span className="text-lg">{DOC_TYPE_ICONS[docType] ?? '✨'}</span>

              <span>{DOC_TYPE_LABELS[docType] ?? docType}</span>  tags,  },  if (!image.imageUrl) return '';  const normalizedSource = normalizeUrl(image.url);

              <span className="text-slate-300">•</span>

              <span>{workspaceName ?? 'Workspace'}</span>}) => {

            </div>

          </div>  const containerRef = useRef<HTMLDivElement>(null);  {

          <button

            type="button"  const [clampedPosition, setClampedPosition] = useState<Position>({ top: position.top, left: position.left });

            onClick={onClose}

            className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-100"  const [prompt, setPrompt] = useState('');    id: 'table',  const caption = escapeHtml(image.title || 'Research visual');  const safeSource = escapeHtml(normalizedSource);

            aria-label="Close AI command palette"

          >  const [tone, setTone] = useState<ToneOption>(TONE_OPTIONS[0]);

            <X size={16} />

          </button>  const [formatOption, setFormatOption] = useState<FormatOption>(FORMAT_OPTIONS[0]);    label: 'Table',

        </div>

  const [selection, setSelection] = useState<SelectionState>({ text: '', range: null, wordCount: 0 });

        <div className="space-y-4 px-4 py-4">

          <div className="rounded-xl border border-slate-200 bg-white/70 p-3">  const [insertMode, setInsertMode] = useState<'replace' | 'append'>('replace');    helper: 'Markdown table output',  const imageUrl = escapeHtml(image.imageUrl);  const displayUrl = normalizedSource ? escapeHtml(normalizedSource.replace(/^https?:\/\//, '')) : '';

            <div className="flex items-center justify-between gap-2">

              <label className="text-xs font-medium text-slate-600">Prompt</label>  const [webResearch, setWebResearch] = useState<YouSearchResponse | null>(null);

              <div className="flex items-center gap-2 text-[11px] text-slate-400">

                <button  const [isFetchingResearch, setIsFetchingResearch] = useState(false);    instruction: 'Return a Markdown table that compares options with columns: Item, Summary, Owner, Due date, Source.',

                  type="button"

                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${  const [researchError, setResearchError] = useState<string | null>(null);

                    insertMode === 'replace' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'

                  }`}  const [autoResearch, setAutoResearch] = useState(true);  },  const normalizedSource = normalizeUrl(image.url);  const sourceLink = normalizedSource

                  onClick={() => setInsertMode('replace')}

                >  const [imageResults, setImageResults] = useState<YouSearchImageResult[]>([]);

                  Rewrite

                </button>  const [isFetchingImages, setIsFetchingImages] = useState(false);];

                <button

                  type="button"  const [imageError, setImageError] = useState<string | null>(null);

                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${

                    insertMode === 'append' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'  const [isSubmitting, setIsSubmitting] = useState(false);  const safeSource = escapeHtml(normalizedSource);    ? ` · <a href="${safeSource}" target="_blank" rel="noopener noreferrer">${displayUrl || safeSource}</a>`

                  }`}

                  onClick={() => setInsertMode('append')}  const [statusMessage, setStatusMessage] = useState<string | null>(null);

                >

                  Append  const [errorMessage, setErrorMessage] = useState<string | null>(null);const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

                </button>

              </div>  const hasSeededPrompt = useRef(false);

            </div>

            <textarea  const displayUrl = normalizedSource ? escapeHtml(normalizedSource.replace(/^https?:\/\//, '')) : '';    : '';

              value={prompt}

              onChange={(event) => setPrompt(event.target.value)}  useLayoutEffect(() => {

              className="mt-2 h-28 w-full resize-none rounded-lg border border-slate-200 bg-white/70 p-3 text-sm text-slate-800 outline-none focus:border-slate-400"

              placeholder="Ask the AI to improve this section or create something new..."    if (typeof window === 'undefined') return;const selectionToSnippet = (selection: SelectionState): string => {

            />

            <div className="mt-2 flex flex-wrap gap-2">

              {suggestionPills.map((pill) => (

                <button    const updatePosition = () => {  if (!selection.text) {  const sourceLink = normalizedSource

                  key={pill}

                  type="button"      const node = containerRef.current;

                  onClick={() => runPrompt(pill)}

                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"      const width = node?.offsetWidth ?? 440;    return 'The user has no selection and wants you to add net-new content into the cursor position.';

                >

                  {pill}      const height = node?.offsetHeight ?? 360;

                </button>

              ))}      const margin = 16;  }    ? ` · <a href="${safeSource}" target="_blank" rel="noopener noreferrer">${displayUrl || safeSource}</a>`  return `<figure class="doc-research-image" data-source-url="${safeSource}">

            </div>

          </div>      const scrollY = window.scrollY || 0;



          <div className="grid gap-3 md:grid-cols-2">      const scrollX = window.scrollX || 0;

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">

              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Tone</p>      const viewportTop = position.top - scrollY;

              <div className="mt-2 flex flex-wrap gap-2">

                {TONE_OPTIONS.map((option) => (      const viewportLeft = position.left - scrollX;  return `The user highlighted the following section (${selection.wordCount} words). Rewrite or extend it:    : '';    <img src="${imageUrl}" alt="${caption}" />

                  <button

                    key={option.id}      const maxLeft = window.innerWidth - width - margin;

                    type="button"

                    className={`rounded-lg border px-3 py-1 text-xs ${      const maxTop = window.innerHeight - height - margin;"""${selection.text}"""`;

                      tone.id === option.id

                        ? 'border-slate-900 bg-slate-900 text-white'      setClampedPosition({

                        : 'border-transparent bg-white text-slate-600 shadow'

                    }`}        top: clamp(viewportTop, margin, Math.max(margin, maxTop)),};    <figcaption>${caption}${sourceLink}</figcaption>

                    onClick={() => setTone(option)}

                  >        left: clamp(viewportLeft, margin, Math.max(margin, maxLeft)),

                    {option.label}

                  </button>      });

                ))}

              </div>    };

            </div>

const summarizeBusinessProfile = (profile?: BusinessProfile | null): string => {  return `<figure class="doc-research-image" data-source-url="${safeSource}">  </figure>`;

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">

              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Format</p>    updatePosition();

              <div className="mt-2 flex flex-wrap gap-2">

                {FORMAT_OPTIONS.map((option) => (    window.addEventListener('resize', updatePosition);  if (!profile) {

                  <button

                    key={option.id}    window.addEventListener('scroll', updatePosition, true);

                    type="button"

                    className={`rounded-lg border px-3 py-1 text-xs ${    return () => {    return 'No business profile was provided. Assume an early-stage B2B startup unless the user says otherwise.';    <img src="${imageUrl}" alt="${caption}" />};

                      formatOption.id === option.id

                        ? 'border-slate-900 bg-slate-900 text-white'      window.removeEventListener('resize', updatePosition);

                        : 'border-transparent bg-white text-slate-600 shadow'

                    }`}      window.removeEventListener('scroll', updatePosition, true);  }

                    onClick={() => setFormatOption(option)}

                  >    };

                    {option.label}

                  </button>  }, [position.left, position.top]);    <figcaption>${caption}${sourceLink}</figcaption>

                ))}

              </div>

            </div>

          </div>  useEffect(() => {  const parts: string[] = [];



          <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3">    const updateSelection = () => {

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2 text-sm text-slate-600">      const { from, to } = editor.state.selection;  parts.push(`${profile.companyName} • ${profile.industry ?? 'Industry N/A'} • ${profile.growthStage ?? 'stage unknown'}`);  </figure>`;const formatHostname = (value?: string | null) => {

                <Globe size={16} />

                <span>Live research</span>      const text = editor.state.doc.textBetween(from, to, ' ');

              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500">      setSelection({  if (profile.targetMarket) parts.push(`Target market: ${profile.targetMarket}`);

                <span>{autoResearch ? 'On' : 'Off'}</span>

                <div        text: text.trim(),

                  className={`relative h-5 w-9 rounded-full transition ${autoResearch ? 'bg-slate-900' : 'bg-slate-300'}`}

                  onClick={() => setAutoResearch((prev) => !prev)}        range: from === to ? null : { from, to },  if (profile.valueProposition) parts.push(`Value prop: ${profile.valueProposition}`);};  if (!value) return '';

                >

                  <span        wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,

                    className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 transform rounded-full bg-white shadow transition ${

                      autoResearch ? 'translate-x-4' : 'translate-x-1'      });  if (profile.primaryGoal) parts.push(`Primary goal: ${profile.primaryGoal}`);

                    }`}

                  />      if (!hasSeededPrompt.current) {

                </div>

              </label>        const docPrompt = DOC_TYPE_SUGGESTIONS[docType]?.[0] ?? QUICK_ACTIONS[0];  if (profile.keyChallenges) parts.push(`Challenges: ${profile.keyChallenges}`);  try {

            </div>

            <p className="mt-1 text-xs text-slate-500">Pull 3-5 fresh sources from the web and cite them inline.</p>        setPrompt(text.trim() ? `Improve this section: ${text.trim()}` : docPrompt);

            <div className="mt-3 flex flex-wrap gap-2">

              <button        hasSeededPrompt.current = true;  if (profile.uniqueDifferentiators) parts.push(`Differentiators: ${profile.uniqueDifferentiators}`);

                type="button"

                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"      }

                onClick={() => fetchResearch('manual')}

                disabled={isFetchingResearch}    };  if (profile.competitors?.length) parts.push(`Competitors: ${profile.competitors.join(', ')}`);const formatHostname = (value?: string | null) => {    return new URL(value).hostname.replace(/^www\./, '');

              >

                {isFetchingResearch ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}

                Refresh sources

              </button>    updateSelection();  return parts.join('\n');

              <button

                type="button"    editor.on('selectionUpdate', updateSelection);

                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"

                onClick={handleFetchImages}    return () => {};  if (!value) return '';  } catch {

                disabled={isFetchingImages}

              >      editor.off('selectionUpdate', updateSelection);

                {isFetchingImages ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}

                Reference images    };

              </button>

            </div>  }, [docType, editor]);

            {researchError && (

              <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">const buildRelatedDocsSnippet = (workspaceContext: AIWorkspaceContext): string => {  try {    try {

                <AlertTriangle size={14} />

                {researchError}  useEffect(() => {

              </div>

            )}    const handleKeyDown = (event: KeyboardEvent) => {  if (!workspaceContext.relatedDocs?.length) {

            {webResearch?.hits?.length ? (

              <div className="mt-3 space-y-2 text-xs text-slate-600">      if (event.key === 'Escape') {

                {webResearch.hits.slice(0, 3).map((hit, index) => (

                  <div key={hit.url ?? index} className="rounded-lg border border-slate-200/70 bg-white/70 p-2">        event.preventDefault();    return 'No related docs available.';    return new URL(value).hostname.replace(/^www\./, '');      return new URL(`https://${value}`).hostname.replace(/^www\./, '');

                    <p className="font-semibold text-slate-700">[{index + 1}] {hit.title ?? 'Untitled source'}</p>

                    <p className="line-clamp-2 text-slate-500">{hit.description}</p>        onClose();

                    <p className="mt-1 text-[11px] text-slate-400">{hit.source ?? hit.url}</p>

                  </div>      }  }

                ))}

              </div>    };

            ) : null}

          </div>    document.addEventListener('keydown', handleKeyDown);  const list = workspaceContext.relatedDocs  } catch {    } catch {



          {imageResults.length > 0 && (    return () => document.removeEventListener('keydown', handleKeyDown);

            <div className="rounded-xl border border-slate-200/80 bg-white/60 p-3">

              <div className="flex items-center gap-2 text-sm text-slate-600">  }, [onClose]);    .slice(0, 3)

                <ImageIcon size={16} /> Reference imagery

              </div>

              {imageError && <p className="mt-1 text-xs text-amber-600">{imageError}</p>}

              <div className="mt-3 grid grid-cols-3 gap-2">  useEffect(() => {    .map((doc, index) => `${index + 1}. ${doc.title} (${doc.docType}) • tags: ${(doc.tags || []).join(', ')}`)    try {      return value;

                {imageResults.map((image) => (

                  <button    const handleClickOutside = (event: MouseEvent) => {

                    key={image.imageUrl}

                    type="button"      if (!containerRef.current) return;    .join('\n');

                    onClick={() => insertImage(image)}

                    className="group relative overflow-hidden rounded-lg border border-slate-200"      if (!containerRef.current.contains(event.target as Node)) {

                  >

                    <img src={image.thumbnail ?? image.imageUrl} alt={image.title ?? 'Reference'} className="h-24 w-full object-cover" />        onClose();  return `Related docs for quick context:\n${list}`;      return new URL(`https://${value}`).hostname.replace(/^www\./, '');    }

                    <span className="absolute inset-x-0 bottom-0 hidden bg-slate-900/80 px-2 py-1 text-[10px] text-white group-hover:block">

                      Insert image      }

                    </span>

                  </button>    };};

                ))}

              </div>    document.addEventListener('mousedown', handleClickOutside);

            </div>

          )}    return () => document.removeEventListener('mousedown', handleClickOutside);    } catch {  }



          {selection.text && (  }, [onClose]);

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs text-slate-600">

              <div className="flex items-center gap-2 text-slate-500">const buildDocMetaSnippet = (

                <BookOpenText size={14} /> Selected text ({selection.wordCount} words)

              </div>  const docSummary = useMemo(() => buildDocDataSummary(docType, data), [data, docType]);

              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-slate-700">{selection.text}</p>

            </div>  docTitle: string,      return value;};

          )}

  const fetchResearch = useCallback(

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

            <div className="text-xs text-slate-500">    async (mode: 'manual' | 'auto' | 'inline' = 'manual'): Promise<YouSearchResponse | null> => {  docType: DocType,

              {statusMessage && (

                <span className="inline-flex items-center gap-1 text-emerald-600">      const basePrompt = prompt.trim();

                  <CheckCircle2 size={14} /> {statusMessage}

                </span>      if (!basePrompt) {  tags: string[],    }

              )}

              {errorMessage && (        if (mode === 'manual') setResearchError('Enter a prompt before running research.');

                <span className="inline-flex items-center gap-1 text-rose-600">

                  <AlertTriangle size={14} /> {errorMessage}        return null;  workspaceName: string | null,

                </span>

              )}      }

            </div>

            <button      const query = buildResearchQuery(basePrompt, selection.text, docTitle, docType, workspaceName);): string => {  }const formatRelativeTime = (iso?: string | null) => {

              type="button"

              onClick={() => runPrompt()}      setIsFetchingResearch(true);

              disabled={isSubmitting}

              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"      setResearchError(null);  const label = DOC_TYPE_LABELS[docType] ?? docType;

            >

              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}      try {

              {isSubmitting ? 'Writing…' : 'Run command'}

            </button>        const results = await searchWeb(query, 'search', { count: 5 });  const icon = DOC_TYPE_ICONS[docType] ?? '📝';};  if (!iso) return '';

          </div>

        </div>        setWebResearch(results);

      </div>

    </div>        return results;  return `${icon} Document: ${docTitle || 'Untitled'} (type: ${label}) in workspace ${workspaceName ?? 'Unknown workspace'}.

  );

};      } catch (error) {


        const message = error instanceof Error ? error.message : 'Failed to fetch research.';Tags: ${tags.length ? tags.join(', ') : 'none provided.'}`;  const date = new Date(iso);

        setResearchError(message);

        if (mode === 'inline') {};

          throw new Error(message);

        }const formatRelativeTime = (iso?: string | null) => {  if (Number.isNaN(date.getTime())) return '';

        return null;

      } finally {const formatResearchForPrompt = (results: YouSearchResponse | null): string => {

        setIsFetchingResearch(false);

      }  if (!results?.hits?.length) return '';  if (!iso) return '';  const diffMs = Date.now() - date.getTime();

    },

    [docTitle, docType, prompt, selection.text, workspaceName],  const snippets = results.hits.slice(0, 5).map((hit, index) => {

  );

    const source = hit.source ? `${hit.source} • ` : '';  const date = new Date(iso);  const diffMinutes = Math.round(diffMs / 60000);

  useEffect(() => {

    if (!autoResearch || webResearch || !prompt.trim()) return;    return `[${index + 1}] ${hit.title ?? hit.url}

    fetchResearch('auto').catch(() => undefined);

  }, [autoResearch, fetchResearch, prompt, webResearch]);${source}${hit.description ?? ''}  if (Number.isNaN(date.getTime())) return '';  if (diffMinutes < 1) return 'just now';



  const handleFetchImages = useCallback(async () => {${hit.url}`;

    const basePrompt = prompt.trim() || selection.text;

    if (!basePrompt) {  });  const diffMs = Date.now() - date.getTime();  if (diffMinutes < 60) return `${diffMinutes}m ago`;

      setImageError('Provide a prompt or select text before fetching images.');

      return;  return `WEB SEARCH RESULTS (cite as [n]):\n${snippets.join('\n\n')}`;

    }

    const query = `${docTitle} ${DOC_TYPE_LABELS[docType] ?? docType} reference`;};  const diffMinutes = Math.round(diffMs / 60000);  const diffHours = Math.round(diffMinutes / 60);

    setIsFetchingImages(true);

    setImageError(null);

    try {

      const payload = await searchWeb(query, 'images', { count: 6 });const buildSystemPrompt = (docType: DocType, workspaceName: string | null): string => {  if (diffMinutes < 1) return 'just now';  if (diffHours < 24) return `${diffHours}h ago`;

      setImageResults(payload.images ?? []);

    } catch (error) {  const label = DOC_TYPE_LABELS[docType] ?? docType;

      setImageError(error instanceof Error ? error.message : 'Unable to fetch images');

    } finally {  return `You are Setique's embedded GTM writing copilot for workspace ${workspaceName ?? 'Unknown'}. You specialize in ${label} documents.  if (diffMinutes < 60) return `${diffMinutes}m ago`;  const diffDays = Math.round(diffHours / 24);

      setIsFetchingImages(false);

    }- Always preserve factual accuracy and cite any external research inline using [n].

  }, [docTitle, docType, prompt, selection.text]);

- Never hallucinate data, companies, or metrics.  const diffHours = Math.round(diffMinutes / 60);  return `${diffDays}d ago`;

  const insertImage = useCallback(

    (image: YouSearchImageResult) => {- Maintain inclusive, bias-free language.

      if (!image.imageUrl) return;

      editor.chain().focus().setResizableImage({ src: image.imageUrl, alt: image.title ?? 'Reference image' }).run();- When the user highlights text, assume they want that exact section improved unless they explicitly ask for something else.  if (diffHours < 24) return `${diffHours}h ago`;};

      setStatusMessage('Inserted reference image.');

    },- Prefer Markdown-friendly output that pastes cleanly into TipTap.`;

    [editor],

  );};  const diffDays = Math.round(diffHours / 24);



  const runPrompt = useCallback(

    async (overridePrompt?: string) => {

      const effectivePrompt = (overridePrompt ?? prompt).trim();const extractModelText = (response: GenerateContentResponse): string => {  return `${diffDays}d ago`;interface AICommandPaletteProps {

      if (!effectivePrompt) {

        setErrorMessage('Please enter a prompt.');  const candidate = response.candidates?.[0];

        return;

      }  if (!candidate?.content?.parts?.length) {};  editor: Editor;

      setIsSubmitting(true);

      setStatusMessage(null);    return '';

      setErrorMessage(null);

  }  position: { top: number; left: number };

      let researchSnippet = '';

      if (autoResearch) {  const textPart = candidate.content.parts.find(part => 'text' in part && typeof part.text === 'string');

        try {

          const existing = webResearch ?? (await fetchResearch('inline'));  return textPart?.text?.trim() ?? '';interface AICommandPaletteProps {  onClose: () => void;

          researchSnippet = formatResearchForPrompt(existing);

        } catch (error) {};

          setErrorMessage(error instanceof Error ? error.message : 'Research failed, continuing without it.');

        }  editor: Editor;  workspaceContext: AIWorkspaceContext;

      }

const buildDocDataSummary = (docType: DocType, data: DashboardData): string => {

      const userContext = [

        `Task: ${effectivePrompt}`,  switch (docType) {  position: { top: number; left: number };  docType: DocType;

        selectionToSnippet(selection),

        buildDocMetaSnippet(docTitle, docType, tags, workspaceName),    case 'campaign': {

        summarizeBusinessProfile(workspaceContext.businessProfile),

        buildRelatedDocsSnippet(workspaceContext),      const campaigns = data.marketing ?? [];  onClose: () => void;  data: DashboardData;

        docSummary,

        tone.id !== 'neutral' ? `Tone: ${tone.label}. ${tone.helper}` : '',      return `Marketing snapshot: ${campaigns.length} active initiatives. Recent campaign: ${campaigns[0]?.name ?? 'N/A'}.`;

        formatOption.instruction ? `Format instruction: ${formatOption.instruction}` : '',

        researchSnippet,    }  workspaceContext: AIWorkspaceContext;  docTitle: string;

        'Return Markdown-safe output. Cite research sources inline (e.g., [1]).',

      ]    case 'battlecard': {

        .filter(Boolean)

        .join('\n\n');      const competitors = data.businessProfile?.competitors ?? [];  docType: DocType;  workspaceName?: string | null;



      const history: Content[] = [      return `Known competitors: ${competitors.length ? competitors.join(', ') : 'not captured yet.'}`;

        {

          role: 'user',    }  data: DashboardData;  tags: string[];

          parts: [{ text: userContext }],

        },    case 'persona': {

      ];

      const personas = data.productsServices ?? [];  docTitle: string;}

      try {

        const aiResponse = await getAiResponse(history, buildSystemPrompt(docType, workspaceName), false, workspaceContext.workspaceId);      return `Products/Services tracked: ${personas.length}. Use job-to-be-done framing when possible.`;

        const text = extractModelText(aiResponse);

        if (!text) {    }  workspaceName?: string | null;

          throw new Error('AI returned an empty response.');

        }    default:

        editor.chain().focus();

        if (insertMode === 'replace' && selection.range) {      return `Workspace has ${data.documents?.length ?? 0} shared documents and ${data.productsServicesTasks?.length ?? 0} GTM tasks.`;  tags: string[];// Quick suggestion buttons for common prompts

          editor.commands.insertContentAt(selection.range, text);

        } else {  }

          editor.commands.insertContent(`\n${text}\n`);

        }};}const QUICK_SUGGESTIONS = [

        setStatusMessage('✨ Inserted AI output');

      } catch (error) {

        setErrorMessage(error instanceof Error ? error.message : 'Failed to generate response.');

      } finally {const buildResearchQuery = (  { label: '📋 Executive Summary', prompt: 'Write an executive summary for this document based on our business context' },

        setIsSubmitting(false);

      }  promptValue: string,

    },

    [  selection: string,type PaletteMode = 'insert' | 'replace' | 'improve';  return (

      autoResearch,

      docSummary,  docTitle: string,

      docTitle,

      docType,  docType: DocType,    <div

      editor,

      fetchResearch,  workspaceName: string | null,

      formatOption.instruction,

      insertMode,): string => {const VIEWPORT_MARGIN = 16;      ref={paletteRef}

      prompt,

      selection,  const keywords: string[] = [];

      tags,

      tone.helper,  if (workspaceName) keywords.push(workspaceName);      className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] w-full max-w-[500px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col"

      tone.id,

      tone.label,  keywords.push(DOC_TYPE_LABELS[docType] ?? docType);

      webResearch,

      workspaceContext,  keywords.push(docTitle || 'GTM doc');const QUICK_SUGGESTIONS = [      style={{

      workspaceName,

    ],  if (selection) {

  );

    keywords.push(selection.split(/\s+/).slice(0, 12).join(' '));  { label: '📋 Executive Summary', prompt: 'Write an executive summary for this doc using our current traction and GTM focus.' },        top: computedPosition.top,

  const suggestionPills = useMemo(() => {

    const docSpecific = DOC_TYPE_SUGGESTIONS[docType] ?? [];  }

    return [...docSpecific, ...QUICK_ACTIONS].slice(0, 6);

  }, [docType]);  keywords.push(promptValue);  { label: '🎯 Key Messages', prompt: 'Generate 3-5 key messages aligned with our value proposition and ICP.' },        left: computedPosition.left,



  return (  return keywords.join(' ').slice(0, 240).trim();

    <div className="fixed inset-0 z-[120] pointer-events-none">

      <div};  { label: '👥 Target Audience', prompt: 'Describe our target audience with pain points, desired outcomes, and buying triggers.' },        maxHeight: `calc(100vh - ${VIEWPORT_MARGIN * 2}px)`

        ref={containerRef}

        className="pointer-events-auto absolute w-[min(560px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl"

        style={{ top: clampedPosition.top, left: clampedPosition.left }}

      >export const AICommandPalette: React.FC<AICommandPaletteProps> = ({  { label: '💡 Value Props', prompt: 'List our differentiators and proof points versus competitors.' },      }}

        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4">

          <div>  editor,

            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">AI command palette</p>

            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">  position,  { label: '🚀 Go-to-Market', prompt: 'Outline a GTM activation plan with channels, cadences, and owners.' },    >

              <span className="text-lg">{DOC_TYPE_ICONS[docType] ?? '✨'}</span>

              <span>{DOC_TYPE_LABELS[docType] ?? docType}</span>  onClose,

              <span className="text-slate-300">•</span>

              <span>{workspaceName ?? 'Workspace'}</span>  workspaceContext,  { label: '⚔️ Competitive Analysis', prompt: 'Summarize how we win against top competitors with crisp positioning.' },      {/* Minimal Header */}

            </div>

          </div>  docType,

          <button

            type="button"  data,  { label: '💬 Messaging Framework', prompt: 'Create a messaging hierarchy: tagline, positioning, pillars, proof points.' },      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100 flex items-center justify-between">

            onClick={onClose}

            className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-100"  docTitle,

            aria-label="Close AI command palette"

          >  workspaceName,  { label: '📈 Launch Timeline', prompt: 'Draft a launch timeline with milestones, enablement, and metrics.' },        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">

            <X size={16} />

          </button>  tags,

        </div>

}) => {];          <span className="text-lg">✨</span>

        <div className="space-y-4 px-4 py-4">

          <div className="rounded-xl border border-slate-200 bg-white/70 p-3">  const containerRef = useRef<HTMLDivElement>(null);

            <div className="flex items-center justify-between gap-2">

              <label className="text-xs font-medium text-slate-600">Prompt</label>  const [clampedPosition, setClampedPosition] = useState<Position>({ top: position.top, left: position.left });          <span>AI Assistant</span>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">

                <button  const [prompt, setPrompt] = useState('');

                  type="button"

                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${  const [tone, setTone] = useState<ToneOption>(TONE_OPTIONS[0]);const CHART_SUGGESTIONS = [        </div>

                    insertMode === 'replace' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'

                  }`}  const [formatOption, setFormatOption] = useState<FormatOption>(FORMAT_OPTIONS[0]);

                  onClick={() => setInsertMode('replace')}

                >  const [selection, setSelection] = useState<SelectionState>({ text: '', range: null, wordCount: 0 });  { label: '📈 Revenue Chart', prompt: 'Create a line chart showing revenue or MRR trends over time using logged financial data.' },        <div className="flex items-center gap-2">

                  Rewrite

                </button>  const [insertMode, setInsertMode] = useState<'replace' | 'append'>('replace');

                <button

                  type="button"  const [webResearch, setWebResearch] = useState<YouSearchResponse | null>(null);  { label: '🥧 Expense Breakdown', prompt: 'Create a pie chart that breaks down expenses by category from our expense log.' },          <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-white/60 rounded-full border border-gray-200/50">

                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${

                    insertMode === 'append' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'  const [isFetchingResearch, setIsFetchingResearch] = useState(false);

                  }`}

                  onClick={() => setInsertMode('append')}  const [researchError, setResearchError] = useState<string | null>(null);  { label: '📊 Pipeline Snapshot', prompt: 'Create a bar chart that compares investor/customer pipeline counts by stage.' },            {derivedWorkspaceName}

                >

                  Append  const [autoResearch, setAutoResearch] = useState(true);

                </button>

              </div>  const [imageResults, setImageResults] = useState<YouSearchImageResult[]>([]);  { label: '📉 Growth Metrics', prompt: 'Create an area chart that shows signups, customers, and revenue growth combined.' },          </span>

            </div>

            <textarea  const [isFetchingImages, setIsFetchingImages] = useState(false);

              value={prompt}

              onChange={(event) => setPrompt(event.target.value)}  const [imageError, setImageError] = useState<string | null>(null);];          <button

              className="mt-2 h-28 w-full resize-none rounded-lg border border-slate-200 bg-white/70 p-3 text-sm text-slate-800 outline-none focus:border-slate-400"

              placeholder="Ask the AI to improve this section or create something new..."  const [isSubmitting, setIsSubmitting] = useState(false);

            />

            <div className="mt-2 flex flex-wrap gap-2">  const [statusMessage, setStatusMessage] = useState<string | null>(null);            onClick={onClose}

              {suggestionPills.map((pill) => (

                <button  const [errorMessage, setErrorMessage] = useState<string | null>(null);

                  key={pill}

                  type="button"  const hasSeededPrompt = useRef(false);const TONE_OPTIONS = [            className="text-gray-400 hover:text-gray-600 transition-colors"

                  onClick={() => runPrompt(pill)}

                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"

                >

                  {pill}  useLayoutEffect(() => {  { id: 'professional', label: 'Professional', icon: '👔' },          >

                </button>

              ))}    if (typeof window === 'undefined') return;

            </div>

          </div>  { id: 'persuasive', label: 'Persuasive', icon: '🔥' },            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>



          <div className="grid gap-3 md:grid-cols-2">    const updatePosition = () => {

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">

              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Tone</p>      const node = containerRef.current;  { id: 'casual', label: 'Friendly', icon: '👋' },          </button>

              <div className="mt-2 flex flex-wrap gap-2">

                {TONE_OPTIONS.map((option) => (      const width = node?.offsetWidth ?? 440;

                  <button

                    key={option.id}      const height = node?.offsetHeight ?? 360;  { id: 'technical', label: 'Technical', icon: '⚙️' },        </div>

                    type="button"

                    className={`rounded-lg border px-3 py-1 text-xs ${      const margin = 16;

                      tone.id === option.id

                        ? 'border-slate-900 bg-slate-900 text-white'      const scrollY = window.scrollY || 0;];      </div>

                        : 'border-transparent bg-white text-slate-600 shadow'

                    }`}      const scrollX = window.scrollX || 0;

                    onClick={() => setTone(option)}

                  >      const viewportTop = position.top - scrollY;

                    {option.label}

                  </button>      const viewportLeft = position.left - scrollX;

                ))}

              </div>      const maxLeft = window.innerWidth - width - margin;const FORMAT_OPTIONS = [      {/* Options Toggle */}

            </div>

      const maxTop = window.innerHeight - height - margin;

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">

              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Format</p>      setClampedPosition({  { id: 'auto', label: 'Auto', icon: '✨' },      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">

              <div className="mt-2 flex flex-wrap gap-2">

                {FORMAT_OPTIONS.map((option) => (        top: clamp(viewportTop, margin, Math.max(margin, maxTop)),

                  <button

                    key={option.id}        left: clamp(viewportLeft, margin, Math.max(margin, maxLeft)),  { id: 'list', label: 'Bullets', icon: '•' },        <div className="flex items-center gap-4">

                    type="button"

                    className={`rounded-lg border px-3 py-1 text-xs ${      });

                      formatOption.id === option.id

                        ? 'border-slate-900 bg-slate-900 text-white'    };  { id: 'table', label: 'Table', icon: '▦' },          <button

                        : 'border-transparent bg-white text-slate-600 shadow'

                    }`}

                    onClick={() => setFormatOption(option)}

                  >    updatePosition();  { id: 'summary', label: 'Summary', icon: '📝' },            onClick={() => setShowOptions(!showOptions)}

                    {option.label}

                  </button>    window.addEventListener('resize', updatePosition);

                ))}

              </div>    window.addEventListener('scroll', updatePosition, true);];            className="text-xs font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1"

            </div>

          </div>    return () => {



          <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3">      window.removeEventListener('resize', updatePosition);          >

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2 text-sm text-slate-600">      window.removeEventListener('scroll', updatePosition, true);

                <Globe size={16} />

                <span>Live research</span>    };export const AICommandPalette: React.FC<AICommandPaletteProps> = ({            <span className="text-lg">⚙️</span> {showOptions ? 'Hide Options' : 'Show Options'}

              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500">  }, [position.left, position.top]);

                <span>{autoResearch ? 'On' : 'Off'}</span>

                <div  editor,          </button>

                  className={`relative h-5 w-9 rounded-full transition ${autoResearch ? 'bg-slate-900' : 'bg-slate-300'}`}

                  onClick={() => setAutoResearch((prev) => !prev)}  useEffect(() => {

                >

                  <span    const updateSelection = () => {  position,

                    className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 transform rounded-full bg-white shadow transition ${

                      autoResearch ? 'translate-x-4' : 'translate-x-1'      const { from, to } = editor.state.selection;

                    }`}

                  />      const text = editor.state.doc.textBetween(from, to, ' ');  onClose,          {!showOptions && (

                </div>

              </label>      setSelection({

            </div>

            <p className="mt-1 text-xs text-slate-500">Pull 3-5 fresh sources from the web and cite them inline.</p>        text: text.trim(),  workspaceContext,            <div className="flex items-center gap-2 text-xs text-gray-400">

            <div className="mt-3 flex flex-wrap gap-2">

              <button        range: from === to ? null : { from, to },

                type="button"

                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"        wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,  docType,              <span>{TONE_OPTIONS.find(t => t.id === tone)?.icon} {TONE_OPTIONS.find(t => t.id === tone)?.label}</span>

                onClick={() => fetchResearch('manual')}

                disabled={isFetchingResearch}      });

              >

                {isFetchingResearch ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}      if (!hasSeededPrompt.current) {  data,              <span>•</span>

                Refresh sources

              </button>        const docPrompt = DOC_TYPE_SUGGESTIONS[docType]?.[0] ?? QUICK_ACTIONS[0];

              <button

                type="button"        setPrompt(text.trim() ? `Improve this section: ${text.trim()}` : docPrompt);  docTitle,              <span>{FORMAT_OPTIONS.find(f => f.id === format)?.icon} {FORMAT_OPTIONS.find(f => f.id === format)?.label}</span>

                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"

                onClick={handleFetchImages}        hasSeededPrompt.current = true;

                disabled={isFetchingImages}

              >      }  workspaceName,            </div>

                {isFetchingImages ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}

                Reference images    };

              </button>

            </div>  tags,          )}

            {researchError && (

              <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">    updateSelection();

                <AlertTriangle size={14} />

                {researchError}    editor.on('selectionUpdate', updateSelection);}) => {        </div>

              </div>

            )}    return () => {

            {webResearch?.hits?.length ? (

              <div className="mt-3 space-y-2 text-xs text-slate-600">      editor.off('selectionUpdate', updateSelection);  const [prompt, setPrompt] = useState('');

                {webResearch.hits.slice(0, 3).map((hit, index) => (

                  <div key={hit.url ?? index} className="rounded-lg border border-slate-200/70 bg-white/70 p-2">    };

                    <p className="font-semibold text-slate-700">[{index + 1}] {hit.title ?? 'Untitled source'}</p>

                    <p className="line-clamp-2 text-slate-500">{hit.description}</p>  }, [docType, editor]);  const [loading, setLoading] = useState(false);        {/* Web Search Toggle */}

                    <p className="mt-1 text-[11px] text-slate-400">{hit.source ?? hit.url}</p>

                  </div>

                ))}

              </div>  useEffect(() => {  const [error, setError] = useState<string | null>(null);        <button

            ) : null}

          </div>    const handleKeyDown = (event: KeyboardEvent) => {



          {imageResults.length > 0 && (      if (event.key === 'Escape') {  const [showOptions, setShowOptions] = useState(false);          onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}

            <div className="rounded-xl border border-slate-200/80 bg-white/60 p-3">

              <div className="flex items-center gap-2 text-sm text-slate-600">        event.preventDefault();

                <ImageIcon size={16} /> Reference imagery

              </div>        onClose();  const [tone, setTone] = useState<string>(TONE_OPTIONS[0].id);          className={`text-xs font-medium px-2 py-1 rounded-full border flex items-center gap-1 transition-all ${

              {imageError && <p className="mt-1 text-xs text-amber-600">{imageError}</p>}

              <div className="mt-3 grid grid-cols-3 gap-2">      }

                {imageResults.map((image) => (

                  <button    };  const [format, setFormat] = useState<string>(FORMAT_OPTIONS[0].id);            isWebSearchEnabled

                    key={image.imageUrl}

                    type="button"    document.addEventListener('keydown', handleKeyDown);

                    onClick={() => insertImage(image)}

                    className="group relative overflow-hidden rounded-lg border border-slate-200"    return () => document.removeEventListener('keydown', handleKeyDown);  const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);              ? 'bg-blue-50 border-blue-200 text-blue-700'

                  >

                    <img src={image.thumbnail ?? image.imageUrl} alt={image.title ?? 'Reference'} className="h-24 w-full object-cover" />  }, [onClose]);

                    <span className="absolute inset-x-0 bottom-0 hidden bg-slate-900/80 px-2 py-1 text-[10px] text-white group-hover:block">

                      Insert image  const [webSearchMode, setWebSearchMode] = useState<'text' | 'images'>('text');              : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'

                    </span>

                  </button>  useEffect(() => {

                ))}

              </div>    const handleClickOutside = (event: MouseEvent) => {  const [imageResults, setImageResults] = useState<YouSearchImageResult[]>([]);          }`}

            </div>

          )}      if (!containerRef.current) return;



          {selection.text && (      if (!containerRef.current.contains(event.target as Node)) {  const [imageSearchLoading, setImageSearchLoading] = useState(false);        >

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs text-slate-600">

              <div className="flex items-center gap-2 text-slate-500">        onClose();

                <BookOpenText size={14} /> Selected text ({selection.wordCount} words)

              </div>      }  const [imageSearchError, setImageSearchError] = useState<string | null>(null);          <span>🌐</span> Web Search {isWebSearchEnabled ? 'ON' : 'OFF'}

              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-slate-700">{selection.text}</p>

            </div>    };

          )}

    document.addEventListener('mousedown', handleClickOutside);  const [imageSearchMetadata, setImageSearchMetadata] = useState<YouSearchMetadata | null>(null);        </button>

          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">

            <div className="text-xs text-slate-500">    return () => document.removeEventListener('mousedown', handleClickOutside);

              {statusMessage && (

                <span className="inline-flex items-center gap-1 text-emerald-600">  }, [onClose]);  const [lastImageQuery, setLastImageQuery] = useState<string | null>(null);      </div>

                  <CheckCircle2 size={14} /> {statusMessage}

                </span>

              )}

              {errorMessage && (  const docSummary = useMemo(() => buildDocDataSummary(docType, data), [data, docType]);  const [computedPosition, setComputedPosition] = useState(position);

                <span className="inline-flex items-center gap-1 text-rose-600">

                  <AlertTriangle size={14} /> {errorMessage}

                </span>

              )}  const fetchResearch = useCallback(  const [selectionInfo, setSelectionInfo] = useState<{ hasSelection: boolean; text: string }>({      <div className="flex-1 overflow-y-auto">

            </div>

            <button    async (mode: 'manual' | 'auto' | 'inline' = 'manual'): Promise<YouSearchResponse | null> => {

              type="button"

              onClick={() => runPrompt()}      const basePrompt = prompt.trim();    hasSelection: false,        {/* Expanded Options */}

              disabled={isSubmitting}

              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"      if (!basePrompt) {

            >

              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}        if (mode === 'manual') setResearchError('Enter a prompt before running research.');    text: '',        {showOptions && (

              {isSubmitting ? 'Writing…' : 'Run command'}

            </button>        return null;

          </div>

        </div>      }  });          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">

      </div>

    </div>      const query = buildResearchQuery(basePrompt, selection.text, docTitle, docType, workspaceName);

  );

};      setIsFetchingResearch(true);            <div>


      setResearchError(null);

      try {  const textareaRef = useRef<HTMLTextAreaElement>(null);              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tone</label>

        const results = await searchWeb(query, 'search', { count: 5 });

        setWebResearch(results);  const paletteRef = useRef<HTMLDivElement>(null);              <div className="grid grid-cols-2 gap-2">

        return results;

      } catch (error) {                {TONE_OPTIONS.map((opt) => (

        const message = error instanceof Error ? error.message : 'Failed to fetch research.';

        setResearchError(message);  const safeDocTitle = docTitle?.trim() || 'Untitled Document';                  <button

        if (mode === 'inline') {

          throw new Error(message);  const derivedWorkspaceName = workspaceName || workspaceContext?.businessProfile?.companyName || 'Workspace';                    key={opt.id}

        }

        return null;                    onClick={() => setTone(opt.id)}

      } finally {

        setIsFetchingResearch(false);  useEffect(() => {                    className={`text-xs px-2 py-1.5 rounded-md border text-left flex items-center gap-2 transition-all ${

      }

    },    textareaRef.current?.focus();                      tone === opt.id

    [docTitle, docType, prompt, selection.text, workspaceName],

  );  }, []);                        ? 'bg-white border-purple-500 text-purple-700 shadow-sm ring-1 ring-purple-500/20'



  useEffect(() => {                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'

    if (!autoResearch || webResearch || !prompt.trim()) return;

    fetchResearch('auto').catch(() => undefined);  useEffect(() => {                    }`}

  }, [autoResearch, fetchResearch, prompt, webResearch]);

    if (!editor) return;                  >

  const handleFetchImages = useCallback(async () => {

    const basePrompt = prompt.trim() || selection.text;    const updateSelection = () => {                    <span>{opt.icon}</span>

    if (!basePrompt) {

      setImageError('Provide a prompt or select text before fetching images.');      const { state } = editor;                    {opt.label}

      return;

    }      const { from, to } = state.selection;                  </button>

    const query = `${docTitle} ${DOC_TYPE_LABELS[docType] ?? docType} reference`; 

    setIsFetchingImages(true);      if (from === to) {                ))}

    setImageError(null);

    try {        setSelectionInfo({ hasSelection: false, text: '' });              </div>

      const payload = await searchWeb(query, 'images', { count: 6 });

      setImageResults(payload.images ?? []);        return;            </div>

    } catch (error) {

      setImageError(error instanceof Error ? error.message : 'Unable to fetch images');      }            <div>

    } finally {

      setIsFetchingImages(false);      const text = state.doc.textBetween(from, to, '\n').trim();              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Format</label>

    }

  }, [docTitle, docType, prompt, selection.text]);      setSelectionInfo({ hasSelection: Boolean(text), text });              <div className="grid grid-cols-2 gap-2">



  const insertImage = useCallback(    };                {FORMAT_OPTIONS.map((opt) => (

    (image: YouSearchImageResult) => {

      if (!image.imageUrl) return;                  <button

      editor.chain().focus().setResizableImage({ src: image.imageUrl, alt: image.title ?? 'Reference image' }).run();

      setStatusMessage('Inserted reference image.');    updateSelection();                    key={opt.id}

    },

    [editor],    editor.on('selectionUpdate', updateSelection);                    onClick={() => setFormat(opt.id)}

  );

    editor.on('transaction', updateSelection);                    className={`text-xs px-2 py-1.5 rounded-md border text-left flex items-center gap-2 transition-all ${

  const runPrompt = useCallback(

    async (overridePrompt?: string) => {    return () => {                      format === opt.id

      const effectivePrompt = (overridePrompt ?? prompt).trim();

      if (!effectivePrompt) {      editor.off('selectionUpdate', updateSelection);                        ? 'bg-white border-purple-500 text-purple-700 shadow-sm ring-1 ring-purple-500/20'

        setErrorMessage('Please enter a prompt.');

        return;      editor.off('transaction', updateSelection);                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'

      }

      setIsSubmitting(true);    };                    }`}

      setStatusMessage(null);

      setErrorMessage(null);  }, [editor]);                  >



      let researchSnippet = '';                    <span>{opt.icon}</span>

      if (autoResearch) {

        try {  useLayoutEffect(() => {                    {opt.label}

          const existing = webResearch ?? (await fetchResearch('inline'));

          researchSnippet = formatResearchForPrompt(existing);    const clampPosition = () => {                  </button>

        } catch (error) {

          setErrorMessage(error instanceof Error ? error.message : 'Research failed, continuing without it.');      const el = paletteRef.current;                ))}

        }

      }      if (!el) return;              </div>



      const userContext = [      const viewportWidth = window.innerWidth;            </div>

        `Task: ${effectivePrompt}`,

        selectionToSnippet(selection),      const viewportHeight = window.innerHeight;          </div>

        buildDocMetaSnippet(docTitle, docType, tags, workspaceName),

        summarizeBusinessProfile(workspaceContext.businessProfile),      const maxLeft = viewportWidth - el.offsetWidth - VIEWPORT_MARGIN;        )}

        buildRelatedDocsSnippet(workspaceContext),

        docSummary,      const maxTop = viewportHeight - el.offsetHeight - VIEWPORT_MARGIN;

        tone.id !== 'neutral' ? `Tone: ${tone.label}. ${tone.helper}` : '',

        formatOption.instruction ? `Format instruction: ${formatOption.instruction}` : '',      setComputedPosition({        {/* Quick Prompts */}

        researchSnippet,

        'Return Markdown-safe output. Cite research sources inline (e.g., [1]).',        top: Math.min(Math.max(position.top, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, maxTop)),        <div className="px-4 py-3 border-b border-gray-100 bg-white space-y-3">

      ]

        .filter(Boolean)        left: Math.min(Math.max(position.left, VIEWPORT_MARGIN), Math.max(VIEWPORT_MARGIN, maxLeft)),          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400">

        .join('\n\n');

      });            <span>Jump-start ideas</span>

      const history: Content[] = [

        {    };            <span className="tracking-normal text-[10px] text-gray-500 font-medium">

          role: 'user',

          parts: [{ text: userContext }],              {safeDocTitle === 'Untitled Document' ? 'Use workspace context' : safeDocTitle}

        },

      ];    clampPosition();            </span>



      try {    window.addEventListener('resize', clampPosition);          </div>

        const aiResponse = await getAiResponse(history, buildSystemPrompt(docType, workspaceName), false, workspaceContext.workspaceId);

        const text = extractModelText(aiResponse);    return () => window.removeEventListener('resize', clampPosition);          <div className="flex flex-wrap gap-2">

        if (!text) {

          throw new Error('AI returned an empty response.');  }, [position.top, position.left]);            {quickPrompts.map((promptOption) => (

        }

        editor.chain().focus();              <button

        if (insertMode === 'replace' && selection.range) {

          editor.commands.insertContentAt(selection.range, text);  const docPlainText = useMemo(() => {                key={promptOption}

        } else {

          editor.commands.insertContent(`\n${text}\n`);    try {                onClick={() => handleSuggestionClick(promptOption)}

        }

        setStatusMessage('✨ Inserted AI output');      return htmlToText(editor.getHTML());                className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-[11px] text-gray-600 hover:border-gray-500"

      } catch (error) {

        setErrorMessage(error instanceof Error ? error.message : 'Failed to generate response.');    } catch {              >

      } finally {

        setIsSubmitting(false);      return '';                {promptOption}

      }

    },    }              </button>

    [

      autoResearch,  }, [editor]);            ))}

      docSummary,

      docTitle,          </div>

      docType,

      editor,  const docSnippet = useMemo(() => docPlainText.slice(0, 2000), [docPlainText]);          <div className="grid grid-cols-2 gap-2">

      fetchResearch,

      formatOption.instruction,  const hasSelection = selectionInfo.hasSelection;            {QUICK_SUGGESTIONS.map((suggestion) => (

      insertMode,

      prompt,  const selectedText = selectionInfo.text;              <button

      selection,

      tags,                key={suggestion.label}

      tone.helper,

      tone.label,  const mode: PaletteMode = useMemo(() => {                onClick={() => handleSuggestionClick(suggestion.prompt)}

      tone.id,

      webResearch,    if (!hasSelection) return 'insert';                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:bg-white hover:border-gray-300"

      workspaceContext,

      workspaceName,    const lowerPrompt = prompt.toLowerCase();              >

    ],

  );    const improveKeywords = ['improve', 'polish', 'tighten', 'refine', 'rewrite'];                <div className="text-[13px] font-semibold text-gray-800">{suggestion.label}</div>



  const suggestionPills = useMemo(() => {    if (improveKeywords.some((keyword) => lowerPrompt.includes(keyword))) {                <p className="mt-1 text-[11px] text-gray-500 leading-snug">{suggestion.prompt}</p>

    const docSpecific = DOC_TYPE_SUGGESTIONS[docType] ?? [];

    return [...docSpecific, ...QUICK_ACTIONS].slice(0, 6);      return 'improve';              </button>

  }, [docType]);

    }            ))}

  return (

    <div className="fixed inset-0 z-[120] pointer-events-none">    return 'replace';          </div>

      <div

        ref={containerRef}  }, [hasSelection, prompt]);          <div className="flex flex-wrap gap-2">

        className="pointer-events-auto absolute w-[min(560px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white/95 shadow-2xl backdrop-blur-xl"

        style={{ top: clampedPosition.top, left: clampedPosition.left }}            {CHART_SUGGESTIONS.map((suggestion) => (

      >

        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 pb-3 pt-4">  const quickPrompts = useMemo(() => {              <button

          <div>

            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-400">AI command palette</p>    const base: string[] = [                key={suggestion.label}

            <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">

              <span className="text-lg">{DOC_TYPE_ICONS[docType] ?? '✨'}</span>      `Summarize the key takeaways for ${safeDocTitle}.`,                onClick={() => handleSuggestionClick(suggestion.prompt)}

              <span>{DOC_TYPE_LABELS[docType] ?? docType}</span>

              <span className="text-slate-300">•</span>      `Write a confident intro for this ${DOC_TYPE_LABELS[docType] || 'document'}.`,                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] text-blue-700 hover:bg-blue-100"

              <span>{workspaceName ?? 'Workspace'}</span>

            </div>      'Highlight risks, blockers, and mitigation steps.',              >

          </div>

          <button      'Translate this into an actionable checklist.',                {suggestion.label}

            type="button"

            onClick={onClose}    ];              </button>

            className="rounded-full border border-slate-200 p-1 text-slate-500 hover:bg-slate-100"

            aria-label="Close AI command palette"            ))}

          >

            <X size={16} />    if (tags?.length) {          </div>

          </button>

        </div>      base.push(`Emphasize these focus areas: ${tags.slice(0, 3).join(', ')}.`);        </div>



        <div className="space-y-4 px-4 py-4">    }

          <div className="rounded-xl border border-slate-200 bg-white/70 p-3">

            <div className="flex items-center justify-between gap-2">        {/* Web Search Mode Controls */}

              <label className="text-xs font-medium text-slate-600">Prompt</label>

              <div className="flex items-center gap-2 text-[11px] text-slate-400">    if (hasSelection) {        {isWebSearchEnabled && (

                <button

                  type="button"      base.unshift('Polish the highlighted copy while keeping intent.');          <div className="px-4 py-3 border-b border-gray-100 bg-white space-y-3">

                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${

                    insertMode === 'replace' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'    }            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400">

                  }`}

                  onClick={() => setInsertMode('replace')}              <span>Research focus</span>

                >

                  Rewrite    return Array.from(new Set(base)).slice(0, 6);              {webSearchMode === 'images' && lastImageQuery && (

                </button>

                <button  }, [safeDocTitle, docType, tags, hasSelection]);                <span className="tracking-normal text-[10px] text-gray-500">Last visuals: “{lastImageQuery}”</span>

                  type="button"

                  className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] ${              )}

                    insertMode === 'append' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'

                  }`}  const summarizeCrm = (label: string, list?: { company?: string; status?: string; priority?: string }[]) => {            </div>

                  onClick={() => setInsertMode('append')}

                >    if (!list || list.length === 0) return `${label}: No data.`;            <div className="flex items-center gap-2">

                  Append

                </button>    const entries = list.slice(0, 3).map((item) => {              {[

              </div>

            </div>      const status = item.status || item.priority;                { id: 'text', label: 'Text answers', description: 'Adds citations + snippets' },

            <textarea

              value={prompt}      return status ? `${item.company} (${status})` : item.company;                { id: 'images', label: 'Image references', description: 'Insert ready-to-use visuals' },

              onChange={(event) => setPrompt(event.target.value)}

              className="mt-2 h-28 w-full resize-none rounded-lg border border-slate-200 bg-white/70 p-3 text-sm text-slate-800 outline-none focus:border-slate-400"    });              ].map((option) => (

              placeholder="Ask the AI to improve this section or create something new..."

            />    const remainder = list.length > 3 ? ` +${list.length - 3} more` : '';                <button

            <div className="mt-2 flex flex-wrap gap-2">

              {suggestionPills.map((pill) => (    return `${label}: ${entries.filter(Boolean).join(', ')}${remainder}`;                  key={option.id}

                <button

                  key={pill}  };                  onClick={() => setWebSearchMode(option.id as 'text' | 'images')}

                  type="button"

                  onClick={() => runPrompt(pill)}                  className={`flex-1 rounded-xl border px-3 py-2 text-left transition ${

                  className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"

                >  const latestFinancial = data.financials?.[data.financials.length - 1];                    webSearchMode === option.id ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'

                  {pill}

                </button>  const expenseSummary = data.expenses?.slice(0, 3).map((expense) => `${expense.category}: $${expense.amount.toLocaleString()}`);                  }`}

              ))}

            </div>                >

          </div>

  const formatInstruction = () => {                  <div className="text-sm font-semibold">{option.label}</div>

          <div className="grid gap-3 md:grid-cols-2">

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">    switch (format) {                  <p className="text-[11px] text-gray-500">{option.description}</p>

              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Tone</p>

              <div className="mt-2 flex flex-wrap gap-2">      case 'list':                </button>

                {TONE_OPTIONS.map((option) => (

                  <button        return 'Format the output as concise bullet or numbered lists.';              ))}

                    key={option.id}

                    type="button"      case 'table':            </div>

                    className={`rounded-lg border px-3 py-1 text-xs ${

                      tone.id === option.id        return 'Return a <table> element with rows for each key point.';

                        ? 'border-slate-900 bg-slate-900 text-white'

                        : 'border-transparent bg-white text-slate-600 shadow'      case 'summary':            {webSearchMode === 'text' ? (

                    }`}

                    onClick={() => setTone(option)}        return 'Keep it under 120 words with crisp summary paragraphs.';              <p className="text-xs text-gray-500">

                  >

                    {option.label}      default:                We'll enrich your system prompt with the latest articles and snippets so the AI can cite live sources.

                  </button>

                ))}        return 'Use semantic HTML (<h2>, <p>, <ul>) and keep it skimmable.';              </p>

              </div>

            </div>    }            ) : (



            <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3">  };              <div className="space-y-2">

              <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Format</p>

              <div className="mt-2 flex flex-wrap gap-2">                <div className="flex flex-wrap gap-2">

                {FORMAT_OPTIONS.map((option) => (

                  <button  const buildSystemPrompt = useCallback(() => {                  <button

                    key={option.id}

                    type="button"    const profile = workspaceContext?.businessProfile;                    onClick={() => fetchImageReferences()}

                    className={`rounded-lg border px-3 py-1 text-xs ${

                      formatOption.id === option.id    const docLabel = DOC_TYPE_LABELS[docType] || docType;                    disabled={imageSearchLoading}

                        ? 'border-slate-900 bg-slate-900 text-white'

                        : 'border-transparent bg-white text-slate-600 shadow'    const profileLines: string[] = [];                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${

                    }`}

                    onClick={() => setFormatOption(option)}    if (profile) {                      imageSearchLoading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-900'

                  >

                    {option.label}      profileLines.push(`Company: ${profile.companyName}`);                    }`}

                  </button>

                ))}      if (profile.industry) profileLines.push(`Industry: ${profile.industry}`);                  >

              </div>

            </div>      if (profile.targetMarket) profileLines.push(`Target market: ${profile.targetMarket}`);                    {imageSearchLoading ? (

          </div>

      if (profile.valueProposition) profileLines.push(`Value prop: ${profile.valueProposition}`);                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

          <div className="rounded-xl border border-slate-200/80 bg-white/70 p-3">

            <div className="flex items-center justify-between">      if (profile.businessModel) profileLines.push(`Business model: ${profile.businessModel}`);                        <circle className="opacity-25" cx="12" cy="12" r="10" />

              <div className="flex items-center gap-2 text-sm text-slate-600">

                <Globe size={16} />    }                        <path className="opacity-75" d="M4 12a8 8 0 018-8" />

                <span>Live research</span>

              </div>                      </svg>

              <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-500">

                <span>{autoResearch ? 'On' : 'Off'}</span>    const workspaceDataLines = [                    ) : (

                <div

                  className={`relative h-5 w-9 rounded-full transition ${autoResearch ? 'bg-slate-900' : 'bg-slate-300'}`}      summarizeCrm('Investors', data.investors),                      'Fetch visuals'

                  onClick={() => setAutoResearch((prev) => !prev)}

                >      summarizeCrm('Customers', data.customers),                    )}

                  <span

                    className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 transform rounded-full bg-white shadow transition ${      summarizeCrm('Partners', data.partners),                  </button>

                      autoResearch ? 'translate-x-4' : 'translate-x-1'

                    }`}      data.marketing?.length                  {imageResults.length > 0 && (

                  />

                </div>        ? `Recent campaigns: ${data.marketing                    <button

              </label>

            </div>            .slice(0, 2)                      onClick={() => imageResults[0] && insertImageResult(imageResults[0])}

            <p className="mt-1 text-xs text-slate-500">Pull 3-5 fresh sources from the web and cite them inline.</p>

            <div className="mt-3 flex flex-wrap gap-2">            .map((campaign) => `${campaign.title}${campaign.status ? ` (${campaign.status})` : ''}`)                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400"

              <button

                type="button"            .join(', ')}`                    >

                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"

                onClick={() => fetchResearch('manual')}        : 'Recent campaigns: None',                      Insert top visual

                disabled={isFetchingResearch}

              >      latestFinancial                    </button>

                {isFetchingResearch ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}

                Refresh sources        ? `Latest metrics: $${latestFinancial.mrr.toLocaleString()} MRR, $${latestFinancial.gmv.toLocaleString()} GMV, ${latestFinancial.signups.toLocaleString()} signups.`                  )}

              </button>

              <button        : 'Latest metrics: Not provided.',                  {lastImageQuery && (

                type="button"

                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:border-slate-400"      expenseSummary?.length ? `Expense snapshot: ${expenseSummary.join(', ')}` : 'Expense snapshot: Not provided.',                    <button

                onClick={handleFetchImages}

                disabled={isFetchingImages}    ];                      onClick={() => fetchImageReferences(lastImageQuery)}

              >

                {isFetchingImages ? <Loader2 size={14} className="animate-spin" /> : <ImageIcon size={14} />}                      disabled={imageSearchLoading}

                Reference images

              </button>    const docMetaLines = [                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400 disabled:opacity-50"

            </div>

            {researchError && (      `Document type: ${docLabel}`,                    >

              <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">

                <AlertTriangle size={14} />      `Document title: ${safeDocTitle}`,                      Refresh last search

                {researchError}

              </div>      tags?.length ? `Tags: ${tags.slice(0, 5).join(', ')}` : 'Tags: None provided.',                    </button>

            )}

            {webResearch?.hits?.length ? (    ];                  )}

              <div className="mt-3 space-y-2 text-xs text-slate-600">

                {webResearch.hits.slice(0, 3).map((hit, index) => (                </div>

                  <div key={hit.url ?? index} className="rounded-lg border border-slate-200/70 bg-white/70 p-2">

                    <p className="font-semibold text-slate-700">[{index + 1}] {hit.title ?? 'Untitled source'}</p>    const selectionInstruction = hasSelection                {imageSearchError && <p className="text-xs text-red-500">{imageSearchError}</p>}

                    <p className="line-clamp-2 text-slate-500">{hit.description}</p>

                    <p className="mt-1 text-[11px] text-slate-400">{hit.source ?? hit.url}</p>      ? `The user highlighted this text to ${mode === 'improve' ? 'improve/refine' : 'replace'}:                {imageSearchMetadata && (

                  </div>

                ))}"""${selectedText.slice(0, 1500)}"""`                  <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">

              </div>

            ) : null}      : 'No text is highlighted. Insert brand-new content at the caret.';                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">

          </div>

                      Provider: {imageSearchMetadata.provider || 'You.com'}

          {imageResults.length > 0 && (

            <div className="rounded-xl border border-slate-200/80 bg-white/60 p-3">    const docContext = docSnippet                    </span>

              <div className="flex items-center gap-2 text-sm text-slate-600">

                <ImageIcon size={16} /> Reference imagery      ? `Document context excerpt (trimmed):                    {imageSearchMetadata.fetchedAt && (

              </div>

              {imageError && <p className="mt-1 text-xs text-amber-600">{imageError}</p>}${docSnippet}`                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">

              <div className="mt-3 grid grid-cols-3 gap-2">

                {imageResults.map((image) => (      : 'Document context excerpt unavailable.';                        {formatRelativeTime(imageSearchMetadata.fetchedAt)}

                  <button

                    key={image.imageUrl}                      </span>

                    type="button"

                    onClick={() => insertImage(image)}    const chartInstructions = `CHART GENERATION CAPABILITY:                    )}

                    className="group relative overflow-hidden rounded-lg border border-slate-200"

                  >If the user explicitly requests a chart or visualization, respond with:                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">

                    <img src={image.thumbnail ?? image.imageUrl} alt={image.title ?? 'Reference'} className="h-24 w-full object-cover" />

                    <span className="absolute inset-x-0 bottom-0 hidden bg-slate-900/80 px-2 py-1 text-[10px] text-white group-hover:block">\`\`\`chart-config                      {imageSearchMetadata.count ?? imageResults.length} results

                      Insert image

                    </span>{                    </span>

                  </button>

                ))}  "chartType": "line" | "bar" | "pie" | "area",                  </div>

              </div>

            </div>  "title": "Chart Title",                )}

          )}

  "data": [{"key": "value"}],                <div className="max-h-64 overflow-y-auto">

          {selection.text && (

            <div className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3 text-xs text-slate-600">  "dataKeys": ["key1", "key2"],                  {imageResults.length === 0 && !imageSearchError ? (

              <div className="flex items-center gap-2 text-slate-500">

                <BookOpenText size={14} /> Selected text ({selection.wordCount} words)  "xAxisKey": "key",                    <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-xs text-gray-500">

              </div>

              <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-slate-700">{selection.text}</p>  "colors": ["#3b82f6", "#10b981"],                      Describe the visual you need above, then tap “Fetch visuals” to preview research-grade images.

            </div>

          )}  "width": 700,                    </div>



          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">  "height": 350,                  ) : (

            <div className="text-xs text-slate-500">

              {statusMessage && (  "showLegend": true,                    <div className="grid grid-cols-2 gap-2">

                <span className="inline-flex items-center gap-1 text-emerald-600">

                  <CheckCircle2 size={14} /> {statusMessage}  "showGrid": true                      {imageResults.slice(0, 6).map((image) => {

                </span>

              )}}                        const sourceHost = formatHostname(image.url) || image.source || 'Source';

              {errorMessage && (

                <span className="inline-flex items-center gap-1 text-rose-600">\`\`\`                        return (

                  <AlertTriangle size={14} /> {errorMessage}

                </span>Use the available workspace data to populate the chart. Do not invent values.`;                          <div key={`${image.imageUrl}-${image.url}`} className="rounded-xl border border-gray-200 bg-gray-50 p-2 space-y-2">

              )}

            </div>                            <div className="overflow-hidden rounded-lg bg-gray-200 aspect-video">

            <button

              type="button"    return `You are Setique's embedded GTM writing copilot. Craft ${docLabel} content that feels like an experienced marketing leader wrote it.                              <img src={image.thumbnail || image.imageUrl} alt={image.title || 'Research visual'} className="h-full w-full object-cover" />

              onClick={() => runPrompt()}

              disabled={isSubmitting}                            </div>

              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"

            >BUSINESS PROFILE:                            <div>

              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}

              {isSubmitting ? 'Writing…' : 'Run command'}${profileLines.length ? profileLines.join('\n') : 'No business profile provided.'}                              <p className="text-xs font-semibold text-gray-800 leading-snug max-h-10 overflow-hidden">{image.title || 'Untitled visual'}</p>

            </button>

          </div>                              <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">

        </div>

      </div>WORKSPACE DATA:                                <span>{sourceHost}</span>

    </div>

  );${workspaceDataLines.join('\n')}                                <button

};

                                  onClick={() => insertImageResult(image)}

DOCUMENT META:                                  className="text-purple-600 font-semibold hover:text-purple-800"

${docMetaLines.join('\n')}                                >

                                  Insert

${selectionInstruction}                                </button>

                              </div>

${docContext}                            </div>

                          </div>

TONE & FORMAT:                        );

- Desired tone: ${TONE_OPTIONS.find((opt) => opt.id === tone)?.label || 'Professional'}.                      })}

- ${formatInstruction()}                    </div>

- Use semantic HTML (<h2>, <p>, <ul>, <ol>, <blockquote>, <strong>, <em>). Avoid markdown fences.                  )}

- Reference only the real data supplied above. Never hallucinate metrics.                </div>

- Focus on GTM outcomes, clarity, and next actions.              </div>

            )}

${chartInstructions}          </div>

        )}

Important: Only return the content to insert or replace. Do not include meta commentary or explanations.`;      </div>

  }, [workspaceContext?.businessProfile, data, docType, safeDocTitle, tags, hasSelection, mode, selectedText, docSnippet, tone, format]);

  <div className="border-t border-gray-100 bg-white">

  const insertImageResult = useCallback(        {/* Input Area */}

    (image: YouSearchImageResult) => {        <div className="p-3">

      const html = buildImageInsertHtml(image);          <div className="relative flex items-center">

      if (!html) return;            <textarea

      editor.chain().focus().insertContent(html).run();              ref={textareaRef}

    },              value={prompt}

    [editor]              onChange={(e) => setPrompt(e.target.value)}

  );              placeholder={hasSelection ? "How should I change this text?" : "Describe what you want to write or visualize..."}

              className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"

  const fetchImageReferences = useCallback(              rows={1}

    async (queryOverride?: string) => {              onKeyDown={(e) => {

      const baseQuery = queryOverride || prompt.trim() || selectedText || safeDocTitle;                if (e.key === 'Enter' && !e.shiftKey) {

      if (!baseQuery) {                  e.preventDefault();

        setImageSearchError('Describe the visual you need first.');                  handleGenerate();

        return;                }

      }                // Auto-resize

      setImageSearchError(null);                e.currentTarget.style.height = 'auto';

      setImageSearchLoading(true);                e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';

      try {              }}

        const results = await searchWeb(baseQuery, 'images', { count: 6 });              style={{ minHeight: '46px', maxHeight: '200px' }}

        setImageResults(results.images || []);            />

        setImageSearchMetadata(results.metadata || null);            <button

        setLastImageQuery(baseQuery);              onClick={handleGenerate}

      } catch (err) {              disabled={loading || !prompt.trim()}

        setImageResults([]);              className={`absolute right-2 p-2 rounded-lg transition-all ${

        setImageSearchMetadata(null);                loading || !prompt.trim()

        setImageSearchError(err instanceof Error ? err.message : 'Failed to fetch visuals.');                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'

      } finally {                  : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'

        setImageSearchLoading(false);              }`}

      }            >

    },              {loading ? (

    [prompt, selectedText, safeDocTitle]                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">

  );                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>

                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>

  const handleSuggestionClick = (suggestionPrompt: string) => {                </svg>

    setPrompt(suggestionPrompt);              ) : (

    textareaRef.current?.focus();                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>

  };              )}

            </button>

  const handleGenerate = useCallback(async () => {          </div>

    if (!prompt.trim()) {

      setError('Please describe what you need.');          {error && (

      return;            <div className="mt-2 text-xs text-red-500 px-1">

    }              {error}

            </div>

    setLoading(true);          )}

    setError(null);        </div>



    try {        {/* Minimal Footer */}

      let systemPrompt = buildSystemPrompt();        <div className="px-4 pb-3 pt-0 flex justify-between items-center">

          <div className="flex items-center gap-2">

      if (isWebSearchEnabled) {            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${hasSelection ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>

        if (webSearchMode === 'text') {              {hasSelection ? (mode === 'improve' ? 'IMPROVE' : 'REPLACE') : 'INSERT'}

          try {            </span>

            const searchResults = await searchWeb(prompt, 'search');            <span className="text-[10px] text-gray-400">

            if (searchResults.hits && searchResults.hits.length > 0) {              Context: {[

              const webContext = `\n\nWEB SEARCH RESULTS:\n${searchResults.hits                (data.investors?.length || 0) > 0 ? 'Investors' : null,

                .map((hit, index) => `[${index + 1}] ${hit.title}: ${hit.description} (${hit.url})`)                (data.customers?.length || 0) > 0 ? 'Customers' : null,

                .join('\n')}`;                (data.financials?.length || 0) > 0 ? 'Revenue' : null,

              const snippets = searchResults.hits                (data.expenses?.length || 0) > 0 ? 'Expenses' : null

                .map((hit, index) => (hit.snippets ? `[${index + 1}] Snippets: ${hit.snippets.join(' ')}` : ''))              ].filter(Boolean).length} sources

                .filter(Boolean)            </span>

                .join('\n');          </div>

              systemPrompt += webContext;          <span className="text-[10px] text-gray-400 font-medium">

              if (snippets) {            Enter to run

                systemPrompt += `\n\nSnippets:\n${snippets}`;          </span>

              }        </div>

              const provider = searchResults.metadata?.provider ? ` via ${searchResults.metadata.provider}` : '';      </div>

              const fetched = searchResults.metadata?.fetchedAt    </div>

                ? ` (fetched ${formatRelativeTime(searchResults.metadata.fetchedAt)})`  );

                : '';

              systemPrompt += `\n\nCITATIONS:\n1. Cite information from the search results using [1], [2] style inline references.\n2. Add a Sources section at the end formatted as <ul><li><a href="url">Title</a></li></ul>.${provider}${fetched}`;Important: Only return the content to insert/replace. Do not include explanations or meta-commentary.`;

            }  };

          } catch (err) {

            console.error('Web search failed', err);  const handleGenerate = async () => {

          }    if (!prompt.trim()) {

        } else if (webSearchMode === 'images') {      setError('Please enter a prompt');

          if (imageResults.length) {      return;

            const context = imageResults    }

              .slice(0, 4)

              .map((image, index) => {    setLoading(true);

                const label = image.title || formatHostname(image.url) || `Image ${index + 1}`;    setError(null);

                const source = formatHostname(image.url) || image.source || '';

                return `[Image ${index + 1}] ${label}${source ? ` (source: ${source})` : ''}`;    try {

              })      // Build system prompt with full context

              .join('\n');      let systemPrompt = buildSystemPrompt();

            const provider = imageSearchMetadata?.provider || 'You.com';      

            const fetched = imageSearchMetadata?.fetchedAt ? formatRelativeTime(imageSearchMetadata.fetchedAt) : '';      // Add web search context if enabled

            systemPrompt += `\n\nIMAGE REFERENCES:\n${context}\nProvider: ${provider}${fetched ? ` · ${fetched}` : ''}. Mention which image index should pair with the copy.`;      if (isWebSearchEnabled) {

          } else {        if (webSearchMode === 'text') {

            systemPrompt += '\n\nThe user enabled image research but no visuals are loaded. Recommend imagery concepts to pair with the copy.';          try {

          }            const searchResults = await searchWeb(prompt, 'search');

        }            if (searchResults.hits && searchResults.hits.length > 0) {

      }              const webContext = `\n\nWEB SEARCH RESULTS (Use these to answer the user's request):\n${searchResults.hits.map((hit, i) => `[${i + 1}] ${hit.title}: ${hit.description} (${hit.url})`).join('\n')}`;



      let userPrompt = prompt;              const snippets = searchResults.hits

      if (mode === 'replace' && selectedText) {                .map((hit, i) => (hit.snippets ? `[${i + 1}] Snippets: ${hit.snippets.join(' ')}` : ''))

        userPrompt = `Replace the following text based on this request: "${prompt}"\n\nCurrent text:\n${selectedText}`;                .filter(Boolean)

      } else if (mode === 'improve' && selectedText) {                .join('\n');

        userPrompt = `Improve the following text: "${prompt}"\n\nCurrent text:\n${selectedText}`;

      }              systemPrompt += webContext;

              if (snippets) {

      const response = await getAiResponse(                systemPrompt += `\n\nSnippets:\n${snippets}`;

        [{ role: 'user', parts: [{ text: userPrompt }] }],              }

        systemPrompt,

        false,              const providerLabel = searchResults.metadata?.provider ? ` via ${searchResults.metadata.provider}` : '';

        workspaceContext.workspaceId,              const fetchedLabel = searchResults.metadata?.fetchedAt

        'doc-editor'                ? ` (fetched ${formatRelativeTime(searchResults.metadata.fetchedAt)})`

      );                : '';



      let responseText = extractTextFromResponse(response);              systemPrompt += `\n\nCITATION INSTRUCTIONS:

      responseText = responseText.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();             1. You MUST cite your sources when using information from the WEB SEARCH RESULTS.

             2. Use inline citations like [1], [2] corresponding to the source numbers.

      const chartBlock = responseText.match(/```chart-config\s*\n([\s\S]*?)\n```/);             3. At the end of your response, include a "Sources" section with links to the URLs provided in the search results.

      if (chartBlock) {             4. Format the sources as an HTML list: <ul><li><a href="url">Title</a></li></ul>.

        try {             ${providerLabel}${fetchedLabel}`;

          const chartConfig = JSON.parse(chartBlock[1]);            }

          if (chartConfig.chartType && chartConfig.data && chartConfig.dataKeys) {          } catch (e) {

            editor.chain().focus().insertChart(chartConfig).run();            console.error('Web search failed', e);

            onClose();          }

            setLoading(false);        } else if (webSearchMode === 'images') {

            return;          const visuals = imageResults;

          }          if (visuals.length > 0) {

        } catch (chartError) {            const visualContext = visuals

          console.warn('Failed to parse chart config, falling back to text.', chartError);              .slice(0, 4)

        }              .map((image, index) => {

      }                const label = image.title || formatHostname(image.url) || formatHostname(image.source) || `Image ${index + 1}`;

                const source = formatHostname(image.url) || image.source || '';

      if (hasSelection && (mode === 'replace' || mode === 'improve')) {                return `[Image ${index + 1}] ${label}${source ? ` (source: ${source})` : ''}`;

        editor.chain().focus().deleteSelection().insertContent(responseText).run();              })

      } else {              .join('\n');

        editor.chain().focus().insertContent(responseText).run();

      }            const providerLabel = imageSearchMetadata?.provider

              ? `Provided by ${imageSearchMetadata.provider}`

      onClose();              : 'Pulled from live image search';

    } catch (err) {            const fetchedLabel = formatRelativeTime(imageSearchMetadata?.fetchedAt);

      console.error('AI generation failed:', err);            systemPrompt += `\n\nIMAGE REFERENCES AVAILABLE:\n${visualContext}\n${providerLabel}${fetchedLabel ? ` · ${fetchedLabel}` : ''}\nIncorporate these visuals when relevant and mention which reference number pairs with the copy.`;

      setError(err instanceof Error ? err.message : 'Failed to generate content.');          } else {

    } finally {            systemPrompt += '\n\nThe user enabled image mode but no visuals have been fetched yet. Recommend imagery concepts that should accompany the copy.';

      setLoading(false);          }

    }        }

  }, [      }

    prompt,      

    buildSystemPrompt,      // Build user prompt based on mode

    isWebSearchEnabled,      let userPrompt = '';

    webSearchMode,      if (mode === 'replace' && selectedText) {

    imageResults,        userPrompt = `Replace the following text based on this request: "${prompt}"\n\nCurrent text:\n${selectedText}`;

    imageSearchMetadata,      } else if (mode === 'improve' && selectedText) {

    mode,        userPrompt = `Improve the following text: "${prompt}"\n\nCurrent text:\n${selectedText}`;

    selectedText,      } else {

    workspaceContext.workspaceId,        userPrompt = prompt;

    editor,      }

    hasSelection,

    onClose,      // Call AI with same service as main assistant

  ]);      const response = await getAiResponse(

        [{ role: 'user', parts: [{ text: userPrompt }] }],

  useEffect(() => {        systemPrompt,

    const handleKeyDown = (event: KeyboardEvent) => {        false,

      if (event.key ==="Escape") {        workspaceContext.workspaceId

        event.preventDefault();      );

        onClose();

      }      // Extract and clean response

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {      let responseText = extractTextFromResponse(response);

        event.preventDefault();      

        handleGenerate();      console.log('AI Response:', responseText);

      }      

    };      // Check if response contains chart JSON in fenced code block

      // Use stricter sentinel to avoid false positives from prose containing braces

    document.addEventListener('keydown', handleKeyDown);      try {

    return () => document.removeEventListener('keydown', handleKeyDown);        // Look for ```chart-config fenced code block

  }, [handleGenerate, onClose]);

        const chartMatch = responseText.match(/```chart-config\s*\n([\s\S]*?)\n```/);

  return (        if (chartMatch) {

    <div          const chartConfig = JSON.parse(chartMatch[1]);;

      ref={paletteRef}          

      className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] w-full max-w-[520px] overflow-hidden flex flex-col"          // Validate chart config has required fields

      style={{          if (chartConfig.chartType && chartConfig.data && chartConfig.dataKeys) {

        top: computedPosition.top,            // Insert chart using editor command

        left: computedPosition.left,            editor.chain().focus().insertChart(chartConfig).run();

        maxHeight: `calc(100vh - ${VIEWPORT_MARGIN * 2}px)`            onClose();

      }}            return;

    >          }

      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100 flex items-center justify-between">        }

        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">      } catch (parseError) {

          <span className="text-lg">✨</span>        // Treat as regular content if chart parsing fails

          <span>AI Assistant</span>      }

        </div>      

        <div className="flex items-center gap-2">      // Remove markdown code blocks if present

          <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-white/60 rounded-full border border-gray-200/50">      responseText = responseText.replace(/```html\n?/g, '').replace(/```\n?/g, '').trim();

            {derivedWorkspaceName}      

          </span>      // Insert or replace content in editor

          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">      if (hasSelection && (mode === 'replace' || mode === 'improve')) {

            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">        editor.chain()

              <line x1="18" y1="6" x2="6" y2="18" />          .focus()

              <line x1="6" y1="6" x2="18" y2="18" />          .deleteSelection()

            </svg>          .insertContent(responseText)

          </button>          .run();

        </div>      } else {

      </div>        editor.chain()

          .focus()

      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">          .insertContent(responseText)

        <div className="flex itemscreen gap-4">          .run();

          <button      }

            onClick={() => setShowOptions((prev) => !prev)}

            className="text-xs font-medium text-gray-500 hover.text-gray-800 flex items-center gap-1"      onClose();

          >    } catch (err: any) {

            <span className="text-lg">⚙️</span> {showOptions ? 'Hide Options' : 'Show Options'}      console.error('AI generation failed:', err);

          </button>      setError(err.message || 'Failed to generate content. Please try again.');

          {!showOptions && (    } finally {

            <div className="flex items-center gap-2 text-xs text-gray-400">      setLoading(false);

              <span>{TONE_OPTIONS.find((opt) => opt.id === tone)?.icon} {TONE_OPTIONS.find((opt) => opt.id === tone)?.label}</span>    }

              <span>•</span>  };

              <span>{FORMAT_OPTIONS.find((opt) => opt.id === format)?.icon} {FORMAT_OPTIONS.find((opt) => opt.id === format)?.label}</span>

            </div>  const handleSuggestionClick = (suggestionPrompt: string) => {

          )}    setPrompt(suggestionPrompt);

        </div>    textareaRef.current?.focus();

        <button  };

          onClick={() => setIsWebSearchEnabled((prev) => !prev)}

          className={`text-xs font-medium px-2 py-1 rounded-full border flex items-center gap-1 transition-all ${  return (

            isWebSearchEnabled ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'    <div

          }`}      ref={paletteRef}

        >      className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 z-[9999] w-[500px] overflow-hidden animate-in fade-in zoom-in-95 duration-200"

          <span>🌐</span> Web Search {isWebSearchEnabled ? 'ON' : 'OFF'}      style={{ 

        </button>        top: Math.min(position.top, window.innerHeight - 200), 

      </div>        left: Math.min(position.left, window.innerWidth - 520) 

      }}

      <div className="flex-1 overflow-y-auto">    >

        {showOptions && (      {/* Minimal Header */}

          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-2 gap-4">      <div className="px-4 py-3 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100 flex items-center justify-between">

            <div>         <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">

              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tone</label>            <span className="text-lg">✨</span>

              <div className="grid grid-cols-2 gap-2">            <span>AI Assistant</span>

                {TONE_OPTIONS.map((opt) => (         </div>

                  <button         <div className="flex items-center gap-2">

                    key={opt.id}             <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-white/60 rounded-full border border-gray-200/50">

                    onClick={() => setTone(opt.id)}               {derivedWorkspaceName}

                    className={`text-xs px-2 py-1.5 rounded-md border text-left flex items-center gap-2 transition-all ${             </span>

                      tone === opt.id ? 'bg-white border-purple-500 text-purple-700 shadow-sm ring-1 ring-purple-500/20' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'             <button

                    }`}                onClick={onClose}

                  >                className="text-gray-400 hover:text-gray-600 transition-colors"

                    <span>{opt.icon}</span>             >

                    {opt.label}                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>

                  </button>             </button>

                ))}         </div>

              </div>      </div>

            </div>

            <div>      {/* Options Toggle */}

              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Format</label>      <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">

              <div className="grid grid-cols-2 gap-2">        <div className="flex items-center gap-4">

                {FORMAT_OPTIONS.map((opt) => (            <button 

                  <button              onClick={() => setShowOptions(!showOptions)}

                    key={opt.id}              className="text-xs font-medium text-gray-500 hover:text-gray-800 flex items-center gap-1"

                    onClick={() => setFormat(opt.id)}            >

                    className={`text-xs px-2 py-1.5 rounded-md border text-left flex items-center gap-2 transition-all ${              <span className="text-lg">⚙️</span> {showOptions ? 'Hide Options' : 'Show Options'}

                      format === opt.id ? 'bg-white border-purple-500 text-purple-700 shadow-sm ring-1 ring-purple-500/20' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'            </button>

                    }`}            

                  >            {!showOptions && (

                    <span>{opt.icon}</span>              <div className="flex items-center gap-2 text-xs text-gray-400">

                    {opt.label}                 <span>{TONE_OPTIONS.find(t => t.id === tone)?.icon} {TONE_OPTIONS.find(t => t.id === tone)?.label}</span>

                  </button>                 <span>•</span>

                ))}                 <span>{FORMAT_OPTIONS.find(f => f.id === format)?.icon} {FORMAT_OPTIONS.find(f => f.id === format)?.label}</span>

              </div>              </div>

            </div>            )}

          </div>        </div>

        )}

        {/* Web Search Toggle */}

        <div className="px-4 py-3 border-b border-gray-100 bg-white space-y-3">        <button

          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400">            onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}

            <span>Jump-start ideas</span>            className={`text-xs font-medium px-2 py-1 rounded-full border flex items-center gap-1 transition-all ${

            <span className="tracking-normal text-[10px] text-gray-500 font-medium">                isWebSearchEnabled 

              {safeDocTitle === 'Untitled Document' ? 'Use workspace context' : safeDocTitle}                ? 'bg-blue-50 border-blue-200 text-blue-700' 

            </span>                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'

          </div>            }`}

          <div className="flex flex-wrap gap-2">        >

            {quickPrompts.map((promptOption) => (            <span>🌐</span> Web Search {isWebSearchEnabled ? 'ON' : 'OFF'}

              <button        </button>

                key={promptOption}      </div>

                onClick={() => handleSuggestionClick(promptOption)}

                className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-[11px] text-gray-600 hover:border-gray-500"      {/* Expanded Options */}

              >      {showOptions && (

                {promptOption}        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 grid grid-cols-2 gap-4 animate-in slide-in-from-top-2 duration-200">

              </button>          <div>

            ))}            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Tone</label>

          </div>            <div className="grid grid-cols-2 gap-2">

          <div className="grid grid-cols-2 gap-2">              {TONE_OPTIONS.map((opt) => (

            {QUICK_SUGGESTIONS.map((suggestion) => (                <button

              <button                  key={opt.id}

                key={suggestion.label}                  onClick={() => setTone(opt.id)}

                onClick={() => handleSuggestionClick(suggestion.prompt)}                  className={`text-xs px-2 py-1.5 rounded-md border text-left flex items-center gap-2 transition-all ${

                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:bg-white hover:border-gray-300"                    tone === opt.id 

              >                      ? 'bg-white border-purple-500 text-purple-700 shadow-sm ring-1 ring-purple-500/20' 

                <div className="text-[13px] font-semibold text-gray-800">{suggestion.label}</div>                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'

                <p className="mt-1 text-[11px] text-gray-500 leading-snug">{suggestion.prompt}</p>                  }`}

              </button>                >

            ))}                  <span>{opt.icon}</span>

          </div>                  {opt.label}

          <div className="flex flex-wrap gap-2">                </button>

            {CHART_SUGGESTIONS.map((suggestion) => (              ))}

              <button            </div>

                key={suggestion.label}          </div>

                onClick={() => handleSuggestionClick(suggestion.prompt)}          <div>

                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] text-blue-700 hover:bg-blue-100"            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Format</label>

              >            <div className="grid grid-cols-2 gap-2">

                {suggestion.label}              {FORMAT_OPTIONS.map((opt) => (

              </button>                <button

            ))}                  key={opt.id}

          </div>                  onClick={() => setFormat(opt.id)}

        </div>                  className={`text-xs px-2 py-1.5 rounded-md border text-left flex items-center gap-2 transition-all ${

                    format === opt.id 

        {isWebSearchEnabled && (                      ? 'bg-white border-purple-500 text-purple-700 shadow-sm ring-1 ring-purple-500/20' 

          <div className="px-4 py-3 border-b border-gray-100 bg-white space-y-3">                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'

            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400">                  }`}

              <span>Research focus</span>                >

              {webSearchMode === 'images' && lastImageQuery && (                  <span>{opt.icon}</span>

                <span className="tracking-normal text-[10px] text-gray-500">Last visuals: “{lastImageQuery}”</span>                  {opt.label}

              )}                </button>

            </div>              ))}

            <div className="flex items-center gap-2">            </div>

              {[          </div>

                { id: 'text', label: 'Text answers', description: 'Adds citations + snippets' },        </div>

                { id: 'images', label: 'Image references', description: 'Insert ready-to-use visuals' },      )}

              ].map((option) => (

                <button      {/* Quick Prompts */}

                  key={option.id}      <div className="px-4 py-3 border-b border-gray-100 bg-white space-y-3">

                  onClick={() => setWebSearchMode(option.id as 'text' | 'images')}        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400">

                  className={`flex-1 rounded-xl border px-3 py-2 text-left transition ${          <span>Jump-start ideas</span>

                    webSearchMode === option.id          <span className="tracking-normal text-[10px] text-gray-500 font-medium">

                      ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm'            {safeDocTitle === 'Untitled Document' ? 'Use workspace context' : safeDocTitle}

                      : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'          </span>

                  }`}        </div>

                >        <div className="flex flex-wrap gap-2">

                  <div className="text-sm font-semibold">{option.label}</div>          {quickPrompts.map((promptOption) => (

                  <p className="text-[11px] text-gray-500">{option.description}</p>            <button

                </button>              key={promptOption}

              ))}              onClick={() => handleSuggestionClick(promptOption)}

            </div>              className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-[11px] text-gray-600 hover:border-gray-500"

            >

            {webSearchMode === 'text' ? (              {promptOption}

              <p className="text-xs text-gray-500">            </button>

                We'll enrich your system prompt with the latest articles and snippets so the AI can cite live sources.          ))}

              </p>        </div>

            ) : (        <div className="grid grid-cols-2 gap-2">

              <div className="space-y-2">          {QUICK_SUGGESTIONS.map((suggestion) => (

                <div className="flex flex-wrap gap-2">            <button

                  <button              key={suggestion.label}

                    onClick={() => fetchImageReferences()}              onClick={() => handleSuggestionClick(suggestion.prompt)}

                    disabled={imageSearchLoading}              className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-left transition hover:bg-white hover:border-gray-300"

                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${            >

                      imageSearchLoading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-900'              <div className="text-[13px] font-semibold text-gray-800">{suggestion.label}</div>

                    }`}              <p className="mt-1 text-[11px] text-gray-500 leading-snug">{suggestion.prompt}</p>

                  >            </button>

                    {imageSearchLoading ? (          ))}

                      <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">        </div>

                        <circle className="opacity-25" cx="12" cy="12" r="10" />        <div className="flex flex-wrap gap-2">

                        <path className="opacity-75" d="M4 12a8 8 0 018-8" />          {CHART_SUGGESTIONS.map((suggestion) => (

                      </svg>            <button

                    ) : (              key={suggestion.label}

                      'Fetch visuals'              onClick={() => handleSuggestionClick(suggestion.prompt)}

                    )}              className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] text-blue-700 hover:bg-blue-100"

                  </button>            >

                  {imageResults.length > 0 && (              {suggestion.label}

                    <button            </button>

                      onClick={() => imageResults[0] && insertImageResult(imageResults[0])}          ))}

                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400"        </div>

                    >      </div>

                      Insert top visual

                    </button>      {/* Web Search Mode Controls */}

                  )}      {isWebSearchEnabled && (

                  {lastImageQuery && (        <div className="px-4 py-3 border-b border-gray-100 bg-white space-y-3">

                    <button          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-400">

                      onClick={() => fetchImageReferences(lastImageQuery)}            <span>Research focus</span>

                      disabled={imageSearchLoading}            {webSearchMode === 'images' && lastImageQuery && (

                      className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400 disabled:opacity-50"              <span className="tracking-normal text-[10px] text-gray-500">Last visuals: “{lastImageQuery}”</span>

                    >            )}

                      Refresh last search          </div>

                    </button>          <div className="flex items-center gap-2">

                  )}            {[

                </div>              { id: 'text', label: 'Text answers', description: 'Adds citations + snippets' },

                {imageSearchError && <p className="text-xs text-red-500">{imageSearchError}</p>}              { id: 'images', label: 'Image references', description: 'Insert ready-to-use visuals' },

                {imageSearchMetadata && (            ].map((option) => (

                  <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">              <button

                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">                key={option.id}

                      Provider: {imageSearchMetadata.provider || 'You.com'}                onClick={() => setWebSearchMode(option.id as 'text' | 'images')}

                    </span>                className={`flex-1 rounded-xl border px-3 py-2 text-left transition ${

                    {imageSearchMetadata.fetchedAt && (                  webSearchMode === option.id ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'

                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">                }`}

                        {formatRelativeTime(imageSearchMetadata.fetchedAt)}              >

                      </span>                <div className="text-sm font-semibold">{option.label}</div>

                    )}                <p className="text-[11px] text-gray-500">{option.description}</p>

                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">              </button>

                      {imageSearchMetadata.count ?? imageResults.length} results            ))}

                    </span>          </div>

                  </div>

                )}          {webSearchMode === 'text' ? (

                <div className="max-h-64 overflow-y-auto">            <p className="text-xs text-gray-500">

                  {imageResults.length === 0 && !imageSearchError ? (              We'll enrich your system prompt with the latest articles and snippets so the AI can cite live sources.

                    <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-xs text-gray-500">            </p>

                      Describe the visual you need above, then tap “Fetch visuals” to preview research-grade images.          ) : (

                    </div>            <div className="space-y-2">

                  ) : (              <div className="flex flex-wrap gap-2">

                    <div className="grid grid-cols-2 gap-2">                <button

                      {imageResults.slice(0, 6).map((image) => {                  onClick={() => fetchImageReferences()}

                        const sourceHost = formatHostname(image.url) || image.source || 'Source';                  disabled={imageSearchLoading}

                        return (                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${

                          <div key={`${image.imageUrl}-${image.url}`} className="rounded-xl border border-gray-200 bg-gray-50 p-2 space-y-2">                    imageSearchLoading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-900'

                            <div className="overflow-hidden rounded-lg bg-gray-200 aspect-video">                  }`}

                              <img src={image.thumbnail || image.imageUrl} alt={image.title || 'Research visual'} className="h-full w-full object-cover" />                >

                            </div>                  {imageSearchLoading ? (

                            <div>                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">

                              <p className="text-xs font-semibold text-gray-800 leading-snug max-h-10 overflow-hidden">                      <circle className="opacity-25" cx="12" cy="12" r="10" />

                                {image.title || 'Untitled visual'}                      <path className="opacity-75" d="M4 12a8 8 0 018-8" />

                              </p>                    </svg>

                              <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">                  ) : (

                                <span>{sourceHost}</span>                    'Fetch visuals'

                                <button onClick={() => insertImageResult(image)} className="text-purple-600 font-semibold hover:text-purple-800">                  )}

                                  Insert                </button>

                                </button>                {imageResults.length > 0 && (

                              </div>                  <button

                            </div>                    onClick={() => imageResults[0] && insertImageResult(imageResults[0])}

                          </div>                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400"

                        );                  >

                      })}                    Insert top visual

                    </div>                  </button>

                  )}                )}

                </div>                {lastImageQuery && (

              </div>                  <button

            )}                    onClick={() => fetchImageReferences(lastImageQuery)}

          </div>                    disabled={imageSearchLoading}

        )}                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:border-gray-400 disabled:opacity-50"

      </div>                  >

                    Refresh last search

      <div className="border-t border-gray-100 bg-white">                  </button>

        <div className="p-3">                )}

          <div className="relative flex items-center">              </div>

            <textarea              {imageSearchError && <p className="text-xs text-red-500">{imageSearchError}</p>}

              ref={textareaRef}              {imageSearchMetadata && (

              value={prompt}                <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">

              onChange={(e) => setPrompt(e.target.value)}                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">

              placeholder={hasSelection ? 'How should I change this text?' : 'Describe what you want to write or visualize...'}                    Provider: {imageSearchMetadata.provider || 'You.com'}

              className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"                  </span>

              rows={1}                  {imageSearchMetadata.fetchedAt && (

              onKeyDown={(e) => {                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">

                if (e.key === 'Enter' && !e.shiftKey) {                      {formatRelativeTime(imageSearchMetadata.fetchedAt)}

                  e.preventDefault();                    </span>

                  handleGenerate();                  )}

                }                  <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">

                e.currentTarget.style.height = 'auto';                    {imageSearchMetadata.count ?? imageResults.length} results

                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;                  </span>

              }}                </div>

              style={{ minHeight: '46px', maxHeight: '200px' }}              )}

            />              <div className="max-h-64 overflow-y-auto">

            <button                {imageResults.length === 0 && !imageSearchError ? (

              onClick={handleGenerate}                  <div className="rounded-xl border border-dashed border-gray-300 px-4 py-6 text-center text-xs text-gray-500">

              disabled={loading || !prompt.trim()}                    Describe the visual you need above, then tap “Fetch visuals” to preview research-grade images.

              className={`absolute right-2 p-2 rounded-lg transition-all ${                  </div>

                loading || !prompt.trim() ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'                ) : (

              }`}                  <div className="grid grid-cols-2 gap-2">

            >                    {imageResults.slice(0, 6).map((image) => {

              {loading ? (                      const sourceHost = formatHostname(image.url) || image.source || 'Source';

                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">                      return (

                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />                        <div key={`${image.imageUrl}-${image.url}`} className="rounded-xl border border-gray-200 bg-gray-50 p-2 space-y-2">

                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />                          <div className="overflow-hidden rounded-lg bg-gray-200 aspect-video">

                </svg>                            <img src={image.thumbnail || image.imageUrl} alt={image.title || 'Research visual'} className="h-full w-full object-cover" />

              ) : (                          </div>

                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">                          <div>

                  <line x1="22" y1="2" x2="11" y2="13" />                            <p className="text-xs font-semibold text-gray-800 leading-snug max-h-10 overflow-hidden">{image.title || 'Untitled visual'}</p>

                  <polygon points="22 2 15 22 11 13 2 9 22 2" />                            <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">

                </svg>                              <span>{sourceHost}</span>

              )}                              <button

            </button>                                onClick={() => insertImageResult(image)}

          </div>                                className="text-purple-600 font-semibold hover:text-purple-800"

          {error && <div className="mt-2 text-xs text-red-500 px-1">{error}</div>}                              >

        </div>                                Insert

        <div className="px-4 pb-3 pt-0 flex justify-between items-center text-[10px] text-gray-500">                              </button>

          <div className="flex items-center gap-2">                            </div>

            <span className={`font-medium px-1.5 py-0.5 rounded ${hasSelection ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>                          </div>

              {hasSelection ? (mode === 'improve' ? 'IMPROVE' : 'REPLACE') : 'INSERT'}                        </div>

            </span>                      );

            <span>                    })}

              Context: {[                  </div>

                (data.investors?.length || 0) > 0 ? 'Investors' : null,                )}

                (data.customers?.length || 0) > 0 ? 'Customers' : null,              </div>

                (data.financials?.length || 0) > 0 ? 'Revenue' : null,            </div>

                (data.expenses?.length || 0) > 0 ? 'Expenses' : null,          )}

              ]        </div>

                .filter(Boolean)      )}

                .length}{' '}

              sources      {/* Input Area */}

            </span>      <div className="p-3">

          </div>        <div className="relative flex items-center">

          <span className="font-medium">Enter to run</span>            <textarea

        </div>                ref={textareaRef}

      </div>                value={prompt}

    </div>                onChange={(e) => setPrompt(e.target.value)}

  );                placeholder={hasSelection ? "How should I change this text?" : "Describe what you want to write or visualize..."}

};                className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all resize-none"

                rows={1}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleGenerate();
                    }
                    // Auto-resize
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px';
                }}
                style={{ minHeight: '46px', maxHeight: '200px' }}
            />
            <button
                onClick={handleGenerate}
                disabled={loading || !prompt.trim()}
                className={`absolute right-2 p-2 rounded-lg transition-all ${
                    loading || !prompt.trim() 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                  }`}
            >
                {loading ? (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                )}
            </button>
        </div>
        
        {error && (
            <div className="mt-2 text-xs text-red-500 px-1">
                {error}
            </div>
        )}
      </div>
      
      {/* Minimal Footer */}
       <div className="px-4 pb-3 pt-0 flex justify-between items-center">
          <div className="flex items-center gap-2">
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${hasSelection ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                {hasSelection ? (mode === 'improve' ? 'IMPROVE' : 'REPLACE') : 'INSERT'}
              </span>
              <span className="text-[10px] text-gray-400">
                Context: {[
                  (data.investors?.length || 0) > 0 ? 'Investors' : null,
                  (data.customers?.length || 0) > 0 ? 'Customers' : null,
                  (data.financials?.length || 0) > 0 ? 'Revenue' : null,
                  (data.expenses?.length || 0) > 0 ? 'Expenses' : null
                ].filter(Boolean).length} sources
              </span>
          </div>
          <span className="text-[10px] text-gray-400 font-medium">
             Enter to run
          </span>
       </div>
    </div>
  );
};
