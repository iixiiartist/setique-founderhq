import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NodeViewWrapper, NodeViewContent, NodeViewProps } from '@tiptap/react';
import type { StructuredBlock } from '../../types';

const MIN_WIDTH = 220;
const MIN_HEIGHT = 120;

const TextBoxNodeView: React.FC<NodeViewProps> = ({ node, extension, updateAttributes, selected }) => {
    const resizeStateRef = useRef<{ startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
    const dragStateRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
    const blockId: string | null = node.attrs.blockId ?? null;
    const width = node.attrs.width ?? 360;
    const height = node.attrs.height ?? 180;
    const x = node.attrs.x ?? 0;
    const y = node.attrs.y ?? 0;
    const zIndex = node.attrs.zIndex ?? 0;
    const rotation = node.attrs.rotation ?? 0;
    const placeholder: string = node.attrs.placeholder ?? 'Type your notes';
    const [isDragging, setIsDragging] = useState(false);

    const emitMetadata = useCallback(() => {
        if (!blockId) {
            return;
        }

        const now = new Date().toISOString();
        const metadata: StructuredBlock = {
            id: blockId,
            type: 'textbox',
            position: {
                x: node.attrs.x ?? 0,
                y: node.attrs.y ?? 0,
                zIndex: node.attrs.zIndex ?? 0,
            },
            size: {
                width,
                height,
            },
            rotation: node.attrs.rotation ?? 0,
            data: {
                placeholder,
            },
            createdAt: node.attrs.createdAt ?? now,
            updatedAt: now,
        };

        extension?.options?.onMetadataChange?.(metadata);
    }, [blockId, extension?.options, height, node.attrs.createdAt, node.attrs.rotation, node.attrs.x, node.attrs.y, node.attrs.zIndex, placeholder, width]);

    useEffect(() => {
        emitMetadata();
    }, [emitMetadata]);

    useEffect(() => {
        if (!blockId || !extension?.options?.subscribeToBlockMetadata) {
            return;
        }
        const unsubscribe = extension.options.subscribeToBlockMetadata(blockId, (metadata) => {
            if (!metadata) {
                return;
            }
            const patch: Partial<{ width: number; height: number; x: number; y: number; zIndex: number; rotation: number }> = {};

            if (typeof metadata.size?.width === 'number' && metadata.size.width !== width) {
                patch.width = metadata.size.width;
            }
            if (typeof metadata.size?.height === 'number' && metadata.size.height !== height) {
                patch.height = metadata.size.height;
            }
            if (typeof metadata.position?.x === 'number' && metadata.position.x !== x) {
                patch.x = metadata.position.x;
            }
            if (typeof metadata.position?.y === 'number' && metadata.position.y !== y) {
                patch.y = metadata.position.y;
            }
            if (typeof metadata.position?.zIndex === 'number' && metadata.position.zIndex !== zIndex) {
                patch.zIndex = metadata.position.zIndex;
            }
            if (typeof metadata.rotation === 'number' && metadata.rotation !== rotation) {
                patch.rotation = metadata.rotation;
            }

            if (Object.keys(patch).length) {
                updateAttributes({ ...patch, updatedAt: metadata.updatedAt });
            }
        });

        return () => {
            unsubscribe?.();
        };
    }, [blockId, extension?.options, height, rotation, updateAttributes, width, x, y, zIndex]);

    useEffect(() => {
        return () => {
            if (blockId) {
                extension?.options?.onBlockRemoved?.(blockId);
            }
        };
    }, [blockId, extension?.options]);

    const handleMouseMove = useCallback(
        (event: MouseEvent) => {
            if (!resizeStateRef.current) {
                return;
            }

            event.preventDefault();
            const { startX, startY, startWidth, startHeight } = resizeStateRef.current;
            const deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;

            const nextWidth = Math.max(MIN_WIDTH, Math.round(startWidth + deltaX));
            const nextHeight = Math.max(MIN_HEIGHT, Math.round(startHeight + deltaY));

            updateAttributes({ width: nextWidth, height: nextHeight });
        },
        [updateAttributes],
    );

    const handleMouseUp = useCallback(() => {
        if (!resizeStateRef.current) {
            return;
        }

        resizeStateRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    const handleMouseDown = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            resizeStateRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                startWidth: width,
                startHeight: height,
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        },
        [handleMouseMove, handleMouseUp, height, width],
    );

    const handleDragMove = useCallback(
        (event: PointerEvent) => {
            const dragState = dragStateRef.current;
            if (!dragState) {
                return;
            }
            event.preventDefault();
            const deltaX = event.clientX - dragState.startX;
            const deltaY = event.clientY - dragState.startY;
            const nextX = Math.round(dragState.x + deltaX);
            const nextY = Math.round(dragState.y + deltaY);
            updateAttributes({ x: nextX, y: nextY });
        },
        [updateAttributes],
    );

    const handleDragEnd = useCallback(() => {
        dragStateRef.current = null;
        setIsDragging(false);
        document.removeEventListener('pointermove', handleDragMove);
        document.removeEventListener('pointerup', handleDragEnd);
    }, [handleDragMove]);

    const handleDragStart = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            event.preventDefault();
            event.stopPropagation();
            dragStateRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                x,
                y,
            };
            setIsDragging(true);
            document.addEventListener('pointermove', handleDragMove);
            document.addEventListener('pointerup', handleDragEnd);
        },
        [handleDragEnd, handleDragMove, x, y],
    );

    useEffect(() => {
        return () => {
            document.removeEventListener('pointermove', handleDragMove);
            document.removeEventListener('pointerup', handleDragEnd);
        };
    }, [handleDragEnd, handleDragMove]);

    const transformStyle = useMemo(() => {
        const translate = `translate(${x}px, ${y}px)`;
        const rotateValue = rotation ? ` rotate(${rotation}deg)` : '';
        return `${translate}${rotateValue}`;
    }, [rotation, x, y]);

    const showPlaceholder = node.content.size === 0;

    return (
        <NodeViewWrapper
            as="section"
            data-block-type="textbox"
            data-block-id={blockId ?? undefined}
            data-block-x={x}
            data-block-y={y}
            data-block-z={zIndex}
            data-block-rotation={rotation}
            data-block-dragging={isDragging || undefined}
            className={`relative my-6 rounded-3xl border-2 border-gray-900 bg-white shadow-[0_12px_30px_rgba(15,23,42,0.15)] transition focus-within:ring-2 focus-within:ring-gray-900 ${
                selected ? 'ring-2 ring-gray-900' : ''
            }`}
            style={{
                width: width ? `${width}px` : undefined,
                minHeight: `${height}px`,
                transform: transformStyle,
                cursor: isDragging ? 'grabbing' : undefined,
                willChange: 'transform',
            }}
        >
            <div
                className="flex items-center justify-between border-b-2 border-gray-100 px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500 cursor-grab"
                onPointerDown={handleDragStart}
            >
                <span>Text box</span>
                <span className="text-gray-400">Drag to resize</span>
            </div>
            <div className="relative px-5 py-4">
                {showPlaceholder && (
                    <span className="pointer-events-none absolute left-5 top-4 text-sm text-gray-400">{placeholder}</span>
                )}
                <NodeViewContent className="prose prose-sm max-w-none text-gray-900 focus:outline-none" />
            </div>
            <button
                type="button"
                aria-label="Resize text box"
                className="absolute bottom-3 right-3 h-6 w-6 rounded-full border-2 border-gray-900 bg-white text-xs font-bold text-gray-700 shadow-sm"
                onMouseDown={handleMouseDown}
            >
                ⋰
            </button>
        </NodeViewWrapper>
    );
};

export default TextBoxNodeView;
