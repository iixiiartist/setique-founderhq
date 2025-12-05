/**
 * Konva Text Node Component
 * Renders editable text with double-click to edit functionality
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Text, Transformer } from 'react-konva';
import Konva from 'konva';
import { TextElement } from '../types';

interface KonvaTextNodeProps {
  element: TextElement;
  isSelected: boolean;
  onSelect: (id: string, additive?: boolean) => void;
  onChange: (id: string, attrs: Partial<TextElement>) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function KonvaTextNode({
  element,
  isSelected,
  onSelect,
  onChange,
  onDragStart,
  onDragEnd,
}: KonvaTextNodeProps) {
  const textRef = useRef<Konva.Text>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && textRef.current && trRef.current) {
      trRef.current.nodes([textRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  // Handle double-click to edit
  const handleDblClick = useCallback(() => {
    if (!textRef.current) return;
    
    setIsEditing(true);
    
    const textNode = textRef.current;
    const stage = textNode.getStage();
    if (!stage) return;
    
    const stageBox = stage.container().getBoundingClientRect();
    const textPosition = textNode.getAbsolutePosition();
    const areaPosition = {
      x: stageBox.left + textPosition.x,
      y: stageBox.top + textPosition.y,
    };

    // Create textarea overlay
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    // Get scale from stage
    const stageScale = stage.scaleX();

    // Style the textarea to match the text
    textarea.value = element.text || '';
    textarea.style.position = 'fixed';
    textarea.style.left = `${areaPosition.x}px`;
    textarea.style.top = `${areaPosition.y}px`;
    textarea.style.width = `${textNode.width() * stageScale}px`;
    textarea.style.minHeight = `${textNode.height() * stageScale}px`;
    textarea.style.fontSize = `${(element.fontSize || 16) * stageScale}px`;
    textarea.style.fontFamily = element.fontFamily || 'Inter';
    textarea.style.fontWeight = String(element.fontWeight || 'normal');
    textarea.style.fontStyle = element.fontStyle || 'normal';
    textarea.style.textAlign = element.textAlign || 'left';
    textarea.style.color = element.fill || '#000000';
    textarea.style.border = '2px solid #6366f1';
    textarea.style.padding = '4px';
    textarea.style.margin = '0';
    textarea.style.overflow = 'auto';
    textarea.style.background = 'white';
    textarea.style.outline = 'none';
    textarea.style.resize = 'none';
    textarea.style.lineHeight = String(element.lineHeight || 1.2);
    textarea.style.transformOrigin = 'left top';
    textarea.style.transform = `rotate(${element.rotation || 0}deg)`;
    textarea.style.zIndex = '10000';

    // Hide the Konva text while editing
    textNode.hide();
    trRef.current?.hide();
    
    textarea.focus();
    textarea.select();

    // Cleanup and update text
    const removeTextarea = () => {
      const newText = textarea.value;
      document.body.removeChild(textarea);
      textNode.show();
      trRef.current?.show();
      setIsEditing(false);
      
      if (newText !== element.text) {
        onChange(element.id, { text: newText });
      }
    };

    // Listen for blur and Enter key
    textarea.addEventListener('blur', removeTextarea);
    textarea.addEventListener('keydown', (e) => {
      // Submit on Escape or Ctrl/Cmd + Enter
      if (e.key === 'Escape' || (e.key === 'Enter' && (e.ctrlKey || e.metaKey))) {
        textarea.blur();
      }
    });
  }, [element, onChange]);

  // Handle click - use 'any' to avoid event type incompatibility
  const handleClick = useCallback((e: any) => {
    const evt = e.evt as MouseEvent | TouchEvent;
    const isShift = evt instanceof MouseEvent ? evt.shiftKey : false;
    onSelect(element.id, isShift);
  }, [element.id, onSelect]);

  // Handle drag
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    onChange(element.id, {
      x: e.target.x(),
      y: e.target.y(),
    });
    onDragEnd?.();
  }, [element.id, onChange, onDragEnd]);

  // Handle transform
  const handleTransformEnd = useCallback(() => {
    const node = textRef.current;
    if (!node) return;

    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale and adjust width
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

  return (
    <>
      <Text
        ref={textRef}
        id={element.id}
        name="element"
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        text={element.text || 'Double-click to edit'}
        fontSize={element.fontSize || 16}
        fontFamily={element.fontFamily || 'Inter'}
        fontStyle={`${element.fontWeight || 'normal'} ${element.fontStyle || 'normal'}`}
        textDecoration={element.textDecoration || ''}
        fill={element.fill || '#000000'}
        align={element.textAlign || 'left'}
        verticalAlign={element.verticalAlign || 'top'}
        lineHeight={element.lineHeight || 1.2}
        letterSpacing={element.letterSpacing || 0}
        rotation={element.rotation || 0}
        opacity={element.opacity ?? 1}
        draggable={!element.locked}
        listening={!element.locked}
        onClick={handleClick}
        onTap={handleClick}
        onDblClick={handleDblClick}
        onDblTap={handleDblClick}
        onDragStart={onDragStart}
        onDragEnd={handleDragEnd}
        onTransformEnd={handleTransformEnd}
        perfectDrawEnabled={false}
      />
      {isSelected && !isEditing && (
        <Transformer
          ref={trRef}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']}
          rotateEnabled={true}
          borderStroke="#6366f1"
          borderStrokeWidth={1}
          anchorStroke="#6366f1"
          anchorFill="#ffffff"
          anchorSize={8}
          anchorCornerRadius={2}
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

export default KonvaTextNode;
