/**
 * Content Studio Service
 * Handles persistence, autosave, and document management for Content Studio
 */

import { supabase } from '../supabase';
import type { ContentDocument } from '../../components/content-studio/types';

// ============================================================================
// Types
// ============================================================================

export interface DocumentVersion {
  id: string;
  document_id: string;
  version: number;
  data: ContentDocument;
  created_at: string;
  created_by: string;
}

export interface SaveResult {
  success: boolean;
  error?: string;
  document?: ContentDocument;
  conflict?: boolean;
}

export interface AutosaveConfig {
  enabled: boolean;
  intervalMs: number;
  maxRetries: number;
}

const DEFAULT_AUTOSAVE_CONFIG: AutosaveConfig = {
  enabled: true,
  intervalMs: 30000, // 30 seconds
  maxRetries: 3,
};

// Maximum document size (5MB for JSON, 10MB for images)
const MAX_DOCUMENT_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const MAX_CANVAS_OBJECTS = 500;

// ============================================================================
// Validation
// ============================================================================

export function validateDocument(document: ContentDocument): { valid: boolean; error?: string } {
  // Check document size
  const jsonSize = new Blob([JSON.stringify(document)]).size;
  if (jsonSize > MAX_DOCUMENT_SIZE_BYTES) {
    return { 
      valid: false, 
      error: `Document too large: ${(jsonSize / 1024 / 1024).toFixed(2)}MB exceeds ${MAX_DOCUMENT_SIZE_BYTES / 1024 / 1024}MB limit` 
    };
  }

  // Check object count per page
  for (const page of document.pages) {
    const objectCount = page.canvas.objects?.length || 0;
    if (objectCount > MAX_CANVAS_OBJECTS) {
      return { 
        valid: false, 
        error: `Page "${page.name}" has ${objectCount} objects, exceeding limit of ${MAX_CANVAS_OBJECTS}` 
      };
    }
  }

  return { valid: true };
}

