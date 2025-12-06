/**
 * Snap Utilities for Content Studio Konva
 * Provides grid snapping, element alignment, and guide line generation
 * for professional, fluid canvas interactions
 */

import Konva from 'konva';
import { KonvaElement, GuideLine, SnapResult } from './types';

// ============================================================================
// Constants
// ============================================================================

export const SNAP_THRESHOLD = 8; // Pixels within which snapping activates
export const GRID_SIZE = 10; // Default grid cell size
export const GUIDE_STROKE_COLOR = '#18181b'; // Zinc-900 for snap guides
export const GUIDE_STROKE_WIDTH = 1;

// ============================================================================
// Types
// ============================================================================

export interface ElementBounds {
  id: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

export interface SnapPoints {
  vertical: number[];   // X positions to snap to
  horizontal: number[]; // Y positions to snap to
}

export interface SnapConfig {
  snapToGrid: boolean;
  snapToElements: boolean;
  snapToCanvas: boolean;
  gridSize: number;
  threshold: number;
  canvasWidth: number;
  canvasHeight: number;
}

// ============================================================================
// Element Bounds Calculation
// ============================================================================

/**
 * Calculate the bounding box of an element
 */
export function getElementBounds(element: KonvaElement): ElementBounds {
  const x = element.x || 0;
  const y = element.y || 0;
  const rotation = element.rotation || 0;
  
  // Get dimensions based on element type
  let width = 0;
  let height = 0;
  
  switch (element.type) {
    case 'rect':
    case 'image':
    case 'text':
      width = (element as any).width || 100;
      height = (element as any).height || (element as any).width || 100;
      break;
    case 'circle':
      const radius = (element as any).radius || 50;
      width = radius * 2;
      height = radius * 2;
      // Circles are centered on x,y
      return {
        id: element.id,
        left: x - radius,
        right: x + radius,
        top: y - radius,
        bottom: y + radius,
        centerX: x,
        centerY: y,
        width,
        height,
      };
    case 'ellipse':
      const radiusX = (element as any).radiusX || 50;
      const radiusY = (element as any).radiusY || 30;
      width = radiusX * 2;
      height = radiusY * 2;
      return {
        id: element.id,
        left: x - radiusX,
        right: x + radiusX,
        top: y - radiusY,
        bottom: y + radiusY,
        centerX: x,
        centerY: y,
        width,
        height,
      };
    case 'group':
      width = (element as any).width || 100;
      height = (element as any).height || 100;
      break;
    default:
      width = 100;
      height = 100;
  }
  
  // For non-centered elements (rect, text, image, group)
  return {
    id: element.id,
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    centerX: x + width / 2,
    centerY: y + height / 2,
    width,
    height,
  };
}

/**
 * Get bounds from a Konva node directly (for drag operations)
 */
export function getNodeBounds(node: Konva.Node): ElementBounds {
  const rect = node.getClientRect({ skipTransform: true });
  const x = node.x();
  const y = node.y();
  
  return {
    id: node.id(),
    left: x,
    right: x + rect.width,
    top: y,
    bottom: y + rect.height,
    centerX: x + rect.width / 2,
    centerY: y + rect.height / 2,
    width: rect.width,
    height: rect.height,
  };
}

// ============================================================================
// Snap Point Generation
// ============================================================================

/**
 * Generate snap points from all elements except the dragging one
 */
export function generateElementSnapPoints(
  elements: KonvaElement[],
  excludeIds: string[]
): SnapPoints {
  const vertical: number[] = [];
  const horizontal: number[] = [];
  
  elements
    .filter(el => !excludeIds.includes(el.id) && el.visible !== false)
    .forEach(el => {
      const bounds = getElementBounds(el);
      
      // Vertical snap points (X positions)
      vertical.push(bounds.left, bounds.centerX, bounds.right);
      
      // Horizontal snap points (Y positions)
      horizontal.push(bounds.top, bounds.centerY, bounds.bottom);
    });
  
  return { vertical, horizontal };
}

/**
 * Generate snap points from grid
 */
export function generateGridSnapPoints(
  canvasWidth: number,
  canvasHeight: number,
  gridSize: number
): SnapPoints {
  const vertical: number[] = [];
  const horizontal: number[] = [];
  
  for (let x = 0; x <= canvasWidth; x += gridSize) {
    vertical.push(x);
  }
  
  for (let y = 0; y <= canvasHeight; y += gridSize) {
    horizontal.push(y);
  }
  
  return { vertical, horizontal };
}

/**
 * Generate canvas edge and center snap points
 */
export function generateCanvasSnapPoints(
  canvasWidth: number,
  canvasHeight: number
): SnapPoints {
  return {
    vertical: [0, canvasWidth / 2, canvasWidth],
    horizontal: [0, canvasHeight / 2, canvasHeight],
  };
}

// ============================================================================
// Snap Calculation
// ============================================================================

/**
 * Find the nearest snap point within threshold
 */
function findNearestSnap(
  value: number,
  snapPoints: number[],
  threshold: number
): { snapped: number; distance: number } | null {
  let nearest: { snapped: number; distance: number } | null = null;
  
  for (const point of snapPoints) {
    const distance = Math.abs(value - point);
    if (distance <= threshold) {
      if (!nearest || distance < nearest.distance) {
        nearest = { snapped: point, distance };
      }
    }
  }
  
  return nearest;
}

/**
 * Calculate snap adjustments and generate guide lines
 */
export function calculateSnap(
  draggedBounds: ElementBounds,
  config: SnapConfig,
  elements: KonvaElement[]
): SnapResult {
  const guides: GuideLine[] = [];
  let snapX: number | undefined;
  let snapY: number | undefined;
  
  // Combine all snap points
  const allVertical: number[] = [];
  const allHorizontal: number[] = [];
  
  if (config.snapToCanvas) {
    const canvasSnaps = generateCanvasSnapPoints(config.canvasWidth, config.canvasHeight);
    allVertical.push(...canvasSnaps.vertical);
    allHorizontal.push(...canvasSnaps.horizontal);
  }
  
  if (config.snapToElements) {
    const elementSnaps = generateElementSnapPoints(elements, [draggedBounds.id]);
    allVertical.push(...elementSnaps.vertical);
    allHorizontal.push(...elementSnaps.horizontal);
  }
  
  if (config.snapToGrid) {
    const gridSnaps = generateGridSnapPoints(config.canvasWidth, config.canvasHeight, config.gridSize);
    allVertical.push(...gridSnaps.vertical);
    allHorizontal.push(...gridSnaps.horizontal);
  }
  
  // Check each edge and center of the dragged element for snapping
  
  // Vertical snapping (X axis)
  const leftSnap = findNearestSnap(draggedBounds.left, allVertical, config.threshold);
  const centerXSnap = findNearestSnap(draggedBounds.centerX, allVertical, config.threshold);
  const rightSnap = findNearestSnap(draggedBounds.right, allVertical, config.threshold);
  
  // Find the best vertical snap
  const verticalSnaps = [leftSnap, centerXSnap, rightSnap].filter(Boolean) as Array<{ snapped: number; distance: number }>;
  if (verticalSnaps.length > 0) {
    verticalSnaps.sort((a, b) => a.distance - b.distance);
    const best = verticalSnaps[0];
    
    // Determine which edge was snapped and calculate offset
    if (leftSnap && leftSnap.distance === best.distance) {
      snapX = best.snapped - draggedBounds.left + draggedBounds.left;
      guides.push({
        id: `v-${best.snapped}`,
        orientation: 'vertical',
        position: best.snapped,
        type: 'edge',
      });
    } else if (centerXSnap && centerXSnap.distance === best.distance) {
      snapX = best.snapped - draggedBounds.centerX + draggedBounds.left;
      guides.push({
        id: `v-${best.snapped}`,
        orientation: 'vertical',
        position: best.snapped,
        type: 'center',
      });
    } else if (rightSnap && rightSnap.distance === best.distance) {
      snapX = best.snapped - draggedBounds.right + draggedBounds.left;
      guides.push({
        id: `v-${best.snapped}`,
        orientation: 'vertical',
        position: best.snapped,
        type: 'edge',
      });
    }
  }
  
  // Horizontal snapping (Y axis)
  const topSnap = findNearestSnap(draggedBounds.top, allHorizontal, config.threshold);
  const centerYSnap = findNearestSnap(draggedBounds.centerY, allHorizontal, config.threshold);
  const bottomSnap = findNearestSnap(draggedBounds.bottom, allHorizontal, config.threshold);
  
  // Find the best horizontal snap
  const horizontalSnaps = [topSnap, centerYSnap, bottomSnap].filter(Boolean) as Array<{ snapped: number; distance: number }>;
  if (horizontalSnaps.length > 0) {
    horizontalSnaps.sort((a, b) => a.distance - b.distance);
    const best = horizontalSnaps[0];
    
    if (topSnap && topSnap.distance === best.distance) {
      snapY = best.snapped;
      guides.push({
        id: `h-${best.snapped}`,
        orientation: 'horizontal',
        position: best.snapped,
        type: 'edge',
      });
    } else if (centerYSnap && centerYSnap.distance === best.distance) {
      snapY = best.snapped - draggedBounds.centerY + draggedBounds.top;
      guides.push({
        id: `h-${best.snapped}`,
        orientation: 'horizontal',
        position: best.snapped,
        type: 'center',
      });
    } else if (bottomSnap && bottomSnap.distance === best.distance) {
      snapY = best.snapped - draggedBounds.bottom + draggedBounds.top;
      guides.push({
        id: `h-${best.snapped}`,
        orientation: 'horizontal',
        position: best.snapped,
        type: 'edge',
      });
    }
  }
  
  return { x: snapX, y: snapY, guides };
}

// ============================================================================
// Drag Bound Functions
// ============================================================================

/**
 * Create a drag bound function that constrains elements to canvas
 */
export function createCanvasBoundFunc(
  canvasWidth: number,
  canvasHeight: number,
  elementWidth: number,
  elementHeight: number
): (pos: { x: number; y: number }) => { x: number; y: number } {
  return (pos) => {
    return {
      x: Math.max(0, Math.min(canvasWidth - elementWidth, pos.x)),
      y: Math.max(0, Math.min(canvasHeight - elementHeight, pos.y)),
    };
  };
}

/**
 * Create a drag bound function with grid snapping
 */
export function createGridSnapBoundFunc(
  gridSize: number,
  canvasWidth: number,
  canvasHeight: number,
  elementWidth: number,
  elementHeight: number
): (pos: { x: number; y: number }) => { x: number; y: number } {
  return (pos) => {
    // Snap to grid
    const snappedX = Math.round(pos.x / gridSize) * gridSize;
    const snappedY = Math.round(pos.y / gridSize) * gridSize;
    
    // Constrain to canvas
    return {
      x: Math.max(0, Math.min(canvasWidth - elementWidth, snappedX)),
      y: Math.max(0, Math.min(canvasHeight - elementHeight, snappedY)),
    };
  };
}

// ============================================================================
// Smooth Movement Utilities
// ============================================================================

/**
 * Apply easing to a value for smoother animations
 */
export function easeOutQuad(t: number): number {
  return t * (2 - t);
}

/**
 * Lerp between two values for smooth transitions
 */
export function lerp(start: number, end: number, t: number): number {
  return start + (end - start) * t;
}

/**
 * Smooth position update with velocity damping
 */
export interface SmoothPosition {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

export function updateSmoothPosition(
  current: SmoothPosition,
  target: { x: number; y: number },
  damping: number = 0.3
): SmoothPosition {
  const dx = target.x - current.x;
  const dy = target.y - current.y;
  
  return {
    x: current.x + dx * damping,
    y: current.y + dy * damping,
    vx: dx * damping,
    vy: dy * damping,
  };
}

// ============================================================================
// Multi-Select Bounds
// ============================================================================

/**
 * Calculate combined bounds for multiple elements
 */
export function getCombinedBounds(elements: KonvaElement[]): ElementBounds | null {
  if (elements.length === 0) return null;
  
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  
  elements.forEach(el => {
    const bounds = getElementBounds(el);
    minX = Math.min(minX, bounds.left);
    minY = Math.min(minY, bounds.top);
    maxX = Math.max(maxX, bounds.right);
    maxY = Math.max(maxY, bounds.bottom);
  });
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  return {
    id: 'combined',
    left: minX,
    right: maxX,
    top: minY,
    bottom: maxY,
    centerX: minX + width / 2,
    centerY: minY + height / 2,
    width,
    height,
  };
}

// ============================================================================
// Distribution Helpers
// ============================================================================

/**
 * Calculate positions for horizontal distribution
 */
export function distributeHorizontally(elements: KonvaElement[]): Map<string, number> {
  if (elements.length < 3) return new Map();
  
  const positions = new Map<string, number>();
  const bounds = elements.map(el => getElementBounds(el));
  
  // Sort by left edge
  bounds.sort((a, b) => a.left - b.left);
  
  const leftMost = bounds[0];
  const rightMost = bounds[bounds.length - 1];
  
  // Calculate total width of elements in between
  const middleElements = bounds.slice(1, -1);
  const totalMiddleWidth = middleElements.reduce((sum, b) => sum + b.width, 0);
  
  // Calculate spacing
  const availableSpace = rightMost.left - leftMost.right - totalMiddleWidth;
  const spacing = availableSpace / (elements.length - 1);
  
  // Set positions
  let currentX = leftMost.right + spacing;
  middleElements.forEach(b => {
    positions.set(b.id, currentX);
    currentX += b.width + spacing;
  });
  
  return positions;
}

/**
 * Calculate positions for vertical distribution
 */
export function distributeVertically(elements: KonvaElement[]): Map<string, number> {
  if (elements.length < 3) return new Map();
  
  const positions = new Map<string, number>();
  const bounds = elements.map(el => getElementBounds(el));
  
  // Sort by top edge
  bounds.sort((a, b) => a.top - b.top);
  
  const topMost = bounds[0];
  const bottomMost = bounds[bounds.length - 1];
  
  // Calculate total height of elements in between
  const middleElements = bounds.slice(1, -1);
  const totalMiddleHeight = middleElements.reduce((sum, b) => sum + b.height, 0);
  
  // Calculate spacing
  const availableSpace = bottomMost.top - topMost.bottom - totalMiddleHeight;
  const spacing = availableSpace / (elements.length - 1);
  
  // Set positions
  let currentY = topMost.bottom + spacing;
  middleElements.forEach(b => {
    positions.set(b.id, currentY);
    currentY += b.height + spacing;
  });
  
  return positions;
}

export default {
  SNAP_THRESHOLD,
  GRID_SIZE,
  getElementBounds,
  getNodeBounds,
  generateElementSnapPoints,
  generateGridSnapPoints,
  generateCanvasSnapPoints,
  calculateSnap,
  createCanvasBoundFunc,
  createGridSnapBoundFunc,
  getCombinedBounds,
  distributeHorizontally,
  distributeVertically,
};
