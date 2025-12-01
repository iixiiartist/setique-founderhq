import React from 'react';
import { X, Minimize2, Maximize2 } from 'lucide-react';
import { FONT_SIZES, FONT_FAMILIES, TEXT_COLORS, HIGHLIGHT_COLORS } from './constants';
import { ToolbarButton, DropdownButton } from './ToolbarButtons';
import { HexColorPicker } from 'react-colorful';
import {
    Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Link as LinkIcon,
    AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Highlighter, Palette,
    Image as ImageIcon, Strikethrough, Quote, Undo, Redo, Printer, CheckSquare,
    Table as TableIcon, Youtube as YoutubeIcon, Subscript as SubscriptIcon,
    Superscript as SuperscriptIcon, RemoveFormatting, Shapes, Square, Circle,
    Triangle, ArrowRight, Minus as HrIcon, Paperclip, LayoutTemplate, FileText, FileUp
} from 'lucide-react';
import { ShapeType } from '../../../lib/tiptap/ShapeNode';
import { Editor } from '@tiptap/react';

interface EditorToolbarProps {
    editor: Editor | null;
    // Font size
    showFontSizeMenu: boolean;
    setShowFontSizeMenu: (show: boolean) => void;
    fontSizeRef: React.RefObject<HTMLDivElement>;
    // Color pickers
    showAdvancedColorPicker: boolean;
    setShowAdvancedColorPicker: (show: boolean) => void;
    selectedColor: string;
    setSelectedColor: (color: string) => void;
    colorRef: React.RefObject<HTMLDivElement>;
    showAdvancedHighlightPicker: boolean;
    setShowAdvancedHighlightPicker: (show: boolean) => void;
    selectedHighlight: string;
    setSelectedHighlight: (color: string) => void;
    highlightRef: React.RefObject<HTMLDivElement>;
    // Image
    imageInputRef: React.RefObject<HTMLInputElement>;
    showImageSizeMenu: boolean;
    setShowImageSizeMenu: (show: boolean) => void;
    imageSizeRef: React.RefObject<HTMLDivElement>;
    // Shape
    showShapeMenu: boolean;
    setShowShapeMenu: (show: boolean) => void;
    shapeRef: React.RefObject<HTMLDivElement>;
    handleInsertShape: (shapeType: ShapeType) => void;
    // Attachments
    attachments: Array<{ name: string; url?: string; type?: string }>;
    showAttachmentMenu: boolean;
    setShowAttachmentMenu: (show: boolean) => void;
    attachmentRef: React.RefObject<HTMLDivElement>;
    fileInputRef: React.RefObject<HTMLInputElement>;
    uploadingAttachment: boolean;
    removeAttachment: (index: number) => void;
    // Templates
    showTemplateMenu: boolean;
    setShowTemplateMenu: (show: boolean) => void;
    templateRef: React.RefObject<HTMLDivElement>;
    applyTemplate: (template: any) => void;
    emailTemplates: any[];
    setShowGTMTemplateMenu: (show: boolean) => void;
    // AI
    aiProcessing: boolean;
    aiActionLabel: string;
    aiButtonRef: React.RefObject<HTMLButtonElement>;
    toggleAiMenu: () => void;
}

