/**
 * Content Studio Context
 * Global state management for the canvas-based content creation system
 */

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect, ReactNode } from 'react';
import * as fabric from 'fabric';
import {
  ContentDocument,
  ContentPage,
  ContentStudioState,
  ContentStudioAction,
  CanvasState,
  DEFAULT_DOCUMENT_SETTINGS,
  PAGE_SIZES,
} from './types';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../contexts/AuthContext';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import {
  saveDocument as saveToSupabase,
  loadDocument as loadFromSupabase,
  AutosaveManager,
  validateDocument,
  createDebouncedUndoHandler,
} from '../../lib/services/contentStudioService';
import { showSuccess, showError, showLoading, updateToast } from '../../lib/utils/toast';

// Custom properties to preserve in undo/redo/persistence snapshots
const CUSTOM_PROPS = ['id', 'name', 'elementType', 'locked', 'visible'];

// Helper to serialize canvas with custom properties (fabric v6 compatible)
function serializeCanvas(canvas: fabric.Canvas): string {
  const json = canvas.toJSON();
  // Manually add custom properties to each object
  const objects = canvas.getObjects();
  json.objects = json.objects?.map((objJson: any, index: number) => {
    const obj = objects[index] as any;
    return {
      ...objJson,
      id: obj.id,
      name: obj.name,
      elementType: obj.elementType,
      locked: obj.locked,
      visible: obj.visible,
    };
  });
  return JSON.stringify(json);
}

// Autosave configuration
const AUTOSAVE_INTERVAL_MS = 30000; // 30 seconds
const UNDO_DEBOUNCE_MS = 300; // Debounce rapid changes

// ============================================================================
// Initial State
// ============================================================================

const initialState: ContentStudioState = {
  document: null,
  currentPageIndex: 0,
  selectedObjectIds: [],
  activeTool: 'select',
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  isAIPanelOpen: false,
  isLayersPanelOpen: true,
  isPropertiesPanelOpen: true,
  undoStack: [],
  redoStack: [],
  isSaving: false,
  lastSaved: undefined,
  isDirty: false,
  saveError: undefined,
};

// ============================================================================
// Reducer
// ============================================================================

