import React, { useState, useEffect } from 'react';
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
import { Gapcursor } from '@tiptap/extension-gapcursor';
import { Dropcursor } from '@tiptap/extension-dropcursor';
import { Youtube } from '@tiptap/extension-youtube';
import { ResizableImage } from '../../lib/tiptap/ResizableImage';
import { GTMDoc, DocType, DocVisibility, AppActions, DashboardData } from '../../types';
import { DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '../../constants';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { AICommandPalette } from './AICommandPalette';
import { ImageUploadModal } from './ImageUploadModal';
import { useAIWorkspaceContext } from '../../hooks/useAIWorkspaceContext';

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
    
    // Fetch workspace context for AI
    const { context: workspaceContext, loading: contextLoading } = useAIWorkspaceContext(
        docId,
        workspaceId,
        userId
    );

    // Initialize Tiptap editor with premium extensions
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3, 4, 5, 6],
                },
            }),
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
            Typography,
            CharacterCount,
            Focus.configure({
                className: 'has-focus',
                mode: 'all',
            }),
            Gapcursor,
            Dropcursor.configure({
                color: '#000',
                width: 4,
            }),
            Youtube.configure({
                controls: true,
                nocookie: true,
            }),
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
        },
    });

    useEffect(() => {
        if (docId) {
            loadDoc();
        }
    }, [docId]);

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
                            <div className="flex items-center justify-between">
                                <div className="relative">
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
                                            
                                            {/* Colors Section */}
                                            <div className="border-b-2 border-black p-2">
                                                <div className="text-xs font-bold mb-2 text-gray-600">COLORS</div>
                                                <div className="mb-2">
                                                    <div className="text-xs mb-1">Text Color:</div>
                                                    <div className="grid grid-cols-5 gap-1">
                                                        {['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#008000'].map(color => (
                                                            <button key={color} onClick={() => { editor.chain().focus().setColor(color).run(); }} className="w-10 h-10 border-2 border-black hover:scale-110 transition-transform" style={{ backgroundColor: color }} title={color} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs mb-1">Highlight:</div>
                                                    <div className="grid grid-cols-6 gap-1">
                                                        {['#FFFF00', '#00FF00', '#00FFFF', '#FF00FF', '#FFA500', '#FFB6C1'].map(color => (
                                                            <button key={color} onClick={() => { editor.chain().focus().toggleHighlight({ color }).run(); }} className="w-10 h-10 border-2 border-black hover:scale-110 transition-transform" style={{ backgroundColor: color }} title={color} />
                                                        ))}
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
                                                    <button onClick={() => { editor.chain().focus().setTextAlign('left').run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive({ textAlign: 'left' }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Left">⬅</button>
                                                    <button onClick={() => { editor.chain().focus().setTextAlign('center').run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive({ textAlign: 'center' }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Center">↔</button>
                                                    <button onClick={() => { editor.chain().focus().setTextAlign('right').run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive({ textAlign: 'right' }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Right">➡</button>
                                                    <button onClick={() => { editor.chain().focus().setTextAlign('justify').run(); setShowToolbarMenu(false); }} className={`px-3 py-2 text-sm font-bold border-2 border-black ${editor.isActive({ textAlign: 'justify' }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'}`} title="Justify">≡</button>
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
                                            
                                            {/* Media Section */}
                                            <div className="border-b-2 border-black p-2">
                                                <div className="text-xs font-bold mb-2 text-gray-600">MEDIA</div>
                                                <div className="flex flex-col gap-1">
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
                                                            <input type="url" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." className="w-full px-2 py-1 border-2 border-black text-sm mb-1" />
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
                                            <div className="p-2">
                                                <button onClick={() => { editor.chain().focus().clearNodes().unsetAllMarks().run(); setShowToolbarMenu(false); }} className="w-full px-3 py-2 text-left font-bold border-2 border-black bg-white hover:bg-gray-100">Clear Formatting</button>
                                            </div>
                                        </div>
                                    )}
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
                        <button
                            onClick={handleSaveToFileLibrary}
                            disabled={!docId || !editor}
                            className="w-full px-3 py-2 bg-green-500 text-white font-bold border-2 border-black shadow-neo-btn hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            title={!docId ? 'Save document first' : 'Save to File Library'}
                        >
                            💾 Save to File Library
                        </button>
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

        </div>
    );
};
