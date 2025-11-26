import React, { useCallback, useEffect, useRef, useState } from 'react';

interface Guide {
    id: string;
    position: number;
    orientation: 'horizontal' | 'vertical';
}

interface ProGridOverlayProps {
    show: boolean;
    zoom: number;
    gridSize: number;
    showRulers?: boolean;
    showGuides?: boolean;
    guides?: Guide[];
    onAddGuide?: (guide: Guide) => void;
    onRemoveGuide?: (id: string) => void;
    onMoveGuide?: (id: string, position: number) => void;
    snapThreshold?: number;
    children: React.ReactNode;
    className?: string;
    pageWidth?: number;
    pageHeight?: number;
}

const RULER_SIZE = 24;
const RULER_TICK_SMALL = 5;
const RULER_TICK_MEDIUM = 10;
const RULER_TICK_LARGE = 20;

/**
 * Professional-grade canvas grid with rulers, guides, and snapping.
 * Inspired by Figma/Canva design tools.
 */
export const ProGridOverlay: React.FC<ProGridOverlayProps> = ({
    show,
    zoom,
    gridSize,
    showRulers = true,
    showGuides = true,
    guides = [],
    onAddGuide,
    onRemoveGuide,
    onMoveGuide,
    snapThreshold = 8,
    children,
    className = '',
    pageWidth = 816,
    pageHeight = 1056,
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const gridCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const rulerHCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const rulerVCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const rafRef = useRef<number | null>(null);
    const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
    const [draggingGuide, setDraggingGuide] = useState<string | null>(null);
    const [hoveredRuler, setHoveredRuler] = useState<'horizontal' | 'vertical' | null>(null);
    
    const scale = zoom / 100;
    const effectiveGridSize = Math.max(4, gridSize * scale);

    // Draw the main grid
    const drawGrid = useCallback(() => {
        if (!show) return;
        
        const canvas = gridCanvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const rect = container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        if (!width || !height) return;

        const dpr = window.devicePixelRatio || 1;
        
        if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);

        // Calculate visible grid area
        const offsetX = showRulers ? RULER_SIZE : 0;
        const offsetY = showRulers ? RULER_SIZE : 0;

        // Draw dotted grid pattern (more subtle, like Figma)
        const step = effectiveGridSize;
        const majorStep = step * 8;

        // Dot grid for minor intersections
        ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
        for (let x = offsetX; x < width; x += step) {
            for (let y = offsetY; y < height; y += step) {
                ctx.beginPath();
                ctx.arc(x, y, 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Larger dots for major intersections
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        for (let x = offsetX; x < width; x += majorStep) {
            for (let y = offsetY; y < height; y += majorStep) {
                ctx.beginPath();
                ctx.arc(x, y, 1, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Draw center lines for page
        const centerX = offsetX + (pageWidth * scale) / 2;
        const centerY = offsetY + (pageHeight * scale) / 2;

        ctx.strokeStyle = 'rgba(99, 102, 241, 0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        // Vertical center
        ctx.beginPath();
        ctx.moveTo(centerX, offsetY);
        ctx.lineTo(centerX, offsetY + pageHeight * scale);
        ctx.stroke();

        // Horizontal center
        ctx.beginPath();
        ctx.moveTo(offsetX, centerY);
        ctx.lineTo(offsetX + pageWidth * scale, centerY);
        ctx.stroke();

        ctx.setLineDash([]);

        // Draw margin guides
        const marginX = 72 * scale; // 1 inch margins
        const marginY = 72 * scale;

        ctx.strokeStyle = 'rgba(236, 72, 153, 0.15)';
        ctx.lineWidth = 1;

        // Left margin
        ctx.beginPath();
        ctx.moveTo(offsetX + marginX, offsetY);
        ctx.lineTo(offsetX + marginX, offsetY + pageHeight * scale);
        ctx.stroke();

        // Right margin
        ctx.beginPath();
        ctx.moveTo(offsetX + pageWidth * scale - marginX, offsetY);
        ctx.lineTo(offsetX + pageWidth * scale - marginX, offsetY + pageHeight * scale);
        ctx.stroke();

        // Top margin
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + marginY);
        ctx.lineTo(offsetX + pageWidth * scale, offsetY + marginY);
        ctx.stroke();

        // Bottom margin
        ctx.beginPath();
        ctx.moveTo(offsetX, offsetY + pageHeight * scale - marginY);
        ctx.lineTo(offsetX + pageWidth * scale, offsetY + pageHeight * scale - marginY);
        ctx.stroke();

    }, [show, effectiveGridSize, showRulers, scale, pageWidth, pageHeight]);

    // Draw horizontal ruler
    const drawHorizontalRuler = useCallback(() => {
        if (!showRulers) return;

        const canvas = rulerHCanvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const width = container.clientWidth;
        const height = RULER_SIZE;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Background
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, width, height);

        // Border
        ctx.strokeStyle = '#e5e5e5';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, height - 0.5);
        ctx.lineTo(width, height - 0.5);
        ctx.stroke();

        // Corner
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, RULER_SIZE, height);
        ctx.strokeStyle = '#e5e5e5';
        ctx.strokeRect(0, 0, RULER_SIZE, height);

        // Ticks and numbers
        ctx.fillStyle = '#737373';
        ctx.strokeStyle = '#a3a3a3';
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const step = 10 * scale;
        const majorStep = 100 * scale;
        const offset = RULER_SIZE;

        for (let x = offset; x < width; x += step) {
            const value = Math.round((x - offset) / scale);
            const isMajor = value % 100 === 0;
            const isMedium = value % 50 === 0;

            ctx.beginPath();
            ctx.moveTo(x, height);
            
            if (isMajor) {
                ctx.lineTo(x, height - RULER_TICK_LARGE);
                ctx.strokeStyle = '#525252';
            } else if (isMedium) {
                ctx.lineTo(x, height - RULER_TICK_MEDIUM);
                ctx.strokeStyle = '#a3a3a3';
            } else {
                ctx.lineTo(x, height - RULER_TICK_SMALL);
                ctx.strokeStyle = '#d4d4d4';
            }
            ctx.stroke();

            if (isMajor && x > offset + 20) {
                ctx.fillText(String(value), x, 3);
            }
        }

        // Mouse position indicator
        if (mousePos && (hoveredRuler === 'horizontal' || hoveredRuler === 'vertical')) {
            ctx.fillStyle = 'rgba(99, 102, 241, 0.9)';
            ctx.beginPath();
            ctx.moveTo(mousePos.x, height);
            ctx.lineTo(mousePos.x - 4, height - 8);
            ctx.lineTo(mousePos.x + 4, height - 8);
            ctx.closePath();
            ctx.fill();
        }
    }, [showRulers, scale, mousePos, hoveredRuler]);

    // Draw vertical ruler
    const drawVerticalRuler = useCallback(() => {
        if (!showRulers) return;

        const canvas = rulerVCanvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const width = RULER_SIZE;
        const height = container.clientHeight;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Background
        ctx.fillStyle = '#fafafa';
        ctx.fillRect(0, 0, width, height);

        // Border
        ctx.strokeStyle = '#e5e5e5';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(width - 0.5, 0);
        ctx.lineTo(width - 0.5, height);
        ctx.stroke();

        // Ticks and numbers
        ctx.fillStyle = '#737373';
        ctx.strokeStyle = '#a3a3a3';
        ctx.font = '9px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        const step = 10 * scale;
        const offset = RULER_SIZE;

        for (let y = offset; y < height; y += step) {
            const value = Math.round((y - offset) / scale);
            const isMajor = value % 100 === 0;
            const isMedium = value % 50 === 0;

            ctx.beginPath();
            ctx.moveTo(width, y);
            
            if (isMajor) {
                ctx.lineTo(width - RULER_TICK_LARGE, y);
                ctx.strokeStyle = '#525252';
            } else if (isMedium) {
                ctx.lineTo(width - RULER_TICK_MEDIUM, y);
                ctx.strokeStyle = '#a3a3a3';
            } else {
                ctx.lineTo(width - RULER_TICK_SMALL, y);
                ctx.strokeStyle = '#d4d4d4';
            }
            ctx.stroke();

            if (isMajor && y > offset + 20) {
                ctx.save();
                ctx.translate(width - 16, y);
                ctx.rotate(-Math.PI / 2);
                ctx.textAlign = 'center';
                ctx.fillText(String(value), 0, 0);
                ctx.restore();
            }
        }

        // Mouse position indicator
        if (mousePos && (hoveredRuler === 'horizontal' || hoveredRuler === 'vertical')) {
            ctx.fillStyle = 'rgba(99, 102, 241, 0.9)';
            ctx.beginPath();
            ctx.moveTo(width, mousePos.y);
            ctx.lineTo(width - 8, mousePos.y - 4);
            ctx.lineTo(width - 8, mousePos.y + 4);
            ctx.closePath();
            ctx.fill();
        }
    }, [showRulers, scale, mousePos, hoveredRuler]);

    // Schedule all drawing
    const scheduleDraw = useCallback(() => {
        if (rafRef.current) {
            cancelAnimationFrame(rafRef.current);
        }
        rafRef.current = requestAnimationFrame(() => {
            drawGrid();
            drawHorizontalRuler();
            drawVerticalRuler();
        });
    }, [drawGrid, drawHorizontalRuler, drawVerticalRuler]);

    useEffect(() => {
        scheduleDraw();
    }, [scheduleDraw, zoom, gridSize, show, showRulers, mousePos]);

    useEffect(() => {
        if (!containerRef.current) return;

        const observer = new ResizeObserver(() => scheduleDraw());
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }, [scheduleDraw]);

    useEffect(() => {
        return () => {
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, []);

    // Handle mouse movement for rulers
    const handleMouseMove = useCallback((e: React.MouseEvent) => {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        setMousePos({ x, y });

        // Determine if hovering over ruler area
        if (showRulers) {
            if (y < RULER_SIZE && x > RULER_SIZE) {
                setHoveredRuler('horizontal');
            } else if (x < RULER_SIZE && y > RULER_SIZE) {
                setHoveredRuler('vertical');
            } else {
                setHoveredRuler(null);
            }
        }

        // Handle guide dragging
        if (draggingGuide && onMoveGuide) {
            const guide = guides.find(g => g.id === draggingGuide);
            if (guide) {
                const newPos = guide.orientation === 'horizontal' 
                    ? (y - RULER_SIZE) / scale 
                    : (x - RULER_SIZE) / scale;
                onMoveGuide(draggingGuide, Math.max(0, newPos));
            }
        }
    }, [showRulers, draggingGuide, guides, onMoveGuide, scale]);

    const handleMouseLeave = useCallback(() => {
        setMousePos(null);
        setHoveredRuler(null);
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (!showRulers || !onAddGuide) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Click on horizontal ruler to add vertical guide
        if (y < RULER_SIZE && x > RULER_SIZE) {
            const position = (x - RULER_SIZE) / scale;
            onAddGuide({
                id: `guide-${Date.now()}`,
                position,
                orientation: 'vertical',
            });
        }
        // Click on vertical ruler to add horizontal guide
        else if (x < RULER_SIZE && y > RULER_SIZE) {
            const position = (y - RULER_SIZE) / scale;
            onAddGuide({
                id: `guide-${Date.now()}`,
                position,
                orientation: 'horizontal',
            });
        }
    }, [showRulers, onAddGuide, scale]);

    const handleMouseUp = useCallback(() => {
        setDraggingGuide(null);
    }, []);

    const handleGuideMouseDown = useCallback((id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDraggingGuide(id);
    }, []);

    const handleGuideDoubleClick = useCallback((id: string) => {
        onRemoveGuide?.(id);
    }, [onRemoveGuide]);

    return (
        <div 
            ref={containerRef} 
            className={`relative overflow-hidden ${className}`}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            {/* Grid canvas */}
            {show && (
                <canvas
                    ref={gridCanvasRef}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 z-10"
                />
            )}

            {/* Horizontal ruler */}
            {showRulers && (
                <canvas
                    ref={rulerHCanvasRef}
                    aria-hidden="true"
                    className="absolute top-0 left-0 right-0 z-30 cursor-col-resize"
                    style={{ height: RULER_SIZE }}
                />
            )}

            {/* Vertical ruler */}
            {showRulers && (
                <canvas
                    ref={rulerVCanvasRef}
                    aria-hidden="true"
                    className="absolute top-0 left-0 bottom-0 z-30 cursor-row-resize"
                    style={{ width: RULER_SIZE }}
                />
            )}

            {/* Guides */}
            {showGuides && guides.map(guide => {
                const pos = guide.position * scale + RULER_SIZE;
                const isHorizontal = guide.orientation === 'horizontal';
                
                return (
                    <div
                        key={guide.id}
                        className={`absolute z-25 ${
                            isHorizontal 
                                ? 'left-0 right-0 h-px cursor-row-resize hover:h-1 hover:-translate-y-px' 
                                : 'top-0 bottom-0 w-px cursor-col-resize hover:w-1 hover:-translate-x-px'
                        } bg-pink-500 transition-all group`}
                        style={isHorizontal ? { top: pos } : { left: pos }}
                        onMouseDown={(e) => handleGuideMouseDown(guide.id, e)}
                        onDoubleClick={() => handleGuideDoubleClick(guide.id)}
                    >
                        <div className={`absolute ${
                            isHorizontal 
                                ? '-left-1 -top-2 h-4 w-2' 
                                : '-top-1 -left-2 w-4 h-2'
                        } bg-pink-500 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity`} />
                    </div>
                );
            })}

            {/* Content area with ruler offset */}
            <div 
                className="relative z-20"
                style={{ 
                    marginLeft: showRulers ? RULER_SIZE : 0,
                    marginTop: showRulers ? RULER_SIZE : 0,
                }}
            >
                {children}
            </div>

            {/* Crosshair cursor position tooltip */}
            {mousePos && hoveredRuler && (
                <div
                    className="pointer-events-none fixed z-50 rounded bg-gray-900 px-2 py-1 text-xs font-mono text-white shadow-lg"
                    style={{
                        left: mousePos.x + 16,
                        top: mousePos.y + 16,
                    }}
                >
                    {hoveredRuler === 'horizontal'
                        ? `X: ${Math.round((mousePos.x - RULER_SIZE) / scale)}px`
                        : `Y: ${Math.round((mousePos.y - RULER_SIZE) / scale)}px`
                    }
                </div>
            )}
        </div>
    );
};

export default ProGridOverlay;
