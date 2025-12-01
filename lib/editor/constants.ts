/**
 * Shared editor constants for DocEditor, EmailComposer, and RichTextEditor.
 * Consolidates duplicate font, color, and formatting options.
 */

// Font family options with ID for selects
export const FONT_FAMILIES = [
  { id: 'system', name: 'Default', value: 'ui-sans-serif, system-ui, sans-serif' },
  { id: 'arial', name: 'Arial', value: 'Arial, sans-serif' },
  { id: 'helvetica', name: 'Helvetica', value: 'Helvetica, sans-serif' },
  { id: 'times', name: 'Times New Roman', value: '"Times New Roman", serif' },
  { id: 'georgia', name: 'Georgia', value: 'Georgia, serif' },
  { id: 'garamond', name: 'Garamond', value: 'Garamond, serif' },
  { id: 'courier', name: 'Courier New', value: '"Courier New", monospace' },
  { id: 'verdana', name: 'Verdana', value: 'Verdana, sans-serif' },
  { id: 'trebuchet', name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { id: 'comic-sans', name: 'Comic Sans MS', value: '"Comic Sans MS", cursive' },
  { id: 'impact', name: 'Impact', value: 'Impact, sans-serif' },
  { id: 'lucida', name: 'Lucida Console', value: '"Lucida Console", monospace' },
  { id: 'palatino', name: 'Palatino', value: '"Palatino Linotype", serif' },
  { id: 'book-antiqua', name: 'Book Antiqua', value: '"Book Antiqua", serif' },
  { id: 'tahoma', name: 'Tahoma', value: 'Tahoma, sans-serif' },
  { id: 'century-gothic', name: 'Century Gothic', value: '"Century Gothic", sans-serif' },
  { id: 'copperplate', name: 'Copperplate', value: 'Copperplate, fantasy' },
  { id: 'brush-script', name: 'Brush Script MT', value: '"Brush Script MT", cursive' },
  { id: 'rockwell', name: 'Rockwell', value: 'Rockwell, serif' },
  { id: 'futura', name: 'Futura', value: 'Futura, sans-serif' },
  { id: 'optima', name: 'Optima', value: 'Optima, sans-serif' },
  { id: 'didot', name: 'Didot', value: 'Didot, serif' },
  { id: 'american-typewriter', name: 'American Typewriter', value: '"American Typewriter", serif' },
  { id: 'baskerville', name: 'Baskerville', value: 'Baskerville, serif' },
  { id: 'bodoni', name: 'Bodoni', value: '"Bodoni MT", serif' },
  { id: 'cambria', name: 'Cambria', value: 'Cambria, serif' },
  { id: 'candara', name: 'Candara', value: 'Candara, sans-serif' },
  { id: 'constantia', name: 'Constantia', value: 'Constantia, serif' },
  { id: 'corbel', name: 'Corbel', value: 'Corbel, sans-serif' },
  { id: 'franklin-gothic', name: 'Franklin Gothic', value: '"Franklin Gothic Medium", sans-serif' },
  { id: 'gill-sans', name: 'Gill Sans', value: '"Gill Sans", sans-serif' },
  { id: 'inter', name: 'Inter', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { id: 'roboto', name: 'Roboto', value: 'Roboto, ui-sans-serif, system-ui, sans-serif' }
] as const;

// Simple font options for email/basic editors
export const SIMPLE_FONT_FAMILIES = [
  { id: 'system', name: 'Default', value: 'ui-sans-serif, system-ui, sans-serif' },
  { id: 'arial', name: 'Arial', value: 'Arial, sans-serif' },
  { id: 'times', name: 'Times New Roman', value: '"Times New Roman", serif' },
  { id: 'georgia', name: 'Georgia', value: 'Georgia, serif' },
  { id: 'courier', name: 'Courier New', value: '"Courier New", monospace' },
  { id: 'verdana', name: 'Verdana', value: 'Verdana, sans-serif' },
  { id: 'trebuchet', name: 'Trebuchet MS', value: '"Trebuchet MS", sans-serif' },
  { id: 'tahoma', name: 'Tahoma', value: 'Tahoma, sans-serif' },
  { id: 'inter', name: 'Inter', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { id: 'roboto', name: 'Roboto', value: 'Roboto, ui-sans-serif, system-ui, sans-serif' }
] as const;

// Font size options
export const FONT_SIZES = [
  { name: '8pt', value: '8pt' },
  { name: '9pt', value: '9pt' },
  { name: '10pt', value: '10pt' },
  { name: '11pt', value: '11pt' },
  { name: '12pt', value: '12pt' },
  { name: '14pt', value: '14pt' },
  { name: '16pt', value: '16pt' },
  { name: '18pt', value: '18pt' },
  { name: '20pt', value: '20pt' },
  { name: '24pt', value: '24pt' },
  { name: '28pt', value: '28pt' },
  { name: '32pt', value: '32pt' },
  { name: '36pt', value: '36pt' },
  { name: '48pt', value: '48pt' },
  { name: '72pt', value: '72pt' }
] as const;

// Line spacing options
export const LINE_SPACING_OPTIONS = [
  { name: 'Single', value: '1' },
  { name: '1.15', value: '1.15' },
  { name: '1.5', value: '1.5' },
  { name: 'Double', value: '2' },
  { name: '2.5', value: '2.5' },
  { name: '3', value: '3' }
] as const;

// Heading levels
export const HEADING_LEVELS = [
  { name: 'Normal', value: 0 },
  { name: 'Heading 1', value: 1 },
  { name: 'Heading 2', value: 2 },
  { name: 'Heading 3', value: 3 },
  { name: 'Heading 4', value: 4 },
  { name: 'Heading 5', value: 5 },
  { name: 'Heading 6', value: 6 }
] as const;

// Text colors - primary palette
export const TEXT_COLORS = [
  { name: 'Black', value: '#000000' },
  { name: 'Dark Gray', value: '#374151' },
  { name: 'Gray', value: '#6B7280' },
  { name: 'Light Gray', value: '#9CA3AF' },
  { name: 'White', value: '#FFFFFF' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Green', value: '#22C55E' },
  { name: 'Emerald', value: '#10B981' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Purple', value: '#A855F7' },
  { name: 'Fuchsia', value: '#D946EF' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Rose', value: '#F43F5E' }
] as const;

// Highlight/background colors
export const HIGHLIGHT_COLORS = [
  { name: 'None', value: '' },
  { name: 'Yellow', value: '#FEF08A' },
  { name: 'Lime', value: '#D9F99D' },
  { name: 'Green', value: '#BBF7D0' },
  { name: 'Cyan', value: '#A5F3FC' },
  { name: 'Blue', value: '#BFDBFE' },
  { name: 'Purple', value: '#DDD6FE' },
  { name: 'Pink', value: '#FBCFE8' },
  { name: 'Orange', value: '#FED7AA' },
  { name: 'Red', value: '#FECACA' },
  { name: 'Gray', value: '#E5E7EB' }
] as const;

// Table border styles
export const TABLE_BORDER_STYLES = [
  { name: 'None', value: 'none' },
  { name: 'Solid', value: 'solid' },
  { name: 'Dashed', value: 'dashed' },
  { name: 'Dotted', value: 'dotted' },
  { name: 'Double', value: 'double' }
] as const;

// Alignment options
export const TEXT_ALIGNMENTS = [
  { name: 'Left', value: 'left', icon: 'AlignLeft' },
  { name: 'Center', value: 'center', icon: 'AlignCenter' },
  { name: 'Right', value: 'right', icon: 'AlignRight' },
  { name: 'Justify', value: 'justify', icon: 'AlignJustify' }
] as const;

// List types
export const LIST_TYPES = [
  { name: 'Bullet List', value: 'bulletList', icon: 'List' },
  { name: 'Numbered List', value: 'orderedList', icon: 'ListOrdered' },
  { name: 'Task List', value: 'taskList', icon: 'ListTodo' }
] as const;

// Default editor settings
export const DEFAULT_EDITOR_SETTINGS = {
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
  fontSize: '12pt',
  lineSpacing: '1.5',
  textColor: '#000000',
  highlightColor: '',
  textAlign: 'left'
} as const;

// Document page sizes (in pixels at 96 DPI)
export const PAGE_SIZES = {
  letter: { width: 816, height: 1056, name: 'Letter (8.5" × 11")' },
  legal: { width: 816, height: 1344, name: 'Legal (8.5" × 14")' },
  a4: { width: 794, height: 1123, name: 'A4 (210mm × 297mm)' },
  a3: { width: 1123, height: 1587, name: 'A3 (297mm × 420mm)' },
  tabloid: { width: 1056, height: 1632, name: 'Tabloid (11" × 17")' }
} as const;

// Margin presets (in pixels)
export const MARGIN_PRESETS = {
  normal: { top: 96, right: 96, bottom: 96, left: 96, name: 'Normal (1")' },
  narrow: { top: 48, right: 48, bottom: 48, left: 48, name: 'Narrow (0.5")' },
  moderate: { top: 96, right: 72, bottom: 96, left: 72, name: 'Moderate' },
  wide: { top: 96, right: 144, bottom: 96, left: 144, name: 'Wide (1.5")' }
} as const;

// Export format options
export const EXPORT_FORMATS = [
  { name: 'PDF', value: 'pdf', icon: 'FileText', description: 'Best for sharing and printing' },
  { name: 'Word Document', value: 'docx', icon: 'FileText', description: 'Editable in Microsoft Word' },
  { name: 'Markdown', value: 'md', icon: 'FileCode', description: 'Plain text with formatting' },
  { name: 'HTML', value: 'html', icon: 'Code', description: 'Web page format' },
  { name: 'Plain Text', value: 'txt', icon: 'FileText', description: 'No formatting' }
] as const;

// Keyboard shortcuts for editor
export const EDITOR_SHORTCUTS = {
  bold: { key: 'b', modifier: 'mod', description: 'Bold' },
  italic: { key: 'i', modifier: 'mod', description: 'Italic' },
  underline: { key: 'u', modifier: 'mod', description: 'Underline' },
  strikethrough: { key: 's', modifier: 'mod+shift', description: 'Strikethrough' },
  undo: { key: 'z', modifier: 'mod', description: 'Undo' },
  redo: { key: 'z', modifier: 'mod+shift', description: 'Redo' },
  save: { key: 's', modifier: 'mod', description: 'Save' },
  find: { key: 'f', modifier: 'mod', description: 'Find' },
  selectAll: { key: 'a', modifier: 'mod', description: 'Select All' },
  heading1: { key: '1', modifier: 'mod+alt', description: 'Heading 1' },
  heading2: { key: '2', modifier: 'mod+alt', description: 'Heading 2' },
  heading3: { key: '3', modifier: 'mod+alt', description: 'Heading 3' },
  bulletList: { key: '8', modifier: 'mod+shift', description: 'Bullet List' },
  numberedList: { key: '7', modifier: 'mod+shift', description: 'Numbered List' },
  link: { key: 'k', modifier: 'mod', description: 'Insert Link' },
  code: { key: 'e', modifier: 'mod', description: 'Code' },
  codeBlock: { key: 'e', modifier: 'mod+shift', description: 'Code Block' },
  blockquote: { key: 'b', modifier: 'mod+shift', description: 'Blockquote' },
  horizontalRule: { key: '-', modifier: 'mod', description: 'Horizontal Rule' }
} as const;

// Type exports for external use
export type FontFamily = typeof FONT_FAMILIES[number];
export type FontSize = typeof FONT_SIZES[number];
export type LineSpacing = typeof LINE_SPACING_OPTIONS[number];
export type TextColor = typeof TEXT_COLORS[number];
export type HighlightColor = typeof HIGHLIGHT_COLORS[number];
export type HeadingLevel = typeof HEADING_LEVELS[number];
export type TextAlignment = typeof TEXT_ALIGNMENTS[number];
export type PageSize = keyof typeof PAGE_SIZES;
export type MarginPreset = keyof typeof MARGIN_PRESETS;
export type ExportFormat = typeof EXPORT_FORMATS[number];
