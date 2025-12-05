/**
 * Konva Element Toolbar
 * Toolbar for adding elements to the Konva canvas
 */

import React, { useState, useCallback, useRef } from 'react';
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
  X,
  FileImage,
  FileText,
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
          ? 'bg-gray-200 text-gray-900' 
          : 'text-gray-600 hover:bg-gray-100'
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
  return <div className="w-px h-6 bg-gray-200 mx-1" />;
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
    stageRef,
  } = useKonvaContext();
  
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Add image from file
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      if (src) {
        pushUndo();
        const element = createDefaultElement('image');
        const updatedElement = {
          ...element,
          src,
          name: file.name,
        };
        dispatch({ type: 'ADD_ELEMENT', payload: updatedElement as KonvaElement });
        setActiveTool('select');
      }
    };
    reader.readAsDataURL(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [dispatch, pushUndo, setActiveTool]);

  const openImagePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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

  // Export functions
  const handleExport = useCallback(() => {
    setShowExportModal(true);
  }, []);

  const exportAs = useCallback((format: 'png' | 'jpeg' | 'svg') => {
    const stage = stageRef?.current;
    if (!stage) {
      console.error('No stage reference available');
      setShowExportModal(false);
      return;
    }

    setIsExporting(true);
    
    try {
      if (format === 'svg') {
        // For SVG, we'll export as PNG since Konva doesn't support direct SVG export
        // but we can still offer high-quality PNG
        const uri = stage.toDataURL({ pixelRatio: 3, mimeType: 'image/png' });
        downloadFile(uri, `canvas-export-${Date.now()}.png`);
      } else {
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
        const uri = stage.toDataURL({ 
          pixelRatio: 2, 
          mimeType,
          quality: format === 'jpeg' ? 0.92 : undefined 
        });
        downloadFile(uri, `canvas-export-${Date.now()}.${format}`);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  }, [stageRef]);

  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canUndo = state.undoStack.length > 0;
  const canRedo = state.redoStack.length > 0;

  return (
    <div className={`flex items-center gap-1 p-2 bg-white border-b border-gray-200 ${className}`}>
      {/* Tool Selection */}
      <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
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
          onClick={openImagePicker}
        />
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
      
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
          className="px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded min-w-[50px]"
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

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Export Canvas</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg text-gray-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-2">
              <button
                onClick={() => exportAs('png')}
                disabled={isExporting}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
              >
                <FileImage className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">PNG</div>
                  <div className="text-xs text-gray-500">High quality with transparency</div>
                </div>
              </button>
              
              <button
                onClick={() => exportAs('jpeg')}
                disabled={isExporting}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
              >
                <FileImage className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">JPEG</div>
                  <div className="text-xs text-gray-500">Smaller file size, no transparency</div>
                </div>
              </button>
              
              <button
                onClick={() => exportAs('svg')}
                disabled={isExporting}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors"
              >
                <FileText className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <div className="font-medium text-gray-900">High-Res PNG</div>
                  <div className="text-xs text-gray-500">3x resolution for print quality</div>
                </div>
              </button>
            </div>
            
            {isExporting && (
              <div className="mt-4 text-center text-sm text-gray-500">
                Exporting...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default KonvaElementToolbar;
