import React, { useCallback, useRef, useEffect, useState } from 'react';
import {
    ZoomIn,
    ZoomOut,
    Maximize2,
    Minimize2,
    RotateCcw,
    Map,
    ChevronUp,
    ChevronDown,
} from 'lucide-react';

interface ZoomControlsProps {
    zoom: number;
    onZoomChange: (zoom: number) => void;
    minZoom?: number;
    maxZoom?: number;
    showMinimap?: boolean;
    onToggleMinimap?: () => void;
    minimapVisible?: boolean;
    canvasRef?: React.RefObject<HTMLDivElement>;
    viewportRef?: React.RefObject<HTMLDivElement>;
}

const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300, 400];

export const ZoomControls: React.FC<ZoomControlsProps> = ({
    zoom,
    onZoomChange,
    minZoom = 25,
    maxZoom = 400,
    showMinimap = true,
    onToggleMinimap,
    minimapVisible = false,
    canvasRef,
    viewportRef,
}) => {
    const [isSliderVisible, setIsSliderVisible] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = useRef<HTMLDivElement>(null);

    const handleZoomIn = useCallback(() => {
        const next = ZOOM_PRESETS.find(z => z > zoom) || Math.min(maxZoom, zoom + 10);
        onZoomChange(next);
    }, [zoom, maxZoom, onZoomChange]);

    const handleZoomOut = useCallback(() => {
        const presets = [...ZOOM_PRESETS].reverse();
        const next = presets.find(z => z < zoom) || Math.max(minZoom, zoom - 10);
        onZoomChange(next);
    }, [zoom, minZoom, onZoomChange]);

    const handleReset = useCallback(() => {
        onZoomChange(100);
    }, [onZoomChange]);

    const handleFitToScreen = useCallback(() => {
        // Would calculate based on canvas and viewport sizes
        onZoomChange(100);
    }, [onZoomChange]);

    const handleSliderChange = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!sliderRef.current) return;
        
        const rect = sliderRef.current.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
        const newZoom = Math.round(maxZoom - percentage * (maxZoom - minZoom));
        onZoomChange(newZoom);
    }, [minZoom, maxZoom, onZoomChange]);

    const handleSliderMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        handleSliderChange(e);
    }, [handleSliderChange]);

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            if (!sliderRef.current) return;
            const rect = sliderRef.current.getBoundingClientRect();
            const percentage = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
            const newZoom = Math.round(maxZoom - percentage * (maxZoom - minZoom));
            onZoomChange(newZoom);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, minZoom, maxZoom, onZoomChange]);

    // Wheel zoom
    useEffect(() => {
        const handleWheel = (e: WheelEvent) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                const delta = e.deltaY > 0 ? -10 : 10;
                onZoomChange(Math.max(minZoom, Math.min(maxZoom, zoom + delta)));
            }
        };

        window.addEventListener('wheel', handleWheel, { passive: false });
        return () => window.removeEventListener('wheel', handleWheel);
    }, [zoom, minZoom, maxZoom, onZoomChange]);

    const sliderPercentage = ((zoom - minZoom) / (maxZoom - minZoom)) * 100;

    return (
        <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
            {/* Main zoom controls */}
            <div className="flex flex-col items-center gap-1 p-1.5 bg-white rounded-2xl border border-gray-200 shadow-lg">
                {/* Zoom in */}
                <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoom >= maxZoom}
                    className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-all"
                    title="Zoom in (⌘+)"
                >
                    <ZoomIn size={18} />
                </button>

                {/* Zoom slider */}
                <div 
                    className="relative px-2 py-2 cursor-pointer"
                    onMouseEnter={() => setIsSliderVisible(true)}
                    onMouseLeave={() => !isDragging && setIsSliderVisible(false)}
                >
                    {/* Compact zoom display */}
                    <button
                        type="button"
                        onClick={handleReset}
                        className="w-9 h-8 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-all"
                        title="Reset to 100%"
                    >
                        {zoom}%
                    </button>

                    {/* Expanded slider */}
                    {isSliderVisible && (
                        <div 
                            ref={sliderRef}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-8 h-32 bg-white rounded-xl border border-gray-200 shadow-xl p-1.5 cursor-pointer"
                            onMouseDown={handleSliderMouseDown}
                        >
                            <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
                                {/* Track */}
                                <div 
                                    className="absolute bottom-0 left-0 right-0 bg-indigo-500 rounded-lg transition-all"
                                    style={{ height: `${sliderPercentage}%` }}
                                />
                                
                                {/* Thumb */}
                                <div 
                                    className="absolute left-1/2 -translate-x-1/2 w-4 h-2 bg-white border border-gray-300 rounded-full shadow-sm"
                                    style={{ bottom: `calc(${sliderPercentage}% - 4px)` }}
                                />

                                {/* Preset marks */}
                                {[100].map(preset => {
                                    const pos = ((preset - minZoom) / (maxZoom - minZoom)) * 100;
                                    return (
                                        <div
                                            key={preset}
                                            className="absolute left-1/2 -translate-x-1/2 w-2 h-px bg-gray-400"
                                            style={{ bottom: `${pos}%` }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Zoom out */}
                <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoom <= minZoom}
                    className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-all"
                    title="Zoom out (⌘-)"
                >
                    <ZoomOut size={18} />
                </button>

                <div className="w-6 h-px bg-gray-200 my-0.5" />

                {/* Fit to screen */}
                <button
                    type="button"
                    onClick={handleFitToScreen}
                    className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
                    title="Fit to screen (⌘0)"
                >
                    <Maximize2 size={16} />
                </button>

                {/* Toggle minimap */}
                {showMinimap && (
                    <button
                        type="button"
                        onClick={onToggleMinimap}
                        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
                            minimapVisible 
                                ? 'bg-indigo-100 text-indigo-600' 
                                : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title="Toggle minimap"
                    >
                        <Map size={16} />
                    </button>
                )}
            </div>
        </div>
    );
};

interface MinimapProps {
    visible: boolean;
    canvasWidth: number;
    canvasHeight: number;
    viewportWidth: number;
    viewportHeight: number;
    scrollX: number;
    scrollY: number;
    zoom: number;
    onNavigate: (x: number, y: number) => void;
    elements?: Array<{ x: number; y: number; width: number; height: number; type: string }>;
}

export const Minimap: React.FC<MinimapProps> = ({
    visible,
    canvasWidth,
    canvasHeight,
    viewportWidth,
    viewportHeight,
    scrollX,
    scrollY,
    zoom,
    onNavigate,
    elements = [],
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const MINIMAP_WIDTH = 180;
    const MINIMAP_HEIGHT = 120;
    const scale = Math.min(MINIMAP_WIDTH / canvasWidth, MINIMAP_HEIGHT / canvasHeight);

    const viewportRect = {
        x: (scrollX / (zoom / 100)) * scale,
        y: (scrollY / (zoom / 100)) * scale,
        width: (viewportWidth / (zoom / 100)) * scale,
        height: (viewportHeight / (zoom / 100)) * scale,
    };

    useEffect(() => {
        if (!visible) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = MINIMAP_WIDTH * dpr;
        canvas.height = MINIMAP_HEIGHT * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Background
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, 0, MINIMAP_WIDTH, MINIMAP_HEIGHT);

        // Page outline
        const pageWidth = canvasWidth * scale;
        const pageHeight = canvasHeight * scale;
        const pageX = (MINIMAP_WIDTH - pageWidth) / 2;
        const pageY = (MINIMAP_HEIGHT - pageHeight) / 2;

        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.fillRect(pageX, pageY, pageWidth, pageHeight);
        ctx.strokeRect(pageX, pageY, pageWidth, pageHeight);

        // Elements
        elements.forEach(el => {
            const elX = pageX + el.x * scale;
            const elY = pageY + el.y * scale;
            const elW = el.width * scale;
            const elH = el.height * scale;

            switch (el.type) {
                case 'text':
                    ctx.fillStyle = 'rgba(99, 102, 241, 0.3)';
                    break;
                case 'image':
                    ctx.fillStyle = 'rgba(16, 185, 129, 0.3)';
                    break;
                case 'shape':
                    ctx.fillStyle = 'rgba(245, 158, 11, 0.3)';
                    break;
                default:
                    ctx.fillStyle = 'rgba(107, 114, 128, 0.3)';
            }

            ctx.fillRect(elX, elY, Math.max(2, elW), Math.max(2, elH));
        });

        // Viewport rectangle
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(
            pageX + viewportRect.x,
            pageY + viewportRect.y,
            viewportRect.width,
            viewportRect.height
        );

        ctx.fillStyle = 'rgba(99, 102, 241, 0.1)';
        ctx.fillRect(
            pageX + viewportRect.x,
            pageY + viewportRect.y,
            viewportRect.width,
            viewportRect.height
        );
    }, [visible, canvasWidth, canvasHeight, scale, viewportRect, elements]);

    const handleClick = useCallback((e: React.MouseEvent) => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const pageWidth = canvasWidth * scale;
        const pageHeight = canvasHeight * scale;
        const pageX = (MINIMAP_WIDTH - pageWidth) / 2;
        const pageY = (MINIMAP_HEIGHT - pageHeight) / 2;

        const canvasX = ((x - pageX) / scale) * (zoom / 100);
        const canvasY = ((y - pageY) / scale) * (zoom / 100);

        onNavigate(canvasX - viewportWidth / 2, canvasY - viewportHeight / 2);
    }, [canvasWidth, canvasHeight, scale, zoom, viewportWidth, viewportHeight, onNavigate]);

    if (!visible) return null;

    return (
        <div 
            ref={containerRef}
            className="fixed bottom-6 right-20 z-40 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden cursor-crosshair"
            onClick={handleClick}
        >
            <div className="px-2 py-1 bg-gray-50 border-b border-gray-200">
                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                    Overview
                </span>
            </div>
            <canvas
                ref={canvasRef}
                style={{ width: MINIMAP_WIDTH, height: MINIMAP_HEIGHT }}
                className="block"
            />
        </div>
    );
};

export default ZoomControls;
