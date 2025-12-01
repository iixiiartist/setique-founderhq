import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Options for useIntersectionObserver hook
 */
export interface UseIntersectionObserverOptions {
  /** Root element for the observer (null = viewport) */
  root?: Element | null;
  /** Margin around root element */
  rootMargin?: string;
  /** Visibility threshold(s) to trigger callback */
  threshold?: number | number[];
  /** Whether observer should be enabled */
  enabled?: boolean;
  /** Only trigger once when element becomes visible */
  triggerOnce?: boolean;
}

/**
 * Return type for useIntersectionObserver hook
 */
export interface UseIntersectionObserverReturn {
  /** Ref to attach to the element you want to observe */
  ref: (node: Element | null) => void;
  /** Whether the element is currently intersecting */
  isIntersecting: boolean;
  /** The intersection observer entry (null before first observation) */
  entry: IntersectionObserverEntry | null;
}

/**
 * Hook for observing element visibility using Intersection Observer API.
 * Useful for lazy loading, animations on scroll, infinite scroll, etc.
 * 
 * @param options - Configuration options for the intersection observer
 * @returns Object containing ref to attach and intersection state
 * 
 * @example
 * // Basic visibility detection
 * const { ref, isIntersecting } = useIntersectionObserver();
 * 
 * return (
 *   <div ref={ref} className={isIntersecting ? 'visible' : 'hidden'}>
 *     Content
 *   </div>
 * );
 * 
 * @example
 * // Trigger animation once when element enters viewport
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   triggerOnce: true,
 *   threshold: 0.1
 * });
 * 
 * return (
 *   <div ref={ref} className={isIntersecting ? 'animate-fade-in' : 'opacity-0'}>
 *     Animated content
 *   </div>
 * );
 * 
 * @example
 * // Lazy loading images
 * const { ref, isIntersecting } = useIntersectionObserver({
 *   rootMargin: '100px',
 *   triggerOnce: true
 * });
 * 
 * return (
 *   <div ref={ref}>
 *     {isIntersecting && <img src={src} alt={alt} />}
 *   </div>
 * );
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const {
    root = null,
    rootMargin = '0px',
    threshold = 0,
    enabled = true,
    triggerOnce = false
  } = options;

  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const elementRef = useRef<Element | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const hasTriggeredRef = useRef(false);

  // Callback ref to handle element changes
  const ref = useCallback((node: Element | null) => {
    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    elementRef.current = node;

    // Don't observe if disabled or no element
    if (!enabled || !node) {
      return;
    }

    // Don't re-observe if triggerOnce already fired
    if (triggerOnce && hasTriggeredRef.current) {
      return;
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      ([observerEntry]) => {
        setEntry(observerEntry);
        setIsIntersecting(observerEntry.isIntersecting);

        // Handle triggerOnce
        if (triggerOnce && observerEntry.isIntersecting) {
          hasTriggeredRef.current = true;
          observerRef.current?.disconnect();
        }
      },
      { root, rootMargin, threshold }
    );

    observerRef.current.observe(node);
  }, [enabled, root, rootMargin, threshold, triggerOnce]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  return { ref, isIntersecting, entry };
}

/**
 * Options for useInViewAnimation hook
 */
export interface UseInViewAnimationOptions extends UseIntersectionObserverOptions {
  /** Animation class to add when in view */
  animationClass?: string;
  /** Initial class before animation */
  initialClass?: string;
}

/**
 * Simplified hook for adding animations when elements come into view.
 * 
 * @param options - Configuration options
 * @returns Object containing ref and current className
 * 
 * @example
 * const { ref, className } = useInViewAnimation({
 *   animationClass: 'animate-fade-in',
 *   initialClass: 'opacity-0',
 *   triggerOnce: true
 * });
 * 
 * return <div ref={ref} className={className}>Content</div>;
 */
export function useInViewAnimation(
  options: UseInViewAnimationOptions = {}
): { ref: (node: Element | null) => void; className: string; isInView: boolean } {
  const {
    animationClass = 'animate-fade-in',
    initialClass = 'opacity-0',
    ...observerOptions
  } = options;

  const { ref, isIntersecting } = useIntersectionObserver({
    triggerOnce: true,
    threshold: 0.1,
    ...observerOptions
  });

  const className = isIntersecting ? animationClass : initialClass;

  return { ref, className, isInView: isIntersecting };
}

export default useIntersectionObserver;
