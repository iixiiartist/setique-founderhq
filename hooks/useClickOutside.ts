import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for detecting clicks outside of an element.
 * Useful for closing dropdowns, modals, popovers, etc.
 * 
 * @param handler - Callback function to run when click outside occurs
 * @param enabled - Whether the listener should be active (default: true)
 * @returns Ref to attach to the element
 * 
 * @example
 * // Basic dropdown usage
 * const [isOpen, setIsOpen] = useState(false);
 * const dropdownRef = useClickOutside(() => setIsOpen(false), isOpen);
 * 
 * return (
 *   <div ref={dropdownRef}>
 *     <button onClick={() => setIsOpen(!isOpen)}>Toggle</button>
 *     {isOpen && <div>Dropdown content</div>}
 *   </div>
 * );
 * 
 * @example
 * // Modal usage with escape key
 * const [isOpen, setIsOpen] = useState(false);
 * const modalRef = useClickOutside(() => setIsOpen(false), isOpen);
 * 
 * return isOpen ? (
 *   <div className="modal-overlay">
 *     <div ref={modalRef} className="modal-content">
 *       Modal content
 *     </div>
 *   </div>
 * ) : null;
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
): React.RefObject<T> {
  const ref = useRef<T>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const element = ref.current;
      
      // Do nothing if clicking ref's element or descendants
      if (!element || element.contains(event.target as Node)) {
        return;
      }

      handlerRef.current(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [enabled]);

  return ref;
}

/**
 * Hook for detecting clicks outside of multiple elements.
 * Useful when you have a trigger button and a dropdown that should both be ignored.
 * 
 * @param handler - Callback function to run when click outside occurs
 * @param enabled - Whether the listener should be active
 * @returns Function to create refs for multiple elements
 * 
 * @example
 * const [isOpen, setIsOpen] = useState(false);
 * const { refs, addRef } = useClickOutsideMultiple(() => setIsOpen(false), isOpen);
 * 
 * return (
 *   <>
 *     <button ref={addRef}>Toggle</button>
 *     {isOpen && <div ref={addRef}>Dropdown</div>}
 *   </>
 * );
 */
export function useClickOutsideMultiple(
  handler: (event: MouseEvent | TouchEvent) => void,
  enabled: boolean = true
): {
  refs: React.MutableRefObject<Set<HTMLElement>>;
  addRef: (element: HTMLElement | null) => void;
} {
  const refs = useRef<Set<HTMLElement>>(new Set());
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const addRef = useCallback((element: HTMLElement | null) => {
    if (element) {
      refs.current.add(element);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      
      // Check if click is inside any of the tracked elements
      for (const element of refs.current) {
        if (element.contains(target)) {
          return;
        }
      }

      handlerRef.current(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [enabled]);

  // Clear refs when disabled
  useEffect(() => {
    if (!enabled) {
      refs.current.clear();
    }
  }, [enabled]);

  return { refs, addRef };
}

/**
 * Hook combining click outside and escape key detection.
 * 
 * @param handler - Callback function to run when click outside or escape occurs
 * @param enabled - Whether the listeners should be active
 * @returns Ref to attach to the element
 * 
 * @example
 * const [isOpen, setIsOpen] = useState(false);
 * const ref = useClickOutsideOrEscape(() => setIsOpen(false), isOpen);
 */
export function useClickOutsideOrEscape<T extends HTMLElement = HTMLElement>(
  handler: (event: MouseEvent | TouchEvent | KeyboardEvent) => void,
  enabled: boolean = true
): React.RefObject<T> {
  const ref = useRef<T>(null);
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    if (!enabled) return;

    const clickListener = (event: MouseEvent | TouchEvent) => {
      const element = ref.current;
      
      if (!element || element.contains(event.target as Node)) {
        return;
      }

      handlerRef.current(event);
    };

    const keyListener = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handlerRef.current(event);
      }
    };

    document.addEventListener('mousedown', clickListener);
    document.addEventListener('touchstart', clickListener);
    document.addEventListener('keydown', keyListener);

    return () => {
      document.removeEventListener('mousedown', clickListener);
      document.removeEventListener('touchstart', clickListener);
      document.removeEventListener('keydown', keyListener);
    };
  }, [enabled]);

  return ref;
}

export default useClickOutside;
