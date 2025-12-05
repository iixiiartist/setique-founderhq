/**
 * Properties Panel Component
 * Edit selected element properties with a rich UI
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings2,
  Palette,
  Type,
  Square,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  ChevronDown,
  ChevronRight,
  Move,
  Maximize2,
  RotateCw,
  Layers,
  Droplets,
  Radius,
  BoxSelect,
} from 'lucide-react';
import { useContentStudio } from './ContentStudioContext';
import { Slider } from '../ui/Slider';
import { Input } from '../ui/Input';
import { Label } from '../ui/Label';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/Collapsible';

interface PropertiesPanelProps {
  className?: string;
}

// Font options
const FONT_FAMILIES = [
  { label: 'Inter', value: 'Inter' },
  { label: 'Arial', value: 'Arial' },
  { label: 'Helvetica', value: 'Helvetica' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Georgia', value: 'Georgia' },
  { label: 'Courier New', value: 'Courier New' },
  { label: 'Verdana', value: 'Verdana' },
  { label: 'Roboto', value: 'Roboto' },
  { label: 'Open Sans', value: 'Open Sans' },
  { label: 'Poppins', value: 'Poppins' },
];

const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96];

export function PropertiesPanel({ className = '' }: PropertiesPanelProps) {
  const { state, canvasRef } = useContentStudio();
  
  const [expandedSections, setExpandedSections] = useState({
    position: true,
    appearance: true,
    text: true,
    effects: false,
  });

  // Force re-render on canvas object changes
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Subscribe to Fabric.js events to refresh properties
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleObjectChange = () => {
      setRefreshTrigger(prev => prev + 1);
    };

    // Listen to all object modification events
    canvas.on('object:modified', handleObjectChange);
    canvas.on('object:scaling', handleObjectChange);
    canvas.on('object:moving', handleObjectChange);
    canvas.on('object:rotating', handleObjectChange);
    canvas.on('selection:created', handleObjectChange);
    canvas.on('selection:updated', handleObjectChange);
    canvas.on('selection:cleared', handleObjectChange);

    return () => {
      canvas.off('object:modified', handleObjectChange);
      canvas.off('object:scaling', handleObjectChange);
      canvas.off('object:moving', handleObjectChange);
      canvas.off('object:rotating', handleObjectChange);
      canvas.off('selection:created', handleObjectChange);
      canvas.off('selection:updated', handleObjectChange);
      canvas.off('selection:cleared', handleObjectChange);
    };
  }, [canvasRef]);

  // Get selected object properties
  const selectedObject = useMemo(() => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return null;

    return {
      type: activeObject.type,
      left: Math.round(activeObject.left || 0),
      top: Math.round(activeObject.top || 0),
      width: Math.round((activeObject.width || 0) * (activeObject.scaleX || 1)),
      height: Math.round((activeObject.height || 0) * (activeObject.scaleY || 1)),
      angle: Math.round(activeObject.angle || 0),
      fill: (activeObject as any).fill || '#000000',
      stroke: (activeObject as any).stroke || '',
      strokeWidth: (activeObject as any).strokeWidth || 0,
      opacity: (activeObject.opacity || 1) * 100,
      // Text properties
      fontFamily: (activeObject as any).fontFamily || 'Inter',
      fontSize: (activeObject as any).fontSize || 16,
      fontWeight: (activeObject as any).fontWeight || 'normal',
      fontStyle: (activeObject as any).fontStyle || 'normal',
      underline: (activeObject as any).underline || false,
      textAlign: (activeObject as any).textAlign || 'left',
      lineHeight: (activeObject as any).lineHeight || 1.2,
      letterSpacing: (activeObject as any).charSpacing || 0,
      // Shadow
      shadow: (activeObject as any).shadow || null,
    };
  }, [canvasRef, state.selectedObjectIds, refreshTrigger]);

  // Update property on canvas
  const updateProperty = useCallback((property: string, value: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    // Handle special cases
    switch (property) {
      case 'width':
        const currentWidth = (activeObject.width || 1) * (activeObject.scaleX || 1);
        activeObject.scaleX = value / (activeObject.width || 1);
        break;
      case 'height':
        const currentHeight = (activeObject.height || 1) * (activeObject.scaleY || 1);
        activeObject.scaleY = value / (activeObject.height || 1);
        break;
      case 'opacity':
        activeObject.opacity = value / 100;
        break;
      default:
        (activeObject as any).set(property, value);
    }

    canvas.renderAll();
  }, [canvasRef]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!state.isPropertiesPanelOpen) return null;

  const isTextObject = selectedObject?.type === 'i-text' || selectedObject?.type === 'textbox';

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 300, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={`h-full bg-white border-l border-gray-200 flex flex-col overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-gray-700" />
          <span className="font-semibold text-gray-900">Properties</span>
        </div>
        {selectedObject && (
          <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600 capitalize">
            {selectedObject.type}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {!selectedObject ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 px-4 text-center">
            <BoxSelect className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm">No element selected</p>
            <p className="text-xs mt-1">Click an element to edit properties</p>
          </div>
        ) : (
          <div className="py-2">
            {/* Position & Size */}
            <Collapsible open={expandedSections.position} onOpenChange={() => toggleSection('position')}>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                <div className="flex items-center gap-2">
                  <Move className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Position & Size</span>
                </div>
                {expandedSections.position ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 py-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">X</Label>
                      <Input
                        type="number"
                        value={selectedObject.left}
                        onChange={(e) => updateProperty('left', Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Y</Label>
                      <Input
                        type="number"
                        value={selectedObject.top}
                        onChange={(e) => updateProperty('top', Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Width</Label>
                      <Input
                        type="number"
                        value={selectedObject.width}
                        onChange={(e) => updateProperty('width', Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Height</Label>
                      <Input
                        type="number"
                        value={selectedObject.height}
                        onChange={(e) => updateProperty('height', Number(e.target.value))}
                        className="h-8 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Rotation</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[selectedObject.angle]}
                        min={0}
                        max={360}
                        step={1}
                        onValueChange={([v]) => updateProperty('angle', v)}
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-500 w-10 text-right">{selectedObject.angle}°</span>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Appearance */}
            <Collapsible open={expandedSections.appearance} onOpenChange={() => toggleSection('appearance')}>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Appearance</span>
                </div>
                {expandedSections.appearance ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 py-3 space-y-3">
                  {/* Fill Color */}
                  <div>
                    <Label className="text-xs text-gray-500">Fill Color</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative">
                        <input
                          type="color"
                          value={typeof selectedObject.fill === 'string' ? selectedObject.fill : '#000000'}
                          onChange={(e) => updateProperty('fill', e.target.value)}
                          className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                        />
                      </div>
                      <Input
                        value={typeof selectedObject.fill === 'string' ? selectedObject.fill : ''}
                        onChange={(e) => updateProperty('fill', e.target.value)}
                        className="h-8 text-sm flex-1 font-mono"
                        placeholder="#000000"
                      />
                    </div>
                  </div>

                  {/* Stroke */}
                  <div>
                    <Label className="text-xs text-gray-500">Stroke</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="relative">
                        <input
                          type="color"
                          value={selectedObject.stroke || '#000000'}
                          onChange={(e) => updateProperty('stroke', e.target.value)}
                          className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
                        />
                      </div>
                      <Input
                        type="number"
                        value={selectedObject.strokeWidth}
                        onChange={(e) => updateProperty('strokeWidth', Number(e.target.value))}
                        className="h-8 text-sm w-16"
                        placeholder="0"
                        min={0}
                      />
                      <span className="text-xs text-gray-400">px</span>
                    </div>
                  </div>

                  {/* Opacity */}
                  <div>
                    <Label className="text-xs text-gray-500">Opacity</Label>
                    <div className="flex items-center gap-2">
                      <Slider
                        value={[selectedObject.opacity]}
                        min={0}
                        max={100}
                        step={1}
                        onValueChange={([v]) => updateProperty('opacity', v)}
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-500 w-10 text-right">{Math.round(selectedObject.opacity)}%</span>
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Text Properties - Only show for text objects */}
            {isTextObject && (
              <Collapsible open={expandedSections.text} onOpenChange={() => toggleSection('text')}>
                <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 border-t border-gray-100">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Text</span>
                  </div>
                  {expandedSections.text ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 py-3 space-y-3">
                    {/* Font Family */}
                    <div>
                      <Label className="text-xs text-gray-500">Font</Label>
                      <Select
                        value={selectedObject.fontFamily}
                        onChange={(e) => updateProperty('fontFamily', e.target.value)}
                        options={FONT_FAMILIES}
                        size="sm"
                        className="mt-1"
                      />
                    </div>

                    {/* Font Size */}
                    <div>
                      <Label className="text-xs text-gray-500">Size</Label>
                      <Select
                        value={String(selectedObject.fontSize)}
                        onChange={(e) => updateProperty('fontSize', Number(e.target.value))}
                        options={FONT_SIZES.map((size) => ({ value: String(size), label: `${size}px` }))}
                        size="sm"
                        className="mt-1"
                      />
                    </div>

                    {/* Font Style */}
                    <div>
                      <Label className="text-xs text-gray-500">Style</Label>
                      <div className="flex gap-1 mt-1">
                        <Button
                          variant={selectedObject.fontWeight === 'bold' ? 'primary' : 'outline'}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateProperty('fontWeight', selectedObject.fontWeight === 'bold' ? 'normal' : 'bold')}
                        >
                          <Bold className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={selectedObject.fontStyle === 'italic' ? 'primary' : 'outline'}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateProperty('fontStyle', selectedObject.fontStyle === 'italic' ? 'normal' : 'italic')}
                        >
                          <Italic className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={selectedObject.underline ? 'primary' : 'outline'}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => updateProperty('underline', !selectedObject.underline)}
                        >
                          <Underline className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Text Alignment */}
                    <div>
                      <Label className="text-xs text-gray-500">Alignment</Label>
                      <div className="flex gap-1 mt-1">
                        {[
                          { value: 'left', icon: AlignLeft },
                          { value: 'center', icon: AlignCenter },
                          { value: 'right', icon: AlignRight },
                          { value: 'justify', icon: AlignJustify },
                        ].map(({ value, icon: Icon }) => (
                          <Button
                            key={value}
                            variant={selectedObject.textAlign === value ? 'primary' : 'outline'}
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => updateProperty('textAlign', value)}
                          >
                            <Icon className="w-4 h-4" />
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Line Height */}
                    <div>
                      <Label className="text-xs text-gray-500">Line Height</Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[selectedObject.lineHeight * 100]}
                          min={80}
                          max={300}
                          step={10}
                          onValueChange={([v]) => updateProperty('lineHeight', v / 100)}
                          className="flex-1"
                        />
                        <span className="text-xs text-gray-500 w-10 text-right">{selectedObject.lineHeight.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Effects */}
            <Collapsible open={expandedSections.effects} onOpenChange={() => toggleSection('effects')}>
              <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-2 hover:bg-gray-50 border-t border-gray-100">
                <div className="flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Effects</span>
                </div>
                {expandedSections.effects ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 py-3 space-y-3">
                  <p className="text-xs text-gray-500">Shadow, blur, and other effects coming soon</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default PropertiesPanel;

