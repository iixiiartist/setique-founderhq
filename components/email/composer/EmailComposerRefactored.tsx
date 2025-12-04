import React, { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { Youtube } from '@tiptap/extension-youtube';
import { FontSize } from '../../../lib/tiptap/FontSize';
import { FontFamily } from '@tiptap/extension-font-family';
import ShapeNode from '../../../lib/tiptap/ShapeNode';

import { supabase } from '../../../lib/supabase';
import { useEmailComposer, EmailAttachment } from './hooks/useEmailComposer';
import { EditorToolbar } from './EditorToolbar';
import {
    ComposerFields,
    ComposerFooter,
    GTMTemplateModal,
    ResearchResultsPanel,
    AttachmentsBar,
    AccountErrorBanner
} from './ComposerParts';
import { GTM_TEMPLATES } from '../../../lib/templates/gtmTemplates';

import { X, Maximize2, Minimize2 } from 'lucide-react';

export interface EmailComposerProps {
    replyTo?: {
        id?: string;
        from_address?: string;
        to_addresses?: string[];
        subject?: string;
        body?: { text?: string; html?: string };
        snippet?: string;
        thread_id?: string;
        account_id?: string;
    };
    draftData?: {
        id?: string;
        to_addresses?: string[];
        cc_addresses?: string[];
        subject?: string;
        body?: { html?: string; text?: string; attachments?: EmailAttachment[] };
    };
    onClose: () => void;
    className?: string;
    workspaceId?: string;
    onDraftDeleted?: () => void;
    gmailAccountId?: string;
}

export function EmailComposerRefactored({
    replyTo,
    draftData,
    onClose,
    className = '',
    workspaceId,
    onDraftDeleted,
    gmailAccountId
}: EmailComposerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Initialize TipTap editor
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: { levels: [1, 2, 3] },
            }),
            Placeholder.configure({
                placeholder: 'Compose your email...',
            }),
            Underline,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline cursor-pointer',
                },
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            Color,
            TextStyle,
            FontSize,
            FontFamily,
            Highlight.configure({
                multicolor: true,
            }),
            Image.configure({
                inline: true,
                allowBase64: true,
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableCell,
            TableHeader,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Subscript,
            Superscript,
            Youtube.configure({
                inline: false,
                width: 480,
                height: 270,
            }),
            ShapeNode,
        ],
        content: '<p></p>',
        autofocus: 'end',
    });
    
    // Initialize the hook
    const hook = useEmailComposer({
        editor,
        replyTo,
        workspaceId,
        initialAttachments: draftData?.body?.attachments || [],
        onClose,
        onDraftDeleted,
    });
    
    // Set initial values
    useEffect(() => {
        if (replyTo) {
            const fromEmail = hook.extractEmail(replyTo.from_address || '');
            hook.setTo(fromEmail);
            
            const subjectLine = replyTo.subject || '';
            if (!subjectLine.toLowerCase().startsWith('re:')) {
                hook.setSubject(`Re: ${subjectLine}`);
            } else {
                hook.setSubject(subjectLine);
            }
            
            // Set reply content with quote
            const quotedContent = `
<p><br/></p>
<p>---</p>
<p><em>On ${new Date().toLocaleDateString()}, ${replyTo.from_address || 'Unknown'} wrote:</em></p>
<blockquote style="border-left: 2px solid #ccc; padding-left: 10px; color: #666;">
${replyTo.body?.html || replyTo.body?.text || replyTo.snippet || ''}
</blockquote>
`;
            setTimeout(() => {
                hook.setEditorContent(`<p></p>${quotedContent}`);
            }, 100);
        }
        
        if (draftData) {
            if (draftData.to_addresses?.length) {
                hook.setTo(draftData.to_addresses.join(', '));
            }
            if (draftData.cc_addresses?.length) {
                hook.setCc(draftData.cc_addresses.join(', '));
                hook.setShowCc(true);
            }
            if (draftData.subject) {
                hook.setSubject(draftData.subject);
            }
            if (draftData.body?.html) {
                setTimeout(() => {
                    hook.setEditorContent(draftData.body?.html || '');
                }, 100);
            }
            if (draftData.id) {
                hook.setCurrentDraftId(draftData.id);
            }
        }
    }, [replyTo, draftData]);
    
    // Fetch default account if needed
    useEffect(() => {
        if (gmailAccountId) {
            hook.setResolvedAccountId(gmailAccountId);
            return;
        }
        
        if (replyTo?.account_id) {
            return; // Will use reply's account
        }
        
        // Fetch default account
        (async () => {
            try {
                const { data: accounts, error } = await supabase
                    .from('email_accounts')
                    .select('id, email_address')
                    .eq('workspace_id', workspaceId)
                    .limit(1);
                
                if (error) throw error;
                
                if (accounts && accounts.length > 0) {
                    hook.setResolvedAccountId(accounts[0].id);
                } else {
                    hook.setAccountError('No email account connected. Go to Settings → Integrations to connect Gmail.');
                }
            } catch (err: any) {
                console.error('[EmailComposer] Account fetch error:', err);
                hook.setAccountError(`Failed to load email account: ${err.message}`);
            }
        })();
    }, [gmailAccountId, replyTo?.account_id, workspaceId]);
    
    // Click outside handlers
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            // Close AI menu
            if (hook.aiMenuRef.current && !hook.aiMenuRef.current.contains(e.target as Node) &&
                hook.aiButtonRef.current && !hook.aiButtonRef.current.contains(e.target as Node)) {
                hook.setShowAiMenu(false);
            }
            
            // Close dropdowns
            if (hook.fontSizeRef.current && !hook.fontSizeRef.current.contains(e.target as Node)) {
                hook.setShowFontSizeMenu(false);
            }
            if (hook.colorRef.current && !hook.colorRef.current.contains(e.target as Node)) {
                hook.setShowColorMenu(false);
                hook.setShowAdvancedColorPicker(false);
            }
            if (hook.highlightRef.current && !hook.highlightRef.current.contains(e.target as Node)) {
                hook.setShowHighlightMenu(false);
                hook.setShowAdvancedHighlightPicker(false);
            }
            if (hook.templateRef.current && !hook.templateRef.current.contains(e.target as Node)) {
                hook.setShowTemplateMenu(false);
            }
            if (hook.attachmentRef.current && !hook.attachmentRef.current.contains(e.target as Node)) {
                hook.setShowAttachmentMenu(false);
            }
            if (hook.imageSizeRef.current && !hook.imageSizeRef.current.contains(e.target as Node)) {
                hook.setShowImageSizeMenu(false);
            }
            if (hook.shapeRef.current && !hook.shapeRef.current.contains(e.target as Node)) {
                hook.setShowShapeMenu(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    
    // Handle file input changes
    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files?.length) {
            Array.from(files).forEach(file => hook.handleFileAttachment(file));
        }
        e.target.value = '';
    }, [hook.handleFileAttachment]);
    
    const handleImageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            hook.handleImageUpload(file);
        }
        e.target.value = '';
    }, [hook.handleImageUpload]);
    
    // Render loading state
    if (!editor) {
        return (
            <div className="flex items-center justify-center h-64">
                <span className="relative w-8 h-8 inline-block">
                    <span className="absolute inset-0 border-2 border-blue-600 animate-spin" style={{ animationDuration: '1.2s' }} />
                    <span className="absolute inset-0.5 border border-blue-400 animate-spin" style={{ animationDuration: '0.8s', animationDirection: 'reverse' }} />
                </span>
            </div>
        );
    }
    
    const containerClasses = hook.isFullscreen
        ? 'fixed inset-0 z-50 bg-white flex flex-col'
        : `bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col max-h-[90vh] ${className}`;
    
    // AI action icons mapping
    const aiIconMap: Record<string, React.ReactNode> = {
        draft: <span>✏️</span>,
        improve: <span>✨</span>,
        shorten: <span>📝</span>,
        expand: <span>📄</span>,
        formal: <span>👔</span>,
        friendly: <span>😊</span>,
        research: <span>🔍</span>,
        suggest: <span>💡</span>,
    };
    
    const AI_ACTIONS = [
        { action: 'draft', label: 'Draft Reply' },
        { action: 'improve', label: 'Improve Writing' },
        { action: 'shorten', label: 'Make Shorter' },
        { action: 'expand', label: 'Expand' },
        { action: 'formal', label: 'More Formal' },
        { action: 'friendly', label: 'More Friendly' },
        { action: 'research', label: 'Research Topic' },
        { action: 'suggest', label: 'Suggest Points' },
    ];
    
    return (
        <div ref={containerRef} className={containerClasses}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
                <h3 className="font-semibold text-gray-900">
                    {replyTo ? 'Reply' : draftData ? 'Edit Draft' : 'New Email'}
                </h3>
                <div className="flex items-center gap-2">
                    {/* AI Assist Button - in header for consistent positioning */}
                    <div className="relative" ref={hook.aiButtonRef}>
                        <button
                            type="button"
                            onClick={hook.toggleAiMenu}
                            disabled={hook.aiProcessing}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white rounded-lg hover:bg-black transition-all text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {hook.aiProcessing ? (
                                <>
                                    <span className="animate-spin">⟳</span>
                                    <span>{hook.aiActionLabel}</span>
                                </>
                            ) : (
                                <>
                                    <span>✨</span>
                                    <span>AI Assist</span>
                                    <span className="text-gray-400">▼</span>
                                </>
                            )}
                        </button>
                        
                        {/* AI Menu Dropdown */}
                        {hook.showAiMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl w-48 py-1 overflow-hidden z-[100]">
                                <div className="py-0.5 max-h-64 overflow-y-auto">
                                    {AI_ACTIONS.map((action) => (
                                        <button
                                            key={action.action}
                                            onClick={() => {
                                                hook.handleAiAction(action.action);
                                                hook.setShowAiMenu(false);
                                            }}
                                            className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-50 transition-colors"
                                        >
                                            <span className="text-gray-500 flex-shrink-0">
                                                {aiIconMap[action.action]}
                                            </span>
                                            <span className="text-sm text-gray-900">
                                                {action.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <button
                        onClick={() => hook.setIsFullscreen(!hook.isFullscreen)}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                        title={hook.isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    >
                        {hook.isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-500 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>
            
            {/* Account Error Warning */}
            <AccountErrorBanner error={hook.accountError} />
            
            {/* Form Fields */}
            <ComposerFields
                to={hook.to}
                setTo={hook.setTo}
                cc={hook.cc}
                setCc={hook.setCc}
                subject={hook.subject}
                setSubject={hook.setSubject}
                showCc={hook.showCc}
                setShowCc={hook.setShowCc}
            />
            
            {/* Toolbar */}
            <EditorToolbar
                editor={editor}
                showFontSizeMenu={hook.showFontSizeMenu}
                setShowFontSizeMenu={hook.setShowFontSizeMenu}
                fontSizeRef={hook.fontSizeRef}
                showAdvancedColorPicker={hook.showAdvancedColorPicker}
                setShowAdvancedColorPicker={hook.setShowAdvancedColorPicker}
                selectedColor={hook.selectedColor}
                setSelectedColor={hook.setSelectedColor}
                colorRef={hook.colorRef}
                showAdvancedHighlightPicker={hook.showAdvancedHighlightPicker}
                setShowAdvancedHighlightPicker={hook.setShowAdvancedHighlightPicker}
                selectedHighlight={hook.selectedHighlight}
                setSelectedHighlight={hook.setSelectedHighlight}
                highlightRef={hook.highlightRef}
                imageInputRef={hook.imageInputRef}
                showImageSizeMenu={hook.showImageSizeMenu}
                setShowImageSizeMenu={hook.setShowImageSizeMenu}
                imageSizeRef={hook.imageSizeRef}
                showShapeMenu={hook.showShapeMenu}
                setShowShapeMenu={hook.setShowShapeMenu}
                shapeRef={hook.shapeRef}
                handleInsertShape={hook.handleInsertShape}
                attachments={hook.attachments}
                showAttachmentMenu={hook.showAttachmentMenu}
                setShowAttachmentMenu={hook.setShowAttachmentMenu}
                attachmentRef={hook.attachmentRef}
                fileInputRef={hook.fileInputRef}
                uploadingAttachment={hook.uploadingAttachment}
                removeAttachment={hook.removeAttachment}
                showTemplateMenu={hook.showTemplateMenu}
                setShowTemplateMenu={hook.setShowTemplateMenu}
                templateRef={hook.templateRef}
                applyTemplate={hook.applyTemplate}
                emailTemplates={[]}
                setShowGTMTemplateMenu={hook.setShowGTMTemplateMenu}
            />
            
            {/* Editor */}
            <div className={`overflow-auto flex-1 ${hook.isFullscreen ? 'min-h-[300px]' : 'min-h-[200px]'}`}>
                <EditorContent
                    editor={editor}
                    className="prose max-w-none p-4 min-h-full focus:outline-none [&_.ProseMirror]:min-h-full [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-gray-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
                />
            </div>
            
            {/* Attachments Bar */}
            {hook.attachments.length > 0 && (
                <AttachmentsBar
                    attachments={hook.attachments}
                    onRemove={hook.removeAttachment}
                />
            )}
            
            {/* Research Panel */}
            {hook.researchResults && (
                <ResearchResultsPanel
                    results={hook.researchResults}
                    onInsert={hook.insertResearchIntoEmail}
                    onDismiss={() => hook.setResearchResults(null)}
                />
            )}
            
            {/* Footer */}
            <ComposerFooter
                isInline={false}
                characterCount={editor?.storage.characterCount?.characters() || 0}
                attachmentCount={hook.attachments.length}
                sending={hook.sending}
                savingDraft={hook.savingDraft}
                accountReady={hook.accountReady}
                toEmpty={!hook.to.trim()}
                onCancel={onClose}
                onSaveDraft={hook.handleSaveDraft}
                onSend={hook.handleSend}
            />
            
            {/* GTM Template Modal */}
            {hook.showGTMTemplateMenu && (
                <GTMTemplateModal
                    isOpen={hook.showGTMTemplateMenu}
                    onClose={() => hook.setShowGTMTemplateMenu(false)}
                    templates={GTM_TEMPLATES}
                    onApplyTemplate={hook.applyGTMTemplate}
                />
            )}
            
            {/* Hidden File Inputs */}
            <input
                ref={hook.fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileInputChange}
                multiple
            />
            <input
                ref={hook.imageInputRef}
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleImageInputChange}
            />
        </div>
    );
}

export default EmailComposerRefactored;
