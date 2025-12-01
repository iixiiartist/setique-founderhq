import { useCallback, useEffect, useRef } from 'react';
import { withRetry } from '../lib/utils/retry';

export interface AutosaveOptions {
  /** Debounce delay after last edit before triggering save (ms) */
  debounceMs?: number;
  /** Interval for periodic backup saves (ms) */
  intervalMs?: number;
  /** Whether autosave is enabled */
  enabled?: boolean;
  /** Called when autosave completes successfully */
  onSuccess?: () => void;
  /** Called when autosave fails */
  onError?: (error: unknown) => void;
  /** Retry configuration */
  retryAttempts?: number;
  retryInitialDelayMs?: number;
  retryMaxDelayMs?: number;
}

const DEFAULT_OPTIONS: Required<AutosaveOptions> = {
  debounceMs: 2000,
  intervalMs: 30000,
  enabled: true,
  onSuccess: () => {},
  onError: () => {},
  retryAttempts: 2,
  retryInitialDelayMs: 500,
  retryMaxDelayMs: 2000,
};

export interface UseAutosaveResult {
  /** Mark content as dirty (modified) */
  markDirty: () => void;
  /** Check if there are unsaved changes */
  isDirty: () => boolean;
  /** Force an immediate save */
  saveNow: () => Promise<void>;
  /** Clear the dirty flag without saving */
  clearDirty: () => void;
}

/**
 * useAutosave - Generic autosave hook with debouncing, periodic saves, and beforeunload guard
 * 
 * @param saveFn - Async function to perform the save operation
 * @param options - Configuration options
 * @returns Object with markDirty, isDirty, saveNow, and clearDirty functions
 * 
 * @example
 * ```tsx
 * const { markDirty, saveNow } = useAutosave(
 *   async () => {
 *     await saveDocument(content);
 *   },
 *   {
 *     debounceMs: 2000,
 *     intervalMs: 30000,
 *     onSuccess: () => setLastSaved(new Date()),
 *     onError: (err) => console.warn('Autosave failed', err),
 *   }
 * );
 * 
 * // In your editor onChange:
 * onChange={(content) => {
 *   setContent(content);
 *   markDirty();
 * }}
 * ```
 */
export function useAutosave(
  saveFn: () => Promise<void>,
  options: AutosaveOptions = {}
): UseAutosaveResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const isDirtyRef = useRef(false);
  const isSavingRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveFnRef = useRef(saveFn);
  
  // Keep saveFn ref updated
  useEffect(() => {
    saveFnRef.current = saveFn;
  }, [saveFn]);

  const performSave = useCallback(async () => {
    if (isSavingRef.current || !isDirtyRef.current) return;
    
    isSavingRef.current = true;
    try {
      await withRetry(saveFnRef.current, {
        maxAttempts: opts.retryAttempts,
        initialDelayMs: opts.retryInitialDelayMs,
        maxDelayMs: opts.retryMaxDelayMs,
        onRetry: (attempt, err) => {
          console.log(`[autosave] Retry attempt ${attempt}`, err);
        },
      });
      
      isDirtyRef.current = false;
      opts.onSuccess();
    } catch (error) {
      opts.onError(error);
    } finally {
      isSavingRef.current = false;
    }
  }, [opts]);

  const markDirty = useCallback(() => {
    isDirtyRef.current = true;
    
    if (!opts.enabled) return;
    
    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Schedule debounced save
    debounceRef.current = setTimeout(() => {
      performSave();
    }, opts.debounceMs);
  }, [opts.enabled, opts.debounceMs, performSave]);

  const isDirty = useCallback(() => isDirtyRef.current, []);

  const saveNow = useCallback(async () => {
    // Clear any pending debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    
    // Force dirty to ensure save happens
    isDirtyRef.current = true;
    await performSave();
  }, [performSave]);

  const clearDirty = useCallback(() => {
    isDirtyRef.current = false;
  }, []);

  // Periodic backup interval
  useEffect(() => {
    if (!opts.enabled) return;

    intervalRef.current = setInterval(() => {
      if (isDirtyRef.current) {
        performSave();
      }
    }, opts.intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [opts.enabled, opts.intervalMs, performSave]);

  // Beforeunload guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirtyRef.current) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Final save attempt on unmount
      if (isDirtyRef.current) {
        // Fire and forget - component is unmounting
        performSave();
      }
    };
  }, [performSave]);

  return { markDirty, isDirty, saveNow, clearDirty };
}

export default useAutosave;
