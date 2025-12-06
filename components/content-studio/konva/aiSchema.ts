/**
 * AI Schema & Validation for Content Studio
 * Defines the contract between AI generation and Konva canvas
 * Used both server-side (Supabase Function) and client-side
 */

import { KonvaElement, KonvaElementType, ElementCategory } from './types';

// ============================================================================
// AI Limits & Constraints
// ============================================================================

export const AI_LIMITS = {
  // Element limits per patch
  MAX_ELEMENTS_PER_PATCH: 20,
  MAX_TEXT_LENGTH: 2000,
  MAX_IMAGES_PER_PATCH: 5,
  MAX_PAYLOAD_SIZE_BYTES: 512 * 1024, // 512KB
  
  // Canvas constraints
  MIN_ELEMENT_SIZE: 10,
  MAX_ELEMENT_SIZE: 4000,
  MIN_FONT_SIZE: 8,
  MAX_FONT_SIZE: 200,
  
  // Allowed types
  ALLOWED_ELEMENT_TYPES: [
    'rect', 'circle', 'ellipse', 'text', 'image', 'line', 'arrow', 'star', 'regularPolygon'
  ] as KonvaElementType[],
  
  ALLOWED_IMAGE_MIMES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  
  // Color validation
  COLOR_PATTERN: /^#[0-9A-Fa-f]{6}$|^#[0-9A-Fa-f]{3}$|^rgba?\(\d{1,3},\s*\d{1,3},\s*\d{1,3}(,\s*[\d.]+)?\)$|^transparent$/,
  
  // Font families allowed (subset for consistency)
  ALLOWED_FONTS: [
    'Inter', 'Arial', 'Helvetica', 'Georgia', 'Times New Roman',
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins',
    'Playfair Display', 'Merriweather', 'Source Sans Pro'
  ],
} as const;

// ============================================================================
// AI Patch Types
// ============================================================================

/**
 * A single element in an AI-generated patch
 * Subset of KonvaElement with validated properties
 */
export interface AiElementPatch {
  // Required
  id?: string; // Will be generated if not provided
  type: KonvaElementType;
  category: ElementCategory;
  x: number;
  y: number;
  
  // Size (required for most types)
  width?: number;
  height?: number;
  radius?: number; // For circles
  radiusX?: number; // For ellipse
  radiusY?: number; // For ellipse
  
  // Text properties
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bold italic';
  align?: 'left' | 'center' | 'right';
  
  // Image properties
  src?: string; // Storage URL (server-side processed)
  storagePath?: string; // For cleanup/migration
  
  // Line/Arrow
  points?: number[];
  pointerLength?: number;
  pointerWidth?: number;
  
  // Star/Polygon
  numPoints?: number;
  sides?: number;
  innerRadius?: number;
  outerRadius?: number;
  
  // Styling
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  cornerRadius?: number;
  rotation?: number;
  
  // Metadata
  name?: string;
  visible?: boolean;
  locked?: boolean;
  draggable?: boolean;
}

/**
 * Complete AI layout patch response
 */
export interface AiLayoutPatch {
  elements: AiElementPatch[];
  pageId?: string; // Target page (optional, defaults to current)
  
  // Metadata
  patchId: string;
  timestamp: number;
  version: string;
  
  // Optional layout hints
  layout?: {
    alignment?: 'left' | 'center' | 'right';
    spacing?: number;
    gridColumns?: number;
  };
}

/**
 * Streaming chunk from AI
 */
export interface AiStreamChunk {
  type: 'patch' | 'progress' | 'error' | 'complete';
  data: AiLayoutPatch | { progress: number; message?: string } | { error: string } | { summary: AiSummary };
}

/**
 * AI generation summary (returned at end of stream)
 */
