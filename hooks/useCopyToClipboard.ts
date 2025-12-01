import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Return type for useCopyToClipboard hook
 */
export interface UseCopyToClipboardReturn {
  /** Whether text was recently copied (resets after timeout) */
  isCopied: boolean;
  /** The last copied text */
  copiedText: string | null;
  /** Copy text to clipboard */
  copy: (text: string) => Promise<boolean>;
  /** Reset copied state manually */
  reset: () => void;
}

/**
 * Hook for copying text to clipboard with feedback state.
 * Automatically resets the "copied" state after a timeout.
 * 
 * @param resetTimeout - Time in ms before resetting isCopied (default: 2000)
 * @returns Copy function and state
 * 
 * @example
 * // Basic usage
 * const { isCopied, copy } = useCopyToClipboard();
 * 
 * <button onClick={() => copy(text)}>
 *   {isCopied ? '✓ Copied!' : 'Copy'}
 * </button>
 * 
 * @example
 * // With custom timeout
 * const { isCopied, copy } = useCopyToClipboard(3000);
 * 
 * @example
 * // Multiple copy buttons with tracking
 * const { copiedText, copy } = useCopyToClipboard();
 * 
 * {items.map(item => (
 *   <button 
 *     key={item.id}
 *     onClick={() => copy(item.text)}
 *   >
 *     {copiedText === item.text ? '✓ Copied' : 'Copy'}
 *   </button>
 * ))}
 */
export function useCopyToClipboard(resetTimeout: number = 2000): UseCopyToClipboardReturn {
  const [isCopied, setIsCopied] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check if clipboard API is available
    if (!navigator?.clipboard) {
      console.warn('Clipboard API not available');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setCopiedText(text);

      // Reset after timeout
      timeoutRef.current = setTimeout(() => {
        setIsCopied(false);
        setCopiedText(null);
      }, resetTimeout);

      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setIsCopied(false);
      setCopiedText(null);
      return false;
    }
  }, [resetTimeout]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsCopied(false);
    setCopiedText(null);
  }, []);

  return { isCopied, copiedText, copy, reset };
}

/**
 * Hook for tracking which item was copied in a list.
 * Useful when you have multiple copy buttons.
 * 
 * @param resetTimeout - Time in ms before resetting (default: 2000)
 * @returns Copy function and identifier tracking
 * 
 * @example
 * const { copiedId, copyWithId } = useCopyWithId<string>();
 * 
 * {items.map(item => (
 *   <button onClick={() => copyWithId(item.id, item.text)}>
 *     {copiedId === item.id ? '✓ Copied' : 'Copy'}
 *   </button>
 * ))}
 */
export function useCopyWithId<T = string>(resetTimeout: number = 2000) {
  const [copiedId, setCopiedId] = useState<T | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copyWithId = useCallback(async (id: T, text: string): Promise<boolean> => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!navigator?.clipboard) {
      console.warn('Clipboard API not available');
      return false;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);

      timeoutRef.current = setTimeout(() => {
        setCopiedId(null);
      }, resetTimeout);

      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, [resetTimeout]);

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setCopiedId(null);
  }, []);

  return { copiedId, copyWithId, reset, isCopied: copiedId !== null };
}

export default useCopyToClipboard;
