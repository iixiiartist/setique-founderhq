/**
 * Konva Context Provider
 * State management for the React-Konva canvas system
 */

import React, { createContext, useContext, useReducer, useRef, useCallback, ReactNode, useEffect, useState } from 'react';
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
import { 
  saveDocument as saveDocumentToSupabase, 
  loadDocument as loadDocumentFromSupabase,
  validateDocument,
} from '../../../lib/services/contentStudioService';
import { fabricToKonva, konvaToFabric, isKonvaFormat } from './documentConverter';
import { validateKonvaDocument, sanitizeDocument } from './validation';
import { showSuccess, showError, showWarning } from '../../../lib/utils/toast';

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
  isLoading: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  undoStack: HistoryEntry[];
  redoStack: HistoryEntry[];
  isLayersPanelOpen: boolean;
  isPropertiesPanelOpen: boolean;
  isAIPanelOpen: boolean;
  isAssetsPanelOpen: boolean;
}

const initialState: KonvaState = {
  document: null,
  currentPageIndex: 0,
  selectedIds: [],
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  activeTool: 'select',
  isDirty: false,
  isLoading: false,
  isSaving: false,
  saveError: null,
  lastSavedAt: null,
  undoStack: [],
  redoStack: [],
  isLayersPanelOpen: true,
  isPropertiesPanelOpen: true,
  isAIPanelOpen: false,
  isAssetsPanelOpen: false,
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
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_LAST_SAVED'; payload: string }
  | { type: 'PUSH_UNDO'; payload: HistoryEntry }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'TOGGLE_LAYERS_PANEL' }
  | { type: 'TOGGLE_PROPERTIES_PANEL' }
  | { type: 'TOGGLE_AI_PANEL' }
  | { type: 'TOGGLE_ASSETS_PANEL' };

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
              ? { ...page, canvas: { ...page.canvas, elements: [...page.canvas.elements, action.payload] as KonvaElement[] } }
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
                    ) as KonvaElement[],
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
                    elements: page.canvas.elements.filter(el => !action.payload.includes(el.id)) as KonvaElement[],
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

    case 'TOGGLE_ASSETS_PANEL':
      return { ...state, isAssetsPanelOpen: !state.isAssetsPanelOpen };

    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };

    case 'SET_SAVING':
      return { ...state, isSaving: action.payload };

    case 'SET_SAVE_ERROR':
      return { ...state, saveError: action.payload };

    case 'SET_LAST_SAVED':
      return { ...state, lastSavedAt: action.payload };

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
  
  // Loading/Saving State
  isLoading: boolean;
  isSaving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
  
  // Document operations
  createNewDocument: (title?: string) => void;
  loadDocument: (doc: KonvaDocument) => void;
  loadDocumentById: (documentId: string) => Promise<boolean>;
  saveDocument: () => Promise<boolean>;
  
  // Element operations
  addElement: (type: string) => void;
  addCustomElement: (element: KonvaElement) => void;
  updateElement: (id: string, attrs: Partial<KonvaElement>) => void;
  deleteSelectedElements: () => void;
  duplicateSelectedElements: () => void;
  
  // Grouping operations
  groupSelectedElements: () => void;
  ungroupSelectedElements: () => void;
  
  // AI operations
  applyAiPatch: (elements: KonvaElement[], options?: { 
    replaceSelection?: boolean; 
    pageId?: string;
    skipUndo?: boolean;
  }) => { applied: number; skipped: number };
  
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
  toggleAssetsPanel: () => void;
  
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
  documentId?: string;
  onClose?: () => void;
  onSave?: () => void;
}