export function validateImageSize(file: File | Blob): { valid: boolean; error?: string } {
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image too large: ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds ${MAX_IMAGE_SIZE_BYTES / 1024 / 1024}MB limit`,
    };
  }
  return { valid: true };
}

// ============================================================================
// Document CRUD Operations
// ============================================================================

/**
 * Save document to Supabase with conflict detection
 */
export async function saveDocument(
  document: ContentDocument,
  userId: string,
  workspaceId: string
): Promise<SaveResult> {
  // Validate document
  const validation = validateDocument(document);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // Check for existing document and version conflict
    const { data: existing, error: fetchError } = await supabase
      .from('content_studio_documents')
      .select('id, version, updated_at')
      .eq('id', document.id)
      .maybeSingle();

    if (fetchError) {
      throw fetchError;
    }

    // Check for version conflict (last-write-wins with warning)
    if (existing && existing.version > document.metadata.version) {
      return {
        success: false,
        conflict: true,
        error: `Document has been modified by another user. Your version: ${document.metadata.version}, Server version: ${existing.version}`,
      };
    }

    // Increment version
    const newVersion = (document.metadata.version || 0) + 1;
    const updatedDocument: ContentDocument = {
      ...document,
      metadata: {
        ...document.metadata,
        version: newVersion,
        lastEditedBy: userId,
      },
      updatedAt: new Date().toISOString(),
    };

    // Upsert document
    const { data, error } = await supabase
      .from('content_studio_documents')
      .upsert({
        id: document.id,
        workspace_id: workspaceId,
        title: document.title,
        description: document.description,
        data: updatedDocument,
        version: newVersion,
        created_by: document.createdBy || userId,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Create version snapshot for history
    await createVersionSnapshot(document.id, newVersion, updatedDocument, userId);

    return { success: true, document: updatedDocument };
  } catch (error: any) {
    console.error('[ContentStudioService] Save failed:', error);
    return { success: false, error: error.message || 'Failed to save document' };
  }
}

/**
 * Load document from Supabase
 * Scoped by workspace_id to prevent cross-tenant access
 */
export async function loadDocument(
  documentId: string, 
  workspaceId?: string
): Promise<ContentDocument | null> {
  try {
    let query = supabase
      .from('content_studio_documents')
      .select('data, workspace_id')
      .eq('id', documentId);
    
    // If workspace_id provided, scope the query for security
    if (workspaceId) {
      query = query.eq('workspace_id', workspaceId);
    }
    
    const { data, error } = await query.single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // If workspace_id was provided but doesn't match, return null (unauthorized)
    if (workspaceId && data?.workspace_id && data.workspace_id !== workspaceId) {
      console.warn('[ContentStudioService] Document workspace mismatch - unauthorized access attempt');
      return null;
    }

    return data?.data as ContentDocument;
  } catch (error) {
    console.error('[ContentStudioService] Load failed:', error);
    return null;
  }
}

/**
 * List documents for a workspace
 */
export async function listDocuments(
  workspaceId: string,
  options: { limit?: number; offset?: number; search?: string } = {}
): Promise<{ documents: ContentDocument[]; total: number }> {
  const { limit = 20, offset = 0, search } = options;

  try {
    let query = supabase
      .from('content_studio_documents')
      .select('data, id', { count: 'exact' })
      .eq('workspace_id', workspaceId)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    return {
      documents: (data || []).map((d) => d.data as ContentDocument),
      total: count || 0,
    };
  } catch (error) {
    console.error('[ContentStudioService] List failed:', error);
    return { documents: [], total: 0 };
  }
}

/**
 * Delete a document
 */
export async function deleteDocument(documentId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('content_studio_documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('[ContentStudioService] Delete failed:', error);
    return false;
  }
}

// ============================================================================
// Version History
// ============================================================================

/**
 * Create a version snapshot for history
 */
async function createVersionSnapshot(
  documentId: string,
  version: number,
  document: ContentDocument,
  userId: string
): Promise<void> {
  try {
    await supabase.from('content_studio_versions').insert({
      document_id: documentId,
      version,
      data: document,
      created_by: userId,
    });

    // Keep only last 20 versions
    const { data: versions } = await supabase
      .from('content_studio_versions')
      .select('id')
      .eq('document_id', documentId)
      .order('version', { ascending: false })
      .range(20, 1000);

    if (versions && versions.length > 0) {
      const idsToDelete = versions.map((v) => v.id);
      await supabase
        .from('content_studio_versions')
        .delete()
        .in('id', idsToDelete);
    }
  } catch (error) {
    // Non-critical, log but don't throw
    console.warn('[ContentStudioService] Version snapshot failed:', error);
  }
}

/**
 * Get version history for a document
 */
export async function getVersionHistory(
  documentId: string
): Promise<{ version: number; createdAt: string; createdBy: string }[]> {
  try {
    const { data, error } = await supabase
      .from('content_studio_versions')
      .select('version, created_at, created_by')
      .eq('document_id', documentId)
      .order('version', { ascending: false });

    if (error) throw error;

    return (data || []).map((v) => ({
      version: v.version,
      createdAt: v.created_at,
      createdBy: v.created_by,
    }));
  } catch (error) {
    console.error('[ContentStudioService] Get history failed:', error);
    return [];
  }
}

/**
 * Restore a specific version
 */
export async function restoreVersion(
  documentId: string,
  version: number
): Promise<ContentDocument | null> {
  try {
    const { data, error } = await supabase
      .from('content_studio_versions')
      .select('data')
      .eq('document_id', documentId)
      .eq('version', version)
      .single();

    if (error) throw error;

    return data?.data as ContentDocument;
  } catch (error) {
    console.error('[ContentStudioService] Restore version failed:', error);
    return null;
  }
}

// ============================================================================
// Autosave Manager
// ============================================================================

export class AutosaveManager {
  private config: AutosaveConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private isDirty = false;
  private retryCount = 0;
  private lastSavedVersion = 0;
  private onSave: () => Promise<SaveResult>;
  private onError: (error: string) => void;
  private onSuccess: () => void;

  constructor(
    onSave: () => Promise<SaveResult>,
    onError: (error: string) => void,
    onSuccess: () => void,
    config: Partial<AutosaveConfig> = {}
  ) {
    this.config = { ...DEFAULT_AUTOSAVE_CONFIG, ...config };
    this.onSave = onSave;
    this.onError = onError;
    this.onSuccess = onSuccess;
  }

  start(): void {
    if (!this.config.enabled || this.intervalId) return;

    this.intervalId = setInterval(async () => {
      if (this.isDirty) {
        await this.save();
      }
    }, this.config.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  markDirty(): void {
    this.isDirty = true;
  }

  markClean(): void {
    this.isDirty = false;
    this.retryCount = 0;
  }

  async save(): Promise<boolean> {
    if (!this.isDirty) return true;

    try {
      const result = await this.onSave();

      if (result.success) {
        this.markClean();
        this.onSuccess();
        return true;
      }

      if (result.conflict) {
        this.onError('Document was modified by another user. Please refresh to see latest changes.');
        return false;
      }

      throw new Error(result.error);
    } catch (error: any) {
      this.retryCount++;

      if (this.retryCount >= this.config.maxRetries) {
        this.onError(`Autosave failed after ${this.config.maxRetries} attempts: ${error.message}`);
        this.retryCount = 0;
        return false;
      }

      // Will retry on next interval
      console.warn(`[Autosave] Retry ${this.retryCount}/${this.config.maxRetries}:`, error.message);
      return false;
    }
  }

  // Force save immediately (for page unload, etc.)
  async forceSave(): Promise<boolean> {
    return this.save();
  }
}

// ============================================================================
// Debounce Utility for Undo
// ============================================================================

/**
 * Creates a debounced undo snapshot function
 * Prevents excessive snapshots during rapid changes (e.g., slider drags)
 */
export function createDebouncedUndoHandler(
  pushUndo: () => void,
  delayMs: number = 300
): { capture: () => void; flush: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  let hasPendingSnapshot = false;

  const capture = () => {
    // If we don't have a pending snapshot, capture immediately
    if (!hasPendingSnapshot) {
      pushUndo();
      hasPendingSnapshot = true;
    }

    // Reset the debounce timer
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // After delay, reset so next change triggers immediate capture
    timeoutId = setTimeout(() => {
      hasPendingSnapshot = false;
      timeoutId = null;
    }, delayMs);
  };

  const flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    hasPendingSnapshot = false;
  };

  return { capture, flush };
}

/**
 * Throttle function for property changes
 * Captures at most one snapshot per interval
 */
export function createThrottledHandler<T extends (...args: any[]) => void>(
  fn: T,
  intervalMs: number = 100
): T {
  let lastCall = 0;
  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    lastArgs = args;

    if (now - lastCall >= intervalMs) {
      lastCall = now;
      fn(...args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => {
        lastCall = Date.now();
        if (lastArgs) fn(...lastArgs);
        timeoutId = null;
      }, intervalMs - (now - lastCall));
    }
  }) as T;
}

export default {
  saveDocument,
  loadDocument,
  listDocuments,
  deleteDocument,
  getVersionHistory,
  restoreVersion,
  validateDocument,
  validateImageSize,
  AutosaveManager,
  createDebouncedUndoHandler,
  createThrottledHandler,
};
