import { useState, useEffect } from "react";

/**
 * Custom hook to persist state in sessionStorage across page navigation.
 * When the user navigates between sections (e.g. Reports -> Students -> Reports),
 * the state is automatically preserved and not reset.
 */
export function usePersistentState<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key);
      if (stored !== null) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn(`Failed to read sessionStorage key "${key}":`, e);
    }
    return defaultValue;
  });

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(state));
    } catch (e) {
      console.warn(`Failed to write sessionStorage key "${key}":`, e);
    }
  }, [key, state]);

  return [state, setState];
}
