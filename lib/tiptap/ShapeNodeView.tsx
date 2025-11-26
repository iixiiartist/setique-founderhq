import React, { useCallback, useMemo } from 'react';
import { NodeViewWrapper, NodeViewProps } from '@tiptap/react';
import { ShapeType } from './ShapeNode';

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
    } = node.attrs;

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
            className={`relative inline-block cursor-move ${selected ? 'ring-2 ring-indigo-500' : ''}`}
            style={{
                transform: rotation ? `rotate(${rotation}deg)` : undefined,
            }}
            data-block-id={blockId}
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

            {/* Shape type indicator when selected */}
            {selected && (
                <div className="absolute -bottom-6 left-0 text-xs text-gray-500 capitalize">
                    {shapeType}
                </div>
            )}
        </NodeViewWrapper>
    );
};

export default ShapeNodeView;
