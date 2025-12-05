/**
 * Konva Properties Panel
 * Property editor for selected elements
 */

import React, { useCallback, useMemo } from 'react';
import { useKonvaContext } from './KonvaContext';
import { KonvaElement } from './types';

// ============================================================================
// Color Input
// ============================================================================

interface ColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

function ColorInput({ label, value, onChange }: ColorInputProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 dark:text-gray-400 w-16">{label}</label>
      <div className="flex items-center gap-1 flex-1">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded border border-gray-200 dark:border-gray-600 cursor-pointer"
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
        />
      </div>
    </div>
  );
}

// ============================================================================
// Number Input
// ============================================================================

interface NumberInputProps {
  label: string;
  value: number | undefined;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

function NumberInput({ label, value, onChange, min, max, step = 1, unit }: NumberInputProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 dark:text-gray-400 w-16">{label}</label>
      <div className="flex items-center gap-1 flex-1">
        <input
          type="number"
          value={value ?? 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          min={min}
          max={max}
          step={step}
          className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
        />
        {unit && <span className="text-xs text-gray-400">{unit}</span>}
      </div>
    </div>
  );
}

// ============================================================================
// Select Input
// ============================================================================

interface SelectInputProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

function SelectInput({ label, value, onChange, options }: SelectInputProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 dark:text-gray-400 w-16">{label}</label>
      <select
        value={value || options[0]?.value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ============================================================================
// Property Section
// ============================================================================

interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
}

function PropertySection({ title, children }: PropertySectionProps) {
  return (
    <div className="border-b border-gray-200 dark:border-gray-700 pb-3">
      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// ============================================================================
// Main Panel
// ============================================================================

interface KonvaPropertiesPanelProps {
  className?: string;
}

export function KonvaPropertiesPanel({ className = '' }: KonvaPropertiesPanelProps) {
  const {
    state,
    selectedIds,
    getSelectedElements,
    updateElement,
    pushUndo,
  } = useKonvaContext();
  
  const selectedElements = getSelectedElements();
  const singleElement = selectedElements.length === 1 ? selectedElements[0] : null;
  
  // Update with undo
  const handleUpdate = useCallback((id: string, attrs: Partial<KonvaElement>) => {
    pushUndo();
    updateElement(id, attrs);
  }, [pushUndo, updateElement]);
  
  // Update single element
  const update = useCallback((attrs: Partial<KonvaElement>) => {
    if (singleElement) {
      handleUpdate(singleElement.id, attrs);
    }
  }, [singleElement, handleUpdate]);

  if (!state.isPropertiesPanelOpen) return null;

  // No selection
  if (selectedElements.length === 0) {
    return (
      <div className={`w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Properties</h3>
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-500 text-sm p-4 text-center">
          Select an element to edit its properties
        </div>
      </div>
    );
  }

  // Multiple selection
  if (selectedElements.length > 1) {
    return (
      <div className={`w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
        <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Properties</h3>
          <p className="text-xs text-gray-500">{selectedElements.length} elements selected</p>
        </div>
        <div className="flex-1 p-3 text-gray-400 dark:text-gray-500 text-sm">
          Multi-selection editing coming soon
        </div>
      </div>
    );
  }

  // Single element
  const el = singleElement!;
  const isText = el.type === 'text';
  const isImage = el.type === 'image';
  const isShape = ['rect', 'circle', 'ellipse', 'regularPolygon', 'star'].includes(el.type);
  const isLine = ['line', 'arrow'].includes(el.type);

  return (
    <div className={`w-64 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Properties</h3>
        <p className="text-xs text-gray-500">{el.type}</p>
      </div>
      
      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Position */}
        <PropertySection title="Position">
          <NumberInput
            label="X"
            value={el.x}
            onChange={(v) => update({ x: v })}
            unit="px"
          />
          <NumberInput
            label="Y"
            value={el.y}
            onChange={(v) => update({ y: v })}
            unit="px"
          />
        </PropertySection>
        
        {/* Size */}
        {(el.width !== undefined || el.height !== undefined) && (
          <PropertySection title="Size">
            {el.width !== undefined && (
              <NumberInput
                label="Width"
                value={el.width}
                onChange={(v) => update({ width: v })}
                min={1}
                unit="px"
              />
            )}
            {el.height !== undefined && (
              <NumberInput
                label="Height"
                value={el.height}
                onChange={(v) => update({ height: v })}
                min={1}
                unit="px"
              />
            )}
          </PropertySection>
        )}
        
        {/* Rotation & Opacity */}
        <PropertySection title="Transform">
          <NumberInput
            label="Rotation"
            value={el.rotation}
            onChange={(v) => update({ rotation: v })}
            min={0}
            max={360}
            unit="°"
          />
          <NumberInput
            label="Opacity"
            value={(el.opacity ?? 1) * 100}
            onChange={(v) => update({ opacity: v / 100 })}
            min={0}
            max={100}
            unit="%"
          />
        </PropertySection>
        
        {/* Fill & Stroke (shapes) */}
        {(isShape || isLine) && (
          <PropertySection title="Appearance">
            {!isLine && (
              <ColorInput
                label="Fill"
                value={el.fill || '#6366f1'}
                onChange={(v) => update({ fill: v })}
              />
            )}
            <ColorInput
              label="Stroke"
              value={el.stroke || '#000000'}
              onChange={(v) => update({ stroke: v })}
            />
            <NumberInput
              label="Stroke W"
              value={el.strokeWidth}
              onChange={(v) => update({ strokeWidth: v })}
              min={0}
              max={50}
              unit="px"
            />
            {el.type === 'rect' && (
              <NumberInput
                label="Radius"
                value={el.cornerRadius}
                onChange={(v) => update({ cornerRadius: v })}
                min={0}
                unit="px"
              />
            )}
          </PropertySection>
        )}
        
        {/* Text properties */}
        {isText && (
          <>
            <PropertySection title="Text">
              <div className="space-y-2">
                <textarea
                  value={(el as any).text || ''}
                  onChange={(e) => update({ text: e.target.value } as any)}
                  rows={3}
                  className="w-full px-2 py-1 text-xs rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 resize-none"
                  placeholder="Enter text..."
                />
              </div>
            </PropertySection>
            <PropertySection title="Font">
              <SelectInput
                label="Family"
                value={(el as any).fontFamily}
                onChange={(v) => update({ fontFamily: v } as any)}
                options={[
                  { value: 'Inter', label: 'Inter' },
                  { value: 'Arial', label: 'Arial' },
                  { value: 'Helvetica', label: 'Helvetica' },
                  { value: 'Georgia', label: 'Georgia' },
                  { value: 'Times New Roman', label: 'Times' },
                  { value: 'Courier New', label: 'Courier' },
                ]}
              />
              <NumberInput
                label="Size"
                value={(el as any).fontSize}
                onChange={(v) => update({ fontSize: v } as any)}
                min={8}
                max={200}
                unit="px"
              />
              <ColorInput
                label="Color"
                value={el.fill || '#000000'}
                onChange={(v) => update({ fill: v })}
              />
              <SelectInput
                label="Align"
                value={(el as any).align}
                onChange={(v) => update({ align: v } as any)}
                options={[
                  { value: 'left', label: 'Left' },
                  { value: 'center', label: 'Center' },
                  { value: 'right', label: 'Right' },
                ]}
              />
            </PropertySection>
          </>
        )}
        
        {/* Shadow */}
        <PropertySection title="Shadow">
          <ColorInput
            label="Color"
            value={el.shadowColor || '#000000'}
            onChange={(v) => update({ shadowColor: v })}
          />
          <NumberInput
            label="Blur"
            value={el.shadowBlur}
            onChange={(v) => update({ shadowBlur: v })}
            min={0}
            max={100}
            unit="px"
          />
          <NumberInput
            label="Offset X"
            value={el.shadowOffsetX}
            onChange={(v) => update({ shadowOffsetX: v })}
            unit="px"
          />
          <NumberInput
            label="Offset Y"
            value={el.shadowOffsetY}
            onChange={(v) => update({ shadowOffsetY: v })}
            unit="px"
          />
        </PropertySection>
      </div>
    </div>
  );
}

export default KonvaPropertiesPanel;
