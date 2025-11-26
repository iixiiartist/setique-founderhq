import React, { useCallback, useState } from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import { LayoutPanelTop } from 'lucide-react';

const FrameNodeView: React.FC<NodeViewProps> = ({ node, updateAttributes, selected, deleteNode }) => {
    const {
        blockId,
        width,
        height,
        label,
        backgroundColor,
        borderColor,
        borderWidth,
        borderRadius,
        padding,
        rotation,
    } = node.attrs;

    const [isEditingLabel, setIsEditingLabel] = useState(false);
    const [tempLabel, setTempLabel] = useState(label);

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
                const newWidth = Math.max(200, startWidth + deltaX);
                const newHeight = Math.max(100, startHeight + deltaY);
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

    const handleLabelSave = () => {
        updateAttributes({ label: tempLabel });
        setIsEditingLabel(false);
    };

    return (
        <NodeViewWrapper
            className={`relative my-4 ${selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`}
            style={{
                width: width,
                minHeight: height,
                backgroundColor,
                border: `${borderWidth}px solid ${borderColor}`,
                borderRadius: borderRadius,
                padding: padding,
                transform: rotation ? `rotate(${rotation}deg)` : undefined,
            }}
            data-block-id={blockId}
            draggable="true"
            data-drag-handle
        >
            {/* Frame label header */}
            <div
                className="absolute -top-6 left-0 flex items-center gap-1 text-xs font-medium text-gray-500"
                contentEditable={false}
            >
                <LayoutPanelTop size={12} />
                {isEditingLabel ? (
                    <input
                        type="text"
                        value={tempLabel}
                        onChange={(e) => setTempLabel(e.target.value)}
                        onBlur={handleLabelSave}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                handleLabelSave();
                            }
                            if (e.key === 'Escape') {
                                setTempLabel(label);
                                setIsEditingLabel(false);
                            }
                        }}
                        className="w-32 px-1 text-xs border border-gray-300 rounded focus:outline-none focus:border-indigo-500"
                        autoFocus
                    />
                ) : (
                    <span
                        onClick={() => setIsEditingLabel(true)}
                        className="cursor-pointer hover:text-gray-700"
                    >
                        {label}
                    </span>
                )}
            </div>

            {/* Frame content */}
            <NodeViewContent className="min-h-[40px]" />

            {/* Controls when selected */}
            {selected && (
                <>
                    {/* Resize handle */}
                    <div
                        className="absolute bottom-0 right-0 w-4 h-4 bg-indigo-500 cursor-se-resize rounded-tl"
                        onMouseDown={handleResize}
                    />
                    
                    {/* Delete button */}
                    <button
                        onClick={() => deleteNode()}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                        title="Delete frame"
                        contentEditable={false}
                    >
                        ×
                    </button>

                    {/* Style controls */}
                    <div 
                        className="absolute -bottom-10 left-0 flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1 shadow-sm"
                        contentEditable={false}
                    >
                        <label className="flex items-center gap-1 text-xs">
                            <span className="text-gray-500">Fill:</span>
                            <input
                                type="color"
                                value={backgroundColor}
                                onChange={(e) => updateAttributes({ backgroundColor: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer border-0"
                            />
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                            <span className="text-gray-500">Border:</span>
                            <input
                                type="color"
                                value={borderColor}
                                onChange={(e) => updateAttributes({ borderColor: e.target.value })}
                                className="w-6 h-6 rounded cursor-pointer border-0"
                            />
                        </label>
                    </div>
                </>
            )}
        </NodeViewWrapper>
    );
};

export default FrameNodeView;
