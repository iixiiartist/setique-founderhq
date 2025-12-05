/**
 * Content Studio Types
 * Core type definitions for the canvas-based content creation system
 */

import { fabric } from 'fabric';

// ============================================================================
// Document & Page Types
// ============================================================================

export interface ContentDocument {
  id: string;
  title: string;
  description?: string;
  pages: ContentPage[];
  metadata: DocumentMetadata;
  settings: DocumentSettings;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface ContentPage {
  id: string;
  name: string;
  order: number;
  canvas: CanvasState;
  thumbnail?: string;
}

export interface CanvasState {
  width: number;
  height: number;
  backgroundColor: string;
  objects: fabric.Object[];
  json?: string; // Serialized fabric canvas
}

export interface DocumentMetadata {
  tags: string[];
  category: DocumentCategory;
  version: number;
  lastEditedBy?: string;
  linkedEntities?: LinkedEntity[];
}

export interface LinkedEntity {
  type: 'contact' | 'company' | 'deal' | 'campaign' | 'product';
  id: string;
  name: string;
}

export interface DocumentSettings {
  pageSize: PageSize;
  orientation: 'portrait' | 'landscape';
  margins: Margins;
  grid: GridSettings;
  snapToGrid: boolean;
  showRulers: boolean;
}

export interface PageSize {
  name: string;
  width: number;
  height: number;
}

export interface Margins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface GridSettings {
  enabled: boolean;
  size: number;
  color: string;
  opacity: number;
}

// ============================================================================
// Canvas Element Types
// ============================================================================

export type ElementCategory = 
  | 'text'
  | 'shape'
  | 'media'
  | 'gtm-block'
  | 'chart'
  | 'table'
  | 'smart';

export interface BaseElement {
  id: string;
  type: ElementType;
  category: ElementCategory;
  name: string;
  locked: boolean;
  visible: boolean;
  order: number;
}

export type ElementType =
  // Text
  | 'heading'
  | 'subheading'
  | 'body-text'
  | 'caption'
  | 'quote'
  | 'code-block'
  // Shapes
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'line'
  | 'arrow'
  | 'polygon'
  // Media
  | 'image'
  | 'video'
  | 'icon'
  | 'logo'
  // GTM Blocks
  | 'metric-card'
  | 'testimonial'
  | 'comparison-table'
  | 'pricing-card'
  | 'feature-grid'
  | 'timeline'
  | 'process-flow'
  | 'team-member'
  | 'cta-block'
  | 'stats-row'
  // Charts
  | 'bar-chart'
  | 'line-chart'
  | 'pie-chart'
  | 'donut-chart'
  // Tables
  | 'data-table'
  | 'comparison-matrix'
  // Smart
  | 'ai-generated'
  | 'dynamic-placeholder';

// ============================================================================
// GTM Block Specific Types
// ============================================================================

export interface MetricCardData {
  value: string;
  label: string;
  change?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
  icon?: string;
  color: string;
}

export interface TestimonialData {
  quote: string;
  author: string;
  title: string;
  company: string;
  avatar?: string;
  logo?: string;
  rating?: number;
}

export interface ComparisonData {
  title: string;
  columns: { name: string; highlight?: boolean }[];
  rows: {
    feature: string;
    values: (string | boolean | number)[];
  }[];
}

export interface PricingCardData {
  name: string;
  price: string;
  period: string;
  description: string;
  features: { text: string; included: boolean }[];
  cta: string;
  highlighted: boolean;
  badge?: string;
}

export interface FeatureGridData {
  items: {
    icon: string;
    title: string;
    description: string;
  }[];
  columns: 2 | 3 | 4;
}

export interface TimelineData {
  events: {
    date: string;
    title: string;
    description: string;
    icon?: string;
  }[];
  orientation: 'horizontal' | 'vertical';
}

export interface ProcessFlowData {
  steps: {
    number: number;
    title: string;
    description: string;
    icon?: string;
  }[];
  style: 'linear' | 'circular' | 'branching';
}

export interface TeamMemberData {
  name: string;
  title: string;
  bio?: string;
  avatar?: string;
  social?: {
    linkedin?: string;
    twitter?: string;
    email?: string;
  };
}

export interface CTABlockData {
  headline: string;
  subheadline?: string;
  buttonText: string;
  buttonUrl?: string;
  style: 'minimal' | 'gradient' | 'bordered' | 'filled';
}

// ============================================================================
// Tool & Panel Types
// ============================================================================

export interface Tool {
  id: string;
  name: string;
  icon: string;
  category: ToolCategory;
  shortcut?: string;
  action: () => void;
}

export type ToolCategory = 
  | 'selection'
  | 'drawing'
  | 'text'
  | 'shapes'
  | 'media'
  | 'gtm';

export interface Layer {
  id: string;
  name: string;
  type: ElementType;
  visible: boolean;
  locked: boolean;
  order: number;
  selected: boolean;
  thumbnail?: string;
}

export interface PropertyPanelConfig {
  elementId: string | null;
  elementType: ElementType | null;
  properties: PropertyGroup[];
}

export interface PropertyGroup {
  name: string;
  icon?: string;
  expanded: boolean;
  properties: Property[];
}

export interface Property {
  key: string;
  label: string;
  type: PropertyType;
  value: any;
  options?: { label: string; value: any }[];
  min?: number;
  max?: number;
  step?: number;
}

export type PropertyType =
  | 'text'
  | 'number'
  | 'color'
  | 'select'
  | 'toggle'
  | 'slider'
  | 'font'
  | 'alignment'
  | 'spacing'
  | 'border'
  | 'shadow';

// ============================================================================
// AI & Research Types
// ============================================================================

export interface AIContext {
  documentTitle: string;
  documentContent: string;
  selectedElement?: string;
  userPrompt: string;
}

export interface ResearchResult {
  id: string;
  title: string;
  snippet: string;
  url: string;
  source: string;
  timestamp: string;
  relevanceScore?: number;
}

export interface AIGenerationRequest {
  type: 'text' | 'image' | 'layout' | 'block';
  prompt: string;
  context?: AIContext;
  style?: {
    tone?: 'professional' | 'casual' | 'formal' | 'friendly';
    length?: 'short' | 'medium' | 'long';
    format?: 'paragraph' | 'bullets' | 'numbered';
  };
}

export interface AIGenerationResponse {
  content: string;
  suggestions?: string[];
  citations?: ResearchResult[];
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportOptions {
  format: ExportFormat;
  quality: 'draft' | 'standard' | 'high' | 'print';
  pages?: number[];
  includeBleed?: boolean;
  embedFonts?: boolean;
  colorProfile?: 'sRGB' | 'CMYK';
}

export type ExportFormat = 
  | 'pdf'
  | 'png'
  | 'jpg'
  | 'svg'
  | 'html'
  | 'pptx';

export interface PublishSettings {
  visibility: 'private' | 'team' | 'public';
  shareToken?: string;
  password?: string;
  expiresAt?: string;
  allowDownload: boolean;
  allowComments: boolean;
  customDomain?: string;
  slug?: string;
}

// ============================================================================
// Template Types
// ============================================================================

export interface Template {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  thumbnail: string;
  pages: ContentPage[];
  tags: string[];
  premium: boolean;
}

export type TemplateCategory =
  | 'pitch-deck'
  | 'proposal'
  | 'case-study'
  | 'one-pager'
  | 'report'
  | 'presentation'
  | 'social-media'
  | 'email'
  | 'infographic'
  | 'brochure';

export type DocumentCategory = TemplateCategory | 'custom';

// ============================================================================
// Event Types
// ============================================================================

export interface CanvasEvent {
  type: CanvasEventType;
  target?: fabric.Object;
  timestamp: number;
  data?: any;
}

export type CanvasEventType =
  | 'object:added'
  | 'object:removed'
  | 'object:modified'
  | 'object:selected'
  | 'object:deselected'
  | 'canvas:cleared'
  | 'page:changed'
  | 'zoom:changed'
  | 'undo'
  | 'redo';

// ============================================================================
// State Types
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
  undoStack: string[];  // Canvas JSON snapshots
  redoStack: string[];  // Canvas JSON snapshots
  isSaving: boolean;
  lastSaved?: string;
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
  | { type: 'PUSH_UNDO'; payload: string }  // Canvas JSON snapshot
  | { type: 'UNDO'; payload: string }       // Current canvas JSON to push to redo
  | { type: 'REDO'; payload: string }       // Current canvas JSON to push to undo
  | { type: 'SAVE_START' }
  | { type: 'SAVE_COMPLETE'; payload: string };

// ============================================================================
// Preset Configurations
// ============================================================================

export const PAGE_SIZES: Record<string, PageSize> = {
  'letter': { name: 'US Letter', width: 816, height: 1056 },
  'a4': { name: 'A4', width: 794, height: 1123 },
  'presentation': { name: 'Presentation (16:9)', width: 1920, height: 1080 },
  'presentation-4-3': { name: 'Presentation (4:3)', width: 1024, height: 768 },
  'social-square': { name: 'Social (Square)', width: 1080, height: 1080 },
  'social-story': { name: 'Social (Story)', width: 1080, height: 1920 },
  'social-landscape': { name: 'Social (Landscape)', width: 1200, height: 628 },
  'linkedin-post': { name: 'LinkedIn Post', width: 1200, height: 627 },
  'twitter-post': { name: 'Twitter Post', width: 1200, height: 675 },
  'instagram-post': { name: 'Instagram Post', width: 1080, height: 1080 },
  'custom': { name: 'Custom', width: 800, height: 600 },
};

export const DEFAULT_DOCUMENT_SETTINGS: DocumentSettings = {
  pageSize: PAGE_SIZES['presentation'],
  orientation: 'landscape',
  margins: { top: 40, right: 40, bottom: 40, left: 40 },
  grid: {
    enabled: true,
    size: 20,
    color: '#e5e7eb',
    opacity: 0.5,
  },
  snapToGrid: true,
  showRulers: true,
};
