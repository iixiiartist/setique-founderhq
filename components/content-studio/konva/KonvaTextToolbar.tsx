/**
 * Konva Text Toolbar
 * Floating toolbar for text formatting that appears when text is selected
 */

import React, { useCallback, useMemo } from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  ChevronDown,
  Type,
  Palette,
} from 'lucide-react';
import { useKonvaContext } from './KonvaContext';

// ============================================================================
// Font Options
// ============================================================================

export const FONT_FAMILIES = [
  // Sans-serif
  { value: 'Inter', label: 'Inter', category: 'Sans-serif' },
  { value: 'Arial', label: 'Arial', category: 'Sans-serif' },
  { value: 'Helvetica', label: 'Helvetica', category: 'Sans-serif' },
  { value: 'Verdana', label: 'Verdana', category: 'Sans-serif' },
  { value: 'Roboto', label: 'Roboto', category: 'Sans-serif' },
  { value: 'Open Sans', label: 'Open Sans', category: 'Sans-serif' },
  { value: 'Lato', label: 'Lato', category: 'Sans-serif' },
  { value: 'Montserrat', label: 'Montserrat', category: 'Sans-serif' },
  { value: 'Poppins', label: 'Poppins', category: 'Sans-serif' },
  { value: 'Nunito', label: 'Nunito', category: 'Sans-serif' },
  // Serif
  { value: 'Georgia', label: 'Georgia', category: 'Serif' },
  { value: 'Times New Roman', label: 'Times New Roman', category: 'Serif' },
  { value: 'Playfair Display', label: 'Playfair Display', category: 'Serif' },
  { value: 'Merriweather', label: 'Merriweather', category: 'Serif' },
  { value: 'Lora', label: 'Lora', category: 'Serif' },
  // Monospace
  { value: 'Courier New', label: 'Courier New', category: 'Monospace' },
  { value: 'Monaco', label: 'Monaco', category: 'Monospace' },
  { value: 'Fira Code', label: 'Fira Code', category: 'Monospace' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono', category: 'Monospace' },
  // Display/Script
  { value: 'Pacifico', label: 'Pacifico', category: 'Script' },
  { value: 'Dancing Script', label: 'Dancing Script', category: 'Script' },
  { value: 'Lobster', label: 'Lobster', category: 'Display' },
  { value: 'Bebas Neue', label: 'Bebas Neue', category: 'Display' },
  { value: 'Oswald', label: 'Oswald', category: 'Display' },
];

export const FONT_SIZES = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 42, 48, 56, 64, 72, 96, 128];

export const FONT_WEIGHTS = [
  { value: 'normal', label: 'Regular' },
  { value: 'bold', label: 'Bold' },
  { value: '100', label: 'Thin' },
  { value: '200', label: 'Extra Light' },
  { value: '300', label: 'Light' },
  { value: '400', label: 'Regular' },
  { value: '500', label: 'Medium' },
  { value: '600', label: 'Semi Bold' },
  { value: '700', label: 'Bold' },
  { value: '800', label: 'Extra Bold' },
  { value: '900', label: 'Black' },
];

// ============================================================================
// Toolbar Button
// ============================================================================

interface ToolbarButtonProps {
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
  title?: string;
  disabled?: boolean;
}

