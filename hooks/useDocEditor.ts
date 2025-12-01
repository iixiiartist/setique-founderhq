/**
 * useDocEditor Hook
 * 
 * Extracts core document editor logic from DocEditor.tsx.
 * Owns the Tiptap editor instance, extension configuration, and persistence.
 * Allows toolbar, bubble menu, and export components to share the same editor state.
 * 
 * Benefits:
 * - Separates editor logic from UI components
 * - Makes editor configuration reusable
 * - Enables testing of editor logic independently
 * - Allows other editors to use the same extension config
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useEditor, type Editor } from '@tiptap/react';
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
import DOMPurify from 'dompurify';
import { DocType, DocVisibility, StructuredBlock, StructuredBlockMap } from '../types';

// Types
export interface UseDocEditorOptions {
  /** Workspace ID for saving */
  workspaceId: string;
  /** Current user ID */
  userId: string;
  /** Document ID (undefined for new doc) */
  docId?: string;
  /** Initial document content */
  initialContent?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Enable collaboration features */
  enableCollab?: boolean;
  /** Y.js document for collaboration */
  ydoc?: any;
  /** Collaboration provider */
  provider?: any;
  /** Callback when content changes */
  onChange?: (html: string) => void;
  /** Callback when editor is ready */
  onReady?: (editor: Editor) => void;
  /** Custom extensions to add */
  customExtensions?: any[];
}

export interface UseDocEditorReturn {
  // Editor instance
  editor: Editor | null;
  editorRef: React.RefObject<Editor | null>;
  
  // Document state
  title: string;
  setTitle: (title: string) => void;
  docType: DocType;
  setDocType: (type: DocType) => void;
  visibility: DocVisibility;
  setVisibility: (visibility: DocVisibility) => void;
  tags: string[];
  setTags: (tags: string[]) => void;
  
  // Editor state
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  lastSavedAt: Date | null;
  characterCount: number;
  wordCount: number;
  
  // Block metadata (for canvas mode)
  blocksMetadata: StructuredBlockMap;
  persistBlockMetadata: (block: StructuredBlock) => void;
  removeBlockMetadata: (blockId: string) => void;
  subscribeToBlockMetadata: (blockId: string, listener: (metadata?: StructuredBlock) => void) => () => void;
  
  // Actions
  save: () => Promise<void>;
  getHTML: () => string;
  getJSON: () => any;
  getText: () => string;
  setContent: (content: string) => void;
  clear: () => void;
  focus: () => void;
  
  // Command helpers
  commands: EditorCommands;
}

export interface EditorCommands {
  // Text formatting
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  toggleStrike: () => void;
  toggleSubscript: () => void;
  toggleSuperscript: () => void;
  
  // Text color
  setColor: (color: string) => void;
  unsetColor: () => void;
  setHighlight: (color: string) => void;
  unsetHighlight: () => void;
  
  // Alignment
  setTextAlign: (align: 'left' | 'center' | 'right' | 'justify') => void;
  
  // Lists
  toggleBulletList: () => void;
  toggleOrderedList: () => void;
  toggleTaskList: () => void;
  
  // Headings
  setHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) => void;
  setParagraph: () => void;
  
  // Links
  setLink: (url: string) => void;
  unsetLink: () => void;
  
  // Tables
  insertTable: (rows?: number, cols?: number) => void;
  deleteTable: () => void;
  addRowBefore: () => void;
  addRowAfter: () => void;
  deleteRow: () => void;
  addColumnBefore: () => void;
  addColumnAfter: () => void;
  deleteColumn: () => void;
  
  // Media
  insertImage: (src: string, alt?: string) => void;
  insertYoutubeVideo: (url: string) => void;
  
  // Block operations
  insertHorizontalRule: () => void;
  insertCodeBlock: () => void;
  
  // History
  undo: () => void;
  redo: () => void;
  
  // Selection
  selectAll: () => void;
}

// DOMPurify configuration
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'strong', 'em', 'b', 'i', 'u', 's',
    'blockquote', 'pre', 'code', 'span', 'div',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
    'img', 'figure', 'figcaption', 'hr',
    'sub', 'sup', 'mark',
  ],
  ALLOWED_ATTR: [
    'href', 'src', 'alt', 'title', 'class', 'id', 'target', 'rel',
    'style', 'width', 'height', 'data-*', 'colspan', 'rowspan',
  ],
  ALLOW_DATA_ATTR: true,
  FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'button', 'textarea', 'select'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
};

/**
 * Get the default extension configuration for the document editor.
 * This can be customized or extended as needed.
 */
