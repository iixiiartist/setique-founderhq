import React, { useCallback, useState, useMemo, useRef, useEffect } from 'react';
import {
    MousePointer2,
    Hand,
    Type,
    Square,
    Circle,
    Triangle,
    Minus,
    ArrowRight,
    Image,
    Pen,
    Eraser,
    Pipette,
    LayoutGrid,
    Layers,
    ZoomIn,
    ZoomOut,
    Maximize2,
    RotateCcw,
    Lock,
    Unlock,
    AlignLeft,
    AlignCenter,
    AlignRight,
    AlignStartVertical,
    AlignCenterVertical,
    AlignEndVertical,
    AlignHorizontalSpaceAround,
    Group,
    Ungroup,
    Copy,
    Trash2,
    ChevronDown,
    Grid3X3,
    Ruler,
    Eye,
    EyeOff,
    Magnet,
    Settings2,
    Undo,
    Redo,
    MoreHorizontal,
    PenLine,
    Frame,
} from 'lucide-react';

export type CanvasTool = 
    | 'select' 
    | 'hand' 
    | 'text' 
    | 'signature'
    | 'frame'
    | 'rectangle' 
    | 'circle' 
    | 'triangle' 
    | 'line' 
    | 'arrow' 
    | 'image' 
    | 'pen' 
    | 'eraser' 
    | 'eyedropper';

interface ProCanvasToolbarProps {
    activeTool: CanvasTool;
    onToolChange: (tool: CanvasTool) => void;
    zoom: number;
    onZoomChange: (zoom: number) => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
    gridVisible: boolean;
    onToggleGrid: () => void;
    rulersVisible: boolean;
    onToggleRulers: () => void;
    snapEnabled: boolean;
    onToggleSnap: () => void;
    selectedCount: number;
    // Insert callbacks
    onInsertTextBox?: () => void;
    onInsertSignature?: () => void;
    onInsertShape?: (shapeType: 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow') => void;
    onInsertFrame?: () => void;
    onInsertImage?: () => void;
    // Alignment callbacks
    onAlignLeft?: () => void;
    onAlignCenter?: () => void;
    onAlignRight?: () => void;
    onAlignTop?: () => void;
    onAlignMiddle?: () => void;
    onAlignBottom?: () => void;
    onDistributeHorizontal?: () => void;
    onDistributeVertical?: () => void;
    onGroup?: () => void;
    onUngroup?: () => void;
    onDuplicate?: () => void;
    onDelete?: () => void;
    onLock?: () => void;
    isLocked?: boolean;
}

const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300, 400];

