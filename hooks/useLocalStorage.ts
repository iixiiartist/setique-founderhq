import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Options for useLocalStorage hook
 */
export interface UseLocalStorageOptions<T> {
  /** Custom serializer function */
  serializer?: (value: T) => string;
  /** Custom deserializer function */
  deserializer?: (value: string) => T;
  /** Sync state across tabs/windows */
  syncTabs?: boolean;
}

/**
 * Hook for persisting state to localStorage with automatic serialization.
 * Syncs across tabs if syncTabs option is enabled.
 * 
 * @param key - The localStorage key
 * @param initialValue - Initial value if no stored value exists
 * @param options - Configuration options
 * @returns [storedValue, setValue, removeValue]
 * 
 * @example
 * // Basic usage
 * const [theme, setTheme] = useLocalStorage('theme', 'light');
 * 
 * @example
 * // With complex object
 * const [user, setUser] = useLocalStorage<User | null>('user', null);
 * 
 * @example
 * // With tab sync
 * const [cart, setCart] = useLocalStorage('cart', [], { syncTabs: true });
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions<T> = {}
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    syncTabs = false
  } = options;

  // Store serializer/deserializer in refs to avoid dependency issues
  const serializerRef = useRef(serializer);
  serializerRef.current = serializer;
  
  const deserializerRef = useRef(deserializer);
  deserializerRef.current = deserializer;

  // Get initial value from localStorage or use provided initial value
  const getStoredValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      if (item !== null) {
        return deserializerRef.current(item);
      }
      return initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(getStoredValue);

  // Update localStorage when state changes
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue(prev => {
        const newValue = value instanceof Function ? value(prev) : value;
        
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, serializerRef.current(newValue));
        }
        
        return newValue;
      });
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key]);

  // Remove item from localStorage
  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Sync across tabs when syncTabs is enabled
  useEffect(() => {
    if (!syncTabs || typeof window === 'undefined') {
      return;
    }

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(deserializerRef.current(event.newValue));
        } catch (error) {
          console.warn(`Error syncing localStorage key "${key}":`, error);
        }
      } else if (event.key === key && event.newValue === null) {
        setStoredValue(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue, syncTabs]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for sessionStorage (same API as useLocalStorage but uses sessionStorage)
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T,
  options: Omit<UseLocalStorageOptions<T>, 'syncTabs'> = {}
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse
  } = options;

  const serializerRef = useRef(serializer);
  serializerRef.current = serializer;
  
  const deserializerRef = useRef(deserializer);
  deserializerRef.current = deserializer;

  const getStoredValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      if (item !== null) {
        return deserializerRef.current(item);
      }
      return initialValue;
    } catch (error) {
      console.warn(`Error reading sessionStorage key "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(getStoredValue);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setStoredValue(prev => {
        const newValue = value instanceof Function ? value(prev) : value;
        
        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(key, serializerRef.current(newValue));
        }
        
        return newValue;
      });
    } catch (error) {
      console.warn(`Error setting sessionStorage key "${key}":`, error);
    }
  }, [key]);

  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
      }
      setStoredValue(initialValue);
    } catch (error) {
      console.warn(`Error removing sessionStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

export default useLocalStorage;
