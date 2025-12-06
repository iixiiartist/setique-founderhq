/**
 * Content Studio Types
 * Shared types for the Content Studio module
 */

// ============================================================================
// Page Size Presets
// ============================================================================

export const PAGE_SIZES = {
  // Social Media
  'instagram-post': { width: 1080, height: 1080, label: 'Instagram Post' },
  'instagram-story': { width: 1080, height: 1920, label: 'Instagram Story' },
  'facebook-post': { width: 1200, height: 630, label: 'Facebook Post' },
  'twitter-post': { width: 1200, height: 675, label: 'Twitter Post' },
  'linkedin-post': { width: 1200, height: 627, label: 'LinkedIn Post' },
  
  // Video Thumbnails
  'youtube-thumbnail': { width: 1280, height: 720, label: 'YouTube Thumbnail' },
  
  // Print Sizes
  'a4-portrait': { width: 2480, height: 3508, label: 'A4 Portrait' },
  'a4-landscape': { width: 3508, height: 2480, label: 'A4 Landscape' },
  'letter-portrait': { width: 2550, height: 3300, label: 'US Letter Portrait' },
  'letter-landscape': { width: 3300, height: 2550, label: 'US Letter Landscape' },
  
  // Presentation
  '16:9': { width: 1920, height: 1080, label: '16:9 Widescreen' },
  '4:3': { width: 1600, height: 1200, label: '4:3 Standard' },
  
  // Custom
  'custom': { width: 800, height: 600, label: 'Custom' },
} as const;

export type PageSizeKey = keyof typeof PAGE_SIZES;

// ============================================================================
// Default Settings
// ============================================================================

export const DEFAULT_DOCUMENT_SETTINGS = {
  width: 1080,
  height: 1080,
  backgroundColor: '#ffffff',
  gridEnabled: true,
  gridSize: 20,
  snapToGrid: true,
  showRulers: true,
  showGuides: true,
};

// ============================================================================
// Canvas Element (Fabric.js format for legacy compatibility)
// ============================================================================

export interface FabricObject {
  type: string;
  left: number;
  top: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  angle?: number;
  opacity?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  visible?: boolean;
  selectable?: boolean;
  // Text-specific
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  // Image-specific
  src?: string;
  // Path-specific
  path?: any[];
  // Circle-specific
  radius?: number;
  // Other properties
  [key: string]: any;
}

// ============================================================================
// Content Page (Fabric.js format for legacy compatibility)
// ============================================================================

export interface ContentPageCanvas {
  version?: string;
  objects: FabricObject[];
  background?: string;
  backgroundColor?: string;
  width?: number;
  height?: number;
  // JSON stringified version (legacy support)
  json?: string;
}

export interface ContentPage {
  id: string;
  name: string;
  order: number;
  canvas: ContentPageCanvas;
  thumbnail?: string;
}

// ============================================================================
// Document Metadata
// ============================================================================

export interface DocumentMetadata {
  version: number;
  lastEditedBy?: string;
  createdAt?: string;
  schemaVersion?: number;
  format?: 'fabric' | 'konva';
  [key: string]: any;
}

// ============================================================================
// Content Document (main document type)
// ============================================================================

export interface ContentDocument {
  id: string;
  title: string;
  description?: string;
  workspaceId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Document content
  pages: ContentPage[];
  currentPageIndex?: number;
  
  // Canvas settings
  width?: number;
  height?: number;
  backgroundColor?: string;
  
  // Metadata
  metadata: DocumentMetadata;
  
  // Additional settings - pageSize can be a key or an object with dimensions
  settings?: {
    gridEnabled?: boolean;
    gridSize?: number;
    snapToGrid?: boolean;
    showRulers?: boolean;
    showGuides?: boolean;
    pageSize?: PageSizeKey | { width: number; height: number; label?: string };
    orientation?: 'portrait' | 'landscape';
    margins?: { top: number; right: number; bottom: number; left: number };
    grid?: { enabled: boolean; size: number; snap: boolean; color?: string };
  };
  
  // Tags/categories
  tags?: string[];
  category?: string;
  
  // Status
  status?: 'draft' | 'published' | 'archived';
  publishedAt?: string;
}

