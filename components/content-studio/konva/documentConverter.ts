/**
 * Document Converter
 * Converts between Fabric.js document format and Konva document format
 */

import { KonvaPage, KonvaElement } from './types';
import { KonvaDocument } from './KonvaContext';
import type { ContentDocument, ContentPage } from '../types';

// ============================================================================
// Constants
// ============================================================================

const FABRIC_TO_KONVA_TYPE: Record<string, string> = {
  'rect': 'rect',
  'Rect': 'rect',
  'circle': 'circle',
  'Circle': 'circle',
  'ellipse': 'ellipse',
  'Ellipse': 'ellipse',
  'line': 'line',
  'Line': 'line',
  'arrow': 'arrow',
  'text': 'text',
  'Text': 'text',
  'IText': 'text',
  'Textbox': 'text',
  'i-text': 'text',
  'textbox': 'text',
  'image': 'image',
  'Image': 'image',
  'group': 'group',
  'Group': 'group',
  'polygon': 'regularPolygon',
  'Polygon': 'regularPolygon',
  'star': 'star',
  'Star': 'star',
  'path': 'path',
  'Path': 'path',
  'triangle': 'regularPolygon',
  'Triangle': 'regularPolygon',
};

// ============================================================================
// Fabric → Konva Conversion
// ============================================================================

/**
 * Convert a Fabric.js document to Konva format
 */
export function fabricToKonva(fabricDoc: ContentDocument): KonvaDocument {
  // Determine page size from settings or default
  const settingsPageSize = fabricDoc.settings?.pageSize;
  let pageSize: { name: string; width: number; height: number };
  
  if (typeof settingsPageSize === 'object' && settingsPageSize !== null) {
    // pageSize is already an object with dimensions
    pageSize = {
      name: settingsPageSize.label || 'custom',
      width: settingsPageSize.width,
      height: settingsPageSize.height,
    };
  } else if (typeof settingsPageSize === 'string') {
    // pageSize is a key name
    pageSize = {
      name: settingsPageSize,
      width: fabricDoc.width || 1080,
      height: fabricDoc.height || 1080,
    };
  } else {
    // Default
    pageSize = {
      name: 'custom',
      width: fabricDoc.width || 1080,
      height: fabricDoc.height || 1080,
    };
  }
  
  return {
    id: fabricDoc.id,
    title: fabricDoc.title,
    description: fabricDoc.description,
    workspaceId: fabricDoc.workspaceId,
    pages: fabricDoc.pages.map(convertFabricPage),
    metadata: {
      tags: fabricDoc.tags || [],
      category: fabricDoc.category || 'custom',
      version: fabricDoc.metadata?.version || 1,
      lastEditedBy: fabricDoc.metadata?.lastEditedBy,
    },
    settings: {
      pageSize,
      orientation: fabricDoc.settings?.orientation || 'portrait',
      margins: fabricDoc.settings?.margins || { top: 0, right: 0, bottom: 0, left: 0 },
      grid: {
        enabled: fabricDoc.settings?.gridEnabled ?? fabricDoc.settings?.grid?.enabled ?? true,
        size: fabricDoc.settings?.gridSize ?? fabricDoc.settings?.grid?.size ?? 20,
        color: '#e0e0e0',
        opacity: 0.5,
      },
      snapToGrid: fabricDoc.settings?.snapToGrid ?? true,
      showRulers: fabricDoc.settings?.showRulers ?? true,
    },
    createdAt: fabricDoc.createdAt || new Date().toISOString(),
    updatedAt: fabricDoc.updatedAt || new Date().toISOString(),
    createdBy: fabricDoc.createdBy || '',
  };
}

function convertFabricPage(page: ContentPage): KonvaPage {
  // Parse objects from JSON if needed
  let objects = page.canvas.objects || [];
  if (page.canvas.json) {
    try {
      const parsed = JSON.parse(page.canvas.json);
      objects = parsed.objects || [];
    } catch (e) {
      console.warn('[DocumentConverter] Failed to parse canvas JSON:', e);
    }
  }

  return {
    id: page.id,
    name: page.name,
    order: page.order,
    canvas: {
      width: page.canvas.width,
      height: page.canvas.height,
      backgroundColor: page.canvas.backgroundColor || '#ffffff',
      elements: objects.map(convertFabricObject).filter(Boolean) as KonvaElement[],
    },
    thumbnail: page.thumbnail,
  };
}

