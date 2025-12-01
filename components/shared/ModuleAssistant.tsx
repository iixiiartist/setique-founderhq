import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { formatRelativeTime } from '../../lib/utils/dateUtils';
import { AppActions, TaskCollectionName, NoteableCollectionName, CrmCollectionName, DeletableCollectionName, TabType, GTMDocMetadata, AnyCrmItem } from '../../types';
import { getAiResponse, AILimitError } from '../../services/groqService';
import { ModerationError, formatModerationErrorMessage } from '../../lib/services/moderationService';
import { parseAIResponse, isSafeContent } from '../../utils/aiContentParser';
import { Tab } from '../../constants';
import { useConversationHistory } from '../../hooks/useConversationHistory';
import { useConfirmAction } from '../../hooks/useConfirmAction';
import { ConfirmDialog } from './ConfirmDialog';
import type { AssistantMessagePayload } from '../../hooks/useConversationHistory';
import { useFullscreenChat } from '../../hooks/useFullscreenChat';
import { getRelevantHistory, pruneFunctionResponse } from '../../utils/conversationUtils';
import { DocLibraryPicker } from '../workspace/DocLibraryPicker';
import { useAuth } from '../../contexts/AuthContext';
import { InlineFormModal } from './InlineFormModal';
import { DatabaseService } from '../../lib/services/database';
import { supabase } from '../../lib/supabase';
import { searchWeb } from '@/src/lib/services/youSearchService';
import type { YouSearchImageResult, YouSearchMetadata } from '@/src/lib/services/youSearch.types';

interface Part {
    text?: string;
    inlineData?: { mimeType: string; data: string };
    functionCall?: { id?: string; name: string; args: any };
    functionResponse?: { id?: string; name: string; response: any };
}

interface Content {
    role: 'user' | 'model' | 'tool';
    parts: Part[];
    metadata?: {
        webSearch?: YouSearchMetadata;
    };
}

interface ModuleAssistantProps {
    title: string;
    systemPrompt: string;
    actions: AppActions;
    currentTab: TabType;
    workspaceId?: string;
    onUpgradeNeeded?: () => void;
    compact?: boolean; // For floating modal mode
    onNewMessage?: (payload: AssistantMessagePayload) => void; // Callback when AI responds (for notifications)
    allowFullscreen?: boolean; // Enable fullscreen toggle (default: true)
    autoFullscreenMobile?: boolean; // Auto-open fullscreen on mobile (default: true)
    businessContext?: string; // Optional context injected on first message
    teamContext?: string; // Optional context injected on first message
    companyName?: string; // For prospect query building
    maxFileSizeMB?: number; // Max file size for AI chat (default: 5MB, lower than storage limit due to base64 overhead)
    crmItems?: AnyCrmItem[]; // For contact form in quick actions
    planType?: string; // Workspace plan for gating AI
}

const formatHostname = (value?: string | null) => {
    if (!value) return '';
    try {
        return new URL(value).hostname.replace(/^www\./, '');
    } catch {
        try {
            return new URL(`https://${value}`).hostname.replace(/^www\./, '');
        } catch {
            return value;
        }
    }
};

// formatRelativeTime is now imported from ../../lib/utils/dateUtils

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
            console.warn('[ModuleAssistant] failed to parse chart payload', error);
            return '';
        }
    });
};

