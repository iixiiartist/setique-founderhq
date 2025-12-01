/**
 * DocEditorToolbar.tsx
 * 
 * Extracted from DocEditor.tsx for better maintainability.
 * Provides the main document editing toolbar with formatting controls.
 */

import React from 'react';
import { Editor } from '@tiptap/react';
import { HexColorPicker } from 'react-colorful';
import {
    Undo,
    Redo,
    Printer,
    Bold,
    Italic,
    Underline as UnderlineIcon,
    Strikethrough,
    AlignLeft,
    AlignCenter,
    AlignRight,
    List,
    ListOrdered,
    CheckSquare,
    Link as LinkIcon,
    Image as ImageIcon,
    Table as TableIcon,
    Palette,
    Highlighter,
    FilePlus,
    Subscript as SubscriptIcon,
    Superscript as SuperscriptIcon,
    Youtube as YoutubeIcon,
} from 'lucide-react';

export interface FontFamilyOption {
    id: string;
    label: string;
    stack: string;
}

export interface LineSpacingOption {
    label: string;
    value: number;
}

export interface DocEditorToolbarProps {
    editor: Editor;
    // Font options
    fontFamilyOptions: FontFamilyOption[];
    fontSizeOptions: string[];
    lineSpacingOptions: LineSpacingOption[];
    currentFontFamilyId: string;
    currentFontSizeValue: string;
    lineSpacing: number;
    getFontStackById: (id: string) => string | undefined;
    onLineSpacingChange: (value: number) => void;
    // Color pickers
    selectedColor: string;
    selectedHighlight: string;
    showAdvancedColorPicker: boolean;
    showAdvancedHighlightPicker: boolean;
    onColorChange: (color: string) => void;
    onHighlightChange: (color: string) => void;
    onToggleColorPicker: () => void;
    onToggleHighlightPicker: () => void;
    // Link input
    showLinkInput: boolean;
    linkUrl: string;
    onLinkUrlChange: (url: string) => void;
    onToggleLinkInput: () => void;
    onAddLink: () => void;
    // Image upload
    onOpenImageUpload: () => void;
    // Chart insert
    onOpenChartInsert: () => void;
}

