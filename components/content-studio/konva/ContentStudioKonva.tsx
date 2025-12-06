/**
 * Content Studio Konva
 * Main wrapper component for the React-Konva based Content Studio
 */

import React, { useEffect, useCallback, useRef, useState } from 'react';
import { Stage, Layer, Rect, Text, Circle, Line, Arrow, RegularPolygon, Star, Transformer, Group, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { KonvaProvider, useKonvaContext } from './KonvaContext';
import { KonvaElementToolbar } from './KonvaElementToolbar';
import { KonvaLayersPanel } from './KonvaLayersPanel';
import { KonvaPropertiesPanel } from './KonvaPropertiesPanel';
import { KonvaPageNavigation } from './KonvaPageNavigation';
import { KonvaAIPanel } from './KonvaAIPanel';
import { KonvaAssetPanel } from './KonvaAssetPanel';
import { KonvaTextToolbar } from './KonvaTextToolbar';
import { KonvaTextEditor } from './KonvaTextEditor';
import { KonvaElement } from './types';
import { ConfirmDialogProvider } from '../../ui/ConfirmDialog';
import { showSuccess, showError } from '../../../lib/utils/toast';
import { uploadImage } from '../../../lib/services/contentStudioStorage';
import { useWorkspace } from '../../../contexts/WorkspaceContext';

// ============================================================================
// Element Renderers
// ============================================================================

interface ElementRendererProps {
  element: KonvaElement;
  isSelected: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onChange: (id: string, attrs: Partial<KonvaElement>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDoubleClick?: (id: string) => void;
}

// Text Element
function TextRenderer({ element, isSelected, onSelect, onChange, onDragStart, onDragEnd, onDoubleClick }: ElementRendererProps) {
  const textRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const el = element as any;
  
  useEffect(() => {
    if (isSelected && textRef.current && trRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  
  const handleClick = useCallback((e: any) => {
    const evt = e.evt;
    onSelect(element.id, evt?.shiftKey || false);
  }, [element.id, onSelect]);

  const handleDoubleClick = useCallback(() => {
    onDoubleClick?.(element.id);
  }, [element.id, onDoubleClick]);
  
  const handleDragEnd = useCallback((e: any) => {
    onChange(element.id, { x: e.target.x(), y: e.target.y() });
    onDragEnd?.();
  }, [element.id, onChange, onDragEnd]);
  
  const handleTransformEnd = useCallback(() => {
    const node = textRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    
    // Calculate new font size based on vertical scale
    const currentFontSize = el.fontSize || 24;
    const newFontSize = Math.max(8, Math.round(currentFontSize * scaleY));
    
    node.scaleX(1);
    node.scaleY(1);
    onChange(element.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(20, node.width() * scaleX),
      fontSize: newFontSize,
      rotation: node.rotation(),
    } as any);
  }, [element.id, onChange, el.fontSize]);
  
  if (!element.visible) return null;
  
  return (
    <>
      <Text
        ref={textRef}
        id={element.id}
        name="element"
        x={element.x}
        y={element.y}
        width={el.width}
        text={el.text || 'Double-click to edit'}
        fontSize={el.fontSize || 24}
        fontFamily={el.fontFamily || 'Inter'}
        fontStyle={el.fontStyle || 'normal'}
        textDecoration={el.textDecoration || ''}
        fill={element.fill || '#1f2937'}
        align={el.align || 'left'}
        rotation={element.rotation || 0}
        opacity={element.opacity ?? 1}
        draggable={!element.locked}
        onClick={handleClick}
        onTap={handleClick}
        onDblClick={handleDoubleClick}
        onDblTap={handleDoubleClick}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']}
          borderStroke="#4b5563"
          borderStrokeWidth={2}
          borderDash={[4, 4]}
          anchorStroke="#4b5563"
          anchorFill="#ffffff"
          anchorSize={10}
          anchorCornerRadius={2}
          rotateAnchorOffset={25}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 20 || newBox.height < 10) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

// Rectangle Element
function RectRenderer({ element, isSelected, onSelect, onChange, onDragStart, onDragEnd }: ElementRendererProps) {
  const rectRef = useRef<Konva.Rect>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const el = element as any;
  
  useEffect(() => {
    if (isSelected && rectRef.current && trRef.current) {
      trRef.current.nodes([rectRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  
  const handleClick = useCallback((e: any) => {
    onSelect(element.id, e.evt?.shiftKey || false);
  }, [element.id, onSelect]);
  
  const handleDragEnd = useCallback((e: any) => {
    onChange(element.id, { x: e.target.x(), y: e.target.y() });
    onDragEnd?.();
  }, [element.id, onChange, onDragEnd]);
  
  const handleTransformEnd = useCallback(() => {
    const node = rectRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange(element.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    } as any);
  }, [element.id, onChange]);
  
  if (!element.visible) return null;
  
  return (
    <>
      <Rect
        ref={rectRef}
        id={element.id}
        name="element"
        x={element.x}
        y={element.y}
        width={el.width || 200}
        height={el.height || 150}
        fill={element.fill || '#4b5563'}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth || 0}
        cornerRadius={element.cornerRadius || 0}
        rotation={element.rotation || 0}
        opacity={element.opacity ?? 1}
        shadowColor={element.shadowColor}
        shadowBlur={element.shadowBlur}
        shadowOffsetX={element.shadowOffsetX}
        shadowOffsetY={element.shadowOffsetY}
        draggable={!element.locked}
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']}
          borderStroke="#4b5563"
          borderStrokeWidth={2}
          borderDash={[4, 4]}
          anchorStroke="#4b5563"
          anchorFill="#ffffff"
          anchorSize={10}
          anchorCornerRadius={2}
          rotateAnchorOffset={25}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}

// Circle Element
function CircleRenderer({ element, isSelected, onSelect, onChange, onDragStart, onDragEnd }: ElementRendererProps) {
  const circleRef = useRef<Konva.Circle>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const el = element as any;
  
  useEffect(() => {
    if (isSelected && circleRef.current && trRef.current) {
      trRef.current.nodes([circleRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  
  const handleClick = useCallback((e: any) => {
    onSelect(element.id, e.evt?.shiftKey || false);
  }, [element.id, onSelect]);
  
  const handleDragEnd = useCallback((e: any) => {
    onChange(element.id, { x: e.target.x(), y: e.target.y() });
    onDragEnd?.();
  }, [element.id, onChange, onDragEnd]);
  
  const handleTransformEnd = useCallback(() => {
    const node = circleRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    node.scaleX(1);
    node.scaleY(1);
    onChange(element.id, {
      x: node.x(),
      y: node.y(),
      radius: Math.max(5, el.radius * scaleX),
      rotation: node.rotation(),
    } as any);
  }, [element.id, el.radius, onChange]);
  
  if (!element.visible) return null;
  
  return (
    <>
      <Circle
        ref={circleRef}
        id={element.id}
        name="element"
        x={element.x}
        y={element.y}
        radius={el.radius || 75}
        fill={element.fill || '#4b5563'}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth || 0}
        rotation={element.rotation || 0}
        opacity={element.opacity ?? 1}
        shadowColor={element.shadowColor}
        shadowBlur={element.shadowBlur}
        shadowOffsetX={element.shadowOffsetX}
        shadowOffsetY={element.shadowOffsetY}
        draggable={!element.locked}
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          borderStroke="#4b5563"
          borderStrokeWidth={2}
          borderDash={[4, 4]}
          anchorStroke="#4b5563"
          anchorFill="#ffffff"
          anchorSize={10}
          anchorCornerRadius={2}
          rotateAnchorOffset={25}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          keepRatio={true}
          centeredScaling={true}
        />
      )}
    </>
  );
}

// Line/Arrow Element with draggable endpoint handles
function LineRenderer({ element, isSelected, onSelect, onChange, onDragStart, onDragEnd }: ElementRendererProps) {
  const lineRef = useRef<any>(null);
  const el = element as any;
  const isArrow = element.type === 'arrow';
  const points = el.points || [0, 0, 200, 0];
  
  const handleClick = useCallback((e: any) => {
    onSelect(element.id, e.evt?.shiftKey || false);
  }, [element.id, onSelect]);
  
  const handleDragEnd = useCallback((e: any) => {
    onChange(element.id, { x: e.target.x(), y: e.target.y() });
    onDragEnd?.();
  }, [element.id, onChange, onDragEnd]);
  
  // Handle dragging of start point
  const handleStartPointDrag = useCallback((e: any) => {
    const node = e.target;
    const newPoints = [...points];
    newPoints[0] = node.x();
    newPoints[1] = node.y();
    // Reset handle position
    node.x(0);
    node.y(0);
    onChange(element.id, { points: newPoints } as any);
  }, [element.id, points, onChange]);
  
  // Handle dragging of end point
  const handleEndPointDrag = useCallback((e: any) => {
    const node = e.target;
    const newPoints = [...points];
    newPoints[2] = node.x();
    newPoints[3] = node.y();
    // Reset handle position
    node.x(0);
    node.y(0);
    onChange(element.id, { points: newPoints } as any);
  }, [element.id, points, onChange]);
  
  if (!element.visible) return null;
  
  const LineComponent = isArrow ? Arrow : Line;
  
  return (
    <Group x={element.x} y={element.y}>
      <LineComponent
        ref={lineRef}
        id={element.id}
        name="element"
        points={points}
        stroke={element.stroke || element.fill || '#4b5563'}
        strokeWidth={element.strokeWidth || 2}
        rotation={element.rotation || 0}
        opacity={element.opacity ?? 1}
        pointerLength={isArrow ? (el.pointerLength || 10) : undefined}
        pointerWidth={isArrow ? (el.pointerWidth || 10) : undefined}
        hitStrokeWidth={20}
        draggable={!element.locked}
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
      />
      {/* Endpoint handles when selected */}
      {isSelected && (
        <>
          {/* Start point handle */}
          <Circle
            x={points[0]}
            y={points[1]}
            radius={8}
            fill="#ffffff"
            stroke="#4b5563"
            strokeWidth={2}
            draggable={!element.locked}
            onDragMove={handleStartPointDrag}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'move';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }}
          />
          {/* End point handle */}
          <Circle
            x={points[2]}
            y={points[3]}
            radius={8}
            fill="#ffffff"
            stroke="#4b5563"
            strokeWidth={2}
            draggable={!element.locked}
            onDragMove={handleEndPointDrag}
            onMouseEnter={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'move';
            }}
            onMouseLeave={(e) => {
              const stage = e.target.getStage();
              if (stage) stage.container().style.cursor = 'default';
            }}
          />
          {/* Selection border */}
          <Rect
            x={Math.min(points[0], points[2]) - 5}
            y={Math.min(points[1], points[3]) - 5}
            width={Math.abs(points[2] - points[0]) + 10}
            height={Math.abs(points[3] - points[1]) + 10}
            stroke="#4b5563"
            strokeWidth={1}
            dash={[4, 4]}
            listening={false}
          />
        </>
      )}
    </Group>
  );
}

// Polygon Element
function PolygonRenderer({ element, isSelected, onSelect, onChange, onDragStart, onDragEnd }: ElementRendererProps) {
  const polyRef = useRef<any>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const el = element as any;
  
  useEffect(() => {
    if (isSelected && polyRef.current && trRef.current) {
      trRef.current.nodes([polyRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  
  const handleClick = useCallback((e: any) => {
    onSelect(element.id, e.evt?.shiftKey || false);
  }, [element.id, onSelect]);
  
  const handleDragEnd = useCallback((e: any) => {
    onChange(element.id, { x: e.target.x(), y: e.target.y() });
    onDragEnd?.();
  }, [element.id, onChange, onDragEnd]);
  
  if (!element.visible) return null;
  
  return (
    <>
      <RegularPolygon
        ref={polyRef}
        id={element.id}
        name="element"
        x={element.x}
        y={element.y}
        sides={el.sides || 6}
        radius={el.radius || 50}
        fill={element.fill || '#4b5563'}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth || 0}
        rotation={element.rotation || 0}
        opacity={element.opacity ?? 1}
        draggable={!element.locked}
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          borderStroke="#4b5563"
          borderStrokeWidth={2}
          borderDash={[4, 4]}
          anchorStroke="#4b5563"
          anchorFill="#ffffff"
          anchorSize={10}
          anchorCornerRadius={2}
          rotateAnchorOffset={25}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          keepRatio={true}
          centeredScaling={true}
        />
      )}
    </>
  );
}

// Star Element
function StarRenderer({ element, isSelected, onSelect, onChange, onDragStart, onDragEnd }: ElementRendererProps) {
  const starRef = useRef<any>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const el = element as any;
  
  useEffect(() => {
    if (isSelected && starRef.current && trRef.current) {
      trRef.current.nodes([starRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  
  const handleClick = useCallback((e: any) => {
    onSelect(element.id, e.evt?.shiftKey || false);
  }, [element.id, onSelect]);
  
  const handleDragEnd = useCallback((e: any) => {
    onChange(element.id, { x: e.target.x(), y: e.target.y() });
    onDragEnd?.();
  }, [element.id, onChange, onDragEnd]);
  
  if (!element.visible) return null;
  
  return (
    <>
      <Star
        ref={starRef}
        id={element.id}
        name="element"
        x={element.x}
        y={element.y}
        numPoints={el.numPoints || 5}
        innerRadius={el.innerRadius || 20}
        outerRadius={el.outerRadius || 50}
        fill={element.fill || '#4b5563'}
        stroke={element.stroke}
        strokeWidth={element.strokeWidth || 0}
        rotation={element.rotation || 0}
        opacity={element.opacity ?? 1}
        draggable={!element.locked}
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          borderStroke="#4b5563"
          borderStrokeWidth={2}
          borderDash={[4, 4]}
          anchorStroke="#4b5563"
          anchorFill="#ffffff"
          anchorSize={10}
          anchorCornerRadius={2}
          rotateAnchorOffset={25}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          keepRatio={true}
          centeredScaling={true}
        />
      )}
    </>
  );
}

// Image Element
function ImageRenderer({ element, isSelected, onSelect, onChange, onDragStart, onDragEnd }: ElementRendererProps) {
  const imageRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const el = element as any;
  const [image, status] = useImage(el.src || '', 'anonymous');
  
  useEffect(() => {
    if (isSelected && imageRef.current && trRef.current) {
      trRef.current.nodes([imageRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  
  const handleClick = useCallback((e: any) => {
    onSelect(element.id, e.evt?.shiftKey || false);
  }, [element.id, onSelect]);
  
  const handleDragEnd = useCallback((e: any) => {
    onChange(element.id, { x: e.target.x(), y: e.target.y() });
    onDragEnd?.();
  }, [element.id, onChange, onDragEnd]);
  
  const handleTransformEnd = useCallback(() => {
    const node = imageRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange(element.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      height: Math.max(5, node.height() * scaleY),
      rotation: node.rotation(),
    } as any);
  }, [element.id, onChange]);
  
  if (!element.visible) return null;
  
  if (status !== 'loaded' || !image) {
    return (
      <Rect
        id={element.id}
        x={element.x}
        y={element.y}
        width={el.width || 200}
        height={el.height || 200}
        fill={status === 'failed' ? '#fee2e2' : '#e5e7eb'}
        stroke={status === 'failed' ? '#f87171' : '#d1d5db'}
        strokeWidth={1}
      />
    );
  }
  
  return (
    <>
      <KonvaImage
        ref={imageRef}
        id={element.id}
        name="element"
        image={image}
        x={element.x}
        y={element.y}
        width={el.width || 200}
        height={el.height || 200}
        rotation={element.rotation || 0}
        opacity={element.opacity ?? 1}
        draggable={!element.locked}
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          keepRatio={false}
          enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']}
          borderStroke="#4b5563"
          borderStrokeWidth={2}
          borderDash={[4, 4]}
          anchorStroke="#4b5563"
          anchorFill="#ffffff"
          anchorSize={10}
          anchorCornerRadius={2}
          rotateAnchorOffset={25}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
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

// Group Element - allows grouping multiple elements together
interface GroupRendererProps extends ElementRendererProps {
  renderChild: (child: KonvaElement, isChildSelected: boolean) => React.ReactNode;
}

function GroupRenderer({ element, isSelected, onSelect, onChange, onDragStart, onDragEnd, renderChild }: GroupRendererProps) {
  const groupRef = useRef<Konva.Group>(null);
  const trRef = useRef<Konva.Transformer>(null);
  
  useEffect(() => {
    if (isSelected && trRef.current && groupRef.current) {
      trRef.current.nodes([groupRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);
  
  const groupElement = element as any; // Cast to access children
  const children: KonvaElement[] = groupElement.children || [];
  
  const handleDragStart = useCallback(() => {
    onDragStart?.();
  }, [onDragStart]);
  
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    const dx = node.x() - (element.x || 0);
    const dy = node.y() - (element.y || 0);
    
    // Update group position and all children positions
    const updatedChildren = children.map(child => ({
      ...child,
      x: (child.x || 0) + dx,
      y: (child.y || 0) + dy,
    }));
    
    onChange(element.id, {
      x: node.x(),
      y: node.y(),
      children: updatedChildren,
    });
    
    onDragEnd?.();
  }, [element, children, onChange, onDragEnd]);
  
  const handleTransformEnd = useCallback((e: Konva.KonvaEventObject<Event>) => {
    const node = groupRef.current;
    if (!node) return;
    
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    const rotation = node.rotation();
    
    // Reset scale and apply to dimensions
    node.scaleX(1);
    node.scaleY(1);
    
    // Scale all children
    const updatedChildren = children.map(child => ({
      ...child,
      x: (child.x || 0) * scaleX,
      y: (child.y || 0) * scaleY,
      width: (child.width || 100) * scaleX,
      height: (child.height || 100) * scaleY,
    }));
    
    onChange(element.id, {
      x: node.x(),
      y: node.y(),
      rotation,
      children: updatedChildren,
    });
  }, [element, children, onChange]);
  
  return (
    <>
      <Group
        ref={groupRef}
        id={element.id}
        x={element.x || 0}
        y={element.y || 0}
        rotation={element.rotation || 0}
        opacity={(element as any).opacity ?? 1}
        draggable
        onClick={(e) => {
          e.cancelBubble = true;
          onSelect(element.id, e.evt.shiftKey);
        }}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect(element.id, false);
        }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
      >
        {children.map((child) => renderChild(child, false))}
      </Group>
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled={true}
          keepRatio={false}
          enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']}
          borderStroke="#4b5563"
          borderStrokeWidth={2}
          borderDash={[4, 4]}
          anchorStroke="#4b5563"
          anchorFill="#ffffff"
          anchorSize={10}
          anchorCornerRadius={2}
          rotateAnchorOffset={25}
          rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          boundBoxFunc={(oldBox, newBox) => {
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

// Element Router
function ElementRenderer(props: ElementRendererProps) {
  switch (props.element.type) {
    case 'text':
      return <TextRenderer {...props} />;
    case 'rect':
      return <RectRenderer {...props} />;
    case 'circle':
    case 'ellipse':
      return <CircleRenderer {...props} />;
    case 'line':
    case 'arrow':
      return <LineRenderer {...props} />;
    case 'regularPolygon':
      return <PolygonRenderer {...props} />;
    case 'star':
      return <StarRenderer {...props} />;
    case 'image':
      return <ImageRenderer {...props} />;
    case 'group':
      // Groups render their children recursively
      return (
        <GroupRenderer 
          {...props} 
          renderChild={(child, isChildSelected) => (
            <ElementRenderer
              key={child.id}
              element={child}
              isSelected={isChildSelected}
              onSelect={props.onSelect}
              onChange={props.onChange}
              onDragStart={props.onDragStart}
              onDragEnd={props.onDragEnd}
              onDoubleClick={props.onDoubleClick}
            />
          )}
        />
      );
    default:
      return null;
  }
}

// ============================================================================
// Canvas Component
// ============================================================================

function KonvaCanvasInternal() {
  const {
    state,
    stageRef,
    selectedIds,
    setSelectedIds,
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    activeTool,
    updateElement,
    getCurrentPage,
    createNewDocument,
    pushUndo,
    deleteSelectedElements,
    addCustomElement,
    groupSelectedElements,
    ungroupSelectedElements,
    getSelectedElements,
  } = useKonvaContext();
  const { workspace } = useWorkspace();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  
  // Get current page
  const currentPage = getCurrentPage();
  const elements = currentPage?.canvas.elements || [];
  const canvasWidth = currentPage?.canvas.width || 1920;
  const canvasHeight = currentPage?.canvas.height || 1080;
  const bgColor = currentPage?.canvas.backgroundColor || '#ffffff';
  
  // Get selected element for toolbar positioning
  const selectedElement = selectedIds.length === 1 
    ? elements.find(el => el.id === selectedIds[0]) 
    : null;
  const showTextToolbar = selectedElement?.type === 'text' && !editingTextId;
  const editingElement = editingTextId 
    ? elements.find(el => el.id === editingTextId) 
    : null;
  
  // Create new document if none exists
  useEffect(() => {
    if (!state.document) {
      createNewDocument('New Design');
    }
  }, [state.document, createNewDocument]);
  
  // Resize observer
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setStageSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, []);
  
  // Clipboard storage for copied elements
  const [clipboardElements, setClipboardElements] = useState<KonvaElement[]>([]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If editing text, only handle Escape
      if (editingTextId) {
        if (e.key === 'Escape') {
          setEditingTextId(null);
        }
        return;
      }
      
      // Skip if we're in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // Copy (Ctrl+C)
      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const elementsToCopy = elements.filter(el => selectedIds.includes(el.id));
          setClipboardElements(elementsToCopy);
          // Also try to write to system clipboard for text elements
          const textElement = elementsToCopy.find(el => el.type === 'text');
          if (textElement && 'text' in textElement) {
            navigator.clipboard.writeText(textElement.text as string).catch(() => {});
          }
          showSuccess(`Copied ${elementsToCopy.length} element${elementsToCopy.length > 1 ? 's' : ''}`);
        }
      }
      
      // Paste (Ctrl+V) - for copied canvas elements
      if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
        if (clipboardElements.length > 0) {
          e.preventDefault();
          pushUndo();
          const newIds: string[] = [];
          clipboardElements.forEach((el, i) => {
            const newElement: KonvaElement = {
              ...JSON.parse(JSON.stringify(el)),
              id: crypto.randomUUID(),
              x: el.x + 20, // Offset so it's visible
              y: el.y + 20,
              name: `${el.name} (copy)`,
            };
            addCustomElement(newElement);
            newIds.push(newElement.id);
          });
          setSelectedIds(newIds);
          showSuccess(`Pasted ${clipboardElements.length} element${clipboardElements.length > 1 ? 's' : ''}`);
          return; // Don't process system paste
        }
      }
      
      // Duplicate (Ctrl+D)
      if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          pushUndo();
          const newIds: string[] = [];
          selectedIds.forEach(id => {
            const el = elements.find(e => e.id === id);
            if (el) {
              const newElement: KonvaElement = {
                ...JSON.parse(JSON.stringify(el)),
                id: crypto.randomUUID(),
                x: el.x + 20,
                y: el.y + 20,
                name: `${el.name} (copy)`,
              };
              addCustomElement(newElement);
              newIds.push(newElement.id);
            }
          });
          setSelectedIds(newIds);
          showSuccess(`Duplicated ${newIds.length} element${newIds.length > 1 ? 's' : ''}`);
        }
      }
      
      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0 && document.activeElement === document.body) {
          e.preventDefault();
          deleteSelectedElements();
        }
      }
      // Select all
      if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSelectedIds(elements.map(el => el.id));
      }
      // Escape
      if (e.key === 'Escape') {
        setSelectedIds([]);
      }
      
      // Group (Ctrl+G)
      if (e.key === 'g' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (selectedIds.length >= 2) {
          e.preventDefault();
          groupSelectedElements();
          showSuccess('Elements grouped');
        }
      }
      
      // Ungroup (Ctrl+Shift+G)
      if (e.key === 'g' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        if (selectedIds.length > 0) {
          e.preventDefault();
          const selected = getSelectedElements();
          if (selected.some(el => el.type === 'group')) {
            ungroupSelectedElements();
            showSuccess('Elements ungrouped');
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, elements, deleteSelectedElements, setSelectedIds, editingTextId, clipboardElements, pushUndo, addCustomElement, groupSelectedElements, ungroupSelectedElements, getSelectedElements]);
  
  // Clipboard paste handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Skip if we're in an input field
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      // Skip if editing text
      if (editingTextId) return;
      
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;
      
      // Check for image files first
      const files = Array.from(clipboardData.files);
      const imageFile = files.find(f => f.type.startsWith('image/'));
      
      if (imageFile) {
        e.preventDefault();
        
        // Upload to Supabase storage if workspace available
        if (workspace?.id) {
          try {
            const result = await uploadImage(imageFile, workspace.id, state.document?.id);
            if (result) {
              // Create image element at center of canvas
              const img = new Image();
              img.onload = () => {
                // Scale down if too large
                let width = img.width;
                let height = img.height;
                const maxSize = 500;
                if (width > maxSize || height > maxSize) {
                  const ratio = Math.min(maxSize / width, maxSize / height);
                  width *= ratio;
                  height *= ratio;
                }
                
                const imageElement: KonvaElement = {
                  id: crypto.randomUUID(),
                  type: 'image',
                  x: (canvasWidth - width) / 2,
                  y: (canvasHeight - height) / 2,
                  width,
                  height,
                  rotation: 0,
                  opacity: 1,
                  locked: false,
                  visible: true,
                  name: imageFile.name || 'Pasted Image',
                  src: result.url,
                } as KonvaElement;
                
                pushUndo();
                addCustomElement(imageElement);
                setSelectedIds([imageElement.id]);
                showSuccess('Image pasted to canvas');
              };
              img.src = result.url;
            }
          } catch (error) {
            console.error('[ContentStudio] Paste image error:', error);
            showError('Failed to paste image');
          }
        } else {
          // No workspace - use data URL directly
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const img = new Image();
            img.onload = () => {
              let width = img.width;
              let height = img.height;
              const maxSize = 500;
              if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width *= ratio;
                height *= ratio;
              }
              
              const imageElement: KonvaElement = {
                id: crypto.randomUUID(),
                type: 'image',
                x: (canvasWidth - width) / 2,
                y: (canvasHeight - height) / 2,
                width,
                height,
                rotation: 0,
                opacity: 1,
                locked: false,
                visible: true,
                name: imageFile.name || 'Pasted Image',
                src: dataUrl,
              } as KonvaElement;
              
              pushUndo();
              addCustomElement(imageElement);
              setSelectedIds([imageElement.id]);
              showSuccess('Image pasted to canvas');
            };
            img.src = dataUrl;
          };
          reader.readAsDataURL(imageFile);
        }
        return;
      }
      
      // Check for text content
      const text = clipboardData.getData('text/plain');
      if (text && text.trim()) {
        e.preventDefault();
        
        // Create text element at center of canvas
        const textElement: KonvaElement = {
          id: crypto.randomUUID(),
          type: 'text',
          x: canvasWidth / 2 - 100,
          y: canvasHeight / 2 - 20,
          width: 300,
          rotation: 0,
          opacity: 1,
          locked: false,
          visible: true,
          name: 'Pasted Text',
          text: text.trim(),
          fontSize: 24,
          fontFamily: 'Inter',
          fontStyle: 'normal',
          fontWeight: 'normal',
          fill: '#1f2937',
          align: 'left',
          verticalAlign: 'top',
        } as KonvaElement;
        
        pushUndo();
        addCustomElement(textElement);
        setSelectedIds([textElement.id]);
        showSuccess('Text pasted to canvas');
        return;
      }
    };
    
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [editingTextId, workspace?.id, state.document?.id, canvasWidth, canvasHeight, pushUndo, addCustomElement, setSelectedIds]);
  
  // Selection handlers
  const handleSelect = useCallback((id: string, additive: boolean) => {
    if (additive) {
      setSelectedIds(prev => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  }, [setSelectedIds]);
  
  const handleChange = useCallback((id: string, attrs: Partial<KonvaElement>) => {
    updateElement(id, attrs);
  }, [updateElement]);
  
  // Double-click to edit text
  const handleTextDoubleClick = useCallback((id: string) => {
    const element = elements.find(el => el.id === id);
    if (element?.type === 'text') {
      setEditingTextId(id);
    }
  }, [elements]);
  
  // Handle text edit completion
  const handleTextEditComplete = useCallback((newText: string) => {
    if (editingTextId) {
      updateElement(editingTextId, { text: newText } as any);
      setEditingTextId(null);
    }
  }, [editingTextId, updateElement]);
  
  // Stage click - deselect (use any to handle both mouse and touch)
  const handleStageClick = useCallback((e: any) => {
    if (e.target === e.target.getStage()) {
      setSelectedIds([]);
    }
  }, [setSelectedIds]);
  
  // Wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    if (e.evt.ctrlKey || e.evt.metaKey) {
      // Zoom
      const stage = stageRef.current;
      if (!stage) return;
      
      const oldScale = zoom;
      const pointer = stage.getPointerPosition();
      if (!pointer) return;
      
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const factor = 1.1;
      const newScale = direction > 0 ? oldScale * factor : oldScale / factor;
      const clampedScale = Math.max(0.1, Math.min(5, newScale));
      
      // Calculate new offset to zoom towards pointer
      const mousePointTo = {
        x: (pointer.x - panOffset.x) / oldScale,
        y: (pointer.y - panOffset.y) / oldScale,
      };
      
      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };
      
      setZoom(clampedScale);
      setPanOffset(newPos);
    } else {
      // Pan
      setPanOffset(prev => ({
        x: prev.x - e.evt.deltaX,
        y: prev.y - e.evt.deltaY,
      }));
    }
  }, [zoom, panOffset, setZoom, setPanOffset, stageRef]);
  
  // Pan handlers for pan tool
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'pan' || e.evt.button === 1) {
      setIsPanning(true);
    }
  }, [activeTool]);
  
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isPanning) {
      setPanOffset(prev => ({
        x: prev.x + e.evt.movementX,
        y: prev.y + e.evt.movementY,
      }));
    }
  }, [isPanning, setPanOffset]);
  
  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);
  
  // Push undo before drag
  const handleDragStart = useCallback(() => {
    pushUndo();
  }, [pushUndo]);
  
  return (
    <div ref={containerRef} className="flex-1 bg-gray-100 overflow-hidden relative">
      {/* Grid Pattern Background */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, #e5e7eb 1px, transparent 1px),
            linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
        }}
      />
      
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={zoom}
        scaleY={zoom}
        x={panOffset.x}
        y={panOffset.y}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: activeTool === 'pan' || isPanning ? 'grab' : 'default' }}
      >
        {/* Background Layer */}
        <Layer>
          {/* Canvas background */}
          <Rect
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill={bgColor}
            shadowColor="#000"
            shadowBlur={20}
            shadowOffsetX={0}
            shadowOffsetY={4}
            shadowOpacity={0.1}
          />
        </Layer>
        
        {/* Content Layer */}
        <Layer>
          {elements.map((element) => (
            <ElementRenderer
              key={element.id}
              element={element}
              isSelected={selectedIds.includes(element.id)}
              onSelect={handleSelect}
              onChange={handleChange}
              onDragStart={handleDragStart}
              onDragEnd={() => {}}
              onDoubleClick={handleTextDoubleClick}
            />
          ))}
        </Layer>
      </Stage>
      
      {/* Text Toolbar - shows when text is selected */}
      {showTextToolbar && selectedElement && (
        <KonvaTextToolbar
          position={{
            x: (selectedElement.x * zoom) + panOffset.x,
            y: (selectedElement.y * zoom) + panOffset.y,
          }}
        />
      )}
      
      {/* Text Editor - shows when double-clicking text */}
      {editingElement && (() => {
        const el = editingElement as any;
        return (
          <KonvaTextEditor
            elementId={editingElement.id}
            initialText={el.text || ''}
            position={{ x: editingElement.x, y: editingElement.y }}
            width={el.width || 200}
            fontSize={el.fontSize || 24}
            fontFamily={el.fontFamily || 'Inter'}
            fontStyle={el.fontStyle || 'normal'}
            fill={editingElement.fill || '#1f2937'}
            align={el.align || 'left'}
            rotation={editingElement.rotation || 0}
            zoom={zoom}
            panOffset={panOffset}
            onClose={() => setEditingTextId(null)}
            onSave={handleTextEditComplete}
          />
        );
      })()}
      
      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2">
        <div className="bg-white/90 px-3 py-1.5 rounded-lg shadow text-xs text-gray-600">
          {Math.round(zoom * 100)}%
        </div>
        <div className="bg-white/90 px-3 py-1.5 rounded-lg shadow text-xs text-gray-600">
          {canvasWidth} × {canvasHeight}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface ContentStudioKonvaProps {
  documentId?: string;
  onClose?: () => void;
  onSave?: () => void;
  className?: string;
}

export function ContentStudioKonva({ documentId, onClose, onSave, className = '' }: ContentStudioKonvaProps) {
  return (
    <KonvaProvider documentId={documentId} onClose={onClose} onSave={onSave}>
    <ConfirmDialogProvider>
      <div className={`flex flex-col h-full bg-gray-50 ${className}`}>
        {/* Toolbar */}
        <KonvaElementToolbar onClose={onClose} />
        
        {/* Page Navigation */}
        <KonvaPageNavigation />
        
        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <KonvaCanvasInternal />
          
          {/* Right panels */}
          <KonvaLayersPanel />
          <KonvaPropertiesPanel />
          <KonvaAIPanel />
          <KonvaAssetPanel />
        </div>
      </div>
    </ConfirmDialogProvider>
    </KonvaProvider>
  );
}

export default ContentStudioKonva;