export function KonvaProvider({ children, documentId, onClose, onSave }: KonvaProviderProps) {
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

  // Load document from context
  const loadDocument = useCallback((doc: KonvaDocument) => {
    dispatch({ type: 'SET_DOCUMENT', payload: doc });
  }, []);

  // Load document by ID from Supabase
  const loadDocumentById = useCallback(async (documentId: string): Promise<boolean> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    
    try {
      const rawDoc = await loadDocumentFromSupabase(documentId);
      if (!rawDoc) {
        showError('Document not found');
        dispatch({ type: 'SET_LOADING', payload: false });
        return false;
      }

      // Convert from Fabric format if needed
      let konvaDoc: KonvaDocument;
      if (isKonvaFormat(rawDoc)) {
        konvaDoc = rawDoc as unknown as KonvaDocument;
      } else {
        konvaDoc = fabricToKonva(rawDoc);
      }
      
      // Sanitize document to fix any issues
      const sanitizedDoc = sanitizeDocument(konvaDoc);
      
      // Validate the document
      const validation = validateKonvaDocument(sanitizedDoc);
      if (!validation.valid) {
        console.error('[KonvaContext] Document validation errors:', validation.errors);
        showWarning('Document loaded with some issues. Some elements may be missing.');
      }
      if (validation.warnings.length > 0) {
        console.warn('[KonvaContext] Document warnings:', validation.warnings);
      }

      dispatch({ type: 'SET_DOCUMENT', payload: sanitizedDoc });
      dispatch({ type: 'SET_LAST_SAVED', payload: sanitizedDoc.metadata?.updated_at || new Date().toISOString() });
      dispatch({ type: 'SET_LOADING', payload: false });
      showSuccess('Document loaded');
      return true;
    } catch (error) {
      console.error('[KonvaContext] Load failed:', error);
      dispatch({ type: 'SET_LOADING', payload: false });
      showError('Failed to load document');
      return false;
    }
  }, []);

  // Save document to Supabase
  const saveDocument = useCallback(async (): Promise<boolean> => {
    if (!state.document) return false;
    if (!userId) {
      showWarning('Please sign in to save');
      return false;
    }
    
    // Prevent concurrent saves
    if (state.isSaving) {
      console.log('[KonvaContext] Save already in progress, skipping');
      return false;
    }

    dispatch({ type: 'SET_SAVING', payload: true });
    dispatch({ type: 'SET_SAVE_ERROR', payload: null });

    try {
      // Validate with new validation system before save
      const konvaValidation = validateKonvaDocument(state.document);
      if (!konvaValidation.valid) {
        const errorMsg = konvaValidation.errors.join(', ');
        console.error('[KonvaContext] Validation errors:', konvaValidation.errors);
        dispatch({ type: 'SET_SAVE_ERROR', payload: errorMsg });
        showError(`Validation failed: ${errorMsg}`);
        dispatch({ type: 'SET_SAVING', payload: false });
        return false;
      }
      
      if (konvaValidation.warnings.length > 0) {
        console.warn('[KonvaContext] Validation warnings:', konvaValidation.warnings);
      }
      
      // Convert to Fabric format for storage (backward compatibility)
      const fabricDoc = konvaToFabric(state.document);
      
      // Validate before save
      const validation = validateDocument(fabricDoc);
      if (!validation.valid) {
        dispatch({ type: 'SET_SAVE_ERROR', payload: validation.error || 'Document validation failed' });
        showError(validation.error || 'Document validation failed');
        dispatch({ type: 'SET_SAVING', payload: false });
        return false;
      }

      const result = await saveDocumentToSupabase(
        fabricDoc,
        userId,
        workspaceId || state.document.workspaceId || 'default'
      );

      if (result.success) {
        // Update local version number
        if (result.document) {
          dispatch({ 
            type: 'UPDATE_DOCUMENT', 
            payload: { 
              metadata: { 
                ...state.document.metadata,
                version: result.document.metadata.version 
              } 
            } as any
          });
        }
        dispatch({ type: 'MARK_CLEAN' });
        dispatch({ type: 'SET_LAST_SAVED', payload: new Date().toISOString() });
        dispatch({ type: 'SET_SAVING', payload: false });
        showSuccess('Document saved');
        return true;
      }

      if (result.conflict) {
        dispatch({ type: 'SET_SAVE_ERROR', payload: 'Document modified by another user' });
        dispatch({ type: 'SET_SAVING', payload: false });
        showWarning('Document was modified by another user. Please refresh.');
        return false;
      }

      dispatch({ type: 'SET_SAVE_ERROR', payload: result.error || 'Failed to save document' });
      dispatch({ type: 'SET_SAVING', payload: false });
      showError(result.error || 'Failed to save document');
      return false;
    } catch (error) {
      console.error('[KonvaContext] Save failed:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to save document';
      dispatch({ type: 'SET_SAVE_ERROR', payload: errorMsg });
      dispatch({ type: 'SET_SAVING', payload: false });
      showError('Failed to save document');
      return false;
    }
  }, [state.document, state.isSaving, userId, workspaceId]);

  // Add element
  const addElement = useCallback((type: string) => {
    const element = createDefaultElement(type as any);
    if (element.id) {
      dispatch({ type: 'ADD_ELEMENT', payload: element as KonvaElement });
      dispatch({ type: 'MARK_DIRTY' });
    }
  }, []);

  // Add custom element (for AI-generated content)
  const addCustomElement = useCallback((element: KonvaElement) => {
    dispatch({ type: 'ADD_ELEMENT', payload: element });
    dispatch({ type: 'MARK_DIRTY' });
  }, []);

  // History - push undo (defined early for use by applyAiPatch and other functions)
  const pushUndo = useCallback(() => {
    if (!state.document) return;
    const elements = state.document.pages[state.currentPageIndex]?.canvas.elements || [];
    dispatch({ 
      type: 'PUSH_UNDO', 
      payload: { elements: JSON.parse(JSON.stringify(elements)), timestamp: Date.now() } 
    });
  }, [state.document, state.currentPageIndex]);

  // Apply AI-generated elements patch
  const applyAiPatch = useCallback((
    elements: KonvaElement[],
    options?: { 
      replaceSelection?: boolean; 
      pageId?: string;
      skipUndo?: boolean;
    }
  ): { applied: number; skipped: number } => {
    if (!state.document || elements.length === 0) {
      return { applied: 0, skipped: 0 };
    }

    // Push undo before applying (unless skipped, e.g., for streaming)
    if (!options?.skipUndo) {
      pushUndo();
    }

    // Get current page elements to check for ID collisions
    const currentPage = state.document.pages[state.currentPageIndex];
    const existingIds = new Set(currentPage?.canvas.elements.map(e => e.id) || []);

    // If replacing selection, delete selected elements first
    if (options?.replaceSelection && state.selectedIds.length > 0) {
      dispatch({ type: 'DELETE_ELEMENTS', payload: state.selectedIds });
    }

    // Apply each element, generating new IDs if collision
    let applied = 0;
    let skipped = 0;

    elements.forEach(element => {
      try {
        // Ensure unique ID
        let finalId = element.id;
        if (existingIds.has(finalId)) {
          finalId = crypto.randomUUID();
        }
        existingIds.add(finalId);

        const patchedElement: KonvaElement = {
          ...element,
          id: finalId,
          draggable: element.draggable ?? true,
          visible: element.visible ?? true,
          locked: element.locked ?? false,
        };

        dispatch({ type: 'ADD_ELEMENT', payload: patchedElement });
        applied++;
      } catch (err) {
        console.error('[KonvaContext] Failed to apply element:', err);
        skipped++;
      }
    });

    dispatch({ type: 'MARK_DIRTY' });

    // Select the new elements
    const newIds = elements.slice(0, applied).map(e => e.id);
    dispatch({ type: 'SELECT', payload: newIds });

    console.log(`[KonvaContext] Applied ${applied} elements, skipped ${skipped}`);
    return { applied, skipped };
  }, [state.document, state.currentPageIndex, state.selectedIds, pushUndo]);

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

  // Group selected elements
  const groupSelectedElements = useCallback(() => {
    const page = state.document?.pages[state.currentPageIndex];
    if (!page) return;
    const elements = page.canvas.elements.filter(el => state.selectedIds.includes(el.id));
    if (elements.length < 2) return;
    
    pushUndo();
    
    // Calculate group bounds
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    elements.forEach(el => {
      const x = el.x || 0;
      const y = el.y || 0;
      const width = (el as any).width || (el as any).radius * 2 || 100;
      const height = (el as any).height || (el as any).radius * 2 || 100;
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });
    
    // Create children with relative positions
    const children = elements.map(el => ({
      ...el,
      x: (el.x || 0) - minX,
      y: (el.y || 0) - minY,
    }));
    
    // Create group element
    const groupElement: KonvaElement = {
      id: crypto.randomUUID(),
      type: 'group',
      category: 'shape',
      name: `Group (${elements.length} items)`,
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      draggable: true,
      visible: true,
      locked: false,
      children,
    } as any;
    
    // Delete original elements
    dispatch({ type: 'DELETE_ELEMENTS', payload: state.selectedIds });
    
    // Add group
    dispatch({ type: 'ADD_ELEMENT', payload: groupElement });
    
    // Select the new group
    setSelectedIds([groupElement.id]);
    
    dispatch({ type: 'MARK_DIRTY' });
  }, [state.document, state.currentPageIndex, state.selectedIds, pushUndo, setSelectedIds]);

  // Ungroup selected group
  const ungroupSelectedElements = useCallback(() => {
    const page = state.document?.pages[state.currentPageIndex];
    if (!page) return;
    const elements = page.canvas.elements.filter(el => state.selectedIds.includes(el.id));
    if (elements.length !== 1 || elements[0]?.type !== 'group') return;
    
    pushUndo();
    
    const group = elements[0] as any;
    const groupX = group.x || 0;
    const groupY = group.y || 0;
    
    // Restore children with absolute positions
    const restoredElements = (group.children || []).map((child: any) => ({
      ...child,
      id: crypto.randomUUID(), // New IDs for ungrouped elements
      x: (child.x || 0) + groupX,
      y: (child.y || 0) + groupY,
    }));
    
    // Delete the group
    dispatch({ type: 'DELETE_ELEMENTS', payload: [group.id] });
    
    // Add ungrouped elements
    restoredElements.forEach((el: KonvaElement) => {
      dispatch({ type: 'ADD_ELEMENT', payload: el });
    });
    
    // Select the ungrouped elements
    setSelectedIds(restoredElements.map((el: KonvaElement) => el.id));
    
    dispatch({ type: 'MARK_DIRTY' });
  }, [state.document, state.currentPageIndex, state.selectedIds, pushUndo, setSelectedIds]);

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

  const toggleAssetsPanel = useCallback(() => {
    dispatch({ type: 'TOGGLE_ASSETS_PANEL' });
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

  // Load document on mount if documentId is provided
  useEffect(() => {
    if (documentId) {
      loadDocumentById(documentId);
    } else if (!state.document) {
      // Create a new document if none exists
      createNewDocument();
    }
  }, [documentId]); // Only run on mount or documentId change

  // Autosave effect - throttled and skips when save in flight
  useEffect(() => {
    if (!state.isDirty || !state.document || !userId || state.isSaving) return;

    const timer = setTimeout(async () => {
      // Double-check before saving
      if (!state.isSaving) {
        console.log('[KonvaContext] Autosaving...');
        await saveDocument();
      }
    }, 45000); // Autosave after 45 seconds of inactivity

    return () => clearTimeout(timer);
  }, [state.isDirty, state.document, userId, state.isSaving, saveDocument]);

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
    isLoading: state.isLoading,
    isSaving: state.isSaving,
    saveError: state.saveError,
    lastSavedAt: state.lastSavedAt,
    createNewDocument,
    loadDocument,
    loadDocumentById,
    saveDocument,
    addElement,
    addCustomElement,
    updateElement,
    deleteSelectedElements,
    duplicateSelectedElements,
    groupSelectedElements,
    ungroupSelectedElements,
    applyAiPatch,
    pushUndo,
    undo,
    redo,
    persistCurrentPage,
    toggleLayersPanel,
    togglePropertiesPanel,
    toggleAIPanel,
    toggleAssetsPanel,
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