function contentStudioReducer(
  state: ContentStudioState,
  action: ContentStudioAction
): ContentStudioState {
  switch (action.type) {
    case 'SET_DOCUMENT':
      return {
        ...state,
        document: action.payload,
        currentPageIndex: 0,
        selectedObjectIds: [],
        undoStack: [],
        redoStack: [],
      };

    case 'UPDATE_DOCUMENT':
      return {
        ...state,
        document: action.payload,
      };

    case 'SET_PAGE':
      return {
        ...state,
        currentPageIndex: action.payload,
        selectedObjectIds: [],
      };

    case 'SELECT_OBJECTS':
      return {
        ...state,
        selectedObjectIds: action.payload,
      };

    case 'SET_TOOL':
      return {
        ...state,
        activeTool: action.payload,
      };

    case 'SET_ZOOM':
      return {
        ...state,
        zoom: Math.max(0.1, Math.min(5, action.payload)),
      };

    case 'SET_PAN':
      return {
        ...state,
        panOffset: action.payload,
      };

    case 'TOGGLE_AI_PANEL':
      return {
        ...state,
        isAIPanelOpen: !state.isAIPanelOpen,
      };

    case 'TOGGLE_LAYERS_PANEL':
      return {
        ...state,
        isLayersPanelOpen: !state.isLayersPanelOpen,
      };

    case 'TOGGLE_PROPERTIES_PANEL':
      return {
        ...state,
        isPropertiesPanelOpen: !state.isPropertiesPanelOpen,
      };

    case 'PUSH_UNDO':
      return {
        ...state,
        undoStack: [...state.undoStack.slice(-49), action.payload], // Keep max 50 snapshots
        redoStack: [], // Clear redo on new action
      };

    case 'UNDO':
      if (state.undoStack.length === 0) return state;
      const prevSnapshot = state.undoStack[state.undoStack.length - 1];
      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack.slice(-49), action.payload], // Cap at 50
      };

    case 'REDO':
      if (state.redoStack.length === 0) return state;
      const nextSnapshot = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack.slice(-49), action.payload], // Cap at 50
      };

    case 'SAVE_START':
      return {
        ...state,
        isSaving: true,
        saveError: undefined,
      };

    case 'SAVE_COMPLETE':
      return {
        ...state,
        isSaving: false,
        lastSaved: action.payload,
        isDirty: false,
        saveError: undefined,
      };

    case 'SAVE_ERROR':
      return {
        ...state,
        isSaving: false,
        saveError: action.payload,
      };

    case 'MARK_DIRTY':
      return {
        ...state,
        isDirty: true,
      };

    case 'MARK_CLEAN':
      return {
        ...state,
        isDirty: false,
      };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface ContentStudioContextValue {
  state: ContentStudioState;
  dispatch: React.Dispatch<ContentStudioAction>;
  canvasRef: React.RefObject<fabric.Canvas | null>;
  
  // Document operations
  createNewDocument: (title?: string, pageSize?: string) => void;
  loadDocument: (document: ContentDocument) => void;
  saveDocument: () => Promise<void>;
  
  // Page operations
  addPage: () => void;
  deletePage: (index: number) => void;
  duplicatePage: (index: number) => void;
  reorderPages: (fromIndex: number, toIndex: number) => void;
  goToPage: (index: number) => void;
  
  // Canvas operations
  setZoom: (zoom: number) => void;
  setZoomToPoint: (zoom: number, point: { x: number; y: number }) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToScreen: () => void;
  centerCanvas: () => void;
  persistCurrentPage: () => void;
  
  // Document updates
  updateDocumentTitle: (title: string) => void;
  updateDocumentSettings: (settings: Partial<import('./types').DocumentSettings>) => void;
  
  // Object operations
  addObject: (object: fabric.Object) => void;
  deleteSelectedObjects: () => void;
  duplicateSelectedObjects: () => void;
  groupSelectedObjects: () => void;
  ungroupSelectedObjects: () => void;
  bringToFront: () => void;
  sendToBack: () => void;
  bringForward: () => void;
  sendBackward: () => void;
  
  // Tool operations
  setActiveTool: (tool: string) => void;
  
  // History operations
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  
  // Panel operations
  toggleAIPanel: () => void;
  toggleLayersPanel: () => void;
  togglePropertiesPanel: () => void;
  
  // Current page helper
  getCurrentPage: () => ContentPage | null;
}

const ContentStudioContext = createContext<ContentStudioContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface ContentStudioProviderProps {
  children: ReactNode;
}

