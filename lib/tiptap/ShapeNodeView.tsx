import React, { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { ShapeType, ShapeAlignment } from './ShapeNode';

// Preset colors for quick selection
const PRESET_COLORS = [
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#22c55e', // Green
    '#f59e0b', // Amber
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#f97316', // Orange
    '#1e40af', // Dark Blue
    '#dc2626', // Dark Red
    '#16a34a', // Dark Green
    '#000000', // Black
    '#6b7280', // Gray
    '#ffffff', // White
    'transparent', // Transparent
];

interface ColorPickerProps {
    label: string;
    color: string;
    onChange: (color: string) => void;
    allowTransparent?: boolean;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ label, color, onChange, allowTransparent = false }) => {
    const [isOpen, setIsOpen] = useState(false);
    const popoverRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const displayColors = allowTransparent ? PRESET_COLORS : PRESET_COLORS.filter(c => c !== 'transparent');

    return (
        <div className="relative" ref={popoverRef}>
            <button
                onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                className="flex items-center gap-1 p-1 rounded hover:bg-gray-100"
                title={label}
            >
                <div 
                    className="w-4 h-4 rounded border border-gray-300"
                    style={{ 
                        backgroundColor: color === 'transparent' ? 'transparent' : color,
                        backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                        backgroundSize: '8px 8px',
                        backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0px'
                    }}
                />
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 9l6 6 6-6"/>
                </svg>
            </button>
            {isOpen && (
                <div 
                    className="absolute bottom-full left-0 mb-1 p-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-xs text-gray-500 mb-1.5 font-medium">{label}</div>
                    <div className="grid grid-cols-5 gap-1 mb-2">
                        {displayColors.map((c) => (
                            <button
                                key={c}
                                onClick={() => { onChange(c); setIsOpen(false); }}
                                className={`w-5 h-5 rounded border-2 ${color === c ? 'border-indigo-500' : 'border-gray-200'} hover:scale-110 transition-transform`}
                                style={{ 
                                    backgroundColor: c === 'transparent' ? 'transparent' : c,
                                    backgroundImage: c === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none',
                                    backgroundSize: '6px 6px',
                                    backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px'
                                }}
                                title={c === 'transparent' ? 'Transparent' : c}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-1.5 pt-1 border-t border-gray-100">
                        <label className="text-xs text-gray-500">Custom:</label>
                        <input
                            type="color"
                            value={color === 'transparent' ? '#ffffff' : color}
                            onChange={(e) => onChange(e.target.value)}
                            className="w-6 h-6 rounded cursor-pointer border-0 p-0"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

const ShapeNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected, deleteNode }) => {
    const {
        blockId,
        shapeType,
        width,
        height,
        fillColor,
        strokeColor,
        strokeWidth,
        opacity,
        rotation,
        alignment = 'center',
    } = node.attrs;

    const alignmentClasses: Record<ShapeAlignment, string> = {
        left: 'mr-auto',
        center: 'mx-auto',
        right: 'ml-auto',
    };

    const handleResize = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();

            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = width;
            const startHeight = height;

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                const newWidth = Math.max(50, startWidth + deltaX);
                const newHeight = Math.max(50, startHeight + deltaY);
                updateAttributes({ width: newWidth, height: newHeight });
            };

            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        [width, height, updateAttributes]
    );

    const renderShape = useMemo(() => {
        const commonProps = {
            fill: fillColor,
            stroke: strokeColor,
            strokeWidth: strokeWidth,
            opacity: opacity,
        };

        switch (shapeType as ShapeType) {
            case 'rectangle':
                return (
                    <rect
                        x={strokeWidth}
                        y={strokeWidth}
                        width={width - strokeWidth * 2}
                        height={height - strokeWidth * 2}
                        rx={4}
                        {...commonProps}
                    />
                );
            case 'circle':
                const cx = width / 2;
                const cy = height / 2;
                const r = Math.min(width, height) / 2 - strokeWidth;
                return <circle cx={cx} cy={cy} r={r} {...commonProps} />;
            case 'triangle':
                const points = `${width / 2},${strokeWidth} ${width - strokeWidth},${height - strokeWidth} ${strokeWidth},${height - strokeWidth}`;
                return <polygon points={points} {...commonProps} />;
            case 'line':
                return (
                    <line
                        x1={strokeWidth}
                        y1={height / 2}
                        x2={width - strokeWidth}
                        y2={height / 2}
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        opacity={opacity}
                    />
                );
            case 'arrow':
                const arrowSize = Math.min(20, width / 4);
                return (
                    <g stroke={strokeColor} strokeWidth={strokeWidth} fill="none" opacity={opacity}>
                        <line x1={strokeWidth} y1={height / 2} x2={width - arrowSize} y2={height / 2} />
                        <polyline
                            points={`${width - arrowSize},${height / 2 - arrowSize / 2} ${width - strokeWidth},${height / 2} ${width - arrowSize},${height / 2 + arrowSize / 2}`}
                            fill={strokeColor}
                        />
                    </g>
                );
            default:
                return null;
        }
    }, [shapeType, width, height, fillColor, strokeColor, strokeWidth, opacity]);

    return (
        <NodeViewWrapper
            className={`relative block ${alignmentClasses[alignment as ShapeAlignment] || 'mx-auto'}`}
            style={{
                width: 'fit-content',
            }}
            data-block-id={blockId}
            data-alignment={alignment}
        >
            <div
                className={`relative inline-block cursor-move ${selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
                style={{
                    transform: rotation ? `rotate(${rotation}deg)` : undefined,
                }}
                draggable="true"
                data-drag-handle
            >
                <svg
                    width={width}
                    height={height}
                    viewBox={`0 0 ${width} ${height}`}
                    className="block"
                >
                    {renderShape}
                </svg>

                {/* Resize handle */}
                {selected && (
                    <>
                        <div
                            className="absolute bottom-0 right-0 w-4 h-4 bg-indigo-500 rounded-bl cursor-se-resize"
                            onMouseDown={handleResize}
                        />
                        <button
                            onClick={() => deleteNode()}
                            className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                            title="Delete shape"
                        >
                            ×
                        </button>
                    </>
                )}
            </div>

            {/* Alignment, color and info toolbar when selected */}
            {selected && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg px-1 py-0.5">
                    {/* Fill color picker */}
                    <ColorPicker
                        label="Fill Color"
                        color={fillColor}
                        onChange={(color) => updateAttributes({ fillColor: color })}
                        allowTransparent={true}
                    />
                    {/* Stroke color picker */}
                    <ColorPicker
                        label="Stroke Color"
                        color={strokeColor}
                        onChange={(color) => updateAttributes({ strokeColor: color })}
                        allowTransparent={false}
                    />
                    <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                    <button
                        onClick={() => updateAttributes({ alignment: 'left' })}
                        className={`p-1 rounded hover:bg-gray-100 ${alignment === 'left' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
                        title="Align Left"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <line x1="3" y1="12" x2="15" y2="12"/>
                            <line x1="3" y1="18" x2="18" y2="18"/>
                        </svg>
                    </button>
                    <button
                        onClick={() => updateAttributes({ alignment: 'center' })}
                        className={`p-1 rounded hover:bg-gray-100 ${alignment === 'center' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
                        title="Align Center"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <line x1="6" y1="12" x2="18" y2="12"/>
                            <line x1="4" y1="18" x2="20" y2="18"/>
                        </svg>
                    </button>
                    <button
                        onClick={() => updateAttributes({ alignment: 'right' })}
                        className={`p-1 rounded hover:bg-gray-100 ${alignment === 'right' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-600'}`}
                        title="Align Right"
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="6" x2="21" y2="6"/>
                            <line x1="9" y1="12" x2="21" y2="12"/>
                            <line x1="6" y1="18" x2="21" y2="18"/>
                        </svg>
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
                    <span className="text-xs text-gray-500 capitalize px-1">{shapeType}</span>
                </div>
            )}
        </NodeViewWrapper>
    );
};

export default ShapeNodeView;