function convertFabricObject(obj: any): KonvaElement | null {
  if (!obj) return null;

  const type = FABRIC_TO_KONVA_TYPE[obj.type] || 'rect';
  const baseElement: Partial<KonvaElement> = {
    id: obj.id || crypto.randomUUID(),
    type: type as any,
    category: getCategoryForType(type),
    name: obj.name,
    x: obj.left || 0,
    y: obj.top || 0,
    rotation: obj.angle || 0,
    scaleX: obj.scaleX || 1,
    scaleY: obj.scaleY || 1,
    opacity: obj.opacity ?? 1,
    visible: obj.visible !== false,
    locked: obj.lockMovementX && obj.lockMovementY,
    draggable: !(obj.lockMovementX && obj.lockMovementY),
    fill: obj.fill || 'transparent',
    stroke: obj.stroke || 'transparent',
    strokeWidth: obj.strokeWidth || 0,
    shadowColor: obj.shadow?.color,
    shadowBlur: obj.shadow?.blur,
    shadowOffsetX: obj.shadow?.offsetX,
    shadowOffsetY: obj.shadow?.offsetY,
  };

  // Type-specific properties
  switch (type) {
    case 'rect':
      return {
        ...baseElement,
        width: obj.width * (obj.scaleX || 1),
        height: obj.height * (obj.scaleY || 1),
        cornerRadius: obj.rx || 0,
      } as KonvaElement;

    case 'circle':
      return {
        ...baseElement,
        radius: obj.radius || Math.min(obj.width, obj.height) / 2,
      } as KonvaElement;

    case 'ellipse':
      return {
        ...baseElement,
        radiusX: obj.rx || obj.width / 2,
        radiusY: obj.ry || obj.height / 2,
      } as KonvaElement;

    case 'text':
      return {
        ...baseElement,
        text: obj.text || '',
        width: obj.width,
        height: obj.height,
        fontSize: obj.fontSize || 24,
        fontFamily: obj.fontFamily || 'Inter',
        fontStyle: convertFontStyle(obj),
        align: obj.textAlign || 'left',
        lineHeight: obj.lineHeight || 1.2,
      } as KonvaElement;

    case 'image':
      return {
        ...baseElement,
        src: obj.src || obj._element?.src || '',
        width: obj.width * (obj.scaleX || 1),
        height: obj.height * (obj.scaleY || 1),
      } as KonvaElement;

    case 'line':
    case 'arrow':
      return {
        ...baseElement,
        points: obj.points || [0, 0, 100, 0],
        pointerLength: obj.pointerLength || 10,
        pointerWidth: obj.pointerWidth || 10,
      } as KonvaElement;

    case 'regularPolygon':
      return {
        ...baseElement,
        sides: obj.points?.length / 2 || 6,
        radius: obj.radius || 50,
      } as KonvaElement;

    case 'star':
      return {
        ...baseElement,
        numPoints: obj.numPoints || 5,
        innerRadius: obj.innerRadius || 30,
        outerRadius: obj.outerRadius || 50,
      } as KonvaElement;

    default:
      return {
        ...baseElement,
        width: obj.width || 100,
        height: obj.height || 100,
      } as KonvaElement;
  }
}

function getCategoryForType(type: string): 'shape' | 'text' | 'media' | 'gtm-block' | 'chart' | 'smart' {
  switch (type) {
    case 'text':
      return 'text';
    case 'image':
      return 'media';
    default:
      return 'shape';
  }
}

function convertFontStyle(obj: any): 'normal' | 'bold' | 'italic' | 'bold italic' {
  const weight = obj.fontWeight;
  const style = obj.fontStyle;
  if (weight === 'bold' && style === 'italic') return 'bold italic';
  if (weight === 'bold') return 'bold';
  if (style === 'italic') return 'italic';
  return 'normal';
}

// ============================================================================
// Konva → Fabric Conversion (for backward compatibility)
// ============================================================================

/**
 * Convert a Konva document back to Fabric format for storage
 * This ensures backward compatibility with existing stored documents
 */
export function konvaToFabric(konvaDoc: KonvaDocument): ContentDocument {
  // Convert Konva settings back to ContentDocument settings format
  const settings: ContentDocument['settings'] = {
    gridEnabled: konvaDoc.settings.grid.enabled,
    gridSize: konvaDoc.settings.grid.size,
    snapToGrid: konvaDoc.settings.snapToGrid,
    showRulers: konvaDoc.settings.showRulers,
    pageSize: konvaDoc.settings.pageSize.name as any,
    orientation: konvaDoc.settings.orientation,
    margins: konvaDoc.settings.margins,
    grid: {
      enabled: konvaDoc.settings.grid.enabled,
      size: konvaDoc.settings.grid.size,
      snap: konvaDoc.settings.snapToGrid,
    },
  };

  return {
    id: konvaDoc.id,
    title: konvaDoc.title,
    description: konvaDoc.description,
    workspaceId: konvaDoc.workspaceId,
    pages: konvaDoc.pages.map(convertKonvaPage),
    width: konvaDoc.settings.pageSize.width,
    height: konvaDoc.settings.pageSize.height,
    metadata: {
      version: konvaDoc.metadata.version,
      lastEditedBy: konvaDoc.metadata.lastEditedBy,
      format: 'konva',
    },
    tags: konvaDoc.metadata.tags,
    category: konvaDoc.metadata.category,
    settings,
    createdAt: konvaDoc.createdAt,
    updatedAt: konvaDoc.updatedAt,
    createdBy: konvaDoc.createdBy,
  };
}

