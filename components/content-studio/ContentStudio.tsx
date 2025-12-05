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
import { loadDocument as loadFromSupabase } from '../../lib/services/contentStudioService';
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
    loadDocument,
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
  const [isLoading, setIsLoading] = useState(!!documentId);

  // Grid visibility from document settings
  const showGrid = state.document?.settings.grid.enabled ?? true;
  const toggleGrid = useCallback(() => {
    updateDocumentSettings({ grid: { ...state.document?.settings.grid, enabled: !showGrid } });
  }, [updateDocumentSettings, state.document?.settings.grid, showGrid]);

  // Initialize with new document or load existing
  useEffect(() => {
    const initDocument = async () => {
      if (documentId) {
        setIsLoading(true);
        // Load existing document from Supabase
        const doc = await loadFromSupabase(documentId);
        if (doc) {
          loadDocument(doc);
        } else {
          // Document not found, create new
          createNewDocument('Untitled Document', 'presentation');
        }
        setIsLoading(false);
      } else if (!state.document) {
        createNewDocument('Untitled Document', 'presentation');
      }
    };
    initDocument();
  }, [documentId]);

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
      {/* 
        Z-Index Layering System:
        - z-10: Canvas area (base layer)
        - z-20: Side panels (Layers, Properties, AI Sidebar)
        - z-30: Element Toolbar 
        - z-40: Dropdowns and Popovers
        - z-50: Top header/toolbar
        - z-60: Modals and overlays
      */}
      <div className="h-screen flex flex-col bg-gray-100 overflow-hidden">
        {/* Top Toolbar - Highest z-index for accessibility */}
        <header className="h-16 min-h-[64px] bg-white border-b border-gray-200 flex items-center px-3 sm:px-4 gap-3 z-50 relative flex-shrink-0">
          {/* Left Section - Navigation & Title */}
          <div className="flex items-center gap-3 min-w-0">
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} className="h-10 w-10 p-0 flex-shrink-0">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-white" />
              </div>
              
              {isEditingTitle ? (
                <Input
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => e.key === 'Enter' && handleTitleSave()}
                  className="h-9 w-40 sm:w-48 text-sm font-medium"
                  autoFocus
                />
              ) : (
                <button
                  onClick={handleTitleEdit}
                  className="text-sm font-medium text-gray-900 hover:text-indigo-600 transition-colors truncate max-w-[120px] sm:max-w-[180px]"
                >
                  {state.document.title}
                </button>
              )}
            </div>
          </div>

          {/* Center Section - Edit Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={undo}
                  disabled={state.undoStack.length === 0}
                  className="h-9 w-9 p-0"
                >
                  <Undo2 className="w-[18px] h-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={redo}
                  disabled={state.redoStack.length === 0}
                  className="h-9 w-9 p-0"
                >
                  <Redo2 className="w-[18px] h-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-gray-200 mx-1.5 hidden sm:block" />

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={zoomOut} className="h-9 w-9 p-0">
                    <ZoomOut className="w-[18px] h-[18px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom Out</TooltipContent>
              </Tooltip>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 px-2 min-w-[50px] text-sm font-medium">
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
                  <Button variant="ghost" size="sm" onClick={zoomIn} className="h-9 w-9 p-0">
                    <ZoomIn className="w-[18px] h-[18px]" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Zoom In</TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="sm" onClick={fitToScreen} className="h-9 w-9 p-0">
                  <Maximize className="w-[18px] h-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Fit to Screen</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showGrid ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={toggleGrid}
                  className="h-9 w-9 p-0"
                >
                  <Grid3X3 className="w-[18px] h-[18px]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Grid</TooltipContent>
            </Tooltip>
          </div>

          {/* Right Section - Actions */}
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={state.isLayersPanelOpen ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={toggleLayersPanel}
                  className="h-10 w-10 p-0"
                >
                  <Layers className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Layers</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={state.isPropertiesPanelOpen ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={togglePropertiesPanel}
                  className="h-10 w-10 p-0"
                >
                  <Settings2 className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Properties</TooltipContent>
            </Tooltip>

            <div className="w-px h-6 bg-gray-200 mx-1.5" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveDocument()}
                  className="h-10 w-10 p-0"
                >
                  <Save className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Save</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsExportModalOpen(true)}
                  className="h-10 w-10 p-0"
                >
                  <Download className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  className="h-10 w-10 p-0 bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Share2 className="w-5 h-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Share</TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                  <MoreHorizontal className="w-5 h-5" />
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

        {/* Main Content Area - Use CSS Grid for predictable layout */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Element Toolbar (Left) - Fixed width, high z-index */}
          <ElementToolbar className="flex-shrink-0 z-30" />

          {/* Layers Panel - Collapsible left panel */}
          <AnimatePresence mode="wait">
            {state.isLayersPanelOpen && (
              <LayersPanel className="flex-shrink-0 z-20" />
            )}
          </AnimatePresence>

          {/* Canvas Area - Takes remaining space, lowest z-index */}
          <div className="flex-1 min-w-0 relative z-10">
            <CanvasEngine className="absolute inset-0" showGrid={showGrid} />
          </div>

          {/* Properties Panel - Collapsible right panel */}
          <AnimatePresence mode="wait">
            {state.isPropertiesPanelOpen && (
              <PropertiesPanel className="flex-shrink-0 z-20" />
            )}
          </AnimatePresence>

          {/* AI Sidebar - Collapsible right panel, overlays properties if both open */}
          <AnimatePresence mode="wait">
            {state.isAIPanelOpen && (
              <AISidebar className="flex-shrink-0 z-20" />
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

