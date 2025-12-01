import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { supabase } from '../../../../lib/supabase';
import { getAiResponse, Content, AILimitError } from '../../../../services/groqService';
import { searchWeb } from '../../../../src/lib/services/youSearchService';
import { showSuccess, showError } from '../../../../lib/utils/toast';
import { convertYouTubeForEmailSimple } from '../../../../lib/utils/youtubeEmbed';
import { AI_ACTIONS, EMAIL_TEMPLATES, AIAction } from '../constants';
import { Editor } from '@tiptap/react';
import { ShapeType } from '../../../../lib/tiptap/ShapeNode';
import { v4 as uuidv4 } from 'uuid';
import { DocumentTemplate } from '../../../../lib/templates/gtmTemplates';

export interface EmailAttachment {
    name: string;
    url?: string;
    type?: string;
    data?: string;
}

interface UseEmailComposerProps {
    editor: Editor | null;
    replyTo?: any;
    workspaceId?: string;
    initialAttachments?: EmailAttachment[];
    onClose: () => void;
    onDraftDeleted?: () => void;
}

export function useEmailComposer({
    editor,
    replyTo,
    workspaceId,
    initialAttachments = [],
    onClose,
    onDraftDeleted
}: UseEmailComposerProps) {
    // Form state
    const [to, setTo] = useState('');
    const [cc, setCc] = useState('');
    const [subject, setSubject] = useState('');
    const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
    const [showCc, setShowCc] = useState(false);
    
    // Loading states
    const [sending, setSending] = useState(false);
    const [savingDraft, setSavingDraft] = useState(false);
    const [uploadingAttachment, setUploadingAttachment] = useState(false);
    
    // AI state
    const [aiProcessing, setAiProcessing] = useState(false);
    const [aiActionLabel, setAiActionLabel] = useState('');
    const [showAiMenu, setShowAiMenu] = useState(false);
    const [aiLimitError, setAiLimitError] = useState<AILimitError | null>(null);
    const [researchResults, setResearchResults] = useState<string | null>(null);
    const [aiMenuPosition, setAiMenuPosition] = useState<{ top: number; left: number } | null>(null);
    
    // Attachments
    const [attachments, setAttachments] = useState<EmailAttachment[]>(initialAttachments);
    
    // Account state
    const [resolvedAccountId, setResolvedAccountId] = useState<string | null>(null);
    const [accountError, setAccountError] = useState<string | null>(null);
    
    // UI state
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
    const [showFontFamilyMenu, setShowFontFamilyMenu] = useState(false);
    const [showLineSpacingMenu, setShowLineSpacingMenu] = useState(false);
    const [showColorMenu, setShowColorMenu] = useState(false);
    const [showHighlightMenu, setShowHighlightMenu] = useState(false);
    const [showAdvancedColorPicker, setShowAdvancedColorPicker] = useState(false);
    const [showAdvancedHighlightPicker, setShowAdvancedHighlightPicker] = useState(false);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);
    const [showGTMTemplateMenu, setShowGTMTemplateMenu] = useState(false);
    const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
    const [showImageSizeMenu, setShowImageSizeMenu] = useState(false);
    const [showShapeMenu, setShowShapeMenu] = useState(false);
    
    // Colors
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [selectedHighlight, setSelectedHighlight] = useState('#FEF08A');
    
    // Refs
    const aiMenuRef = useRef<HTMLDivElement>(null);
    const aiButtonRef = useRef<HTMLButtonElement>(null);
    const fontSizeRef = useRef<HTMLDivElement>(null);
    const colorRef = useRef<HTMLDivElement>(null);
    const highlightRef = useRef<HTMLDivElement>(null);
    const templateRef = useRef<HTMLDivElement>(null);
    const attachmentRef = useRef<HTMLDivElement>(null);
    const imageSizeRef = useRef<HTMLDivElement>(null);
    const shapeRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    
    // Computed values
    const replyAccountId = replyTo?.account_id || null;
    const effectiveAccountId = useMemo(
        () => replyAccountId || resolvedAccountId || null,
        [replyAccountId, resolvedAccountId]
    );
    const accountReady = Boolean(effectiveAccountId);
    
    // Helper functions
    const extractEmail = (str: string) => {
        const match = str?.match(/<(.+)>/);
        return match ? match[1] : str || '';
    };
    
    const getEditorHtml = useCallback(() => {
        return editor?.getHTML() || '';
    }, [editor]);
    
    const getEditorHtmlForEmail = useCallback(() => {
        const html = editor?.getHTML() || '';
        return convertYouTubeForEmailSimple(html);
    }, [editor]);
    
    const getEditorText = useCallback(() => {
        return editor?.getText() || '';
    }, [editor]);
    
    const setEditorContent = useCallback((html: string) => {
        editor?.commands.setContent(html);
    }, [editor]);
    
    const cleanContent = (text: string) => {
        return (text || '')
            .replace(/System:/gi, 'Sys:')
            .replace(/User:/gi, 'Usr:')
            .replace(/Assistant:/gi, 'Asst:')
            .replace(/<\|im_start\|>/gi, '')
            .replace(/<\|im_end\|>/gi, '');
    };
    
    // Image upload handler
    const handleImageUpload = useCallback(async (file: File) => {
        if (!file.type.startsWith('image/')) {
            showError('Please select an image file');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showError('Image must be less than 5MB');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            editor?.chain().focus().setImage({ src: base64 }).run();
        };
        reader.readAsDataURL(file);
    }, [editor]);
    
    // Insert shape handler
    const handleInsertShape = useCallback((shapeType: ShapeType) => {
        if (!editor) return;
        
        const blockId = uuidv4();
        const now = new Date().toISOString();
        
        editor
            .chain()
            .focus()
            .insertShape({
                blockId,
                shapeType,
                width: 200,
                height: shapeType === 'line' || shapeType === 'arrow' ? 50 : 150,
                x: 0,
                y: 0,
                zIndex: 0,
                fillColor: '#3b82f6',
                strokeColor: '#1e40af',
                strokeWidth: 2,
                createdAt: now,
            })
            .run();
        
        setShowShapeMenu(false);
    }, [editor]);
    
    // File attachment handler
    const handleFileAttachment = useCallback(async (file: File) => {
        if (file.size > 10 * 1024 * 1024) {
            showError('Attachment must be less than 10MB');
            return;
        }
        
        setUploadingAttachment(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `email-attachments/${workspaceId || 'temp'}/${fileName}`;
            
            const { error: uploadError } = await supabase.storage
                .from('documents')
                .upload(filePath, file);
            
            if (uploadError) throw uploadError;
            
            const { data: { publicUrl } } = supabase.storage
                .from('documents')
                .getPublicUrl(filePath);
            
            setAttachments(prev => [...prev, {
                name: file.name,
                url: publicUrl,
                type: file.type,
            }]);
            
            showSuccess('Attachment uploaded');
        } catch (err: any) {
            console.error('[EmailComposer] Attachment upload error:', err);
            showError(`Failed to upload: ${err.message}`);
        } finally {
            setUploadingAttachment(false);
        }
    }, [workspaceId]);
    
    const removeAttachment = useCallback((index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    }, []);
    
    // Template handlers
    const applyTemplate = useCallback((template: typeof EMAIL_TEMPLATES[0]) => {
        setSubject(template.subject);
        setEditorContent(template.content);
        setShowTemplateMenu(false);
        showSuccess(`Applied "${template.name}" template`);
    }, [setEditorContent]);
    
    const applyGTMTemplate = useCallback((template: DocumentTemplate) => {
        const emailContent = template.content
            .replace(/<h1>/g, '<p style="font-size: 24px; font-weight: bold;">')
            .replace(/<\/h1>/g, '</p>')
            .replace(/<h2>/g, '<p style="font-size: 18px; font-weight: bold; margin-top: 16px;">')
            .replace(/<\/h2>/g, '</p>')
            .replace(/<h3>/g, '<p style="font-size: 16px; font-weight: bold; margin-top: 12px;">')
            .replace(/<\/h3>/g, '</p>');
        
        setEditorContent(emailContent);
        setShowGTMTemplateMenu(false);
        showSuccess(`Applied "${template.name}" template`);
    }, [setEditorContent]);
    
    // Toggle AI menu
    const toggleAiMenu = useCallback(() => {
        if (!showAiMenu && aiButtonRef.current) {
            const rect = aiButtonRef.current.getBoundingClientRect();
            setAiMenuPosition({
                top: rect.top - 8,
                left: rect.right - 256,
            });
        }
        setShowAiMenu(!showAiMenu);
    }, [showAiMenu]);
    
    // AI actions
    const handleWebResearch = useCallback(async () => {
        try {
            const topic = subject || replyTo?.subject || getEditorText().slice(0, 100);
            
            if (!topic.trim()) {
                showError('Please add a subject or content to research');
                setAiProcessing(false);
                setAiActionLabel('');
                return;
            }
            
            const searchResults = await searchWeb(topic, 'search', { count: 5 });
            
            if (searchResults?.hits?.length) {
                let researchSummary = '### Web Research Results\n\n';
                
                searchResults.hits.slice(0, 5).forEach((hit: any, i: number) => {
                    researchSummary += `${i + 1}. **${hit.title || 'Untitled'}**\n`;
                    if (hit.description) {
                        researchSummary += `   ${hit.description}\n`;
                    }
                    if (hit.url) {
                        researchSummary += `   [Source](${hit.url})\n`;
                    }
                    researchSummary += '\n';
                });
                
                setResearchResults(researchSummary);
                showSuccess('Research complete! See results below.');
            } else {
                showError('No research results found. Try a different topic.');
            }
        } catch (e: any) {
            console.error('[EmailComposer] Research error:', e);
            showError(`Research failed: ${e.message}`);
        } finally {
            setAiProcessing(false);
            setAiActionLabel('');
        }
    }, [subject, replyTo, getEditorText]);
    
    const handleAiAction = useCallback(async (action: AIAction['action']) => {
        setAiProcessing(true);
        setAiActionLabel(AI_ACTIONS.find(a => a.action === action)?.label || 'Processing');
        setShowAiMenu(false);
        
        try {
            const currentContent = getEditorText();
            const emailContext = replyTo ? `
Original Email:
From: ${replyTo.from_address || 'Unknown'}
Subject: ${replyTo.subject || 'No Subject'}
Content: ${cleanContent(replyTo.body?.text || replyTo.snippet || '')}
` : '';
            
            let systemPrompt = '';
            let userPrompt = '';
            
            switch (action) {
                case 'draft':
                    systemPrompt = `You are an expert email assistant. Draft a professional and concise reply to the email provided.
Your output should be ONLY the body of the email reply in HTML format.
Do not include subject line or email headers.
Use <p> tags for paragraphs. Keep it professional yet personable.`;
                    userPrompt = `${emailContext}\n\nDraft a reply to this email.`;
                    break;
                    
                case 'improve':
                    systemPrompt = `You are an expert writing assistant. Improve the following email draft for clarity, professionalism, and impact.
Maintain the original intent but enhance the writing quality. Return only the improved HTML content.`;
                    userPrompt = `Improve this email draft:\n\n${currentContent}`;
                    break;
                    
                case 'shorten':
                    systemPrompt = `You are an expert editor. Condense the following email while maintaining all key points.
Make it more concise and scannable. Return only the shortened HTML content.`;
                    userPrompt = `Shorten this email:\n\n${currentContent}`;
                    break;
                    
                case 'expand':
                    systemPrompt = `You are an expert writing assistant. Expand the following email with more detail, context, and supporting points.
Make it more comprehensive while staying focused. Return only the expanded HTML content.`;
                    userPrompt = `Expand this email with more detail:\n\n${currentContent}`;
                    break;
                    
                case 'formal':
                    systemPrompt = `You are an expert business writer. Rewrite the following email in a more formal, professional tone.
Suitable for executive communication. Return only the rewritten HTML content.`;
                    userPrompt = `Make this email more formal:\n\n${currentContent}`;
                    break;
                    
                case 'friendly':
                    systemPrompt = `You are an expert communication coach. Rewrite the following email in a warmer, more friendly tone.
Keep it professional but personable. Return only the rewritten HTML content.`;
                    userPrompt = `Make this email friendlier:\n\n${currentContent}`;
                    break;
                    
                case 'research':
                    await handleWebResearch();
                    return;
                    
                case 'suggest':
                    systemPrompt = `You are an expert email strategist. Based on the email context, suggest 3-5 key points that should be included in the reply.
Format as a bulleted list. Consider: goals, objections to address, questions to answer, next steps, and relationship building.`;
                    userPrompt = `${emailContext}\n\nCurrent draft:\n${currentContent}\n\nSuggest key points to include in the reply.`;
                    break;
            }
            
            const history: Content[] = [{ role: 'user', parts: [{ text: userPrompt }] }];
            const response = await getAiResponse(history, systemPrompt, false, workspaceId, 'email');
            
            if (response.candidates && response.candidates.length > 0) {
                const result = response.candidates[0].content.parts[0].text || '';
                
                if (action === 'suggest') {
                    setResearchResults(result);
                } else {
                    const htmlContent = result.includes('<p>') ? result : `<p>${result.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}</p>`;
                    setEditorContent(htmlContent);
                }
                showSuccess(`${AI_ACTIONS.find(a => a.action === action)?.label} complete!`);
            } else {
                showError('AI could not generate a response. Please try again.');
            }
        } catch (e: any) {
            console.error('[EmailComposer] AI action error:', e);
            if (e instanceof AILimitError) {
                setAiLimitError(e);
                showError(`AI limit reached: ${e.usage}/${e.limit} requests used on ${e.planType} plan. Upgrade for unlimited AI.`);
            } else {
                showError(`AI action failed: ${e.message}`);
            }
        } finally {
            setAiProcessing(false);
            setAiActionLabel('');
        }
    }, [getEditorText, replyTo, workspaceId, handleWebResearch, setEditorContent]);
    
    const insertResearchIntoEmail = useCallback(() => {
        if (researchResults) {
            const currentHtml = getEditorHtml();
            const researchHtml = `<p><br/></p><p><strong>Research Notes:</strong></p><p>${researchResults.replace(/\n/g, '<br/>')}</p>`;
            setEditorContent(currentHtml + researchHtml);
            setResearchResults(null);
            showSuccess('Research inserted into email');
        }
    }, [researchResults, getEditorHtml, setEditorContent]);
    
    // Send email
    const handleSend = useCallback(async () => {
        if (!to.trim()) {
            showError('Please enter a recipient');
            return;
        }
        
        const accountId = effectiveAccountId;
        if (!accountId) {
            showError('Connect a Gmail account in Settings → Integrations before sending emails.');
            return;
        }
        
        setSending(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/email-api?action=send_email`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    accountId,
                    to: to.split(',').map(e => e.trim()),
                    cc: cc ? cc.split(',').map(e => e.trim()) : undefined,
                    subject,
                    htmlBody: getEditorHtmlForEmail(),
                    attachments: attachments.length > 0 ? attachments : undefined,
                })
            });
            
            if (!res.ok) {
                const err = await res.text();
                throw new Error(err || 'Failed to send');
            }
            
            if (currentDraftId && accountId) {
                await supabase
                    .from('email_messages')
                    .delete()
                    .eq('provider_message_id', currentDraftId)
                    .eq('account_id', accountId);
                onDraftDeleted?.();
            }
            
            onClose();
            showSuccess('Email sent successfully!');
        } catch (err: any) {
            console.error(err);
            showError(`Failed to send email: ${err.message}`);
        } finally {
            setSending(false);
        }
    }, [to, cc, subject, effectiveAccountId, currentDraftId, attachments, getEditorHtmlForEmail, onClose, onDraftDeleted]);
    
    // Save draft
    const handleSaveDraft = useCallback(async () => {
        const accountId = effectiveAccountId;
        if (!accountId) {
            showError('Connect a Gmail account before saving drafts.');
            return;
        }
        
        const bodyContent = getEditorHtml();
        const textContent = getEditorText();
        
        if (!subject.trim() && !textContent.trim() && !to.trim()) {
            showError('Nothing to save - add a recipient, subject, or message');
            return;
        }
        
        setSavingDraft(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');
            
            const draftId = currentDraftId || `draft-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            
            const { error } = await supabase.from('email_messages').upsert({
                account_id: accountId,
                provider_message_id: draftId,
                thread_id: replyTo?.thread_id || null,
                subject: subject || '(No Subject)',
                snippet: textContent.slice(0, 200),
                from_address: session.user.email,
                to_addresses: to ? to.split(',').map(e => e.trim()).filter(Boolean) : [],
                cc_addresses: cc ? cc.split(',').map(e => e.trim()).filter(Boolean) : [],
                folder_id: 'DRAFT',
                is_read: true,
                is_draft: true,
                has_attachments: attachments.length > 0,
                received_at: new Date().toISOString(),
                body: { html: bodyContent, text: textContent, attachments },
            }, {
                onConflict: 'account_id,provider_message_id'
            });
            
            if (error) throw error;
            
            setCurrentDraftId(draftId);
            showSuccess('Draft saved!');
        } catch (err: any) {
            console.error('[EmailComposer] Save draft error:', err);
            showError(`Failed to save draft: ${err.message}`);
        } finally {
            setSavingDraft(false);
        }
    }, [effectiveAccountId, to, cc, subject, currentDraftId, attachments, replyTo, getEditorHtml, getEditorText]);
    
    return {
        // Form state
        to, setTo,
        cc, setCc,
        subject, setSubject,
        showCc, setShowCc,
        currentDraftId, setCurrentDraftId,
        
        // Loading states
        sending,
        savingDraft,
        uploadingAttachment,
        
        // AI state
        aiProcessing,
        aiActionLabel,
        showAiMenu, setShowAiMenu,
        aiLimitError, setAiLimitError,
        researchResults, setResearchResults,
        aiMenuPosition,
        
        // Attachments
        attachments, setAttachments,
        
        // Account state
        resolvedAccountId, setResolvedAccountId,
        accountError, setAccountError,
        effectiveAccountId,
        accountReady,
        
        // UI state
        isFullscreen, setIsFullscreen,
        showFontSizeMenu, setShowFontSizeMenu,
        showFontFamilyMenu, setShowFontFamilyMenu,
        showLineSpacingMenu, setShowLineSpacingMenu,
        showColorMenu, setShowColorMenu,
        showHighlightMenu, setShowHighlightMenu,
        showAdvancedColorPicker, setShowAdvancedColorPicker,
        showAdvancedHighlightPicker, setShowAdvancedHighlightPicker,
        showTemplateMenu, setShowTemplateMenu,
        showGTMTemplateMenu, setShowGTMTemplateMenu,
        showAttachmentMenu, setShowAttachmentMenu,
        showImageSizeMenu, setShowImageSizeMenu,
        showShapeMenu, setShowShapeMenu,
        
        // Colors
        selectedColor, setSelectedColor,
        selectedHighlight, setSelectedHighlight,
        
        // Refs
        aiMenuRef,
        aiButtonRef,
        fontSizeRef,
        colorRef,
        highlightRef,
        templateRef,
        attachmentRef,
        imageSizeRef,
        shapeRef,
        fileInputRef,
        imageInputRef,
        
        // Helper functions
        extractEmail,
        getEditorHtml,
        getEditorHtmlForEmail,
        getEditorText,
        setEditorContent,
        
        // Handlers
        handleImageUpload,
        handleInsertShape,
        handleFileAttachment,
        removeAttachment,
        applyTemplate,
        applyGTMTemplate,
        toggleAiMenu,
        handleAiAction,
        insertResearchIntoEmail,
        handleSend,
        handleSaveDraft,
    };
}

export default useEmailComposer;