function convertKonvaPage(page: KonvaPage): ContentPage {
  const fabricObjects = page.canvas.elements.map(convertKonvaElement);
  
  return {
    id: page.id,
    name: page.name,
    order: page.order,
    canvas: {
      width: page.canvas.width,
      height: page.canvas.height,
      backgroundColor: page.canvas.backgroundColor,
      objects: fabricObjects as any[],
      json: JSON.stringify({
        version: '6.0.0',
        objects: fabricObjects,
        background: page.canvas.backgroundColor,
      }),
    },
    thumbnail: page.thumbnail,
  };
}

function convertKonvaElement(el: KonvaElement): any {
  const baseObject = {
    id: el.id,
    type: getCanonicalFabricType(el.type),
    left: el.x,
    top: el.y,
    angle: el.rotation || 0,
    scaleX: 1,
    scaleY: 1,
    opacity: el.opacity ?? 1,
    visible: el.visible !== false,
    lockMovementX: el.locked || false,
    lockMovementY: el.locked || false,
    fill: el.fill || 'transparent',
    stroke: el.stroke || 'transparent',
    strokeWidth: el.strokeWidth || 0,
    name: el.name,
    shadow: el.shadowColor ? {
      color: el.shadowColor,
      blur: el.shadowBlur || 0,
      offsetX: el.shadowOffsetX || 0,
      offsetY: el.shadowOffsetY || 0,
    } : null,
  };

  switch (el.type) {
    case 'rect':
      return {
        ...baseObject,
        width: el.width,
        height: el.height,
        rx: el.cornerRadius || 0,
        ry: el.cornerRadius || 0,
      };

    case 'circle':
      return {
        ...baseObject,
        radius: (el as any).radius || 50,
      };

    case 'ellipse':
      return {
        ...baseObject,
        rx: (el as any).radiusX || 50,
        ry: (el as any).radiusY || 30,
      };

    case 'text':
      const textEl = el as any;
      return {
        ...baseObject,
        type: 'Textbox',
        text: textEl.text || '',
        width: el.width,
        height: el.height,
        fontSize: textEl.fontSize || 24,
        fontFamily: textEl.fontFamily || 'Inter',
        fontWeight: textEl.fontStyle?.includes('bold') ? 'bold' : 'normal',
        fontStyle: textEl.fontStyle?.includes('italic') ? 'italic' : 'normal',
        textAlign: textEl.align || 'left',
        lineHeight: textEl.lineHeight || 1.2,
      };

    case 'image':
      return {
        ...baseObject,
        src: (el as any).src,
        width: el.width,
        height: el.height,
      };

    case 'line':
    case 'arrow':
      return {
        ...baseObject,
        points: (el as any).points || [0, 0, 100, 0],
      };

    default:
      return {
        ...baseObject,
        width: el.width || 100,
        height: el.height || 100,
      };
  }
}

function getCanonicalFabricType(type: string): string {
  const typeMap: Record<string, string> = {
    'rect': 'Rect',
    'circle': 'Circle',
    'ellipse': 'Ellipse',
    'line': 'Line',
    'arrow': 'Line', // Fabric doesn't have native arrow
    'text': 'Textbox',
    'image': 'Image',
    'group': 'Group',
    'regularPolygon': 'Polygon',
    'star': 'Star',
    'path': 'Path',
  };
  return typeMap[type] || 'Rect';
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate a Konva document structure
 */
export function validateKonvaDocument(doc: any): { valid: boolean; error?: string } {
  if (!doc) return { valid: false, error: 'Document is null' };
  if (!doc.id) return { valid: false, error: 'Document missing id' };
  if (!doc.pages || !Array.isArray(doc.pages)) return { valid: false, error: 'Document missing pages array' };
  if (doc.pages.length === 0) return { valid: false, error: 'Document has no pages' };
  
  for (const page of doc.pages) {
    if (!page.id) return { valid: false, error: 'Page missing id' };
    if (!page.canvas) return { valid: false, error: 'Page missing canvas' };
    if (!Array.isArray(page.canvas.elements)) return { valid: false, error: 'Page canvas missing elements array' };
  }
  
  return { valid: true };
}

/**
 * Check if a document is in Konva format (vs Fabric format)
 */
export function isKonvaFormat(doc: any): boolean {
  if (!doc?.pages?.[0]) return false;
  // Konva format uses 'elements', Fabric format uses 'objects' or 'json'
  return Array.isArray(doc.pages[0].canvas?.elements);
}
