/**
 * Konva Canvas Component
 * High-performance canvas with layered rendering, selection, and transformation
 * 
 * Architecture follows NotebookLM recommendations:
 * - Multiple layers (background, content, selection, guides)
 * - Transformer for resize/rotate handles
 * - Snap lines for alignment
 */

import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Circle, Ellipse, Line, Arrow, Text, Image, Group, Transformer, Star, RegularPolygon } from 'react-konva';
import Konva from 'konva';
import useImage from 'use-image';
import { motion } from 'framer-motion';
import { 
  KonvaElement, 
  KonvaTextElement, 
  KonvaImageElement,
  GuideLine,
  CanvasTool,
} from './types';
import { useKonvaContext } from './KonvaContext';

interface KonvaCanvasProps {
  className?: string;
  showGrid?: boolean;
}

// ============================================================================
// Image Element Component (handles async loading)
// ============================================================================

interface KonvaImageNodeProps {
  element: KonvaImageElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newAttrs: Partial<KonvaImageElement>) => void;
}

function KonvaImageNode({ element, isSelected, onSelect, onChange }: KonvaImageNodeProps) {
  const [image] = useImage(element.src, 'anonymous');
  
  return (
    <Image
      id={element.id}
      image={image}
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation || 0}
      scaleX={element.scaleX || 1}
      scaleY={element.scaleY || 1}
      opacity={element.opacity ?? 1}
      visible={element.visible !== false}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDragEnd={(e) => {
        onChange({
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(5, node.width() * node.scaleX()),
          height: Math.max(5, node.height() * node.scaleY()),
          rotation: node.rotation(),
          scaleX: 1,
          scaleY: 1,
        });
      }}
    />
  );
}

// ============================================================================
// Text Element with Double-Click Editing
// ============================================================================

interface KonvaTextNodeProps {
  element: KonvaTextElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (newAttrs: Partial<KonvaTextElement>) => void;
}

function KonvaTextNode({ element, isSelected, onSelect, onChange }: KonvaTextNodeProps) {
  const textRef = useRef<Konva.Text>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleDblClick = useCallback(() => {
    if (element.locked) return;
    
    const textNode = textRef.current;
    if (!textNode) return;

    setIsEditing(true);

    // Create textarea overlay for editing
    const stage = textNode.getStage();
    if (!stage) return;

    const stageContainer = stage.container();
    const textPosition = textNode.absolutePosition();
    const stageBox = stageContainer.getBoundingClientRect();

    const textarea = document.createElement('textarea');
    stageContainer.appendChild(textarea);

    textarea.value = element.text;
    textarea.style.position = 'absolute';
    textarea.style.top = `${textPosition.y + stageBox.top}px`;
    textarea.style.left = `${textPosition.x + stageBox.left}px`;
    textarea.style.width = `${textNode.width() * textNode.scaleX()}px`;
    textarea.style.height = `${textNode.height() * textNode.scaleY() + 20}px`;
    textarea.style.fontSize = `${element.fontSize || 16}px`;
    textarea.style.fontFamily = element.fontFamily || 'Inter';
    textarea.style.color = element.fill || '#000';
    textarea.style.border = '2px solid #18181b';
    textarea.style.padding = '4px';
    textarea.style.margin = '0';
    textarea.style.overflow = 'hidden';
    textarea.style.background = 'white';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = String(element.lineHeight || 1.2);
    textarea.style.transformOrigin = 'left top';
    textarea.style.transform = `rotate(${element.rotation || 0}deg)`;
    textarea.style.zIndex = '1000';

    textarea.focus();
    textarea.select();

    const handleOutsideClick = (e: MouseEvent) => {
      if (e.target !== textarea) {
        finishEditing();
      }
    };

    const finishEditing = () => {
      onChange({ text: textarea.value });
      setIsEditing(false);
      textarea.remove();
      window.removeEventListener('click', handleOutsideClick);
    };

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        finishEditing();
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        finishEditing();
      }
    });

    textarea.addEventListener('blur', finishEditing);
    
    // Delay to prevent immediate blur
    setTimeout(() => {
      window.addEventListener('click', handleOutsideClick);
    }, 100);
  }, [element, onChange]);

  return (
    <Text
      ref={textRef}
      id={element.id}
      x={element.x}
      y={element.y}
      text={element.text}
      fontSize={element.fontSize || 16}
      fontFamily={element.fontFamily || 'Inter'}
      fontStyle={element.fontStyle || 'normal'}
      textDecoration={element.textDecoration || ''}
      fill={element.fill || '#1f2937'}
      align={element.align || 'left'}
      verticalAlign={element.verticalAlign || 'top'}
      width={element.width}
      height={element.height}
      lineHeight={element.lineHeight || 1.2}
      letterSpacing={element.letterSpacing || 0}
      wrap={element.wrap || 'word'}
      padding={element.padding || 0}
      rotation={element.rotation || 0}
      scaleX={element.scaleX || 1}
      scaleY={element.scaleY || 1}
      opacity={element.opacity ?? 1}
      visible={element.visible !== false && !isEditing}
      draggable={!element.locked}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={handleDblClick}
      onDblTap={handleDblClick}
      onDragEnd={(e) => {
        onChange({
          x: e.target.x(),
          y: e.target.y(),
        });
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        onChange({
          x: node.x(),
          y: node.y(),
          width: Math.max(20, node.width() * node.scaleX()),
          rotation: node.rotation(),
          scaleX: 1,
          scaleY: 1,
        });
      }}
    />
  );
}

