/**
 * Konva Context Provider
 * State management for the React-Konva canvas system
 */

import React, { createContext, useContext, useReducer, useRef, useCallback, ReactNode, useEffect } from 'react';
import Konva from 'konva';
import { 
  KonvaElement, 
  KonvaCanvasState, 
  KonvaPage,
  CanvasTool,
  HistoryEntry,
  createDefaultElement,
} from './types';
import { useAuth } from '../../../contexts/AuthContext';
import { useWorkspace } from '../../../contexts/WorkspaceContext';

// ============================================================================
// Document Types (aligned with existing ContentDocument)
// ============================================================================

export interface KonvaDocument {
  id: string;
  title: string;
  description?: string;
  workspaceId?: string;
  pages: KonvaPage[];
  metadata: {
    tags: string[];
    category: string;
    version: number;
    lastEditedBy?: string;
  };
  settings: {
    pageSize: { name: string; width: number; height: number };
    orientation: 'portrait' | 'landscape';
    margins: { top: number; right: number; bottom: number; left: number };
    grid: { enabled: boolean; size: number; color: string; opacity: number };
    snapToGrid: boolean;
    showRulers: boolean;
  };
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ============================================================================
// State
// ============================================================================

interface KonvaState {
  document: KonvaDocument | null;
  currentPageIndex: number;
  selectedIds: string[];
  zoom: number;
  panOffset: { x: number; y: number };
  activeTool: CanvasTool;
  isDirty: boolean;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  isLayersPanelOpen: boolean;
  isPropertiesPanelOpen: boolean;
  isAIPanelOpen: boolean;
}

const initialState: KonvaState = {
  document: null,
  currentPageIndex: 0,
  selectedIds: [],
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  activeTool: 'select',
  isDirty: false,
  undoStack: [],
  redoStack: [],
  isLayersPanelOpen: true,
  isPropertiesPanelOpen: true,
  isAIPanelOpen: false,
};

// ============================================================================
// Actions
// ============================================================================

type KonvaAction =
  | { type: 'SET_DOCUMENT'; payload: KonvaDocument }
  | { type: 'UPDATE_DOCUMENT'; payload: Partial<KonvaDocument> }
  | { type: 'SET_PAGE'; payload: number }
  | { type: 'ADD_PAGE'; payload: KonvaPage }
  | { type: 'DELETE_PAGE'; payload: number }
  | { type: 'UPDATE_PAGE'; payload: { index: number; page: Partial<KonvaPage> } }
  | { type: 'SET_ELEMENTS'; payload: KonvaElement[] }
  | { type: 'ADD_ELEMENT'; payload: KonvaElement }
  | { type: 'UPDATE_ELEMENT'; payload: { id: string; attrs: Partial<KonvaElement> } }
  | { type: 'DELETE_ELEMENTS'; payload: string[] }
  | { type: 'SELECT'; payload: string[] }
  | { type: 'SET_ZOOM'; payload: number }
  | { type: 'SET_PAN'; payload: { x: number; y: number } }
  | { type: 'SET_TOOL'; payload: CanvasTool }
  | { type: 'MARK_DIRTY' }
  | { type: 'MARK_CLEAN' }
  | { type: 'PUSH_UNDO'; payload: HistoryEntry }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'TOGGLE_LAYERS_PANEL' }
  | { type: 'TOGGLE_PROPERTIES_PANEL' }
  | { type: 'TOGGLE_AI_PANEL' };