export const ProCanvasToolbar: React.FC<ProCanvasToolbarProps> = ({
    activeTool,
    onToolChange,
    zoom,
    onZoomChange,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    gridVisible,
    onToggleGrid,
    rulersVisible,
    onToggleRulers,
    snapEnabled,
    onToggleSnap,
    selectedCount,
    onInsertTextBox,
    onInsertSignature,
    onInsertShape,
    onInsertFrame,
    onInsertImage,
    onAlignLeft,
    onAlignCenter,
    onAlignRight,
    onAlignTop,
    onAlignMiddle,
    onAlignBottom,
    onDistributeHorizontal,
    onDistributeVertical,
    onGroup,
    onUngroup,
    onDuplicate,
    onDelete,
    onLock,
    isLocked = false,
}) => {
    const [showZoomMenu, setShowZoomMenu] = useState(false);
    const [showShapeMenu, setShowShapeMenu] = useState(false);
    const [showViewMenu, setShowViewMenu] = useState(false);
    const zoomMenuRef = useRef<HTMLDivElement>(null);
    const shapeMenuRef = useRef<HTMLDivElement>(null);
    const viewMenuRef = useRef<HTMLDivElement>(null);

    const primaryTools = useMemo(() => [
        { id: 'select' as CanvasTool, icon: MousePointer2, label: 'Select', shortcut: 'V' },
        { id: 'hand' as CanvasTool, icon: Hand, label: 'Pan', shortcut: 'H' },
    ], []);

    const shapeTools = useMemo(() => [
        { id: 'rectangle' as CanvasTool, icon: Square, label: 'Rectangle', shortcut: 'R', shapeType: 'rectangle' as const },
        { id: 'circle' as CanvasTool, icon: Circle, label: 'Circle', shortcut: 'O', shapeType: 'circle' as const },
        { id: 'triangle' as CanvasTool, icon: Triangle, label: 'Triangle', shapeType: 'triangle' as const },
        { id: 'line' as CanvasTool, icon: Minus, label: 'Line', shortcut: 'L', shapeType: 'line' as const },
        { id: 'arrow' as CanvasTool, icon: ArrowRight, label: 'Arrow', shapeType: 'arrow' as const },
    ], []);

    const creationTools = useMemo(() => [
        { id: 'text' as CanvasTool, icon: Type, label: 'Text Box', shortcut: 'T', action: onInsertTextBox },
        { id: 'signature' as CanvasTool, icon: PenLine, label: 'Signature', shortcut: 'S', action: onInsertSignature },
        { id: 'frame' as CanvasTool, icon: Frame, label: 'Frame', shortcut: 'F', action: onInsertFrame },
        { id: 'image' as CanvasTool, icon: Image, label: 'Image', action: onInsertImage },
        { id: 'pen' as CanvasTool, icon: Pen, label: 'Draw', shortcut: 'P' },
    ], [onInsertTextBox, onInsertSignature, onInsertFrame, onInsertImage]);

    const currentShapeTool = shapeTools.find(t => t.id === activeTool) || shapeTools[0];

    // Close menus on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (zoomMenuRef.current && !zoomMenuRef.current.contains(e.target as Node)) {
                setShowZoomMenu(false);
            }
            if (shapeMenuRef.current && !shapeMenuRef.current.contains(e.target as Node)) {
                setShowShapeMenu(false);
            }
            if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
                setShowViewMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Skip if typing in input
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
                return;
            }

            // Tool shortcuts
            if (!e.metaKey && !e.ctrlKey && !e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'v': onToolChange('select'); break;
                    case 'h': onToolChange('hand'); break;
                    case 't': onToolChange('text'); break;
                    case 'r': onToolChange('rectangle'); break;
                    case 'o': onToolChange('circle'); break;
                    case 'l': onToolChange('line'); break;
                    case 'p': onToolChange('pen'); break;
                }
            }

            // Zoom shortcuts
            if (e.metaKey || e.ctrlKey) {
                if (e.key === '=' || e.key === '+') {
                    e.preventDefault();
                    onZoomChange(Math.min(400, zoom + 25));
                } else if (e.key === '-') {
                    e.preventDefault();
                    onZoomChange(Math.max(25, zoom - 25));
                } else if (e.key === '0') {
                    e.preventDefault();
                    onZoomChange(100);
                } else if (e.key === '1') {
                    e.preventDefault();
                    onZoomChange(100);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onToolChange, onZoomChange, zoom]);

    const handleZoomIn = useCallback(() => {
        const nextZoom = ZOOM_PRESETS.find(z => z > zoom) || zoom + 25;
        onZoomChange(Math.min(400, nextZoom));
    }, [zoom, onZoomChange]);

    const handleZoomOut = useCallback(() => {
        const presets = [...ZOOM_PRESETS].reverse();
        const nextZoom = presets.find(z => z < zoom) || zoom - 25;
        onZoomChange(Math.max(25, nextZoom));
    }, [zoom, onZoomChange]);

    const handleFitToScreen = useCallback(() => {
        // This would calculate the best fit based on canvas size
        onZoomChange(100);
    }, [onZoomChange]);

    const ToolButton: React.FC<{
        tool: { id: CanvasTool; icon: React.ElementType; label: string; shortcut?: string; action?: () => void };
        isActive?: boolean;
        onClick?: () => void;
    }> = ({ tool, isActive, onClick }) => (
        <button
            type="button"
            onClick={onClick || (() => onToolChange(tool.id))}
            className={`relative flex items-center justify-center w-9 h-9 rounded-lg transition-all ${
                isActive 
                    ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
            title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ''}`}
        >
            <tool.icon size={18} strokeWidth={isActive ? 2 : 1.5} />
        </button>
    );

    const Divider = () => <div className="w-px h-6 bg-gray-200 mx-1" />;

    return (
        <div className="flex items-center gap-1 px-2 py-1.5 bg-white border-b border-gray-200 shadow-sm overflow-visible">
            {/* History */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                    type="button"
                    onClick={onUndo}
                    disabled={!canUndo}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                        canUndo 
                            ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' 
                            : 'text-gray-300 cursor-not-allowed'
                    }`}
                    title="Undo (⌘Z)"
                >
                    <Undo size={16} />
                </button>
                <button
                    type="button"
                    onClick={onRedo}
                    disabled={!canRedo}
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${
                        canRedo 
                            ? 'text-gray-600 hover:bg-gray-100 hover:text-gray-900' 
                            : 'text-gray-300 cursor-not-allowed'
                    }`}
                    title="Redo (⌘⇧Z)"
                >
                    <Redo size={16} />
                </button>
            </div>

            <Divider />

            {/* Primary tools */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
                {primaryTools.map(tool => (
                    <ToolButton 
                        key={tool.id} 
                        tool={tool} 
                        isActive={activeTool === tool.id} 
                    />
                ))}
            </div>

            <Divider />

            {/* Shape tools dropdown */}
            <div ref={shapeMenuRef} className="relative">
                <button
                    type="button"
                    onClick={() => setShowShapeMenu(!showShapeMenu)}
                    className={`relative flex items-center gap-1 px-2 h-9 rounded-lg transition-all ${
                        shapeTools.some(t => t.id === activeTool)
                            ? 'bg-indigo-100 text-indigo-700 shadow-sm' 
                            : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title="Shapes"
                >
                    <currentShapeTool.icon size={18} />
                    <ChevronDown size={12} />
                </button>

                {showShapeMenu && (
                    <div className="absolute top-full left-0 mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-xl z-50 py-1 overflow-hidden">
                        {shapeTools.map(tool => (
                            <button
                                key={tool.id}
                                type="button"
                                onClick={() => {
                                    onToolChange(tool.id);
                                    onInsertShape?.(tool.shapeType);
                                    setShowShapeMenu(false);
                                }}
                                className={`flex items-center gap-3 w-full px-3 py-2 text-sm transition-all ${
                                    activeTool === tool.id
                                        ? 'bg-indigo-50 text-indigo-700'
                                        : 'text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <tool.icon size={16} />
                                <span className="flex-1 text-left">{tool.label}</span>
                                {tool.shortcut && (
                                    <span className="text-xs text-gray-400 font-mono">{tool.shortcut}</span>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Creation tools */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
                {creationTools.map(tool => (
                    <ToolButton 
                        key={tool.id} 
                        tool={tool} 
                        isActive={activeTool === tool.id}
                        onClick={() => {
                            onToolChange(tool.id);
                            tool.action?.();
                        }}
                    />
                ))}
            </div>

            <Divider />

            {/* View controls */}
            <div ref={viewMenuRef} className="relative flex-shrink-0">
                <button
                    type="button"
                    onClick={() => setShowViewMenu(!showViewMenu)}
                    className="flex items-center gap-1.5 px-2.5 h-8 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-all"
                    title="View options"
                >
                    <LayoutGrid size={15} />
                    <ChevronDown size={12} />
                </button>

                {showViewMenu && (
                    <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl border border-gray-200 shadow-xl z-50 py-1 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => { onToggleGrid(); setShowViewMenu(false); }}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            <span className="flex items-center gap-3">
                                <Grid3X3 size={16} />
                                Show Grid
                            </span>
                            <span className={`w-4 h-4 rounded flex items-center justify-center ${gridVisible ? 'bg-indigo-500 text-white' : 'border border-gray-300'}`}>
                                {gridVisible && <span className="text-xs">✓</span>}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { onToggleRulers(); setShowViewMenu(false); }}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            <span className="flex items-center gap-3">
                                <Ruler size={16} />
                                Show Rulers
                            </span>
                            <span className={`w-4 h-4 rounded flex items-center justify-center ${rulersVisible ? 'bg-indigo-500 text-white' : 'border border-gray-300'}`}>
                                {rulersVisible && <span className="text-xs">✓</span>}
                            </span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { onToggleSnap(); setShowViewMenu(false); }}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            <span className="flex items-center gap-3">
                                <Magnet size={16} />
                                Snap to Grid
                            </span>
                            <span className={`w-4 h-4 rounded flex items-center justify-center ${snapEnabled ? 'bg-indigo-500 text-white' : 'border border-gray-300'}`}>
                                {snapEnabled && <span className="text-xs">✓</span>}
                            </span>
                        </button>
                    </div>
                )}
            </div>

            <Divider />

            {/* Zoom controls */}
            <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                    type="button"
                    onClick={handleZoomOut}
                    disabled={zoom <= 25}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-all"
                    title="Zoom out (⌘-)"
                >
                    <ZoomOut size={16} />
                </button>

                <div ref={zoomMenuRef} className="relative">
                    <button
                        type="button"
                        onClick={() => setShowZoomMenu(!showZoomMenu)}
                        className="flex items-center gap-1 px-2 h-8 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 min-w-[60px] justify-center transition-all"
                    >
                        {zoom}%
                        <ChevronDown size={12} />
                    </button>

                    {showZoomMenu && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-32 bg-white rounded-xl border border-gray-200 shadow-xl z-50 py-1 overflow-hidden">
                            {ZOOM_PRESETS.map(preset => (
                                <button
                                    key={preset}
                                    type="button"
                                    onClick={() => {
                                        onZoomChange(preset);
                                        setShowZoomMenu(false);
                                    }}
                                    className={`flex items-center justify-between w-full px-3 py-1.5 text-sm transition-all ${
                                        zoom === preset
                                            ? 'bg-indigo-50 text-indigo-700 font-medium'
                                            : 'text-gray-700 hover:bg-gray-50'
                                    }`}
                                >
                                    {preset}%
                                </button>
                            ))}
                            <div className="border-t border-gray-100 my-1" />
                            <button
                                type="button"
                                onClick={() => {
                                    handleFitToScreen();
                                    setShowZoomMenu(false);
                                }}
                                className="flex items-center gap-2 w-full px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                            >
                                <Maximize2 size={14} />
                                Fit to screen
                            </button>
                        </div>
                    )}
                </div>

                <button
                    type="button"
                    onClick={handleZoomIn}
                    disabled={zoom >= 400}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-all"
                    title="Zoom in (⌘+)"
                >
                    <ZoomIn size={16} />
                </button>
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Selection actions - only show when elements selected */}
            {selectedCount > 0 && (
                <>
                    <div className="flex items-center gap-0.5 px-2 py-1 bg-gray-50 rounded-lg">
                        <span className="text-xs font-medium text-gray-500 mr-2">
                            {selectedCount} selected
                        </span>

                        {selectedCount > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={onAlignLeft}
                                    className="flex items-center justify-center w-7 h-7 rounded text-gray-600 hover:bg-gray-200 transition-all"
                                    title="Align left"
                                >
                                    <AlignLeft size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={onAlignCenter}
                                    className="flex items-center justify-center w-7 h-7 rounded text-gray-600 hover:bg-gray-200 transition-all"
                                    title="Align center"
                                >
                                    <AlignCenter size={14} />
                                </button>
                                <button
                                    type="button"
                                    onClick={onAlignRight}
                                    className="flex items-center justify-center w-7 h-7 rounded text-gray-600 hover:bg-gray-200 transition-all"
                                    title="Align right"
                                >
                                    <AlignRight size={14} />
                                </button>

                                <div className="w-px h-4 bg-gray-300 mx-1" />

                                <button
                                    type="button"
                                    onClick={onGroup}
                                    className="flex items-center justify-center w-7 h-7 rounded text-gray-600 hover:bg-gray-200 transition-all"
                                    title="Group (⌘G)"
                                >
                                    <Group size={14} />
                                </button>
                            </>
                        )}

                        <button
                            type="button"
                            onClick={onDuplicate}
                            className="flex items-center justify-center w-7 h-7 rounded text-gray-600 hover:bg-gray-200 transition-all"
                            title="Duplicate (⌘D)"
                        >
                            <Copy size={14} />
                        </button>

                        <button
                            type="button"
                            onClick={onLock}
                            className={`flex items-center justify-center w-7 h-7 rounded transition-all ${
                                isLocked ? 'text-amber-600 bg-amber-50' : 'text-gray-600 hover:bg-gray-200'
                            }`}
                            title={isLocked ? 'Unlock' : 'Lock'}
                        >
                            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
                        </button>

                        <button
                            type="button"
                            onClick={onDelete}
                            className="flex items-center justify-center w-7 h-7 rounded text-red-600 hover:bg-red-50 transition-all"
                            title="Delete (⌫)"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>

                    <Divider />
                </>
            )}

            {/* More options */}
            <button
                type="button"
                className="flex items-center justify-center w-8 h-8 rounded-lg text-gray-600 hover:bg-gray-100 transition-all"
                title="More options"
            >
                <MoreHorizontal size={18} />
            </button>
        </div>
    );
};

export default ProCanvasToolbar;