export function EditorToolbar({
    editor,
    showFontSizeMenu,
    setShowFontSizeMenu,
    fontSizeRef,
    showAdvancedColorPicker,
    setShowAdvancedColorPicker,
    selectedColor,
    setSelectedColor,
    colorRef,
    showAdvancedHighlightPicker,
    setShowAdvancedHighlightPicker,
    selectedHighlight,
    setSelectedHighlight,
    highlightRef,
    imageInputRef,
    showImageSizeMenu,
    setShowImageSizeMenu,
    imageSizeRef,
    showShapeMenu,
    setShowShapeMenu,
    shapeRef,
    handleInsertShape,
    attachments,
    showAttachmentMenu,
    setShowAttachmentMenu,
    attachmentRef,
    fileInputRef,
    uploadingAttachment,
    removeAttachment,
    showTemplateMenu,
    setShowTemplateMenu,
    templateRef,
    applyTemplate,
    emailTemplates,
    setShowGTMTemplateMenu,
    aiProcessing,
    aiActionLabel,
    aiButtonRef,
    toggleAiMenu
}: EditorToolbarProps) {
    return (
        <div className="border-b border-gray-200 bg-gray-50/80 relative z-40 overflow-visible">
            {/* Main Toolbar Row */}
            <div className="flex items-center gap-0.5 px-2 py-1.5 flex-wrap overflow-visible">
                {/* Undo/Redo/Print */}
                <ToolbarButton
                    onClick={() => editor?.chain().focus().undo().run()}
                    disabled={!editor?.can().undo()}
                    title="Undo (Ctrl+Z)"
                >
                    <Undo size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().redo().run()}
                    disabled={!editor?.can().redo()}
                    title="Redo (Ctrl+Y)"
                >
                    <Redo size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => window.print()}
                    title="Print"
                >
                    <Printer size={16} />
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Heading Dropdown */}
                <div className="relative">
                    <select
                        className="h-7 px-2 text-sm bg-transparent hover:bg-gray-200 rounded border-none focus:ring-0 cursor-pointer text-gray-700 font-medium"
                        onChange={(e) => {
                            if (e.target.value.startsWith('h')) {
                                editor?.chain().focus().toggleHeading({ level: parseInt(e.target.value.substring(1)) as 1 | 2 | 3 }).run();
                            } else {
                                editor?.chain().focus().setParagraph().run();
                            }
                        }}
                        value={editor?.isActive('heading', { level: 1 }) ? 'h1' : editor?.isActive('heading', { level: 2 }) ? 'h2' : editor?.isActive('heading', { level: 3 }) ? 'h3' : 'p'}
                    >
                        <option value="p">Normal</option>
                        <option value="h1">Heading 1</option>
                        <option value="h2">Heading 2</option>
                        <option value="h3">Heading 3</option>
                    </select>
                </div>

                {/* Font Family Dropdown */}
                <div className="relative">
                    <select
                        className="h-7 px-2 text-sm bg-transparent hover:bg-gray-200 rounded border-none focus:ring-0 cursor-pointer text-gray-700 w-28"
                        onChange={(e) => {
                            const family = FONT_FAMILIES.find(f => f.id === e.target.value);
                            if (family) {
                                if (family.id === 'system') {
                                    editor?.chain().focus().unsetFontFamily().run();
                                } else {
                                    editor?.chain().focus().setFontFamily(family.stack).run();
                                }
                            }
                        }}
                        value={FONT_FAMILIES.find(f => editor?.isActive('textStyle', { fontFamily: f.stack }))?.id || 'system'}
                    >
                        {FONT_FAMILIES.map(family => (
                            <option key={family.id} value={family.id}>{family.label}</option>
                        ))}
                    </select>
                </div>

                {/* Font Size Dropdown */}
                <div className="relative" ref={fontSizeRef}>
                    <DropdownButton
                        onClick={() => setShowFontSizeMenu(!showFontSizeMenu)}
                        isOpen={showFontSizeMenu}
                        title="Font Size"
                    >
                        <Type size={16} />
                    </DropdownButton>
                    {showFontSizeMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[120px] z-50">
                            <button
                                onClick={() => {
                                    editor?.chain().focus().unsetFontSize().run();
                                    setShowFontSizeMenu(false);
                                }}
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                            >
                                Default
                            </button>
                            {FONT_SIZES.map(size => (
                                <button
                                    key={size.value}
                                    onClick={() => {
                                        editor?.chain().focus().setFontSize(size.value).run();
                                        setShowFontSizeMenu(false);
                                    }}
                                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
                                    style={{ fontSize: size.value }}
                                >
                                    {size.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Text Formatting */}
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    isActive={editor?.isActive('bold')}
                    title="Bold (Ctrl+B)"
                >
                    <Bold size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    isActive={editor?.isActive('italic')}
                    title="Italic (Ctrl+I)"
                >
                    <Italic size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleUnderline().run()}
                    isActive={editor?.isActive('underline')}
                    title="Underline (Ctrl+U)"
                >
                    <UnderlineIcon size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleStrike().run()}
                    isActive={editor?.isActive('strike')}
                    title="Strikethrough"
                >
                    <Strikethrough size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleSubscript().run()}
                    isActive={editor?.isActive('subscript')}
                    title="Subscript"
                >
                    <SubscriptIcon size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleSuperscript().run()}
                    isActive={editor?.isActive('superscript')}
                    title="Superscript"
                >
                    <SuperscriptIcon size={16} />
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Text Color */}
                <div className="relative" ref={colorRef}>
                    <button
                        onClick={() => {
                            setShowAdvancedColorPicker(!showAdvancedColorPicker);
                        }}
                        className="p-1.5 rounded hover:bg-gray-200 flex items-center gap-1 text-gray-700"
                        title="Text Color"
                    >
                        <Palette size={16} />
                        <div className="w-3 h-3 border border-gray-300 rounded-sm" style={{ backgroundColor: selectedColor }}></div>
                    </button>
                    {showAdvancedColorPicker && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-white p-3 shadow-xl border border-gray-200 rounded-lg w-52">
                            <div className="text-xs font-medium text-gray-500 mb-2">Text Color</div>
                            <HexColorPicker
                                color={selectedColor}
                                onChange={(color) => {
                                    setSelectedColor(color);
                                    editor?.chain().focus().setColor(color).run();
                                }}
                            />
                            <div className="grid grid-cols-5 gap-1 mt-2 pt-2 border-t border-gray-100">
                                {TEXT_COLORS.map(color => (
                                    <button
                                        key={color.value}
                                        onClick={() => {
                                            setSelectedColor(color.value);
                                            editor?.chain().focus().setColor(color.value).run();
                                        }}
                                        className="w-7 h-7 rounded border border-gray-200 hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color.value }}
                                        title={color.label}
                                    />
                                ))}
                            </div>
                            <button
                                onClick={() => setShowAdvancedColorPicker(false)}
                                className="w-full mt-2 text-xs bg-gray-100 hover:bg-gray-200 py-1.5 rounded"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>

                {/* Highlight */}
                <div className="relative" ref={highlightRef}>
                    <button
                        onClick={() => {
                            setShowAdvancedHighlightPicker(!showAdvancedHighlightPicker);
                        }}
                        className="p-1.5 rounded hover:bg-gray-200 flex items-center gap-1 text-gray-700"
                        title="Highlight"
                    >
                        <Highlighter size={16} className={editor?.isActive('highlight') ? 'text-yellow-500' : ''} />
                    </button>
                    {showAdvancedHighlightPicker && (
                        <div className="absolute top-full left-0 mt-1 z-50 bg-white p-3 shadow-xl border border-gray-200 rounded-lg w-52">
                            <div className="text-xs font-medium text-gray-500 mb-2">Highlight Color</div>
                            <HexColorPicker
                                color={selectedHighlight}
                                onChange={(color) => {
                                    setSelectedHighlight(color);
                                    editor?.chain().focus().toggleHighlight({ color }).run();
                                }}
                            />
                            <div className="grid grid-cols-4 gap-1 mt-2 pt-2 border-t border-gray-100">
                                {HIGHLIGHT_COLORS.filter(c => c.value).map(color => (
                                    <button
                                        key={color.value}
                                        onClick={() => {
                                            setSelectedHighlight(color.value);
                                            editor?.chain().focus().toggleHighlight({ color: color.value }).run();
                                        }}
                                        className="w-7 h-7 rounded border border-gray-200 hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color.value }}
                                        title={color.label}
                                    />
                                ))}
                                <button
                                    onClick={() => editor?.chain().focus().unsetHighlight().run()}
                                    className="w-7 h-7 rounded border border-gray-200 hover:scale-110 transition-transform bg-white flex items-center justify-center"
                                    title="Remove Highlight"
                                >
                                    <X size={12} className="text-gray-400" />
                                </button>
                            </div>
                            <button
                                onClick={() => setShowAdvancedHighlightPicker(false)}
                                className="w-full mt-2 text-xs bg-gray-100 hover:bg-gray-200 py-1.5 rounded"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Lists */}
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    isActive={editor?.isActive('bulletList')}
                    title="Bullet List"
                >
                    <List size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                    isActive={editor?.isActive('orderedList')}
                    title="Numbered List"
                >
                    <ListOrdered size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().toggleTaskList().run()}
                    isActive={editor?.isActive('taskList')}
                    title="Task List"
                >
                    <CheckSquare size={16} />
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Alignment */}
                <ToolbarButton
                    onClick={() => editor?.chain().focus().setTextAlign('left').run()}
                    isActive={editor?.isActive({ textAlign: 'left' })}
                    title="Align Left"
                >
                    <AlignLeft size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().setTextAlign('center').run()}
                    isActive={editor?.isActive({ textAlign: 'center' })}
                    title="Align Center"
                >
                    <AlignCenter size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().setTextAlign('right').run()}
                    isActive={editor?.isActive({ textAlign: 'right' })}
                    title="Align Right"
                >
                    <AlignRight size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().setTextAlign('justify').run()}
                    isActive={editor?.isActive({ textAlign: 'justify' })}
                    title="Justify"
                >
                    <AlignJustify size={16} />
                </ToolbarButton>

                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Insert Actions */}
                <ToolbarButton
                    onClick={() => {
                        const url = window.prompt('Enter URL:');
                        if (url) {
                            editor?.chain().focus().setLink({ href: url }).run();
                        }
                    }}
                    isActive={editor?.isActive('link')}
                    title="Add Link"
                >
                    <LinkIcon size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => imageInputRef.current?.click()}
                    title="Insert Image"
                >
                    <ImageIcon size={16} />
                </ToolbarButton>

                {/* Image Size Controls - Only show when image is selected */}
                {editor?.isActive('image') && (
                    <>
                        <div className="flex items-center border-l border-gray-200 pl-2 ml-1">
                            <ToolbarButton
                                onClick={() => {
                                    const { state } = editor;
                                    const { selection } = state;
                                    const node = state.doc.nodeAt(selection.from);
                                    if (node?.type.name === 'image') {
                                        const currentClass = node.attrs.class || 'email-resizable-image';
                                        const newClass = currentClass.replace(/align-(left|center|right)/g, '').trim() + ' align-left';
                                        editor.chain().focus().updateAttributes('image', { class: newClass }).run();
                                    }
                                }}
                                title="Align Left"
                            >
                                <AlignLeft size={16} />
                            </ToolbarButton>
                            <ToolbarButton
                                onClick={() => {
                                    const { state } = editor;
                                    const { selection } = state;
                                    const node = state.doc.nodeAt(selection.from);
                                    if (node?.type.name === 'image') {
                                        const currentClass = node.attrs.class || 'email-resizable-image';
                                        const newClass = currentClass.replace(/align-(left|center|right)/g, '').trim() + ' align-center';
                                        editor.chain().focus().updateAttributes('image', { class: newClass }).run();
                                    }
                                }}
                                title="Align Center"
                            >
                                <AlignCenter size={16} />
                            </ToolbarButton>
                            <ToolbarButton
                                onClick={() => {
                                    const { state } = editor;
                                    const { selection } = state;
                                    const node = state.doc.nodeAt(selection.from);
                                    if (node?.type.name === 'image') {
                                        const currentClass = node.attrs.class || 'email-resizable-image';
                                        const newClass = currentClass.replace(/align-(left|center|right)/g, '').trim() + ' align-right';
                                        editor.chain().focus().updateAttributes('image', { class: newClass }).run();
                                    }
                                }}
                                title="Align Right"
                            >
                                <AlignRight size={16} />
                            </ToolbarButton>
                        </div>

                        {/* Image Size Dropdown */}
                        <div className="relative" ref={imageSizeRef}>
                            <DropdownButton
                                onClick={() => setShowImageSizeMenu(!showImageSizeMenu)}
                                isOpen={showImageSizeMenu}
                                title="Resize Image"
                            >
                                <Maximize2 size={16} />
                            </DropdownButton>
                            {showImageSizeMenu && (
                                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[140px] z-50">
                                    <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">Image Size</div>
                                    {['small', 'medium', 'large', 'full'].map((size) => (
                                        <button
                                            key={size}
                                            onClick={() => {
                                                const { state } = editor;
                                                const { selection } = state;
                                                const node = state.doc.nodeAt(selection.from);
                                                if (node?.type.name === 'image') {
                                                    const currentClass = node.attrs.class || 'email-resizable-image';
                                                    const newClass = currentClass.replace(/size-(small|medium|large|full)/g, '').trim() + ` size-${size}`;
                                                    editor.chain().focus().updateAttributes('image', { class: newClass }).run();
                                                }
                                                setShowImageSizeMenu(false);
                                            }}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-left"
                                        >
                                            {size === 'small' ? <Minimize2 size={14} /> : <Maximize2 size={14} className={size === 'full' ? 'text-blue-600' : ''} />}
                                            {size.charAt(0).toUpperCase() + size.slice(1)} {size === 'small' ? '(200px)' : size === 'medium' ? '(400px)' : size === 'large' ? '(600px)' : 'Width'}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                <ToolbarButton
                    onClick={() => editor?.chain().focus().setHorizontalRule().run()}
                    title="Horizontal Rule"
                >
                    <HrIcon size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => {
                        if (editor?.isActive('blockquote')) {
                            editor?.chain().focus().lift('blockquote').run();
                        } else {
                            editor?.chain().focus().setBlockquote().run();
                        }
                    }}
                    isActive={editor?.isActive('blockquote')}
                    title="Quote (toggle)"
                >
                    <Quote size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
                    title="Insert Table"
                >
                    <TableIcon size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => {
                        const url = prompt('Enter YouTube URL');
                        if (url) editor?.chain().focus().setYoutubeVideo({ src: url }).run();
                    }}
                    title="Insert YouTube Video"
                >
                    <YoutubeIcon size={16} />
                </ToolbarButton>
                <ToolbarButton
                    onClick={() => editor?.chain().focus().clearNodes().unsetAllMarks().run()}
                    title="Clear Formatting"
                >
                    <RemoveFormatting size={16} />
                </ToolbarButton>

                {/* Insert Shapes */}
                <div className="relative" ref={shapeRef}>
                    <DropdownButton
                        onClick={() => setShowShapeMenu(!showShapeMenu)}
                        isOpen={showShapeMenu}
                        title="Insert Shape"
                    >
                        <Shapes size={16} />
                    </DropdownButton>
                    {showShapeMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[160px] z-50">
                            <div className="px-3 py-1 text-xs font-medium text-gray-500 uppercase">Shapes</div>
                            <button onClick={() => handleInsertShape('rectangle')} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-left">
                                <Square size={16} /> Rectangle
                            </button>
                            <button onClick={() => handleInsertShape('circle')} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-left">
                                <Circle size={16} /> Circle
                            </button>
                            <button onClick={() => handleInsertShape('triangle')} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-left">
                                <Triangle size={16} /> Triangle
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            <button onClick={() => handleInsertShape('line')} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-left">
                                <HrIcon size={16} /> Line
                            </button>
                            <button onClick={() => handleInsertShape('arrow')} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 text-left">
                                <ArrowRight size={16} /> Arrow
                            </button>
                        </div>
                    )}
                </div>

                <div className="w-px h-5 bg-gray-300 mx-1" />

                {/* Attachment Button */}
                <div className="relative" ref={attachmentRef}>
                    <DropdownButton
                        onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
                        isOpen={showAttachmentMenu}
                        title="Attachments"
                    >
                        <Paperclip size={16} />
                        {attachments.length > 0 && (
                            <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-1.5 rounded-full">
                                {attachments.length}
                            </span>
                        )}
                    </DropdownButton>
                    {showAttachmentMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 p-2 min-w-[200px] z-50">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingAttachment}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-100 rounded-md"
                            >
                                <FileUp size={16} />
                                {uploadingAttachment ? 'Uploading...' : 'Attach File'}
                            </button>
                            {attachments.length > 0 && (
                                <>
                                    <div className="border-t border-gray-200 my-2" />
                                    <div className="text-xs text-gray-500 px-3 mb-1">Attached Files</div>
                                    {attachments.map((file, i) => (
                                        <div key={i} className="flex items-center justify-between px-3 py-1.5 text-sm hover:bg-gray-50 rounded">
                                            <span className="truncate flex-1 mr-2">{file.name}</span>
                                            <button onClick={() => removeAttachment(i)} className="text-gray-400 hover:text-red-500">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Templates */}
                <div className="relative" ref={templateRef}>
                    <DropdownButton
                        onClick={() => setShowTemplateMenu(!showTemplateMenu)}
                        isOpen={showTemplateMenu}
                        title="Email Templates"
                    >
                        <LayoutTemplate size={16} />
                    </DropdownButton>
                    {showTemplateMenu && (
                        <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[220px] z-50 max-h-80 overflow-y-auto">
                            <div className="px-3 py-2 text-xs font-semibold text-gray-500 border-b border-gray-100">
                                Email Templates
                            </div>
                            {emailTemplates.map(template => (
                                <button
                                    key={template.id}
                                    onClick={() => applyTemplate(template)}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left"
                                >
                                    <span className="text-lg">{template.icon}</span>
                                    <span className="text-sm font-medium text-gray-800">{template.name}</span>
                                </button>
                            ))}
                            <div className="border-t border-gray-200 mt-1">
                                <button
                                    onClick={() => {
                                        setShowTemplateMenu(false);
                                        setShowGTMTemplateMenu(true);
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 text-left text-blue-600"
                                >
                                    <FileText size={16} />
                                    <span className="text-sm font-medium">Browse GTM Templates...</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* AI Actions Button */}
                <div className="relative">
                    <button
                        ref={aiButtonRef}
                        type="button"
                        onClick={toggleAiMenu}
                        disabled={aiProcessing}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-lg hover:from-purple-600 hover:to-indigo-600 transition-all text-sm font-medium disabled:opacity-50 shadow-sm"
                    >
                        {aiProcessing ? (
                            <>
                                <span className="animate-spin">⟳</span>
                                <span>{aiActionLabel}</span>
                            </>
                        ) : (
                            <>
                                <span>✨</span>
                                <span>AI Assist</span>
                                <span>▼</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Status Bar */}
            <div className="flex items-center justify-between px-3 py-1 text-xs text-gray-500 border-t border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-3">
                    {editor?.isActive('bold') && <span className="px-1.5 py-0.5 bg-gray-200 rounded">Bold</span>}
                    {editor?.isActive('italic') && <span className="px-1.5 py-0.5 bg-gray-200 rounded">Italic</span>}
                    {editor?.isActive('underline') && <span className="px-1.5 py-0.5 bg-gray-200 rounded">Underline</span>}
                    {editor?.isActive('link') && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Link</span>}
                    {editor?.isActive('bulletList') && <span className="px-1.5 py-0.5 bg-gray-200 rounded">Bullet List</span>}
                    {editor?.isActive('orderedList') && <span className="px-1.5 py-0.5 bg-gray-200 rounded">Numbered List</span>}
                </div>
                <div>
                    {editor?.storage.characterCount?.characters()} characters
                </div>
            </div>
        </div>
    );
}

export default EditorToolbar;
