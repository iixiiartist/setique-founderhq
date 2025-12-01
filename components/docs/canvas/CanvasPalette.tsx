import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Grid2X2,
    LayoutPanelTop,
    MousePointer2,
    PanelsTopLeft,
    PenSquare,
    Signature as SignatureIcon,
    Type,
    Wand2,
    ChevronLeft,
    ChevronRight,
    Users,
    AlertTriangle,
    Square,
    Circle,
    Triangle,
    Minus,
    ArrowRight,
} from 'lucide-react';

type CanvasTool = 'select' | 'text' | 'signature' | 'shape' | 'frame' | 'inspect';
type ShapeType = 'rectangle' | 'circle' | 'triangle' | 'line' | 'arrow';

interface CanvasPaletteProps {
    isOpen: boolean;
    gridVisible: boolean;
    gridSize: number;
    activeTool?: CanvasTool;
    onToggleOpen: () => void;
    onToggleGrid: () => void;
    onGridSizeChange: (value: number) => void;
    onInsertTextBox?: () => void;
    onInsertSignature?: () => void;
    onInsertShape?: (shapeType: ShapeType) => void;
    onInsertFrame?: () => void;
    onToolChange?: (tool: CanvasTool) => void;
    activeUsers?: Array<{ user?: { name?: string; color?: string } } & Record<string, unknown>>;
    collabStatus?: 'disconnected' | 'connecting' | 'connected';
    collabWarning?: string | null;
}

