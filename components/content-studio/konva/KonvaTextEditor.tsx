/**
 * Konva Text Editor
 * Inline text editing overlay for text elements
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useKonvaContext } from './KonvaContext';
import { KonvaTextToolbar } from './KonvaTextToolbar';

interface KonvaTextEditorProps {
  elementId: string;
  initialText: string;
  position: { x: number; y: number };
  width: number;
  fontSize: number;
  fontFamily: string;
  fontStyle: string;
  fill: string;
  align: string;
  rotation: number;
  zoom: number;
  panOffset: { x: number; y: number };
  onClose: () => void;
  onSave: (text: string) => void;
}

export function KonvaTextEditor({
  elementId,
  initialText,
  position,
  width,
  fontSize,
  fontFamily,
  fontStyle,
  fill,
  align,
  rotation,
  zoom,
  panOffset,
  onClose,
  onSave,
}: KonvaTextEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(initialText);
  const { state, getSelectedElements } = useKonvaContext();

  // Calculate screen position
  const screenX = position.x * zoom + panOffset.x;
  const screenY = position.y * zoom + panOffset.y;
  const screenWidth = Math.max(100, width * zoom);
  const screenFontSize = fontSize * zoom;

  // Focus and select on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [text, screenFontSize]);

  // Handle save
  const handleSave = useCallback(() => {
    if (text !== initialText) {
      onSave(text);
    }
    onClose();
  }, [text, initialText, onSave, onClose]);

  // Handle keydown
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Allow Shift+Enter for newlines
      e.preventDefault();
      handleSave();
    }
  }, [handleSave, onClose]);

  // Handle blur
  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Check if we're clicking on the toolbar
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('.text-toolbar')) {
      return;
    }
    handleSave();
  }, [handleSave]);

  // Get selected text element for toolbar
  const selectedElements = getSelectedElements();
  const hasSelectedText = selectedElements.some(el => el.type === 'text');

  return (
    <>
      {/* Floating toolbar */}
      {hasSelectedText && (
        <div className="text-toolbar">
          <KonvaTextToolbar
            position={{ x: screenX + screenWidth / 2, y: screenY }}
          />
        </div>
      )}
      
      {/* Text input overlay */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="absolute outline-none resize-none border-2 border-gray-500 bg-white/90 rounded-sm"
        style={{
          left: screenX,
          top: screenY,
          width: screenWidth,
          minHeight: screenFontSize * 1.5,
          fontSize: screenFontSize,
          fontFamily: fontFamily || 'Inter',
          fontStyle: fontStyle.includes('italic') ? 'italic' : 'normal',
          fontWeight: fontStyle.includes('bold') ? 'bold' : 'normal',
          color: fill || '#1f2937',
          textAlign: align as any || 'left',
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
          transformOrigin: 'top left',
          lineHeight: 1.2,
          padding: '2px 4px',
          zIndex: 100,
        }}
        placeholder="Type here..."
      />
    </>
  );
}

export default KonvaTextEditor;