export const DocEditorToolbar: React.FC<DocEditorToolbarProps> = ({
    editor,
    fontFamilyOptions,
    fontSizeOptions,
    lineSpacingOptions,
    currentFontFamilyId,
    currentFontSizeValue,
    lineSpacing,
    getFontStackById,
    onLineSpacingChange,
    selectedColor,
    selectedHighlight,
    showAdvancedColorPicker,
    showAdvancedHighlightPicker,
    onColorChange,
    onHighlightChange,
    onToggleColorPicker,
    onToggleHighlightPicker,
    showLinkInput,
    linkUrl,
    onLinkUrlChange,
    onToggleLinkInput,
    onAddLink,
    onOpenImageUpload,
    onOpenChartInsert,
}) => {
    return (
        <div className="sticky top-4 z-20 mx-4 mt-4 bg-white/95 backdrop-blur rounded-xl border border-gray-200 px-4 py-2 flex items-center gap-1 flex-wrap shadow-sm">
            {/* Undo/Redo */}
            <div className="flex items-center gap-0.5 border-r border-gray-300 pr-2 mr-1">
                <button onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-700"><Undo size={16} /></button>
                <button onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} className="p-1.5 rounded hover:bg-gray-200 disabled:opacity-30 text-gray-700"><Redo size={16} /></button>
                <button onClick={() => window.print()} className="p-1.5 rounded hover:bg-gray-200 text-gray-700"><Printer size={16} /></button>
            </div>
            
            {/* Text Style */}
            <div className="flex items-center gap-1 border-r border-gray-300 pr-2 mr-1">
                <select 
                    className="h-7 px-2 text-sm bg-transparent hover:bg-gray-200 rounded border-none focus:ring-0 cursor-pointer text-gray-700 font-medium"
                    onChange={(e) => {
                        if (e.target.value.startsWith('h')) {
                            editor.chain().focus().toggleHeading({ level: parseInt(e.target.value.substring(1)) as any }).run();
                        } else {
                            editor.chain().focus().setParagraph().run();
                        }
                    }}
                    value={editor.isActive('heading', { level: 1 }) ? 'h1' : editor.isActive('heading', { level: 2 }) ? 'h2' : editor.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
                >
                    <option value="p">Normal text</option>
                    <option value="h1">Heading 1</option>
                    <option value="h2">Heading 2</option>
                    <option value="h3">Heading 3</option>
                </select>
                
                <select 
                    className="h-7 px-2 text-sm bg-transparent hover:bg-gray-200 rounded border-none focus:ring-0 cursor-pointer w-28 text-gray-700"
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
                >
                    {fontFamilyOptions.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                </select>

                <select
                    className="h-7 px-2 text-sm bg-transparent hover:bg-gray-200 rounded border-none focus:ring-0 cursor-pointer w-24 text-gray-700"
                    value={currentFontSizeValue}
                    onChange={(e) => {
                        const value = e.target.value;
                        if (value === 'default') {
                            editor.chain().focus().unsetFontSize().run();
                        } else {
                            editor.chain().focus().setFontSize(value).run();
                        }
                    }}
                >
                    <option value="default">Font size</option>
                    {fontSizeOptions.map((size) => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>

                <select
                    className="h-7 px-2 text-sm bg-transparent hover:bg-gray-200 rounded border-none focus:ring-0 cursor-pointer w-28 text-gray-700"
                    value={lineSpacing.toFixed(2)}
                    onChange={(e) => onLineSpacingChange(parseFloat(e.target.value))}
                >
                    {lineSpacingOptions.map((option) => (
                        <option key={option.value} value={option.value.toString()}>{option.label} ({option.value.toFixed(2)})</option>
                    ))}
                </select>
            </div>

            {/* Formatting */}
            <div className="flex items-center gap-0.5 border-r border-gray-300 pr-2 mr-1">
                <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('bold') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><Bold size={16} /></button>
                <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('italic') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><Italic size={16} /></button>
                <button onClick={() => editor.chain().focus().toggleUnderline().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('underline') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><UnderlineIcon size={16} /></button>
                <button onClick={() => editor.chain().focus().toggleStrike().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('strike') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><Strikethrough size={16} /></button>
                <button onClick={() => editor.chain().focus().toggleSubscript().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('subscript') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><SubscriptIcon size={16} /></button>
                <button onClick={() => editor.chain().focus().toggleSuperscript().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('superscript') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><SuperscriptIcon size={16} /></button>
                
                <div className="relative">
                    <button onClick={onToggleColorPicker} className="p-1.5 rounded hover:bg-gray-200 flex items-center gap-1 text-gray-700">
                        <Palette size={16} />
                        <div className="w-3 h-3 border border-gray-300 rounded-sm" style={{ backgroundColor: selectedColor }}></div>
                    </button>
                    {showAdvancedColorPicker && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-white p-2 shadow-xl border border-gray-200 rounded-lg w-48">
                            <HexColorPicker color={selectedColor} onChange={(color) => { onColorChange(color); editor.chain().focus().setColor(color).run(); }} />
                            <button onClick={onToggleColorPicker} className="w-full mt-2 text-xs bg-gray-100 hover:bg-gray-200 py-1 rounded">Close</button>
                        </div>
                    )}
                </div>
                
                <div className="relative">
                    <button onClick={onToggleHighlightPicker} className="p-1.5 rounded hover:bg-gray-200 flex items-center gap-1 text-gray-700">
                        <Highlighter size={16} className={editor.isActive('highlight') ? 'text-yellow-500' : ''} />
                    </button>
                    {showAdvancedHighlightPicker && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-white p-2 shadow-xl border border-gray-200 rounded-lg w-48">
                            <HexColorPicker color={selectedHighlight} onChange={(color) => { onHighlightChange(color); editor.chain().focus().toggleHighlight({ color }).run(); }} />
                            <button onClick={onToggleHighlightPicker} className="w-full mt-2 text-xs bg-gray-100 hover:bg-gray-200 py-1 rounded">Close</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Alignment & Lists */}
            <div className="flex items-center gap-0.5 border-r border-gray-300 pr-2 mr-1">
                <button onClick={onToggleLinkInput} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('link') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><LinkIcon size={16} /></button>
                {showLinkInput && (
                    <div className="absolute top-full mt-1 bg-white p-2 shadow-lg border border-gray-200 rounded z-50 flex gap-1">
                        <input type="text" value={linkUrl} onChange={e => onLinkUrlChange(e.target.value)} className="border rounded px-2 py-1 text-sm" placeholder="https://..." />
                        <button onClick={onAddLink} className="bg-blue-500 text-white px-2 py-1 rounded text-xs">Add</button>
                    </div>
                )}
                <button onClick={onOpenImageUpload} className="p-1.5 rounded hover:bg-gray-200 text-gray-700"><ImageIcon size={16} /></button>
                
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                
                <button 
                    onClick={() => {
                        if (editor.isActive('resizableImage')) {
                            editor.chain().focus().updateAttributes('resizableImage', { alignment: 'left' }).run();
                        } else {
                            editor.chain().focus().setTextAlign('left').run();
                        }
                    }} 
                    className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'left' }) || editor.isActive('resizableImage', { alignment: 'left' }) ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}
                >
                    <AlignLeft size={16} />
                </button>
                <button 
                    onClick={() => {
                        if (editor.isActive('resizableImage')) {
                            editor.chain().focus().updateAttributes('resizableImage', { alignment: 'center' }).run();
                        } else {
                            editor.chain().focus().setTextAlign('center').run();
                        }
                    }} 
                    className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'center' }) || editor.isActive('resizableImage', { alignment: 'center' }) ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}
                >
                    <AlignCenter size={16} />
                </button>
                <button 
                    onClick={() => {
                        if (editor.isActive('resizableImage')) {
                            editor.chain().focus().updateAttributes('resizableImage', { alignment: 'right' }).run();
                        } else {
                            editor.chain().focus().setTextAlign('right').run();
                        }
                    }} 
                    className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive({ textAlign: 'right' }) || editor.isActive('resizableImage', { alignment: 'right' }) ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}
                >
                    <AlignRight size={16} />
                </button>
                
                <div className="w-px h-4 bg-gray-300 mx-1"></div>
                
                <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('bulletList') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><List size={16} /></button>
                <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('orderedList') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><ListOrdered size={16} /></button>
                <button onClick={() => editor.chain().focus().toggleTaskList().run()} className={`p-1.5 rounded hover:bg-gray-200 ${editor.isActive('taskList') ? 'bg-blue-100 text-blue-700' : 'text-gray-700'}`}><CheckSquare size={16} /></button>
            </div>
            
            {/* Insert */}
            <div className="flex items-center gap-0.5">
                <button onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} className="p-1.5 rounded hover:bg-gray-200 text-gray-700"><TableIcon size={16} /></button>
                <button onClick={() => editor.chain().focus().setPageBreak().run()} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Page Break"><FilePlus size={16} /></button>
                <button onClick={() => {
                    const url = prompt('Enter YouTube URL');
                    if (url) editor.chain().focus().setYoutubeVideo({ src: url }).run();
                }} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Insert YouTube"><YoutubeIcon size={16} /></button>
                <button onClick={onOpenChartInsert} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Insert Chart"><span className="text-sm">📊</span></button>
                <button onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} className="p-1.5 rounded hover:bg-gray-200 text-gray-700" title="Clear Formatting"><span className="text-xs font-bold">Tx</span></button>
            </div>
        </div>
    );
};

export default DocEditorToolbar;
