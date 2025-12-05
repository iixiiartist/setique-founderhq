/**
 * Layers Panel Component
 * Manage canvas objects with drag-and-drop reordering
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Layers,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Type,
  Square,
  Circle,
  Image,
  BarChart3,
  Table2,
  Quote,
  Users,
  TrendingUp,
  Layout,
  Trash2,
  Copy,
  MoreVertical,
} from 'lucide-react';
import { useContentStudio } from './ContentStudioContext';
import { ElementType, Layer } from './types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import * as fabric from 'fabric';

interface LayersPanelProps {
  className?: string;
}

const getElementIcon = (type: ElementType) => {
  const icons: Record<string, React.ReactNode> = {
    'heading': <Type className="w-4 h-4" />,
    'subheading': <Type className="w-4 h-4" />,
    'body-text': <Type className="w-4 h-4" />,
    'caption': <Type className="w-4 h-4" />,
    'quote': <Quote className="w-4 h-4" />,
    'rectangle': <Square className="w-4 h-4" />,
    'circle': <Circle className="w-4 h-4" />,
    'image': <Image className="w-4 h-4" />,
    'metric-card': <TrendingUp className="w-4 h-4" />,
    'testimonial': <Quote className="w-4 h-4" />,
    'comparison-table': <Table2 className="w-4 h-4" />,
    'feature-grid': <Layout className="w-4 h-4" />,
    'team-member': <Users className="w-4 h-4" />,
    'bar-chart': <BarChart3 className="w-4 h-4" />,
    'line-chart': <BarChart3 className="w-4 h-4" />,
    'pie-chart': <BarChart3 className="w-4 h-4" />,
  };
  return icons[type] || <Square className="w-4 h-4" />;
};

export function LayersPanel({ className = '' }: LayersPanelProps) {
  const {
    state,
    canvasRef,
    dispatch,
    pushUndo,
    persistCurrentPage,
    deleteSelectedObjects,
    duplicateSelectedObjects,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
  } = useContentStudio();

  // Use state to trigger re-renders when canvas objects change
  const [layerVersion, setLayerVersion] = useState(0);

  // Subscribe to Fabric.js events for layer updates
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleLayerChange = () => {
      setLayerVersion(v => v + 1);
    };

    canvas.on('object:added', handleLayerChange);
    canvas.on('object:removed', handleLayerChange);
    canvas.on('object:modified', handleLayerChange);

    return () => {
      canvas.off('object:added', handleLayerChange);
      canvas.off('object:removed', handleLayerChange);
      canvas.off('object:modified', handleLayerChange);
    };
  }, [canvasRef]);

  const layers = useMemo((): Layer[] => {
    // layerVersion triggers recalc when canvas changes
    void layerVersion;
    
    const canvas = canvasRef.current;
    if (!canvas) return [];

    const objects = canvas.getObjects();
    return objects.map((obj, index) => ({
      id: (obj as any).id || `layer-${index}`,
      name: (obj as any).name || `${obj.type || 'Object'} ${index + 1}`,
      type: ((obj as any).elementType || obj.type) as ElementType,
      visible: obj.visible !== false,
      locked: obj.lockMovementX && obj.lockMovementY,
      order: index,
      selected: state.selectedObjectIds.includes((obj as any).id),
    })).reverse();
  }, [canvasRef, layerVersion, state.selectedObjectIds]);

  const handleLayerClick = useCallback((layerId: string, event: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    const targetObject = objects.find((obj) => (obj as any).id === layerId);
    
    if (!targetObject) return;

    if (event.shiftKey) {
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.includes(targetObject)) {
        const remaining = activeObjects.filter((o) => o !== targetObject);
        if (remaining.length > 0) {
          const sel = new fabric.ActiveSelection(remaining, { canvas });
          canvas.setActiveObject(sel);
        } else {
          canvas.discardActiveObject();
        }
      } else {
        const sel = new fabric.ActiveSelection([...activeObjects, targetObject], { canvas });
        canvas.setActiveObject(sel);
      }
    } else {
      canvas.setActiveObject(targetObject);
    }
    
    canvas.renderAll();
  }, [canvasRef]);

  const toggleVisibility = useCallback((layerId: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    const targetObject = objects.find((obj) => (obj as any).id === layerId);
    
    if (targetObject) {
      pushUndo(); // Capture state before change
      targetObject.visible = !targetObject.visible;
      canvas.renderAll();
      persistCurrentPage(); // Persist changes
    }
  }, [canvasRef, pushUndo, persistCurrentPage]);

  const toggleLock = useCallback((layerId: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const objects = canvas.getObjects();
    const targetObject = objects.find((obj) => (obj as any).id === layerId);
    
    if (targetObject) {
      pushUndo(); // Capture state before change
      const isLocked = targetObject.lockMovementX && targetObject.lockMovementY;
      targetObject.lockMovementX = !isLocked;
      targetObject.lockMovementY = !isLocked;
      targetObject.lockScalingX = !isLocked;
      targetObject.lockScalingY = !isLocked;
      targetObject.lockRotation = !isLocked;
      targetObject.selectable = isLocked;
      targetObject.evented = isLocked;
      canvas.renderAll();
      persistCurrentPage(); // Persist changes
    }
  }, [canvasRef, pushUndo, persistCurrentPage]);

  const handleReorder = useCallback((newLayers: Layer[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    pushUndo(); // Capture state before reorder
    const orderedIds = [...newLayers].reverse().map((l) => l.id);
    
    orderedIds.forEach((id, index) => {
      const obj = canvas.getObjects().find((o) => (o as any).id === id);
      if (obj) {
        canvas.moveObjectTo(obj, index);
      }
    });
    
    canvas.renderAll();
    persistCurrentPage(); // Persist changes
  }, [canvasRef, pushUndo, persistCurrentPage]);

  if (!state.isLayersPanelOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className={`h-full bg-white border-r border-gray-200 flex flex-col overflow-hidden ${className}`}
      style={{ 
        width: 'clamp(192px, 20vw, 288px)', // min 192px (w-48), max 288px (w-72)
        zIndex: 20,
        maxWidth: '30vw' // Prevent panel from taking too much space
      }}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-gray-700" />
          <span className="font-semibold text-gray-900">Layers</span>
        </div>
        <span className="text-xs text-gray-500">{layers.length} objects</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {layers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4 text-center">
            <Layers className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No elements yet</p>
            <p className="text-xs mt-1">Add elements from the toolbar</p>
          </div>
        ) : (
          <Reorder.Group axis="y" values={layers} onReorder={handleReorder} className="py-2">
            <AnimatePresence>
              {layers.map((layer) => (
                <Reorder.Item key={layer.id} value={layer} className="px-2">
                  <motion.div
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors group ${layer.selected ? 'bg-gray-100 border border-gray-300' : 'hover:bg-gray-50 border border-transparent'} ${!layer.visible ? 'opacity-50' : ''}`}
                    onClick={(e) => handleLayerClick(layer.id, e)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="w-4 h-4 flex items-center justify-center cursor-grab text-gray-400">
                      <svg className="w-3 h-3" viewBox="0 0 10 16" fill="currentColor">
                        <circle cx="2" cy="2" r="1.5" />
                        <circle cx="8" cy="2" r="1.5" />
                        <circle cx="2" cy="8" r="1.5" />
                        <circle cx="8" cy="8" r="1.5" />
                        <circle cx="2" cy="14" r="1.5" />
                        <circle cx="8" cy="14" r="1.5" />
                      </svg>
                    </div>

                    <div className={`w-6 h-6 flex items-center justify-center rounded ${layer.selected ? 'text-gray-900' : 'text-gray-500'}`}>
                      {getElementIcon(layer.type)}
                    </div>

                    <span className={`flex-1 text-sm truncate ${layer.selected ? 'text-gray-900 font-medium' : 'text-gray-700'}`}>
                      {layer.name}
                    </span>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleVisibility(layer.id); }}
                        className="p-1 rounded hover:bg-gray-200"
                        title={layer.visible ? 'Hide' : 'Show'}
                      >
                        {layer.visible ? <Eye className="w-3.5 h-3.5 text-gray-500" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleLock(layer.id); }}
                        className="p-1 rounded hover:bg-gray-200"
                        title={layer.locked ? 'Unlock' : 'Lock'}
                      >
                        {layer.locked ? <Lock className="w-3.5 h-3.5 text-amber-500" /> : <Unlock className="w-3.5 h-3.5 text-gray-400" />}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button onClick={(e) => e.stopPropagation()} className="p-1 rounded hover:bg-gray-200">
                            <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={duplicateSelectedObjects}>
                            <Copy className="w-4 h-4 mr-2" />Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={bringToFront}>Bring to Front</DropdownMenuItem>
                          <DropdownMenuItem onClick={bringForward}>Bring Forward</DropdownMenuItem>
                          <DropdownMenuItem onClick={sendBackward}>Send Backward</DropdownMenuItem>
                          <DropdownMenuItem onClick={sendToBack}>Send to Back</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={deleteSelectedObjects} className="text-red-600 focus:text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                </Reorder.Item>
              ))}
            </AnimatePresence>
          </Reorder.Group>
        )}
      </div>

      <div className="border-t border-gray-200">
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pages</span>
          <button className="text-xs text-gray-700 hover:text-gray-900 font-medium" onClick={() => {}}>+ Add</button>
        </div>
        <div className="px-2 pb-2 max-h-32 overflow-y-auto">
          {state.document?.pages.map((page, index) => (
            <button
              key={page.id}
              onClick={() => dispatch({ type: 'SET_PAGE', payload: index })}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors text-sm ${index === state.currentPageIndex ? 'bg-gray-100 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              <div className="w-8 h-6 bg-gray-200 rounded border border-gray-300 text-xs flex items-center justify-center">{index + 1}</div>
              <span className="flex-1 truncate">{page.name}</span>
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export default LayersPanel;
