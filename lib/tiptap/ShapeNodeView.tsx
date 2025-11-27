import React, { useCallback, useMemo } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { ShapeType, ShapeAlignment } from './ShapeNode';

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

            {/* Alignment and info toolbar when selected */}
            {selected && (
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white border border-gray-200 rounded-lg shadow-lg px-1 py-0.5">
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
