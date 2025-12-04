import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { Document, AppActions, TabType, AnyCrmItem, Contact, DocumentActivity } from '../types';
import DocumentUploadModal from './shared/DocumentUploadModal';
import Modal from './shared/Modal';
import NotesManager from './shared/NotesManager';
import { ConfirmDialog } from './shared/ConfirmDialog';
import { useAuth } from '../contexts/AuthContext';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { DatabaseService } from '../lib/services/database';
import { EmailComposer, EmailAttachment } from './email/EmailComposerWrapper';
import { supabase } from '../lib/supabase';
import { showError, showInfo } from '../lib/utils/toast';
import mammoth from 'mammoth';
import { Upload } from 'lucide-react';
import { useConfirmAction } from '../hooks';
import { APP_CONFIG } from '../lib/config';
import { extractTextFromImage, ocrPdfPages } from '../services/visionService';
import { transcribe } from '../services/audioService';

// Import extracted components
import {
    FileLibrarySidebar,
    FileCard,
    FileDetailPanel,
    FileListTable,
    FileLibraryHeader,
    BulkActionsBar,
    isEditableDocument,
    calculateDocSize,
    QuickFilter,
    ViewMode,
    SortOption
} from './files';

// Dynamic PDF.js import to avoid worker issues at module load time
let pdfjsLib: typeof import('pdfjs-dist') | null = null;
let pdfWorkerInitialized = false;

async function initPdfJs() {
    if (pdfWorkerInitialized) return pdfjsLib;
    
    pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
    pdfWorkerInitialized = true;
    return pdfjsLib;
}

const MAX_ACTIVITY_ITEMS = 80;

// Render a PDF page to a base64 image for OCR
async function renderPdfPageToImage(page: any, scale: number = 2): Promise<string> {
    const viewport = page.getViewport({ scale });
    const canvas = window.document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not get canvas context');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    await page.render({
        canvasContext: context,
        viewport: viewport,
    }).promise;
    
    return canvas.toDataURL('image/png');
}

