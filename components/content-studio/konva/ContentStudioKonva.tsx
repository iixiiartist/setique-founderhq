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
import { KonvaElement } from './types';

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
}

// Text Element
function TextRenderer({ element, isSelected, onSelect, onChange, onDragStart, onDragEnd }: ElementRendererProps) {
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
  
  const handleDragEnd = useCallback((e: any) => {
    onChange(element.id, { x: e.target.x(), y: e.target.y() });
    onDragEnd?.();
  }, [element.id, onChange, onDragEnd]);
  
  const handleTransformEnd = useCallback(() => {
    const node = textRef.current;
    if (!node) return;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scaleX(1);
    node.scaleY(1);
    onChange(element.id, {
      x: node.x(),
      y: node.y(),
      width: Math.max(5, node.width() * scaleX),
      rotation: node.rotation(),
    } as any);
  }, [element.id, onChange]);
  
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
        fill={element.fill || '#1f2937'}
        align={el.align || 'left'}
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
          enabledAnchors={['middle-left', 'middle-right']}
          rotateEnabled
          borderStroke="#6366f1"
          anchorStroke="#6366f1"
          anchorFill="#fff"
          anchorSize={8}
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
        fill={element.fill || '#6366f1'}
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
          rotateEnabled
          borderStroke="#6366f1"
          anchorStroke="#6366f1"
          anchorFill="#fff"
          anchorSize={8}
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
        fill={element.fill || '#6366f1'}
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
          rotateEnabled
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
          borderStroke="#6366f1"
          anchorStroke="#6366f1"
          anchorFill="#fff"
          anchorSize={8}
        />
      )}
    </>
  );
}

// Line/Arrow Element
function LineRenderer({ element, isSelected, onSelect, onChange, onDragStart, onDragEnd }: ElementRendererProps) {
  const lineRef = useRef<any>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const el = element as any;
  const isArrow = element.type === 'arrow';
  
  useEffect(() => {
    if (isSelected && lineRef.current && trRef.current) {
      trRef.current.nodes([lineRef.current]);
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
  
  const LineComponent = isArrow ? Arrow : Line;
  
  return (
    <>
      <LineComponent
        ref={lineRef}
        id={element.id}
        name="element"
        x={element.x}
        y={element.y}
        points={el.points || [0, 0, 200, 0]}
        stroke={element.stroke || element.fill || '#6366f1'}
        strokeWidth={element.strokeWidth || 2}
        rotation={element.rotation || 0}
        opacity={element.opacity ?? 1}
        pointerLength={isArrow ? (el.pointerLength || 10) : undefined}
        pointerWidth={isArrow ? (el.pointerWidth || 10) : undefined}
        draggable={!element.locked}
        onClick={handleClick}
        onTap={handleClick}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          rotateEnabled
          borderStroke="#6366f1"
          anchorStroke="#6366f1"
          anchorFill="#fff"
          anchorSize={8}
        />
      )}
    </>
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
        fill={element.fill || '#6366f1'}
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
          rotateEnabled
          borderStroke="#6366f1"
          anchorStroke="#6366f1"
          anchorFill="#fff"
          anchorSize={8}
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
        fill={element.fill || '#6366f1'}
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
          rotateEnabled
          borderStroke="#6366f1"
          anchorStroke="#6366f1"
          anchorFill="#fff"
          anchorSize={8}
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
          rotateEnabled
          keepRatio
          borderStroke="#6366f1"
          anchorStroke="#6366f1"
          anchorFill="#fff"
          anchorSize={8}
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
  } = useKonvaContext();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  
  // Get current page
  const currentPage = getCurrentPage();
  const elements = currentPage?.canvas.elements || [];
  const canvasWidth = currentPage?.canvas.width || 1920;
  const canvasHeight = currentPage?.canvas.height || 1080;
  const bgColor = currentPage?.canvas.backgroundColor || '#ffffff';
  
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
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, elements, deleteSelectedElements, setSelectedIds]);
  
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
    <div ref={containerRef} className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-hidden relative">
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
            />
          ))}
        </Layer>
      </Stage>
      
      {/* Zoom indicator */}
      <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 px-3 py-1.5 rounded-lg shadow text-xs text-gray-600 dark:text-gray-300">
        {Math.round(zoom * 100)}%
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

interface ContentStudioKonvaProps {
  className?: string;
}

export function ContentStudioKonva({ className = '' }: ContentStudioKonvaProps) {
  return (
    <KonvaProvider>
      <div className={`flex flex-col h-full bg-gray-50 dark:bg-gray-900 ${className}`}>
        {/* Toolbar */}
        <KonvaElementToolbar />
        
        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <KonvaCanvasInternal />
          
          {/* Right panels */}
          <KonvaLayersPanel />
          <KonvaPropertiesPanel />
        </div>
      </div>
    </KonvaProvider>
  );
}

export default ContentStudioKonva;
