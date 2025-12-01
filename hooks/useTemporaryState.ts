import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Return type for useTemporaryState hook
 */
export interface UseTemporaryStateReturn<T> {
  /** Current value */
  value: T;
  /** Set value temporarily (will reset after timeout) */
  setTemporary: (value: T, duration?: number) => void;
  /** Set value permanently (won't auto-reset) */
  setPermanent: (value: T) => void;
  /** Reset to initial value immediately */
  reset: () => void;
  /** Whether the state is in temporary mode */
  isTemporary: boolean;
}

/**
 * Hook for managing state that automatically resets after a timeout.
 * Perfect for success messages, copy confirmations, toast-like feedback.
 * 
 * @param initialValue - Initial and reset value
 * @param defaultDuration - Default duration before reset (ms, default: 2000)
 * @returns State value and control functions
 * 
 * @example
 * // Success message that auto-hides
 * const { value: showSuccess, setTemporary } = useTemporaryState(false, 3000);
 * 
 * const handleSave = async () => {
 *   await saveData();
 *   setTemporary(true); // Shows for 3 seconds then hides
 * };
 * 
 * @example
 * // Copy confirmation with custom duration
 * const { value: copied, setTemporary } = useTemporaryState(false);
 * 
 * <button onClick={() => { copy(text); setTemporary(true, 2000); }}>
 *   {copied ? '✓ Copied!' : 'Copy'}
 * </button>
 * 
 * @example
 * // Status messages
 * const { value: status, setTemporary, setPermanent } = useTemporaryState<string | null>(null);
 * 
 * // Show "Saving..." permanently until done
 * setPermanent('Saving...');
 * await save();
 * // Show "Saved!" temporarily
 * setTemporary('Saved!', 2000);
 */
export function useTemporaryState<T>(
  initialValue: T,
  defaultDuration: number = 2000
): UseTemporaryStateReturn<T> {
  const [value, setValue] = useState<T>(initialValue);
  const [isTemporary, setIsTemporary] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialValueRef = useRef(initialValue);
  initialValueRef.current = initialValue;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const setTemporary = useCallback((newValue: T, duration: number = defaultDuration) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setValue(newValue);
    setIsTemporary(true);

    // Set timeout to reset
    timeoutRef.current = setTimeout(() => {
      setValue(initialValueRef.current);
      setIsTemporary(false);
    }, duration);
  }, [defaultDuration]);

  const setPermanent = useCallback((newValue: T) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setValue(newValue);
    setIsTemporary(false);
  }, []);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setValue(initialValueRef.current);
    setIsTemporary(false);
  }, []);

  return {
    value,
    setTemporary,
    setPermanent,
    reset,
    isTemporary
  };
}

/**
 * Simplified hook for boolean flags that auto-reset to false.
 * 
 * @param defaultDuration - Default duration before reset (ms, default: 2000)
 * @returns Flag state and trigger function
 * 
 * @example
 * const { isActive, trigger } = useTemporaryFlag(3000);
 * 
 * <button onClick={() => { doAction(); trigger(); }}>
 *   {isActive ? '✓ Done!' : 'Do Action'}
 * </button>
 */
export function useTemporaryFlag(defaultDuration: number = 2000) {
  const { value, setTemporary, reset } = useTemporaryState(false, defaultDuration);
  
  const trigger = useCallback((duration?: number) => {
    setTemporary(true, duration);
  }, [setTemporary]);

  return {
    isActive: value,
    trigger,
    reset
  };
}

/**
 * Convenience hook that returns a tuple for simpler boolean flag usage.
 * Useful when you just need [isActive, trigger] pattern.
 * 
 * @param defaultDuration - Default duration before reset (ms, default: 3000)
 * @returns Tuple of [isActive, trigger, reset]
 * 
 * @example
 * const [showToast, triggerToast] = useTemporaryBoolean(3000);
 * 
 * // Later:
 * triggerToast(); // Shows for 3 seconds
 */
export function useTemporaryBoolean(defaultDuration: number = 3000): [boolean, () => void, () => void] {
  const { isActive, trigger, reset } = useTemporaryFlag(defaultDuration);
  return [isActive, trigger, reset];
}

/**
 * Alias for useTemporaryBoolean - for success/saved feedback patterns
 */
export function useSuccessState(defaultDuration: number = 3000): [boolean, () => void, () => void] {
  return useTemporaryBoolean(defaultDuration);
}

export default useTemporaryState;