// ============================================================================
// Document Template
// ============================================================================

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  category: string;
  document: Omit<ContentDocument, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>;
}

// ============================================================================
// Export Options
// ============================================================================

export interface ExportOptions {
  format: 'png' | 'jpeg' | 'pdf' | 'svg';
  quality?: number; // 0-1 for jpeg
  scale?: number; // 1 = original, 2 = 2x resolution
  backgroundColor?: string;
  includeAllPages?: boolean;
  pageRange?: { start: number; end: number };
}

// ============================================================================
// AI Generation Types
// ============================================================================

export interface AIGenerationRequest {
  prompt: string;
  style?: 'professional' | 'creative' | 'minimal' | 'bold';
  colorScheme?: string[];
  dimensions?: { width: number; height: number };
}

export interface AIGenerationResult {
  success: boolean;
  elements?: FabricObject[];
  error?: string;
}

// ============================================================================
// Export Types
// ============================================================================

export type ExportFormat = 'png' | 'jpeg' | 'jpg' | 'pdf' | 'svg' | 'html' | 'pptx';

// ============================================================================
// Layer/Element Types for UI
// ============================================================================

export type ElementType = 
  | 'heading' | 'subheading' | 'body-text' | 'caption' | 'quote'
  | 'rectangle' | 'circle' | 'image'
  | 'metric-card' | 'testimonial' | 'comparison-table' | 'feature-grid' | 'team-member'
  | 'bar-chart' | 'line-chart' | 'pie-chart'
  | 'text' | 'rect' | 'ellipse' | 'line' | 'path' | 'group';

export interface Layer {
  id: string;
  name: string;
  type: ElementType;
  visible: boolean;
  locked: boolean;
  selected?: boolean;
  object?: FabricObject;
}

// ============================================================================
// Research/AI Types
// ============================================================================

export interface ResearchResult {
  id: string;
  title: string;
  url?: string;
  snippet: string;
  source?: string;
  relevance?: number;
}

// ============================================================================
// Document Settings
// ============================================================================

export interface DocumentSettings {
  width: number;
  height: number;
  backgroundColor: string;
  gridEnabled: boolean;
  gridSize: number;
  snapToGrid: boolean;
  showRulers: boolean;
  showGuides: boolean;
  pageSize?: PageSizeKey | { width: number; height: number; label?: string };
  orientation?: 'portrait' | 'landscape';
  margins?: { top: number; right: number; bottom: number; left: number };
  grid?: { enabled: boolean; size: number; snap: boolean; color?: string };
}

// ============================================================================
// Canvas State (for undo/redo) - JSON string of canvas state
// ============================================================================

export type CanvasState = string;

// ============================================================================
// Content Studio State & Actions
// ============================================================================

export interface ContentStudioState {
  document: ContentDocument | null;
  currentPageIndex: number;
  selectedObjectIds: string[];
  activeTool: string;
  zoom: number;
  panOffset: { x: number; y: number };
  isAIPanelOpen: boolean;
  isLayersPanelOpen: boolean;
  isPropertiesPanelOpen: boolean;
  undoStack: CanvasState[];
  redoStack: CanvasState[];
  isSaving: boolean;
  lastSaved?: string;
  isDirty: boolean;
  saveError?: string;
}

export type ContentStudioAction =
  | { type: 'SET_DOCUMENT'; payload: ContentDocument }
  | { type: 'UPDATE_DOCUMENT'; payload: ContentDocument }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'SELECT_OBJECTS'; payload: string[] }
  | { type: 'SET_TOOL'; payload: string }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_PAN'; payload: { x: number; y: number } }
  | { type: 'TOGGLE_AI_PANEL' }
  | { type: 'TOGGLE_LAYERS_PANEL' }
  | { type: 'TOGGLE_PROPERTIES_PANEL' }
  | { type: 'PUSH_UNDO'; payload: CanvasState }
  | { type: 'UNDO'; payload: CanvasState }
  | { type: 'REDO'; payload: CanvasState }
  | { type: 'SAVE_START' }
  | { type: 'SAVE_COMPLETE'; payload: string }
  | { type: 'SAVE_ERROR'; payload: string }
  | { type: 'MARK_DIRTY' }
  | { type: 'MARK_CLEAN' };
