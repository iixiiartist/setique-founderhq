/**
 * Content Studio Module
 * Canvas-based document creation with AI assistance
 * Powered by React-Konva
 */

// Main Component
export { ContentStudio } from './ContentStudio';
export { default } from './ContentStudio';

// Konva Components (new architecture)
export { 
  ContentStudioKonva,
  KonvaProvider,
  useKonvaContext,
  KonvaElementToolbar,
  KonvaLayersPanel,
  KonvaPropertiesPanel,
} from './konva';

// Konva Types
export type {
  KonvaDocument,
} from './konva';

export * from './konva/types';
export {
  PAGE_SIZES,
  DEFAULT_DOCUMENT_SETTINGS,
} from './types';
