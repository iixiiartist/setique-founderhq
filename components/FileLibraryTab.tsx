import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Document, AppActions, TabType, AnyCrmItem, Contact, DocumentActivity } from '../types';
import { NAV_ITEMS } from '../constants';
import DocumentUploadModal from './shared/DocumentUploadModal';
import Modal from './shared/Modal';
import NotesManager from './shared/NotesManager';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { DatabaseService } from '../lib/services/database';
import { Button } from './ui/Button';
import { EmailComposer, EmailAttachment } from './email/EmailComposer';
import { supabase } from '../lib/supabase';
import mammoth from 'mammoth';

// Dynamic PDF.js import to avoid worker issues at module load time
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
let pdfWorkerInitialized = false;

async function initPdfJs() {
    if (pdfWorkerInitialized) return pdfjsLib;
    
    pdfjsLib = await import('pdfjs-dist');
    // Use unpkg CDN which mirrors npm packages directly
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    pdfWorkerInitialized = true;
    console.log('[FileLibraryTab] PDF.js initialized, version:', pdfjsLib.version);
    console.log('[FileLibraryTab] Worker URL:', pdfjsLib.GlobalWorkerOptions.workerSrc);
    return pdfjsLib;
}

import {
    Grid,
    List,
    Search,
    Folder,
    FileText,
    Image as ImageIcon,
    Download,
    Trash2,
    Upload,
    Clock,
    HardDrive,
    File,
    LayoutGrid,
    ChevronRight,
    Info,
    Send,
    Star,
    StarOff,
    Tag,
    Filter,
    Link2,
    User,
    Activity as ActivityIcon,
    CheckSquare,
    Square,
    RefreshCw,
    Edit2,
    Loader2
} from 'lucide-react';

type ViewMode = 'grid' | 'list';
type QuickFilter = 'all' | 'starred' | 'recent' | 'mine' | 'linked';
type SortOption = 'newest' | 'name' | 'size' | 'views';

interface FileLibraryTabProps {
    documents: Document[];
    actions: AppActions;
    companies: AnyCrmItem[];
    contacts: (Contact & { companyName: string })[];
    onOpenInEditor?: (docId: string) => void; // Callback to open doc in GTM editor
}

const QUICK_FILTERS: { id: QuickFilter; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All files', icon: <LayoutGrid size={16} /> },
    { id: 'starred', label: 'Starred', icon: <Star size={16} /> },
    { id: 'recent', label: 'Recent', icon: <Clock size={16} /> },
    { id: 'mine', label: 'My uploads', icon: <User size={16} /> },
    { id: 'linked', label: 'Linked', icon: <Link2 size={16} /> }
];

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
    { id: 'newest', label: 'Newest first' },
    { id: 'name', label: 'Name (A-Z)' },
    { id: 'size', label: 'File size' },
    { id: 'views', label: 'Most viewed' }
];

const PANEL_CLASS = 'bg-white border border-gray-200 rounded-lg shadow-sm';
const MAX_ACTIVITY_ITEMS = 80;

// Helper to check if a document can be edited in the GTM editor
function isEditableDocument(mimeType: string | undefined, fileName?: string): boolean {
    if (!mimeType) return false;
    // Text-based formats
    if (mimeType.includes('text') || 
        mimeType.includes('markdown') || 
        mimeType.includes('html') ||
        mimeType.includes('json') ||
        mimeType.includes('xml') ||
        mimeType === 'application/json' ||
        mimeType === 'text/plain' ||
        mimeType === 'text/markdown' ||
        mimeType === 'text/html') {
        return true;
    }
    // PDF support
    if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
        return true;
    }
    // DOCX support
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType.includes('wordprocessingml') ||
        fileName?.endsWith('.docx')) {
        return true;
    }
    // DOC (older Word format) - limited support
    if (mimeType === 'application/msword' || fileName?.endsWith('.doc')) {
        return true;
    }
    return false;
}