export function ContentStudioProvider({ children }: ContentStudioProviderProps) {
  const [state, dispatch] = useReducer(contentStudioReducer, initialState);
  const canvasRef = useRef<fabric.Canvas | null>(null);
  const autosaveManagerRef = useRef<AutosaveManager | null>(null);
  const debouncedUndoRef = useRef<ReturnType<typeof createDebouncedUndoHandler> | null>(null);
  
  // Get auth context for user ID
  let userId: string | undefined;
  try {
    const authContext = useAuth();
    userId = authContext.user?.id;
  } catch {
    // AuthContext not available - offline mode
  }
  
  // Get workspace ID from WorkspaceContext
  let workspaceId: string | undefined;
  try {
    const workspaceContext = useWorkspace();
    workspaceId = workspaceContext.workspace?.id;
  } catch {
    // WorkspaceContext not available - offline mode
  }
  
  // Get workspace ID - prefer context, fallback to document or 'offline'
  const getWorkspaceId = useCallback((): string => {
    return workspaceId || state.document?.workspaceId || 'offline';
  }, [workspaceId, state.document?.workspaceId]);

  // -------------------------------------------------------------------------
  // Document Operations
  // -------------------------------------------------------------------------

  const createNewDocument = useCallback((title = 'Untitled Document', pageSize = 'presentation') => {
    const size = PAGE_SIZES[pageSize] || PAGE_SIZES['presentation'];
    const newPage: ContentPage = {
      id: uuidv4(),
      name: 'Page 1',
      order: 0,
      canvas: {
        width: size.width,
        height: size.height,
        backgroundColor: '#ffffff',
        objects: [],
      },
    };

    const newDocument: ContentDocument = {
      id: uuidv4(),
      title,
      workspaceId: workspaceId, // Set workspace ID from context
      pages: [newPage],
      metadata: {
        tags: [],
        category: 'custom',
        version: 1,
      },
      settings: {
        ...DEFAULT_DOCUMENT_SETTINGS,
        pageSize: size,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId || '', // Set creator from auth context
    };

    dispatch({ type: 'SET_DOCUMENT', payload: newDocument });
  }, [workspaceId, userId]);

  const loadDocument = useCallback((document: ContentDocument) => {
    dispatch({ type: 'SET_DOCUMENT', payload: document });
  }, []);

  const saveDocument = useCallback(async () => {
    if (!state.document || !canvasRef.current) return;
    
    dispatch({ type: 'SAVE_START' });
    const toastId = showLoading('Saving document...');
    
    try {
      // Save canvas state to current page
      const json = JSON.parse(serializeCanvas(canvasRef.current));
      const updatedPages = [...state.document.pages];
      updatedPages[state.currentPageIndex] = {
        ...updatedPages[state.currentPageIndex],
        canvas: {
          ...updatedPages[state.currentPageIndex].canvas,
          json: JSON.stringify(json),
        },
      };
      
      // Build updated document with workspace ID
      const currentWorkspaceId = getWorkspaceId();
      const updatedDocument: ContentDocument = {
        ...state.document,
        workspaceId: currentWorkspaceId !== 'offline' ? currentWorkspaceId : state.document.workspaceId,
        createdBy: state.document.createdBy || userId || '',
        pages: updatedPages,
        updatedAt: new Date().toISOString(),
      };
      
      // Validate document size
      const validation = validateDocument(updatedDocument);
      if (!validation.valid) {
        throw new Error(validation.error);
      }
      
      // Try to save to Supabase if user is authenticated AND we have a valid workspace
      const hasValidWorkspace = currentWorkspaceId && currentWorkspaceId !== 'offline';
      if (userId && hasValidWorkspace) {
        const result = await saveToSupabase(
          updatedDocument, 
          userId, 
          currentWorkspaceId
        );
        
        if (!result.success) {
          if (result.conflict) {
            updateToast(toastId, 'Document was modified by another user. Please refresh.', 'error');
            dispatch({ type: 'SAVE_ERROR', payload: result.error || 'Conflict detected' });
            return;
          }
          throw new Error(result.error);
        }
        
        // Update local state with server-side version
        if (result.document) {
          dispatch({ type: 'UPDATE_DOCUMENT', payload: result.document });
        }
      } else {
        // Offline mode or no valid workspace - just update local state
        dispatch({ type: 'UPDATE_DOCUMENT', payload: updatedDocument });
        
        // Warn user if authenticated but no workspace
        if (userId && !hasValidWorkspace) {
          console.warn('[ContentStudio] Document saved locally only - no workspace available');
        }
      }
      
      dispatch({ type: 'SAVE_COMPLETE', payload: new Date().toISOString() });
      updateToast(toastId, hasValidWorkspace ? 'Document saved' : 'Document saved locally', 'success');
    } catch (error: any) {
      console.error('Failed to save document:', error);
      dispatch({ type: 'SAVE_ERROR', payload: error.message });
      updateToast(toastId, `Save failed: ${error.message}`, 'error');
    }
  }, [state.document, state.currentPageIndex, userId, getWorkspaceId]);

  // -------------------------------------------------------------------------
  // Page Operations
  // -------------------------------------------------------------------------

  const addPage = useCallback(() => {
    if (!state.document) return;

    const size = state.document.settings.pageSize;
    const newPage: ContentPage = {
      id: uuidv4(),
      name: `Page ${state.document.pages.length + 1}`,
      order: state.document.pages.length,
      canvas: {
        width: size.width,
        height: size.height,
        backgroundColor: '#ffffff',
        objects: [],
      },
    };

    const updatedDocument: ContentDocument = {
      ...state.document,
      pages: [...state.document.pages, newPage],
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: 'SET_DOCUMENT', payload: updatedDocument });
    dispatch({ type: 'SET_PAGE', payload: updatedDocument.pages.length - 1 });
  }, [state.document]);

  const deletePage = useCallback((index: number) => {
    if (!state.document || state.document.pages.length <= 1) return;

    const updatedPages = state.document.pages.filter((_, i) => i !== index);
    const updatedDocument: ContentDocument = {
      ...state.document,
      pages: updatedPages.map((p, i) => ({ ...p, order: i, name: `Page ${i + 1}` })),
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: 'SET_DOCUMENT', payload: updatedDocument });
    if (state.currentPageIndex >= updatedPages.length) {
      dispatch({ type: 'SET_PAGE', payload: updatedPages.length - 1 });
    }
    dispatch({ type: 'MARK_DIRTY' });
  }, [state.document, state.currentPageIndex]);

  const duplicatePage = useCallback((index: number) => {
    if (!state.document) return;

    const pageToDuplicate = state.document.pages[index];
    // Deep clone the canvas state to prevent mutation of source
    const newPage: ContentPage = {
      id: uuidv4(),
      name: `${pageToDuplicate.name} (Copy)`,
      order: state.document.pages.length,
      canvas: JSON.parse(JSON.stringify(pageToDuplicate.canvas)), // Deep clone
      thumbnail: undefined, // Don't copy thumbnail, generate new one
    };

    const updatedDocument: ContentDocument = {
      ...state.document,
      pages: [...state.document.pages, newPage],
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: 'SET_DOCUMENT', payload: updatedDocument });
    dispatch({ type: 'SET_PAGE', payload: updatedDocument.pages.length - 1 });
    dispatch({ type: 'MARK_DIRTY' });
  }, [state.document]);

  const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
    if (!state.document) return;

    const pages = [...state.document.pages];
    const [removed] = pages.splice(fromIndex, 1);
    pages.splice(toIndex, 0, removed);

    const updatedDocument: ContentDocument = {
      ...state.document,
      pages: pages.map((p, i) => ({ ...p, order: i })),
      updatedAt: new Date().toISOString(),
    };

    dispatch({ type: 'SET_DOCUMENT', payload: updatedDocument });
    dispatch({ type: 'SET_PAGE', payload: toIndex });
    dispatch({ type: 'MARK_DIRTY' });
  }, [state.document]);

  // Persist current canvas state to document
  const persistCurrentPage = useCallback(() => {
    if (!canvasRef.current || !state.document) return;
    
    const json = serializeCanvas(canvasRef.current);
    const updatedPages = [...state.document.pages];
    updatedPages[state.currentPageIndex] = {
      ...updatedPages[state.currentPageIndex],
      canvas: {
        ...updatedPages[state.currentPageIndex].canvas,
        json,
      },
    };
    
    const updatedDocument: ContentDocument = {
      ...state.document,
      pages: updatedPages,
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'UPDATE_DOCUMENT', payload: updatedDocument });
  }, [state.document, state.currentPageIndex]);

  const goToPage = useCallback((index: number) => {
    if (!state.document || index < 0 || index >= state.document.pages.length) return;
    
    // Persist current page before switching
    persistCurrentPage();
    
    dispatch({ type: 'SET_PAGE', payload: index });
  }, [state.document, persistCurrentPage]);

  // -------------------------------------------------------------------------
  // Canvas Operations
  // -------------------------------------------------------------------------

  const setZoom = useCallback((zoom: number) => {
    const clampedZoom = Math.max(0.1, Math.min(5, zoom));
    dispatch({ type: 'SET_ZOOM', payload: clampedZoom });
    if (canvasRef.current) {
      canvasRef.current.setZoom(clampedZoom);
      canvasRef.current.renderAll();
    }
  }, []);

  // Zoom centered on a specific point (for mouse wheel zoom)
  const setZoomToPoint = useCallback((zoom: number, point: { x: number; y: number }) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const clampedZoom = Math.max(0.1, Math.min(5, zoom));
    dispatch({ type: 'SET_ZOOM', payload: clampedZoom });
    
    // Use Fabric's zoomToPoint for proper centering
    canvas.zoomToPoint(new fabric.Point(point.x, point.y), clampedZoom);
    
    // Sync panOffset with viewport transform
    const vpt = canvas.viewportTransform;
    if (vpt) {
      dispatch({ type: 'SET_PAN', payload: { x: vpt[4], y: vpt[5] } });
    }
    
    canvas.renderAll();
  }, []);

  const zoomIn = useCallback(() => {
    setZoom(state.zoom * 1.1);
  }, [state.zoom, setZoom]);

  const zoomOut = useCallback(() => {
    setZoom(state.zoom / 1.1);
  }, [state.zoom, setZoom]);

  const fitToScreen = useCallback(() => {
    if (!canvasRef.current || !state.document) return;
    
    const canvas = canvasRef.current;
    const container = canvas.getElement().parentElement;
    if (!container) return;

    const page = state.document.pages[state.currentPageIndex];
    const containerWidth = container.clientWidth - 80;
    const containerHeight = container.clientHeight - 80;
    
    const scaleX = containerWidth / page.canvas.width;
    const scaleY = containerHeight / page.canvas.height;
    const scale = Math.min(scaleX, scaleY, 1);
    
    setZoom(scale);
  }, [state.document, state.currentPageIndex, setZoom]);

  const centerCanvas = useCallback(() => {
    dispatch({ type: 'SET_PAN', payload: { x: 0, y: 0 } });
    if (canvasRef.current) {
      canvasRef.current.viewportTransform = [1, 0, 0, 1, 0, 0];
      canvasRef.current.renderAll();
    }
  }, []);

  // -------------------------------------------------------------------------
  // Object Operations
  // -------------------------------------------------------------------------

  const addObject = useCallback((object: fabric.Object) => {
    if (!canvasRef.current) return;
    
    // Capture undo state BEFORE adding
    const snapshot = serializeCanvas(canvasRef.current);
    dispatch({ type: 'PUSH_UNDO', payload: snapshot });
    
    // Assign unique ID
    (object as any).id = uuidv4();
    
    canvasRef.current.add(object);
    canvasRef.current.setActiveObject(object);
    canvasRef.current.renderAll();
    
    dispatch({ type: 'SELECT_OBJECTS', payload: [(object as any).id] });
    
    // Persist after add
    persistCurrentPage();
  }, [persistCurrentPage]);

  const deleteSelectedObjects = useCallback(() => {
    if (!canvasRef.current) return;
    
    const activeObjects = canvasRef.current.getActiveObjects();
    if (activeObjects.length === 0) return;
    
    // Capture undo state BEFORE deleting
    const snapshot = serializeCanvas(canvasRef.current);
    dispatch({ type: 'PUSH_UNDO', payload: snapshot });
    
    activeObjects.forEach((obj) => canvasRef.current?.remove(obj));
    canvasRef.current.discardActiveObject();
    canvasRef.current.renderAll();
    
    dispatch({ type: 'SELECT_OBJECTS', payload: [] });
    
    // Persist after delete
    persistCurrentPage();
  }, [persistCurrentPage]);

  const duplicateSelectedObjects = useCallback(() => {
    if (!canvasRef.current) return;
    
    const activeObjects = canvasRef.current.getActiveObjects();
    if (activeObjects.length === 0) return;
    
    // Capture undo state BEFORE duplicating
    const snapshot = serializeCanvas(canvasRef.current);
    dispatch({ type: 'PUSH_UNDO', payload: snapshot });

    activeObjects.forEach(async (obj) => {
      const cloned = await obj.clone();
      (cloned as any).id = uuidv4();
      // Copy custom properties
      (cloned as any).name = (obj as any).name;
      (cloned as any).elementType = (obj as any).elementType;
      cloned.set({
        left: (obj.left || 0) + 20,
        top: (obj.top || 0) + 20,
      });
      canvasRef.current?.add(cloned);
      canvasRef.current?.renderAll();
    });
    
    canvasRef.current.renderAll();
    
    // Persist after duplicate
    persistCurrentPage();
  }, [persistCurrentPage]);

  const groupSelectedObjects = useCallback(() => {
    if (!canvasRef.current) return;
    
    const activeObject = canvasRef.current.getActiveObject();
    if (!activeObject || activeObject.type !== 'activeSelection') return;

    // Capture state before change
    const snapshot = serializeCanvas(canvasRef.current);
    dispatch({ type: 'PUSH_UNDO', payload: snapshot });

    const selection = activeObject as fabric.ActiveSelection;
    const objects = selection.getObjects();
    canvasRef.current.discardActiveObject();
    const group = new fabric.Group(objects);
    objects.forEach(obj => canvasRef.current?.remove(obj));
    canvasRef.current.add(group);
    canvasRef.current.setActiveObject(group);
    canvasRef.current.renderAll();
    
    persistCurrentPage(); // Persist changes
  }, [persistCurrentPage]);

  const ungroupSelectedObjects = useCallback(() => {
    if (!canvasRef.current) return;
    
    const activeObject = canvasRef.current.getActiveObject();
    if (!activeObject || activeObject.type !== 'group') return;

    // Capture state before change
    const snapshot = serializeCanvas(canvasRef.current);
    dispatch({ type: 'PUSH_UNDO', payload: snapshot });

    const group = activeObject as fabric.Group;
    const objects = group.getObjects();
    canvasRef.current.remove(group);
    objects.forEach(obj => {
      obj.set({
        left: (obj.left || 0) + (group.left || 0),
        top: (obj.top || 0) + (group.top || 0),
      });
      canvasRef.current?.add(obj);
    });
    const selection = new fabric.ActiveSelection(objects, { canvas: canvasRef.current });
    canvasRef.current.setActiveObject(selection);
    canvasRef.current.renderAll();
    
    persistCurrentPage(); // Persist changes
  }, [persistCurrentPage]);

  const bringToFront = useCallback(() => {
    if (!canvasRef.current) return;
    
    const activeObject = canvasRef.current.getActiveObject();
    if (activeObject) {
      // Capture state before change
      const snapshot = serializeCanvas(canvasRef.current);
      dispatch({ type: 'PUSH_UNDO', payload: snapshot });
      
      canvasRef.current.bringObjectToFront(activeObject);
      canvasRef.current.renderAll();
      persistCurrentPage(); // Persist changes
    }
  }, [persistCurrentPage]);

  const sendToBack = useCallback(() => {
    if (!canvasRef.current) return;
    
    const activeObject = canvasRef.current.getActiveObject();
    if (activeObject) {
      // Capture state before change
      const snapshot = serializeCanvas(canvasRef.current);
      dispatch({ type: 'PUSH_UNDO', payload: snapshot });
      
      canvasRef.current.sendObjectToBack(activeObject);
      canvasRef.current.renderAll();
      persistCurrentPage(); // Persist changes
    }
  }, [persistCurrentPage]);

  const bringForward = useCallback(() => {
    if (!canvasRef.current) return;
    
    const activeObject = canvasRef.current.getActiveObject();
    if (activeObject) {
      const objects = canvasRef.current.getObjects();
      const index = objects.indexOf(activeObject);
      if (index < objects.length - 1) {
        // Capture state before change
        const snapshot = serializeCanvas(canvasRef.current);
        dispatch({ type: 'PUSH_UNDO', payload: snapshot });
        
        canvasRef.current.moveObjectTo(activeObject, index + 1);
        canvasRef.current.renderAll();
        persistCurrentPage(); // Persist changes
      }
    }
  }, [persistCurrentPage]);

  const sendBackward = useCallback(() => {
    if (!canvasRef.current) return;
    
    const activeObject = canvasRef.current.getActiveObject();
    if (activeObject) {
      const objects = canvasRef.current.getObjects();
      const index = objects.indexOf(activeObject);
      if (index > 0) {
        // Capture state before change
        const snapshot = serializeCanvas(canvasRef.current);
        dispatch({ type: 'PUSH_UNDO', payload: snapshot });
        
        canvasRef.current.moveObjectTo(activeObject, index - 1);
        canvasRef.current.renderAll();
        persistCurrentPage(); // Persist changes
      }
    }
  }, [persistCurrentPage]);

  // -------------------------------------------------------------------------
  // Document Update Operations
  // -------------------------------------------------------------------------

  const updateDocumentTitle = useCallback((title: string) => {
    if (!state.document) return;
    
    const updatedDocument: ContentDocument = {
      ...state.document,
      title,
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'UPDATE_DOCUMENT', payload: updatedDocument });
    dispatch({ type: 'MARK_DIRTY' });
  }, [state.document]);

  const updateDocumentSettings = useCallback((settings: Partial<import('./types').DocumentSettings>) => {
    if (!state.document) return;
    
    const updatedDocument: ContentDocument = {
      ...state.document,
      settings: {
        ...state.document.settings,
        ...settings,
        grid: {
          ...state.document.settings.grid,
          ...(settings.grid || {}),
        },
      },
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: 'UPDATE_DOCUMENT', payload: updatedDocument });
    dispatch({ type: 'MARK_DIRTY' });
  }, [state.document]);

  // -------------------------------------------------------------------------
  // Tool Operations
  // -------------------------------------------------------------------------

  const setActiveTool = useCallback((tool: string) => {
    dispatch({ type: 'SET_TOOL', payload: tool });
    
    if (canvasRef.current) {
      // Configure canvas based on tool
      switch (tool) {
        case 'select':
          canvasRef.current.isDrawingMode = false;
          canvasRef.current.selection = true;
          break;
        case 'pan':
          canvasRef.current.isDrawingMode = false;
          canvasRef.current.selection = false;
          break;
        case 'draw':
          canvasRef.current.isDrawingMode = true;
          break;
        default:
          canvasRef.current.isDrawingMode = false;
          canvasRef.current.selection = true;
      }
    }
  }, []);

  // -------------------------------------------------------------------------
  // History Operations
  // -------------------------------------------------------------------------

  // Save canvas snapshot for undo (debounced to prevent excessive snapshots)
  const pushUndo = useCallback(() => {
    if (!canvasRef.current) return;
    
    // Use debounced handler if available
    if (debouncedUndoRef.current) {
      debouncedUndoRef.current.capture();
    } else {
      const snapshot = serializeCanvas(canvasRef.current);
      dispatch({ type: 'PUSH_UNDO', payload: snapshot });
    }
    
    // Mark document as dirty for autosave
    dispatch({ type: 'MARK_DIRTY' });
    if (autosaveManagerRef.current) {
      autosaveManagerRef.current.markDirty();
    }
  }, []);
  
  // Internal push for immediate snapshot (used by debounced handler)
  const pushUndoImmediate = useCallback(() => {
    if (!canvasRef.current) return;
    const snapshot = serializeCanvas(canvasRef.current);
    dispatch({ type: 'PUSH_UNDO', payload: snapshot });
  }, []);

  const undo = useCallback(() => {
    if (state.undoStack.length === 0 || !canvasRef.current) return;
    
    // Get current state to push to redo
    const currentSnapshot = serializeCanvas(canvasRef.current);
    
    // Get the previous state
    const previousSnapshot = state.undoStack[state.undoStack.length - 1];
    
    // Restore canvas from snapshot (fabric v6 Promise-based)
    canvasRef.current.loadFromJSON(JSON.parse(previousSnapshot)).then(() => {
      canvasRef.current?.renderAll();
    });
    
    dispatch({ type: 'UNDO', payload: currentSnapshot });
  }, [state.undoStack]);

  const redo = useCallback(() => {
    if (state.redoStack.length === 0 || !canvasRef.current) return;
    
    // Get current state to push to undo
    const currentSnapshot = serializeCanvas(canvasRef.current);
    
    // Get the next state
    const nextSnapshot = state.redoStack[state.redoStack.length - 1];
    
    // Restore canvas from snapshot (fabric v6 Promise-based)
    canvasRef.current.loadFromJSON(JSON.parse(nextSnapshot)).then(() => {
      canvasRef.current?.renderAll();
    });
    
    dispatch({ type: 'REDO', payload: currentSnapshot });
  }, [state.redoStack]);

  // -------------------------------------------------------------------------
  // Panel Operations
  // -------------------------------------------------------------------------

  const toggleAIPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_AI_PANEL' });
  }, []);

  const toggleLayersPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_LAYERS_PANEL' });
  }, []);

  const togglePropertiesPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_PROPERTIES_PANEL' });
  }, []);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const getCurrentPage = useCallback((): ContentPage | null => {
    if (!state.document) return null;
    return state.document.pages[state.currentPageIndex] || null;
  }, [state.document, state.currentPageIndex]);

  // -------------------------------------------------------------------------
  // Autosave Setup
  // -------------------------------------------------------------------------
  
  // Initialize debounced undo handler
  useEffect(() => {
    debouncedUndoRef.current = createDebouncedUndoHandler(pushUndoImmediate, UNDO_DEBOUNCE_MS);
    
    return () => {
      if (debouncedUndoRef.current) {
        debouncedUndoRef.current.flush();
        debouncedUndoRef.current = null;
      }
    };
  }, [pushUndoImmediate]);

  // Initialize autosave manager
  useEffect(() => {
    if (!state.document || !userId) return;
    
    autosaveManagerRef.current = new AutosaveManager(
      async () => {
        // Save and return result
        dispatch({ type: 'SAVE_START' });
        try {
          if (!state.document || !canvasRef.current) {
            return { success: false, error: 'No document or canvas' };
          }
          
          const json = JSON.parse(serializeCanvas(canvasRef.current));
          const updatedPages = [...state.document.pages];
          updatedPages[state.currentPageIndex] = {
            ...updatedPages[state.currentPageIndex],
            canvas: {
              ...updatedPages[state.currentPageIndex].canvas,
              json: JSON.stringify(json),
            },
          };
          
          const updatedDocument: ContentDocument = {
            ...state.document,
            pages: updatedPages,
            updatedAt: new Date().toISOString(),
          };
          
          const result = await saveToSupabase(updatedDocument, userId!, getWorkspaceId());
          
          if (result.success && result.document) {
            dispatch({ type: 'UPDATE_DOCUMENT', payload: result.document });
            dispatch({ type: 'SAVE_COMPLETE', payload: new Date().toISOString() });
          } else {
            dispatch({ type: 'SAVE_ERROR', payload: result.error || 'Unknown error' });
          }
          
          return result;
        } catch (error: any) {
          dispatch({ type: 'SAVE_ERROR', payload: error.message });
          return { success: false, error: error.message };
        }
      },
      (error) => {
        showError(`Autosave failed: ${error}`);
      },
      () => {
        // Autosave success - silent
        console.log('[Autosave] Document saved');
      },
      { intervalMs: AUTOSAVE_INTERVAL_MS }
    );
    
    autosaveManagerRef.current.start();
    
    // Warn user before leaving with unsaved changes
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        
        // Try to save before leaving
        autosaveManagerRef.current?.forceSave();
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      autosaveManagerRef.current?.stop();
      autosaveManagerRef.current = null;
    };
  }, [state.document?.id, userId, getWorkspaceId]);

  // Separate beforeunload handler for anonymous/offline users (autosave won't be active)
  useEffect(() => {
    // Skip if userId exists (autosave handles beforeunload)
    if (userId) return;
    if (!state.document) return;
    
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes that will be lost. Are you sure you want to leave?';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [state.document, state.isDirty, userId]);

  // -------------------------------------------------------------------------
  // Context Value
  // -------------------------------------------------------------------------

  const value: ContentStudioContextValue = {
    state,
    dispatch,
    canvasRef,
    createNewDocument,
    loadDocument,
    saveDocument,
    addPage,
    deletePage,
    duplicatePage,
    reorderPages,
    goToPage,
    setZoom,
    setZoomToPoint,
    zoomIn,
    zoomOut,
    fitToScreen,
    centerCanvas,
    persistCurrentPage,
    updateDocumentTitle,
    updateDocumentSettings,
    addObject,
    deleteSelectedObjects,
    duplicateSelectedObjects,
    groupSelectedObjects,
    ungroupSelectedObjects,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    setActiveTool,
    pushUndo,
    undo,
    redo,
    toggleAIPanel,
    toggleLayersPanel,
    togglePropertiesPanel,
    getCurrentPage,
  };

  return (
    <ContentStudioContext.Provider value={value}>
      {children}
    </ContentStudioContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useContentStudio() {
  const context = useContext(ContentStudioContext);
  if (!context) {
    throw new Error('useContentStudio must be used within a ContentStudioProvider');
  }
  return context;
}

export default ContentStudioContext;

