/**
 * Konva Document Validation
 * Validates Konva documents and elements before saving
 */

import { KonvaElement, KonvaPage, KonvaElementType } from './types';
import { KonvaDocument } from './KonvaContext';

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Element Type Validation
// ============================================================================

const VALID_ELEMENT_TYPES: KonvaElementType[] = [
  'rect',
  'circle',
  'ellipse',
  'line',
  'arrow',
  'text',
  'image',
  'group',
  'path',
  'star',
  'regularPolygon',
  'wedge',
  'arc',
];

// ============================================================================
// Validators
// ============================================================================

/**
 * Validate a single Konva element
 */
export function validateElement(element: any, index: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!element.id) {
    errors.push(`Element ${index}: missing required 'id' field`);
  }

  if (!element.type) {
    errors.push(`Element ${index}: missing required 'type' field`);
  } else if (!VALID_ELEMENT_TYPES.includes(element.type)) {
    errors.push(`Element ${index}: invalid type '${element.type}'`);
  }

  // Validate position
  if (typeof element.x !== 'number' || isNaN(element.x)) {
    warnings.push(`Element ${index}: invalid x position, defaulting to 0`);
  }
  if (typeof element.y !== 'number' || isNaN(element.y)) {
    warnings.push(`Element ${index}: invalid y position, defaulting to 0`);
  }

  // Type-specific validation
  switch (element.type) {
    case 'text':
      if (!element.text && element.text !== '') {
        warnings.push(`Element ${index}: text element without text content`);
      }
      if (element.fontSize && (element.fontSize < 1 || element.fontSize > 1000)) {
        warnings.push(`Element ${index}: unusual fontSize ${element.fontSize}`);
      }
      break;

    case 'image':
      if (!element.src) {
        errors.push(`Element ${index}: image element missing 'src'`);
      }
      // Check for base64 data URLs (should be avoided)
      if (element.src?.startsWith('data:') && element.src.length > 100000) {
        warnings.push(`Element ${index}: large base64 image detected, consider using uploaded URL`);
      }
      break;

    case 'circle':
      if (typeof element.radius !== 'number' || element.radius <= 0) {
        warnings.push(`Element ${index}: circle with invalid radius`);
      }
      break;

    case 'rect':
      if ((element.width <= 0) || (element.height <= 0)) {
        warnings.push(`Element ${index}: rect with invalid dimensions`);
      }
      break;

    case 'line':
    case 'arrow':
      if (!Array.isArray(element.points) || element.points.length < 4) {
        errors.push(`Element ${index}: line/arrow requires at least 4 points (x1,y1,x2,y2)`);
      }
      break;

    case 'star':
      if (!element.numPoints || element.numPoints < 3) {
        warnings.push(`Element ${index}: star with less than 3 points`);
      }
      break;

    case 'regularPolygon':
      if (!element.sides || element.sides < 3) {
        warnings.push(`Element ${index}: polygon with less than 3 sides`);
      }
      break;
  }

  // Validate opacity
  if (element.opacity !== undefined && (element.opacity < 0 || element.opacity > 1)) {
    warnings.push(`Element ${index}: opacity should be between 0 and 1`);
  }

  // Validate rotation
  if (element.rotation !== undefined && (element.rotation < -360 || element.rotation > 360)) {
    warnings.push(`Element ${index}: unusual rotation value ${element.rotation}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a Konva page
 */
export function validatePage(page: any, index: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!page.id) {
    errors.push(`Page ${index}: missing required 'id' field`);
  }

  if (!page.canvas) {
    errors.push(`Page ${index}: missing 'canvas' object`);
  } else {
    if (!page.canvas.width || page.canvas.width <= 0) {
      errors.push(`Page ${index}: invalid canvas width`);
    }
    if (!page.canvas.height || page.canvas.height <= 0) {
      errors.push(`Page ${index}: invalid canvas height`);
    }
    
    // Validate elements
    if (!Array.isArray(page.canvas.elements)) {
      errors.push(`Page ${index}: canvas.elements must be an array`);
    } else {
      page.canvas.elements.forEach((element: any, elIndex: number) => {
        const result = validateElement(element, elIndex);
        errors.push(...result.errors.map(e => `Page ${index}, ${e}`));
        warnings.push(...result.warnings.map(w => `Page ${index}, ${w}`));
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a complete Konva document
 */
export function validateKonvaDocument(doc: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check document structure
  if (!doc) {
    return { valid: false, errors: ['Document is null or undefined'], warnings: [] };
  }

  // Required fields
  if (!doc.id) {
    errors.push('Document missing required \'id\' field');
  }

  if (!doc.title) {
    warnings.push('Document missing title');
  }

  // Pages validation
  if (!Array.isArray(doc.pages)) {
    errors.push('Document must have a pages array');
  } else if (doc.pages.length === 0) {
    errors.push('Document must have at least one page');
  } else {
    doc.pages.forEach((page: any, index: number) => {
      const result = validatePage(page, index);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    });
  }

  // Metadata validation
  if (doc.metadata) {
    if (typeof doc.metadata.version !== 'number') {
      warnings.push('Document metadata.version should be a number');
    }
  }

  // Settings validation
  if (doc.settings) {
    if (doc.settings.pageSize) {
      if (!doc.settings.pageSize.width || !doc.settings.pageSize.height) {
        warnings.push('Document settings.pageSize missing width or height');
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize an element to ensure it has valid default values
 */
export function sanitizeElement(element: Partial<KonvaElement>): KonvaElement {
  const base: Partial<KonvaElement> = {
    id: element.id || crypto.randomUUID(),
    type: element.type || 'rect',
    x: typeof element.x === 'number' && !isNaN(element.x) ? element.x : 100,
    y: typeof element.y === 'number' && !isNaN(element.y) ? element.y : 100,
    rotation: element.rotation || 0,
    opacity: element.opacity ?? 1,
    visible: element.visible ?? true,
    locked: element.locked ?? false,
    name: element.name || `${element.type || 'Element'}`,
    fill: element.fill || '#6366f1',
  };

  // Type-specific defaults
  switch (element.type) {
    case 'text':
      return {
        ...base,
        text: (element as any).text || 'Text',
        fontSize: (element as any).fontSize || 24,
        fontFamily: (element as any).fontFamily || 'Inter',
        width: element.width || 200,
      } as KonvaElement;

    case 'image':
      return {
        ...base,
        src: (element as any).src || '',
        width: element.width || 200,
        height: element.height || 200,
      } as KonvaElement;

    case 'circle':
      return {
        ...base,
        radius: (element as any).radius || 50,
      } as KonvaElement;

    case 'rect':
      return {
        ...base,
        width: element.width || 200,
        height: element.height || 150,
      } as KonvaElement;

    case 'line':
    case 'arrow':
      return {
        ...base,
        points: (element as any).points || [0, 0, 200, 0],
        stroke: element.stroke || element.fill || '#6366f1',
      } as KonvaElement;

    case 'star':
      return {
        ...base,
        numPoints: (element as any).numPoints || 5,
        innerRadius: (element as any).innerRadius || 20,
        outerRadius: (element as any).outerRadius || 50,
      } as KonvaElement;

    case 'regularPolygon':
      return {
        ...base,
        sides: (element as any).sides || 6,
        radius: (element as any).radius || 50,
      } as KonvaElement;

    default:
      return {
        ...base,
        width: element.width || 100,
        height: element.height || 100,
      } as KonvaElement;
  }
}

/**
 * Check if AI-generated content is valid Konva element data
 */
export function validateAIGeneratedElement(data: any): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Must be an object
  if (!data || typeof data !== 'object') {
    return { valid: false, errors: ['AI output is not a valid object'], warnings: [] };
  }

  // If it's an array, validate each element
  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      const result = validateElement(item, index);
      errors.push(...result.errors);
      warnings.push(...result.warnings);
    });
  } else {
    // Single element
    const result = validateElement(data, 0);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize an entire Konva document
 * Ensures all pages and elements have valid default values
 */
export function sanitizeDocument(doc: any): KonvaDocument {
  const now = new Date().toISOString();
  
  // Ensure basic document structure
  const sanitized: KonvaDocument = {
    id: doc?.id || crypto.randomUUID(),
    title: doc?.title || 'Untitled Document',
    description: doc?.description || '',
    workspaceId: doc?.workspaceId,
    pages: [],
    metadata: {
      tags: Array.isArray(doc?.metadata?.tags) ? doc.metadata.tags : [],
      category: doc?.metadata?.category || 'uncategorized',
      version: typeof doc?.metadata?.version === 'number' ? doc.metadata.version : 1,
      lastEditedBy: doc?.metadata?.lastEditedBy,
    },
    settings: {
      pageSize: doc?.settings?.pageSize || { name: 'custom', width: 1200, height: 800 },
      orientation: doc?.settings?.orientation || 'landscape',
      margins: doc?.settings?.margins || { top: 0, right: 0, bottom: 0, left: 0 },
      grid: doc?.settings?.grid || { enabled: false, size: 20, color: '#e0e0e0', opacity: 0.5 },
      snapToGrid: doc?.settings?.snapToGrid ?? false,
      showRulers: doc?.settings?.showRulers ?? false,
    },
    createdAt: doc?.createdAt || now,
    updatedAt: now,
    createdBy: doc?.createdBy || '',
  };

  // Sanitize pages
  if (Array.isArray(doc?.pages) && doc.pages.length > 0) {
    sanitized.pages = doc.pages.map((page: any, index: number) => sanitizePage(page, index));
  } else {
    // Create default page
    const defaultPage: KonvaPage = {
      id: crypto.randomUUID(),
      name: 'Page 1',
      order: 0,
      canvas: {
        width: sanitized.settings.pageSize.width,
        height: sanitized.settings.pageSize.height,
        backgroundColor: '#ffffff',
        elements: [],
      },
    };
    sanitized.pages = [defaultPage];
  }

  return sanitized;
}

/**
 * Sanitize a single page
 */
function sanitizePage(page: any, index: number): KonvaPage {
  const sanitized: KonvaPage = {
    id: page?.id || crypto.randomUUID(),
    name: page?.name || `Page ${index + 1}`,
    order: typeof page?.order === 'number' ? page.order : index,
    canvas: {
      width: typeof page?.canvas?.width === 'number' && page.canvas.width > 0 ? page.canvas.width : 1200,
      height: typeof page?.canvas?.height === 'number' && page.canvas.height > 0 ? page.canvas.height : 800,
      backgroundColor: page?.canvas?.backgroundColor || '#ffffff',
      elements: [],
    },
    thumbnail: page?.thumbnail,
  };

  // Sanitize elements
  if (Array.isArray(page?.canvas?.elements)) {
    sanitized.canvas.elements = page.canvas.elements
      .filter((el: any) => el && typeof el === 'object')
      .map((el: any) => sanitizeElement(el));
  }

  return sanitized;
}