// Extract text from PDF using pdfjs-dist
async function extractTextFromPDF(base64Content: string): Promise<string> {
    try {
        // Initialize PDF.js on demand
        const pdfjs = await initPdfJs();
        if (!pdfjs) throw new Error('Failed to load PDF.js library');
        
        // Convert base64 to Uint8Array
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        console.log('[FileLibraryTab] Loading PDF, size:', bytes.length, 'bytes');
        
        // Load PDF document with explicit options
        const loadingTask = pdfjs.getDocument({
            data: bytes,
            useSystemFonts: true,
        });
        
        const pdf = await loadingTask.promise;
        console.log('[FileLibraryTab] PDF loaded, pages:', pdf.numPages);
        
        const textParts: string[] = [];
        
        // Extract text from each page
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str || '')
                .join(' ');
            textParts.push(pageText);
        }
        
        const result = textParts.join('\n\n');
        console.log('[FileLibraryTab] PDF text extracted, length:', result.length);
        return result;
    } catch (error) {
        console.error('[FileLibraryTab] PDF extraction error:', error);
        throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Extract text from DOCX using mammoth
async function extractTextFromDOCX(base64Content: string): Promise<{ text: string; html: string }> {
    try {
        // Convert base64 to ArrayBuffer
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;
        
        // Extract both HTML and plain text
        const [htmlResult, textResult] = await Promise.all([
            mammoth.convertToHtml({ arrayBuffer }),
            mammoth.extractRawText({ arrayBuffer })
        ]);
        
        return {
            text: textResult.value,
            html: htmlResult.value
        };
    } catch (error) {
        console.error('[FileLibraryTab] DOCX extraction error:', error);
        throw new Error('Failed to extract text from DOCX');
    }
}

// Use Groq AI to intelligently structure and format extracted document content
async function formatDocumentWithAI(rawText: string, fileName: string): Promise<{
    contentJson: any;
    contentPlain: string;
}> {
    try {
        console.log('[FileLibraryTab] Formatting document with AI, text length:', rawText.length);
        
        const systemPrompt = `You are a document structure analyzer. Convert raw text into a Tiptap JSON document.

OUTPUT FORMAT - Return ONLY this JSON structure, no other text:
{"type":"doc","content":[...nodes...]}

NODE TYPES you can use:
1. Heading: {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Title"}]}
   - level 1 for main title/name
   - level 2 for major sections  
   - level 3 for subsections
2. Paragraph: {"type":"paragraph","content":[{"type":"text","text":"Text here"}]}
3. Bullet List: {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Item"}]}]}]}

RULES:
- Return ONLY valid JSON, nothing else
- Keep ALL original text content
- Identify document structure (headings, sections, lists)
- For resumes: name=h1, sections like Experience/Education=h2, job titles=h3
- Use bullet lists for items with • or - or numbered items
- Separate logical sections with appropriate headings`;

        const userPrompt = `Convert this extracted document text to Tiptap JSON:

${rawText.slice(0, 12000)}`;

        console.log('[FileLibraryTab] Calling Groq API...');
        const response = await supabase.functions.invoke('groq-chat', {
            body: {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.2,
                max_tokens: 8000,
                model: 'llama-3.3-70b-versatile'
            }
        });

        console.log('[FileLibraryTab] Groq response received:', {
            hasError: !!response.error,
            hasData: !!response.data,
            dataKeys: response.data ? Object.keys(response.data) : []
        });

        if (response.error) {
            console.error('[FileLibraryTab] Groq API error:', response.error);
            throw new Error('AI formatting failed: ' + response.error.message);
        }

        const data = response.data;
        // The groq-chat edge function returns { response: string, ... }
        let aiContent = data?.response || '';
        
        console.log('[FileLibraryTab] AI response length:', aiContent.length);
        console.log('[FileLibraryTab] AI response first 300 chars:', aiContent.slice(0, 300));

        if (!aiContent) {
            console.error('[FileLibraryTab] Empty AI response, data:', JSON.stringify(data).slice(0, 500));
            throw new Error('Empty AI response');
        }

        // Extract JSON from response - try multiple patterns
        let jsonString = aiContent.trim();
        
        // Remove markdown code blocks if present
        const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            jsonString = codeBlockMatch[1].trim();
            console.log('[FileLibraryTab] Extracted from code block');
        }
        
        // Find the JSON object if there's extra text
        if (!jsonString.startsWith('{')) {
            const jsonStart = jsonString.indexOf('{"type":"doc"');
            if (jsonStart !== -1) {
                jsonString = jsonString.slice(jsonStart);
                console.log('[FileLibraryTab] Found JSON start at position', jsonStart);
            }
        }
        
        // Find the end of the JSON object
        if (jsonString.startsWith('{')) {
            let depth = 0;
            let endIndex = 0;
            for (let i = 0; i < jsonString.length; i++) {
                if (jsonString[i] === '{') depth++;
                else if (jsonString[i] === '}') {
                    depth--;
                    if (depth === 0) {
                        endIndex = i + 1;
                        break;
                    }
                }
            }
            if (endIndex > 0) {
                jsonString = jsonString.slice(0, endIndex);
            }
        }
        
        console.log('[FileLibraryTab] Attempting to parse JSON, length:', jsonString.length);
        
        const parsedContent = JSON.parse(jsonString);
        
        // Validate structure
        if (parsedContent.type === 'doc' && Array.isArray(parsedContent.content)) {
            console.log('[FileLibraryTab] ✓ Successfully parsed AI content with', parsedContent.content.length, 'blocks');
            return {
                contentJson: parsedContent,
                contentPlain: rawText
            };
        }
        
        console.error('[FileLibraryTab] Invalid structure:', { type: parsedContent.type, hasContent: !!parsedContent.content });
        throw new Error('Invalid document structure from AI');
        
    } catch (error) {
        console.error('[FileLibraryTab] AI formatting error:', error);
        throw error;
    }
}

