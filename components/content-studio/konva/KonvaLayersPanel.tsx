/**
 * Konva Layers Panel
 * Shows all elements on the current page with reordering and visibility controls
 */

import React, { useCallback } from 'react';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown,
  Square,
  Circle,
  Type,
  Image,
  Minus,
  Hexagon,
  Star,
  ArrowRight,
} from 'lucide-react';
import { useKonvaContext } from './KonvaContext';
import { KonvaElement } from './types';

interface LayerItemProps {
  element: KonvaElement;
  isSelected: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

function getElementIcon(type: string) {
  switch (type) {
    case 'rect':
      return <Square className="w-4 h-4" />;
    case 'circle':
    case 'ellipse':
      return <Circle className="w-4 h-4" />;
    case 'text':
      return <Type className="w-4 h-4" />;
    case 'image':
      return <Image className="w-4 h-4" />;
    case 'line':
      return <Minus className="w-4 h-4" />;
    case 'arrow':
      return <ArrowRight className="w-4 h-4" />;
    case 'regularPolygon':
      return <Hexagon className="w-4 h-4" />;
    case 'star':
      return <Star className="w-4 h-4" />;
    default:
      return <Square className="w-4 h-4" />;
  }
}

function getElementLabel(element: KonvaElement): string {
  if (element.name) return element.name;
  
  switch (element.type) {
    case 'text':
      const textEl = element as any;
      return textEl.text?.substring(0, 20) || 'Text';
    case 'rect':
      return 'Rectangle';
    case 'circle':
      return 'Circle';
    case 'ellipse':
      return 'Ellipse';
    case 'line':
      return 'Line';
    case 'arrow':
      return 'Arrow';
    case 'image':
      return 'Image';
    case 'regularPolygon':
      return 'Polygon';
    case 'star':
      return 'Star';
    default:
      return 'Element';
  }
}

function LayerItem({
  element,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: LayerItemProps) {
  const [showActions, setShowActions] = React.useState(false);

  return (
    <div
      className={`
        group flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-all
        ${isSelected
          ? 'bg-indigo-100 dark:bg-indigo-900/30 border border-indigo-300 dark:border-indigo-600'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700 border border-transparent'
        }
        ${!element.visible ? 'opacity-50' : ''}
      `}
      onClick={(e) => onSelect(element.id, e.shiftKey)}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Element Icon */}
      <div className={`text-gray-500 dark:text-gray-400 ${element.locked ? 'text-orange-500' : ''}`}>
        {getElementIcon(element.type)}
      </div>
      
      {/* Element Name */}
      <span className="flex-1 text-sm truncate text-gray-700 dark:text-gray-300">
        {getElementLabel(element)}
      </span>
      
      {/* Quick Actions - show on hover */}
      {showActions && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp(element.id);
            }}
            disabled={isFirst}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30"
            title="Move up"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown(element.id);
            }}
            disabled={isLast}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-30"
            title="Move down"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(element.id);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title="Duplicate"
          >
            <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(element.id);
            }}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded text-red-500"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
      
      {/* Visibility & Lock - always visible */}
      {!showActions && (
        <div className="flex items-center gap-0.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisibility(element.id);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title={element.visible ? 'Hide' : 'Show'}
          >
            {element.visible ? (
              <Eye className="w-3 h-3 text-gray-400" />
            ) : (
              <EyeOff className="w-3 h-3 text-gray-400" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleLock(element.id);
            }}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            title={element.locked ? 'Unlock' : 'Lock'}
          >
            {element.locked ? (
              <Lock className="w-3 h-3 text-orange-500" />
            ) : (
              <Unlock className="w-3 h-3 text-gray-400" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}

interface KonvaLayersPanelProps {
  className?: string;
}

export function KonvaLayersPanel({ className = '' }: KonvaLayersPanelProps) {
  const {
    state,
    selectedIds,
    setSelectedIds,
    updateElement,
    dispatch,
    pushUndo,
    getCurrentPage,
  } = useKonvaContext();
  
  const currentPage = getCurrentPage();
  const elements = currentPage?.canvas.elements || [];
  
  // Reverse order to show top elements first
  const displayElements = [...elements].reverse();
  
  // Handle select
  const handleSelect = useCallback((id: string, additive: boolean) => {
    if (additive) {
      setSelectedIds((prev) => 
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
    } else {
      setSelectedIds([id]);
    }
  }, [setSelectedIds]);
  
  // Toggle visibility
  const handleToggleVisibility = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (el) {
      updateElement(id, { visible: !el.visible });
    }
  }, [elements, updateElement]);
  
  // Toggle lock
  const handleToggleLock = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (el) {
      updateElement(id, { locked: !el.locked });
    }
  }, [elements, updateElement]);
  
  // Delete
  const handleDelete = useCallback((id: string) => {
    pushUndo();
    dispatch({ type: 'DELETE_ELEMENTS', payload: [id] });
  }, [dispatch, pushUndo]);
  
  // Duplicate
  const handleDuplicate = useCallback((id: string) => {
    const el = elements.find(e => e.id === id);
    if (el) {
      pushUndo();
      const newEl = {
        ...el,
        id: crypto.randomUUID(),
        x: el.x + 20,
        y: el.y + 20,
      };
      dispatch({ type: 'ADD_ELEMENT', payload: newEl });
      setSelectedIds([newEl.id]);
    }
  }, [elements, dispatch, pushUndo, setSelectedIds]);
  
  // Move up (in array, means later in display due to reverse)
  const handleMoveUp = useCallback((id: string) => {
    const index = elements.findIndex(e => e.id === id);
    if (index < elements.length - 1) {
      pushUndo();
      const newElements = [...elements];
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      dispatch({ type: 'SET_ELEMENTS', payload: newElements });
    }
  }, [elements, dispatch, pushUndo]);
  
  // Move down (in array, means earlier in display due to reverse)
  const handleMoveDown = useCallback((id: string) => {
    const index = elements.findIndex(e => e.id === id);
    if (index > 0) {
      pushUndo();
      const newElements = [...elements];
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
      dispatch({ type: 'SET_ELEMENTS', payload: newElements });
    }
  }, [elements, dispatch, pushUndo]);

  if (!state.isLayersPanelOpen) return null;

  return (
    <div className={`w-60 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Layers</h3>
        <p className="text-xs text-gray-500 dark:text-gray-500">
          {elements.length} element{elements.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      {/* Layers List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {displayElements.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            No elements on this page
          </div>
        ) : (
          displayElements.map((element, index) => (
            <LayerItem
              key={element.id}
              element={element}
              isSelected={selectedIds.includes(element.id)}
              onSelect={handleSelect}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onMoveUp={handleMoveUp}
              onMoveDown={handleMoveDown}
              isFirst={index === 0}
              isLast={index === displayElements.length - 1}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default KonvaLayersPanel;
