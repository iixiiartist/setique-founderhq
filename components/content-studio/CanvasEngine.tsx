/**
 * Canvas Engine Component
 * Core Fabric.js canvas with panning, zooming, and object manipulation
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { fabric } from 'fabric';
import { useContentStudio } from './ContentStudioContext';
import { motion } from 'framer-motion';

interface CanvasEngineProps {
  className?: string;
  showGrid?: boolean;
}

export function CanvasEngine({ className = '', showGrid = true }: CanvasEngineProps) {
  const {
    state,
    canvasRef,
    getCurrentPage,
    setZoom,
    setZoomToPoint,
    dispatch,
    pushUndo,
    persistCurrentPage,
  } = useContentStudio();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState<{ x: number; y: number } | null>(null);
  
  // Flag to skip persistence during page load (prevents redundant saves and undo entries)
  const isLoadingRef = useRef(false);

  // Initialize canvas
  useEffect(() => {
    if (!canvasElementRef.current || canvasRef.current) return;

    const page = getCurrentPage();
    if (!page) return;

    const canvas = new fabric.Canvas(canvasElementRef.current, {
      width: page.canvas.width,
      height: page.canvas.height,
      backgroundColor: page.canvas.backgroundColor || '#ffffff',
      selection: true,
      preserveObjectStacking: true,
      renderOnAddRemove: true,
      stopContextMenu: true,
      fireRightClick: true,
    });

    // Configure controls
    fabric.Object.prototype.set({
      transparentCorners: false,
      cornerColor: '#6366f1',
      cornerStrokeColor: '#4f46e5',
      borderColor: '#6366f1',
      cornerSize: 10,
      padding: 5,
      cornerStyle: 'circle',
      borderDashArray: undefined,
    });

    // Store reference
    (canvasRef as React.MutableRefObject<fabric.Canvas | null>).current = canvas;

    // Cleanup
    return () => {
      canvas.dispose();
      (canvasRef as React.MutableRefObject<fabric.Canvas | null>).current = null;
    };
  }, [getCurrentPage]);

  // Update canvas when page changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const page = getCurrentPage();
    
    if (!canvas || !page) return;

    // Set loading flag to skip persistence during load
    isLoadingRef.current = true;

    // Clear and resize
    canvas.clear();
    canvas.setWidth(page.canvas.width);
    canvas.setHeight(page.canvas.height);
    canvas.setBackgroundColor(page.canvas.backgroundColor || '#ffffff', () => {
      canvas.renderAll();
    });

    // Load saved state
    if (page.canvas.json) {
      canvas.loadFromJSON(page.canvas.json, () => {
        canvas.renderAll();
        // Clear loading flag after load completes
        isLoadingRef.current = false;
      });
    } else {
      isLoadingRef.current = false;
    }
  }, [state.currentPageIndex, getCurrentPage, canvasRef]);

  // Handle selection events
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleSelection = () => {
      const activeObjects = canvas.getActiveObjects();
      const ids = activeObjects.map((obj) => (obj as any).id).filter(Boolean);
      dispatch({ type: 'SELECT_OBJECTS', payload: ids });
    };

    const handleSelectionCleared = () => {
      dispatch({ type: 'SELECT_OBJECTS', payload: [] });
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleSelectionCleared);

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleSelectionCleared);
    };
  }, [canvasRef, dispatch]);

  // Capture undo snapshots BEFORE transforms and persist AFTER all changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleBeforeTransform = () => {
      // Skip during page load
      if (isLoadingRef.current) return;
      // Capture state before modification for undo
      pushUndo();
    };

    const handleAfterModification = () => {
      // Skip during page load
      if (isLoadingRef.current) return;
      // Persist canvas changes to document state
      persistCurrentPage();
    };

    // Only capture undo before user transforms (drag, scale, rotate)
    canvas.on('before:transform', handleBeforeTransform);
    
    // Persist after all modifications (including add/remove)
    canvas.on('object:modified', handleAfterModification);
    canvas.on('object:added', handleAfterModification);
    canvas.on('object:removed', handleAfterModification);

    return () => {
      canvas.off('before:transform', handleBeforeTransform);
      canvas.off('object:modified', handleAfterModification);
      canvas.off('object:added', handleAfterModification);
      canvas.off('object:removed', handleAfterModification);
    };
  }, [canvasRef, pushUndo, persistCurrentPage]);

  // Handle zoom with mouse wheel - centered on cursor
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!canvasRef.current || !e.ctrlKey) return;
    
    e.preventDefault();
    
    const delta = e.deltaY;
    const zoom = state.zoom * (1 - delta / 500);
    const clampedZoom = Math.max(0.1, Math.min(5, zoom));
    
    // Get mouse position relative to canvas container
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const point = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      setZoomToPoint(clampedZoom, point);
    } else {
      setZoom(clampedZoom);
    }
  }, [canvasRef, state.zoom, setZoom, setZoomToPoint]);

  // Handle panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (state.activeTool === 'pan' || e.button === 1) {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  }, [state.activeTool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning || !lastPanPoint || !canvasRef.current) return;

    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;

    const canvas = canvasRef.current;
    const vpt = canvas.viewportTransform;
    if (vpt) {
      vpt[4] += deltaX;
      vpt[5] += deltaY;
      canvas.requestRenderAll();
    }

    setLastPanPoint({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastPanPoint, canvasRef]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setLastPanPoint(null);
  }, []);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Don't intercept if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key) {
        case 'Delete':
        case 'Backspace':
          const activeObjects = canvas.getActiveObjects();
          activeObjects.forEach((obj) => canvas.remove(obj));
          canvas.discardActiveObject();
          canvas.renderAll();
          break;
        case 'Escape':
          canvas.discardActiveObject();
          canvas.renderAll();
          break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            canvas.discardActiveObject();
            const sel = new fabric.ActiveSelection(canvas.getObjects(), {
              canvas,
            });
            canvas.setActiveObject(sel);
            canvas.renderAll();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canvasRef]);

  const page = getCurrentPage();

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 overflow-hidden bg-gray-200 ${className}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        cursor: state.activeTool === 'pan' || isPanning ? 'grab' : 'default',
      }}
    >
      {/* Canvas Wrapper - Centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative shadow-2xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {/* Page Shadow */}
          <div
            className="absolute inset-0 bg-black/10 blur-xl -z-10"
            style={{
              width: page?.canvas.width || 1920,
              height: page?.canvas.height || 1080,
              transform: 'translate(8px, 8px)',
            }}
          />
          
          {/* Fabric Canvas */}
          <canvas
            ref={canvasElementRef}
            id="content-studio-canvas"
            className="block"
          />
        </motion.div>
      </div>

      {/* Grid Overlay (optional) */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, ${state.document?.settings.grid.color || '#e5e7eb'} 1px, transparent 1px),
              linear-gradient(to bottom, ${state.document?.settings.grid.color || '#e5e7eb'} 1px, transparent 1px)
            `,
            backgroundSize: `${(state.document?.settings.grid.size || 20) * state.zoom}px ${(state.document?.settings.grid.size || 20) * state.zoom}px`,
          }}
        />
      )}

      {/* Zoom Indicator */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg px-3 py-1.5 shadow-lg text-sm font-medium text-gray-700">
        {Math.round(state.zoom * 100)}%
      </div>
    </div>
  );
}

export default CanvasEngine;

