/**
 * Konva Element Toolbar
 * Toolbar for adding elements to the Konva canvas
 */

import React, { useState, useCallback } from 'react';
import { 
  Square, 
  Circle, 
  Type, 
  Minus, 
  ArrowRight, 
  Image, 
  Hexagon,
  Star,
  MousePointer,
  Hand,
  ZoomIn,
  ZoomOut,
  Undo2,
  Redo2,
  Save,
  Download,
  Layers,
  Settings2,
  Sparkles,
} from 'lucide-react';
import { useKonvaContext } from './KonvaContext';
import { KonvaElement, createDefaultElement } from './types';

interface ToolbarButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
}

function ToolbarButton({ icon, label, onClick, isActive, disabled }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded-lg transition-all flex items-center justify-center
        ${isActive 
          ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400' 
          : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
      title={label}
    >
      {icon}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />;
}

interface KonvaElementToolbarProps {
  className?: string;
}

export function KonvaElementToolbar({ className = '' }: KonvaElementToolbarProps) {
  const {
    state,
    activeTool,
    setActiveTool,
    zoom,
    setZoom,
    undo,
    redo,
    saveDocument,
    toggleLayersPanel,
    togglePropertiesPanel,
    toggleAIPanel,
    dispatch,
    pushUndo,
  } = useKonvaContext();
  
  const [isExporting, setIsExporting] = useState(false);

  // Add element to canvas
  const addElement = useCallback((type: string) => {
    const element = createDefaultElement(type as any);
    if (element.id) {
      pushUndo();
      dispatch({ type: 'ADD_ELEMENT', payload: element as KonvaElement });
    }
    // Reset to select tool after adding
    setActiveTool('select');
  }, [dispatch, pushUndo, setActiveTool]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(Math.min(5, zoom * 1.2));
  }, [zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(Math.max(0.1, zoom / 1.2));
  }, [zoom, setZoom]);

  const handleZoomReset = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  // Save
  const handleSave = useCallback(async () => {
    await saveDocument();
  }, [saveDocument]);

  // Export
  const handleExport = useCallback(() => {
    setIsExporting(true);
    // TODO: Implement export modal/flow
    setTimeout(() => setIsExporting(false), 1000);
  }, []);

  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  return (
    <div className={`flex items-center gap-1 p-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Tool Selection */}
      <div className="flex items-center gap-0.5 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <ToolbarButton
          icon={<MousePointer className="w-4 h-4" />}
          label="Select (V)"
          onClick={() => setActiveTool('select')}
          isActive={activeTool === 'select'}
        />
        <ToolbarButton
          icon={<Hand className="w-4 h-4" />}
          label="Pan (H)"
          onClick={() => setActiveTool('pan')}
          isActive={activeTool === 'pan'}
        />
      </div>
      
      <ToolbarDivider />
      
      {/* Shape Tools */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          icon={<Square className="w-4 h-4" />}
          label="Rectangle (R)"
          onClick={() => addElement('rect')}
        />
        <ToolbarButton
          icon={<Circle className="w-4 h-4" />}
          label="Circle (C)"
          onClick={() => addElement('circle')}
        />
        <ToolbarButton
          icon={<Hexagon className="w-4 h-4" />}
          label="Polygon"
          onClick={() => addElement('regularPolygon')}
        />
        <ToolbarButton
          icon={<Star className="w-4 h-4" />}
          label="Star"
          onClick={() => addElement('star')}
        />
        <ToolbarButton
          icon={<Minus className="w-4 h-4" />}
          label="Line (L)"
          onClick={() => addElement('line')}
        />
        <ToolbarButton
          icon={<ArrowRight className="w-4 h-4" />}
          label="Arrow"
          onClick={() => addElement('arrow')}
        />
      </div>
      
      <ToolbarDivider />
      
      {/* Content Tools */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          icon={<Type className="w-4 h-4" />}
          label="Text (T)"
          onClick={() => addElement('text')}
        />
        <ToolbarButton
          icon={<Image className="w-4 h-4" />}
          label="Image (I)"
          onClick={() => {
            // TODO: Open image picker
            console.log('[Toolbar] Image picker requested');
          }}
        />
      </div>
      
      <ToolbarDivider />
      
      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          icon={<Undo2 className="w-4 h-4" />}
          label="Undo (Ctrl+Z)"
          onClick={undo}
          disabled={!canUndo}
        />
        <ToolbarButton
          icon={<Redo2 className="w-4 h-4" />}
          label="Redo (Ctrl+Y)"
          onClick={redo}
          disabled={!canRedo}
        />
      </div>
      
      <ToolbarDivider />
      
      {/* Zoom Controls */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          icon={<ZoomOut className="w-4 h-4" />}
          label="Zoom Out"
          onClick={handleZoomOut}
        />
        <button
          onClick={handleZoomReset}
          className="px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded min-w-[50px]"
          title="Reset zoom"
        >
          {Math.round(zoom * 100)}%
        </button>
        <ToolbarButton
          icon={<ZoomIn className="w-4 h-4" />}
          label="Zoom In"
          onClick={handleZoomIn}
        />
      </div>
      
      <div className="flex-1" />
      
      {/* Right side tools */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          icon={<Sparkles className="w-4 h-4" />}
          label="AI Assistant"
          onClick={toggleAIPanel}
          isActive={state.isAIPanelOpen}
        />
        <ToolbarButton
          icon={<Layers className="w-4 h-4" />}
          label="Layers Panel"
          onClick={toggleLayersPanel}
          isActive={state.isLayersPanelOpen}
        />
        <ToolbarButton
          icon={<Settings2 className="w-4 h-4" />}
          label="Properties Panel"
          onClick={togglePropertiesPanel}
          isActive={state.isPropertiesPanelOpen}
        />
        
        <ToolbarDivider />
        
        <ToolbarButton
          icon={<Save className="w-4 h-4" />}
          label="Save (Ctrl+S)"
          onClick={handleSave}
          disabled={!state.isDirty}
        />
        <ToolbarButton
          icon={<Download className="w-4 h-4" />}
          label="Export"
          onClick={handleExport}
          disabled={isExporting}
        />
      </div>
    </div>
  );
}

export default KonvaElementToolbar;