function reducer(state: KonvaState, action: KonvaAction): KonvaState {
  switch (action.type) {
    case 'SET_DOCUMENT':
      return {
        ...state,
        document: action.payload,
        currentPageIndex: 0,
        selectedIds: [],
        isDirty: false,
        undoStack: [],
        redoStack: [],
      };

    case 'UPDATE_DOCUMENT':
      if (!state.document) return state;
      return {
        ...state,
        document: {
          ...state.document,
          ...action.payload,
          updatedAt: new Date().toISOString(),
        },
      };

    case 'SET_PAGE':
      return {
        ...state,
        currentPageIndex: action.payload,
        selectedIds: [],
      };

    case 'ADD_PAGE':
      if (!state.document) return state;
      return {
        ...state,
        document: {
          ...state.document,
          pages: [...state.document.pages, action.payload],
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };

    case 'DELETE_PAGE':
      if (!state.document || state.document.pages.length <= 1) return state;
      const newPages = state.document.pages.filter((_, i) => i !== action.payload);
      return {
        ...state,
        document: {
          ...state.document,
          pages: newPages,
          updatedAt: new Date().toISOString(),
        },
        currentPageIndex: Math.min(state.currentPageIndex, newPages.length - 1),
        isDirty: true,
      };

    case 'UPDATE_PAGE':
      if (!state.document) return state;
      return {
        ...state,
        document: {
          ...state.document,
          pages: state.document.pages.map((page, i) =>
            i === action.payload.index ? { ...page, ...action.payload.page } : page
          ),
          updatedAt: new Date().toISOString(),
        },
      };

    case 'SET_ELEMENTS':
      if (!state.document) return state;
      return {
        ...state,
        document: {
          ...state.document,
          pages: state.document.pages.map((page, i) =>
            i === state.currentPageIndex
              ? { ...page, canvas: { ...page.canvas, elements: action.payload } }
              : page
          ),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };

    case 'ADD_ELEMENT':
      if (!state.document) return state;
      return {
        ...state,
        document: {
          ...state.document,
          pages: state.document.pages.map((page, i) =>
            i === state.currentPageIndex
              ? { ...page, canvas: { ...page.canvas, elements: [...page.canvas.elements, action.payload] } }
              : page
          ),
          updatedAt: new Date().toISOString(),
        },
        selectedIds: [action.payload.id],
        isDirty: true,
      };

    case 'UPDATE_ELEMENT':
      if (!state.document) return state;
      return {
        ...state,
        document: {
          ...state.document,
          pages: state.document.pages.map((page, i) =>
            i === state.currentPageIndex
              ? {
                  ...page,
                  canvas: {
                    ...page.canvas,
                    elements: page.canvas.elements.map(el =>
                      el.id === action.payload.id ? { ...el, ...action.payload.attrs } : el
                    ),
                  },
                }
              : page
          ),
          updatedAt: new Date().toISOString(),
        },
        isDirty: true,
      };

    case 'DELETE_ELEMENTS':
      if (!state.document) return state;
      return {
        ...state,
        document: {
          ...state.document,
          pages: state.document.pages.map((page, i) =>
            i === state.currentPageIndex
              ? {
                  ...page,
                  canvas: {
                    ...page.canvas,
                    elements: page.canvas.elements.filter(el => !action.payload.includes(el.id)),
                  },
                }
              : page
          ),
          updatedAt: new Date().toISOString(),
        },
        selectedIds: [],
        isDirty: true,
      };

    case 'SELECT':
      return { ...state, selectedIds: action.payload };

    case 'SET_ZOOM':
      return { ...state, zoom: action.payload };

    case 'SET_PAN':
      return { ...state, panOffset: action.payload };

    case 'SET_TOOL':
      return { ...state, activeTool: action.payload };

    case 'MARK_DIRTY':
      return { ...state, isDirty: true };

    case 'MARK_CLEAN':
      return { ...state, isDirty: false };

    case 'PUSH_UNDO':
      return {
        ...state,
        undoStack: [...state.undoStack.slice(-49), action.payload],
        redoStack: [],
      };

    case 'UNDO':
      if (state.undoStack.length === 0 || !state.document) return state;
      const lastUndo = state.undoStack[state.undoStack.length - 1];
      const currentElements = state.document.pages[state.currentPageIndex]?.canvas.elements || [];
      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, { elements: currentElements, timestamp: Date.now() }],
        document: {
          ...state.document,
          pages: state.document.pages.map((page, i) =>
            i === state.currentPageIndex
              ? { ...page, canvas: { ...page.canvas, elements: lastUndo.elements } }
              : page
          ),
        },
      };

    case 'REDO':
      if (state.redoStack.length === 0 || !state.document) return state;
      const lastRedo = state.redoStack[state.redoStack.length - 1];
      const currentEl = state.document.pages[state.currentPageIndex]?.canvas.elements || [];
      return {
        ...state,
        redoStack: state.redoStack.slice(0, -1),
        undoStack: [...state.undoStack, { elements: currentEl, timestamp: Date.now() }],
        document: {
          ...state.document,
          pages: state.document.pages.map((page, i) =>
            i === state.currentPageIndex
              ? { ...page, canvas: { ...page.canvas, elements: lastRedo.elements } }
              : page
          ),
        },
      };

    case 'TOGGLE_LAYERS_PANEL':
      return { ...state, isLayersPanelOpen: !state.isLayersPanelOpen };

    case 'TOGGLE_PROPERTIES_PANEL':
      return { ...state, isPropertiesPanelOpen: !state.isPropertiesPanelOpen };

    case 'TOGGLE_AI_PANEL':
      return { ...state, isAIPanelOpen: !state.isAIPanelOpen };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

interface KonvaContextValue {
  state: KonvaState;
  dispatch: React.Dispatch<KonvaAction>;
  stageRef: React.RefObject<Konva.Stage>;
  
  // Selection
  selectedIds: string[];
  setSelectedIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  
  // Zoom & Pan
  zoom: number;
  setZoom: (zoom: number) => void;
  panOffset: { x: number; y: number };
  setPanOffset: (offset: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => void;
  
  // Tool
  activeTool: CanvasTool;
  setActiveTool: (tool: CanvasTool) => void;
  
  // Document operations
  createNewDocument: (title?: string) => void;
  loadDocument: (doc: KonvaDocument) => void;
  saveDocument: () => Promise<boolean>;
  
  // Element operations
  addElement: (type: string) => void;
  updateElement: (id: string, attrs: Partial<KonvaElement>) => void;
  deleteSelectedElements: () => void;
  duplicateSelectedElements: () => void;
  
  // History
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  
  // Persistence
  persistCurrentPage: () => void;
  
  // Panel toggles
  toggleLayersPanel: () => void;
  togglePropertiesPanel: () => void;
  toggleAIPanel: () => void;
  
  // Page operations
  addPage: () => void;
  deletePage: (index: number) => void;
  goToPage: (index: number) => void;
  
  // Helpers
  getCurrentPage: () => KonvaPage | null;
  getSelectedElements: () => KonvaElement[];
}

const KonvaContext = createContext<KonvaContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface KonvaProviderProps {
  children: ReactNode;
}

export function KonvaProvider({ children }: KonvaProviderProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stageRef = useRef<Konva.Stage>(null);

  // Get auth context for user ID
  let userId: string | undefined;
  try {
    const authContext = useAuth();
    userId = authContext.user?.id;
  } catch {
    // AuthContext not available - offline mode
  }

  // Get workspace ID
  let workspaceId: string | undefined;
  try {
    const workspaceContext = useWorkspace();
    workspaceId = workspaceContext.workspace?.id;
  } catch {
    // WorkspaceContext not available - offline mode
  }

  // Selection helpers
  const setSelectedIds = useCallback((idsOrFn: string[] | ((prev: string[]) => string[])) => {
    if (typeof idsOrFn === 'function') {
      dispatch({ type: 'SELECT', payload: idsOrFn(state.selectedIds) });
    } else {
      dispatch({ type: 'SELECT', payload: idsOrFn });
    }
  }, [state.selectedIds]);

  // Zoom helpers
  const setZoom = useCallback((zoom: number) => {
    dispatch({ type: 'SET_ZOOM', payload: Math.max(0.1, Math.min(5, zoom)) });
  }, []);

  const setPanOffset = useCallback((offsetOrFn: { x: number; y: number } | ((prev: { x: number; y: number }) => { x: number; y: number })) => {
    if (typeof offsetOrFn === 'function') {
      dispatch({ type: 'SET_PAN', payload: offsetOrFn(state.panOffset) });
    } else {
      dispatch({ type: 'SET_PAN', payload: offsetOrFn });
    }
  }, [state.panOffset]);

  // Tool
  const setActiveTool = useCallback((tool: CanvasTool) => {
    dispatch({ type: 'SET_TOOL', payload: tool });
  }, []);

  // Create new document
  const createNewDocument = useCallback((title = 'Untitled Document') => {
    const newDoc: KonvaDocument = {
      id: crypto.randomUUID(),
      title,
      workspaceId: workspaceId || 'offline',
      pages: [
        {
          id: crypto.randomUUID(),
          name: 'Page 1',
          order: 0,
          canvas: {
            width: 1920,
            height: 1080,
            backgroundColor: '#ffffff',
            elements: [],
          },
        },
      ],
      metadata: {
        tags: [],
        category: 'custom',
        version: 1,
      },
      settings: {
        pageSize: { name: 'HD 1080p', width: 1920, height: 1080 },
        orientation: 'landscape',
        margins: { top: 40, right: 40, bottom: 40, left: 40 },
        grid: { enabled: true, size: 20, color: '#e5e7eb', opacity: 0.5 },
        snapToGrid: true,
        showRulers: true,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: userId || '',
    };
    dispatch({ type: 'SET_DOCUMENT', payload: newDoc });
  }, [workspaceId, userId]);

  // Load document
  const loadDocument = useCallback((doc: KonvaDocument) => {
    dispatch({ type: 'SET_DOCUMENT', payload: doc });
  }, []);

  // Save document
  const saveDocument = useCallback(async (): Promise<boolean> => {
    if (!state.document) return false;
    
    // TODO: Implement Supabase save
    console.log('[KonvaContext] Saving document:', state.document.id);
    
    dispatch({ type: 'MARK_CLEAN' });
    return true;
  }, [state.document]);

  // Add element
  const addElement = useCallback((type: string) => {
    const element = createDefaultElement(type as any);
    if (element.id) {
      dispatch({ type: 'ADD_ELEMENT', payload: element as KonvaElement });
      dispatch({ type: 'MARK_DIRTY' });
    }
  }, []);

  // Update element
  const updateElement = useCallback((id: string, attrs: Partial<KonvaElement>) => {
    dispatch({ type: 'UPDATE_ELEMENT', payload: { id, attrs } });
  }, []);

  // Delete selected
  const deleteSelectedElements = useCallback(() => {
    if (state.selectedIds.length === 0) return;
    pushUndo();
    dispatch({ type: 'DELETE_ELEMENTS', payload: state.selectedIds });
  }, [state.selectedIds]);

  // Duplicate selected
  const duplicateSelectedElements = useCallback(() => {
    const elements = getSelectedElements();
    if (elements.length === 0) return;
    
    pushUndo();
    
    const newElements = elements.map(el => ({
      ...el,
      id: crypto.randomUUID(),
      x: el.x + 20,
      y: el.y + 20,
    }));
    
    newElements.forEach(el => {
      dispatch({ type: 'ADD_ELEMENT', payload: el });
    });
    
    setSelectedIds(newElements.map(el => el.id));
  }, [state.document, state.currentPageIndex, state.selectedIds]);

  // History - push undo
  const pushUndo = useCallback(() => {
    if (!state.document) return;
    const elements = state.document.pages[state.currentPageIndex]?.canvas.elements || [];
    dispatch({ 
      type: 'PUSH_UNDO', 
      payload: { elements: JSON.parse(JSON.stringify(elements)), timestamp: Date.now() } 
    });
  }, [state.document, state.currentPageIndex]);

  // Undo
  const undo = useCallback(() => {
    dispatch({ type: 'UNDO' });
  }, []);

  // Redo
  const redo = useCallback(() => {
    dispatch({ type: 'REDO' });
  }, []);

  // Persist current page (for autosave)
  const persistCurrentPage = useCallback(() => {
    dispatch({ type: 'MARK_DIRTY' });
    // TODO: Trigger autosave
  }, []);

  // Panel toggles
  const toggleLayersPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_LAYERS_PANEL' });
  }, []);

  const togglePropertiesPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_PROPERTIES_PANEL' });
  }, []);

  const toggleAIPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_AI_PANEL' });
  }, []);

  // Page operations
  const addPage = useCallback(() => {
    if (!state.document) return;
    pushUndo();
    const newPage: KonvaPage = {
      id: crypto.randomUUID(),
      name: `Page ${state.document.pages.length + 1}`,
      order: state.document.pages.length,
      canvas: {
        width: state.document.settings.pageSize.width,
        height: state.document.settings.pageSize.height,
        backgroundColor: '#ffffff',
        elements: [],
      },
    };
    dispatch({ type: 'ADD_PAGE', payload: newPage });
    dispatch({ type: 'SET_PAGE', payload: state.document.pages.length });
  }, [state.document]);

  const deletePage = useCallback((index: number) => {
    pushUndo();
    dispatch({ type: 'DELETE_PAGE', payload: index });
  }, []);

  const goToPage = useCallback((index: number) => {
    dispatch({ type: 'SET_PAGE', payload: index });
  }, []);

  // Get current page
  const getCurrentPage = useCallback((): KonvaPage | null => {
    return state.document?.pages[state.currentPageIndex] || null;
  }, [state.document, state.currentPageIndex]);

  // Get selected elements
  const getSelectedElements = useCallback((): KonvaElement[] => {
    const page = getCurrentPage();
    if (!page) return [];
    return page.canvas.elements.filter(el => state.selectedIds.includes(el.id));
  }, [getCurrentPage, state.selectedIds]);

  // Beforeunload warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [state.isDirty]);

  const value: KonvaContextValue = {
    state,
    dispatch,
    stageRef,
    selectedIds: state.selectedIds,
    setSelectedIds,
    zoom: state.zoom,
    setZoom,
    panOffset: state.panOffset,
    setPanOffset,
    activeTool: state.activeTool,
    setActiveTool,
    createNewDocument,
    loadDocument,
    saveDocument,
    addElement,
    updateElement,
    deleteSelectedElements,
    duplicateSelectedElements,
    pushUndo,
    undo,
    redo,
    persistCurrentPage,
    toggleLayersPanel,
    togglePropertiesPanel,
    toggleAIPanel,
    addPage,
    deletePage,
    goToPage,
    getCurrentPage,
    getSelectedElements,
  };

  return (
    <KonvaContext.Provider value={value}>
      {children}
    </KonvaContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

export function useKonvaContext() {
  const context = useContext(KonvaContext);
  if (!context) {
    throw new Error('useKonvaContext must be used within a KonvaProvider');
  }
  return context;
}