export interface AiSummary {
  elementsGenerated: number;
  elementsApplied: number;
  elementsSkipped: number;
  errors: string[];
  warnings: string[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  remainingQuota?: number;
}

// ============================================================================
// Generation Request Types
// ============================================================================

export type AiGenerationType = 
  | 'text-content'      // Text elements (headlines, bullets, etc.)
  | 'layout-block'      // Layout with shapes and text
  | 'hero-section'      // Hero section with image placeholder
  | 'feature-grid'      // Feature cards grid
  | 'testimonial-card'  // Testimonial with avatar
  | 'cta-block'         // Call-to-action block
  | 'stats-row'         // Statistics row
  | 'comparison-table'  // Comparison layout
  | 'pricing-card'      // Pricing card
  | 'social-post'       // Social media post template
  | 'custom';           // Free-form generation

export interface AiGenerationRequest {
  type: AiGenerationType;
  prompt: string;
  
  // Context
  context?: string;
  documentId?: string;
  workspaceId?: string;
  pageId?: string;
  
  // Selection context
  selectionIds?: string[];
  replaceSelection?: boolean;
  
  // Grounding options
  grounding?: {
    enabled: boolean;
    searchQuery?: string;
    includeImages?: boolean;
    maxResults?: number;
  };
  
  // Generation options
  options?: {
    stream?: boolean;
    temperature?: number;
    style?: 'minimal' | 'modern' | 'bold' | 'classic';
    colorScheme?: string[];
  };
}

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedData?: AiLayoutPatch;
}

/**
 * Validate a color string
 */
export function validateColor(color: string | undefined): boolean {
  if (!color) return true;
  return AI_LIMITS.COLOR_PATTERN.test(color);
}

/**
 * Validate a single AI element
 */