// ============================================================================
// Main Canvas Component
// ============================================================================

export function KonvaCanvas({ className = '', showGrid = true }: KonvaCanvasProps) {
  const {
    state,
    stageRef,
    selectedIds,
    setSelectedIds,
    updateElement,
    pushUndo,
    persistCurrentPage,
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    activeTool,
  } = useKonvaContext();

  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  const [guides, setGuides] = useState<GuideLine[]>([]);

  const currentPage = state.document?.pages[state.currentPageIndex];
  const elements = currentPage?.canvas.elements || [];
  const canvasWidth = currentPage?.canvas.width || 1920;
  const canvasHeight = currentPage?.canvas.height || 1080;
  const backgroundColor = currentPage?.canvas.backgroundColor || '#ffffff';

  // Resize stage to fit container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Update transformer when selection changes
  useEffect(() => {
    const transformer = transformerRef.current;
    const stage = stageRef.current;
    if (!transformer || !stage) return;

    const nodes = selectedIds
      .map(id => stage.findOne(`#${id}`))
      .filter(Boolean) as Konva.Node[];
    
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedIds, stageRef]);

  // Handle selection
  const handleSelect = useCallback((elementId: string, e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const isMultiSelect = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey;
    
    pushUndo();
    
    if (isMultiSelect) {
      setSelectedIds(prev => 
        prev.includes(elementId) 
          ? prev.filter(id => id !== elementId)
          : [...prev, elementId]
      );
    } else {
      setSelectedIds([elementId]);
    }
  }, [setSelectedIds, pushUndo]);

  // Handle stage click (deselect)
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    // Clicked on empty area
    if (e.target === e.target.getStage()) {
      setSelectedIds([]);
    }
  }, [setSelectedIds]);

  // Handle element change
  const handleElementChange = useCallback((id: string, newAttrs: Partial<KonvaElement>) => {
    updateElement(id, newAttrs);
    persistCurrentPage();
  }, [updateElement, persistCurrentPage]);

  // Handle wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!e.evt.ctrlKey) return;
    
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = zoom;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    // Zoom toward pointer position
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
  }, [zoom, panOffset, setZoom, setPanOffset, stageRef]);

  // Handle panning
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (activeTool === 'pan' || e.evt.button === 1) {
      setIsPanning(true);
      setLastPanPoint({ x: e.evt.clientX, y: e.evt.clientY });
    }
  }, [activeTool]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!isPanning || !lastPanPoint) return;

    const dx = e.evt.clientX - lastPanPoint.x;
    const dy = e.evt.clientY - lastPanPoint.y;

    setPanOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy,
    }));

    setLastPanPoint({ x: e.evt.clientX, y: e.evt.clientY });
  }, [isPanning, lastPanPoint, setPanOffset]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setLastPanPoint(null);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          pushUndo();
          // Delete will be handled by context
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedIds(elements.map(el => el.id));
      }

      if (e.key === 'Escape') {
        setSelectedIds([]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, elements, setSelectedIds, pushUndo]);

  // Calculate canvas position (centered)
  const canvasX = (stageSize.width - canvasWidth * zoom) / 2 + panOffset.x;
  const canvasY = (stageSize.height - canvasHeight * zoom) / 2 + panOffset.y;

  // Render element based on type
  const renderElement = (element: KonvaElement) => {
    const isSelected = selectedIds.includes(element.id);
    const commonProps = {
      key: element.id,
      isSelected,
      onSelect: (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => handleSelect(element.id, e),
      onChange: (attrs: Partial<KonvaElement>) => handleElementChange(element.id, attrs),
    };

    switch (element.type) {
      case 'rect':
        return (
          <Rect
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            width={element.width}
            height={element.height}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            cornerRadius={element.cornerRadius}
            rotation={element.rotation || 0}
            scaleX={element.scaleX || 1}
            scaleY={element.scaleY || 1}
            opacity={element.opacity ?? 1}
            visible={element.visible !== false}
            draggable={!element.locked}
            shadowColor={element.shadowColor}
            shadowBlur={element.shadowBlur}
            shadowOffsetX={element.shadowOffsetX}
            shadowOffsetY={element.shadowOffsetY}
            shadowOpacity={element.shadowOpacity}
            onClick={(e) => handleSelect(element.id, e)}
            onTap={(e) => handleSelect(element.id, e)}
            onDragStart={() => pushUndo()}
            onDragEnd={(e) => {
              handleElementChange(element.id, {
                x: e.target.x(),
                y: e.target.y(),
              });
            }}
            onTransformEnd={(e) => {
              const node = e.target;
              handleElementChange(element.id, {
                x: node.x(),
                y: node.y(),
                width: Math.max(5, node.width() * node.scaleX()),
                height: Math.max(5, node.height() * node.scaleY()),
                rotation: node.rotation(),
                scaleX: 1,
                scaleY: 1,
              });
            }}
          />
        );

      case 'circle':
        return (
          <Circle
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            radius={element.radius}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            rotation={element.rotation || 0}
            scaleX={element.scaleX || 1}
            scaleY={element.scaleY || 1}
            opacity={element.opacity ?? 1}
            visible={element.visible !== false}
            draggable={!element.locked}
            onClick={(e) => handleSelect(element.id, e)}
            onTap={(e) => handleSelect(element.id, e)}
            onDragStart={() => pushUndo()}
            onDragEnd={(e) => {
              handleElementChange(element.id, {
                x: e.target.x(),
                y: e.target.y(),
              });
            }}
            onTransformEnd={(e) => {
              const node = e.target as Konva.Circle;
              handleElementChange(element.id, {
                x: node.x(),
                y: node.y(),
                radius: Math.max(5, node.radius() * Math.max(node.scaleX(), node.scaleY())),
                rotation: node.rotation(),
                scaleX: 1,
                scaleY: 1,
              });
            }}
          />
        );

      case 'line':
        return (
          <Line
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            points={element.points}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            tension={element.tension}
            lineCap={element.lineCap}
            lineJoin={element.lineJoin}
            closed={element.closed}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
            visible={element.visible !== false}
            draggable={!element.locked}
            onClick={(e) => handleSelect(element.id, e)}
            onTap={(e) => handleSelect(element.id, e)}
            onDragStart={() => pushUndo()}
            onDragEnd={(e) => {
              handleElementChange(element.id, {
                x: e.target.x(),
                y: e.target.y(),
              });
            }}
          />
        );

      case 'arrow':
        return (
          <Arrow
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            points={element.points}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            pointerLength={element.pointerLength}
            pointerWidth={element.pointerWidth}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
            visible={element.visible !== false}
            draggable={!element.locked}
            onClick={(e) => handleSelect(element.id, e)}
            onTap={(e) => handleSelect(element.id, e)}
            onDragStart={() => pushUndo()}
            onDragEnd={(e) => {
              handleElementChange(element.id, {
                x: e.target.x(),
                y: e.target.y(),
              });
            }}
          />
        );

      case 'text':
        return (
          <KonvaTextNode
            key={element.id}
            element={element as KonvaTextElement}
            isSelected={isSelected}
            onSelect={() => setSelectedIds([element.id])}
            onChange={(attrs) => handleElementChange(element.id, attrs)}
          />
        );

      case 'image':
        return (
          <KonvaImageNode
            key={element.id}
            element={element as KonvaImageElement}
            isSelected={isSelected}
            onSelect={() => setSelectedIds([element.id])}
            onChange={(attrs) => handleElementChange(element.id, attrs)}
          />
        );

      case 'star':
        return (
          <Star
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            numPoints={element.numPoints}
            innerRadius={element.innerRadius}
            outerRadius={element.outerRadius}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
            visible={element.visible !== false}
            draggable={!element.locked}
            onClick={(e) => handleSelect(element.id, e)}
            onTap={(e) => handleSelect(element.id, e)}
            onDragStart={() => pushUndo()}
            onDragEnd={(e) => {
              handleElementChange(element.id, {
                x: e.target.x(),
                y: e.target.y(),
              });
            }}
          />
        );

      case 'regularPolygon':
        return (
          <RegularPolygon
            key={element.id}
            id={element.id}
            x={element.x}
            y={element.y}
            sides={element.sides}
            radius={element.radius}
            fill={element.fill}
            stroke={element.stroke}
            strokeWidth={element.strokeWidth}
            rotation={element.rotation || 0}
            opacity={element.opacity ?? 1}
            visible={element.visible !== false}
            draggable={!element.locked}
            onClick={(e) => handleSelect(element.id, e)}
            onTap={(e) => handleSelect(element.id, e)}
            onDragStart={() => pushUndo()}
            onDragEnd={(e) => {
              handleElementChange(element.id, {
                x: e.target.x(),
                y: e.target.y(),
              });
            }}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden bg-gray-200 ${className}`}
      style={{
        cursor: activeTool === 'pan' || isPanning ? 'grab' : 'default',
      }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleStageClick}
      >
        {/* Background Layer - Static, rarely redrawn */}
        <Layer listening={false}>
          {/* Canvas shadow */}
          <Rect
            x={canvasX + 8}
            y={canvasY + 8}
            width={canvasWidth * zoom}
            height={canvasHeight * zoom}
            fill="rgba(0, 0, 0, 0.1)"
            cornerRadius={4}
          />
          {/* Canvas background */}
          <Rect
            x={canvasX}
            y={canvasY}
            width={canvasWidth * zoom}
            height={canvasHeight * zoom}
            fill={backgroundColor}
            shadowColor="black"
            shadowBlur={20}
            shadowOpacity={0.1}
          />
        </Layer>

        {/* Grid Layer - Optional, above background */}
        {showGrid && (
          <Layer listening={false}>
            {/* Grid lines would be rendered here */}
          </Layer>
        )}

        {/* Content Layer - Main elements */}
        <Layer
          x={canvasX}
          y={canvasY}
          scaleX={zoom}
          scaleY={zoom}
          clipX={0}
          clipY={0}
          clipWidth={canvasWidth}
          clipHeight={canvasHeight}
        >
          {elements.map(renderElement)}
        </Layer>

        {/* Selection/Transform Layer - Above content */}
        <Layer
          x={canvasX}
          y={canvasY}
          scaleX={zoom}
          scaleY={zoom}
        >
          <Transformer
            ref={transformerRef}
            boundBoxFunc={(oldBox, newBox) => {
              // Limit minimum size
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
            anchorSize={8}
            anchorCornerRadius={2}
            borderStroke="#18181b"
            anchorStroke="#18181b"
            anchorFill="#ffffff"
            enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
            rotateEnabled={true}
            rotationSnaps={[0, 45, 90, 135, 180, 225, 270, 315]}
          />
        </Layer>

        {/* Guide Lines Layer - Topmost for alignment */}
        <Layer listening={false}>
          {guides.map(guide => (
            <Line
              key={guide.id}
              points={
                guide.orientation === 'horizontal'
                  ? [0, guide.position * zoom + canvasY, stageSize.width, guide.position * zoom + canvasY]
                  : [guide.position * zoom + canvasX, 0, guide.position * zoom + canvasX, stageSize.height]
              }
              stroke="#ff00ff"
              strokeWidth={1}
              dash={[4, 4]}
            />
          ))}
        </Layer>
      </Stage>

      {/* Zoom Indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute bottom-4 right-4 bg-white rounded-lg px-3 py-1.5 shadow-lg text-sm font-medium text-gray-700 select-none"
        style={{ zIndex: 50 }}
      >
        {Math.round(zoom * 100)}%
      </motion.div>
    </div>
  );
}

export default KonvaCanvas;