// Extract text from PDF using pdfjs-dist, with OCR fallback for scanned documents
async function extractTextFromPDF(base64Content: string, options?: { useOcr?: boolean; onProgress?: (status: string) => void }): Promise<string> {
    const { useOcr = true, onProgress } = options || {};
    
    try {
        const pdfjs = await initPdfJs();
        if (!pdfjs) throw new Error('Failed to load PDF.js library');
        
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        const loadingTask = pdfjs.getDocument({ data: bytes, useSystemFonts: true });
        const pdf = await loadingTask.promise;
        const textParts: string[] = [];
        
        onProgress?.('Extracting text from PDF...');
        
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str || '').join(' ');
            textParts.push(pageText);
        }
        
        const result = textParts.join('\n\n').trim();
        
        // Check if we got meaningful text
        const avgCharsPerPage = result.length / pdf.numPages;
        const isLikelyScanned = !result || avgCharsPerPage < 100;
        
        if (isLikelyScanned && useOcr) {
            console.log('[FileLibraryTab] PDF appears to be scanned, attempting OCR...');
            onProgress?.('PDF appears scanned, using AI OCR...');
            
            // Render pages to images and use OCR (limit to first 10 pages)
            const pagesToProcess = Math.min(pdf.numPages, 10);
            const pageImages: string[] = [];
            
            for (let pageNum = 1; pageNum <= pagesToProcess; pageNum++) {
                onProgress?.(`Rendering page ${pageNum} of ${pagesToProcess} for OCR...`);
                const page = await pdf.getPage(pageNum);
                const imageData = await renderPdfPageToImage(page);
                pageImages.push(imageData);
            }
            
            onProgress?.('Running AI OCR on pages...');
            const ocrResult = await ocrPdfPages(pageImages, { documentType: 'general' });
            
            if (ocrResult.text && ocrResult.text.trim().length > result.length) {
                console.log(`[FileLibraryTab] OCR extracted ${ocrResult.text.length} chars (vs ${result.length} from text extraction)`);
                return ocrResult.text;
            }
        }
        
        if (!result) {
            console.warn('[FileLibraryTab] PDF extraction returned empty text - PDF may be scanned/image-based');
        }
        
        return result;
    } catch (error) {
        console.error('[FileLibraryTab] PDF extraction error:', error);
        throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Extract text from DOCX using mammoth
async function extractTextFromDOCX(base64Content: string): Promise<{ text: string; html: string }> {
    try {
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;
        
        const [htmlResult, textResult] = await Promise.all([
            mammoth.convertToHtml({ arrayBuffer }),
            mammoth.extractRawText({ arrayBuffer })
        ]);
        
        return { text: textResult.value, html: htmlResult.value };
    } catch (error) {
        console.error('[FileLibraryTab] DOCX extraction error:', error);
        throw new Error('Failed to extract text from DOCX');
    }
}

// Helper to check if file is an audio file
function isAudioFile(mimeType: string, fileName: string): boolean {
    const audioMimes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm', 'audio/ogg', 'audio/m4a', 'audio/x-m4a', 'audio/mp4'];
    const audioExtensions = ['.mp3', '.wav', '.webm', '.ogg', '.m4a', '.mp4', '.flac'];
    return audioMimes.includes(mimeType) || audioExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

// Helper to check if file is an image file
function isImageFile(mimeType: string, fileName: string): boolean {
    const imageMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageMimes.includes(mimeType) || imageExtensions.some(ext => fileName.toLowerCase().endsWith(ext));
}

// Transcribe audio file to text using Whisper
async function transcribeAudioFile(base64Content: string, fileName: string): Promise<string> {
    try {
        console.log('[FileLibraryTab] Transcribing audio file:', fileName);
        
        // Convert base64 to Blob
        const binaryString = atob(base64Content);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Determine MIME type from extension
        const ext = fileName.toLowerCase().split('.').pop() || 'mp3';
        const mimeMap: Record<string, string> = {
            'mp3': 'audio/mpeg',
            'wav': 'audio/wav',
            'webm': 'audio/webm',
            'm4a': 'audio/mp4',
            'ogg': 'audio/ogg',
            'flac': 'audio/flac',
        };
        const mimeType = mimeMap[ext] || 'audio/mpeg';
        
        const blob = new Blob([bytes], { type: mimeType });
        const result = await transcribe(blob);
        
        console.log(`[FileLibraryTab] Transcription complete: ${result.text.length} chars in ${result.latencyMs}ms`);
        return result.text;
    } catch (error) {
        console.error('[FileLibraryTab] Audio transcription error:', error);
        throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Extract text from image using OCR
async function extractTextFromImageFile(base64Content: string, mimeType: string): Promise<string> {
    try {
        console.log('[FileLibraryTab] Extracting text from image...');
        
        // Build data URL
        const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${base64Content}`;
        const result = await extractTextFromImage(dataUrl, { documentType: 'general' });
        
        console.log(`[FileLibraryTab] Image OCR complete: ${result.text.length} chars in ${result.latencyMs}ms`);
        return result.text;
    } catch (error) {
        console.error('[FileLibraryTab] Image OCR error:', error);
        throw new Error(`Failed to extract text from image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

// Use Groq AI to intelligently structure and format extracted document content
async function formatDocumentWithAI(rawText: string, fileName: string): Promise<{ contentJson: any; contentPlain: string }> {
    try {
        if (!rawText || rawText.trim().length < 10) {
            throw new Error('Not enough text content to format');
        }
        
        const systemPrompt = `You are a document structure analyzer. Convert raw text into a Tiptap JSON document.

OUTPUT FORMAT - Return ONLY this JSON structure, no other text:
{"type":"doc","content":[...nodes...]}

NODE TYPES you can use:
1. Heading: {"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Title"}]}
2. Paragraph: {"type":"paragraph","content":[{"type":"text","text":"Text here"}]}
3. Bullet List: {"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Item"}]}]}]}

RULES:
- Return ONLY valid JSON, nothing else
- Keep ALL original text content
- Identify document structure (headings, sections, lists)`;

        const response = await supabase.functions.invoke('groq-chat', {
            body: {
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `Convert this extracted document text to Tiptap JSON:\n\n${rawText.slice(0, 12000)}` }
                ],
                temperature: 0.2,
                max_tokens: 8000,
                model: APP_CONFIG.api.groq.models.default // Use centralized config
            }
        });

        if (response.error) {
            console.error('[FileLibraryTab] Groq error:', response.error);
            throw new Error('AI formatting failed: ' + (response.error.message || JSON.stringify(response.error)));
        }

        let aiContent = response.data?.response || '';
        
        if (!aiContent) {
            console.error('[FileLibraryTab] Empty AI response');
            throw new Error('Empty AI response');
        }

        let jsonString = aiContent.trim();
        const codeBlockMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch) {
            jsonString = codeBlockMatch[1].trim();
        }
        
        if (!jsonString.startsWith('{')) {
            const jsonStart = jsonString.indexOf('{"type":"doc"');
            if (jsonStart !== -1) {
                jsonString = jsonString.slice(jsonStart);
            }
        }
        
        if (jsonString.startsWith('{')) {
            let depth = 0, endIndex = 0;
            for (let i = 0; i < jsonString.length; i++) {
                if (jsonString[i] === '{') depth++;
                else if (jsonString[i] === '}') { depth--; if (depth === 0) { endIndex = i + 1; break; } }
            }
            if (endIndex > 0) jsonString = jsonString.slice(0, endIndex);
        }
        
        const parsedContent = JSON.parse(jsonString);
        
        if (parsedContent.type === 'doc' && Array.isArray(parsedContent.content)) {
            return { contentJson: parsedContent, contentPlain: rawText };
        }
        
        throw new Error('Invalid document structure from AI');
    } catch (error) {
        console.error('[FileLibraryTab] AI formatting error:', error);
        throw error;
    }
}

interface FileLibraryTabProps {
    documents: Document[];
    actions: AppActions;
    companies: AnyCrmItem[];
    contacts: (Contact & { companyName: string })[];
    onOpenInEditor?: (docId: string) => void;
}

export default function FileLibraryTab({ documents, actions, companies, contacts, onOpenInEditor }: FileLibraryTabProps) {
    const { user } = useAuth();
    const { workspace } = useWorkspace();

    // Document state
    const [libraryDocs, setLibraryDocs] = useState<Document[]>(documents);
    
    // View state
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
    const [selectedModule, setSelectedModule] = useState<TabType | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOption, setSortOption] = useState<SortOption>('newest');
    const [tagFilters, setTagFilters] = useState<string[]>([]);
    
    // Selection state
    const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    
    // Modal state
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const [notesModalDoc, setNotesModalDoc] = useState<Document | null>(null);
    const [showEmailComposer, setShowEmailComposer] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [emailAttachments, setEmailAttachments] = useState<EmailAttachment[]>([]);
    
    // Activity state
    const [activity, setActivity] = useState<DocumentActivity[]>([]);
    const [activityLoading, setActivityLoading] = useState(false);
    
    // Form drafts
    const [tagDraft, setTagDraft] = useState('');
    const [descriptionDraft, setDescriptionDraft] = useState('');
    const [linkDrafts, setLinkDrafts] = useState({ task: '', deal: '', event: '' });
    
    // UI state
    const [bulkBusy, setBulkBusy] = useState(false);
    const [isConverting, setIsConverting] = useState(false);
    const [showMobileSidebar, setShowMobileSidebar] = useState(false);

    // Confirm dialog using shared hook
    const confirmAction = useConfirmAction();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const notesModalTriggerRef = useRef<HTMLButtonElement | null>(null);

    // Sync documents from props
    useEffect(() => setLibraryDocs(documents), [documents]);

    // Clean up selections when docs change
    useEffect(() => {
        setSelectedIds(prev => {
            const next = new Set<string>();
            libraryDocs.forEach(doc => { if (prev.has(doc.id)) next.add(doc.id); });
            return next;
        });
    }, [libraryDocs]);

    useEffect(() => {
        if (selectedDocId && !libraryDocs.some(doc => doc.id === selectedDocId)) {
            setSelectedDocId(null);
        }
    }, [libraryDocs, selectedDocId]);

    // Reset drafts when selected doc changes
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

    // Fetch activity
    const fetchActivity = useCallback(async () => {
        if (!workspace?.id) return;
        setActivityLoading(true);
        const { data } = await DatabaseService.getDocumentActivity(workspace.id, { limit: MAX_ACTIVITY_ITEMS });
        setActivity(data || []);
        setActivityLoading(false);
    }, [workspace?.id]);

    useEffect(() => { fetchActivity(); }, [fetchActivity]);

    // Helpers
    const patchDocument = useCallback((docId: string, updates: Partial<Document>) => {
        setLibraryDocs(prev => prev.map(doc => (doc.id === docId ? { ...doc, ...updates } : doc)));
    }, []);

    const recordActivity = useCallback(async (docId: string, action: DocumentActivity['action'], details?: Record<string, unknown>) => {
        if (!workspace?.id || !user?.id) return;
        const entry: DocumentActivity = {
            id: crypto.randomUUID?.() || `activity-${Date.now()}-${Math.random().toString(16).slice(2)}`,
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

    // File handlers
    const handleFileSelect = (selectedFile: File | null) => {
        if (selectedFile) setFileToUpload(selectedFile);
    };

    const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (event.dataTransfer.files?.[0]) handleFileSelect(event.dataTransfer.files[0]);
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
        const performDelete = async () => {
            await actions.deleteDocument(doc.id);
            setLibraryDocs(prev => prev.filter(item => item.id !== doc.id));
            setSelectedIds(prev => { const next = new Set(prev); next.delete(doc.id); return next; });
            if (selectedDocId === doc.id) setSelectedDocId(null);
        };

        if (silent) {
            await performDelete();
        } else {
            confirmAction.confirm({
                title: 'Delete File',
                message: `Delete "${doc.name}"? This action cannot be undone.`,
                variant: 'danger',
                onConfirm: performDelete,
            });
        }
    };

    const handleShare = (doc: Document) => {
        setEmailSubject(`Document: ${doc.name}`);
        setEmailBody(`Hi,\n\nI wanted to share "${doc.name}" with you.\n\nBest,`);
        
        let attachmentData: string | undefined;
        if (doc.content) {
            try { attachmentData = btoa(unescape(encodeURIComponent(doc.content))); }
            catch { attachmentData = btoa(doc.content); }
        }
        
        setEmailAttachments(attachmentData ? [{ name: doc.name, type: doc.mimeType || 'text/html', data: attachmentData }] : []);
        setShowEmailComposer(true);
        recordActivity(doc.id, 'shared');
    };

    const handleEditInEditor = async (doc: Document) => {
        if (!workspace?.id || !user?.id || !onOpenInEditor) return;
        
        setIsConverting(true);
        
        try {
            let textContent = '';
            const mimeType = doc.mimeType || '';
            const fileName = doc.name || '';
            
            // Extract text based on file type
            if (isAudioFile(mimeType, fileName)) {
                // Audio files: Transcribe using Whisper
                showInfo('Transcribing audio file with AI...');
                textContent = await transcribeAudioFile(doc.content, fileName);
                textContent = `# Audio Transcription: ${doc.name}\n\n${textContent}`;
            } else if (isImageFile(mimeType, fileName)) {
                // Image files: Extract text using OCR
                showInfo('Extracting text from image with AI OCR...');
                textContent = await extractTextFromImageFile(doc.content, mimeType);
                textContent = `# Text from Image: ${doc.name}\n\n${textContent}`;
            } else if (mimeType === 'application/pdf' || mimeType.includes('pdf')) {
                textContent = await extractTextFromPDF(doc.content, {
                    useOcr: true,
                    onProgress: (status) => showInfo(status),
                });
            } else if (mimeType.includes('wordprocessingml') || fileName.endsWith('.docx')) {
                const result = await extractTextFromDOCX(doc.content);
                textContent = result.text;
            } else if (mimeType === 'application/msword' || fileName.endsWith('.doc')) {
                try {
                    const result = await extractTextFromDOCX(doc.content);
                    textContent = result.text;
                } catch {
                    textContent = atob(doc.content).replace(/[^\x20-\x7E\n\r\t]/g, ' ').trim();
                }
            } else {
                try { textContent = atob(doc.content); } catch { textContent = doc.content || ''; }
            }
            
            // Handle empty text extraction
            if (!textContent || textContent.trim().length === 0) {
                console.warn('[FileLibraryTab] No text extracted from document - may be scanned/image-based');
                textContent = `[Document: ${doc.name}]\n\nNo text could be extracted from this document. It may be a scanned image or have content that cannot be read as text.`;
            }
            
            // Create the GTM doc first
            const { data: newDoc, error } = await DatabaseService.createGTMDoc({
                workspaceId: workspace.id,
                userId: user.id,
                title: doc.name.replace(/\.[^/.]+$/, ''),
                docType: 'brief',
                contentJson: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }] },
                contentPlain: textContent,
                visibility: 'team',
                tags: doc.tags || [],
            });
            
            if (error || !newDoc) {
                console.error('[FileLibraryTab] Failed to create GTM doc:', error);
                showError('Failed to open document in editor');
                return;
            }
            
            const isTeamPro = workspace?.planType === 'team-pro';
            const needsAiFormatting = mimeType.includes('pdf') || mimeType.includes('wordprocessingml') || 
                fileName.endsWith('.docx') || fileName.endsWith('.doc') ||
                isAudioFile(mimeType, fileName) || isImageFile(mimeType, fileName);
            
            let finalContentJson: any;
            
            // Try AI formatting for supported file types on team-pro plan
            if (needsAiFormatting && textContent.length > 50 && isTeamPro) {
                try {
                    const aiFormatted = await formatDocumentWithAI(textContent, fileName);
                    finalContentJson = aiFormatted.contentJson;
                } catch (aiError) {
                    console.warn('[FileLibraryTab] AI formatting failed, using basic formatting:', aiError);
                    finalContentJson = createBasicContent(doc.name, textContent);
                }
            } else {
                finalContentJson = createBasicContent(doc.name, textContent);
            }
            
            // Update the doc with the formatted content
            await DatabaseService.updateGTMDoc(newDoc.id, workspace.id, { contentJson: finalContentJson, contentPlain: textContent });
            
            // Open in editor
            onOpenInEditor(newDoc.id);
            recordActivity(doc.id, 'viewed', { editedInGtmEditor: true });
        } catch (err) {
            console.error('[FileLibraryTab] Error opening in editor:', err);
            showError('Failed to open document in editor. The file format may not be supported.');
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
        if (!trimmed || (doc.tags || []).includes(trimmed)) { setTagDraft(''); return; }
        const nextTags = [...(doc.tags || []), trimmed];
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
        if (!companyId) updates.contactId = undefined;
        else if (doc.contactId && !contacts.find(c => c.id === doc.contactId && c.crmItemId === companyId)) {
            updates.contactId = undefined;
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

    // Selection handlers
    const toggleSelection = (docId: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(docId)) next.delete(docId);
            else next.add(docId);
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

    // Bulk handlers
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
        confirmAction.confirm({
            title: 'Delete Files',
            message: `Delete ${selectedIds.size} selected file(s)? This action cannot be undone.`,
            variant: 'danger',
            onConfirm: async () => {
                setBulkBusy(true);
                for (const id of Array.from(selectedIds)) {
                    const doc = libraryDocs.find(d => d.id === id);
                    if (doc) await handleDelete(doc, true);
                }
                setSelectedIds(new Set());
                setBulkBusy(false);
            },
        });
    };

    const handleBulkTag = async (tag: string) => {
        const trimmed = tag.trim();
        if (!trimmed || !selectedIds.size) return;
        setBulkBusy(true);
        const ids = Array.from(selectedIds);
        const updates: Promise<any>[] = [];
        ids.forEach(id => {
            const doc = libraryDocs.find(d => d.id === id);
            if (!doc || (doc.tags || []).includes(trimmed)) return;
            const nextTags = [...(doc.tags || []), trimmed];
            patchDocument(id, { tags: nextTags });
            updates.push(actions.updateDocument(id, { tags: nextTags }, { reload: false, silent: true }));
            recordActivity(id, 'tagged', { tag: trimmed });
        });
        await Promise.all(updates);
        setSelectedIds(new Set());
        setBulkBusy(false);
    };

    // Computed values
    const availableTags = useMemo(() => {
        const set = new Set<string>();
        libraryDocs.forEach(doc => (doc.tags || []).forEach(tag => set.add(tag)));
        return Array.from(set).sort();
    }, [libraryDocs]);

    const moduleCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        libraryDocs.forEach(doc => { counts[doc.module] = (counts[doc.module] || 0) + 1; });
        return counts;
    }, [libraryDocs]);

    const filteredDocs = useMemo(() => {
        let docs = [...libraryDocs];

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            docs = docs.filter(doc => {
                const target = [doc.name, doc.uploadedByName, doc.description || '', ...(doc.tags || [])]
                    .filter(Boolean).join(' ').toLowerCase();
                return target.includes(q);
            });
        }

        if (selectedModule) docs = docs.filter(doc => doc.module === selectedModule);
        if (tagFilters.length) docs = docs.filter(doc => tagFilters.every(tag => (doc.tags || []).includes(tag)));

        if (quickFilter === 'starred') docs = docs.filter(doc => doc.isStarred);
        else if (quickFilter === 'recent') {
            const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
            docs = docs.filter(doc => doc.uploadedAt >= sevenDaysAgo);
        }
        else if (quickFilter === 'mine' && user) docs = docs.filter(doc => doc.uploadedBy === user.id);
        else if (quickFilter === 'linked') docs = docs.filter(doc => doc.companyId || doc.contactId || doc.linkTaskId || doc.linkDealId || doc.linkEventId);

        docs.sort((a, b) => {
            switch (sortOption) {
                case 'name': return a.name.localeCompare(b.name);
                case 'size': return (b.fileSize || calculateDocSize(b)) - (a.fileSize || calculateDocSize(a));
                case 'views': return (b.viewCount || 0) - (a.viewCount || 0);
                default: return b.uploadedAt - a.uploadedAt;
            }
        });

        return docs;
    }, [libraryDocs, searchQuery, selectedModule, tagFilters, quickFilter, sortOption, user]);

    const selectedDoc = useMemo(() => libraryDocs.find(doc => doc.id === selectedDocId) || null, [libraryDocs, selectedDocId]);
    const totalSize = useMemo(() => libraryDocs.reduce((sum, doc) => sum + (doc.fileSize || calculateDocSize(doc)), 0), [libraryDocs]);
    const recentCount = useMemo(() => libraryDocs.filter(doc => doc.uploadedAt >= Date.now() - 7 * 24 * 60 * 60 * 1000).length, [libraryDocs]);
    const starredCount = useMemo(() => libraryDocs.filter(doc => doc.isStarred).length, [libraryDocs]);
    const linkedCount = useMemo(() => libraryDocs.filter(doc => doc.companyId || doc.contactId || doc.linkTaskId || doc.linkDealId || doc.linkEventId).length, [libraryDocs]);
    const selectedDocActivity = useMemo(() => (selectedDocId ? activity.filter(item => item.documentId === selectedDocId) : []), [activity, selectedDocId]);
    const recentActivity = useMemo(() => activity.slice(0, 6), [activity]);

    const handleResetFilters = () => {
        setSelectedModule(null);
        setQuickFilter('all');
    };

    return (
        <div className="flex h-full bg-[#FDF9F2] text-black font-mono overflow-hidden border-t border-gray-200" onDrop={handleDrop} onDragOver={handleDragOver}>
            {/* Mobile sidebar overlay - z-20 so main navigation menu (z-40/z-50) can appear on top */}
            {showMobileSidebar && (
                <div className="fixed inset-0 z-20 lg:hidden" onClick={() => setShowMobileSidebar(false)}>
                    <div className="absolute inset-0 bg-black/50" />
                </div>
            )}
            
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

            <FileLibrarySidebar
                documents={libraryDocs}
                quickFilter={quickFilter}
                onQuickFilterChange={setQuickFilter}
                selectedModule={selectedModule}
                onModuleChange={setSelectedModule}
                tagFilters={tagFilters}
                onTagFiltersChange={setTagFilters}
                availableTags={availableTags}
                recentActivity={recentActivity}
                activityLoading={activityLoading}
                onUploadClick={() => fileInputRef.current?.click()}
                onResetFilters={handleResetFilters}
                showMobileSidebar={showMobileSidebar}
                onCloseMobileSidebar={() => setShowMobileSidebar(false)}
                totalFiles={libraryDocs.length}
                recentCount={recentCount}
                totalSize={totalSize}
                starredCount={starredCount}
                linkedCount={linkedCount}
                moduleCounts={moduleCounts}
            />
            
            <input ref={fileInputRef} type="file" className="hidden" onChange={e => handleFileSelect(e.target.files?.[0] || null)} />

            <section className="flex-1 flex flex-col min-w-0">
                <FileLibraryHeader
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    sortOption={sortOption}
                    onSortChange={setSortOption}
                    selectedModule={selectedModule}
                    onResetFilters={handleResetFilters}
                    onOpenMobileSidebar={() => setShowMobileSidebar(true)}
                />

                <BulkActionsBar
                    selectedCount={selectedIds.size}
                    isBusy={bulkBusy}
                    onStar={() => handleBulkStar(true)}
                    onUnstar={() => handleBulkStar(false)}
                    onAddTag={() => handleBulkTag('Shared')}
                    onDelete={handleBulkDelete}
                />

                <main className="flex-1 overflow-auto p-3 sm:p-8" onClick={() => setSelectedDocId(null)}>
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
                            {filteredDocs.map(doc => (
                                <FileCard
                                    key={doc.id}
                                    doc={doc}
                                    isSelected={selectedIds.has(doc.id)}
                                    onToggleSelect={() => toggleSelection(doc.id)}
                                    onToggleStar={(isStarred) => handleToggleStar(doc, isStarred)}
                                    onSelect={() => setSelectedDocId(doc.id)}
                                    onOpen={() => handleOpenDocument(doc)}
                                    onShare={() => handleShare(doc)}
                                    onOpenNotes={() => setNotesModalDoc(doc)}
                                    onDelete={() => handleDelete(doc)}
                                    onEditInEditor={onOpenInEditor ? () => handleEditInEditor(doc) : undefined}
                                    isEditable={isEditableDocument(doc.mimeType, doc.name)}
                                    isConverting={isConverting}
                                />
                            ))}
                        </div>
                    ) : (
                        <FileListTable
                            docs={filteredDocs}
                            selectedIds={selectedIds}
                            selectedDocId={selectedDocId}
                            onToggleSelect={toggleSelection}
                            onToggleSelectAll={() => toggleSelectAllVisible(filteredDocs)}
                            onSelectDoc={setSelectedDocId}
                            onOpen={handleOpenDocument}
                            onShare={handleShare}
                            onToggleStar={handleToggleStar}
                            onDelete={handleDelete}
                            onEditInEditor={onOpenInEditor ? handleEditInEditor : undefined}
                            isEditableCheck={isEditableDocument}
                            isConverting={isConverting}
                        />
                    )}
                </main>
            </section>

            {selectedDoc && (
                <FileDetailPanel
                    doc={selectedDoc}
                    onClose={() => setSelectedDocId(null)}
                    onToggleStar={(isStarred) => handleToggleStar(selectedDoc, isStarred)}
                    onDownload={() => handleDownload(selectedDoc)}
                    onShare={() => handleShare(selectedDoc)}
                    onOpenNotes={() => setNotesModalDoc(selectedDoc)}
                    onDelete={() => handleDelete(selectedDoc)}
                    onEditInEditor={onOpenInEditor ? () => handleEditInEditor(selectedDoc) : undefined}
                    isEditable={isEditableDocument(selectedDoc.mimeType, selectedDoc.name)}
                    isConverting={isConverting}
                    tagDraft={tagDraft}
                    onTagDraftChange={setTagDraft}
                    onAddTag={(tag) => handleAddTag(selectedDoc, tag)}
                    onRemoveTag={(tag) => handleRemoveTag(selectedDoc, tag)}
                    descriptionDraft={descriptionDraft}
                    onDescriptionDraftChange={setDescriptionDraft}
                    onDescriptionSave={() => handleDescriptionSave(selectedDoc, descriptionDraft)}
                    onModuleChange={(module) => handleModuleChange(selectedDoc, module)}
                    onCompanyChange={(companyId) => handleCompanyChange(selectedDoc, companyId)}
                    onContactChange={(contactId) => handleContactChange(selectedDoc, contactId)}
                    companies={companies}
                    contacts={contacts}
                    linkDrafts={linkDrafts}
                    onLinkDraftChange={(field, value) => setLinkDrafts(prev => ({ ...prev, [field]: value }))}
                    onLinkSave={(field) => handleAdvancedLinkSave(selectedDoc, field, linkDrafts[field])}
                    activity={selectedDocActivity}
                    activityLoading={activityLoading}
                />
            )}

            <EmailComposer
                isOpen={showEmailComposer}
                onClose={() => { setShowEmailComposer(false); setEmailAttachments([]); }}
                initialSubject={emailSubject}
                initialBody={emailBody}
                initialAttachments={emailAttachments}
            />

            <ConfirmDialog
                isOpen={confirmAction.isOpen}
                onClose={confirmAction.cancel}
                onConfirm={confirmAction.handleConfirm}
                title={confirmAction.state.title}
                message={confirmAction.state.message}
                variant={confirmAction.state.variant}
            />
        </div>
    );
}

function createBasicContent(fileName: string, textContent: string) {
    return { 
        type: 'doc', 
        content: [
            { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: fileName.replace(/\.[^/.]+$/, '') }] },
            ...textContent.split('\n').filter(Boolean).map(line => ({
                type: 'paragraph',
                content: line.trim() ? [{ type: 'text', text: line }] : []
            }))
        ]
    };
}