export function getDefaultExtensions(options: {
  placeholder?: string;
  ydoc?: any;
  provider?: any;
  enableCollab?: boolean;
} = {}) {
  const { placeholder = 'Start writing...', ydoc, provider, enableCollab = false } = options;

  const extensions: any[] = [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6],
      },
    }),
    Placeholder.configure({
      placeholder,
      emptyEditorClass: 'is-editor-empty',
      emptyNodeClass: 'is-empty',
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
        class: 'text-blue-600 underline',
      },
    }),
    FontFamily,
    Typography,
    CharacterCount,
    Focus.configure({
      className: 'has-focus',
      mode: 'all',
    }),
    Youtube.configure({
      inline: false,
      nocookie: true,
    }),
  ];

  return extensions;
}

/**
 * Create editor command helpers that wrap common operations
 */
function createEditorCommands(editor: Editor | null): EditorCommands {
  const chain = () => editor?.chain().focus();
  
  return {
    // Text formatting
    toggleBold: () => chain()?.toggleBold().run(),
    toggleItalic: () => chain()?.toggleItalic().run(),
    toggleUnderline: () => chain()?.toggleUnderline().run(),
    toggleStrike: () => chain()?.toggleStrike().run(),
    toggleSubscript: () => chain()?.toggleSubscript().run(),
    toggleSuperscript: () => chain()?.toggleSuperscript().run(),
    
    // Text color
    setColor: (color) => chain()?.setColor(color).run(),
    unsetColor: () => chain()?.unsetColor().run(),
    setHighlight: (color) => chain()?.setHighlight({ color }).run(),
    unsetHighlight: () => chain()?.unsetHighlight().run(),
    
    // Alignment
    setTextAlign: (align) => chain()?.setTextAlign(align).run(),
    
    // Lists
    toggleBulletList: () => chain()?.toggleBulletList().run(),
    toggleOrderedList: () => chain()?.toggleOrderedList().run(),
    toggleTaskList: () => chain()?.toggleTaskList().run(),
    
    // Headings
    setHeading: (level) => chain()?.toggleHeading({ level }).run(),
    setParagraph: () => chain()?.setParagraph().run(),
    
    // Links
    setLink: (url) => chain()?.setLink({ href: url }).run(),
    unsetLink: () => chain()?.unsetLink().run(),
    
    // Tables
    insertTable: (rows = 3, cols = 3) => chain()?.insertTable({ rows, cols, withHeaderRow: true }).run(),
    deleteTable: () => chain()?.deleteTable().run(),
    addRowBefore: () => chain()?.addRowBefore().run(),
    addRowAfter: () => chain()?.addRowAfter().run(),
    deleteRow: () => chain()?.deleteRow().run(),
    addColumnBefore: () => chain()?.addColumnBefore().run(),
    addColumnAfter: () => chain()?.addColumnAfter().run(),
    deleteColumn: () => chain()?.deleteColumn().run(),
    
    // Media
    insertImage: (src, alt = '') => {
      chain()?.setImage({ src, alt }).run();
    },
    insertYoutubeVideo: (url) => chain()?.setYoutubeVideo({ src: url }).run(),
    
    // Block operations
    insertHorizontalRule: () => chain()?.setHorizontalRule().run(),
    insertCodeBlock: () => chain()?.toggleCodeBlock().run(),
    
    // History
    undo: () => chain()?.undo().run(),
    redo: () => chain()?.redo().run(),
    
    // Selection
    selectAll: () => chain()?.selectAll().run(),
  };
}

