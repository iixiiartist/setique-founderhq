/**
 * Konva Shape Node Component
 * Renders various shape types (rect, circle, ellipse, polygon, line, arrow)
 */

import React, { useRef, useEffect, useCallback } from 'react';
import { Rect, Circle, Ellipse, Line, Arrow, RegularPolygon, Star, Transformer } from 'react-konva';
import Konva from 'konva';

// Shape element type with shapeType discriminator
interface ShapeElementBase {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  visible?: boolean;
  locked?: boolean;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  cornerRadius?: number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  sides?: number;
  numPoints?: number;
  innerRadius?: number;
  points?: number[];
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'miter' | 'round' | 'bevel';
  tension?: number;
  closed?: boolean;
  pointerLength?: number;
  pointerWidth?: number;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowOpacity?: number;
  shapeType: 'rect' | 'circle' | 'ellipse' | 'polygon' | 'star' | 'line' | 'arrow';
}

interface KonvaShapeNodeProps {
  element: ShapeElementBase;
  isSelected: boolean;
  onSelect: (id: string, additive?: boolean) => void;
  onChange: (id: string, attrs: Partial<ShapeElementBase>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function KonvaShapeNode({
  element,
  isSelected,
  onSelect,
  onChange,
  onDragStart,
  onDragEnd,
}: KonvaShapeNodeProps) {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<Konva.Transformer>(null);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && shapeRef.current && trRef.current) {
      trRef.current.nodes([shapeRef.current]);
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
    const node = shapeRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and adjust size
    node.scaleX(1);
    node.scaleY(1);

    const attrs: Partial<ShapeElementBase> = {
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
    };

    // Handle different shape types
    if (element.shapeType === 'circle') {
      attrs.radius = Math.max(5, (element.radius || 50) * Math.max(scaleX, scaleY));
    } else if (element.shapeType === 'ellipse') {
      attrs.radiusX = Math.max(5, (element.radiusX || 50) * scaleX);
      attrs.radiusY = Math.max(5, (element.radiusY || 30) * scaleY);
    } else if (element.shapeType === 'polygon' || element.shapeType === 'star') {
      attrs.radius = Math.max(5, (element.radius || 50) * Math.max(scaleX, scaleY));
    } else {
      attrs.width = Math.max(5, node.width() * scaleX);
      attrs.height = Math.max(5, node.height() * scaleY);
    }

    onChange(element.id, attrs);
  }, [element, onChange]);

  if (!element.visible) return null;

  // Common props for all shapes
  const commonProps = {
    ref: shapeRef,
    id: element.id,
    name: 'element',
    x: element.x,
    y: element.y,
    rotation: element.rotation || 0,
    opacity: element.opacity ?? 1,
    fill: element.fill || '#6366f1',
    stroke: element.stroke,
    strokeWidth: element.strokeWidth || 0,
    draggable: !element.locked,
    listening: !element.locked,
    onClick: handleClick,
    onTap: handleClick,
    onDragStart,
    onDragEnd: handleDragEnd,
    onTransformEnd: handleTransformEnd,
    perfectDrawEnabled: false,
    shadowColor: element.shadowColor,
    shadowBlur: element.shadowBlur,
    shadowOffsetX: element.shadowOffsetX,
    shadowOffsetY: element.shadowOffsetY,
    shadowOpacity: element.shadowOpacity,
  };

  // Transformer configuration
  const transformerProps = {
    ref: trRef,
    rotateEnabled: true,
    borderStroke: '#6366f1',
    borderStrokeWidth: 1,
    anchorStroke: '#6366f1',
    anchorFill: '#ffffff',
    anchorSize: 8,
    anchorCornerRadius: 2,
    boundBoxFunc: (oldBox: any, newBox: any) => {
      if (newBox.width < 10 || newBox.height < 10) {
        return oldBox;
      }
      return newBox;
    },
  };

  // Render shape based on type
  const renderShape = () => {
    switch (element.shapeType) {
      case 'rect':
        return (
          <Rect
            {...commonProps}
            width={element.width || 100}
            height={element.height || 100}
            cornerRadius={element.cornerRadius || 0}
          />
        );

      case 'circle':
        return (
          <Circle
            {...commonProps}
            radius={element.radius || 50}
          />
        );

      case 'ellipse':
        return (
          <Ellipse
            {...commonProps}
            radiusX={element.radiusX || 50}
            radiusY={element.radiusY || 30}
          />
        );

      case 'polygon':
        return (
          <RegularPolygon
            {...commonProps}
            sides={element.sides || 6}
            radius={element.radius || 50}
          />
        );

      case 'star':
        return (
          <Star
            {...commonProps}
            numPoints={element.numPoints || 5}
            innerRadius={element.innerRadius || 20}
            outerRadius={element.radius || 50}
          />
        );

      case 'line':
        return (
          <Line
            {...commonProps}
            points={element.points || [0, 0, 100, 100]}
            stroke={element.stroke || element.fill || '#6366f1'}
            strokeWidth={element.strokeWidth || 2}
            lineCap={element.lineCap || 'round'}
            lineJoin={element.lineJoin || 'round'}
            tension={element.tension || 0}
            closed={element.closed || false}
          />
        );

      case 'arrow':
        return (
          <Arrow
            {...commonProps}
            points={element.points || [0, 0, 100, 100]}
            stroke={element.stroke || element.fill || '#6366f1'}
            strokeWidth={element.strokeWidth || 2}
            pointerLength={element.pointerLength || 10}
            pointerWidth={element.pointerWidth || 10}
          />
        );

      default:
        // Default to rectangle
        return (
          <Rect
            {...commonProps}
            width={element.width || 100}
            height={element.height || 100}
          />
        );
    }
  };

  return (
    <>
      {renderShape()}
      {isSelected && <Transformer {...transformerProps} />}
    </>
  );
}

export default KonvaShapeNode;
