import React, { useCallback, useRef, useState, useEffect } from 'react';

export interface SnapLine {
    position: number;
    orientation: 'horizontal' | 'vertical';
    type: 'edge' | 'center' | 'guide' | 'grid';
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface SnapResult {
    x: number;
    y: number;
    snapLines: SnapLine[];
}

interface UseSnapToGridOptions {
    enabled: boolean;
    gridSize: number;
    snapThreshold: number;
    otherElements: BoundingBox[];
    guides: Array<{ position: number; orientation: 'horizontal' | 'vertical' }>;
    pageWidth: number;
    pageHeight: number;
}

/**
 * Custom hook for professional snapping behavior like Figma/Canva.
 * Supports:
 * - Grid snapping
 * - Element-to-element snapping (edges and centers)
 * - Guide snapping
 * - Page edge snapping
 */
export function useSnapToGrid({
    enabled,
    gridSize,
    snapThreshold,
    otherElements,
    guides,
    pageWidth,
    pageHeight,
}: UseSnapToGridOptions) {
    const [activeSnapLines, setActiveSnapLines] = useState<SnapLine[]>([]);

    const snapPosition = useCallback((
        currentBox: BoundingBox,
        ignoreIndex?: number
    ): SnapResult => {
        if (!enabled) {
            return { x: currentBox.x, y: currentBox.y, snapLines: [] };
        }

        let snappedX = currentBox.x;
        let snappedY = currentBox.y;
        const snapLines: SnapLine[] = [];

        const currentCenterX = currentBox.x + currentBox.width / 2;
        const currentCenterY = currentBox.y + currentBox.height / 2;
        const currentRight = currentBox.x + currentBox.width;
        const currentBottom = currentBox.y + currentBox.height;

        // Collect all snap targets
        const horizontalTargets: { position: number; type: SnapLine['type'] }[] = [];
        const verticalTargets: { position: number; type: SnapLine['type'] }[] = [];

        // Page edges and center
        horizontalTargets.push({ position: 0, type: 'edge' });
        horizontalTargets.push({ position: pageHeight, type: 'edge' });
        horizontalTargets.push({ position: pageHeight / 2, type: 'center' });

        verticalTargets.push({ position: 0, type: 'edge' });
        verticalTargets.push({ position: pageWidth, type: 'edge' });
        verticalTargets.push({ position: pageWidth / 2, type: 'center' });

        // Grid lines
        for (let g = 0; g <= pageWidth; g += gridSize) {
            verticalTargets.push({ position: g, type: 'grid' });
        }
        for (let g = 0; g <= pageHeight; g += gridSize) {
            horizontalTargets.push({ position: g, type: 'grid' });
        }

        // Guides
        guides.forEach(guide => {
            if (guide.orientation === 'horizontal') {
                horizontalTargets.push({ position: guide.position, type: 'guide' });
            } else {
                verticalTargets.push({ position: guide.position, type: 'guide' });
            }
        });

        // Other elements
        otherElements.forEach((el, index) => {
            if (index === ignoreIndex) return;

            // Element edges
            horizontalTargets.push({ position: el.y, type: 'edge' });
            horizontalTargets.push({ position: el.y + el.height, type: 'edge' });
            horizontalTargets.push({ position: el.y + el.height / 2, type: 'center' });

            verticalTargets.push({ position: el.x, type: 'edge' });
            verticalTargets.push({ position: el.x + el.width, type: 'edge' });
            verticalTargets.push({ position: el.x + el.width / 2, type: 'center' });
        });

        // Find best horizontal snap
        let bestHSnap: { delta: number; position: number; type: SnapLine['type']; edge: 'top' | 'center' | 'bottom' } | null = null;

        horizontalTargets.forEach(target => {
            // Check top edge
            const topDelta = Math.abs(currentBox.y - target.position);
            if (topDelta < snapThreshold && (!bestHSnap || topDelta < Math.abs(bestHSnap.delta))) {
                bestHSnap = { delta: target.position - currentBox.y, position: target.position, type: target.type, edge: 'top' };
            }

            // Check center
            const centerDelta = Math.abs(currentCenterY - target.position);
            if (centerDelta < snapThreshold && (!bestHSnap || centerDelta < Math.abs(bestHSnap.delta))) {
                bestHSnap = { delta: target.position - currentCenterY, position: target.position, type: target.type, edge: 'center' };
            }

            // Check bottom edge
            const bottomDelta = Math.abs(currentBottom - target.position);
            if (bottomDelta < snapThreshold && (!bestHSnap || bottomDelta < Math.abs(bestHSnap.delta))) {
                bestHSnap = { delta: target.position - currentBottom, position: target.position, type: target.type, edge: 'bottom' };
            }
        });

        // Find best vertical snap
        let bestVSnap: { delta: number; position: number; type: SnapLine['type']; edge: 'left' | 'center' | 'right' } | null = null;

        verticalTargets.forEach(target => {
            // Check left edge
            const leftDelta = Math.abs(currentBox.x - target.position);
            if (leftDelta < snapThreshold && (!bestVSnap || leftDelta < Math.abs(bestVSnap.delta))) {
                bestVSnap = { delta: target.position - currentBox.x, position: target.position, type: target.type, edge: 'left' };
            }

            // Check center
            const centerDelta = Math.abs(currentCenterX - target.position);
            if (centerDelta < snapThreshold && (!bestVSnap || centerDelta < Math.abs(bestVSnap.delta))) {
                bestVSnap = { delta: target.position - currentCenterX, position: target.position, type: target.type, edge: 'center' };
            }

            // Check right edge
            const rightDelta = Math.abs(currentRight - target.position);
            if (rightDelta < snapThreshold && (!bestVSnap || rightDelta < Math.abs(bestVSnap.delta))) {
                bestVSnap = { delta: target.position - currentRight, position: target.position, type: target.type, edge: 'right' };
            }
        });

        // Apply snaps
        if (bestHSnap) {
            if (bestHSnap.edge === 'top') {
                snappedY = bestHSnap.position;
            } else if (bestHSnap.edge === 'center') {
                snappedY = bestHSnap.position - currentBox.height / 2;
            } else {
                snappedY = bestHSnap.position - currentBox.height;
            }
            snapLines.push({
                position: bestHSnap.position,
                orientation: 'horizontal',
                type: bestHSnap.type,
            });
        }

        if (bestVSnap) {
            if (bestVSnap.edge === 'left') {
                snappedX = bestVSnap.position;
            } else if (bestVSnap.edge === 'center') {
                snappedX = bestVSnap.position - currentBox.width / 2;
            } else {
                snappedX = bestVSnap.position - currentBox.width;
            }
            snapLines.push({
                position: bestVSnap.position,
                orientation: 'vertical',
                type: bestVSnap.type,
            });
        }

        return { x: snappedX, y: snappedY, snapLines };
    }, [enabled, gridSize, snapThreshold, otherElements, guides, pageWidth, pageHeight]);

    const clearSnapLines = useCallback(() => {
        setActiveSnapLines([]);
    }, []);

    return {
        snapPosition,
        activeSnapLines,
        setActiveSnapLines,
        clearSnapLines,
    };
}

interface SnapLinesOverlayProps {
    lines: SnapLine[];
    zoom: number;
    offsetX?: number;
    offsetY?: number;
}

/**
 * Visual overlay showing active snap lines during drag.
 */
export const SnapLinesOverlay: React.FC<SnapLinesOverlayProps> = ({
    lines,
    zoom,
    offsetX = 0,
    offsetY = 0,
}) => {
    const scale = zoom / 100;

    return (
        <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
            {lines.map((line, index) => {
                const pos = line.position * scale;
                const isHorizontal = line.orientation === 'horizontal';

                // Color based on snap type
                let color = 'rgba(99, 102, 241, 0.8)'; // Default indigo
                if (line.type === 'guide') {
                    color = 'rgba(236, 72, 153, 0.8)'; // Pink for guides
                } else if (line.type === 'center') {
                    color = 'rgba(16, 185, 129, 0.8)'; // Green for centers
                } else if (line.type === 'grid') {
                    color = 'rgba(107, 114, 128, 0.5)'; // Gray for grid
                }

                return (
                    <div
                        key={`${line.orientation}-${line.position}-${index}`}
                        className={`absolute ${isHorizontal ? 'left-0 right-0 h-px' : 'top-0 bottom-0 w-px'}`}
                        style={{
                            backgroundColor: color,
                            [isHorizontal ? 'top' : 'left']: pos + (isHorizontal ? offsetY : offsetX),
                            boxShadow: `0 0 4px ${color}`,
                        }}
                    >
                        {/* Distance indicator */}
                        <div
                            className={`absolute text-[9px] font-mono font-semibold px-1 rounded ${
                                isHorizontal ? 'right-2 -top-3' : '-left-3 top-2 -rotate-90'
                            }`}
                            style={{ backgroundColor: color, color: 'white' }}
                        >
                            {Math.round(line.position)}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

interface UseDraggableOptions {
    onDragStart?: (e: React.MouseEvent) => void;
    onDrag?: (deltaX: number, deltaY: number, e: MouseEvent) => void;
    onDragEnd?: (e: MouseEvent) => void;
    disabled?: boolean;
}

/**
 * Custom hook for smooth dragging behavior.
 */
export function useDraggable({
    onDragStart,
    onDrag,
    onDragEnd,
    disabled = false,
}: UseDraggableOptions) {
    const [isDragging, setIsDragging] = useState(false);
    const startPosRef = useRef({ x: 0, y: 0 });
    const lastPosRef = useRef({ x: 0, y: 0 });

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (disabled) return;

        e.preventDefault();
        e.stopPropagation();

        startPosRef.current = { x: e.clientX, y: e.clientY };
        lastPosRef.current = { x: e.clientX, y: e.clientY };
        setIsDragging(true);
        onDragStart?.(e);
    }, [disabled, onDragStart]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const deltaX = e.clientX - lastPosRef.current.x;
            const deltaY = e.clientY - lastPosRef.current.y;
            lastPosRef.current = { x: e.clientX, y: e.clientY };
            onDrag?.(deltaX, deltaY, e);
        };

        const handleMouseUp = (e: MouseEvent) => {
            setIsDragging(false);
            onDragEnd?.(e);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, onDrag, onDragEnd]);

    return {
        isDragging,
        handleMouseDown,
        totalDelta: isDragging ? {
            x: lastPosRef.current.x - startPosRef.current.x,
            y: lastPosRef.current.y - startPosRef.current.y,
        } : { x: 0, y: 0 },
    };
}

export default useSnapToGrid;
