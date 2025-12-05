/**
 * Content Studio - Main Component
 * A Canva-like content creation experience with AI assistance
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Save,
  Download,
  Share2,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid3X3,
  Eye,
  EyeOff,
  Settings,
  ChevronLeft,
  MoreHorizontal,
  Layers,
  Settings2,
  FileText,
  Plus,
  Trash2,
  Copy,
  Play,
  Menu,
  Home,
  PanelLeftClose,
  PanelRightClose,
} from 'lucide-react';
import { ContentStudioProvider, useContentStudio } from './ContentStudioContext';
import { CanvasEngine } from './CanvasEngine';
import { LayersPanel } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { ElementToolbar } from './ElementToolbar';
import { AISidebar } from './AISidebar';
import { ExportModal } from './ExportModal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/DropdownMenu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/Tooltip';
import { PAGE_SIZES } from './types';

interface ContentStudioProps {
  documentId?: string;
  onClose?: () => void;
  onSave?: () => void;
}

function ContentStudioInner({ documentId, onClose, onSave }: ContentStudioProps) {
  const {
    state,
    createNewDocument,
    saveDocument,
    undo,
    redo,
    zoomIn,
    zoomOut,
    fitToScreen,
    setZoom,
    toggleLayersPanel,
    togglePropertiesPanel,
    toggleAIPanel,
    addPage,
    deletePage,
    duplicatePage,
    deleteSelectedObjects,
    duplicateSelectedObjects,
    updateDocumentTitle,
    updateDocumentSettings,
  } = useContentStudio();

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  // Grid visibility from document settings
  const showGrid = state.document?.settings.grid.enabled ?? true;
  const toggleGrid = useCallback(() => {
    updateDocumentSettings({ grid: { ...state.document?.settings.grid, enabled: !showGrid } });
  }, [updateDocumentSettings, state.document?.settings.grid, showGrid]);

  // Initialize with new document or load existing
  useEffect(() => {
    if (!state.document) {
      createNewDocument('Untitled Document', 'presentation');
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if in text input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Ctrl/Cmd + Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y - Redo
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        redo();
      }

      // Ctrl/Cmd + S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveDocument();
      }

      // Ctrl/Cmd + D - Duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        duplicateSelectedObjects();
      }

      // Ctrl/Cmd + E - Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        setIsExportModalOpen(true);
      }

      // + / - for zoom
      if (e.key === '=' || e.key === '+') {
        zoomIn();
      }
      if (e.key === '-') {
        zoomOut();
      }

      // 0 to reset zoom
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setZoom(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveDocument, duplicateSelectedObjects, zoomIn, zoomOut, setZoom]);

  const handleTitleEdit = useCallback(() => {
    if (state.document) {
      setTitleValue(state.document.title);
      setIsEditingTitle(true);
    }
  }, [state.document]);

  const handleTitleSave = useCallback(() => {
    if (titleValue.trim() && titleValue !== state.document?.title) {
      updateDocumentTitle(titleValue.trim());
    }
    setIsEditingTitle(false);
  }, [titleValue, state.document?.title, updateDocumentTitle]);

  if (!state.document) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-gray-100">
        {/* Top Toolbar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 z-50 relative">
          {/* Left Section - Navigation & Title */}
          <div className="flex items-center gap-3 flex-1">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              
              {isEditingTitle ? (
                <Input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                  className="h-8 w-48 text-sm font-medium"
                  autoFocus
                />
              ) : (
                <button
                  onClick={handleTitleEdit}
                  className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors"
                >
                  {state.document.title}
                </button>
              )}
            </div>

            {/* Save Status */}
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              {state.isSaving ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Saving...
                </>
              ) : state.lastSaved ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  Saved
                </>
              ) : null}
            </div>
          </div>

          {/* Center Section - Edit Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={undo}
                  disabled={state.undoStack.length === 0}
                  className="h-8 w-8 p-0"
                >
                  <Undo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={redo}
                  disabled={state.redoStack.length === 0}
                  className="h-8 w-8 p-0"
                >
                  <Redo2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* Zoom Controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={zoomOut} className="h-8 w-8 p-0">
                  <ZoomOut className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out (-)</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-2 min-w-[60px] text-xs font-medium">
                  {Math.round(state.zoom * 100)}%
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {[50, 75, 100, 125, 150, 200].map((z) => (
                  <DropdownMenuItem key={z} onClick={() => setZoom(z / 100)}>
                    {z}%
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={fitToScreen}>
                  Fit to Screen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={zoomIn} className="h-8 w-8 p-0">
                  <ZoomIn className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In (+)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={fitToScreen} className="h-8 w-8 p-0">
                  <Maximize className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit to Screen</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* View Controls */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showGrid ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={toggleGrid}
                  className="h-8 w-8 p-0"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Grid</TooltipContent>
            </Tooltip>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={state.isLayersPanelOpen ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={toggleLayersPanel}
                  className="h-8 w-8 p-0"
                >
                  <Layers className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Layers Panel</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={state.isPropertiesPanelOpen ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={togglePropertiesPanel}
                  className="h-8 w-8 p-0"
                >
                  <Settings2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Properties Panel</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-gray-200 mx-2" />

            <Button
              variant="outline"
              size="sm"
              onClick={() => saveDocument()}
              className="h-8 px-3 text-xs whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              Save
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExportModalOpen(true)}
              className="h-8 px-3 text-xs whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Export
            </Button>

            <Button
              size="sm"
              className="h-8 px-3 text-xs whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Share2 className="w-3.5 h-3.5 mr-1.5" />
              Share
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={duplicateSelectedObjects}>
                  <Copy className="w-4 h-4 mr-2" />
                  Duplicate Selection
                </DropdownMenuItem>
                <DropdownMenuItem onClick={deleteSelectedObjects}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selection
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={addPage}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Page
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="w-4 h-4 mr-2" />
                  Document Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Element Toolbar (Left) */}
          <ElementToolbar className="flex-shrink-0" />

          {/* Layers Panel */}
          <AnimatePresence mode="wait">
            {state.isLayersPanelOpen && (
              <LayersPanel className="flex-shrink-0" />
            )}
          </AnimatePresence>

          {/* Canvas Area */}
          <CanvasEngine className="flex-1" showGrid={showGrid} />

          {/* Properties Panel */}
          <AnimatePresence mode="wait">
            {state.isPropertiesPanelOpen && (
              <PropertiesPanel className="flex-shrink-0" />
            )}
          </AnimatePresence>

          {/* AI Sidebar */}
          <AnimatePresence mode="wait">
            {state.isAIPanelOpen && (
              <AISidebar className="flex-shrink-0" />
            )}
          </AnimatePresence>
        </div>

        {/* Export Modal */}
        <ExportModal
          open={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
        />
      </div>
    </TooltipProvider>
  );
}

// Wrapped component with provider
export function ContentStudio(props: ContentStudioProps) {
  return (
    <ContentStudioProvider>
      <ContentStudioInner {...props} />
    </ContentStudioProvider>
  );
}

export default ContentStudio;

