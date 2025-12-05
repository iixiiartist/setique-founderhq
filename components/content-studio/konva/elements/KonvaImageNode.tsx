/**
 * Konva Image Node Component
 * Renders images with CORS handling using use-image hook
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Image, Rect, Transformer } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';

interface ImageElementBase {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  // Image cropping
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  // Corner radius
  cornerRadius?: number;
  // Shadow
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
}

interface KonvaImageNodeProps {
  element: ImageElementBase;
  isSelected: boolean;
  onSelect: (id: string, additive?: boolean) => void;
  onChange: (id: string, attrs: Partial<ImageElementBase>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function KonvaImageNode({
  element,
  isSelected,
  onSelect,
  onChange,
  onDragStart,
  onDragEnd,
}: KonvaImageNodeProps) {
  const imageRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);
  
  // Load image with CORS handling
  const [image, status] = useImage(element.src, 'anonymous');

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && imageRef.current && trRef.current) {
      trRef.current.nodes([imageRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Handle click - use 'any' to avoid event type incompatibility
  const handleClick = useCallback((e: any) => {
    const evt = e.evt as MouseEvent | TouchEvent;
    const isShift = evt instanceof MouseEvent ? evt.shiftKey : false;
    onSelect(element.id, isShift);
  }, [element.id, onSelect]);

  // Handle drag end
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    onChange(element.id, {
      x: e.target.x(),
      y: e.target.y(),
    });
    onDragEnd?.();
  }, [element.id, onChange, onDragEnd]);

  // Handle transform end
  const handleTransformEnd = useCallback(() => {
    const node = imageRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and adjust size
    node.scaleX(1);
    node.scaleY(1);

    onChange(element.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    });
  }, [element.id, onChange]);

  if (!element.visible) return null;

  // Show loading placeholder if image is loading
  if (status === 'loading') {
    return (
      <Rect
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill="#e5e7eb"
        stroke="#d1d5db"
        strokeWidth={1}
      />
    );
  }

  // Show error state
  if (status === 'failed') {
    return (
      <Rect
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill="#fee2e2"
        stroke="#f87171"
        strokeWidth={1}
      />
    );
  }

  return (
    <>
      <Image
        ref={imageRef}
        id={element.id}
        name="element"
        image={image}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation || 0}
        opacity={element.opacity ?? 1}
        draggable={!element.locked}
        listening={!element.locked}
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        perfectDrawEnabled={false}
        shadowColor={element.shadowColor}
        shadowBlur={element.shadowBlur}
        shadowOffsetX={element.shadowOffsetX}
        shadowOffsetY={element.shadowOffsetY}
        shadowOpacity={element.shadowOpacity}
        // Cropping support
        crop={
          element.cropX !== undefined
            ? {
                x: element.cropX,
                y: element.cropY || 0,
                width: element.cropWidth || element.width,
                height: element.cropHeight || element.height,
              }
            : undefined
        }
        // Corner radius (requires clip function)
        clipFunc={
          element.cornerRadius
            ? (ctx) => {
                const radius = element.cornerRadius || 0;
                ctx.beginPath();
                ctx.moveTo(radius, 0);
                ctx.lineTo(element.width - radius, 0);
                ctx.quadraticCurveTo(element.width, 0, element.width, radius);
                ctx.lineTo(element.width, element.height - radius);
                ctx.quadraticCurveTo(element.width, element.height, element.width - radius, element.height);
                ctx.lineTo(radius, element.height);
                ctx.quadraticCurveTo(0, element.height, 0, element.height - radius);
                ctx.lineTo(0, radius);
                ctx.quadraticCurveTo(0, 0, radius, 0);
                ctx.closePath();
              }
            : undefined
        }
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          borderStroke="#6366f1"
          borderStrokeWidth={1}
          anchorStroke="#6366f1"
          anchorFill="#ffffff"
          anchorSize={8}
          anchorCornerRadius={2}
          keepRatio={true}
          enabledAnchors={[
            'top-left',
            'top-right',
            'bottom-left',
            'bottom-right',
          ]}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit minimum size
            if (newBox.width < 10 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

export default KonvaImageNode;