export function validateAiElement(element: AiElementPatch, index: number): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Type validation
  if (!element.type) {
    errors.push(`Element ${index}: missing type`);
  } else if (!AI_LIMITS.ALLOWED_ELEMENT_TYPES.includes(element.type)) {
    errors.push(`Element ${index}: invalid type '${element.type}'`);
  }
  
  // Category validation
  if (!element.category) {
    warnings.push(`Element ${index}: missing category, defaulting to 'shape'`);
  }
  
  // Position validation
  if (typeof element.x !== 'number' || typeof element.y !== 'number') {
    errors.push(`Element ${index}: missing or invalid position (x, y)`);
  }
  
  // Size validation based on type
  if (element.type === 'rect' || element.type === 'image') {
    if (!element.width || !element.height) {
      warnings.push(`Element ${index}: missing size, will use defaults`);
    } else {
      if (element.width < AI_LIMITS.MIN_ELEMENT_SIZE || element.width > AI_LIMITS.MAX_ELEMENT_SIZE) {
        warnings.push(`Element ${index}: width out of bounds, clamping`);
      }
      if (element.height < AI_LIMITS.MIN_ELEMENT_SIZE || element.height > AI_LIMITS.MAX_ELEMENT_SIZE) {
        warnings.push(`Element ${index}: height out of bounds, clamping`);
      }
    }
  }
  
  // Text validation
  if (element.type === 'text') {
    if (!element.text) {
      errors.push(`Element ${index}: text element missing text content`);
    } else if (element.text.length > AI_LIMITS.MAX_TEXT_LENGTH) {
      warnings.push(`Element ${index}: text truncated to ${AI_LIMITS.MAX_TEXT_LENGTH} chars`);
    }
    
    if (element.fontSize) {
      if (element.fontSize < AI_LIMITS.MIN_FONT_SIZE || element.fontSize > AI_LIMITS.MAX_FONT_SIZE) {
        warnings.push(`Element ${index}: fontSize out of bounds, clamping`);
      }
    }
    
    if (element.fontFamily && !AI_LIMITS.ALLOWED_FONTS.includes(element.fontFamily as typeof AI_LIMITS.ALLOWED_FONTS[number])) {
      warnings.push(`Element ${index}: unsupported font '${element.fontFamily}', using Inter`);
    }
  }
  
  // Image validation
  if (element.type === 'image') {
    if (!element.src && !element.storagePath) {
      errors.push(`Element ${index}: image element missing src or storagePath`);
    }
    // Note: Server-side will validate the actual image URL/file
  }
  
  // Color validation
  if (!validateColor(element.fill)) {
    warnings.push(`Element ${index}: invalid fill color, using default`);
  }
  if (!validateColor(element.stroke)) {
    warnings.push(`Element ${index}: invalid stroke color, removing`);
  }
  
  // Opacity validation
  if (element.opacity !== undefined && (element.opacity < 0 || element.opacity > 1)) {
    warnings.push(`Element ${index}: opacity out of range, clamping to 0-1`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate a complete AI layout patch
 */
export function validateAiPatch(patch: AiLayoutPatch): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Patch metadata validation
  if (!patch.patchId) {
    warnings.push('Missing patchId, generating one');
  }
  
  if (!patch.elements || !Array.isArray(patch.elements)) {
    errors.push('Missing or invalid elements array');
    return { valid: false, errors, warnings };
  }
  
  // Element count validation
  if (patch.elements.length === 0) {
    errors.push('Patch contains no elements');
  } else if (patch.elements.length > AI_LIMITS.MAX_ELEMENTS_PER_PATCH) {
    warnings.push(`Patch has ${patch.elements.length} elements, truncating to ${AI_LIMITS.MAX_ELEMENTS_PER_PATCH}`);
  }
  
  // Image count validation
  const imageCount = patch.elements.filter(e => e.type === 'image').length;
  if (imageCount > AI_LIMITS.MAX_IMAGES_PER_PATCH) {
    warnings.push(`Patch has ${imageCount} images, only first ${AI_LIMITS.MAX_IMAGES_PER_PATCH} will be processed`);
  }
  
  // Validate each element
  patch.elements.forEach((element, index) => {
    const result = validateAiElement(element, index);
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitize an AI element to ensure valid values
 */
export function sanitizeAiElement(element: AiElementPatch): KonvaElement {
  const id = element.id || crypto.randomUUID();
  const category = element.category || 'shape';
  const draggable = element.draggable ?? true;
  const visible = element.visible ?? true;
  const locked = element.locked ?? false;
  
  // Base properties
  const base = {
    id,
    category,
    name: element.name || `AI ${element.type}`,
    x: Math.max(0, element.x || 0),
    y: Math.max(0, element.y || 0),
    rotation: element.rotation || 0,
    opacity: Math.max(0, Math.min(1, element.opacity ?? 1)),
    visible,
    locked,
    draggable,
    fill: validateColor(element.fill) ? element.fill : '#6366f1',
    stroke: validateColor(element.stroke) ? element.stroke : undefined,
    strokeWidth: element.strokeWidth || (element.stroke ? 1 : 0),
  };
  
  // Type-specific properties
  switch (element.type) {
    case 'rect':
      return {
        ...base,
        type: 'rect',
        width: Math.max(AI_LIMITS.MIN_ELEMENT_SIZE, Math.min(AI_LIMITS.MAX_ELEMENT_SIZE, element.width || 100)),
        height: Math.max(AI_LIMITS.MIN_ELEMENT_SIZE, Math.min(AI_LIMITS.MAX_ELEMENT_SIZE, element.height || 100)),
        cornerRadius: element.cornerRadius || 0,
      } as any;
      
    case 'circle':
      return {
        ...base,
        type: 'circle',
        radius: Math.max(AI_LIMITS.MIN_ELEMENT_SIZE / 2, Math.min(AI_LIMITS.MAX_ELEMENT_SIZE / 2, element.radius || 50)),
      } as any;
      
    case 'ellipse':
      return {
        ...base,
        type: 'ellipse',
        radiusX: Math.max(AI_LIMITS.MIN_ELEMENT_SIZE / 2, element.radiusX || 75),
        radiusY: Math.max(AI_LIMITS.MIN_ELEMENT_SIZE / 2, element.radiusY || 50),
      } as any;
      
    case 'text':
      return {
        ...base,
        type: 'text',
        text: (element.text || '').substring(0, AI_LIMITS.MAX_TEXT_LENGTH),
        fontSize: Math.max(AI_LIMITS.MIN_FONT_SIZE, Math.min(AI_LIMITS.MAX_FONT_SIZE, element.fontSize || 16)),
        fontFamily: AI_LIMITS.ALLOWED_FONTS.includes((element.fontFamily || '') as typeof AI_LIMITS.ALLOWED_FONTS[number]) ? element.fontFamily : 'Inter',
        fontStyle: element.fontStyle || 'normal',
        align: element.align || 'left',
        width: element.width || 300,
        fill: validateColor(element.fill) ? element.fill : '#1f2937',
      } as any;
      
    case 'image':
      return {
        ...base,
        type: 'image',
        src: element.src || '',
        storagePath: element.storagePath,
        width: Math.max(AI_LIMITS.MIN_ELEMENT_SIZE, element.width || 200),
        height: Math.max(AI_LIMITS.MIN_ELEMENT_SIZE, element.height || 200),
      } as any;
      
    case 'line':
    case 'arrow':
      return {
        ...base,
        type: element.type,
        points: element.points || [0, 0, 100, 0],
        stroke: element.stroke || '#1f2937',
        strokeWidth: element.strokeWidth || 2,
        pointerLength: element.type === 'arrow' ? (element.pointerLength || 10) : undefined,
        pointerWidth: element.type === 'arrow' ? (element.pointerWidth || 10) : undefined,
      } as any;
      
    case 'star':
      return {
        ...base,
        type: 'star',
        numPoints: element.numPoints || 5,
        innerRadius: element.innerRadius || 20,
        outerRadius: element.outerRadius || 40,
      } as any;
      
    case 'regularPolygon':
      return {
        ...base,
        type: 'regularPolygon',
        sides: element.sides || 6,
        radius: element.radius || 50,
      } as any;
      
    default:
      // Fallback to rect
      return {
        ...base,
        type: 'rect',
        width: 100,
        height: 100,
      } as any;
  }
}

/**
 * Sanitize a complete AI patch
 */
export function sanitizeAiPatch(patch: AiLayoutPatch): { 
  elements: KonvaElement[]; 
  warnings: string[] 
} {
  const warnings: string[] = [];
  
  // Limit elements
  let elements = patch.elements.slice(0, AI_LIMITS.MAX_ELEMENTS_PER_PATCH);
  if (patch.elements.length > AI_LIMITS.MAX_ELEMENTS_PER_PATCH) {
    warnings.push(`Truncated from ${patch.elements.length} to ${AI_LIMITS.MAX_ELEMENTS_PER_PATCH} elements`);
  }
  
  // Limit images
  let imageCount = 0;
  elements = elements.filter(e => {
    if (e.type === 'image') {
      imageCount++;
      if (imageCount > AI_LIMITS.MAX_IMAGES_PER_PATCH) {
        warnings.push(`Skipped image element ${imageCount} (max ${AI_LIMITS.MAX_IMAGES_PER_PATCH})`);
        return false;
      }
    }
    return true;
  });
  
  // Sanitize each element
  const sanitized = elements.map(e => sanitizeAiElement(e));
  
  // Ensure unique IDs
  const usedIds = new Set<string>();
  sanitized.forEach(el => {
    if (usedIds.has(el.id)) {
      el.id = crypto.randomUUID();
    }
    usedIds.add(el.id);
  });
  
  return { elements: sanitized, warnings };
}

// ============================================================================
// Stream Parsing
// ============================================================================

/**
 * Parse JSONL stream chunks into AiStreamChunk objects
 */
export function parseStreamChunk(line: string): AiStreamChunk | null {
  if (!line.trim()) return null;
  
  try {
    // Remove "data: " prefix if present (SSE format)
    const json = line.startsWith('data: ') ? line.slice(6) : line;
    if (json === '[DONE]') {
      return { type: 'complete', data: { summary: { elementsGenerated: 0, elementsApplied: 0, elementsSkipped: 0, errors: [], warnings: [], usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 } } } };
    }
    
    const parsed = JSON.parse(json);
    
    // Detect chunk type
    if (parsed.elements) {
      return { type: 'patch', data: parsed as AiLayoutPatch };
    } else if (parsed.progress !== undefined) {
      return { type: 'progress', data: parsed };
    } else if (parsed.error) {
      return { type: 'error', data: parsed };
    } else if (parsed.summary) {
      return { type: 'complete', data: parsed };
    }
    
    return null;
  } catch (e) {
    console.warn('[AI Stream] Failed to parse chunk:', line);
    return null;
  }
}

/**
 * Create a streaming parser that yields validated patches
 */
export async function* createAiStreamParser(
  reader: ReadableStreamDefaultReader<Uint8Array>
): AsyncGenerator<AiStreamChunk> {
  const decoder = new TextDecoder();
  let buffer = '';
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      
      // Process complete lines
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      for (const line of lines) {
        const chunk = parseStreamChunk(line);
        if (chunk) {
          // Validate patch chunks before yielding
          if (chunk.type === 'patch') {
            const validation = validateAiPatch(chunk.data as AiLayoutPatch);
            if (!validation.valid) {
              console.warn('[AI Stream] Invalid patch:', validation.errors);
              yield { type: 'error', data: { error: validation.errors.join('; ') } };
              continue;
            }
          }
          yield chunk;
        }
      }
    }
    
    // Process any remaining buffer
    if (buffer.trim()) {
      const chunk = parseStreamChunk(buffer);
      if (chunk) yield chunk;
    }
  } finally {
    reader.releaseLock();
  }
}

// ============================================================================
// Layout Templates (for AI system prompt)
// ============================================================================

export const AI_LAYOUT_TEMPLATES = {
  'hero-section': {
    description: 'Hero section with headline, subtext, and CTA button',
    elements: [
      { type: 'text', role: 'headline', fontSize: 48, fontStyle: 'bold' },
      { type: 'text', role: 'subheadline', fontSize: 20 },
      { type: 'rect', role: 'button', cornerRadius: 8 },
      { type: 'text', role: 'button-text', fontSize: 16, fontStyle: 'bold' },
    ],
  },
  'feature-grid': {
    description: '3-column feature grid with icons and descriptions',
    elements: [
      { type: 'rect', role: 'card', repeat: 3 },
      { type: 'circle', role: 'icon', repeat: 3 },
      { type: 'text', role: 'feature-title', repeat: 3 },
      { type: 'text', role: 'feature-desc', repeat: 3 },
    ],
  },
  'testimonial-card': {
    description: 'Testimonial card with quote and attribution',
    elements: [
      { type: 'rect', role: 'card', cornerRadius: 12 },
      { type: 'circle', role: 'avatar' },
      { type: 'text', role: 'quote' },
      { type: 'text', role: 'author' },
      { type: 'text', role: 'title' },
    ],
  },
  'cta-block': {
    description: 'Call-to-action block with headline and button',
    elements: [
      { type: 'rect', role: 'background' },
      { type: 'text', role: 'headline' },
      { type: 'rect', role: 'button' },
      { type: 'text', role: 'button-text' },
    ],
  },
  'stats-row': {
    description: 'Row of statistics with numbers and labels',
    elements: [
      { type: 'text', role: 'stat-number', repeat: 4 },
      { type: 'text', role: 'stat-label', repeat: 4 },
    ],
  },
};

export type LayoutTemplateName = keyof typeof AI_LAYOUT_TEMPLATES;
