import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Underline } from '@tiptap/extension-underline';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Link } from '@tiptap/extension-link';
import { FontFamily } from '@tiptap/extension-font-family';
import { Typography } from '@tiptap/extension-typography';
import { CharacterCount } from '@tiptap/extension-character-count';
import { Focus } from '@tiptap/extension-focus';
import { Youtube } from '@tiptap/extension-youtube';
import { ResizableImage } from '../../lib/tiptap/ResizableImage';
import { FontSize } from '../../lib/tiptap/FontSize';
import { PageBreak } from '../../lib/tiptap/PageBreak';
import ChartNode from '../../lib/tiptap/ChartNode';
import { HexColorPicker } from 'react-colorful';
import EmojiPicker from 'emoji-picker-react';
import { GTMDoc, DocType, DocVisibility, AppActions, DashboardData } from '../../types';
import { DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '../../constants';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { AICommandPalette } from './AICommandPalette';
import { ImageUploadModal } from './ImageUploadModal';
import { ChartQuickInsert } from './ChartQuickInsert';
import { useAIWorkspaceContext } from '../../hooks/useAIWorkspaceContext';
import { uploadToSupabase, validateImageFile } from '../../lib/services/imageUploadService';
import { exportToMarkdown, exportToPDF, exportToHTML, exportToText, generateFilename } from '../../lib/services/documentExport';
import { GTM_TEMPLATES, type DocumentTemplate } from '../../lib/templates/gtmTemplates';

interface DocEditorProps {
    workspaceId: string;
    userId: string;
    docId?: string; // undefined for new doc
    onClose: () => void;
    onSave: (doc: GTMDoc) => void;
    onReloadList?: () => void; // Callback to reload docs list in sidebar
    actions: AppActions;
    data: DashboardData;
    onUpgradeNeeded?: () => void;
}

export const DocEditor: React.FC<DocEditorProps> = ({
    workspaceId,
    userId,
    docId,
    onClose,
    onSave,
    onReloadList,
    actions,
    data,
    onUpgradeNeeded,
}) => {
    const { workspace } = useWorkspace();
    const [title, setTitle] = useState('Untitled Document');
    const [docType, setDocType] = useState<DocType>('brief');
    const [visibility, setVisibility] = useState<DocVisibility>('team');
    const [tags, setTags] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(!!docId);
    
    // AI Command Palette state
    const [showAICommandPalette, setShowAICommandPalette] = useState(false);
    const [aiPalettePosition, setAIPalettePosition] = useState({ top: 0, left: 0 });
    
    // Toolbar state
    const [showToolbarMenu, setShowToolbarMenu] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const [showLinkInput, setShowLinkInput] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [showImageUploadModal, setShowImageUploadModal] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [showTemplateMenu, setShowTemplateMenu] = useState(false);
    const [showAdvancedColorPicker, setShowAdvancedColorPicker] = useState(false);
    const [showAdvancedHighlightPicker, setShowAdvancedHighlightPicker] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [selectedHighlight, setSelectedHighlight] = useState('#FFFF00');
    const [showChartQuickInsert, setShowChartQuickInsert] = useState(false);
    
    // Ref for toolbar menu to detect clicks outside
    const toolbarMenuRef = useRef<HTMLDivElement>(null);
    
    // Fetch workspace context for AI
    const { context: workspaceContext, loading: contextLoading } = useAIWorkspaceContext(
        docId,
        workspaceId,
        userId
    );

    // Initialize Tiptap editor with premium extensions
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Start writing your document...',
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            Underline,
            Subscript,
            Superscript,
            TaskList,
            TaskItem.configure({
                nested: true,
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableCell,
            TableHeader,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-blue-600 underline hover:text-blue-800',
                },
            }),
            ResizableImage.configure({
                inline: false,
                allowBase64: false,
                enableResize: true,
                defaultAlignment: 'center',
            }),
            FontFamily.configure({
                types: ['textStyle'],
            }),
            FontSize.configure({
                types: ['textStyle'],
            }),
            PageBreak,
            Typography,
            CharacterCount,
            Focus.configure({
                className: 'has-focus',
                mode: 'all',
            }),
            Youtube.configure({
                controls: true,
                nocookie: true,
            }),
            ChartNode,
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-full p-4',
            },
            handleKeyDown: (view, event) => {
                // Cmd+K or Ctrl+K to open AI command palette
                if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                    event.preventDefault();
                    const coords = view.coordsAtPos(view.state.selection.from);
                    setAIPalettePosition({ 
                        top: coords.top + window.scrollY + 30, 
                        left: coords.left + window.scrollX 
                    });
                    setShowAICommandPalette(true);
                    return true;
                }
                return false;
            },
            handlePaste: (view, event) => {
                // Handle pasted images
                const items = event.clipboardData?.items;
                if (!items) return false;

                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.indexOf('image') !== -1) {
                        event.preventDefault();
                        const file = items[i].getAsFile();
                        if (file) {
                            // Upload and insert the pasted image
                            handlePastedImage(file);
                        }
                        return true;
                    }
                }
                return false;
            },
        },
    });

    useEffect(() => {
        if (docId) {
            loadDoc();
        }
    }, [docId]);

    // Close toolbar menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showToolbarMenu && toolbarMenuRef.current && !toolbarMenuRef.current.contains(event.target as Node)) {
                setShowToolbarMenu(false);
            }
        };

        if (showToolbarMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showToolbarMenu]);

    const loadDoc = async () => {
        setIsLoading(true);
        try {
            const { DatabaseService } = await import('../../lib/services/database');
            const { data, error } = await DatabaseService.loadGTMDocById(docId!);
            
            if (error) {
                console.error('Error loading doc:', error);
            } else if (data) {
                setTitle(data.title);
                setDocType(data.docType as DocType);
                setVisibility(data.visibility as DocVisibility);
                setTags(data.tags);
                
                // Load content into Tiptap editor
                if (editor && data.contentJson) {
                    editor.commands.setContent(data.contentJson);
                } else if (editor && data.contentPlain) {
                    // Fallback to plain text if no JSON
                    editor.commands.setContent(data.contentPlain);
                }
            }
        } catch (error) {
            console.error('Error loading doc:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePastedImage = async (file: File) => {
        if (!editor) return;

        try {
            // Validate the file
            const validation = validateImageFile(file);
            if (validation !== true) {
                alert(validation.error);
                return;
            }

            // Upload to Supabase
            const result = await uploadToSupabase(file, workspaceId, docId);

            // Insert image into editor at current cursor position
            editor.chain().focus().setResizableImage({ 
                src: result.url,
                alt: `Pasted image ${new Date().toISOString()}`
            }).run();

        } catch (error: any) {
            console.error('Paste image error:', error);
            alert(`Failed to upload pasted image: ${error.message || 'Unknown error'}`);
        }
    };

    const handleExport = async (format: 'markdown' | 'pdf' | 'html' | 'text') => {
        if (!editor) return;

        try {
            const filename = generateFilename(title || 'document', format === 'markdown' ? 'md' : format);

            switch (format) {
                case 'markdown':
                    exportToMarkdown(editor, filename);
                    break;
                case 'pdf':
                    await exportToPDF(editor, title || 'Document', filename);
                    break;
                case 'html':
                    exportToHTML(editor, filename);
                    break;
                case 'text':
                    exportToText(editor, filename);
                    break;
            }
        } catch (error: any) {
            console.error('Export error:', error);
            alert(`Failed to export document: ${error.message || 'Unknown error'}`);
        }
    };

    const handleApplyTemplate = (template: DocumentTemplate) => {
        if (!editor) return;
        
        // Confirm if document has content
        const currentContent = editor.getText().trim();
        if (currentContent.length > 0) {
            const confirmed = window.confirm(
                `Applying a template will replace all current content.\n\nTemplate: ${template.name}\n\nAre you sure you want to continue?`
            );
            if (!confirmed) {
                setShowTemplateMenu(false);
                return;
            }
        }
        
        // Apply template content
        editor.commands.setContent(template.content);
        
        // Update document title if it's still "Untitled Document"
        if (title === 'Untitled Document') {
            setTitle(template.name);
        }
        
        // Close menu
        setShowTemplateMenu(false);
        
        // Focus editor
        editor.commands.focus();
    };

    const handleSendToAI = () => {
        if (!editor) return;
        
        const contentText = editor.getText();
        const docInfo = `Document: ${title}\nType: ${DOC_TYPE_LABELS[docType]}\nVisibility: ${visibility}\n\n${contentText}`;
        
        // Copy to clipboard
        navigator.clipboard.writeText(docInfo).then(() => {
            alert('Document content copied to clipboard!\n\nNow:\n1. Click the AI Assistant button (💬) at the bottom right\n2. Paste the content into the chat\n3. Ask the AI to help with your GTM document');
        }).catch(err => {
            console.error('Failed to copy:', err);
            alert('Unable to copy to clipboard. Please select and copy the document content manually.');
        });
    };

    const handleSave = async () => {
        if (!editor) return;
        
        setIsSaving(true);
        try {
            const { DatabaseService } = await import('../../lib/services/database');
            
            // Extract content from editor
            const contentJson = editor.getJSON();
            const contentPlain = editor.getText();
            
            if (docId) {
                // Update existing doc
                const { data, error } = await DatabaseService.updateGTMDoc(docId, {
                    title,
                    docType,
                    visibility,
                    contentJson,
                    contentPlain,
                    tags
                });
                
                if (error) {
                    console.error('Error updating doc:', error);
                } else if (data) {
                    onSave(data as GTMDoc);
                }
            } else {
                // Create new doc
                const { data, error } = await DatabaseService.createGTMDoc({
                    workspaceId,
                    userId,
                    title,
                    docType,
                    visibility,
                    contentJson,
                    contentPlain,
                    tags
                });
                
                if (error) {
                    console.error('Error creating doc:', error);
                } else if (data) {
                    onSave(data as GTMDoc);
                }
            }
        } catch (error) {
            console.error('Error saving doc:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveToFileLibrary = async () => {
        if (!editor) {
            alert('Editor not ready');
            return;
        }

        const confirmed = window.confirm(
            'Save this document to the File Library? This will create an HTML version that can be shared and attached to tasks.'
        );
        
        if (!confirmed) return;

        try {
            const { DatabaseService } = await import('../../lib/services/database');
            
            // Get the HTML content
            const htmlContent = editor.getHTML();
            
            // Create a document entry in the file library
            const { data, error } = await DatabaseService.createDocument(userId, workspaceId, {
                name: `${title}.html`,
                module: 'workspace', // GTM Docs workspace
                mime_type: 'text/html',
                content: htmlContent,
                notes: {
                    gtmDocId: docId || null,
                    docType: docType,
                    tags: tags,
                    source: 'gtm_docs'
                }
            });

            if (error) {
                console.error('Error saving to file library:', error);
                alert('Failed to save to file library: ' + error.message);
            } else {
                alert('✅ Document saved to File Library!');
                // Reload the docs list to show the new file
                onReloadList?.();
            }
        } catch (error) {
            console.error('Error saving to file library:', error);
            alert('Failed to save to file library');
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center">
                <p className="text-gray-500">Loading document...</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-2 lg:p-4 border-b-2 border-black bg-white flex flex-col lg:flex-row items-stretch lg:items-center gap-2 lg:gap-0 lg:justify-between">
                <div className="flex items-center gap-2 lg:gap-3 flex-1">
                    <button
                        onClick={onClose}
                        className="px-2 lg:px-3 py-1 text-sm lg:text-base bg-white border-2 border-black font-bold hover:bg-gray-100 transition-colors min-w-[60px]"
                        aria-label="Close editor"
                    >
                        ← Back
                    </button>
                    <input
                        type="text"
                        id="doc-title-input"
                        name="docTitle"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="flex-1 px-2 lg:px-3 py-1 lg:py-2 text-base lg:text-xl font-bold border-2 border-black"
                        placeholder="Document title..."
                        aria-label="Document title"
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="lg:ml-3 px-4 lg:px-6 py-2 min-h-[44px] bg-yellow-400 text-black font-bold border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={isSaving ? 'Saving...' : 'Save document'}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Editor Area */}
                <div className="flex-1 overflow-y-auto flex flex-col">
                    {/* Hamburger Toolbar Menu */}
                    {editor && (
                        <div className="sticky top-0 z-10 bg-white border-b-2 border-black p-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div className="relative" ref={toolbarMenuRef}>
                                    <button 
                                        onClick={() => setShowToolbarMenu(!showToolbarMenu)}
                                        className="px-4 py-2 text-sm font-bold border-2 border-black bg-white hover:bg-yellow-300 flex items-center gap-2"
                                        title="Formatting Tools"
                                    >
                                        <span className="text-lg">☰</span>
                                        <span>Format</span>
                                    </button>
                                    
                                    {showToolbarMenu && (
                                        <div className="absolute top-full mt-1 left-0 bg-white border-2 border-black shadow-lg z-30 min-w-[280px] max-h-[70vh] overflow-y-auto">
                                            {/* Font Family Section */}
                                            <div className="border-b-2 border-black p-2">
                                                <div className="text-xs font-bold mb-2 text-gray-600">FONT FAMILY</div>
                                                <select
                                                    id="font-family-select"
                                                    name="fontFamily"
                                                    onChange={(e) => {
                                                        if (e.target.value === 'unset') {
                                                            editor.chain().focus().unsetFontFamily().run();
                                                        } else {
                                                            editor.chain().focus().setFontFamily(e.target.value).run();
                                                        }
                                                    }}
                                                    className="w-full px-2 py-2 text-sm border-2 border-black font-bold"
                                                    value={editor.getAttributes('textStyle').fontFamily || ''}
                                                    aria-label="Select font family"
                                                >
                                                    <option value="">Default (Inter)</option>
                                                    <option value="unset">Remove Font</option>
                                                    <option value="Arial, sans-serif" style={{ fontFamily: 'Arial, sans-serif' }}>Arial</option>
                                                    <option value="'Times New Roman', serif" style={{ fontFamily: 'Times New Roman, serif' }}>Times New Roman</option>
                                                    <option value="Georgia, serif" style={{ fontFamily: 'Georgia, serif' }}>Georgia</option>
                                                    <option value="'Courier New', monospace" style={{ fontFamily: 'Courier New, monospace' }}>Courier New</option>
                                                    <option value="Verdana, sans-serif" style={{ fontFamily: 'Verdana, sans-serif' }}>Verdana</option>
                                                    <option value="Helvetica, sans-serif" style={{ fontFamily: 'Helvetica, sans-serif' }}>Helvetica</option>
                                                    <option value="'Comic Sans MS', cursive" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Comic Sans</option>
                                                    <option value="Impact, sans-serif" style={{ fontFamily: 'Impact, sans-serif' }}>Impact</option>
                                                    <option value="'Trebuchet MS', sans-serif" style={{ fontFamily: 'Trebuchet MS, sans-serif' }}>Trebuchet</option>
                                                    <option value="'Palatino Linotype', serif" style={{ fontFamily: 'Palatino Linotype, serif' }}>Palatino</option>
                                                    <option value="Garamond, serif" style={{ fontFamily: 'Garamond, serif' }}>Garamond</option>
                                                    <option value="'Brush Script MT', cursive" style={{ fontFamily: 'Brush Script MT, cursive' }}>Brush Script</option>
                                                </select>
                                            </div>

                                            {/* Font Size Section */}
                                            <div className="border-b-2 border-black p-2">
                                                <div className="text-xs font-bold mb-2 text-gray-600">FONT SIZE</div>
                                                <select
                                                    id="font-size-select"
                                                    name="fontSize"
                                                    onChange={(e) => {
                                                        if (e.target.value === 'unset') {
                                                            editor.chain().focus().unsetFontSize().run();
                                                        } else {
                                                            editor.chain().focus().setFontSize(e.target.value).run();
                                                        }
                                                    }}
                                                    className="w-full px-2 py-2 text-sm border-2 border-black font-bold"
                                                    value={editor.getAttributes('textStyle').fontSize || ''}
                                                    aria-label="Select font size"
                                                >
                                                    <option value="">Default (16px)</option>
                                                    <option value="unset">Remove Size</option>
                                                    <option value="10px">Tiny (10px)</option>
                                                    <option value="12px">Small (12px)</option>
                                                    <option value="14px">Normal (14px)</option>
                                                    <option value="16px">Medium (16px)</option>
                                                    <option value="18px">Large (18px)</option>
                                                    <option value="20px">XL (20px)</option>
                                                    <option value="24px">XXL (24px)</option>
                                                    <option value="28px">Huge (28px)</option>
                                                    <option value="32px">Massive (32px)</option>
                                                    <option value="36px">Giant (36px)</option>
                                                    <option value="48px">Gigantic (48px)</option>
                                                    <option value="64px">Colossal (64px)</option>
                                                </select>
                                            </div>

                                            {/* Text Formatting Section */}
                                            <div className="border-b-2 border-black p-2">
                                                <div className="text-xs font-bold mb-2 text-gray-600">TEXT FORMATTING</div>
                                                <div className="grid grid-cols-4 gap-1">
                                                    <button onClick={() => { editor.chain().focus().toggleBold().run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive('bold') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Bold"><strong>B</strong></button>
                                                    <button onClick={() => { editor.chain().focus().toggleItalic().run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive('italic') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Italic"><em>I</em></button>
                                                    <button onClick={() => { editor.chain().focus().toggleUnderline().run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive('underline') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Underline"><u>U</u></button>
                                                    <button onClick={() => { editor.chain().focus().toggleStrike().run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive('strike') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Strikethrough"><s>S</s></button>
                                                    <button onClick={() => { editor.chain().focus().toggleSubscript().run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive('subscript') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Subscript">X₂</button>
                                                    <button onClick={() => { editor.chain().focus().toggleSuperscript().run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive('superscript') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Superscript">X²</button>
                                                </div>
                                            </div>
                                            
                                            {/* Colors Section - Advanced Color Picker */}
                                            <div className="border-b-2 border-black p-2">
                                                <div className="text-xs font-bold mb-2 text-gray-600">COLORS</div>
                                                
                                                {/* Text Color Picker */}
                                                <div className="mb-3">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium">Text Color</span>
                                                        <button 
                                                            onClick={() => setShowAdvancedColorPicker(!showAdvancedColorPicker)}
                                                            className="flex items-center gap-2 px-3 py-1 text-xs font-bold border-2 border-black bg-white hover:bg-gray-100"
                                                        >
                                                            <div 
                                                                className="w-5 h-5 border-2 border-black" 
                                                                style={{ backgroundColor: selectedColor }}
                                                            />
                                                            {showAdvancedColorPicker ? 'Close' : 'Pick Color'}
                                                        </button>
                                                    </div>
                                                    {showAdvancedColorPicker && (
                                                        <div className="mb-2">
                                                            <HexColorPicker 
                                                                color={selectedColor} 
                                                                onChange={(color) => {
                                                                    setSelectedColor(color);
                                                                    editor.chain().focus().setColor(color).run();
                                                                }}
                                                                style={{ width: '100%', height: '150px' }}
                                                            />
                                                            <input
                                                                type="text"
                                                                id="text-color-hex"
                                                                name="textColorHex"
                                                                value={selectedColor}
                                                                onChange={(e) => {
                                                                    setSelectedColor(e.target.value);
                                                                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                                                                        editor.chain().focus().setColor(e.target.value).run();
                                                                    }
                                                                }}
                                                                className="w-full mt-2 px-2 py-1 text-sm border-2 border-black font-mono"
                                                                placeholder="#000000"
                                                                aria-label="Text color hex code"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex gap-1">
                                                        <button 
                                                            onClick={() => editor.chain().focus().unsetColor().run()}
                                                            className="flex-1 px-2 py-1 text-xs font-bold border-2 border-black bg-white hover:bg-gray-100"
                                                        >
                                                            Clear Color
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Highlight Color Picker */}
                                                <div>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-medium">Highlight</span>
                                                        <button 
                                                            onClick={() => setShowAdvancedHighlightPicker(!showAdvancedHighlightPicker)}
                                                            className="flex items-center gap-2 px-3 py-1 text-xs font-bold border-2 border-black bg-white hover:bg-gray-100"
                                                        >
                                                            <div 
                                                                className="w-5 h-5 border-2 border-black" 
                                                                style={{ backgroundColor: selectedHighlight }}
                                                            />
                                                            {showAdvancedHighlightPicker ? 'Close' : 'Pick Color'}
                                                        </button>
                                                    </div>
                                                    {showAdvancedHighlightPicker && (
                                                        <div className="mb-2">
                                                            <HexColorPicker 
                                                                color={selectedHighlight} 
                                                                onChange={(color) => {
                                                                    setSelectedHighlight(color);
                                                                    editor.chain().focus().toggleHighlight({ color }).run();
                                                                }}
                                                                style={{ width: '100%', height: '150px' }}
                                                            />
                                                            <input
                                                                type="text"
                                                                id="highlight-color-hex"
                                                                name="highlightColorHex"
                                                                value={selectedHighlight}
                                                                onChange={(e) => {
                                                                    setSelectedHighlight(e.target.value);
                                                                    if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                                                                        editor.chain().focus().toggleHighlight({ color: e.target.value }).run();
                                                                    }
                                                                }}
                                                                className="w-full mt-2 px-2 py-1 text-sm border-2 border-black font-mono"
                                                                placeholder="#FFFF00"
                                                                aria-label="Highlight color hex code"
                                                            />
                                                        </div>
                                                    )}
                                                    <div className="flex gap-1">
                                                        <button 
                                                            onClick={() => editor.chain().focus().unsetHighlight().run()}
                                                            className="flex-1 px-2 py-1 text-xs font-bold border-2 border-black bg-white hover:bg-gray-100"
                                                        >
                                                            Clear Highlight
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Headings Section */}
                                            <div className="border-b-2 border-black p-2">
                                                <div className="text-xs font-bold mb-2 text-gray-600">HEADINGS</div>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => { editor.chain().focus().toggleHeading({ level: 1 }).run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-left font-bold border-2 border-black ${editor.isActive('heading', { level: 1 }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`}>Heading 1</button>
                                                    <button onClick={() => { editor.chain().focus().toggleHeading({ level: 2 }).run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-left font-bold border-2 border-black ${editor.isActive('heading', { level: 2 }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`}>Heading 2</button>
                                                    <button onClick={() => { editor.chain().focus().toggleHeading({ level: 3 }).run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-left font-bold border-2 border-black ${editor.isActive('heading', { level: 3 }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`}>Heading 3</button>
                                                </div>
                                            </div>
                                            
                                            {/* Alignment Section */}
                                            <div className="border-b-2 border-black p-2">
                                                <div className="text-xs font-bold mb-2 text-gray-600">ALIGNMENT</div>
                                                <div className="grid grid-cols-4 gap-1">
                                                    <button onClick={() => { 
                                                        if (editor.isActive('resizableImage')) {
                                                            editor.chain().focus().updateAttributes('resizableImage', { alignment: 'left' }).run();
                                                        } else {
                                                            editor.chain().focus().setTextAlign('left').run();
                                                        }
                                                        setShowToolbarMenu(false);
                                                    }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive({ textAlign: 'left' }) || editor.isActive('resizableImage', { alignment: 'left' }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Left">⬅</button>
                                                    <button onClick={() => { 
                                                        if (editor.isActive('resizableImage')) {
                                                            editor.chain().focus().updateAttributes('resizableImage', { alignment: 'center' }).run();
                                                        } else {
                                                            editor.chain().focus().setTextAlign('center').run();
                                                        }
                                                        setShowToolbarMenu(false);
                                                    }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive({ textAlign: 'center' }) || editor.isActive('resizableImage', { alignment: 'center' }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Center">↔</button>
                                                    <button onClick={() => { 
                                                        if (editor.isActive('resizableImage')) {
                                                            editor.chain().focus().updateAttributes('resizableImage', { alignment: 'right' }).run();
                                                        } else {
                                                            editor.chain().focus().setTextAlign('right').run();
                                                        }
                                                        setShowToolbarMenu(false);
                                                    }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive({ textAlign: 'right' }) || editor.isActive('resizableImage', { alignment: 'right' }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Right">➡</button>
                                                    <button onClick={() => { editor.chain().focus().setTextAlign('justify').run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive({ textAlign: 'justify' }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Justify" disabled={editor.isActive('resizableImage')}>≡</button>
                                                </div>
                                            </div>
                                            
                                            {/* Lists Section */}
                                            <div className="border-b-2 border-black p-2">
                                                <div className="text-xs font-bold mb-2 text-gray-600">LISTS</div>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => { editor.chain().focus().toggleBulletList().run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-left font-bold border-2 border-black ${editor.isActive('bulletList') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`}>• Bullet List</button>
                                                    <button onClick={() => { editor.chain().focus().toggleOrderedList().run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-left font-bold border-2 border-black ${editor.isActive('orderedList') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`}>1. Numbered List</button>
                                                    <button onClick={() => { editor.chain().focus().toggleTaskList().run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-left font-bold border-2 border-black ${editor.isActive('taskList') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`}>☑ Task List</button>
                                                </div>
                                            </div>
                                            
                                            {/* Blocks Section */}
                                            <div className="border-b-2 border-black p-2">
                                                <div className="text-xs font-bold mb-2 text-gray-600">BLOCKS</div>
                                                <div className="flex flex-col gap-1">
                                                    <button onClick={() => { editor.chain().focus().toggleBlockquote().run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-left font-bold border-2 border-black ${editor.isActive('blockquote') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`}>" Quote</button>
                                                    <button onClick={() => { editor.chain().focus().toggleCodeBlock().run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-left font-bold border-2 border-black ${editor.isActive('codeBlock') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`}>{'</>'} Code Block</button>
                                                    <button onClick={() => { editor.chain().focus().setHorizontalRule().run(); setShowToolbarMenu(false); }} className="px-3 py-2 text-left font-bold border-2 border-black bg-white hover:bg-gray-100">─ Horizontal Rule</button>
                                                    <button 
                                                        onClick={() => { editor.chain().focus().setPageBreak().run(); setShowToolbarMenu(false); }} 
                                                        className="px-3 py-2 text-left font-bold border-2 border-black bg-white hover:bg-gray-100"
                                                        title="Insert Page Break (Cmd/Ctrl+Enter)"
                                                    >
                                                        ⊟ Page Break
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            {/* Table Section */}
                                            <div className="border-b-2 border-black p-2">
                                                <div className="text-xs font-bold mb-2 text-gray-600">TABLE</div>
                                                <button onClick={() => { editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); setShowToolbarMenu(false); }} className="w-full px-3 py-2 text-left font-bold border-2 border-black bg-white hover:bg-gray-100 mb-1">⊞ Insert Table</button>
                                                {editor.isActive('table') && (
                                                    <div className="flex flex-col gap-1">
                                                        <button onClick={() => { editor.chain().focus().addColumnBefore().run(); setShowToolbarMenu(false); }} className="px-3 py-2 text-left text-xs border-2 border-black bg-white hover:bg-gray-100">+Col Before</button>
                                                        <button onClick={() => { editor.chain().focus().addColumnAfter().run(); setShowToolbarMenu(false); }} className="px-3 py-2 text-left text-xs border-2 border-black bg-white hover:bg-gray-100">+Col After</button>
                                                        <button onClick={() => { editor.chain().focus().deleteColumn().run(); setShowToolbarMenu(false); }} className="px-3 py-2 text-left text-xs border-2 border-black bg-red-100 hover:bg-red-200">-Delete Column</button>
                                                        <button onClick={() => { editor.chain().focus().addRowBefore().run(); setShowToolbarMenu(false); }} className="px-3 py-2 text-left text-xs border-2 border-black bg-white hover:bg-gray-100">+Row Above</button>
                                                        <button onClick={() => { editor.chain().focus().addRowAfter().run(); setShowToolbarMenu(false); }} className="px-3 py-2 text-left text-xs border-2 border-black bg-white hover:bg-gray-100">+Row Below</button>
                                                        <button onClick={() => { editor.chain().focus().deleteRow().run(); setShowToolbarMenu(false); }} className="px-3 py-2 text-left text-xs border-2 border-black bg-red-100 hover:bg-red-200">-Delete Row</button>
                                                        <button onClick={() => { editor.chain().focus().deleteTable().run(); setShowToolbarMenu(false); }} className="px-3 py-2 text-left text-xs border-2 border-black bg-red-200 hover:bg-red-300">✕ Delete Table</button>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {/* Charts & Graphs Section */}
                                            <div className="border-b-2 border-black p-2">
                                                <div className="text-xs font-bold mb-2 text-gray-600">CHARTS & GRAPHS</div>
                                                <button 
                                                    onClick={() => {
                                                        setShowChartQuickInsert(true);
                                                        setShowToolbarMenu(false);
                                                    }} 
                                                    className="w-full px-3 py-2 text-left font-bold border-2 border-black bg-blue-50 hover:bg-blue-100"
                                                >
                                                    📊 Insert Chart with Template
                                                </button>
                                            </div>
                                            
                                            {/* Media Section */}
                                            <div className="border-b-2 border-black p-2">
                                                <div className="text-xs font-bold mb-2 text-gray-600">MEDIA & INSERT</div>
                                                <div className="flex flex-col gap-1">
                                                    {/* Emoji Picker */}
                                                    <button 
                                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                                        className="px-3 py-2 text-left font-bold border-2 border-black bg-white hover:bg-gray-100"
                                                    >
                                                        😀 {showEmojiPicker ? 'Close Emoji Picker' : 'Insert Emoji'}
                                                    </button>
                                                    {showEmojiPicker && (
                                                        <div className="mb-2">
                                                            <EmojiPicker
                                                                onEmojiClick={(emojiObject) => {
                                                                    editor.chain().focus().insertContent(emojiObject.emoji).run();
                                                                    setShowEmojiPicker(false);
                                                                }}
                                                                width="100%"
                                                                height="300px"
                                                                searchDisabled={false}
                                                                skinTonesDisabled={false}
                                                                previewConfig={{ showPreview: false }}
                                                            />
                                                        </div>
                                                    )}
                                                    
                                                    <button onClick={() => {
                                                        if (editor.isActive('link')) {
                                                            editor.chain().focus().unsetLink().run();
                                                            setShowToolbarMenu(false);
                                                        } else {
                                                            setShowLinkInput(true);
                                                            setLinkUrl(editor.getAttributes('link').href || '');
                                                        }
                                                    }} className={`px-3 py-2 text-left font-bold border-2 border-black ${editor.isActive('link') ? 'bg-blue-200' : 'bg-white hover:bg-gray-100'}`}>🔗 {editor.isActive('link') ? 'Remove Link' : 'Add Link'}</button>
                                                    {showLinkInput && (
                                                        <div className="p-2 bg-gray-50 border-2 border-black">
                                                            <input type="url" id="link-url-input" name="linkUrl" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="w-full px-2 py-1 border-2 border-black text-sm mb-1" aria-label="Link URL" />
                                                            <div className="flex gap-1">
                                                                <button onClick={() => { if (linkUrl) { editor.chain().focus().setLink({ href: linkUrl }).run(); } setShowLinkInput(false); setLinkUrl(''); setShowToolbarMenu(false); }} className="flex-1 px-2 py-1 bg-green-500 text-white font-bold border-2 border-black text-xs">✓ Add</button>
                                                                <button onClick={() => { setShowLinkInput(false); setLinkUrl(''); }} className="flex-1 px-2 py-1 bg-red-500 text-white font-bold border-2 border-black text-xs">✕ Cancel</button>
                                                            </div>
                                                        </div>
                                                    )}
                                                    <button onClick={() => {
                                                        setShowImageUploadModal(true);
                                                        setShowToolbarMenu(false);
                                                    }} className="px-3 py-2 text-left font-bold border-2 border-black bg-white hover:bg-gray-100">🖼 Insert Image</button>
                                                    <button onClick={() => {
                                                        const url = window.prompt('Enter YouTube URL:');
                                                        if (url) { editor.chain().focus().setYoutubeVideo({ src: url }).run(); }
                                                        setShowToolbarMenu(false);
                                                    }} className="px-3 py-2 text-left font-bold border-2 border-black bg-white hover:bg-gray-100">📺 Embed Video</button>
                                                </div>
                                            </div>
                                            
                                            {/* Clear Formatting */}
                                            <div className="border-b-2 border-black p-2">
                                                <button onClick={() => { editor.chain().focus().clearNodes().unsetAllMarks().run(); setShowToolbarMenu(false); }} className="w-full px-3 py-2 text-left font-bold border-2 border-black bg-white hover:bg-gray-100">🧹 Clear Formatting</button>
                                            </div>
                                            
                                            {/* Close Button */}
                                            <div className="p-2 bg-gray-50">
                                                <button 
                                                    onClick={() => setShowToolbarMenu(false)} 
                                                    className="w-full px-3 py-2 text-center font-bold border-2 border-black bg-yellow-400 hover:bg-yellow-500 transition-colors"
                                                >
                                                    ✓ Done
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                {/* Quick Formatting Toolbar */}
                                <div className="flex items-center gap-1 flex-wrap">
                                    {/* Text Style Buttons */}
                                    <button
                                        onClick={() => editor.chain().focus().toggleBold().run()}
                                        className={`px-3 py-2 text-sm font-bold border-2 border-black hover:bg-gray-100 ${editor.isActive('bold') ? 'bg-yellow-300' : 'bg-white'}`}
                                        title="Bold (Cmd+B)"
                                    >
                                        <strong>B</strong>
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().toggleItalic().run()}
                                        className={`px-3 py-2 text-sm font-bold border-2 border-black hover:bg-gray-100 ${editor.isActive('italic') ? 'bg-yellow-300' : 'bg-white'}`}
                                        title="Italic (Cmd+I)"
                                    >
                                        <em>I</em>
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().toggleUnderline().run()}
                                        className={`px-3 py-2 text-sm font-bold border-2 border-black hover:bg-gray-100 ${editor.isActive('underline') ? 'bg-yellow-300' : 'bg-white'}`}
                                        title="Underline (Cmd+U)"
                                    >
                                        <u>U</u>
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().toggleStrike().run()}
                                        className={`px-3 py-2 text-sm font-bold border-2 border-black hover:bg-gray-100 ${editor.isActive('strike') ? 'bg-yellow-300' : 'bg-white'}`}
                                        title="Strikethrough"
                                    >
                                        <s>S</s>
                                    </button>
                                    
                                    <div className="w-px h-6 bg-black mx-1" />
                                    
                                    {/* Heading Buttons */}
                                    <button
                                        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                                        className={`px-3 py-2 text-xs font-bold border-2 border-black hover:bg-gray-100 ${editor.isActive('heading', { level: 1 }) ? 'bg-yellow-300' : 'bg-white'}`}
                                        title="Heading 1"
                                    >
                                        H1
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                        className={`px-3 py-2 text-xs font-bold border-2 border-black hover:bg-gray-100 ${editor.isActive('heading', { level: 2 }) ? 'bg-yellow-300' : 'bg-white'}`}
                                        title="Heading 2"
                                    >
                                        H2
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                                        className={`px-3 py-2 text-xs font-bold border-2 border-black hover:bg-gray-100 ${editor.isActive('heading', { level: 3 }) ? 'bg-yellow-300' : 'bg-white'}`}
                                        title="Heading 3"
                                    >
                                        H3
                                    </button>
                                    
                                    <div className="w-px h-6 bg-black mx-1" />
                                    
                                    {/* List Buttons */}
                                    <button
                                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                                        className={`px-3 py-2 text-sm font-bold border-2 border-black hover:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-yellow-300' : 'bg-white'}`}
                                        title="Bullet List"
                                    >
                                        •
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                        className={`px-3 py-2 text-sm font-bold border-2 border-black hover:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-yellow-300' : 'bg-white'}`}
                                        title="Numbered List"
                                    >
                                        1.
                                    </button>
                                    
                                    <div className="w-px h-6 bg-black mx-1" />
                                    
                                    {/* Alignment Buttons */}
                                    <button
                                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                                        className={`px-3 py-2 text-xs font-bold border-2 border-black hover:bg-gray-100 ${editor.isActive({ textAlign: 'left' }) ? 'bg-yellow-300' : 'bg-white'}`}
                                        title="Align Left"
                                    >
                                        ⬅
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                                        className={`px-3 py-2 text-xs font-bold border-2 border-black hover:bg-gray-100 ${editor.isActive({ textAlign: 'center' }) ? 'bg-yellow-300' : 'bg-white'}`}
                                        title="Align Center"
                                    >
                                        ↔
                                    </button>
                                    <button
                                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                                        className={`px-3 py-2 text-xs font-bold border-2 border-black hover:bg-gray-100 ${editor.isActive({ textAlign: 'right' }) ? 'bg-yellow-300' : 'bg-white'}`}
                                        title="Align Right"
                                    >
                                        ➡
                                    </button>
                                </div>
                                
                                {/* AI Assistant Button - Always visible */}
                                <button onClick={() => {
                                    if (!editor) return;
                                    const { view } = editor;
                                    const coords = view.coordsAtPos(view.state.selection.from);
                                    setAIPalettePosition({ top: coords.top + window.scrollY + 30, left: coords.left + window.scrollX });
                                    setShowAICommandPalette(true);
                                }} disabled={!workspaceContext || contextLoading} className="px-4 py-2 text-sm font-bold border-2 border-black bg-purple-500 text-white hover:bg-purple-600 disabled:bg-gray-300 disabled:text-gray-500" title="AI Writing Assistant (Cmd+K)">🤖 AI</button>
                            </div>
                        </div>
                    )}
                    
                    {/* Tiptap Editor Content */}
                    <div className="flex-1 overflow-y-auto p-3 lg:p-6 bg-white">
                        <style jsx global>{`
                            /* Page Break Styles */
                            .ProseMirror .page-break {
                                margin: 2rem 0;
                                padding: 1rem 0;
                                border: none;
                                border-top: 2px dashed #ccc;
                                border-bottom: 2px dashed #ccc;
                                position: relative;
                                page-break-after: always;
                                break-after: page;
                            }
                            .ProseMirror .page-break::before {
                                content: '📄 Page Break';
                                position: absolute;
                                top: 50%;
                                left: 50%;
                                transform: translate(-50%, -50%);
                                background: white;
                                padding: 0.25rem 0.75rem;
                                font-size: 0.75rem;
                                font-weight: bold;
                                color: #999;
                                border: 1px solid #ccc;
                                border-radius: 4px;
                            }
                            @media print {
                                .ProseMirror .page-break {
                                    border: none;
                                    margin: 0;
                                    padding: 0;
                                }
                                .ProseMirror .page-break::before {
                                    display: none;
                                }
                            }
                            
                            /* Table Styles */
                            .ProseMirror table {
                                border-collapse: collapse;
                                table-layout: fixed;
                                width: 100%;
                                margin: 1rem 0;
                                overflow: hidden;
                            }
                            .ProseMirror table td,
                            .ProseMirror table th {
                                min-width: 1em;
                                border: 2px solid #000;
                                padding: 0.5rem;
                                vertical-align: top;
                                box-sizing: border-box;
                                position: relative;
                            }
                            .ProseMirror table th {
                                background-color: #fef08a;
                                font-weight: bold;
                                text-align: left;
                            }
                            .ProseMirror table .selectedCell {
                                background-color: #e0e0e0;
                            }
                            
                            /* Task List Styles */
                            .ProseMirror ul[data-type="taskList"] {
                                list-style: none;
                                padding: 0;
                            }
                            .ProseMirror ul[data-type="taskList"] li {
                                display: flex;
                                align-items: flex-start;
                                margin: 0.25rem 0;
                            }
                            .ProseMirror ul[data-type="taskList"] li > label {
                                flex: 0 0 auto;
                                margin-right: 0.5rem;
                                user-select: none;
                            }
                            .ProseMirror ul[data-type="taskList"] li > div {
                                flex: 1 1 auto;
                            }
                            .ProseMirror ul[data-type="taskList"] input[type="checkbox"] {
                                width: 1.2rem;
                                height: 1.2rem;
                                cursor: pointer;
                                margin-top: 0.15rem;
                            }
                            
                            /* Image Styles */
                            .ProseMirror img {
                                max-width: 100%;
                                height: auto;
                                display: block;
                                margin: 1rem auto;
                                border: 2px solid #000;
                            }
                            
                            /* Link Styles */
                            .ProseMirror a {
                                color: #2563eb;
                                text-decoration: underline;
                                cursor: pointer;
                            }
                            .ProseMirror a:hover {
                                color: #1d4ed8;
                            }
                            
                            /* Highlight Styles */
                            .ProseMirror mark {
                                padding: 0.125rem 0.25rem;
                                border-radius: 0.25rem;
                            }
                            
                            /* Focus Styles */
                            .ProseMirror .has-focus {
                                border-radius: 4px;
                                box-shadow: 0 0 0 2px #fef08a;
                            }
                            
                            /* Resizable Image Styles */
                            .resizable-image-container {
                                margin: 1rem 0;
                                text-align: center;
                            }
                            .resizable-image-container.align-left {
                                text-align: left;
                            }
                            .resizable-image-container.align-right {
                                text-align: right;
                            }
                            .resizable-image-container.align-center {
                                text-align: center;
                            }
                            .resizable-image-wrapper {
                                display: inline-block;
                                position: relative;
                            }
                            
                            /* YouTube Embed Styles */
                            .ProseMirror iframe[data-youtube-video] {
                                aspect-ratio: 16 / 9;
                                width: 100%;
                                border: 2px solid #000;
                                margin: 1rem 0;
                            }
                            
                            /* Dropcursor Styles */
                            .ProseMirror .ProseMirror-dropcursor {
                                background-color: #000;
                                width: 4px;
                            }
                        `}</style>
                        <EditorContent 
                            editor={editor} 
                            className="h-full min-h-[300px] lg:min-h-[500px] border-2 border-black p-3 lg:p-4 text-base lg:text-base"
                            onClick={() => {
                                // Auto-close toolbar menu when clicking into the editor
                                if (showToolbarMenu) {
                                    setShowToolbarMenu(false);
                                }
                            }}
                        />
                        
                        {/* Character Count Footer */}
                        {editor && (
                            <div className="mt-2 px-4 py-2 bg-gray-50 border-2 border-black text-xs text-gray-600 flex justify-between items-center">
                                <span>
                                    {editor.storage.characterCount.words()} words • {editor.storage.characterCount.characters()} characters
                                </span>
                                <span className="text-xs text-gray-500">
                                    Typography: Smart quotes, em dashes, © ™ ® symbols enabled
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Metadata Sidebar - Collapsible on mobile */}
                <div className="lg:w-64 w-full border-t-2 lg:border-t-0 lg:border-l-2 border-black bg-gray-50 p-3 lg:p-4 overflow-y-auto max-h-[50vh] lg:max-h-none">
                    <h3 className="font-black mb-4">Document Settings</h3>

                    {/* Doc Type */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Type</label>
                        <select
                            value={docType}
                            onChange={(e) => setDocType(e.target.value as DocType)}
                            className="w-full px-2 py-2 border-2 border-black font-mono text-sm"
                            aria-label="Document type"
                        >
                            {Object.entries(DOC_TYPE_LABELS).map(([type, label]) => (
                                <option key={type} value={type}>
                                    {DOC_TYPE_ICONS[type]} {label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Visibility */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Visibility</label>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setVisibility('team')}
                                className={`flex-1 px-2 py-2 text-sm font-bold border-2 border-black ${
                                    visibility === 'team'
                                        ? 'bg-black text-white'
                                        : 'bg-white hover:bg-gray-100'
                                }`}
                            >
                                👥 Team
                            </button>
                            <button
                                onClick={() => setVisibility('private')}
                                className={`flex-1 px-2 py-2 text-sm font-bold border-2 border-black ${
                                    visibility === 'private'
                                        ? 'bg-black text-white'
                                        : 'bg-white hover:bg-gray-100'
                                }`}
                            >
                                🔒 Private
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                            {visibility === 'team'
                                ? 'All workspace members can view'
                                : 'Only you can view'}
                        </p>
                    </div>

                    {/* Tags */}
                    <div className="mb-4">
                        <label className="block text-sm font-bold mb-2">Tags</label>
                        <input
                            type="text"
                            id="doc-tags-input"
                            name="docTags"
                            placeholder="Add tags (comma separated)"
                            className="w-full px-2 py-2 border-2 border-black font-mono text-sm"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const input = e.currentTarget;
                                    const newTags = input.value.split(',').map(t => t.trim()).filter(Boolean);
                                    setTags([...tags, ...newTags]);
                                    input.value = '';
                                }
                            }}
                            aria-label="Add tags"
                        />
                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                                {tags.map((tag, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-1 text-xs bg-white border border-black"
                                    >
                                        {tag}
                                        <button
                                            onClick={() => setTags(tags.filter((_, i) => i !== idx))}
                                            className="ml-1 text-red-600 hover:text-red-800"
                                            aria-label={`Remove ${tag} tag`}
                                        >
                                            ×
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 mb-4">
                        <button
                            onClick={handleSendToAI}
                            disabled={!editor}
                            className="w-full px-3 py-2 bg-blue-500 text-white font-bold border-2 border-black shadow-neo-btn hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                        >
                            📨 Send to AI Chat
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                                disabled={!editor}
                                className="w-full px-3 py-2 bg-blue-500 text-white font-bold border-2 border-black shadow-neo-btn hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-between"
                            >
                                <span>📋 Use Template</span>
                                <span>{showTemplateMenu ? '▲' : '▼'}</span>
                            </button>
                            {showTemplateMenu && editor && (
                                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 max-h-[400px] overflow-y-auto">
                                    {GTM_TEMPLATES.map((template) => (
                                        <button
                                            key={template.id}
                                            onClick={() => handleApplyTemplate(template)}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-yellow-300 border-b-2 border-black last:border-b-0"
                                        >
                                            <div className="font-bold">{template.icon} {template.name}</div>
                                            <div className="text-xs text-gray-600 mt-1">{template.description}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleSaveToFileLibrary}
                            disabled={!docId || !editor}
                            className="w-full px-3 py-2 bg-green-500 text-white font-bold border-2 border-black shadow-neo-btn hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            title={!docId ? 'Save document first' : 'Save to File Library'}
                        >
                            💾 Save to File Library
                        </button>
                        <div className="relative">
                            <button
                                onClick={() => setShowExportMenu(!showExportMenu)}
                                disabled={!editor}
                                className="w-full px-3 py-2 bg-purple-500 text-white font-bold border-2 border-black shadow-neo-btn hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-between"
                            >
                                <span>📥 Export Document</span>
                                <span>{showExportMenu ? '▲' : '▼'}</span>
                            </button>
                            {showExportMenu && editor && (
                                <div className="absolute bottom-full left-0 right-0 mb-1 bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50">
                                    <button
                                        onClick={() => { handleExport('markdown'); setShowExportMenu(false); }}
                                        className="w-full px-3 py-2 text-left text-sm font-bold hover:bg-yellow-300 border-b-2 border-black"
                                    >
                                        📝 Markdown (.md)
                                    </button>
                                    <button
                                        onClick={() => { handleExport('pdf'); setShowExportMenu(false); }}
                                        className="w-full px-3 py-2 text-left text-sm font-bold hover:bg-yellow-300 border-b-2 border-black"
                                    >
                                        📄 PDF (.pdf)
                                    </button>
                                    <button
                                        onClick={() => { handleExport('html'); setShowExportMenu(false); }}
                                        className="w-full px-3 py-2 text-left text-sm font-bold hover:bg-yellow-300 border-b-2 border-black"
                                    >
                                        🌐 HTML (.html)
                                    </button>
                                    <button
                                        onClick={() => { handleExport('text'); setShowExportMenu(false); }}
                                        className="w-full px-3 py-2 text-left text-sm font-bold hover:bg-yellow-300"
                                    >
                                        📋 Plain Text (.txt)
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* AI Quick Info */}
                    {workspace?.planType !== 'free' && (
                        <div className="mb-4 p-3 bg-purple-100 border-2 border-purple-400">
                            <p className="text-xs font-bold mb-2">🤖 AI Writing Assistant</p>
                            <p className="text-xs text-gray-700">
                                Click the <strong>🤖 AI</strong> button in the toolbar or press <kbd className="px-1 py-0.5 bg-white border border-gray-400 rounded text-xs font-mono">Cmd+K</kbd> to use AI assistance.
                            </p>
                            <p className="text-xs text-gray-600 mt-2">
                                Select text for quick actions: improve, expand, summarize, or rewrite.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* AI Command Palette */}
            {showAICommandPalette && editor && workspaceContext && (
                <AICommandPalette
                    editor={editor}
                    position={aiPalettePosition}
                    onClose={() => setShowAICommandPalette(false)}
                    workspaceContext={workspaceContext}
                    docType={docType}
                    data={data}
                />
            )}

            {/* Image Upload Modal */}
            {showImageUploadModal && editor && (
                <ImageUploadModal
                    workspaceId={workspaceId}
                    docId={docId}
                    onInsert={(url, alt) => {
                        editor.chain().focus().setResizableImage({ src: url, alt }).run();
                    }}
                    onClose={() => setShowImageUploadModal(false)}
                />
            )}

            {/* Chart Quick Insert Modal */}
            {showChartQuickInsert && editor && (
                <ChartQuickInsert
                    editor={editor}
                    onClose={() => setShowChartQuickInsert(false)}
                    data={data}
                />
            )}

        </div>
    );
};
