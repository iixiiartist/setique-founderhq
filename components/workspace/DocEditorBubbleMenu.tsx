/**
 * DocEditorBubbleMenu.tsx
 * 
 * Extracted from DocEditor.tsx for better maintainability.
 * Provides a floating toolbar that appears when text is selected.
 */

import React from 'react';
import { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import {
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    List,
    ListOrdered,
    CheckSquare,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Link as LinkIcon,
    Highlighter,
} from 'lucide-react';

export interface FontFamilyOption {
    id: string;
    label: string;
    stack: string;
}

export interface DocEditorBubbleMenuProps {
    editor: Editor | null;
    fontFamilyOptions: FontFamilyOption[];
    fontSizeOptions: string[];
    currentFontFamilyId: string;
    currentFontSizeValue: string;
    isAIPaletteEnabled: boolean;
    onOpenAIPalette: () => void;
    getFontStackById: (id: string) => string | undefined;
}

export const DocEditorBubbleMenu: React.FC<DocEditorBubbleMenuProps> = ({
    editor,
    fontFamilyOptions,
    fontSizeOptions,
    currentFontFamilyId,
    currentFontSizeValue,
    isAIPaletteEnabled,
    onOpenAIPalette,
    getFontStackById,
}) => {
    if (!editor) return null;

    return (
        <BubbleMenu editor={editor}>
            <div className="bg-white shadow-xl border border-gray-200 rounded-lg p-1.5 flex flex-wrap items-center gap-1 max-w-[600px]">
                {/* Font Family & Size */}
                <select
                    className="h-6 px-1 text-xs bg-transparent hover:bg-gray-100 rounded border border-gray-200 focus:ring-0 cursor-pointer text-gray-700 max-w-[90px]"
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'system') {
                            editor.chain().focus().unsetFontFamily().run();
                        } else {
                            const stack = getFontStackById(value);
                            if (stack) {
                                editor.chain().focus().setFontFamily(stack).run();
                            }
                        }
                    }}
                    value={currentFontFamilyId}
                    title="Font Family"
                >
                    {fontFamilyOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                </select>
                <select
                    className="h-6 px-1 text-xs bg-transparent hover:bg-gray-100 rounded border border-gray-200 focus:ring-0 cursor-pointer text-gray-700 w-[52px]"
                    value={currentFontSizeValue}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'default') {
                            editor.chain().focus().unsetFontSize().run();
                        } else {
                            editor.chain().focus().setFontSize(value).run();
                        }
                    }}
                    title="Font Size"
                >
                    <option value="default">Size</option>
                    {fontSizeOptions.map((size) => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
                
                <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                
                {/* Text Formatting */}
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('bold') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Bold"><Bold size={14} /></button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('italic') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Italic"><Italic size={14} /></button>
                <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('underline') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Underline"><UnderlineIcon size={14} /></button>
                <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('strike') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Strikethrough"><Strikethrough size={14} /></button>
                
                <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                
                {/* Headings */}
                <button onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={`p-1.5 rounded hover:bg-gray-100 text-xs font-bold ${editor.isActive('heading', { level: 1 }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Heading 1">H1</button>
                <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded hover:bg-gray-100 text-xs font-bold ${editor.isActive('heading', { level: 2 }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Heading 2">H2</button>
                <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-1.5 rounded hover:bg-gray-100 text-xs font-bold ${editor.isActive('heading', { level: 3 }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Heading 3">H3</button>
                
                <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                
                {/* Lists */}
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('bulletList') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Bullet List"><List size={14} /></button>
                <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('orderedList') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Numbered List"><ListOrdered size={14} /></button>
                <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('taskList') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Task List"><CheckSquare size={14} /></button>
                
                <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                
                {/* Alignment */}
                <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive({ textAlign: 'left' }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Align Left"><AlignLeft size={14} /></button>
                <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive({ textAlign: 'center' }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Align Center"><AlignCenter size={14} /></button>
                <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive({ textAlign: 'right' }) ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} title="Align Right"><AlignRight size={14} /></button>
                
                <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                
                {/* Link */}
                <button 
                    onClick={() => {
                        const url = prompt('Enter URL:', editor.getAttributes('link').href || 'https://');
                        if (url === null) return;
                        if (url === '') {
                            editor.chain().focus().unsetLink().run();
                        } else {
                            editor.chain().focus().setLink({ href: url }).run();
                        }
                    }} 
                    className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('link') ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`} 
                    title="Insert Link"
                >
                    <LinkIcon size={14} />
                </button>
                
                {/* Quick Colors */}
                <button onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} className={`p-1.5 rounded hover:bg-gray-100 ${editor.isActive('highlight') ? 'text-yellow-600 bg-yellow-50' : 'text-gray-600'}`} title="Highlight"><Highlighter size={14} /></button>
                
                {/* Clear Formatting */}
                <button onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} className="p-1.5 rounded hover:bg-gray-100 text-gray-600" title="Clear Formatting"><span className="text-xs font-bold">Tx</span></button>
                
                {/* AI */}
                {isAIPaletteEnabled && (
                    <>
                        <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                        <button onClick={onOpenAIPalette} className="p-1.5 rounded hover:bg-purple-50 text-purple-600 font-medium text-xs flex items-center gap-1" title="AI Assistant">✨ AI</button>
                    </>
                )}
            </div>
        </BubbleMenu>
    );
};

export default DocEditorBubbleMenu;
