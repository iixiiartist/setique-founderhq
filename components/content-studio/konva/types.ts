/**
 * Konva Canvas Types
 * Type definitions for the React-Konva based canvas system
 */

import Konva from 'konva';

// ============================================================================
// Canvas Element Types
// ============================================================================

export type KonvaElementType = 
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'text'
  | 'image'
  | 'group'
  | 'path'
  | 'star'
  | 'regularPolygon'
  | 'wedge'
  | 'arc';

export type ElementCategory = 
  | 'shape'
  | 'text'
  | 'media'
  | 'gtm-block'
  | 'chart'
  | 'smart';

// ============================================================================
// Base Element Interface
// ============================================================================

export interface KonvaBaseElement {
  id: string;
  type: KonvaElementType;
  category: ElementCategory;
  name?: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  draggable?: boolean;
  // Common styling
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  // Shadow
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  // Corner radius (for rects)
  cornerRadius?: number;
}

// ============================================================================
// Specific Element Types
// ============================================================================

export interface KonvaRectElement extends KonvaBaseElement {
  type: 'rect';
  width: number;
  height: number;
  cornerRadius?: number;
}

export interface KonvaCircleElement extends KonvaBaseElement {
  type: 'circle';
  radius: number;
}

export interface KonvaEllipseElement extends KonvaBaseElement {
  type: 'ellipse';
  radiusX: number;
  radiusY: number;
}

export interface KonvaLineElement extends KonvaBaseElement {
  type: 'line' | 'arrow';
  points: number[];
  tension?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  closed?: boolean;
  // Arrow-specific
  pointerLength?: number;
  pointerWidth?: number;
}

export interface KonvaTextElement extends KonvaBaseElement {
  type: 'text';
  text: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bold italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  align?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  lineHeight?: number;
  letterSpacing?: number;
  wrap?: 'word' | 'char' | 'none';
  ellipsis?: boolean;
  padding?: number;
}

export interface KonvaImageElement extends KonvaBaseElement {
  type: 'image';
  src: string;
  width: number;
  height: number;
  // Image cropping
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  // Filters
  filters?: string[];
}

export interface KonvaGroupElement extends KonvaBaseElement {
  type: 'group';
  children: KonvaElement[];
}

export interface KonvaStarElement extends KonvaBaseElement {
  type: 'star';
  numPoints: number;
  innerRadius: number;
  outerRadius: number;
}

export interface KonvaPolygonElement extends KonvaBaseElement {
  type: 'regularPolygon';
  sides: number;
  radius: number;
}

// Union type for all elements
export type KonvaElement = 
  | KonvaRectElement
  | KonvaCircleElement
  | KonvaEllipseElement
  | KonvaLineElement
  | KonvaTextElement
  | KonvaImageElement
  | KonvaGroupElement
  | KonvaStarElement
  | KonvaPolygonElement;

// Simplified aliases for component use
export type TextElement = KonvaTextElement;
export type ImageElement = KonvaImageElement;
export type GroupElement = KonvaGroupElement;

// Shape element - union of all shape types
export type ShapeElement = 
  | (KonvaRectElement & { shapeType: 'rect' })
  | (KonvaCircleElement & { shapeType: 'circle' })
  | (KonvaEllipseElement & { shapeType: 'ellipse' })
  | (KonvaLineElement & { shapeType: 'line' | 'arrow' })
  | (KonvaStarElement & { shapeType: 'star' })
  | (KonvaPolygonElement & { shapeType: 'polygon' });

// ============================================================================
// Canvas State
// ============================================================================

export interface KonvaCanvasState {
  width: number;
  height: number;
  backgroundColor: string;
  elements: KonvaElement[];
}

export interface KonvaPage {
  id: string;
  name: string;
  order: number;
  canvas: KonvaCanvasState;
  thumbnail?: string;
}

// ============================================================================
// Selection & Transform
// ============================================================================

export interface SelectionState {
  selectedIds: string[];
  isMultiSelect: boolean;
}

export interface TransformState {
  isTransforming: boolean;
  transformType?: 'move' | 'resize' | 'rotate';
  startPosition?: { x: number; y: number };
}

// ============================================================================
// Tool Types
// ============================================================================

export type CanvasTool = 
  | 'select'
  | 'pan'
  | 'draw-rect'
  | 'draw-circle'
  | 'draw-line'
  | 'draw-arrow'
  | 'draw-text'
  | 'draw-polygon';

// ============================================================================
// History (Undo/Redo)
// ============================================================================

export interface HistoryEntry {
  elements: KonvaElement[];
  timestamp: number;
}

// ============================================================================
// GTM Block Types (Pre-built components)
// ============================================================================

export interface GTMBlockConfig {
  id: string;
  name: string;
  category: 'metric' | 'testimonial' | 'pricing' | 'cta' | 'feature' | 'team' | 'timeline';
  elements: KonvaElement[];
  defaultWidth: number;
  defaultHeight: number;
}

// ============================================================================
// Snap & Guide Lines
// ============================================================================

export interface GuideLine {
  id: string;
  orientation: 'horizontal' | 'vertical';
  position: number;
  type: 'edge' | 'center';
}

export interface SnapResult {
  x?: number;
  y?: number;
  guides: GuideLine[];
}

// ============================================================================
// Export Options
// ============================================================================

export interface KonvaExportOptions {
  format: 'png' | 'jpeg' | 'svg' | 'pdf';
  quality?: number; // 0-1 for jpeg
  pixelRatio?: number; // For high-DPI exports
  backgroundColor?: string;
  includeHiddenLayers?: boolean;
}

// ============================================================================
// Helpers
// ============================================================================

export function createDefaultElement(type: KonvaElementType): Partial<KonvaElement> {
  const base = {
    id: crypto.randomUUID(),
    x: 100,
    y: 100,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    opacity: 1,
    visible: true,
    locked: false,
    draggable: true,
  };

  switch (type) {
    case 'rect':
      return {
        ...base,
        type: 'rect',
        category: 'shape',
        width: 200,
        height: 150,
        fill: '#6366f1',
        stroke: '#4f46e5',
        strokeWidth: 0,
        cornerRadius: 8,
      };
    case 'circle':
      return {
        ...base,
        type: 'circle',
        category: 'shape',
        radius: 75,
        fill: '#6366f1',
        stroke: '#4f46e5',
        strokeWidth: 0,
      };
    case 'text':
      return {
        ...base,
        type: 'text',
        category: 'text',
        text: 'Double-click to edit',
        fontSize: 24,
        fontFamily: 'Inter',
        fill: '#1f2937',
        width: 300,
        align: 'left',
      };
    case 'line':
      return {
        ...base,
        type: 'line',
        category: 'shape',
        points: [0, 0, 200, 0],
        stroke: '#6366f1',
        strokeWidth: 2,
      };
    case 'arrow':
      return {
        ...base,
        type: 'arrow',
        category: 'shape',
        points: [0, 0, 200, 0],
        stroke: '#6366f1',
        strokeWidth: 2,
        pointerLength: 10,
        pointerWidth: 10,
      };
    default:
      return base;
  }
}

export function isTextElement(element: KonvaElement): element is KonvaTextElement {
  return element.type === 'text';
}

export function isImageElement(element: KonvaElement): element is KonvaImageElement {
  return element.type === 'image';
}

export function isGroupElement(element: KonvaElement): element is KonvaGroupElement {
  return element.type === 'group';
}