const FOCUSABLE_SELECTOR = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export const CanvasPalette: React.FC<CanvasPaletteProps> = ({
    isOpen,
    gridVisible,
    gridSize,
    activeTool = 'select',
    onToggleOpen,
    onToggleGrid,
    onGridSizeChange,
    onInsertTextBox,
    onInsertSignature,
    onInsertShape,
    onInsertFrame,
    onToolChange,
    activeUsers,
    collabStatus = 'disconnected',
    collabWarning,
}) => {
    const paletteRef = useRef<HTMLDivElement | null>(null);
    const [showShapeMenu, setShowShapeMenu] = useState(false);
    const [currentTool, setCurrentTool] = useState<CanvasTool>(activeTool);

    const handleToolSelect = useCallback((toolId: CanvasTool, handler?: () => void) => {
        setCurrentTool(toolId);
        onToolChange?.(toolId);
        if (handler) {
            handler();
        }
    }, [onToolChange]);

    const handleShapeSelect = useCallback((shapeType: ShapeType) => {
        setShowShapeMenu(false);
        setCurrentTool('shape');
        onToolChange?.('shape');
        onInsertShape?.(shapeType);
    }, [onToolChange, onInsertShape]);

    useEffect(() => {
        if (!isOpen) {
            setShowShapeMenu(false);
            return;
        }

        const node = paletteRef.current;
        if (!node) {
            return;
        }

        const focusable = node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        const handleKeyDown = (event: KeyboardEvent) => {
            // Close shape menu on escape
            if (event.key === 'Escape') {
                if (showShapeMenu) {
                    event.preventDefault();
                    setShowShapeMenu(false);
                    return;
                }
                event.preventDefault();
                onToggleOpen();
                return;
            }

            // Tool shortcuts (only when not typing in an input)
            const target = event.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
            
            if (!isTyping && !event.metaKey && !event.ctrlKey && !event.altKey) {
                switch (event.key.toLowerCase()) {
                    case 'v':
                        event.preventDefault();
                        handleToolSelect('select');
                        break;
                    case 't':
                        event.preventDefault();
                        handleToolSelect('text', onInsertTextBox);
                        break;
                    case 's':
                        // Don't capture Cmd+S for save
                        if (!event.metaKey && !event.ctrlKey) {
                            event.preventDefault();
                            handleToolSelect('signature', onInsertSignature);
                        }
                        break;
                    case 'r':
                        event.preventDefault();
                        setShowShapeMenu(prev => !prev);
                        break;
                    case 'f':
                        event.preventDefault();
                        handleToolSelect('frame', onInsertFrame);
                        break;
                    case 'i':
                        event.preventDefault();
                        handleToolSelect('inspect');
                        break;
                }
            }

            if (event.key === 'Tab' && focusable.length) {
                if (event.shiftKey && document.activeElement === first) {
                    event.preventDefault();
                    last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                    event.preventDefault();
                    first.focus();
                }
            }
        };

        // Close shape menu when clicking outside
        const handleClickOutside = (event: MouseEvent) => {
            if (showShapeMenu && node && !node.contains(event.target as Node)) {
                setShowShapeMenu(false);
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('mousedown', handleClickOutside);
        first?.focus({ preventScroll: true });

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onToggleOpen, showShapeMenu, onInsertTextBox, onInsertSignature, onInsertFrame, handleToolSelect]);

    const tools = useMemo(
        () => [
            { 
                id: 'select' as CanvasTool, 
                label: 'Select', 
                icon: MousePointer2, 
                shortcut: 'V', 
                enabled: true,
                handler: () => handleToolSelect('select'),
            },
            { 
                id: 'text' as CanvasTool, 
                label: 'Text box', 
                icon: Type, 
                shortcut: 'T', 
                enabled: Boolean(onInsertTextBox), 
                handler: () => handleToolSelect('text', onInsertTextBox),
            },
            { 
                id: 'signature' as CanvasTool, 
                label: 'Signature', 
                icon: SignatureIcon, 
                shortcut: 'S', 
                enabled: Boolean(onInsertSignature), 
                handler: () => handleToolSelect('signature', onInsertSignature),
            },
            { 
                id: 'shape' as CanvasTool, 
                label: 'Shape', 
                icon: PenSquare, 
                shortcut: 'R', 
                enabled: Boolean(onInsertShape),
                handler: () => setShowShapeMenu(!showShapeMenu),
                hasSubmenu: true,
            },
            { 
                id: 'frame' as CanvasTool, 
                label: 'Frame', 
                icon: LayoutPanelTop, 
                shortcut: 'F', 
                enabled: Boolean(onInsertFrame),
                handler: () => handleToolSelect('frame', onInsertFrame),
            },
            { 
                id: 'inspect' as CanvasTool, 
                label: 'Inspect', 
                icon: PanelsTopLeft, 
                shortcut: 'I', 
                enabled: true,
                handler: () => handleToolSelect('inspect'),
            },
        ],
        [onInsertSignature, onInsertTextBox, onInsertShape, onInsertFrame, showShapeMenu],
    );

    const shapeOptions: { type: ShapeType; label: string; icon: React.ElementType }[] = [
        { type: 'rectangle', label: 'Rectangle', icon: Square },
        { type: 'circle', label: 'Circle', icon: Circle },
        { type: 'triangle', label: 'Triangle', icon: Triangle },
        { type: 'line', label: 'Line', icon: Minus },
        { type: 'arrow', label: 'Arrow', icon: ArrowRight },
    ];

    const gridOptions = useMemo(() => [8, 12, 16, 24, 32], []);

    const collaboratorAvatars = useMemo(() => {
        const list = activeUsers ?? [];
        const visible = list.slice(0, 4);
        const overflow = Math.max(0, list.length - visible.length);
        return { visible, overflow };
    }, [activeUsers]);

    const collabStatusLabel = useMemo(() => {
        switch (collabStatus) {
            case 'connected':
                return { label: 'Live', dot: 'bg-emerald-500' };
            case 'connecting':
                return { label: 'Connecting…', dot: 'bg-amber-400 animate-pulse' };
            default:
                return { label: 'Offline', dot: 'bg-gray-400' };
        }
    }, [collabStatus]);

    return (
        <div className="hidden lg:block">
            <div className="fixed left-6 top-[160px] z-40 flex flex-col gap-3">
                <button
                    type="button"
                    onClick={onToggleOpen}
                    className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-white/90 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-gray-600 shadow-sm backdrop-blur hover:bg-white"
                >
                    {isOpen ? (
                        <>
                            <ChevronLeft size={14} /> Hide Canvas Tools
                        </>
                    ) : (
                        <>
                            <ChevronRight size={14} /> Show Canvas Tools
                        </>
                    )}
                </button>

                <div
                    ref={paletteRef}
                    role="region"
                    aria-label="Canvas palette"
                    className={`transform rounded-3xl border border-gray-200 bg-white/95 p-4 shadow-lg transition-all duration-200 ${
                        isOpen ? 'opacity-100 translate-x-0' : 'pointer-events-none opacity-0 -translate-x-2'
                    }`}
                >
                    <div className="mb-3 flex items-center justify-between text-sm font-semibold text-gray-900">
                        <div className="flex items-center gap-2">
                            <Wand2 size={16} /> Canvas Tools
                        </div>
                    </div>

                    <div className="mb-3 space-y-2 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">
                            <span className="inline-flex items-center gap-2">
                                <Users size={14} /> Presence
                            </span>
                            <span className="inline-flex items-center gap-1 text-gray-600">
                                <span className={`h-2 w-2 rounded-full ${collabStatusLabel.dot}`} aria-hidden="true" />
                                {collabStatusLabel.label}
                            </span>
                        </div>
                        {collaboratorAvatars.visible.length ? (
                            <div className="flex items-center justify-between">
                                <div className="flex -space-x-2">
                                    {collaboratorAvatars.visible.map((user, index) => {
                                        const name = user?.user?.name ?? 'Collaborator';
                                        const initial = name.trim().charAt(0).toUpperCase() || 'U';
                                        const color = user?.user?.color ?? '#0f172a';
                                        return (
                                            <div
                                                key={`${name}-${index}`}
                                                title={name}
                                                className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-semibold text-white shadow-sm"
                                                style={{ backgroundColor: color }}
                                                aria-label={name}
                                            >
                                                {initial}
                                            </div>
                                        );
                                    })}
                                </div>
                                {collaboratorAvatars.overflow > 0 && (
                                    <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">
                                        +{collaboratorAvatars.overflow}
                                    </span>
                                )}
                            </div>
                        ) : (
                            <p className="text-[11px] font-semibold text-gray-500">You're the only one here.</p>
                        )}
                        {collabWarning && (
                            <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-[11px] font-semibold text-amber-900">
                                <AlertTriangle size={14} />
                                <span>{collabWarning}</span>
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        {tools.map(({ id, label, icon: Icon, shortcut, enabled, handler, hasSubmenu }) => (
                            <div key={id} className="relative">
                                <button
                                    type="button"
                                    disabled={!enabled}
                                    aria-disabled={!enabled}
                                    aria-expanded={hasSubmenu && showShapeMenu}
                                    onClick={enabled && handler ? () => handler() : undefined}
                                    className={`flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left text-sm transition ${
                                        currentTool === id
                                            ? 'border-2 border-indigo-500 bg-indigo-50 text-indigo-900 font-semibold'
                                            : enabled
                                            ? 'border border-gray-900 bg-white text-gray-900 hover:bg-gray-50'
                                            : 'border border-dashed border-gray-300 text-gray-400'
                                    }`}
                                >
                                    <span className="inline-flex items-center gap-2">
                                        <Icon size={16} /> {label}
                                    </span>
                                    <span className={`text-[11px] font-mono uppercase tracking-[0.35em] ${currentTool === id ? 'text-indigo-400' : 'text-gray-300'}`}>{shortcut}</span>
                                </button>
                                
                                {/* Shape submenu */}
                                {id === 'shape' && showShapeMenu && enabled && (
                                    <div className="absolute left-full top-0 ml-2 z-50 w-40 rounded-xl border border-gray-200 bg-white shadow-lg p-2 space-y-1">
                                        {shapeOptions.map(({ type, label: shapeLabel, icon: ShapeIcon }) => (
                                            <button
                                                key={type}
                                                type="button"
                                                onClick={() => handleShapeSelect(type)}
                                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition"
                                            >
                                                <ShapeIcon size={14} />
                                                {shapeLabel}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-3">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.3em] text-gray-500">
                            Grid Overlay
                            <span className="text-[10px] text-gray-400">⌘ + '
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onToggleGrid}
                            className={`flex w-full items-center justify-between rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                                gridVisible
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                                    : 'border-gray-300 bg-white text-gray-600'
                            }`}
                        >
                            <span className="inline-flex items-center gap-2">
                                <Grid2X2 size={16} /> {gridVisible ? 'Hide grid' : 'Show grid'}
                            </span>
                        </button>
                        <label className="flex flex-col gap-1 text-xs font-semibold text-gray-500">
                            Grid spacing
                            <select
                                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-200"
                                value={gridSize}
                                onChange={(event) => onGridSizeChange(Number(event.target.value))}
                            >
                                {gridOptions.map((option) => (
                                    <option key={option} value={option}>
                                        {option}px
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
