import React, {
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react';
import { useClickOutside } from '../../hooks';
import { formatRelativeTime } from '../../lib/utils/dateUtils';
import type { Editor } from '@tiptap/react';
import {
	AlertTriangle,
	BookOpenText,
	CheckCircle2,
	Globe,
	Image as ImageIcon,
	Lock,
	RefreshCw,
	Search,
	Sparkles,
	Wand2,
	X,
} from 'lucide-react';
import { DOC_TYPE_ICONS, DOC_TYPE_LABELS } from '../../constants';
import type { DocType, DashboardData, BusinessProfile, PlanType, WorkspaceRole } from '../../types';
import type { AIWorkspaceContext } from '../../hooks/useAIWorkspaceContext';
import {
	getAiResponse,
	type Content,
	type GenerateContentResponse,
} from '../../services/groqService';
import { ModerationError, formatModerationErrorMessage } from '../../lib/services/moderationService';
import { searchWeb } from '@/src/lib/services/youSearchService';
import type {
	YouSearchImageResult,
	YouSearchMetadata,
	YouSearchResponse,
} from '@/src/lib/services/youSearch.types';
import { parseAIResponse, isSafeContent } from '../../utils/aiContentParser';
import {
	commandRegistry,
	type CommandInsertMode,
	type CommandMatch,
	type CommandRuntimeContext,
} from '../../lib/ai/commandRegistry';

interface Position {
	top: number;
	left: number;
}

interface SelectionState {
	text: string;
	range: { from: number; to: number } | null;
	wordCount: number;
}

interface ToneOption {
	id: string;
	label: string;
	icon: string;
	helper: string;
}

interface FormatOption {
	id: string;
	label: string;
	icon: string;
	helper: string;
	instruction: string;
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
	planType: PlanType;
	workspaceRole: WorkspaceRole;
	onUpgradeNeeded?: () => void;
}

const QUICK_ACTIONS: string[] = [
	'Summarize this section',
	'Make it more concise',
	'Add action items',
	'Fix grammar and tone',
];

const DOC_TYPE_SUGGESTIONS: Partial<Record<DocType, string[]>> = {
	campaign: [
		'Draft launch announcement',
		'Add KPIs and metrics',
	],
	brief: [
		'Create executive summary',
		'Extract key takeaways',
	],
	battlecard: [
		'List key differentiators',
		'Write objection handlers',
	],
	outbound_template: [
		'Create outbound sequence',
		'Personalize for persona',
	],
	persona: [
		'Summarize pain points',
		'Create talk track',
	],
	competitive_snapshot: [
		'TL;DR competitive threats',
		'Board-ready summary',
	],
};

const TONE_OPTIONS: ToneOption[] = [
	{ id: 'neutral', label: 'Neutral', icon: '🌤️', helper: 'Balanced' },
	{ id: 'friendly', label: 'Casual', icon: '😊', helper: 'Conversational' },
	{ id: 'authoritative', label: 'Formal', icon: '🏛️', helper: 'Executive' },
	{ id: 'bold', label: 'Bold', icon: '⚡', helper: 'High energy' },
];

const FORMAT_OPTIONS: FormatOption[] = [
	{ id: 'auto', label: 'Auto', icon: '✨', helper: 'AI decides', instruction: '' },
	{
		id: 'bullets',
		label: 'Bullets',
		icon: '•',
		helper: 'List format',
		instruction: 'Respond as a bulleted list with emoji + bold summary per item.',
	},
	{
		id: 'summary',
		label: 'Summary',
		icon: '📝',
		helper: 'Paragraphs',
		instruction: 'Respond with two concise paragraphs. Focus on key points.',
	},
	{
		id: 'table',
		label: 'Table',
		icon: '⇵',
		helper: 'Structured',
		instruction: 'Return a Markdown table. Limit to 5 rows max.',
	},
];

const PREMIUM_DOC_STYLE_GUIDE = `PREMIUM DOCUMENT BLUEPRINT:
- Open with a bold **Executive Snapshot** sentence that states the POV + big promise.
- Follow with 📊 **Signals** (metrics, momentum, or proof) using a short bullet stack.
- Drop a > **Callout** block for the sharpest insight or risk.
- Add 🛠️ **Strategic Build** as numbered steps that map to TipTap checklists or headings.
- Close with 🗣️ **Conversation Starters** or CTA checklist so editors can assign work.
- Use \`##\`/\`###\` headings, \`- [ ]\` checklists, \`>\` callouts, and Markdown tables so TipTap components (task list, callout, table) light up automatically.`;

const TIPTAP_TOOLKIT_HINT = `Tiptap tools you can control:
 Headings: \`##\`, \`###\`.
 Callouts / banners: \`> **Label:** insight\`.
 Checklists: \`- [ ] Task\`.
 Tables: standard Markdown table syntax.
 Divider: \`---\`.
 Inline highlights: **bold**, _italic_, ==highlight==.
Lean into these so designers can one-click into existing toolbar buttons.`;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const selectionToSnippet = (selection: SelectionState): string => {
	if (!selection.text) {
		return 'The user has no selection and wants net-new content at the cursor.';
	}
	return `The user highlighted the following section (${selection.wordCount} words). Rewrite or extend it:\n"""${selection.text}"""`;
};

const summarizeBusinessProfile = (profile?: BusinessProfile | null): string => {
	if (!profile) {
		return 'Business profile not configured. Assume early-stage B2B SaaS unless otherwise specified.';
	}
	const parts: string[] = [];
	parts.push(`${profile.companyName ?? 'Company'} • ${profile.industry ?? 'Industry N/A'} • ${profile.growthStage ?? 'Stage N/A'}`);
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
	return `${icon} Document: ${docTitle || 'Untitled'} (type: ${label}) in workspace ${workspaceName ?? 'Unknown'}\nTags: ${
		tags.length ? tags.join(', ') : 'None'
	}`;
};

const buildDocDataSummary = (
	docType: DocType,
	data: DashboardData,
	businessProfile?: BusinessProfile | null,
): string => {
	switch (docType) {
		case 'campaign': {
			const campaigns = data.marketing ?? [];
			return `Marketing snapshot: ${campaigns.length} active initiatives. Latest: ${campaigns[0]?.title ?? 'N/A'}.`;
		}
		case 'battlecard': {
			const competitors = businessProfile?.competitors ?? [];
			return `Known competitors: ${competitors.length ? competitors.join(', ') : 'Not captured yet.'}`;
		}
		case 'persona': {
			const personas = data.productsServices ?? [];
			return `Products/services documented: ${personas.length}. Use job-to-be-done framing.`;
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
	if (docTitle) keywords.push(docTitle);
	if (selection) keywords.push(selection.split(/\s+/).slice(0, 12).join(' '));
	keywords.push(promptValue);
	return keywords.join(' ').slice(0, 240).trim();
};

const formatHostname = (value?: string | null) => {
	if (!value) return '';
	try {
		return new URL(value).hostname.replace(/^www\./, '');
	} catch (error) {
		try {
			return new URL(`https://${value}`).hostname.replace(/^www\./, '');
		} catch (error2) {
			return value;
		}
	}
};

// formatRelativeTime is now imported from ../../lib/utils/dateUtils

const formatResearchForPrompt = (results: YouSearchResponse | null): string => {
	if (!results?.hits?.length) return '';
	const snippets = results.hits.slice(0, 5).map((hit, index) => {
		const source = hit.source ? `${hit.source} • ` : '';
		return `[${index + 1}] ${hit.title ?? hit.url}\n${source}${hit.description ?? ''}\n${hit.url}`;
	});
	return `WEB SEARCH RESULTS (cite as [n]):\n${snippets.join('\n\n')}`;
};

const formatImageReferences = (
	results: YouSearchImageResult[],
	metadata: YouSearchMetadata | null,
): string => {
	if (!results.length && !metadata) {
		return '';
	}
	if (!results.length) {
		return 'Image search enabled but no visuals returned. Recommend relevant imagery ideas.';
	}
	const lines = results.slice(0, 4).map((image, index) => {
		const source = formatHostname(image.url) || image.source || '';
		const label = image.title || `Image ${index + 1}`;
		return `[Image ${index + 1}] ${label}${source ? ` (source: ${source})` : ''}`;
	});
	const provider = metadata?.provider ? ` via ${metadata.provider}` : '';
	const timestamp = metadata?.fetchedAt ? ` · ${formatRelativeTime(metadata.fetchedAt)}` : '';
	return `IMAGE REFERENCES AVAILABLE${provider}${timestamp}:\n${lines.join('\n')}`;
};

interface ChartConfigPayload {
	title?: string;
	data?: Array<Record<string, unknown>>;
	nameKey?: string;
	dataKey?: string;
	xAxisLabel?: string;
	yAxisLabel?: string;
}

const toDisplayString = (value: unknown): string => {
	if (value === null || value === undefined) return '';
	if (typeof value === 'number' && Number.isFinite(value)) {
		return value.toLocaleString();
	}
	return String(value).trim();
};

const normalizeLabel = (value?: string, fallback: string = 'Value'): string => {
	if (value && value.trim().length) {
		return value.trim();
	}
	return fallback.charAt(0).toUpperCase() + fallback.slice(1);
};

const convertChartConfigToMarkdown = (config: ChartConfigPayload): string => {
	if (!config || typeof config !== 'object') {
		return '';
	}
	const rowsSource = Array.isArray(config.data) ? config.data : [];
	const title = config.title?.trim() || 'Chart summary';
	if (!rowsSource.length) {
		return `**${title}**\n\n_No chart data was provided._`;
	}
	const nameKey = config.nameKey && config.nameKey.trim().length ? config.nameKey : 'name';
	const valueKey = config.dataKey && config.dataKey.trim().length ? config.dataKey : 'value';
	const nameHeader = normalizeLabel(config.xAxisLabel, nameKey);
	const valueHeader = normalizeLabel(config.yAxisLabel, valueKey);
	const rows = rowsSource
		.map((item) => {
			if (!item || typeof item !== 'object') return null;
			const name = toDisplayString(item[nameKey] ?? item['name']);
			const value = toDisplayString(item[valueKey] ?? item['value']);
			if (!name && !value) return null;
			return `| ${name || 'Item'} | ${value || '—'} |`;
		})
		.filter((row): row is string => Boolean(row))
		.join('\n');
	if (!rows) {
		return `**${title}**\n\n_No readable values were returned for this visualization._`;
	}
	return `**${title}**\n\n| ${nameHeader} | ${valueHeader} |\n| --- | --- |\n${rows}`;
};

const convertChartBlocksToMarkdown = (input: string): string => {
	if (!input) return '';
	return input.replace(/```(?:json-chart|chart-config)\s*\n([\s\S]*?)```/gi, (_, jsonPayload) => {
		try {
			const parsed = JSON.parse(jsonPayload);
			const table = convertChartConfigToMarkdown(parsed);
			return table ? `\n${table}\n` : '';
		} catch (error) {
			console.warn('[AICommandPalette] failed to parse chart payload', error);
			return '';
		}
	});
};

const extractModelText = (response: GenerateContentResponse): string => {
	const candidate = response.candidates?.[0];
	if (!candidate?.content?.parts?.length) {
		return '';
	}
	const textPart = candidate.content.parts.find(
		(part) => 'text' in part && typeof part.text === 'string',
	);
	return textPart?.text?.trim() ?? '';
};

const clampToViewport = (target: Position, ref: React.RefObject<HTMLDivElement>): Position => {
	if (typeof window === 'undefined') {
		return target;
	}
	const margin = 16;
	const width = ref.current?.offsetWidth ?? 520;
	const height = ref.current?.offsetHeight ?? 520;
	return {
		top: clamp(target.top, margin, Math.max(margin, window.innerHeight - height - margin)),
		left: clamp(target.left, margin, Math.max(margin, window.innerWidth - width - margin)),
	};
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
	planType,
	workspaceRole,
	onUpgradeNeeded,
}) => {
	const paletteRef = useRef<HTMLDivElement>(null);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const dragDataRef = useRef<{ startX: number; startY: number; origin: Position } | null>(null);
	const selectionPresenceRef = useRef(false);

	const [prompt, setPrompt] = useState('');
	const [tone, setTone] = useState<ToneOption>(TONE_OPTIONS[0]);
	const [formatOption, setFormatOption] = useState<FormatOption>(FORMAT_OPTIONS[0]);
	const [selection, setSelection] = useState<SelectionState>({ text: '', range: null, wordCount: 0 });
	const [insertMode, setInsertMode] = useState<CommandInsertMode>('replace');
	const [blockInsertDirection, setBlockInsertDirection] = useState<'before' | 'after'>('after');
	const [commandQuery, setCommandQuery] = useState('');
	const [selectedCommandId, setSelectedCommandId] = useState<string | null>(null);

	const [loading, setLoading] = useState(false);
	const [statusMessage, setStatusMessage] = useState<string | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const [webResearch, setWebResearch] = useState<YouSearchResponse | null>(null);
	const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
	const [webSearchMode, setWebSearchMode] = useState<'text' | 'images'>('text');
	const [autoResearch, setAutoResearch] = useState(true);
	const [isFetchingResearch, setIsFetchingResearch] = useState(false);
	const [researchError, setResearchError] = useState<string | null>(null);

	const [imageResults, setImageResults] = useState<YouSearchImageResult[]>([]);
	const [imageSearchLoading, setImageSearchLoading] = useState(false);
	const [imageSearchError, setImageSearchError] = useState<string | null>(null);
	const [imageSearchMetadata, setImageSearchMetadata] = useState<YouSearchMetadata | null>(null);
	const [lastImageQuery, setLastImageQuery] = useState<string | null>(null);

	const [basePosition, setBasePosition] = useState<Position>(() => clampToViewport(position, paletteRef));
	const [manualPosition, setManualPosition] = useState<Position | null>(null);

	const contextBadges = useMemo(() => {
		const badges: string[] = [];
		if ((data.investors?.length || 0) > 0) badges.push('Investors');
		if ((data.customers?.length || 0) > 0) badges.push('Customers');
		if ((data.financials?.length || 0) > 0) badges.push('Revenue');
		if ((data.expenses?.length || 0) > 0) badges.push('Expenses');
		return badges;
	}, [data]);

	const commandContext = useMemo<CommandRuntimeContext>(
		() => ({
			docType,
			docTitle,
			tags,
			planType,
			workspaceRole,
			hasSelection: Boolean(selection.text?.length),
			selectionText: selection.text,
			selectionWordCount: selection.wordCount,
			workspaceName,
			dashboardData: data,
			businessProfile: workspaceContext.businessProfile ?? null,
			relatedDocs:
				workspaceContext.relatedDocs?.map((doc) => ({
					title: doc.title,
					docType: doc.docType,
					tags: doc.tags ?? [],
				})) ?? [],
		}),
		[
			data,
			docTitle,
			docType,
			planType,
			selection.text,
			selection.wordCount,
			tags,
			workspaceContext.businessProfile,
			workspaceContext.relatedDocs,
			workspaceName,
			workspaceRole,
		],
	);

	const commandMatches = useMemo<CommandMatch[]>(
		() => commandRegistry.search(commandQuery, commandContext),
		[commandContext, commandQuery],
	);

	const selectedCommandDefinition = useMemo(
		() => (selectedCommandId ? commandRegistry.get(selectedCommandId) ?? null : null),
		[selectedCommandId],
	);

	const docSummary = useMemo(
		() => buildDocDataSummary(docType, data, workspaceContext.businessProfile),
		[data, docType, workspaceContext.businessProfile],
	);
	const hasSelection = !editor.state.selection.empty;
	const promptLower = prompt.toLowerCase();
	const shouldInsert = !hasSelection || insertMode === 'append' || insertMode === 'block';
	const mode: 'insert' | 'replace' | 'improve' = shouldInsert
		? 'insert'
		: promptLower.includes('improve') || promptLower.includes('rewrite')
			? 'improve'
			: 'replace';

	const insertModeHint = useMemo(() => {
		if (insertMode === 'replace') {
			return hasSelection
				? 'Will overwrite the highlighted text.'
				: 'Select text to enable rewrite mode.';
		}
		if (insertMode === 'block') {
			return blockInsertDirection === 'before'
				? 'Inserts a new AI block above this section.'
				: 'Inserts a new AI block below this section.';
		}
		return 'Adds AI output at the current cursor.';
	}, [blockInsertDirection, hasSelection, insertMode]);

	const insertModeHintTone = useMemo(() => {
		if (insertMode === 'block') return 'text-amber-600';
		if (insertMode === 'replace' && !hasSelection) return 'text-rose-600';
		return 'text-slate-500';
	}, [hasSelection, insertMode]);

	const resolveBlockInsertionPosition = useCallback(
		(direction: 'before' | 'after'): number | null => {
			const { state } = editor;
			const { selection } = state;
			const refPos = direction === 'before' ? selection.$from : selection.$to;
			for (let depth = refPos.depth; depth > 0; depth -= 1) {
				const node = refPos.node(depth) as { type?: { isBlock?: boolean } } | null;
				if (node?.type?.isBlock) {
					try {
						return direction === 'before' ? refPos.before(depth) : refPos.after(depth);
					} catch (_error) {
						return null;
					}
				}
			}
			return direction === 'before' ? 0 : state.doc.content.size;
		},
		[editor],
	);


	const resetPosition = useCallback(() => {
		setBasePosition(clampToViewport(position, paletteRef));
		setManualPosition(null);
	}, [position]);

	useLayoutEffect(() => {
		resetPosition();
	}, [resetPosition]);

	useEffect(() => {
		const updateSelection = () => {
			const { from, to } = editor.state.selection;
			const text = editor.state.doc.textBetween(from, to, ' ');
			const trimmed = text.trim();
			const hasText = Boolean(trimmed);
			setSelection({
				text: trimmed,
				range: from === to ? null : { from, to },
				wordCount: hasText ? trimmed.split(/\s+/).length : 0,
			});
			if (!prompt && !hasText) {
				const docPrompt = DOC_TYPE_SUGGESTIONS[docType]?.[0] ?? QUICK_ACTIONS[0];
				setPrompt(docPrompt);
			}
			if (hasText && !selectionPresenceRef.current) {
				selectionPresenceRef.current = true;
				setInsertMode((prev) => (prev === 'append' ? 'replace' : prev));
			}
			if (!hasText) {
				selectionPresenceRef.current = false;
				setInsertMode((prev) => (prev === 'replace' ? 'append' : prev));
			}
		};

		updateSelection();
		editor.on('selectionUpdate', updateSelection);
		return () => {
			editor.off('selectionUpdate', updateSelection);
		};
	}, [docType, editor, prompt]);

	const fetchResearch = useCallback(
		async (mode: 'manual' | 'auto' | 'inline' = 'manual'): Promise<YouSearchResponse | null> => {
			if (!isWebSearchEnabled || webSearchMode !== 'text') {
				return null;
			}
			const basePrompt = prompt.trim();
			if (!basePrompt) {
				if (mode === 'manual') setResearchError('Enter a prompt before running research.');
				return null;
			}
			const query = buildResearchQuery(basePrompt, selection.text, docTitle, docType, workspaceName);
			try {
				setIsFetchingResearch(true);
				setResearchError(null);
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
		[docTitle, docType, isWebSearchEnabled, prompt, selection.text, webSearchMode, workspaceName],
	);

	useEffect(() => {
		if (!autoResearch || !isWebSearchEnabled || webSearchMode !== 'text') return;
		if (!prompt.trim()) return;
		const handle = setTimeout(() => {
			fetchResearch('auto').catch(() => undefined);
		}, 600);
		return () => clearTimeout(handle);
	}, [autoResearch, fetchResearch, isWebSearchEnabled, prompt, webSearchMode]);

	const fetchImageReferences = useCallback(
		async (customQuery?: string): Promise<YouSearchImageResult[]> => {
			const baseQuery = (customQuery ?? prompt)?.trim();
			const effectiveQuery = ((baseQuery && baseQuery.length ? baseQuery : selection.text) || '').trim();
			if (!effectiveQuery) {
				setImageSearchError('Enter a prompt or select text before fetching visuals.');
				return [];
			}
			try {
				setImageSearchLoading(true);
				setImageSearchError(null);
				const payload = await searchWeb(effectiveQuery, 'images', { count: 6 });
				const visuals = payload.images ?? [];
				setImageResults(visuals);
				setLastImageQuery(effectiveQuery);
				setImageSearchMetadata(payload.metadata ?? null);
				if (!visuals.length) {
					setImageSearchError('No visuals found for this query. Try a more specific description.');
				}
				return visuals;
			} catch (error) {
				console.error('[AICommandPalette] image search failed', error);
				setImageSearchError(error instanceof Error ? error.message : 'Image search failed.');
				setImageSearchMetadata(null);
				return [];
			} finally {
				setImageSearchLoading(false);
			}
		},
		[prompt, selection.text],
	);

	const insertImageResult = useCallback(
		(image: YouSearchImageResult) => {
			if (!editor || !image?.imageUrl) return;
			editor
				.chain()
				.focus()
				.setResizableImage({ src: image.imageUrl, alt: image.title || 'Research visual' })
				.run();
			setStatusMessage('Inserted reference image');
		},
		[editor],
	);

	const handleCommandSelect = useCallback(
		(match: CommandMatch) => {
			if (match.isLocked) {
				const reason = match.lockedReason ?? 'This command is locked right now.';
				setErrorMessage(reason);
				if (match.definition.minPlan && reason.toLowerCase().includes('upgrade') && onUpgradeNeeded) {
					onUpgradeNeeded();
				}
				return;
			}

			const result = match.definition.build(commandContext);
			if (result.prompt) {
				setPrompt(result.prompt);
			}
			if (result.toneId) {
				const nextTone = TONE_OPTIONS.find((option) => option.id === result.toneId);
				if (nextTone) {
					setTone(nextTone);
				}
			}
			if (result.formatId) {
				const nextFormat = FORMAT_OPTIONS.find((option) => option.id === result.formatId);
				if (nextFormat) {
					setFormatOption(nextFormat);
				}
			}
			const defaultMode: CommandInsertMode = selection.text ? 'replace' : 'append';
			setInsertMode(result.insertMode ?? defaultMode);
			setSelectedCommandId(match.definition.id);
			setCommandQuery('');
			setStatusMessage(`Command ready: ${match.definition.title}`);
			setErrorMessage(null);
			if (typeof window !== 'undefined') {
				requestAnimationFrame(() => textareaRef.current?.focus());
			} else {
				textareaRef.current?.focus();
			}
		},
		[commandContext, onUpgradeNeeded, selection.text],
	);

	const clearSelectedCommand = useCallback(() => {
		setSelectedCommandId(null);
	}, []);

	const buildSystemPrompt = useCallback(() => {
		const label = DOC_TYPE_LABELS[docType] ?? docType;
		return `You are Setique's embedded GTM copilot for workspace ${workspaceName ?? 'Unknown'}.
You specialize in ${label} documents and must produce high-signal output ready to paste into TipTap.
Tone: ${tone.label} (${tone.helper}).
Format: ${formatOption.label}${formatOption.instruction ? ` — ${formatOption.instruction}` : ''}.

AVAILABLE WORKSPACE DATA SOURCES:
You have access to the following workspace data that may be referenced in user context:
• Tasks - Categorized by module (Platform, Investors, Customers, Partners, Marketing, Financials)
• CRM Data - Investors, Customers, Partners with contacts, meetings, deal stages, and notes
• Email Integration - Connected Gmail/Outlook accounts with synced messages and threads
• Marketing Campaigns - Active campaigns with KPIs, channels, budgets, and analytics
• Financial Data - Revenue transactions, expenses, forecasts, and budget plans
• Calendar Events - Meetings, deadlines, and scheduled activities
• Documents - Team docs, briefs, battlecards, templates, and notes
• Deals/Opportunities - Pipeline stages, values, and probabilities
• Products & Services - Offerings, pricing, and bundles
• Notes - Attached to any entity above

Rules:
1. Cite live web research inline using [n] that maps to WEB SEARCH RESULTS.
2. Do not fabricate metrics or companies—only use provided workspace data.
3. When selection text is present, assume the user wants that exact section improved unless explicitly asked.
4. Prefer Markdown-friendly output. Avoid trailing spaces or double newlines.
5. When the user explicitly requests a chart, graph, or visualization, output a CHART_CONFIG block using this exact format:
   \`\`\`chart-config
   {"chartType":"bar|line|pie|area","title":"Chart Title","data":[{"name":"Label1","value":123},{"name":"Label2","value":456}],"dataKeys":["value"],"xAxisKey":"name"}
   \`\`\`
   Use real data from web research when available. Include a brief text summary after the chart.
6. For non-chart requests, use sentences, bullets, or Markdown tables—no code fences.
7. Always close with concise, actionable recommendations.
8. Mirror the PREMIUM DOCUMENT BLUEPRINT so the draft feels like an executive-ready artifact.
9. Lean into the Tiptap toolkit so your structure auto-maps to existing editor buttons.
10. Reference relevant workspace data when appropriate (e.g., mention specific investor names, deal values, campaign metrics, or recent emails if provided in context).

${PREMIUM_DOC_STYLE_GUIDE}

${TIPTAP_TOOLKIT_HINT}`;
	}, [docType, formatOption, tone, workspaceName]);

	const handleDragStart = useCallback(
		(event: React.PointerEvent) => {
			event.preventDefault();
			const origin = manualPosition ?? basePosition;
			dragDataRef.current = { startX: event.clientX, startY: event.clientY, origin };

			const handlePointerMove = (moveEvent: PointerEvent) => {
				if (!dragDataRef.current) return;
				const { startX, startY, origin: startPos } = dragDataRef.current;
				const deltaX = moveEvent.clientX - startX;
				const deltaY = moveEvent.clientY - startY;
				const next = clampToViewport(
					{
						top: startPos.top + deltaY,
						left: startPos.left + deltaX,
					},
					paletteRef,
				);
				setManualPosition(next);
			};

			const handlePointerUp = () => {
				dragDataRef.current = null;
				window.removeEventListener('pointermove', handlePointerMove);
				window.removeEventListener('pointerup', handlePointerUp);
			};

			window.addEventListener('pointermove', handlePointerMove);
			window.addEventListener('pointerup', handlePointerUp);
		},
		[basePosition, manualPosition],
	);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				event.preventDefault();
				onClose();
			}
			if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
				event.preventDefault();
				handleGenerate();
			}
		};
		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	});

	// Close on click outside using shared hook
	const clickOutsideRef = useClickOutside<HTMLDivElement>(onClose, true);

	const buildUserMessage = useCallback(async () => {
		let researchSnippet = '';
		if (isWebSearchEnabled && webSearchMode === 'text') {
			try {
				const existing = webResearch ?? (await fetchResearch('inline'));
				researchSnippet = formatResearchForPrompt(existing);
			} catch (error) {
				setErrorMessage(error instanceof Error ? error.message : 'Research failed, continuing without it.');
			}
		}

		let imageSnippet = '';
		if (isWebSearchEnabled && webSearchMode === 'images') {
			imageSnippet = formatImageReferences(imageResults, imageSearchMetadata);
			if (!imageSnippet) {
				imageSnippet = 'Image mode enabled; recommend visuals if relevant.';
			}
		}

		const contextParts = [
			`Task: ${prompt.trim()}`,
			selectionToSnippet(selection),
			buildDocMetaSnippet(docTitle, docType, tags, workspaceName),
			summarizeBusinessProfile(workspaceContext.businessProfile),
			buildRelatedDocsSnippet(workspaceContext),
			docSummary,
			researchSnippet,
			imageSnippet,
			formatOption.instruction,
			'Return Markdown-safe output and cite research inline (e.g., [1]).',
		].filter(Boolean);

		return contextParts.join('\n\n');
	}, [
		docSummary,
		docTitle,
		docType,
		fetchResearch,
		formatOption.instruction,
		imageResults,
		imageSearchMetadata,
		isWebSearchEnabled,
		prompt,
		selection,
		tags,
		webResearch,
		webSearchMode,
		workspaceContext,
		workspaceName,
	]);

	const insertResponseIntoEditor = useCallback(
		(responseText: string) => {
			// Extract and insert chart blocks as actual ChartNodes
			const chartRegex = /```(?:json-chart|chart-config)\s*\n([\s\S]*?)```/gi;
			const charts: Array<{ chartType: string; title: string; data: unknown[]; dataKeys: string[]; xAxisKey: string }> = [];
			let textWithoutCharts = responseText.replace(chartRegex, (_, jsonPayload) => {
				try {
					const parsed = JSON.parse(jsonPayload.trim());
					if (parsed && parsed.data && Array.isArray(parsed.data)) {
						charts.push({
							chartType: parsed.chartType || 'bar',
							title: parsed.title || 'Chart',
							data: parsed.data,
							dataKeys: parsed.dataKeys || ['value'],
							xAxisKey: parsed.xAxisKey || 'name',
						});
						return ''; // Remove chart JSON from text
					}
				} catch (error) {
					console.warn('[AICommandPalette] failed to parse chart config', error);
				}
				return ''; // Remove invalid chart blocks
			});

			// Insert charts first
			if (charts.length > 0) {
				editor.chain().focus();
				for (const chart of charts) {
					editor.commands.insertChart({
						chartType: chart.chartType as 'bar' | 'line' | 'pie' | 'area',
						title: chart.title,
						data: chart.data as Array<Record<string, string | number>>,
						dataKeys: chart.dataKeys,
						xAxisKey: chart.xAxisKey,
					});
				}
			}

			// Process remaining text content
			const cleanedText = textWithoutCharts.trim();
			if (cleanedText) {
				const parserMode = hasSelection
					? mode === 'improve'
						? 'improve'
						: 'rewrite'
					: 'generate';
				const html = parseAIResponse(cleanedText, parserMode).trim();
				if (!html) {
					return;
				}
				if (!isSafeContent(html)) {
					setErrorMessage('AI response was blocked because it looked unsafe.');
					return;
				}

				editor.chain().focus();
				if (insertMode === 'block') {
					const position = resolveBlockInsertionPosition(blockInsertDirection);
					if (position !== null) {
						editor.commands.insertContentAt(position, `${html}<p></p>`);
					} else {
						editor.commands.insertContent(`${html}<p></p>`);
					}
				} else if (hasSelection && (mode === 'replace' || mode === 'improve') && selection.range) {
					editor.commands.insertContentAt(selection.range, html);
				} else {
					editor.commands.insertContent(`${html}<p></p>`);
				}
			}
		},
		[
			blockInsertDirection,
			editor,
			hasSelection,
			insertMode,
			mode,
			resolveBlockInsertionPosition,
			selection.range,
			setErrorMessage,
		],
	);

	const handleGenerate = useCallback(async () => {
		const effectivePrompt = prompt.trim();
		if (!effectivePrompt) {
			setErrorMessage('Please enter a prompt.');
			return;
		}

		try {
			setLoading(true);
			setStatusMessage(null);
			setErrorMessage(null);

			const userMessage = await buildUserMessage();
			const history: Content[] = [
				{
					role: 'user',
					parts: [{ text: userMessage }],
				},
			];

			const response = await getAiResponse(history, buildSystemPrompt(), false, workspaceContext.workspaceId);
			const text = extractModelText(response);
			if (!text) {
				throw new Error('AI returned an empty response.');
			}
			insertResponseIntoEditor(text);
			setStatusMessage('✨ Inserted AI output');
		} catch (error) {
			console.error('[AICommandPalette] generation failed', error);
			if (error instanceof ModerationError) {
				setErrorMessage(formatModerationErrorMessage(error));
			} else {
				setErrorMessage(error instanceof Error ? error.message : 'Failed to generate response.');
			}
		} finally {
			setLoading(false);
		}
	}, [
		buildSystemPrompt,
		buildUserMessage,
		insertResponseIntoEditor,
		prompt,
		workspaceContext.workspaceId,
	]);

	useEffect(() => {
		textareaRef.current?.focus();
	}, []);

	const effectivePosition = manualPosition ?? basePosition;

	return (
		<div className="fixed inset-0 z-[120] pointer-events-none">
			<div
				ref={paletteRef}
				className="pointer-events-auto absolute w-[min(480px,calc(100vw-32px))] rounded-2xl border border-slate-200 bg-white shadow-2xl"
				style={{ top: effectivePosition.top, left: effectivePosition.left }}
			>
				{/* Compact Header */}
				<div
					className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 cursor-move"
					onPointerDown={handleDragStart}
				>
					<div className="flex items-center gap-2">
						<Sparkles size={16} className="text-purple-500" />
						<span className="text-sm font-semibold text-slate-700">AI Assistant</span>
						<span className="text-xs text-slate-400">• {DOC_TYPE_LABELS[docType] ?? docType}</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
						aria-label="Close"
					>
						<X size={16} />
					</button>
				</div>

				{/* Simplified Content */}
				<div className="p-4 space-y-4">
					{/* Prompt Input */}
					<div>
						<textarea
							ref={textareaRef}
							value={prompt}
							onChange={(event) => setPrompt(event.target.value)}
							className="w-full h-20 resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-800 outline-none focus:border-purple-300 focus:bg-white"
							placeholder={hasSelection ? 'How should I change this text?' : 'What do you want to create?'}
						/>
						{/* Quick suggestions */}
						<div className="mt-2 flex flex-wrap gap-1.5">
							{[...(DOC_TYPE_SUGGESTIONS[docType] ?? []), ...QUICK_ACTIONS].slice(0, 4).map((pill) => (
								<button
									key={pill}
									type="button"
									onClick={() => setPrompt(pill)}
									className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-200 transition"
								>
									{pill}
								</button>
							))}
						</div>
					</div>

					{/* Options Row */}
					<div className="flex flex-wrap items-center gap-3">
						{/* Mode */}
						<div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5">
							<button
								type="button"
								className={`px-2.5 py-1 text-xs rounded-md transition ${
									insertMode === 'replace' ? 'bg-white shadow text-slate-800' : 'text-slate-500'
								}`}
								onClick={() => setInsertMode('replace')}
							>
								Replace
							</button>
							<button
								type="button"
								className={`px-2.5 py-1 text-xs rounded-md transition ${
									insertMode === 'append' ? 'bg-white shadow text-slate-800' : 'text-slate-500'
								}`}
								onClick={() => setInsertMode('append')}
							>
								Insert
							</button>
						</div>

						{/* Tone */}
						<div className="flex items-center gap-1">
							{TONE_OPTIONS.map((option) => (
								<button
									key={option.id}
									type="button"
									className={`px-2 py-1 text-xs rounded-md transition ${
										tone.id === option.id
											? 'bg-purple-100 text-purple-700'
											: 'text-slate-500 hover:bg-slate-100'
									}`}
									onClick={() => setTone(option)}
									title={option.helper}
								>
									{option.icon}
								</button>
							))}
						</div>

						{/* Format */}
						<div className="flex items-center gap-1">
							{FORMAT_OPTIONS.map((option) => (
								<button
									key={option.id}
									type="button"
									className={`px-2 py-1 text-xs rounded-md transition ${
										formatOption.id === option.id
											? 'bg-purple-100 text-purple-700'
											: 'text-slate-500 hover:bg-slate-100'
									}`}
									onClick={() => setFormatOption(option)}
									title={option.helper}
								>
									{option.icon}
								</button>
							))}
						</div>
					</div>

					{/* Web Research Toggle */}
					<div className="flex items-center justify-between py-2 border-t border-slate-100">
						<div className="flex items-center gap-2 text-xs text-slate-500">
							<Globe size={14} />
							<span>Web research</span>
						</div>
						<button
							type="button"
							className={`px-2.5 py-1 text-[11px] rounded-full transition ${
								isWebSearchEnabled ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'
							}`}
							onClick={() => setIsWebSearchEnabled((prev) => !prev)}
						>
							{isWebSearchEnabled ? 'On' : 'Off'}
						</button>
					</div>

					{/* Generate Button */}
					<button
						type="button"
						onClick={handleGenerate}
						disabled={loading || !prompt.trim()}
						className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition ${
							loading || !prompt.trim()
								? 'bg-slate-100 text-slate-400 cursor-not-allowed'
								: 'bg-purple-600 text-white hover:bg-purple-700'
						}`}
					>
						{loading ? <span className="relative w-4 h-4"><span className="absolute inset-0 border-2 border-current animate-spin" style={{ animationDuration: '1.2s' }} /><span className="absolute inset-0.5 border border-current/40 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} /></span> : <Wand2 size={16} />}
						{loading ? 'Generating...' : 'Generate'}
					</button>

					{/* Status Messages */}
					{statusMessage && (
						<div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-2">
							<CheckCircle2 size={14} />
							{statusMessage}
						</div>
					)}
					{errorMessage && (
						<div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 rounded-lg px-3 py-2">
							<AlertTriangle size={14} />
							{errorMessage}
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="border-t border-slate-100 px-4 py-2 flex items-center justify-between text-[10px] text-slate-400">
					<span className={`px-1.5 py-0.5 rounded font-medium ${
						hasSelection ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
					}`}>
						{hasSelection ? 'EDIT' : 'CREATE'}
					</span>
					<span>⌘K to toggle • Enter to run</span>
				</div>
			</div>
		</div>
	);
};