export default function FileLibraryTab({ documents, actions, companies, contacts, onOpenInEditor }: FileLibraryTabProps) {
    const { user } = useAuth();
    const { workspace } = useWorkspace();

    const [libraryDocs, setLibraryDocs] = useState<Document[]>(documents);
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
    const [selectedModule, setSelectedModule] = useState<TabType | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('newest');
    const [tagFilters, setTagFilters] = useState<string[]>([]);
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [notesModalDoc, setNotesModalDoc] = useState<Document | null>(null);
    const [showEmailComposer, setShowEmailComposer] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [activity, setActivity] = useState<DocumentActivity[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [tagDraft, setTagDraft] = useState('');
    const [descriptionDraft, setDescriptionDraft] = useState('');
    const [linkDrafts, setLinkDrafts] = useState({ task: '', deal: '', event: '' });
    const [bulkBusy, setBulkBusy] = useState(false);
    const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const notesModalTriggerRef = useRef<HTMLButtonElement | null>(null);

    useEffect(() => setLibraryDocs(documents), [documents]);

    useEffect(() => {
        setSelectedIds(prev => {
            const next = new Set<string>();
            libraryDocs.forEach(doc => {
                if (prev.has(doc.id)) next.add(doc.id);
            });
            return next;
        });
    }, [libraryDocs]);

    useEffect(() => {
        if (selectedDocId && !libraryDocs.some(doc => doc.id === selectedDocId)) {
            setSelectedDocId(null);
        }
    }, [libraryDocs, selectedDocId]);

    useEffect(() => {
        const doc = libraryDocs.find(d => d.id === selectedDocId);
        setDescriptionDraft(doc?.description || '');
        setTagDraft('');
        setLinkDrafts({
            task: doc?.linkTaskId || '',
            deal: doc?.linkDealId || '',
            event: doc?.linkEventId || ''
        });
    }, [libraryDocs, selectedDocId]);

    const fetchActivity = useCallback(async () => {
        if (!workspace?.id) return;
        setActivityLoading(true);
        const { data } = await DatabaseService.getDocumentActivity(workspace.id, { limit: MAX_ACTIVITY_ITEMS });
        setActivity(data || []);
        setActivityLoading(false);
    }, [workspace?.id]);

    useEffect(() => {
        fetchActivity();
    }, [fetchActivity]);

    const patchDocument = useCallback((docId: string, updates: Partial<Document>) => {
        setLibraryDocs(prev => prev.map(doc => (doc.id === docId ? { ...doc, ...updates } : doc)));
    }, []);

    const recordActivity = useCallback(async (docId: string, action: DocumentActivity['action'], details?: Record<string, unknown>) => {
        if (!workspace?.id || !user?.id) return;
        const entry: DocumentActivity = {
            id: createActivityId(),
            documentId: docId,
            workspaceId: workspace.id,
            userId: user.id,
            userName: user.user_metadata?.full_name || user.email || 'You',
            action,
            details,
            createdAt: Date.now()
        };

        setActivity(prev => [entry, ...prev].slice(0, MAX_ACTIVITY_ITEMS));
        await DatabaseService.logDocumentActivity({
            documentId: docId,
            workspaceId: workspace.id,
            userId: user.id,
            userName: entry.userName,
            action,
            details
        });
    }, [workspace?.id, user]);

    const handleFileSelect = (selectedFile: File | null) => {
        if (selectedFile) setFileToUpload(selectedFile);
    };

    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.files && event.dataTransfer.files[0]) {
            handleFileSelect(event.dataTransfer.files[0]);
        }
    }, []);

    const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    }, []);

    const handleDownload = (doc: Document) => {
        const mimeType = doc.mimeType || 'application/octet-stream';
        const dataUrl = `data:${mimeType};base64,${doc.content}`;

        if (mimeType.includes('pdf') || mimeType.includes('image')) {
            const win = window.open();
            if (win) {
                win.document.write(`<iframe src="${dataUrl}" frameborder="0" style="border:0; top:0; left:0; width:100%; height:100%;" allowfullscreen></iframe>`);
                return;
            }
        }

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = doc.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleOpenDocument = async (doc: Document) => {
        handleDownload(doc);
        const nextViews = (doc.viewCount || 0) + 1;
        const timestamp = Date.now();
        patchDocument(doc.id, { viewCount: nextViews, lastAccessedAt: timestamp });
        await actions.updateDocument(doc.id, { viewCount: nextViews, lastAccessedAt: timestamp }, { reload: false, silent: true });
        recordActivity(doc.id, 'viewed');
    };

    const handleDelete = async (doc: Document, silent?: boolean) => {
        const confirmed = silent || window.confirm(`Delete "${doc.name}"?`);
        if (!confirmed) return;
        await actions.deleteDocument(doc.id);
        setLibraryDocs(prev => prev.filter(item => item.id !== doc.id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(doc.id);
            return next;
        });
        if (selectedDocId === doc.id) setSelectedDocId(null);
    };

    const handleShare = (doc: Document) => {
        setEmailSubject(`Document: ${doc.name}`);
        setEmailBody(`Hi,\n\nI wanted to share "${doc.name}" with you.\n\nBest,`);
        
        // Convert text/HTML content to base64 for email attachment
        let attachmentData: string | undefined;
        if (doc.content) {
            try {
                // Convert string content to base64
                attachmentData = btoa(unescape(encodeURIComponent(doc.content)));
            } catch (e) {
                console.error('[FileLibraryTab] Failed to encode content:', e);
                attachmentData = btoa(doc.content);
            }
        }
        
        setEmailAttachments(
            attachmentData
                ? [{ name: doc.name, type: doc.mimeType || 'text/html', data: attachmentData }]
                : []
        );
        setShowEmailComposer(true);
        recordActivity(doc.id, 'shared');
    };

    const handleCloseComposer = () => {
        setShowEmailComposer(false);
        setEmailAttachments([]);
    };

    // Open document in GTM editor (converts file to GTM doc if needed)
    const [isConverting, setIsConverting] = useState(false);
    
    const handleEditInEditor = async (doc: Document) => {
        if (!workspace?.id || !user?.id || !onOpenInEditor) return;
        
        setIsConverting(true);
        try {
            let textContent = '';
            let htmlContent = '';
            const mimeType = doc.mimeType || '';
            const fileName = doc.name || '';
            
            // Handle PDF files
            if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
                textContent = await extractTextFromPDF(doc.content);
                htmlContent = textContent
                    .split('\n\n')
                    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
                    .join('');
            }
            // Handle DOCX files
            else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                     mimeType.includes('wordprocessingml') ||
                     fileName.endsWith('.docx')) {
                const result = await extractTextFromDOCX(doc.content);
                textContent = result.text;
                htmlContent = result.html; // Mammoth provides good HTML output
            }
            // Handle older DOC files (limited - treat as binary text extraction attempt)
            else if (mimeType === 'application/msword' || fileName.endsWith('.doc')) {
                // Try to extract what text we can from older .doc format
                try {
                    const result = await extractTextFromDOCX(doc.content);
                    textContent = result.text;
                    htmlContent = result.html;
                } catch {
                    // Fallback: try basic text extraction
                    textContent = atob(doc.content).replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
                    htmlContent = `<p>${textContent.replace(/\n/g, '</p><p>')}</p>`;
                }
            }
            // Handle text-based formats
            else {
                // Decode base64 content to text
                try {
                    textContent = atob(doc.content);
                } catch (e) {
                    // If base64 decode fails, try using content directly
                    textContent = doc.content || '';
                }
                
                // Convert to HTML for Tiptap editor
                if (mimeType.includes('markdown') || fileName.endsWith('.md')) {
                    // Simple markdown to HTML conversion (basic)
                    htmlContent = textContent
                        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
                        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
                        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
                        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.+?)\*/g, '<em>$1</em>')
                        .replace(/\n/g, '<br/>');
                } else if (mimeType.includes('text/plain')) {
                    // Wrap plain text in paragraphs
                    htmlContent = textContent
                        .split('\n\n')
                        .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
                        .join('');
                } else if (mimeType.includes('html')) {
                    // HTML - use as-is
                    htmlContent = textContent;
                } else {
                    // Default: treat as plain text
                    htmlContent = textContent
                        .split('\n\n')
                        .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
                        .join('');
                }
            }
            
            // Create a new GTM doc from the file content
            const { data: newDoc, error } = await DatabaseService.createGTMDoc({
                workspaceId: workspace.id,
                userId: user.id,
                title: doc.name.replace(/\.[^/.]+$/, ''), // Remove extension from name
                docType: 'brief',
                contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
                contentPlain: textContent,
                visibility: 'team',
                tags: doc.tags || [],
            });
            
            if (error || !newDoc) {
                console.error('[FileLibraryTab] Failed to create GTM doc:', error);
                alert('Failed to open document in editor');
                return;
            }
            
            // Try AI formatting for PDF and DOCX files (which need structure restoration)
            const needsAiFormatting = mimeType === 'application/pdf' || 
                                       mimeType.includes('pdf') ||
                                       mimeType.includes('wordprocessingml') ||
                                       fileName.endsWith('.docx') ||
                                       fileName.endsWith('.doc');
            
            let finalContentJson: any;
            
            if (needsAiFormatting && textContent.length > 50) {
                try {
                    console.log('[FileLibraryTab] Attempting AI formatting for:', fileName);
                    const aiFormatted = await formatDocumentWithAI(textContent, fileName);
                    finalContentJson = aiFormatted.contentJson;
                    console.log('[FileLibraryTab] AI formatting successful');
                } catch (aiError) {
                    console.warn('[FileLibraryTab] AI formatting failed, using basic formatting:', aiError);
                    // Fallback to basic formatting
                    finalContentJson = { 
                        type: 'doc', 
                        content: [
                            { 
                                type: 'heading', 
                                attrs: { level: 1 }, 
                                content: [{ type: 'text', text: doc.name.replace(/\.[^/.]+$/, '') }] 
                            },
                            ...textContent.split('\n').filter(Boolean).map(line => ({
                                type: 'paragraph',
                                content: line.trim() ? [{ type: 'text', text: line }] : []
                            }))
                        ]
                    };
                }
            } else {
                // Basic formatting for text files
                finalContentJson = { 
                    type: 'doc', 
                    content: [
                        { 
                            type: 'heading', 
                            attrs: { level: 1 }, 
                            content: [{ type: 'text', text: doc.name.replace(/\.[^/.]+$/, '') }] 
                        },
                        ...textContent.split('\n').filter(Boolean).map(line => ({
                            type: 'paragraph',
                            content: line.trim() ? [{ type: 'text', text: line }] : []
                        }))
                    ]
                };
            }
            
            // Update the doc with structured content for Tiptap
            await DatabaseService.updateGTMDoc(newDoc.id, workspace.id, {
                contentJson: finalContentJson,
                contentPlain: textContent,
            });
            
            // Navigate to the editor with the new doc
            onOpenInEditor(newDoc.id);
            recordActivity(doc.id, 'viewed', { editedInGtmEditor: true });
        } catch (err) {
            console.error('[FileLibraryTab] Error opening in editor:', err);
            alert('Failed to open document in editor. The file format may not be supported.');
        } finally {
            setIsConverting(false);
        }
    };

    const handleToggleStar = async (doc: Document, isStarred: boolean) => {
        patchDocument(doc.id, { isStarred });
        await actions.updateDocument(doc.id, { isStarred }, { reload: false, silent: true });
        recordActivity(doc.id, 'starred', { value: isStarred });
    };

    const handleAddTag = async (doc: Document, tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed) return;
        const existing = doc.tags || [];
        if (existing.includes(trimmed)) {
            setTagDraft('');
            return;
        }
        const nextTags = [...existing, trimmed];
        patchDocument(doc.id, { tags: nextTags });
        setTagDraft('');
        await actions.updateDocument(doc.id, { tags: nextTags }, { reload: false, silent: true });
        recordActivity(doc.id, 'tagged', { tag: trimmed });
    };

    const handleRemoveTag = async (doc: Document, tag: string) => {
        const nextTags = (doc.tags || []).filter(t => t !== tag);
        patchDocument(doc.id, { tags: nextTags });
        await actions.updateDocument(doc.id, { tags: nextTags }, { reload: false, silent: true });
    };

    const handleModuleChange = async (doc: Document, module: TabType) => {
        patchDocument(doc.id, { module });
        await actions.updateDocument(doc.id, { module }, { reload: false, silent: true });
        recordActivity(doc.id, 'linked', { module });
    };

    const handleCompanyChange = async (doc: Document, companyId: string | undefined) => {
        const updates: Partial<Document> = { companyId: companyId || undefined };
        if (!companyId) {
            updates.contactId = undefined;
        } else if (doc.contactId) {
            const contactMatchesCompany = contacts.find(c => c.id === doc.contactId && c.crmItemId === companyId);
            if (!contactMatchesCompany) {
                updates.contactId = undefined;
            }
        }
        patchDocument(doc.id, updates);
        await actions.updateDocument(doc.id, updates, { reload: false, silent: true });
    };

    const handleContactChange = async (doc: Document, contactId: string | undefined) => {
        patchDocument(doc.id, { contactId: contactId || undefined });
        await actions.updateDocument(doc.id, { contactId: contactId || undefined }, { reload: false, silent: true });
    };

    const handleDescriptionSave = async (doc: Document, description: string) => {
        patchDocument(doc.id, { description });
        await actions.updateDocument(doc.id, { description }, { reload: false, silent: true });
    };

    const handleAdvancedLinkSave = async (doc: Document, field: 'task' | 'deal' | 'event', value: string) => {
        const updates: Partial<Document> = {
            linkTaskId: field === 'task' ? value || undefined : doc.linkTaskId,
            linkDealId: field === 'deal' ? value || undefined : doc.linkDealId,
            linkEventId: field === 'event' ? value || undefined : doc.linkEventId
        };
        patchDocument(doc.id, updates);
        await actions.updateDocument(doc.id, updates, { reload: false, silent: true });
        recordActivity(doc.id, 'linked', { field, value });
    };

    const toggleSelection = (docId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(docId)) {
                next.delete(docId);
            } else {
                next.add(docId);
            }
            return next;
        });
    };

    const toggleSelectAllVisible = (docs: Document[]) => {
        if (!docs.length) return;
        setSelectedIds(prev => {
            const allSelected = docs.every(doc => prev.has(doc.id));
            if (allSelected) return new Set();
            return new Set(docs.map(doc => doc.id));
        });
    };

    const handleBulkStar = async (value: boolean) => {
        if (!selectedIds.size) return;
        setBulkBusy(true);
        const ids = Array.from(selectedIds);
        setLibraryDocs(prev => prev.map(doc => ids.includes(doc.id) ? { ...doc, isStarred: value } : doc));
        await Promise.all(ids.map(id => actions.updateDocument(id, { isStarred: value }, { reload: false, silent: true })));
        ids.forEach(id => recordActivity(id, 'starred', { value }));
        setSelectedIds(new Set());
        setBulkBusy(false);
    };

    const handleBulkDelete = async () => {
        if (!selectedIds.size) return;
        const confirmed = window.confirm(`Delete ${selectedIds.size} selected file(s)?`);
        if (!confirmed) return;
        setBulkBusy(true);
        const ids = Array.from(selectedIds);
        for (const id of ids) {
            const doc = libraryDocs.find(d => d.id === id);
            if (doc) await handleDelete(doc, true);
        }
        setSelectedIds(new Set());
        setBulkBusy(false);
    };

    const handleBulkTag = async (tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed || !selectedIds.size) return;
        setBulkBusy(true);
        const ids = Array.from(selectedIds);
        const updates: Promise<any>[] = [];
        ids.forEach(id => {
            const doc = libraryDocs.find(d => d.id === id);
            if (!doc) return;
            const existing = doc.tags || [];
            if (existing.includes(trimmed)) return;
            const nextTags = [...existing, trimmed];
            patchDocument(id, { tags: nextTags });
            updates.push(actions.updateDocument(id, { tags: nextTags }, { reload: false, silent: true }));
            recordActivity(id, 'tagged', { tag: trimmed });
        });
        await Promise.all(updates);
        setSelectedIds(new Set());
        setBulkBusy(false);
    };

    const availableTags = useMemo(() => {
        const set = new Set<string>();
        libraryDocs.forEach(doc => (doc.tags || []).forEach(tag => set.add(tag)));
        return Array.from(set).sort();
    }, [libraryDocs]);

    const moduleCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        libraryDocs.forEach(doc => {
            counts[doc.module] = (counts[doc.module] || 0) + 1;
        });
        return counts;
    }, [libraryDocs]);

    const filteredDocs = useMemo(() => {
        let docs = [...libraryDocs];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            docs = docs.filter(doc => {
                const target = [doc.name, doc.uploadedByName, doc.description || '', ...(doc.tags || [])]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase();
                return target.includes(q);
            });
        }

        if (selectedModule) {
            docs = docs.filter(doc => doc.module === selectedModule);
        }

        if (tagFilters.length) {
            docs = docs.filter(doc => tagFilters.every(tag => (doc.tags || []).includes(tag)));
        }

        if (quickFilter === 'starred') {
            docs = docs.filter(doc => doc.isStarred);
        } else if (quickFilter === 'recent') {
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            docs = docs.filter(doc => doc.uploadedAt >= sevenDaysAgo);
        } else if (quickFilter === 'mine' && user) {
            docs = docs.filter(doc => doc.uploadedBy === user.id);
        } else if (quickFilter === 'linked') {
            docs = docs.filter(doc => doc.companyId || doc.contactId || doc.linkTaskId || doc.linkDealId || doc.linkEventId);
        }

        docs.sort((a, b) => {
            switch (sortOption) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'size':
                    return (b.fileSize || calculateDocSize(b)) - (a.fileSize || calculateDocSize(a));
                case 'views':
                    return (b.viewCount || 0) - (a.viewCount || 0);
                default:
                    return b.uploadedAt - a.uploadedAt;
            }
        });

        return docs;
    }, [libraryDocs, searchQuery, selectedModule, tagFilters, quickFilter, sortOption, user]);

    const selectedDoc = useMemo(() => libraryDocs.find(doc => doc.id === selectedDocId) || null, [libraryDocs, selectedDocId]);

    const totalSize = useMemo(() => libraryDocs.reduce((sum, doc) => sum + (doc.fileSize || calculateDocSize(doc)), 0), [libraryDocs]);
    const recentCount = useMemo(() => libraryDocs.filter(doc => doc.uploadedAt >= Date.now() - 7 * 24 * 60 * 60 * 1000).length, [libraryDocs]);
    const starredCount = useMemo(() => libraryDocs.filter(doc => doc.isStarred).length, [libraryDocs]);
    const linkedCount = useMemo(
        () => libraryDocs.filter(doc => doc.companyId || doc.contactId || doc.linkTaskId || doc.linkDealId || doc.linkEventId).length,
        [libraryDocs]
    );

    const selectedDocActivity = useMemo(() => (selectedDocId ? activity.filter(item => item.documentId === selectedDocId) : []), [activity, selectedDocId]);
    const recentActivity = useMemo(() => activity.slice(0, 6), [activity]);

    const filteredContacts = useMemo(() => {
        if (!selectedDoc?.companyId) return contacts;
        return contacts.filter(contact => contact.crmItemId === selectedDoc.companyId);
    }, [contacts, selectedDoc?.companyId]);

    return (
        <div className="flex h-full bg-[#FDF9F2] text-black font-mono overflow-hidden border-t border-gray-200" onDrop={handleDrop} onDragOver={handleDragOver}>
            <DocumentUploadModal
                isOpen={!!fileToUpload}
                onClose={() => setFileToUpload(null)}
                file={fileToUpload}
                actions={actions}
                companies={companies}
                contacts={contacts}
                initialModule={selectedModule || undefined}
            />

            <Modal
                isOpen={!!notesModalDoc}
                onClose={() => setNotesModalDoc(null)}
                title={`Notes for ${notesModalDoc?.name || ''}`}
                triggerRef={notesModalTriggerRef}
            >
                {notesModalDoc && (
                    <NotesManager
                        notes={notesModalDoc.notes}
                        itemId={notesModalDoc.id}
                        collection="documents"
                        addNoteAction={actions.addNote}
                        updateNoteAction={actions.updateNote}
                        deleteNoteAction={actions.deleteNote}
                    />
                )}
            </Modal>

            <aside className="w-80 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-yellow-300 border border-gray-300 rounded-lg flex items-center justify-center">
                            <HardDrive className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-xs tracking-[0.3em] font-black">Workspace</p>
                            <h2 className="text-2xl font-black leading-none">File Library</h2>
                        </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3">
                        <StatCard label="Files" value={libraryDocs.length} helper={`${recentCount} added this week`} />
                        <StatCard label="Storage" value={formatSize(totalSize)} helper="Base64 storage" />
                        <StatCard label="Starred" value={starredCount} helper="Pinned favourites" />
                        <StatCard label="Linked" value={linkedCount} helper="Connected records" />
                    </div>
                    <div className="mt-5 flex gap-3">
                        <Button fullWidth className="justify-center gap-2" onClick={() => fileInputRef.current?.click()}>
                            <Upload size={16} /> Upload
                        </Button>
                        <Button fullWidth variant="secondary" className="justify-center gap-2" onClick={() => setSelectedModule(null)}>
                            <RefreshCw size={16} /> Reset
                        </Button>
                        <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFileSelect(e.target.files?.[0] || null)} />
                    </div>
                </div>

                <div className="flex-1 overflow-auto px-5 py-4 space-y-6 bg-[#FEFBF3]">
                    <div>
                        <p className="text-xs font-black tracking-[0.3em] mb-3">Quick filters</p>
                        <div className="space-y-2">
                            {QUICK_FILTERS.map(filter => (
                                <QuickFilterButton
                                    key={filter.id}
                                    icon={filter.icon}
                                    label={filter.label}
                                    active={quickFilter === filter.id}
                                    onClick={() => setQuickFilter(filter.id)}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-xs font-black tracking-[0.3em] mb-3">Modules</p>
                        <div className="space-y-2">
                            {NAV_ITEMS.filter(item => item.id !== 'dashboard' && item.id !== 'settings').map(item => (
                                <button
                                    key={item.id}
                                    className={`w-full flex items-center justify-between px-3 py-2 border text-sm font-semibold rounded ${selectedModule === item.id ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}
                                    onClick={() => setSelectedModule(prev => (prev === item.id ? null : (item.id as TabType)))}
                                >
                                    <span className="flex items-center gap-2"><Folder size={16} /> {item.label}</span>
                                    <span className="text-xs font-black">{moduleCounts[item.id] || 0}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {availableTags.length > 0 && (
                        <div>
                            <p className="text-xs font-black tracking-[0.3em] mb-3">Tag filters</p>
                            <div className="flex flex-wrap gap-2">
                                {availableTags.map(tag => (
                                    <TagToggle
                                        key={tag}
                                        label={tag}
                                        active={tagFilters.includes(tag)}
                                        onToggle={() =>
                                            setTagFilters(prev => (prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]))
                                        }
                                    />
                                ))}
                                {tagFilters.length > 0 && (
                                    <button className="text-xs uppercase" onClick={() => setTagFilters([])}>
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div>
                        <p className="text-xs font-black tracking-[0.3em] mb-3">Team activity</p>
                        <ActivityList items={recentActivity} isLoading={activityLoading} compact />
                    </div>
                </div>
            </aside>

            <section className="flex-1 flex flex-col min-w-0">
                <header className="h-20 bg-white border-b border-gray-200 flex items-center gap-6 px-8">
                    <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-tight">
                        <span className="cursor-pointer" onClick={() => { setSelectedModule(null); setQuickFilter('all'); }}>Drive</span>
                        {selectedModule && (
                            <>
                                <ChevronRight size={16} />
                                <span>{NAV_ITEMS.find(item => item.id === selectedModule)?.label}</span>
                            </>
                        )}
                    </div>
                    <div className="flex-1 relative max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
                        <input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search name, tags, owner..."
                            className="w-full pl-11 pr-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-black text-sm"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Filter size={16} />
                            <select
                                value={sortOption}
                                onChange={e => setSortOption(e.target.value as SortOption)}
                                className="bg-white border px-2 py-1 text-sm rounded"
                            >
                                {SORT_OPTIONS.map(option => (
                                    <option key={option.id} value={option.id}>{option.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex border rounded overflow-hidden">
                            <button
                                className={`px-3 py-2 border-r ${viewMode === 'list' ? 'bg-black text-white' : 'bg-white'}`}
                                onClick={() => setViewMode('list')}
                            >
                                <List size={16} />
                            </button>
                            <button
                                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-black text-white' : 'bg-white'}`}
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid size={16} />
                            </button>
                        </div>
                    </div>
                </header>

                {selectedIds.size > 0 && (
                    <div className="flex items-center justify-between bg-black text-white px-6 py-3 text-sm uppercase tracking-tight">
                        <span>{selectedIds.size} selected</span>
                        <div className="flex items-center gap-2">
                            <button className="px-3 py-1 bg-white text-black rounded" disabled={bulkBusy} onClick={() => handleBulkStar(true)}>
                                <Star size={14} /> Star
                            </button>
                            <button className="px-3 py-1 bg-white text-black rounded" disabled={bulkBusy} onClick={() => handleBulkStar(false)}>
                                <StarOff size={14} /> Unstar
                            </button>
                            <button className="px-3 py-1 bg-white text-black rounded" disabled={bulkBusy} onClick={() => handleBulkTag('Shared')}>
                                <Tag size={14} /> Add tag
                            </button>
                            <button className="px-3 py-1 bg-red-500 text-white rounded" disabled={bulkBusy} onClick={handleBulkDelete}>
                                <Trash2 size={14} /> Delete
                            </button>
                        </div>
                    </div>
                )}

                <main className="flex-1 overflow-auto p-8" onClick={() => setSelectedDocId(null)}>
                    {filteredDocs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center gap-3 text-center" onClick={e => e.stopPropagation()}>
                            <div className="w-40 h-40 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-white">
                                <Upload className="w-12 h-12" />
                            </div>
                            <p className="text-xl font-black">Drop files here</p>
                            <p className="text-sm text-gray-600">Or use the upload button to get started</p>
                        </div>
                    ) : viewMode === 'grid' ? (
                        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" onClick={e => e.stopPropagation()}>
                            {filteredDocs.map(doc => {
                                const isSelected = selectedIds.has(doc.id);
                                return (
                                    <div key={doc.id} className={`${PANEL_CLASS} p-4 flex flex-col gap-3 hover:-translate-y-1 transition`}>
                                        <div className="flex items-center justify-between text-xs uppercase tracking-tight">
                                            <button onClick={() => toggleSelection(doc.id)} className="flex items-center gap-1">
                                                {isSelected ? <CheckSquare size={16} /> : <Square size={16} />} Select
                                            </button>
                                            <button onClick={() => handleToggleStar(doc, !doc.isStarred)}>
                                                {doc.isStarred ? <Star size={16} className="text-yellow-500" /> : <StarOff size={16} />}
                                            </button>
                                        </div>
                                        <div className="h-32 flex items-center justify-center border rounded bg-white" onClick={() => setSelectedDocId(doc.id)}>
                                            {getFileIcon(doc.mimeType)}
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-black truncate" title={doc.name}>{doc.name}</p>
                                            <p className="text-xs text-gray-600">{formatRelativeTime(doc.uploadedAt)}</p>
                                            <div className="flex flex-wrap gap-1 text-[10px] uppercase tracking-tight">
                                                <span className="px-2 py-0.5 border rounded">{NAV_ITEMS.find(item => item.id === doc.module)?.label || 'General'}</span>
                                                {doc.tags?.slice(0, 2).map(tag => (
                                                    <span key={tag} className="px-2 py-0.5 border rounded bg-gray-50">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-gray-500">
                                            <span>{doc.uploadedByName || 'Unknown'}</span>
                                            <span>{formatSize(doc.fileSize || calculateDocSize(doc))}</span>
                                        </div>
                                        <div className="flex items-center justify-between border-t pt-3 text-sm">
                                            <button className="flex items-center gap-1" onClick={() => handleOpenDocument(doc)}>
                                                <Download size={14} /> Open
                                            </button>
                                            <div className="flex items-center gap-2">
                                                {isEditableDocument(doc.mimeType, doc.name) && onOpenInEditor && (
                                                    <button 
                                                        onClick={() => handleEditInEditor(doc)} 
                                                        title="Edit in GTM Editor" 
                                                        className="text-purple-600 hover:text-purple-800 disabled:opacity-50"
                                                        disabled={isConverting}
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                )}
                                                <button onClick={() => handleShare(doc)}><Send size={14} /></button>
                                                <button onClick={() => setNotesModalDoc(doc)} ref={notesModalTriggerRef}><FileText size={14} /></button>
                                                <button onClick={() => handleDelete(doc)}><Trash2 size={14} /></button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className={`${PANEL_CLASS} overflow-hidden`} onClick={e => e.stopPropagation()}>
                            <table className="w-full text-sm">
                                <thead className="bg-black text-white uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3">
                                            <button className="flex items-center gap-2" onClick={() => toggleSelectAllVisible(filteredDocs)}>
                                                {selectedIds.size && filteredDocs.every(doc => selectedIds.has(doc.id)) ? <CheckSquare size={14} /> : <Square size={14} />}
                                                Name
                                            </button>
                                        </th>
                                        <th className="px-4 py-3">Owner</th>
                                        <th className="px-4 py-3">Tags</th>
                                        <th className="px-4 py-3">Views</th>
                                        <th className="px-4 py-3">Size</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDocs.map(doc => (
                                        <tr key={doc.id} className={`border-t text-sm ${selectedDocId === doc.id ? 'bg-yellow-50' : ''}`} onClick={() => setSelectedDocId(doc.id)}>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center gap-3">
                                                    <button onClick={e => { e.stopPropagation(); toggleSelection(doc.id); }}>
                                                        {selectedIds.has(doc.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                                    </button>
                                                    <div className="w-10 h-10 border rounded flex items-center justify-center bg-white">{getFileIcon(doc.mimeType)}</div>
                                                    <div>
                                                        <p className="font-semibold truncate w-56" title={doc.name}>{doc.name}</p>
                                                        <p className="text-xs text-gray-500">{formatRelativeTime(doc.uploadedAt)}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2 text-xs uppercase">{doc.uploadedByName || 'Unknown'}</td>
                                            <td className="px-4 py-2">
                                                <TagList tags={doc.tags || []} limit={3} />
                                            </td>
                                            <td className="px-4 py-2 text-center text-xs">{doc.viewCount || 0}</td>
                                            <td className="px-4 py-2 text-xs">{formatSize(doc.fileSize || calculateDocSize(doc))}</td>
                                            <td className="px-4 py-2">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isEditableDocument(doc.mimeType, doc.name) && onOpenInEditor && (
                                                        <button 
                                                            onClick={e => { e.stopPropagation(); handleEditInEditor(doc); }} 
                                                            title="Edit in GTM Editor" 
                                                            className="text-purple-600 hover:text-purple-800 disabled:opacity-50"
                                                            disabled={isConverting}
                                                        >
                                                            <Edit2 size={14} />
                                                        </button>
                                                    )}
                                                    <button onClick={e => { e.stopPropagation(); handleOpenDocument(doc); }}><Download size={14} /></button>
                                                    <button onClick={e => { e.stopPropagation(); handleShare(doc); }}><Send size={14} /></button>
                                                    <button onClick={e => { e.stopPropagation(); handleToggleStar(doc, !doc.isStarred); }}>
                                                        {doc.isStarred ? <Star size={14} className="text-yellow-500" /> : <StarOff size={14} />}
                                                    </button>
                                                    <button onClick={e => { e.stopPropagation(); handleDelete(doc); }}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </main>
            </section>

            {selectedDoc && (
                <aside className="w-[380px] bg-white border-l border-gray-200 flex flex-col">
                    <div className="p-5 border-b flex items-center justify-between">
                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Details</p>
                            <h3 className="text-lg font-black break-words">{selectedDoc.name}</h3>
                        </div>
                        <button onClick={() => setSelectedDocId(null)} className="w-8 h-8 border rounded">×</button>
                    </div>

                    <div className="p-5 space-y-5 overflow-auto">
                        <div className="flex items-center justify-between">
                            <div className="w-16 h-16 border rounded flex items-center justify-center bg-white">
                                {getFileIcon(selectedDoc.mimeType)}
                            </div>
                            <div className="text-xs text-right">
                                <p>{formatSize(selectedDoc.fileSize || calculateDocSize(selectedDoc))}</p>
                                <p>{selectedDoc.mimeType || 'unknown'}</p>
                            </div>
                            <button onClick={() => handleToggleStar(selectedDoc, !selectedDoc.isStarred)}>
                                {selectedDoc.isStarred ? <Star size={18} className="text-yellow-500" /> : <StarOff size={18} />}
                            </button>
                        </div>

                        <div className="space-y-3">
                            <MetadataRow label="Owner" value={selectedDoc.uploadedByName || 'Unknown'} />
                            <MetadataRow label="Uploaded" value={new Date(selectedDoc.uploadedAt).toLocaleString()} />
                            <MetadataRow label="Last opened" value={selectedDoc.lastAccessedAt ? formatRelativeTime(selectedDoc.lastAccessedAt) : 'Never'} />
                            <MetadataRow label="Views" value={`${selectedDoc.viewCount || 0}`} />
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.3em]">Description</p>
                            <textarea
                                value={descriptionDraft}
                                onChange={e => setDescriptionDraft(e.target.value)}
                                onBlur={() => handleDescriptionSave(selectedDoc, descriptionDraft)}
                                placeholder="Explain why this file matters..."
                                className="w-full border rounded px-3 py-2 text-sm focus:outline-none"
                            />
                        </div>

                        <div className="space-y-2">
                            <p className="text-xs uppercase tracking-[0.3em]">Tags</p>
                            <div className="flex flex-wrap gap-2">
                                {(selectedDoc.tags || []).map(tag => (
                                    <span key={tag} className="px-2 py-1 border rounded text-xs flex items-center gap-1">
                                        {tag}
                                        <button onClick={() => handleRemoveTag(selectedDoc, tag)}>×</button>
                                    </span>
                                ))}
                                <form
                                    onSubmit={e => {
                                        e.preventDefault();
                                        handleAddTag(selectedDoc, tagDraft);
                                    }}
                                    className="flex items-center"
                                >
                                    <input
                                        value={tagDraft}
                                        onChange={e => setTagDraft(e.target.value)}
                                        placeholder="Add tag"
                                        className="w-24 border px-2 py-1 text-xs"
                                    />
                                </form>
                            </div>
                        </div>

                        <div className="space-y-3">
                            <p className="text-xs uppercase tracking-[0.3em]">Linked Records</p>
                            <label className="text-[11px] uppercase tracking-tight">Module</label>
                            <select
                                value={selectedDoc.module}
                                onChange={e => handleModuleChange(selectedDoc, e.target.value as TabType)}
                                className="w-full border rounded px-2 py-1 text-sm"
                            >
                                {NAV_ITEMS.filter(item => item.id !== 'dashboard' && item.id !== 'settings').map(item => (
                                    <option key={item.id} value={item.id}>{item.label}</option>
                                ))}
                            </select>
                            <label className="text-[11px] uppercase tracking-tight">Company</label>
                            <select
                                value={selectedDoc.companyId || ''}
                                onChange={e => handleCompanyChange(selectedDoc, e.target.value || undefined)}
                                className="w-full border rounded px-2 py-1 text-sm"
                            >
                                <option value="">No company</option>
                                {companies.map(company => (
                                    <option key={company.id} value={company.id}>{company.company}</option>
                                ))}
                            </select>
                            <label className="text-[11px] uppercase tracking-tight">Contact</label>
                            <select
                                value={selectedDoc.contactId || ''}
                                disabled={!selectedDoc.companyId}
                                onChange={e => handleContactChange(selectedDoc, e.target.value || undefined)}
                                className="w-full border rounded px-2 py-1 text-sm"
                            >
                                <option value="">No contact</option>
                                {filteredContacts.map(contact => (
                                    <option key={contact.id} value={contact.id}>{contact.name}</option>
                                ))}
                            </select>
          
                            <div className="space-y-2">
                                <label className="text-[11px] uppercase tracking-tight">Task link</label>
                                <input
                                    value={linkDrafts.task}
                                    onChange={e => setLinkDrafts(prev => ({ ...prev, task: e.target.value }))}
                                    onBlur={() => handleAdvancedLinkSave(selectedDoc, 'task', linkDrafts.task)}
                                    placeholder="Paste task ID"
                                    className="w-full border rounded px-2 py-1 text-sm"
                                />
                                <label className="text-[11px] uppercase tracking-tight">Deal link</label>
                                <input
                                    value={linkDrafts.deal}
                                    onChange={e => setLinkDrafts(prev => ({ ...prev, deal: e.target.value }))}
                                    onBlur={() => handleAdvancedLinkSave(selectedDoc, 'deal', linkDrafts.deal)}
                                    placeholder="Paste deal ID"
                                    className="w-full border rounded px-2 py-1 text-sm"
                                />
                                <label className="text-[11px] uppercase tracking-tight">Event link</label>
                                <input
                                    value={linkDrafts.event}
                                    onChange={e => setLinkDrafts(prev => ({ ...prev, event: e.target.value }))}
                                    onBlur={() => handleAdvancedLinkSave(selectedDoc, 'event', linkDrafts.event)}
                                    placeholder="Paste event ID"
                                    className="w-full border rounded px-2 py-1 text-sm"
                                />
                            </div>
                        </div>

                        <div>
                            <p className="text-xs uppercase tracking-[0.3em] mb-2">Activity</p>
                            <ActivityList items={selectedDocActivity} isLoading={activityLoading} emptyLabel="No activity for this file yet" />
                        </div>

                        <div className="grid gap-2">
                            {isEditableDocument(selectedDoc.mimeType, selectedDoc.name) && onOpenInEditor && (
                                <Button 
                                    onClick={() => handleEditInEditor(selectedDoc)} 
                                    className="justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                                    disabled={isConverting}
                                >
                                    {isConverting ? (
                                        <><Loader2 size={16} className="animate-spin" /> Converting...</>
                                    ) : (
                                        <><Edit2 size={16} /> Edit in GTM Editor</>
                                    )}
                                </Button>
                            )}
                            <Button onClick={() => handleDownload(selectedDoc)} className="justify-center gap-2">
                                <Download size={16} /> Download
                            </Button>
                            <Button onClick={() => handleShare(selectedDoc)} variant="secondary" className="justify-center gap-2">
                                <Send size={16} /> Share via Email
                            </Button>
                            <Button onClick={() => {
                                setNotesModalDoc(selectedDoc);
                                notesModalTriggerRef.current?.click();
                            }} variant="secondary" className="justify-center gap-2">
                                <FileText size={16} /> Notes
                            </Button>
                            <Button onClick={() => handleDelete(selectedDoc)} variant="danger" className="justify-center gap-2">
                                <Trash2 size={16} /> Delete
                            </Button>
                        </div>
                    </div>
                </aside>
            )}

            <EmailComposer
                isOpen={showEmailComposer}
                onClose={handleCloseComposer}
                initialSubject={emailSubject}
                initialBody={emailBody}
                initialAttachments={emailAttachments}
            />
        </div>
    );
}

function getFileIcon(mimeType: string | undefined) {
    if (!mimeType) return <File className="w-8 h-8 text-gray-400" />;
    if (mimeType.includes('pdf')) return <FileText className="w-8 h-8 text-red-500" />;
    if (mimeType.includes('image')) return <ImageIcon className="w-8 h-8 text-purple-500" />;
    if (mimeType.includes('text')) return <FileText className="w-8 h-8 text-blue-500" />;
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return <FileText className="w-8 h-8 text-green-500" />;
    return <File className="w-8 h-8 text-indigo-500" />;
}

function formatSize(bytes: number | undefined) {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let size = bytes / 1024;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function formatRelativeTime(timestamp: number | undefined) {
    if (!timestamp) return 'N/A';
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

function calculateDocSize(doc: Document): number {
    if (doc.fileSize) return doc.fileSize;
    if (!doc.content) return 0;
    return Math.ceil((doc.content.length * 3) / 4);
}

function QuickFilterButton({ icon, label, active, onClick }: { icon: React.ReactNode; label: string; active: boolean; onClick: () => void }) {
    return (
        <button
            className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-semibold border rounded ${active ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-50'}`}
            onClick={onClick}
        >
            {icon}
            {label}
        </button>
    );
}

function TagToggle({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
    return (
        <button
            className={`px-2 py-1 border text-xs rounded ${active ? 'bg-black text-white' : 'bg-white'}`}
            onClick={onToggle}
        >
            <span className="flex items-center gap-1"><Tag size={12} /> {label}</span>
        </button>
    );
}

function TagList({ tags, limit }: { tags: string[]; limit?: number }) {
    if (!tags.length) return <span className="text-xs text-gray-400">No tags</span>;
    const display = typeof limit === 'number' ? tags.slice(0, limit) : tags;
    return (
        <div className="flex flex-wrap gap-1">
            {display.map(tag => (
                <span key={tag} className="px-2 py-0.5 border rounded text-[10px] uppercase tracking-tight">{tag}</span>
            ))}
            {limit && tags.length > limit && <span className="text-[10px] text-gray-500">+{tags.length - limit}</span>}
        </div>
    );
}

function StatCard({ label, value, helper }: { label: string; value: number | string; helper: string }) {
    return (
        <div className="border rounded px-3 py-2 bg-[#FFFBEB]">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-600">{label}</p>
            <p className="text-xl font-black">{value}</p>
            <p className="text-[10px] text-gray-600">{helper}</p>
        </div>
    );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="text-sm">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">{label}</p>
            <p>{value}</p>
        </div>
    );
}

function ActivityList({ items, isLoading, compact, emptyLabel }: { items: DocumentActivity[]; isLoading: boolean; compact?: boolean; emptyLabel?: string }) {
    if (isLoading) {
        return <p className="text-xs text-gray-500">Loading activity...</p>;
    }
    if (!items.length) {
        return <p className="text-xs text-gray-500">{emptyLabel || 'No activity yet'}</p>;
    }
    return (
        <ul className="space-y-2 text-xs">
            {items.map(item => (
                <li key={item.id} className="flex items-start gap-2">
                    <div className="w-6 h-6 border rounded-full flex items-center justify-center bg-white">
                        <ActivityIcon size={12} />
                    </div>
                    <div>
                        <p><strong>{item.userName}</strong> {renderActionCopy(item)}</p>
                        {!compact && <p className="text-[10px] text-gray-500">{formatRelativeTime(item.createdAt)}</p>}
                    </div>
                </li>
            ))}
        </ul>
    );
}

function renderActionCopy(activity: DocumentActivity) {
    switch (activity.action) {
        case 'uploaded':
            return 'uploaded this file';
        case 'downloaded':
            return 'downloaded this file';
        case 'shared':
            return 'shared this file';
        case 'tagged':
            return `tagged this file (${activity.details?.tag || ''})`;
        case 'starred':
            return activity.details?.value ? 'starred this file' : 'removed the star';
        case 'linked':
            return 'updated linked records';
        case 'viewed':
            return 'viewed this file';
        default:
            return activity.action;
    }
}

function createActivityId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