export function useDocEditor(options: UseDocEditorOptions): UseDocEditorReturn {
  const {
    workspaceId,
    userId,
    docId,
    initialContent = '',
    placeholder = 'Start writing...',
    enableCollab = false,
    ydoc,
    provider,
    onChange,
    onReady,
    customExtensions = [],
  } = options;

  // Document state
  const [title, setTitle] = useState('Untitled Document');
  const [docType, setDocType] = useState<DocType>('brief');
  const [visibility, setVisibility] = useState<DocVisibility>('team');
  const [tags, setTags] = useState<string[]>([]);
  
  // Editor state
  const [isLoading, setIsLoading] = useState(!!docId);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  
  // Refs
  const editorRef = useRef<Editor | null>(null);
  const isDirtyRef = useRef(false);
  const lastSavedContentHashRef = useRef<string | null>(null);
  
  // Block metadata state (for canvas mode)
  const [blocksMetadata, setBlocksMetadata] = useState<StructuredBlockMap>({});
  const blocksMetadataRef = useRef<StructuredBlockMap>({});
  const blockMetadataSubscribers = useRef<Map<string, Set<(metadata?: StructuredBlock) => void>>>(new Map());

  // Get extensions
  const extensions = useMemo(() => {
    return [
      ...getDefaultExtensions({ placeholder, ydoc, provider, enableCollab }),
      ...customExtensions,
    ];
  }, [placeholder, ydoc, provider, enableCollab, customExtensions]);

  // Create editor instance
  const editor = useEditor({
    extensions,
    content: initialContent,
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[500px] max-w-none',
      },
    },
    onUpdate: ({ editor }) => {
      isDirtyRef.current = true;
      onChange?.(editor.getHTML());
    },
    onCreate: ({ editor }) => {
      editorRef.current = editor;
      onReady?.(editor);
    },
  });

  // Update ref when editor changes
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Block metadata management
  const notifyBlockMetadata = useCallback((blockId: string, metadata?: StructuredBlock) => {
    const listeners = blockMetadataSubscribers.current.get(blockId);
    if (!listeners || !listeners.size) return;
    listeners.forEach(listener => {
      try {
        listener(metadata);
      } catch (error) {
        console.warn('Block metadata listener error', error);
      }
    });
  }, []);

  const subscribeToBlockMetadata = useCallback((
    blockId: string,
    listener: (metadata?: StructuredBlock) => void
  ) => {
    if (!blockId) return () => undefined;
    
    const map = blockMetadataSubscribers.current;
    let listeners = map.get(blockId);
    if (!listeners) {
      listeners = new Set();
      map.set(blockId, listeners);
    }
    listeners.add(listener);

    const snapshot = blocksMetadataRef.current[blockId];
    if (snapshot) listener(snapshot);

    return () => {
      const nextListeners = map.get(blockId);
      if (!nextListeners) return;
      nextListeners.delete(listener);
      if (!nextListeners.size) map.delete(blockId);
    };
  }, []);

  const persistBlockMetadata = useCallback((block: StructuredBlock) => {
    if (!block?.id) return;

    setBlocksMetadata(prev => {
      const next = { ...prev, [block.id]: block };
      blocksMetadataRef.current = next;
      return next;
    });
    notifyBlockMetadata(block.id, block);
  }, [notifyBlockMetadata]);

  const removeBlockMetadata = useCallback((blockId: string) => {
    if (!blockId) return;

    setBlocksMetadata(prev => {
      if (!prev[blockId]) return prev;
      const next = { ...prev };
      delete next[blockId];
      blocksMetadataRef.current = next;
      return next;
    });
    notifyBlockMetadata(blockId, undefined);
  }, [notifyBlockMetadata]);

  // Content helpers
  const getHTML = useCallback((): string => {
    if (!editor) return '';
    const html = editor.getHTML();
    return DOMPurify.sanitize(html, SANITIZE_CONFIG) as string;
  }, [editor]);

  const getJSON = useCallback(() => {
    return editor?.getJSON() || null;
  }, [editor]);

  const getText = useCallback(() => {
    return editor?.getText() || '';
  }, [editor]);

  const setContent = useCallback((content: string) => {
    editor?.commands.setContent(content);
  }, [editor]);

  const clear = useCallback(() => {
    editor?.commands.clearContent();
  }, [editor]);

  const focus = useCallback(() => {
    editor?.commands.focus();
  }, [editor]);

  // Save function (to be implemented with actual persistence)
  const save = useCallback(async () => {
    if (!editor) return;
    
    setIsSaving(true);
    try {
      const html = getHTML();
      // TODO: Implement actual save logic
      // This should be injected via options or context
      console.log('[useDocEditor] Saving document...', { title, htmlLength: html.length });
      
      isDirtyRef.current = false;
      setLastSavedAt(new Date());
    } finally {
      setIsSaving(false);
    }
  }, [editor, title, getHTML]);

  // Create command helpers
  const commands = useMemo(() => createEditorCommands(editor), [editor]);

  // Character and word count
  const characterCount = editor?.storage.characterCount?.characters() || 0;
  const wordCount = editor?.storage.characterCount?.words() || 0;

  return {
    // Editor instance
    editor,
    editorRef,
    
    // Document state
    title,
    setTitle,
    docType,
    setDocType,
    visibility,
    setVisibility,
    tags,
    setTags,
    
    // Editor state
    isLoading,
    isSaving,
    isDirty: isDirtyRef.current,
    lastSavedAt,
    characterCount,
    wordCount,
    
    // Block metadata
    blocksMetadata,
    persistBlockMetadata,
    removeBlockMetadata,
    subscribeToBlockMetadata,
    
    // Actions
    save,
    getHTML,
    getJSON,
    getText,
    setContent,
    clear,
    focus,
    
    // Command helpers
    commands,
  };
}

export default useDocEditor;