function ToolbarButton({ icon, onClick, isActive, title, disabled }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`
        p-1.5 rounded transition-colors
        ${isActive ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100 text-gray-700'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {icon}
    </button>
  );
}

// ============================================================================
// Toolbar Divider
// ============================================================================

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-200 mx-1" />;
}

// ============================================================================
// Main Component
// ============================================================================

interface KonvaTextToolbarProps {
  position: { x: number; y: number };
  onClose?: () => void;
}

export function KonvaTextToolbar({ position, onClose }: KonvaTextToolbarProps) {
  const {
    selectedIds,
    getSelectedElements,
    updateElement,
    pushUndo,
  } = useKonvaContext();

  const selectedElements = getSelectedElements();
  const textElement = useMemo(() => {
    const texts = selectedElements.filter(el => el.type === 'text');
    return texts.length === 1 ? texts[0] as any : null;
  }, [selectedElements]);

  // Quick update helper
  const update = useCallback((attrs: any) => {
    if (textElement) {
      pushUndo();
      updateElement(textElement.id, attrs);
    }
  }, [textElement, pushUndo, updateElement]);

  if (!textElement) return null;

  // Parse font style
  const fontStyle = textElement.fontStyle || 'normal';
  const isBold = fontStyle.includes('bold') || textElement.fontWeight === 'bold' || parseInt(textElement.fontWeight) >= 600;
  const isItalic = fontStyle.includes('italic');
  const isUnderline = textElement.textDecoration === 'underline';

  // Toggle bold
  const toggleBold = () => {
    if (isBold) {
      update({ fontStyle: fontStyle.replace('bold', '').trim() || 'normal', fontWeight: 'normal' });
    } else {
      const newStyle = fontStyle === 'normal' ? 'bold' : `bold ${fontStyle}`;
      update({ fontStyle: newStyle.trim(), fontWeight: 'bold' });
    }
  };

  // Toggle italic
  const toggleItalic = () => {
    if (isItalic) {
      update({ fontStyle: fontStyle.replace('italic', '').trim() || 'normal' });
    } else {
      const newStyle = fontStyle === 'normal' ? 'italic' : `${fontStyle} italic`;
      update({ fontStyle: newStyle.trim() });
    }
  };

  // Toggle underline
  const toggleUnderline = () => {
    update({ textDecoration: isUnderline ? '' : 'underline' });
  };

  // Set alignment
  const setAlign = (align: string) => {
    update({ align });
  };

  // Set font family
  const setFontFamily = (fontFamily: string) => {
    update({ fontFamily });
  };

  // Set font size
  const setFontSize = (fontSize: number) => {
    update({ fontSize });
  };

  // Set color
  const setColor = (fill: string) => {
    update({ fill });
  };

  const currentAlign = textElement.align || 'left';

  return (
    <div
      className="absolute z-50 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 px-2 py-1.5"
      style={{
        left: position.x,
        top: position.y - 50,
        transform: 'translateX(-50%)',
      }}
    >
      {/* Font Family */}
      <div className="relative">
        <select
          value={textElement.fontFamily || 'Inter'}
          onChange={(e) => setFontFamily(e.target.value)}
          className="appearance-none bg-transparent text-xs font-medium px-2 py-1 pr-6 rounded hover:bg-gray-100 cursor-pointer max-w-[120px] truncate"
          style={{ fontFamily: textElement.fontFamily || 'Inter' }}
        >
          {Object.entries(
            FONT_FAMILIES.reduce((acc, font) => {
              if (!acc[font.category]) acc[font.category] = [];
              acc[font.category].push(font);
              return acc;
            }, {} as Record<string, typeof FONT_FAMILIES>)
          ).map(([category, fonts]) => (
            <optgroup key={category} label={category}>
              {fonts.map((font) => (
                <option key={font.value} value={font.value} style={{ fontFamily: font.value }}>
                  {font.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
      </div>

      <ToolbarDivider />

      {/* Font Size */}
      <div className="relative">
        <select
          value={textElement.fontSize || 24}
          onChange={(e) => setFontSize(parseInt(e.target.value))}
          className="appearance-none bg-transparent text-xs font-medium px-2 py-1 pr-6 rounded hover:bg-gray-100 cursor-pointer w-16"
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>{size}px</option>
          ))}
        </select>
        <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
      </div>

      <ToolbarDivider />

      {/* Text Style */}
      <ToolbarButton
        icon={<Bold className="w-4 h-4" />}
        onClick={toggleBold}
        isActive={isBold}
        title="Bold (Ctrl+B)"
      />
      <ToolbarButton
        icon={<Italic className="w-4 h-4" />}
        onClick={toggleItalic}
        isActive={isItalic}
        title="Italic (Ctrl+I)"
      />
      <ToolbarButton
        icon={<Underline className="w-4 h-4" />}
        onClick={toggleUnderline}
        isActive={isUnderline}
        title="Underline (Ctrl+U)"
      />

      <ToolbarDivider />

      {/* Alignment */}
      <ToolbarButton
        icon={<AlignLeft className="w-4 h-4" />}
        onClick={() => setAlign('left')}
        isActive={currentAlign === 'left'}
        title="Align Left"
      />
      <ToolbarButton
        icon={<AlignCenter className="w-4 h-4" />}
        onClick={() => setAlign('center')}
        isActive={currentAlign === 'center'}
        title="Align Center"
      />
      <ToolbarButton
        icon={<AlignRight className="w-4 h-4" />}
        onClick={() => setAlign('right')}
        isActive={currentAlign === 'right'}
        title="Align Right"
      />

      <ToolbarDivider />

      {/* Color */}
      <div className="relative">
        <input
          type="color"
          value={textElement.fill || '#1f2937'}
          onChange={(e) => setColor(e.target.value)}
          className="w-6 h-6 rounded cursor-pointer border border-gray-200"
          title="Text Color"
        />
      </div>
    </div>
  );
}

export default KonvaTextToolbar;
