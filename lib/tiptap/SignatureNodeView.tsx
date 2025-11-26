import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NodeViewProps } from '@tiptap/react';
import { NodeViewWrapper } from '@tiptap/react';
import type { StructuredBlock } from '../../types';
import { uploadSignatureAsset } from '../services/uploadService';

const MIN_WIDTH = 240;
const MIN_HEIGHT = 140;
const MAX_HISTORY = 10;

interface PointerState {
    drawing: boolean;
    x: number;
    y: number;
}

const SignatureNodeView: React.FC<NodeViewProps> = ({ node, extension, updateAttributes, selected }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const pointerRef = useRef<PointerState>({ drawing: false, x: 0, y: 0 });
    const resizeStateRef = useRef<{ startX: number; startY: number; width: number; height: number } | null>(null);
    const historyRef = useRef<ImageData[]>([]);
    const dragStateRef = useRef<{ startX: number; startY: number; x: number; y: number } | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hasPendingUpload, setHasPendingUpload] = useState(false);
    const [hasInk, setHasInk] = useState(Boolean(node.attrs.assetUrl));
    const [isDragging, setIsDragging] = useState(false);

    // Use refs for ALL extension callbacks to avoid infinite loops
    // These refs are updated silently without triggering re-renders
    const extensionOptionsRef = useRef(extension?.options);
    const cleanupCalledRef = useRef(false);
    const initialMetadataEmittedRef = useRef(false);

    // Silently update the ref when extension options change
    useEffect(() => {
        extensionOptionsRef.current = extension?.options;
    });

    const blockId: string | null = node.attrs.blockId ?? null;
    const width = node.attrs.width ?? 320;
    const height = node.attrs.height ?? 160;
    const x = node.attrs.x ?? 0;
    const y = node.attrs.y ?? 0;
    const zIndex = node.attrs.zIndex ?? 0;
    const rotation = node.attrs.rotation ?? 0;
    const strokeColor: string = node.attrs.strokeColor ?? '#111827';
    const strokeWidth: number = node.attrs.strokeWidth ?? 3;
    const canvasHeight = Math.max(MIN_HEIGHT, height - 80);

    const workspaceId: string | undefined = extension?.options?.workspaceId;
    const docId: string | undefined = extension?.options?.docId;

    // Emit metadata using ref to avoid dependency on extension.options
    const emitMetadata = useCallback(() => {
        if (!blockId) {
            return;
        }

        const now = new Date().toISOString();
        const metadata: StructuredBlock = {
            id: blockId,
            type: 'signature',
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
                assetUrl: node.attrs.assetUrl ?? null,
                assetPath: node.attrs.assetPath ?? null,
                strokeColor,
                strokeWidth,
            },
            createdAt: node.attrs.createdAt ?? now,
            updatedAt: now,
        };

        // Use ref to call the callback without it being a dependency
        extensionOptionsRef.current?.onMetadataChange?.(metadata);
    }, [blockId, height, node.attrs.assetPath, node.attrs.assetUrl, node.attrs.createdAt, node.attrs.rotation, node.attrs.x, node.attrs.y, node.attrs.zIndex, strokeColor, strokeWidth, width]);

    // Only emit initial metadata once when component mounts with a blockId
    useEffect(() => {
        if (blockId && !initialMetadataEmittedRef.current) {
            initialMetadataEmittedRef.current = true;
            emitMetadata();
        }
    }, [blockId, emitMetadata]);

    // Subscribe to block metadata updates
    useEffect(() => {
        if (!blockId) {
            return;
        }
        
        const options = extensionOptionsRef.current;
        if (!options?.subscribeToBlockMetadata) {
            return;
        }
        
        const unsubscribe = options.subscribeToBlockMetadata(blockId, (metadata) => {
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
    }, [blockId, height, rotation, updateAttributes, width, x, y, zIndex]);

    // Cleanup effect for block removal - only runs on unmount
    useEffect(() => {
        cleanupCalledRef.current = false;
        
        return () => {
            if (blockId && !cleanupCalledRef.current) {
                cleanupCalledRef.current = true;
                extensionOptionsRef.current?.onBlockRemoved?.(blockId);
            }
        };
    }, [blockId]);

    const ensureCanvasContext = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return null;
        }
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            return null;
        }
        return { canvas, ctx };
    }, []);

    const resizeCanvas = useCallback(() => {
        const refs = ensureCanvasContext();
        if (!refs) {
            return;
        }
        const { canvas, ctx } = refs;
        const snapshot = canvas.toDataURL('image/png');
        canvas.width = width;
        canvas.height = canvasHeight;
        if (snapshot) {
            const img = new Image();
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
            img.src = snapshot;
        }
    }, [canvasHeight, ensureCanvasContext, width]);

    useEffect(() => {
        resizeCanvas();
    }, [resizeCanvas]);

    const loadPersistedImage = useCallback(() => {
        if (!node.attrs.assetUrl) {
            return;
        }
        const refs = ensureCanvasContext();
        if (!refs) {
            return;
        }
        const { canvas, ctx } = refs;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setHasInk(true);
        };
        img.onerror = () => setError('Failed to load saved signature');
        img.src = node.attrs.assetUrl;
    }, [ensureCanvasContext, node.attrs.assetUrl]);

    useEffect(() => {
        loadPersistedImage();
    }, [loadPersistedImage]);

    useEffect(() => {
        if (node.attrs.assetUrl) {
            setHasPendingUpload(false);
        }
    }, [node.attrs.assetUrl]);

    const pushHistory = useCallback(() => {
        const refs = ensureCanvasContext();
        if (!refs) {
            return;
        }
        const { canvas, ctx } = refs;
        if (!canvas.width || !canvas.height) {
            return;
        }
        try {
            const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
            historyRef.current = [snapshot, ...historyRef.current].slice(0, MAX_HISTORY);
        } catch (err) {
            console.warn('Failed to capture signature snapshot', err);
        }
    }, [ensureCanvasContext]);

    const pointerToCanvasCoords = useCallback((event: PointerEvent | React.PointerEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current;
        if (!canvas) {
            return { x: 0, y: 0 };
        }
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        return { x, y };
    }, []);

    const checkCanvasInk = useCallback(() => {
        const refs = ensureCanvasContext();
        if (!refs) {
            return false;
        }
        const { canvas, ctx } = refs;
        try {
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] > 0) {
                    return true;
                }
            }
        } catch (err) {
            console.warn('Failed to inspect signature canvas', err);
        }
        return false;
    }, [ensureCanvasContext]);

    const handlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLCanvasElement>) => {
            event.preventDefault();
            const refs = ensureCanvasContext();
            if (!refs) {
                return;
            }
            const { ctx } = refs;
            pushHistory();
            const coords = pointerToCanvasCoords(event);
            pointerRef.current = {
                drawing: true,
                x: coords.x,
                y: coords.y,
            };
            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(coords.x, coords.y);
        },
        [ensureCanvasContext, pointerToCanvasCoords, pushHistory, strokeColor, strokeWidth],
    );

    const handlePointerMove = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
        if (!pointerRef.current.drawing) {
            return;
        }
        event.preventDefault();
        const refs = ensureCanvasContext();
        if (!refs) {
            return;
        }
        const { ctx } = refs;
        const coords = pointerToCanvasCoords(event);
        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    }, [ensureCanvasContext, pointerToCanvasCoords]);

    const handlePointerUp = useCallback(() => {
        if (!pointerRef.current.drawing) {
            return;
        }
        pointerRef.current.drawing = false;
        const refs = ensureCanvasContext();
        if (refs) {
            refs.ctx.closePath();
        }
        setHasInk(true);
        setHasPendingUpload(true);
    }, [ensureCanvasContext]);

    const canvasToBlob = useCallback(async (): Promise<Blob> => {
        const canvas = canvasRef.current;
        if (!canvas) {
            throw new Error('Canvas not ready');
        }
        return new Promise<Blob>((resolve, reject) => {
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('Failed to encode signature'));
                }
            }, 'image/png');
        });
    }, []);

    const clearCanvas = useCallback(() => {
        const refs = ensureCanvasContext();
        if (!refs) {
            return;
        }
        const { canvas, ctx } = refs;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        historyRef.current = [];
        setHasInk(false);
        setHasPendingUpload(true);
        updateAttributes({ assetUrl: null, assetPath: null, updatedAt: new Date().toISOString() });
    }, [ensureCanvasContext, updateAttributes]);

    const restoreFromHistory = useCallback(() => {
        const refs = ensureCanvasContext();
        if (!refs) {
            return;
        }
        const entry = historyRef.current.shift();
        const { ctx } = refs;
        if (entry) {
            ctx.putImageData(entry, 0, 0);
            setHasInk(checkCanvasInk());
            setHasPendingUpload(true);
        } else {
            clearCanvas();
        }
    }, [checkCanvasInk, clearCanvas, ensureCanvasContext]);

    const undoLastStroke = useCallback(() => {
        if (!historyRef.current.length) {
            clearCanvas();
            return;
        }
        restoreFromHistory();
    }, [clearCanvas, restoreFromHistory]);

    const handleUpload = useCallback(async () => {
        if (!workspaceId) {
            setError('Workspace context missing for uploads');
            return;
        }
        if (!hasInk) {
            setError('Draw your signature before saving');
            return;
        }
        try {
            setIsUploading(true);
            setError(null);
            const blob = await canvasToBlob();
            const result = await uploadSignatureAsset({ workspaceId, docId, blob });
            updateAttributes({
                assetUrl: result.publicUrl,
                assetPath: result.path,
                updatedAt: new Date().toISOString(),
            });
            setHasPendingUpload(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to upload signature');
        } finally {
            setIsUploading(false);
        }
    }, [canvasToBlob, docId, hasInk, updateAttributes, workspaceId]);

    const handleResizeMove = useCallback(
        (event: MouseEvent) => {
            if (!resizeStateRef.current) {
                return;
            }
            event.preventDefault();
            const { startX, startY, width: startWidth, height: startHeight } = resizeStateRef.current;
            const deltaX = event.clientX - startX;
            const deltaY = event.clientY - startY;
            const nextWidth = Math.max(MIN_WIDTH, Math.round(startWidth + deltaX));
            const nextHeight = Math.max(MIN_HEIGHT, Math.round(startHeight + deltaY));
            updateAttributes({ width: nextWidth, height: nextHeight });
        },
        [updateAttributes],
    );

    const handleResizeEnd = useCallback(() => {
        if (!resizeStateRef.current) {
            return;
        }
        resizeStateRef.current = null;
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
    }, [handleResizeMove]);

    const handleResizeStart = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            event.preventDefault();
            resizeStateRef.current = {
                startX: event.clientX,
                startY: event.clientY,
                width,
                height,
            };
            document.addEventListener('mousemove', handleResizeMove);
            document.addEventListener('mouseup', handleResizeEnd);
        },
        [handleResizeEnd, handleResizeMove, height, width],
    );

    const statusLabel = useMemo(() => {
        if (isUploading) {
            return 'Uploading…';
        }
        if (hasPendingUpload) {
            return 'Unsaved changes';
        }
        if (node.attrs.assetUrl) {
            return 'Saved to cloud';
        }
        return 'Draw signature';
    }, [hasPendingUpload, isUploading, node.attrs.assetUrl]);

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
            document.removeEventListener('mousemove', handleResizeMove);
            document.removeEventListener('mouseup', handleResizeEnd);
            document.removeEventListener('pointermove', handleDragMove);
            document.removeEventListener('pointerup', handleDragEnd);
        };
    }, [handleDragEnd, handleDragMove, handleResizeEnd, handleResizeMove]);

    const transformStyle = useMemo(() => {
        const translate = `translate(${x}px, ${y}px)`;
        const rotateValue = rotation ? ` rotate(${rotation}deg)` : '';
        return `${translate}${rotateValue}`;
    }, [rotation, x, y]);

    return (
        <NodeViewWrapper
            ref={wrapperRef}
            as="section"
            data-block-type="signature"
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
                className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-gray-100 px-5 py-3 cursor-grab"
                onPointerDown={handleDragStart}
            >
                <div className="flex flex-col">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500">Signature</span>
                    <span className="text-xs font-medium text-gray-400">{statusLabel}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
                    <button
                        type="button"
                        className="rounded-full border border-gray-300 px-3 py-1 text-gray-600 transition hover:bg-gray-50"
                        onClick={undoLastStroke}
                    >
                        Undo
                    </button>
                    <button
                        type="button"
                        className="rounded-full border border-gray-300 px-3 py-1 text-gray-600 transition hover:bg-gray-50"
                        onClick={clearCanvas}
                    >
                        Clear
                    </button>
                    <button
                        type="button"
                        className="rounded-full border-2 border-gray-900 bg-gray-900 px-4 py-1 text-white transition hover:-translate-y-0.5"
                        onClick={handleUpload}
                        disabled={isUploading || !hasInk}
                    >
                        {isUploading ? 'Saving…' : 'Save' }
                    </button>
                </div>
            </div>
            <div className="relative px-5 pb-5 pt-4">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={canvasHeight}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className="w-full touch-none rounded-2xl border-2 border-dashed border-gray-300 bg-white"
                    style={{ height: `${canvasHeight}px` }}
                />
                {error && <p className="mt-3 text-xs font-medium text-rose-500">{error}</p>}
            </div>
            <button
                type="button"
                aria-label="Resize signature block"
                className="absolute bottom-3 right-3 h-7 w-7 rounded-full border-2 border-gray-900 bg-white text-xs font-bold text-gray-700 shadow-sm"
                onMouseDown={handleResizeStart}
            >
                ⋱
            </button>
        </NodeViewWrapper>
    );
};

export default SignatureNodeView;
