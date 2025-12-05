/**
 * Content Studio Module
 * Canvas-based document creation with AI assistance
 */

// Main Components
export { ContentStudio } from './ContentStudio';
export { CanvasEngine } from './CanvasEngine';
export { LayersPanel } from './LayersPanel';
export { PropertiesPanel } from './PropertiesPanel';
export { ElementToolbar } from './ElementToolbar';
export { AISidebar } from './AISidebar';
export { ExportModal } from './ExportModal';

// Context & Hooks
export { ContentStudioProvider, useContentStudio } from './ContentStudioContext';

// Types
export type {
  ContentDocument,
  ContentPage,
  CanvasState,
  DocumentMetadata,
  DocumentSettings,
  PageSize,
  ElementCategory,
  ElementType,
  BaseElement,
  MetricCardData,
  TestimonialData,
  ComparisonData,
  PricingCardData,
  FeatureGridData,
  TimelineData,
  ProcessFlowData,
  TeamMemberData,
  CTABlockData,
  Tool,
  ToolCategory,
  Layer,
  PropertyPanelConfig,
  PropertyGroup,
  Property,
  PropertyType,
  AIContext,
  ResearchResult,
  AIGenerationRequest,
  AIGenerationResponse,
  ExportOptions,
  ExportFormat,
  PublishSettings,
  Template,
  TemplateCategory,
  DocumentCategory,
  CanvasEvent,
  CanvasEventType,
  ContentStudioState,
  ContentStudioAction,
} from './types';

export {
  PAGE_SIZES,
  DEFAULT_DOCUMENT_SETTINGS,
} from './types';