const formatPlanLabel = (plan?: string) => {
    if (!plan) return 'Free';
    const normalized = plan.replace(/[_-]+/g, ' ').trim();
    if (!normalized) return 'Free';
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const stripCodeFences = (input: string): string => {
    if (!input) return '';
    return input.replace(/```[a-zA-Z0-9_-]*\n?/g, '').replace(/```/g, '');
};

const enforceHumanReadable = (input: string): string => {
    const markdownSafe = convertChartBlocksToMarkdown(input);
    return stripCodeFences(markdownSafe).trim();
};

const escapeHtml = (input: string): string =>
    input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const toSafeAssistantHtml = (content: string): string => {
    if (!content) return '';
    try {
        const rendered = parseAIResponse(content);
        if (rendered && isSafeContent(rendered)) {
            return rendered;
        }
    } catch (error) {
        console.warn('[ModuleAssistant] Failed to parse assistant content', error);
    }
    return escapeHtml(content).replace(/\n/g, '<br />');
};

const HUMAN_OUTPUT_RULES = `STRICT OUTPUT RULES:
1. Write in plain sentences, bullet lists, or Markdown tables.
2. Never return JSON, code fences, or visualization configs.
3. Describe comparisons or metrics using narrative text instead of code.`;

const STYLIZED_OUTPUT_BLUEPRINT = `STYLE GUIDE:
- Open with ⚡ **Quick Pulse:** one bold sentence that frames the overall answer.
- Follow with 📊 **Snapshot** using 2-3 tight bullets calling out metrics or context.
- Add ✅ **Strategic Moves** as a numbered list focused on recommendations.
- Close with 🧭 **Next 48 Hours** containing 1-2 actionable steps tailored to the workspace.
- Use bold labels, tasteful emoji, and short sentences so everything feels skimmable.`;

const PROSPECT_KEYWORDS = ['prospect', 'lead', 'customer', 'client', 'account', 'pipeline', 'buyer', 'target'];
const ACTION_KEYWORDS = ['suggest', 'recommend', 'find', 'list', 'identify', 'source', 'share', 'give', 'show'];

const normalizeText = (value: string) => value.toLowerCase();

const hasKeyword = (text: string, keywords: string[]) => keywords.some((keyword) => text.includes(keyword));

const detectProspectIntent = (prompt: string) => {
    const normalized = normalizeText(prompt);
    const questionCue = normalized.includes('who should we') || normalized.includes('which companies') || normalized.includes('help me find');
    return hasKeyword(normalized, PROSPECT_KEYWORDS) && (hasKeyword(normalized, ACTION_KEYWORDS) || questionCue);
};

const extractContextField = (context?: string, label?: string) => {
    if (!context || !label) return null;
    const pattern = new RegExp(`(?:-\\s*)?\\*\\*${label}:?\\*\\*\\s*([^\\n]+)`, 'i');
    const match = context.match(pattern);
    if (match && match[1]) {
        const value = match[1].replace(/\*\*/g, '').trim();
        if (!value || /not specified/i.test(value)) {
            return null;
        }
        return value;
    }
    return null;
};

const extractCompanyFromContext = (context?: string) => {
    if (!context) return null;
    const match = context.match(/\*\*Business Context:\s*([^*]+)\*\*/i);
    return match && match[1] ? match[1].trim() : null;
};

const buildProspectQuery = (prompt: string, options: { companyName?: string; businessContext?: string }) => {
    const { companyName, businessContext } = options;
    const company = companyName || extractCompanyFromContext(businessContext || undefined);
    const industry = extractContextField(businessContext, 'Industry');
    const idealCustomer = extractContextField(businessContext, 'Ideal Customer');
    const sanitizedPrompt = prompt.replace(/(can you|please|help me|could you|would you)/gi, '').trim();
    const parts = [company, 'prospective companies'];
    if (idealCustomer) parts.push(idealCustomer);
    if (industry) parts.push(industry);
    if (sanitizedPrompt) parts.push(sanitizedPrompt);
    return parts
        .filter(Boolean)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
};

const formatMetadataForClipboard = (metadata?: YouSearchMetadata | null) => {
    if (!metadata) return '';
    const chips: string[] = [];
    if (metadata.provider) {
        chips.push(metadata.provider);
    }
    if (metadata.mode) {
        chips.push(metadata.mode === 'images' ? 'Image references' : 'Web search');
    }
    if (typeof metadata.count === 'number') {
        chips.push(`${metadata.count} source${metadata.count === 1 ? '' : 's'}`);
    }
    if (metadata.durationMs) {
        chips.push(`${metadata.durationMs}ms`);
    }
    if (metadata.fetchedAt) {
        const relative = formatRelativeTime(metadata.fetchedAt);
        if (relative) {
            chips.push(`fetched ${relative}`);
        }
    }

    const summary = chips.length > 0 ? `Sources: ${chips.join(' • ')}` : '';
    const queryLine = metadata.query ? `Query: "${metadata.query}"` : '';
    return [summary, queryLine].filter(Boolean).join('\n');
};

function ModuleAssistant({ 
    title, 
    systemPrompt, 
    actions, 
    currentTab,
    workspaceId,
    onUpgradeNeeded,
    compact = false,
    onNewMessage,
    allowFullscreen = true,
    autoFullscreenMobile = true,
    businessContext,
    teamContext,
    companyName,
    maxFileSizeMB = 5, // Default 5MB for AI chat (base64 encoding adds ~33% overhead)
    crmItems = [],
    planType
}: ModuleAssistantProps) {
    const { user } = useAuth();
    const normalizedPlanType = (planType || 'free').toLowerCase();
    const assistantUnlocked = true; // All plans get AI access; limits enforced elsewhere
    const planLabel = formatPlanLabel(normalizedPlanType);
    const enforcedSystemPrompt = useMemo(() => {
        const base = (systemPrompt || '').trim();
        const additions: string[] = [];
        if (!base.includes('STRICT OUTPUT RULES')) {
            additions.push(HUMAN_OUTPUT_RULES);
        }
        if (!base.includes('STYLE GUIDE:')) {
            additions.push(STYLIZED_OUTPUT_BLUEPRINT);
        }
        return [base, ...additions].filter(Boolean).join('\n\n');
    }, [systemPrompt]);
    
    // Use conversation history hook for persistence with workspace/user scoping
    const {
        history,
        addMessage,
        updateHistory,
        clearHistory: clearPersistedHistory,
        messageCount,
        exportAsText
    } = useConversationHistory(currentTab, workspaceId, user?.id);
    
    // Fullscreen mode management
    const { isFullscreen, toggleFullscreen, exitFullscreen, isMobileDevice } = useFullscreenChat();
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isWebSearchEnabled, setIsWebSearchEnabled] = useState(false);
    const [webSearchMode, setWebSearchMode] = useState<'text' | 'images'>('text');
    const [imageResults, setImageResults] = useState<YouSearchImageResult[]>([]);
    const [imageSearchLoading, setImageSearchLoading] = useState(false);
    const [imageSearchError, setImageSearchError] = useState<string | null>(null);
    const [imageSearchMetadata, setImageSearchMetadata] = useState<YouSearchMetadata | null>(null);
    const [lastImageQuery, setLastImageQuery] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>(''); // base64 content
    const [isCopied, setIsCopied] = useState(false);
    const clearConversationConfirm = useConfirmAction<void>({
        title: 'Clear Conversation',
        message: 'Clear this conversation? This cannot be undone.',
        confirmLabel: 'Clear',
        variant: 'warning'
    });
    const [copiedMessageIndex, setCopiedMessageIndex] = useState<number | null>(null);
    const [aiLimitError, setAiLimitError] = useState<AILimitError | null>(null);
    const [rateLimitError, setRateLimitError] = useState<string | null>(null);
    const [fileSizeError, setFileSizeError] = useState<string | null>(null);
    const [requestTimestamps, setRequestTimestamps] = useState<number[]>([]);
    const [showDocPicker, setShowDocPicker] = useState(false);
    const [attachedDoc, setAttachedDoc] = useState<GTMDocMetadata | null>(null);
    const [showInlineForm, setShowInlineForm] = useState<{ type: 'task' | 'crm' | 'contact' | 'event' | 'expense' | 'document'; data?: any } | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const systemPromptRef = useRef(enforcedSystemPrompt);
    const assistantWebMetadataRef = useRef<YouSearchMetadata | null>(null);

    // Rate limit: 10 requests per minute
    const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in milliseconds
    const RATE_LIMIT_MAX_REQUESTS = 10;

    useEffect(() => {
        systemPromptRef.current = enforcedSystemPrompt;
    }, [enforcedSystemPrompt]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [history, isLoading]);

    useEffect(() => {
        if (!isWebSearchEnabled && webSearchMode !== 'text') {
            setWebSearchMode('text');
        }
        if (!isWebSearchEnabled || webSearchMode !== 'images') {
            setImageResults([]);
            setImageSearchError(null);
            setImageSearchMetadata(null);
            setImageSearchLoading(false);
            setLastImageQuery(null);
        }
    }, [isWebSearchEnabled, webSearchMode]);

    const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result?.toString().split(',')[1] || '';
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const runImageSearch = useCallback(
        async (query: string, options: { silent?: boolean } = {}): Promise<{ visuals: YouSearchImageResult[]; metadata: YouSearchMetadata | null }> => {
            const { silent = false } = options;
            const trimmed = query.trim();
            if (!trimmed) {
                if (!silent) {
                    setImageSearchError('Type a question or describe the visual you need before fetching references.');
                }
                return { visuals: [], metadata: null };
            }

            if (!silent) {
                setImageSearchLoading(true);
                setImageSearchError(null);
            }

            try {
                const payload = await searchWeb(trimmed, 'images');
                const visuals = payload.images ?? [];
                const metadata = payload.metadata ?? null;
                setImageResults(visuals);
                setImageSearchMetadata(metadata);
                setLastImageQuery(trimmed);
                if (!silent && !visuals.length) {
                    setImageSearchError('No visuals found for this query. Try a more specific description.');
                }
                return { visuals, metadata };
            } catch (err: any) {
                console.error('[ModuleAssistant] image search failed', err);
                if (!silent) {
                    setImageSearchError(err?.message ?? 'Image search failed.');
                }
                setImageResults([]);
                setImageSearchMetadata(null);
                return { visuals: [], metadata: null };
            } finally {
                if (!silent) {
                    setImageSearchLoading(false);
                }
            }
        },
        [],
    );

    const appendImageResultToPrompt = (image: YouSearchImageResult) => {
        if (!image) return;
        const host = image.source || formatHostname(image.url) || 'source';
        const snippet = `[Image Reference] ${image.title || host}: ${image.url || image.imageUrl} (${host})`;
        setUserInput((prev) => (prev ? `${prev}\n\n${snippet}` : snippet));
    };

    const checkRateLimit = (): { allowed: boolean; remainingTime?: number } => {
        const now = Date.now();
        
        // Remove timestamps older than the rate limit window
        const recentTimestamps = requestTimestamps.filter(
            timestamp => now - timestamp < RATE_LIMIT_WINDOW
        );
        
        // Update state with filtered timestamps
        setRequestTimestamps(recentTimestamps);
        
        // Check if we've hit the limit
        if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
            const oldestTimestamp = Math.min(...recentTimestamps);
            const remainingTime = Math.ceil((RATE_LIMIT_WINDOW - (now - oldestTimestamp)) / 1000);
            return { allowed: false, remainingTime };
        }
        
        return { allowed: true };
    };

    const recordRequest = () => {
        setRequestTimestamps(prev => [...prev, Date.now()]);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            // Validate file size
            const fileSizeInMB = selectedFile.size / (1024 * 1024);
            if (fileSizeInMB > maxFileSizeMB) {
                setFileSizeError(`File too large. Maximum size is ${maxFileSizeMB}MB (file is ${fileSizeInMB.toFixed(2)}MB)`);
                // Clear the file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
                return;
            }
            
            // Clear any previous errors
            setFileSizeError(null);
            
            setFile(selectedFile);
            const content = await blobToBase64(selectedFile);
            setFileContent(content);
        }
    };
    
    const clearFile = () => {
        setFile(null);
        setFileContent('');
        if(fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const clearDoc = () => {
        setAttachedDoc(null);
    };
    
    const executeAction = async (call: { name: string, args: any }) => {
        const { name, args } = call;
        try {
            switch (name) {
                case 'createTask':
                    return await actions.createTask(args.category as TaskCollectionName, args.text, args.priority, undefined, undefined, args.dueDate, args.assignedTo, args.dueTime);
                case 'updateTask':
                    return await actions.updateTask(args.taskId, args.updates);
                case 'addNote':
                    return await actions.addNote(args.collection as NoteableCollectionName, args.itemId, args.noteText);
                case 'updateNote':
                    return await actions.updateNote(args.collection as NoteableCollectionName, args.itemId, args.noteTimestamp, args.newText);
                case 'deleteNote':
                    return await actions.deleteNote(args.collection as NoteableCollectionName, args.itemId, args.noteTimestamp);
                case 'createCrmItem':
                    return await actions.createCrmItem(args.collection as CrmCollectionName, {
                        company: args.name,
                        priority: 'Medium',
                        status: args.stage || 'New',
                        ...(args.amount && (args.collection === 'investors' ? { checkSize: args.amount } : { dealValue: args.amount }))
                    });
                case 'updateCrmItem':
                    return await actions.updateCrmItem(args.collection as CrmCollectionName, args.itemId, args.updates);
                case 'createContact':
                    return await actions.createContact(args.collection as CrmCollectionName, args.crmItemId, {
                        name: args.name,
                        title: args.title || '',
                        email: args.email,
                        phone: args.phone || '',
                        linkedin: args.linkedin || ''
                    });
                case 'updateContact':
                    return await actions.updateContact(args.collection as CrmCollectionName, args.crmItemId, args.contactId, args.updates);
                case 'deleteContact':
                    return await actions.deleteContact(args.collection as CrmCollectionName, args.crmItemId, args.contactId);
                case 'searchContacts': {
                    const query = args.query.toLowerCase();
                    const targetCollection = args.collection && args.collection !== 'all' ? args.collection : null;
                    
                    const results: any[] = [];
                    crmItems.forEach(item => {
                        // Filter by collection if specified
                        if (targetCollection) {
                            const itemType = 'checkSize' in item ? 'investors' : 
                                           'dealValue' in item ? 'customers' : 'partners';
                            if (itemType !== targetCollection) return;
                        }
                        
                        // Check if company name matches
                        const companyMatches = item.company.toLowerCase().includes(query);
                        
                        // Search contacts
                        (item.contacts || []).forEach(contact => {
                            const matches = 
                                contact.name.toLowerCase().includes(query) ||
                                contact.email.toLowerCase().includes(query) ||
                                (contact.title && contact.title.toLowerCase().includes(query)) ||
                                (contact.phone && contact.phone.toLowerCase().includes(query)) ||
                                companyMatches;
                            
                            if (matches) {
                                results.push({
                                    contactId: contact.id,
                                    name: contact.name,
                                    email: contact.email,
                                    phone: contact.phone,
                                    title: contact.title,
                                    company: item.company,
                                    companyId: item.id,
                                    crmType: 'checkSize' in item ? 'investors' : 
                                             'dealValue' in item ? 'customers' : 'partners'
                                });
                            }
                        });
                    });
                    
                    return {
                        success: true,
                        message: `Found ${results.length} contact(s) matching "${args.query}"`,
                        results
                    };
                }
                case 'createMeeting':
                    return await actions.createMeeting(args.collection as CrmCollectionName, args.crmItemId, args.contactId, {
                        title: args.title,
                        timestamp: new Date(args.date).getTime(),
                        attendees: args.attendees || '',
                        summary: args.summary || ''
                    });
                case 'updateMeeting':
                    return await actions.updateMeeting(args.collection as CrmCollectionName, args.crmItemId, args.contactId, args.meetingId, args.updates);
                case 'deleteMeeting':
                    return await actions.deleteMeeting(args.collection as CrmCollectionName, args.crmItemId, args.contactId, args.meetingId);
                case 'logFinancials':
                    return await actions.logFinancials({ date: args.date, mrr: args.mrr, gmv: args.gmv, signups: args.signups });
                case 'createExpense':
                    return await actions.createExpense({
                        date: args.date,
                        category: args.category,
                        amount: args.amount,
                        description: args.description,
                        vendor: args.vendor,
                        paymentMethod: args.paymentMethod
                    });
                case 'updateExpense':
                    return await actions.updateExpense(args.expenseId, args.updates);
                case 'deleteItem':
                    return await actions.deleteItem(args.collection as DeletableCollectionName, args.itemId);
                case 'createMarketingItem':
                    return await actions.createMarketingItem({
                        title: args.title,
                        type: args.type || 'Other',
                        status: args.status || 'Planned',
                        dueDate: args.dueDate,
                        dueTime: args.dueTime
                    });
                case 'updateMarketingItem':
                    return await actions.updateMarketingItem(args.itemId, args.updates);
                case 'updateSettings':
                    return await actions.updateSettings(args.settings);
                case 'uploadDocument':
                    return await actions.uploadDocument(args.name, args.mimeType, args.content, args.module as TabType, args.companyId, args.contactId);
                case 'updateDocument':
                    return await actions.updateDocument(args.docId, {
                        name: args.name,
                        mimeType: args.mimeType,
                        content: args.content,
                    });
                case 'createEvent':
                    return await actions.createTask(
                        'productsServicesTasks',
                        `📅 ${args.title}`,
                        'High',
                        undefined,
                        undefined,
                        args.date,
                        undefined,
                        args.time
                    );
                
                // Email tools - these read from the database
                case 'listEmails': {
                    if (!workspaceId || !user?.id) {
                        return { success: false, message: 'No workspace or user context available.' };
                    }
                    try {
                        const { data: account } = await supabase
                            .from('integrated_accounts')
                            .select('id, email_address, status')
                            .eq('workspace_id', workspaceId)
                            .eq('user_id', user.id)
                            .eq('provider', 'gmail')
                            .eq('status', 'active')
                            .maybeSingle();

                        if (!account) {
                            return { success: false, message: 'No email account connected. Please link your Gmail in Settings → Integrations.' };
                        }

                        let query = supabase
                            .from('email_messages')
                            .select('id, subject, snippet, from_address, received_at, is_read, has_attachments')
                            .eq('account_id', account.id)
                            .order('received_at', { ascending: false });

                        if (args.filter === 'unread') {
                            query = query.eq('is_read', false);
                        } else if (args.filter === 'read') {
                            query = query.eq('is_read', true);
                        }

                        const limit = Math.min(args.limit || 10, 20);
                        query = query.limit(limit);

                        const { data: emails, error } = await query;
                        if (error) throw error;

                        return {
                            success: true,
                            message: `Found ${emails?.length || 0} emails.`,
                            emails: emails?.map(e => ({
                                id: e.id,
                                subject: e.subject || '(No subject)',
                                from: e.from_address?.split('<')[0]?.trim() || e.from_address || 'Unknown',
                                received: e.received_at,
                                isUnread: !e.is_read,
                                hasAttachments: e.has_attachments,
                                preview: e.snippet?.slice(0, 100) || ''
                            })) || []
                        };
                    } catch (e) {
                        const message = e instanceof Error ? e.message : 'Failed to fetch emails';
                        return { success: false, message };
                    }
                }

                case 'searchEmails': {
                    if (!workspaceId || !user?.id) {
                        return { success: false, message: 'No workspace or user context available.' };
                    }
                    try {
                        const { data: account } = await supabase
                            .from('integrated_accounts')
                            .select('id')
                            .eq('workspace_id', workspaceId)
                            .eq('user_id', user.id)
                            .eq('provider', 'gmail')
                            .eq('status', 'active')
                            .maybeSingle();

                        if (!account) {
                            return { success: false, message: 'No email account connected.' };
                        }

                        const searchQuery = args.query.toLowerCase();
                        const limit = Math.min(args.limit || 5, 10);

                        const { data: emails, error } = await supabase
                            .from('email_messages')
                            .select('id, subject, snippet, from_address, received_at, is_read')
                            .eq('account_id', account.id)
                            .or(`subject.ilike.%${searchQuery}%,snippet.ilike.%${searchQuery}%,from_address.ilike.%${searchQuery}%`)
                            .order('received_at', { ascending: false })
                            .limit(limit);

                        if (error) throw error;

                        return {
                            success: true,
                            message: `Found ${emails?.length || 0} emails matching "${args.query}".`,
                            emails: emails?.map(e => ({
                                id: e.id,
                                subject: e.subject || '(No subject)',
                                from: e.from_address?.split('<')[0]?.trim() || e.from_address || 'Unknown',
                                received: e.received_at,
                                isUnread: !e.is_read,
                                preview: e.snippet?.slice(0, 100) || ''
                            })) || []
                        };
                    } catch (e) {
                        const message = e instanceof Error ? e.message : 'Failed to search emails';
                        return { success: false, message };
                    }
                }

                case 'getEmailDetails': {
                    if (!workspaceId || !user?.id) {
                        return { success: false, message: 'No workspace or user context available.' };
                    }
                    try {
                        const { data: email, error } = await supabase
                            .from('email_messages')
                            .select('*, integrated_accounts!inner(user_id, workspace_id)')
                            .eq('id', args.emailId)
                            .eq('integrated_accounts.user_id', user.id)
                            .eq('integrated_accounts.workspace_id', workspaceId)
                            .single();

                        if (error || !email) {
                            return { success: false, message: 'Email not found or access denied.' };
                        }

                        return {
                            success: true,
                            email: {
                                id: email.id,
                                subject: email.subject || '(No subject)',
                                from: email.from_address,
                                to: email.to_addresses,
                                cc: email.cc_addresses,
                                received: email.received_at,
                                isUnread: !email.is_read,
                                hasAttachments: email.has_attachments,
                                snippet: email.snippet,
                                threadId: email.thread_id
                            }
                        };
                    } catch (e) {
                        const message = e instanceof Error ? e.message : 'Failed to get email details';
                        return { success: false, message };
                    }
                }

                case 'createTaskFromEmail': {
                    if (!workspaceId || !user?.id) {
                        return { success: false, message: 'No workspace or user context available.' };
                    }
                    try {
                        // First get the email
                        const { data: email } = await supabase
                            .from('email_messages')
                            .select('subject, from_address, snippet')
                            .eq('id', args.emailId)
                            .single();

                        const taskText = args.taskText || `Follow up: ${email?.subject || 'Email task'}`;
                        const priority = args.priority || 'Medium';
                        const category = args.category || 'productsServicesTasks';

                        const result = await actions.createTask(
                            category as TaskCollectionName,
                            `📧 ${taskText}`,
                            priority,
                            undefined,
                            undefined,
                            args.dueDate
                        );

                        return {
                            ...result,
                            message: result.success 
                                ? `Created task from email "${email?.subject || 'Unknown'}"` 
                                : result.message
                        };
                    } catch (e) {
                        const message = e instanceof Error ? e.message : 'Failed to create task from email';
                        return { success: false, message };
                    }
                }

                default:
                    return { success: false, message: `Unknown function: ${name}` };
            }
        } catch (e) {
            const message = e instanceof Error ? e.message : 'An unknown error occurred';
            return { success: false, message: `Error executing ${name}: ${message}` };
        }
    };

    const sendMessage = async (prompt: string) => {
        if ((!prompt.trim() && !file) || isLoading) return;
        assistantWebMetadataRef.current = null;

        if (!assistantUnlocked) {
            const upgradeMessage = 'AI assistant is available on paid plans. Visit Settings to upgrade your workspace.';
            setUserInput('');
            addMessage({ role: 'user', parts: [{ text: prompt }] });
            addMessage({ role: 'model', parts: [{ text: `⚠️ ${upgradeMessage}` }] });
            setAiLimitError(new AILimitError(upgradeMessage, 0, 0, normalizedPlanType));
            onUpgradeNeeded?.();
            return;
        }

        // Check rate limit before processing
        const rateLimitCheck = checkRateLimit();
        if (!rateLimitCheck.allowed) {
            const errorMessage = `Rate limit exceeded. Please wait ${rateLimitCheck.remainingTime} seconds before sending another message.`;
            setRateLimitError(errorMessage);
            
            // Add error message to history
            addMessage({ role: 'user', parts: [{ text: prompt }] });
            addMessage({ role: 'model', parts: [{ text: `⚠️ ${errorMessage}` }] });
            
            // Clear rate limit error after the remaining time
            setTimeout(() => {
                setRateLimitError(null);
            }, (rateLimitCheck.remainingTime || 0) * 1000);
            
            return;
        }

        // Record this request
        recordRequest();

        setIsLoading(true);
        setUserInput('');
        setAiLimitError(null); // Clear any previous AI limit errors
        setRateLimitError(null); // Clear any previous rate limit errors

        const buildWebSearchContext = (searchResults: any, fallbackQuery: string) => {
            if (!searchResults?.hits || searchResults.hits.length === 0) {
                return '';
            }

            const normalizedMetadata: YouSearchMetadata = {
                mode: 'search',
                query: searchResults.metadata?.query || fallbackQuery,
                fetchedAt: searchResults.metadata?.fetchedAt || new Date().toISOString(),
                provider: searchResults.metadata?.provider || 'You.com',
                count: searchResults.metadata?.count ?? searchResults.hits.length,
                durationMs: searchResults.metadata?.durationMs,
            };
            assistantWebMetadataRef.current = normalizedMetadata;

            const providerLabel = normalizedMetadata.provider ? ` via ${normalizedMetadata.provider}` : '';
            const fetchedLabel = normalizedMetadata.fetchedAt
                ? ` (fetched ${formatRelativeTime(normalizedMetadata.fetchedAt)})`
                : '';

            const listings = searchResults.hits
                .map(
                    (hit: any, index: number) =>
                        `[${index + 1}] ${hit.title || hit.url}: ${hit.description || hit.summary || ''} (${hit.url})`
                )
                .join('\n');

            const snippetLines = searchResults.hits
                .map((hit: any, index: number) =>
                    hit.snippets && hit.snippets.length
                        ? `[${index + 1}] Snippets: ${hit.snippets.join(' ')}`
                        : ''
                )
                .filter(Boolean)
                .join('\n');

            let context = `\n\nWEB SEARCH RESULTS (Query: "${normalizedMetadata.query}")${providerLabel}${fetchedLabel}:\n${listings}`;
            if (snippetLines) {
                context += `\n\nSnippets:\n${snippetLines}`;
            }

            context += `\n\nCITATION INSTRUCTIONS:\n1. Cite the numbered sources inline using [1], [2], etc.\n2. End your response with a Sources section formatted as an HTML list (<ul><li><a href="url">Title</a></li></ul>).\n3. Only cite sources that are relevant to the specific insight.`;

            return context;
        };

        const userMessageParts: any[] = [];
        let textPart = prompt; // This is what the user actually typed
        let textPartForAI = prompt; // This is what we send to AI (may include context)

        // Inject business/team context on first message only (for AI, not displayed to user)
        if (history.length === 0 && (businessContext || teamContext)) {
            const contextParts: string[] = [];
            if (businessContext) contextParts.push(businessContext);
            if (teamContext) contextParts.push(teamContext);
            // Prepend context to AI message, but keep user's displayed message clean
            textPartForAI = `${contextParts.join('\n\n')}\n\n${prompt}`;
        }

        const hasCrmRecords = Array.isArray(crmItems) && crmItems.length > 0;
        const industryFromContext = extractContextField(businessContext, 'Industry');
        const idealCustomerProfile = extractContextField(businessContext, 'Ideal Customer');
        const resolvedCompanyName = companyName || extractCompanyFromContext(businessContext);
        const shouldBootstrapProspects =
            currentTab === Tab.Accounts &&
            !hasCrmRecords &&
            !isWebSearchEnabled &&
            detectProspectIntent(prompt);

        if (shouldBootstrapProspects) {
            try {
                const prospectQuery = buildProspectQuery(prompt, {
                    companyName: resolvedCompanyName || undefined,
                    businessContext,
                }) || prompt;
                const searchResults = await searchWeb(prospectQuery, 'search');
                const webContext = buildWebSearchContext(searchResults, prospectQuery);
                if (webContext) {
                    textPartForAI += `\n\nCRM DATA GAP NOTICE:\n- There are currently zero CRM accounts on record.\n- The user explicitly asked for prospect recommendations.\n- Use the live research results below to ground your answer.`;
                    textPartForAI += webContext;
                    const focusLine = idealCustomerProfile
                        ? `Focus on the "${idealCustomerProfile}" buyer profile`
                        : industryFromContext
                        ? `Focus on high-fit companies inside the ${industryFromContext} space`
                        : 'Focus on high-fit organizations for the current ICP';
                    textPartForAI += `\n\nAUTO_PROSPECT_DIRECTIVE:\n- Provide at least 5 named organizations for ${resolvedCompanyName || 'the business'} even though the CRM is empty.\n- ${focusLine}.\n- For each company include: (a) HQ or region if available, (b) why it fits, (c) the recommended first outreach action with channel + suggested nextActionDate.\n- After the list, add a numbered plan outlining how to capture these prospects in the CRM (createAccount → link documents → create outreach task).\n- Reference the numbered sources next to each company using [n] notation and include the Sources list at the end.`;
                }
            } catch (error) {
                console.error('[ModuleAssistant] Auto prospect research failed', error);
            }
        }

        // Handle Web Search
        if (isWebSearchEnabled) {
            if (webSearchMode === 'text') {
                try {
                    const searchResults = await searchWeb(prompt, 'search');
                    const webContext = buildWebSearchContext(searchResults, prompt);
                    if (webContext) {
                        textPartForAI += webContext;
                    }
                } catch (e) {
                    console.error('Web search failed', e);
                }
            } else if (webSearchMode === 'images') {
                try {
                    let visualsForContext = imageResults;
                    let metadataForContext = imageSearchMetadata;
                    if (visualsForContext.length === 0) {
                        const { visuals, metadata } = await runImageSearch(prompt, { silent: true });
                        visualsForContext = visuals;
                        metadataForContext = metadata;
                    }

                    if (visualsForContext.length > 0) {
                        const visualContext = visualsForContext
                            .slice(0, 4)
                            .map((image, index) => {
                                const host = formatHostname(image.url) || image.source || 'source';
                                return `[Image ${index + 1}] ${image.title || host}${host ? ` (${host})` : ''}`;
                            })
                            .join('\n');

                        const providerLabel = metadataForContext?.provider ? `Provided by ${metadataForContext.provider}` : 'Image references';
                        const fetchedLabel = metadataForContext?.fetchedAt ? ` · ${formatRelativeTime(metadataForContext.fetchedAt)}` : '';
                        textPartForAI += `\n\nIMAGE REFERENCES AVAILABLE:\n${visualContext}\n${providerLabel}${fetchedLabel}\nCall out where each reference should appear and cite the source number in your response.`;
                    } else {
                        textPartForAI += '\n\nNOTE: Image mode is enabled but no visuals are available. Recommend the imagery we should source to support this request.';
                    }
                } catch (e) {
                    console.error('Image search failed', e);
                }
            }
        }

        // Inject GTM doc content if attached
        if (attachedDoc) {
            const docContext = `

--- GTM Document Reference ---
Title: ${attachedDoc.title}
Type: ${attachedDoc.docType}
Visibility: ${attachedDoc.visibility}
${attachedDoc.isTemplate ? 'Template: Yes\n' : ''}${attachedDoc.tags.length > 0 ? `Tags: ${attachedDoc.tags.join(', ')}\n` : ''}${attachedDoc.contentPreview ? `Content: ${attachedDoc.contentPreview}` : ''}
--- End Document ---
`;
            textPart = `📎 [GTM Doc: ${attachedDoc.title}]\n\n${textPart}`;
            textPartForAI = `${docContext}\n\n${textPartForAI}`;
        }

        // Handle file attachment with cost optimization
        let fileSaved = false;
        let fileName = '';
        if (file && fileContent && prompt === userInput) {
            fileName = file.name;
            
            // Calculate file size for validation (base64 is ~33% larger than original)
            const fileSizeBytes = Math.ceil((fileContent.length * 3) / 4);
            const fileSizeMB = fileSizeBytes / (1024 * 1024);
            
            // Double-check file size before sending to AI
            if (fileSizeMB > maxFileSizeMB) {
                setFileSizeError(`File too large to send to AI. Maximum size is ${maxFileSizeMB}MB (file is ${fileSizeMB.toFixed(2)}MB)`);
                setIsLoading(false);
                clearFile();
                return;
            }
            
            textPart = `[File Attached: ${fileName}]\n\n${prompt}`;
            textPartForAI = `[File Attached: ${fileName}]\n\n${textPartForAI}`;
            
            // Auto-save to file library for future reference
            // COST OPTIMIZATION: File stored once in library, AI can reference by name
            // This prevents sending large base64 in context for every future message
            try {
                await actions.uploadDocument(
                    fileName,
                    file.type,
                    fileContent,
                    currentTab,
                    undefined, // companyId
                    undefined  // contactId
                );
                fileSaved = true;
                console.log(`✅ Auto-saved to library: ${fileName} (${fileSizeMB.toFixed(2)}MB)`);
            } catch (error) {
                console.warn('⚠️ Auto-save failed:', error);
                // Continue - still send file to AI even if save fails
            }
            
            // Send file to AI as inline data (for this conversation only)
            // OPTIMIZATION: AI can now reference file by name from library in future messages
            userMessageParts.push({
                inlineData: {
                    mimeType: file.type,
                    data: fileContent
                }
            });
        }

        // Use textPartForAI for sending to AI, but textPart for display
        userMessageParts.unshift({ text: textPartForAI });

        // Add user message to history (with display text, not AI text)
        addMessage({ role: 'user', parts: [{ text: textPart }, ...userMessageParts.slice(1)] });
        
        // Send to AI with context included
        let currentHistory: Content[] = [...history, { role: 'user', parts: userMessageParts }];
        setAiLimitError(null); // Clear any previous error
        
        clearFile();
        clearDoc();

        try {
            // Send to AI with sliding window history (last 15 messages)
            // Only use tools if the user's message suggests they want to take action
            const userMessage = textPart.toLowerCase();
            const wantsAction = /\b(create|add|make|update|change|delete|remove|log|upload|set)\b/i.test(userMessage);
            
            const relevantHistory = getRelevantHistory(currentHistory);
            let modelResponse = await getAiResponse(relevantHistory, systemPromptRef.current, wantsAction, workspaceId, currentTab);

            while (modelResponse.functionCalls && modelResponse.functionCalls.length > 0) {
                const functionCalls = modelResponse.functionCalls;
                
                const modelResponseWithCall = modelResponse.candidates?.[0]?.content;
                if (!modelResponseWithCall) {
                    throw new Error("Model response with function call is missing content.");
                }

                currentHistory = [...currentHistory, modelResponseWithCall];

                const functionResponseParts = await Promise.all(
                    functionCalls.map(async (call) => {
                        if (!call.name) {
                            throw new Error('Function call missing name.');
                        }

                        const result = await executeAction({
                            name: call.name,
                            args: call.args ?? {},
                        });

                        // Prune large responses to save tokens
                        const prunedResult = pruneFunctionResponse(result, call.name);

                        return {
                            functionResponse: { 
                                id: call.id, // Preserve the tool_call_id
                                name: call.name, 
                                response: prunedResult 
                            },
                        };
                    })
                );

                currentHistory = [
                    ...currentHistory,
                    { role: 'tool', parts: functionResponseParts },
                ];
                
                // Continue with tools enabled since we're in a function-calling loop
                // Use sliding window history for function-calling loops too
                const relevantHistory = getRelevantHistory(currentHistory);
                modelResponse = await getAiResponse(relevantHistory, systemPromptRef.current, true, workspaceId, currentTab);
            }
            
            // Extract text from the response
            const finalResponseText = modelResponse.candidates?.[0]?.content?.parts?.find(p => 'text' in p)?.text ?? "I've completed the action.";
            const readableResponse = enforceHumanReadable(finalResponseText);

            // Only add message if response is not empty (avoid empty assistant messages that cause 400 errors)
            if (readableResponse && readableResponse.trim().length > 0) {
                const metadataForMessage = assistantWebMetadataRef.current
                    ? { webSearch: assistantWebMetadataRef.current }
                    : undefined;
                addMessage({ role: 'model', parts: [{ text: readableResponse }], metadata: metadataForMessage });
                assistantWebMetadataRef.current = null;
                
                // Trigger notification callback if provided
                if (onNewMessage) {
                    onNewMessage({
                        text: readableResponse,
                        metadata: metadataForMessage,
                    });
                }
            } else {
                console.warn('[ModuleAssistant] Received empty response from AI, not adding to conversation history');
            }

        } catch (error) {
            // Handle AI limit errors specifically
            if (error instanceof AILimitError) {
                setAiLimitError(error);
                const errorPlanType = (error.planType || normalizedPlanType).toLowerCase();
                const errorPlan = formatPlanLabel(errorPlanType);
                const limit = error.limit || 0;
                const usage = error.usage || 0;
                const personalizedMessage = errorPlanType === 'free'
                    ? `You've used all ${limit || 25} AI requests included with the Free plan. Credits reset at the start of each month, or you can upgrade for unlimited Copilot access.`
                    : `You've used ${usage}/${limit || '∞'} AI requests on the ${errorPlan} plan. Upgrade for unlimited Copilot access.`;
                addMessage({ 
                    role: 'model', 
                    parts: [{ text: `⚠️ ${personalizedMessage}` }] 
                });
                assistantWebMetadataRef.current = null;
                return;
            }

            if (error instanceof ModerationError) {
                addMessage({
                    role: 'model',
                    parts: [{ text: `⚠️ ${formatModerationErrorMessage(error)}` }],
                });
                assistantWebMetadataRef.current = null;
                return;
            }
            
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            addMessage({ role: 'model', parts: [{ text: `Error: ${errorMessage}` }] });
            assistantWebMetadataRef.current = null;
        } finally {
            setIsLoading(false);
        }
    }


    const handleChatSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(userInput);
    };

    const handleGenerateReport = () => {
        const getReportPrompt = (tab: TabType): string => {
            switch(tab) {
                case Tab.ProductsServices: return "Please generate a performance report for products and services management.";
                case Tab.Investors:
                case Tab.Customers:
                case Tab.Partners:
                     return "Please generate a performance report for the CRM pipeline.";
                case Tab.Marketing: return "Please generate a performance report for the marketing calendar.";
                case Tab.Financials: return "Please generate a performance report for the financial data.";
                default: return "Please provide a summary of the current module.";
            }
        };
        const prompt = getReportPrompt(currentTab);
        sendMessage(prompt);
    }

    const handleCopyConversation = () => {
        const formattedHistory = history
            .map(msg => {
                const isUserModel = msg.role === 'user';
                const isModelMessage = msg.role === 'model';
                const shouldRenderModelMessage = isModelMessage && !msg.parts.some(p => 'functionCall' in p);

                if (isUserModel) {
                    const textPart = msg.parts.find(p => 'text' in p)?.text || '';
                    const hasFile = msg.parts.some(p => 'inlineData' in p);
                    return `User: ${hasFile ? '[File Attached]\n' : ''}${textPart}`;
                }
                if (shouldRenderModelMessage) {
                    const webSearchMeta = msg.metadata?.webSearch;
                    const textPart = msg.parts.find(p => 'text' in p)?.text || '';
                    const metadataSummary = formatMetadataForClipboard(webSearchMeta);
                    return [
                        `Assistant: ${textPart}`,
                        metadataSummary
                    ].filter(Boolean).join('\n');
                }
                return null;
            })
            .filter(Boolean)
            .join('\n\n---\n\n');

        if (formattedHistory) {
            navigator.clipboard.writeText(formattedHistory).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
    };

    const handleCopyMessage = (text: string, index: number) => {
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            setCopiedMessageIndex(index);
            setTimeout(() => setCopiedMessageIndex(null), 2000);
        });
    };
    
    // Main chat content
    const isFreePlanLimit = aiLimitError
        ? ((aiLimitError.planType || normalizedPlanType).toLowerCase() === 'free')
        : false;

    const chatContent = (
        <div className={`bg-white h-full flex flex-col ${
            compact 
                ? 'p-4' 
                : isFullscreen
                    ? 'p-6 h-full'
                    : 'p-6 border border-gray-200 rounded-2xl shadow-soft-lg max-h-[85vh]'
        }`}>
            {(!compact || isFullscreen) && (
                <div className="flex justify-between items-start mb-4 shrink-0 flex-wrap gap-2 relative">
                    <div className="flex items-center gap-3 min-w-0">
                        <h2 className="text-lg font-semibold text-gray-900 truncate">{title}</h2>
                        {messageCount > 0 && (
                            <span className="badge-modern text-[10px] shrink-0" title="Message count">
                                {messageCount} messages
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            onClick={handleGenerateReport}
                            className="btn-modern-secondary text-xs py-1.5 px-3 disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                            disabled={isLoading}
                            title="Generate a summary report of this module"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path d="M12 20V10H4V20H12ZM14 20V4H22V20H14Z" /></svg>
                            <span className="hidden sm:inline">Report</span>
                        </button>
                        <button
                            onClick={() => {
                                const text = exportAsText();
                                navigator.clipboard.writeText(text).then(() => {
                                    setIsCopied(true);
                                    setTimeout(() => setIsCopied(false), 2000);
                                });
                            }}
                            className="btn-modern-secondary text-xs py-1.5 px-3 disabled:opacity-50 shrink-0"
                            disabled={history.length === 0 || isCopied}
                            title="Copy conversation to clipboard"
                        >
                            {isCopied ? '✓ Copied' : 'Copy'}
                        </button>
                        <button
                            onClick={() => {
                                clearConversationConfirm.requestConfirm(undefined, () => {
                                    clearPersistedHistory();
                                });
                            }}
                            className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl text-xs font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-all duration-200 disabled:opacity-50 shrink-0"
                            disabled={history.length === 0}
                            title="Clear conversation history"
                        >
                            Clear
                        </button>
                        {allowFullscreen && !compact && (
                            <button
                                onClick={toggleFullscreen}
                                className="btn-modern-secondary text-xs p-1.5 shrink-0"
                                title={isFullscreen ? 'Exit fullscreen (Esc)' : 'Enter fullscreen'}
                                aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                                aria-pressed={isFullscreen}
                            >
                                {isFullscreen ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 15v4.5M15 15h4.5M15 15l5.25 5.25" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            )}
            
            <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 mb-4 bg-gradient-to-b from-gray-50/80 to-white rounded-xl border border-gray-100 p-4 min-h-[200px] flex flex-col gap-3" role="log" aria-live="polite" aria-atomic="false">
                {history.length === 0 && (
                    <div className="m-auto text-center">
                        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </div>
                        <p className="text-gray-500 text-sm">Ask me anything about this module!</p>
                    </div>
                )}
                {history.map((msg, index) => {
                     const isUserModel = msg.role === 'user';
                     const isModelMessage = msg.role === 'model';
                 const webSearchMeta = !isUserModel ? msg.metadata?.webSearch : undefined;
                     
                     // We only want to render messages from the user, or final text-only responses from the model.
                     // Intermediate model responses that contain function calls should not be rendered.
                     const shouldRenderModelMessage = isModelMessage && !msg.parts.some(p => 'functionCall' in p);

                     if (isUserModel || shouldRenderModelMessage) {
                        const textPart = msg.parts.find(p => 'text' in p)?.text;
                        const hasFile = msg.parts.some(p => 'inlineData' in p);

                        // Avoid rendering empty bubbles
                        if (!textPart && !hasFile) {
                            return null;
                        }

                        return (
                            <div key={index} className={`group relative max-w-[90%] sm:max-w-[85%] whitespace-pre-wrap break-words transition-all duration-200 ${
                                isUserModel 
                                ? 'chat-bubble-user self-end' 
                                : 'chat-bubble-ai self-start'
                            }`}>
                                {isUserModel ? (
                                    <>
                                        {textPart}
                                    </>
                                ) : (
                                    <>
                                        <div
                                            className="markdown-content"
                                            dangerouslySetInnerHTML={{ __html: toSafeAssistantHtml(textPart || '') || escapeHtml(textPart || '...') }}
                                        />
                                        <button 
                                            onClick={() => handleCopyMessage(textPart || '', index)} 
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur-sm border border-gray-200 p-1.5 rounded-lg shadow-soft-sm text-xs hover:bg-gray-50 transition-all duration-200"
                                            title="Copy response"
                                            aria-label="Copy response"
                                        >
                                            {copiedMessageIndex === index ? '✓' : (
                                                 <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-gray-600">
                                                    <path d="M7 3.5A1.5 1.5 0 0 1 8.5 2h3A1.5 1.5 0 0 1 13 3.5v1A1.5 1.5 0 0 1 11.5 6h-3A1.5 1.5 0 0 1 7 4.5v-1Z" />
                                                    <path d="M5.5 4.5A2.5 2.5 0 0 1 8 2h4a2.5 2.5 0 0 1 2.5 2.5v1A2.5 2.5 0 0 1 12 7H8a2.5 2.5 0 0 1-2.5-2.5v-1Zm3-1.5a.5.5 0 0 0-.5.5v1a.5.5 0 0 0 .5.5h3a.5.5 0 0 0 .5-.5v-1a.5.5 0 0 0-.5-.5h-3Z" />
                                                    <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h10a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 15 16H5a1.5 1.5 0 0 1-1.5-1.5v-8Zm2 1a.5.5 0 0 0-.5.5v6a.5.5 0 0 0 .5.5h8a.5.5 0 0 0 .5-.5v-6a.5.5 0 0 0-.5-.5h-8Z" />
                                                </svg>
                                            )}
                                        </button>
                                        {webSearchMeta && (
                                            <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-gray-600">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 border border-gray-200">
                                                    {webSearchMeta.provider || 'You.com'}
                                                </span>
                                                {webSearchMeta.count !== undefined && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 border border-gray-200">
                                                        {webSearchMeta.count} source{webSearchMeta.count === 1 ? '' : 's'}
                                                    </span>
                                                )}
                                                {webSearchMeta.fetchedAt && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 border border-gray-200">
                                                        {formatRelativeTime(webSearchMeta.fetchedAt)}
                                                    </span>
                                                )}
                                                {webSearchMeta.query && (
                                                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2 py-0.5 border border-gray-200 max-w-[200px] truncate">
                                                        “{webSearchMeta.query}”
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )
                     }
                     return null; // Don't render tool call/response messages or intermediate model turns
                })}
                {isLoading && (
                    <div className="chat-bubble-ai self-start">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* AI Limit Warning */}
            {/* Rate Limit Warning */}
            {rateLimitError && (
                <div className="alert-modern alert-modern-warning shrink-0 mb-3">
                    <span className="text-xl">⏱️</span>
                    <div className="flex-1">
                        <h3 className="font-semibold text-amber-800 text-sm mb-0.5">Rate Limit Exceeded</h3>
                        <p className="text-xs text-amber-700">
                            {rateLimitError}
                        </p>
                    </div>
                </div>
            )}

            {/* AI Limit Warning */}
            {aiLimitError && (
                <div className="alert-modern alert-modern-warning shrink-0 mb-3">
                    <span className="text-xl">✨</span>
                    <div className="flex-1">
                        <h3 className="font-semibold text-amber-800 text-sm mb-1">
                            {isFreePlanLimit ? 'Free Plan AI Quota Reached' : 'AI Usage Limit Reached'}
                        </h3>
                        <p className="text-xs text-amber-700 mb-2">
                            {isFreePlanLimit ? (
                                <>
                                    You've used all <strong>25 monthly AI requests</strong> included in the Free plan. Credits reset at the start of each month. 
                                    Upgrade to Power ($49/mo) or Team Pro ($99/mo) for unlimited Copilot access.
                                </>
                            ) : (
                                <>
                                    You've used <strong>{aiLimitError.usage}/{aiLimitError.limit}</strong> AI requests on the <strong>{aiLimitError.planType}</strong> plan. 
                                    Upgrade for unlimited AI access.
                                </>
                            )}
                        </p>
                        {onUpgradeNeeded && (
                            <button
                                onClick={onUpgradeNeeded}
                                className="btn-modern text-xs py-1.5 px-3"
                            >
                                View Pricing & Upgrade →
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* File Size Error */}
            {fileSizeError && (
                <div className="alert-modern alert-modern-error shrink-0 mb-3">
                    <span className="text-xl">📁</span>
                    <div className="flex-1">
                        <h3 className="font-semibold text-red-800 text-sm mb-0.5">File Too Large</h3>
                        <p className="text-xs text-red-700">
                            {fileSizeError}
                        </p>
                        <button
                            onClick={() => setFileSizeError(null)}
                            className="mt-1.5 text-xs text-red-600 hover:text-red-800 font-medium"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            <div className="px-1 mb-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => setIsWebSearchEnabled(!isWebSearchEnabled)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all duration-200 ${
                            isWebSearchEnabled 
                            ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-soft-xs' 
                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                        <span>🌐</span> Web Search {isWebSearchEnabled ? 'ON' : 'OFF'}
                    </button>
                    {isWebSearchEnabled && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                            {[
                                { id: 'text', label: 'Text answers' },
                                { id: 'images', label: 'Image references' }
                            ].map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setWebSearchMode(option.id as 'text' | 'images')}
                                    className={`px-2.5 py-1 rounded-full border text-[11px] font-medium transition-all duration-200 ${
                                        webSearchMode === option.id 
                                        ? 'border-purple-300 text-purple-700 bg-purple-50' 
                                        : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                    }`}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                {isWebSearchEnabled && webSearchMode === 'images' && (
                    <div className="rounded-xl border border-dashed border-gray-300 bg-white/80 p-3 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => runImageSearch(userInput || lastImageQuery || '')}
                                disabled={imageSearchLoading}
                                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                                    imageSearchLoading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-slate-900 text-white'
                                }`}
                            >
                                {imageSearchLoading ? 'Fetching…' : 'Fetch visuals'}
                            </button>
                            {lastImageQuery && (
                                <span className="text-[11px] text-gray-500">Last search: “{lastImageQuery}”</span>
                            )}
                        </div>
                        {imageSearchError && <p className="text-xs text-red-600">{imageSearchError}</p>}
                        {imageSearchMetadata && (
                            <div className="flex flex-wrap gap-2 text-[10px] text-gray-600">
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                                    {imageSearchMetadata.provider || 'You.com'}
                                </span>
                                {imageSearchMetadata.fetchedAt && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                                        {formatRelativeTime(imageSearchMetadata.fetchedAt)}
                                    </span>
                                )}
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5">
                                    {(imageSearchMetadata.count ?? imageResults.length) || 0} results
                                </span>
                            </div>
                        )}
                        <div className="max-h-48 overflow-y-auto">
                            {imageResults.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-500">
                                    Describe the type of visual you need in the prompt box, then tap “Fetch visuals” to preview research-ready images.
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-2">
                                    {imageResults.slice(0, 6).map((image) => {
                                        const host = formatHostname(image.url) || image.source || 'source';
                                        return (
                                            <div key={`${image.imageUrl}-${image.url}`} className="rounded-xl border border-gray-200 bg-gray-50 p-2 space-y-2">
                                                <div className="aspect-video overflow-hidden rounded-lg bg-gray-200">
                                                    <img src={image.thumbnail || image.imageUrl} alt={image.title || 'Research visual'} className="h-full w-full object-cover" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-800 leading-snug max-h-10 overflow-hidden">{image.title || host}</p>
                                                    <div className="mt-1 flex items-center justify-between text-[10px] text-gray-500">
                                                        <span>{host}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => appendImageResultToPrompt(image)}
                                                            className="text-blue-600 font-semibold hover:text-blue-800"
                                                        >
                                                            Add to prompt
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleChatSubmit} className="flex flex-col gap-2 shrink-0">
                {file && (
                    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div className="truncate">
                                <div className="font-medium text-gray-900 truncate">{file.name}</div>
                                <div className="text-xs text-gray-500">
                                    {(file.size / (1024 * 1024)).toFixed(2)}MB
                                </div>
                            </div>
                        </div>
                        <button type="button" onClick={clearFile} className="p-1 hover:bg-gray-200 rounded-lg transition-colors" aria-label="Remove attached file">
                            <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}
                {attachedDoc && (
                    <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-xl text-sm">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-base">📄</span>
                            </div>
                            <div className="truncate">
                                <div className="font-medium text-gray-900 truncate">{attachedDoc.title}</div>
                                <div className="text-xs text-purple-600">
                                    {attachedDoc.docType} • {attachedDoc.visibility}
                                </div>
                            </div>
                        </div>
                        <button type="button" onClick={clearDoc} className="p-1 hover:bg-purple-100 rounded-lg transition-colors" aria-label="Remove attached document">
                            <svg className="w-4 h-4 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                )}
                <div className="flex gap-2 items-end">
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" id={`file-upload-${title.replace(/\s+/g, '-')}`} />
                    <label 
                        htmlFor={`file-upload-${title.replace(/\s+/g, '-')}`} 
                        className="p-2.5 border border-gray-200 rounded-xl cursor-pointer flex items-center justify-center hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-soft-xs" 
                        aria-label={`Attach a file (max ${maxFileSizeMB}MB)`}
                        title={`Attach a file (max ${maxFileSizeMB}MB)`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 text-gray-500">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.122 2.122l7.81-7.81" />
                        </svg>
                    </label>
                    {workspaceId && user && (
                        <button
                            type="button"
                            onClick={() => setShowDocPicker(true)}
                            className="p-2.5 border border-purple-200 bg-purple-50 rounded-xl cursor-pointer flex items-center justify-center hover:bg-purple-100 hover:border-purple-300 transition-all duration-200 shadow-soft-xs"
                            aria-label="Attach GTM document"
                            title="Attach GTM document"
                        >
                        <span className="text-lg">📄</span>
                        </button>
                    )}
                    <input
                        type="text"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        className="flex-1 input-modern py-2.5"
                        placeholder="Ask a question..."
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="btn-modern px-4 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                        disabled={isLoading || (!userInput && !file && !attachedDoc)}
                    >
                        Send
                    </button>
                </div>
            </form>
        </div>
    );

    const lockedContent = (
        <div className={`h-full w-full flex flex-col items-center justify-center text-center bg-gradient-to-b from-gray-50/50 to-white ${compact ? 'p-4' : 'p-8'}`}>
            <div className={`card-modern space-y-5 ${compact ? 'p-5 w-full' : 'p-8 max-w-lg'}`}>
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <span className="text-3xl">🔒</span>
                </div>
                <h2 className="text-xl font-semibold text-gray-900">AI assistant is a premium feature</h2>
                <p className="text-gray-600 text-sm">
                    You're currently on the <strong>{planLabel}</strong> plan. Upgrade to unlock research-grade answers, CRM automations, and document-aware coaching from the Setique AI assistant.
                </p>
                <ul className="text-left text-sm text-gray-700 space-y-2">
                    <li className="flex items-center gap-2"><span className="text-green-500">✓</span> Unlimited AI questions & follow-ups</li>
                    <li className="flex items-center gap-2"><span className="text-green-500">✓</span> CRM + task automations and quick actions</li>
                    <li className="flex items-center gap-2"><span className="text-green-500">✓</span> GTM doc grounding and visual research</li>
                </ul>
                {onUpgradeNeeded && (
                    <button
                        onClick={onUpgradeNeeded}
                        className="w-full btn-modern py-3"
                    >
                        View plans & upgrade →
                    </button>
                )}
            </div>
        </div>
    );
    
    // Auto-enter fullscreen on mobile if enabled
    useEffect(() => {
        if (!assistantUnlocked) return;
        if (autoFullscreenMobile && isMobileDevice() && allowFullscreen && !isFullscreen) {
            // Small delay to ensure component is mounted
            const timer = setTimeout(() => {
                toggleFullscreen();
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [assistantUnlocked, autoFullscreenMobile, allowFullscreen, isFullscreen, isMobileDevice, toggleFullscreen]);
    
    if (!assistantUnlocked) {
        return lockedContent;
    }

    // Render fullscreen via portal
    if (isFullscreen && allowFullscreen) {
        return ReactDOM.createPortal(
            <>
                <div 
                    className="fixed inset-0 z-[1000] bg-white overflow-hidden"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`${title} - Fullscreen mode`}
                >
                    {chatContent}
                </div>
                {showDocPicker && workspaceId && user && (
                    <DocLibraryPicker
                        isOpen={showDocPicker}
                        workspaceId={workspaceId}
                        userId={user.id}
                        onSelect={async (doc) => {
                            // Load full doc content for AI context
                            const { data: fullDoc } = await DatabaseService.loadGTMDocById(doc.id, workspaceId);
                            if (fullDoc) {
                                // Add contentPreview from contentPlain for AI
                                const docWithContent = {
                                    ...doc,
                                    contentPreview: fullDoc.contentPlain || 'No content available'
                                };
                                setAttachedDoc(docWithContent);
                            } else {
                                setAttachedDoc(doc);
                            }
                            setShowDocPicker(false);
                        }}
                        onClose={() => setShowDocPicker(false)}
                        title="Attach GTM Document to Chat"
                   
                    />
                )}
            </>,
            document.body
        );
    }
    
    // Normal embedded view
    return (
        <>
            {chatContent}
            {showDocPicker && workspaceId && user && (
                <DocLibraryPicker
                    isOpen={showDocPicker}
                    workspaceId={workspaceId}
                    userId={user.id}
                    onSelect={async (doc) => {
                        // Load full doc content for AI context
                        const { data: fullDoc } = await DatabaseService.loadGTMDocById(doc.id, workspaceId);
                        if (fullDoc) {
                            // Add contentPreview from contentPlain for AI
                            const docWithContent = {
                                ...doc,
                                contentPreview: fullDoc.contentPlain || 'No content available'
                            };
                            setAttachedDoc(docWithContent);
                        } else {
                            setAttachedDoc(doc);
                        }
                        setShowDocPicker(false);
                    }}
                    onClose={() => setShowDocPicker(false)}
                    title="Attach GTM Document to Chat"
                />
            )}
            {showInlineForm && (
                <InlineFormModal
                    formType={showInlineForm.type}
                    formData={showInlineForm.data}
                    actions={actions}
                    onClose={() => setShowInlineForm(null)}
                    onSuccess={(message) => {
                        addMessage({
                            role: 'model',
                            parts: [{ text: message }]
                        });
                        setShowInlineForm(null);
                    }}
                    crmItems={crmItems}
                    currentTab={currentTab}
                    workspaceId={workspaceId}
                />
            )}

            {/* Clear Conversation Confirmation Dialog */}
            <ConfirmDialog
                isOpen={clearConversationConfirm.isOpen}
                onClose={clearConversationConfirm.cancel}
                onConfirm={clearConversationConfirm.confirm}
                title={clearConversationConfirm.title}
                message={clearConversationConfirm.message}
                confirmLabel={clearConversationConfirm.confirmLabel}
                cancelLabel={clearConversationConfirm.cancelLabel}
                variant={clearConversationConfirm.variant}
                isLoading={clearConversationConfirm.isProcessing}
            />
        </>
    );
};

export default ModuleAssistant;

