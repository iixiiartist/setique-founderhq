import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { GTMDoc, DocType, DocVisibility } from '../../types';
import { DOC_TYPE_LABELS, DOC_TYPE_ICONS } from '../../constants';

interface DocEditorProps {
    workspaceId: string;
    userId: string;
    docId?: string; // undefined for new doc
    onClose: () => void;
    onSave: (doc: GTMDoc) => void;
}

export const DocEditor: React.FC<DocEditorProps> = ({
    workspaceId,
    userId,
    docId,
    onClose,
    onSave,
}) => {
    const [title, setTitle] = useState('Untitled Document');
    const [docType, setDocType] = useState<DocType>('brief');
    const [visibility, setVisibility] = useState<DocVisibility>('team');
    const [tags, setTags] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(!!docId);

    // Initialize Tiptap editor
    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Start writing your document...',
            }),
        ],
        content: '',
        editorProps: {
            attributes: {
                class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-full p-4',
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
            <div className="p-4 border-b-2 border-black bg-white flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                    <button
                        onClick={onClose}
                        className="px-3 py-1 bg-white border-2 border-black font-bold hover:bg-gray-100 transition-colors"
                        aria-label="Close editor"
                    >
                        ← Back
                    </button>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="flex-1 px-3 py-2 text-xl font-bold border-2 border-black"
                        placeholder="Document title..."
                        aria-label="Document title"
                    />
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="ml-3 px-6 py-2 bg-yellow-400 text-black font-bold border-2 border-black shadow-neo-btn hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label={isSaving ? 'Saving...' : 'Save document'}
                >
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Editor Area */}
                <div className="flex-1 overflow-y-auto flex flex-col">
                    {/* Tiptap Toolbar */}
                    {editor && (
                        <div className="sticky top-0 z-10 bg-white border-b-2 border-black p-2 flex flex-wrap gap-1">
                            <button
                                onClick={() => editor.chain().focus().toggleBold().run()}
                                className={`px-3 py-1 text-sm font-bold border-2 border-black ${
                                    editor.isActive('bold') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'
                                }`}
                                title="Bold (Ctrl+B)"
                            >
                                <strong>B</strong>
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleItalic().run()}
                                className={`px-3 py-1 text-sm font-bold border-2 border-black ${
                                    editor.isActive('italic') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'
                                }`}
                                title="Italic (Ctrl+I)"
                            >
                                <em>I</em>
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleStrike().run()}
                                className={`px-3 py-1 text-sm font-bold border-2 border-black ${
                                    editor.isActive('strike') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'
                                }`}
                                title="Strikethrough"
                            >
                                <s>S</s>
                            </button>
                            
                            <div className="w-px bg-black mx-1"></div>
                            
                            <button
                                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                                className={`px-3 py-1 text-sm font-bold border-2 border-black ${
                                    editor.isActive('heading', { level: 1 }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'
                                }`}
                                title="Heading 1"
                            >
                                H1
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                                className={`px-3 py-1 text-sm font-bold border-2 border-black ${
                                    editor.isActive('heading', { level: 2 }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'
                                }`}
                                title="Heading 2"
                            >
                                H2
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                                className={`px-3 py-1 text-sm font-bold border-2 border-black ${
                                    editor.isActive('heading', { level: 3 }) ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'
                                }`}
                                title="Heading 3"
                            >
                                H3
                            </button>
                            
                            <div className="w-px bg-black mx-1"></div>
                            
                            <button
                                onClick={() => editor.chain().focus().toggleBulletList().run()}
                                className={`px-3 py-1 text-sm font-bold border-2 border-black ${
                                    editor.isActive('bulletList') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'
                                }`}
                                title="Bullet List"
                            >
                                • List
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                                className={`px-3 py-1 text-sm font-bold border-2 border-black ${
                                    editor.isActive('orderedList') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'
                                }`}
                                title="Numbered List"
                            >
                                1. List
                            </button>
                            
                            <div className="w-px bg-black mx-1"></div>
                            
                            <button
                                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                                className={`px-3 py-1 text-sm font-bold border-2 border-black ${
                                    editor.isActive('blockquote') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'
                                }`}
                                title="Quote"
                            >
                                " Quote
                            </button>
                            <button
                                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                                className={`px-3 py-1 text-sm font-bold border-2 border-black ${
                                    editor.isActive('codeBlock') ? 'bg-yellow-300' : 'bg-white hover:bg-gray-100'
                                }`}
                                title="Code Block"
                            >
                                {'</>'}
                            </button>
                            
                            <div className="w-px bg-black mx-1"></div>
                            
                            <button
                                onClick={() => editor.chain().focus().setHorizontalRule().run()}
                                className="px-3 py-1 text-sm font-bold border-2 border-black bg-white hover:bg-gray-100"
                                title="Horizontal Line"
                            >
                                ─
                            </button>
                            <button
                                onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
                                className="px-3 py-1 text-sm font-bold border-2 border-black bg-white hover:bg-gray-100"
                                title="Clear Formatting"
                            >
                                Clear
                            </button>
                        </div>
                    )}
                    
                    {/* Tiptap Editor Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-white">
                        <EditorContent 
                            editor={editor} 
                            className="h-full min-h-[500px] border-2 border-black p-4"
                        />
                    </div>
                </div>

                {/* Metadata Sidebar */}
                <div className="w-64 border-l-2 border-black bg-gray-50 p-4 overflow-y-auto">
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

                    {/* AI Integration Placeholder */}
                    <div className="mb-4 p-3 bg-yellow-100 border-2 border-yellow-400">
                        <p className="text-xs font-bold mb-2">🤖 AI Actions</p>
                        <button
                            className="w-full px-2 py-1 text-sm font-bold bg-white border-2 border-black hover:bg-gray-100 disabled:opacity-50"
                            disabled
                        >
                            Send to AI (Coming Soon)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
