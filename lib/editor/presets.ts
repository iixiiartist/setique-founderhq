/**
 * Editor Extension Presets
 * 
 * Shared TipTap extension configurations for different editor types.
 * This consolidates duplicate extension setups from:
 * - components/workspace/DocEditor.tsx
 * - components/email/composer/EmailComposerRefactored.tsx
 * - hooks/useDocEditor.ts
 * 
 * Benefits:
 * - Single source of truth for extension configurations
 * - Consistent behavior across all editors
 * - Easier maintenance and updates
 * - Reduced bundle duplication
 */

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
import Image from '@tiptap/extension-image';
import type { AnyExtension } from '@tiptap/core';

// Custom extensions (only import what's available)
import { FontSize } from '../tiptap/FontSize';

// =====================================================
// Preset Types
// =====================================================

export type EditorPreset = 'basic' | 'email' | 'document' | 'canvas';

export interface PresetOptions {
  /** Placeholder text when editor is empty */
  placeholder?: string;
  /** Max character limit (for character count extension) */
  characterLimit?: number;
  /** Enable collaboration features */
  enableCollab?: boolean;
  /** Y.js document for collaboration */
  ydoc?: any;
  /** Collaboration provider */
  provider?: any;
  /** Custom CSS class for links */
  linkClass?: string;
  /** Whether links should open on click */
  linksOpenOnClick?: boolean;
}

// =====================================================
// Shared Base Extensions
// =====================================================

/**
 * Core extensions used by all editor presets
 */
function getBaseExtensions(options: PresetOptions = {}) {
  const {
    placeholder = 'Start writing...',
    linkClass = 'text-blue-600 underline',
    linksOpenOnClick = false,
  } = options;

  return [
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
    Underline,
    Link.configure({
      openOnClick: linksOpenOnClick,
      HTMLAttributes: {
        class: linkClass,
      },
    }),
  ];
}

// =====================================================
// Preset Configurations
// =====================================================

/**
 * Basic preset - minimal formatting for simple text editing
 * Use cases: Notes, comments, simple text fields
 */
export function getBasicExtensions(options: PresetOptions = {}) {
  return [
    ...getBaseExtensions(options),
    Highlight.configure({
      multicolor: true,
    }),
  ];
}

/**
 * Email preset - optimized for email composition
 * Use cases: Email composer, quick replies
 * Includes: Basic formatting, links, images, tables
 */
export function getEmailExtensions(options: PresetOptions = {}) {
  const {
    placeholder = 'Compose your email...',
  } = options;

  return [
    ...getBaseExtensions({ ...options, placeholder }),
    FontSize,
    FontFamily,
    Highlight.configure({
      multicolor: true,
    }),
    Subscript,
    Superscript,
    Image.configure({
      inline: false,
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
    Youtube.configure({
      inline: false,
      nocookie: true,
    }),
  ];
}

/**
 * Document preset - full-featured for document editing
 * Use cases: GTM docs, rich documents, templates
 * Includes: All formatting, tables, tasks, character count
 */
export function getDocumentExtensions(options: PresetOptions = {}): any[] {
  const {
    placeholder = 'Start writing your document...',
    characterLimit,
  } = options;

  const extensions: any[] = [
    ...getBaseExtensions({ ...options, placeholder }),
    FontSize,
    FontFamily,
    Highlight.configure({
      multicolor: true,
    }),
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
    Typography,
    Focus.configure({
      className: 'has-focus',
      mode: 'all',
    }),
    Youtube.configure({
      inline: false,
      nocookie: true,
    }),
  ];

  // Add character count with optional limit
  if (characterLimit) {
    extensions.push(
      CharacterCount.configure({
        limit: characterLimit,
      })
    );
  } else {
    extensions.push(CharacterCount);
  }

  return extensions;
}

/**
 * Canvas preset - for visual document editing with shapes, frames, etc.
 * Use cases: GTM canvas mode, visual documents
 * Includes: Document extensions + visual elements
 * Note: Canvas-specific extensions (shapes, frames) should be added by the component
 */
export function getCanvasExtensions(options: PresetOptions = {}) {
  return [
    ...getDocumentExtensions(options),
    // Canvas-specific extensions are added by DocEditor component
    // as they require custom implementation (ShapeNode, FrameNode, etc.)
  ];
}

// =====================================================
// Preset Factory
// =====================================================

/**
 * Get extensions for a specific editor preset
 */
export function getExtensionsForPreset(
  preset: EditorPreset,
  options: PresetOptions = {}
): any[] {
  switch (preset) {
    case 'basic':
      return getBasicExtensions(options);
    case 'email':
      return getEmailExtensions(options);
    case 'document':
      return getDocumentExtensions(options);
    case 'canvas':
      return getCanvasExtensions(options);
    default:
      return getBasicExtensions(options);
  }
}

// =====================================================
// Collaboration Extensions
// =====================================================

/**
 * Get collaboration extensions for real-time editing
 * Must be used with a Y.js document and provider
 */
export function getCollaborationExtensions(options: {
  ydoc: any;
  provider: any;
  user?: { name: string; color: string };
}) {
  const { ydoc, provider, user } = options;
  
  // Dynamic import to avoid bundling if not used
  const extensions: any[] = [];
  
  // These would need to be imported dynamically or passed in
  // as they require the collaboration packages
  // Collaboration.configure({ document: ydoc }),
  // CollaborationCursor.configure({ provider, user }),
  
  return extensions;
}

// Re-export getBaseExtensions (not exported with 'export function')
export { getBaseExtensions };
