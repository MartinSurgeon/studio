"use client";

import { useState, useEffect, useCallback } from 'react';

// Helper function to get the tab ID
const getTabId = (): string => {
  // Check if we're in the browser environment
  if (typeof window === 'undefined') {
    return 'server-side';
  }
  
  // Try to get existing tab ID or create a new one
  let tabId = sessionStorage.getItem('geoattend-tab-id');
  if (!tabId) {
    tabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    sessionStorage.setItem('geoattend-tab-id', tabId);
  }
  return tabId;
};

function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // Create a tab-specific key
  const tabSpecificKey = `${typeof window !== 'undefined' ? getTabId() : 'server'}:${key}`;
  
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(tabSpecificKey);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${tabSpecificKey}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(tabSpecificKey, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${tabSpecificKey}":`, error);
    }
  }, [tabSpecificKey, storedValue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === tabSpecificKey) {
        try {
          if (event.newValue) {
            setStoredValue(JSON.parse(event.newValue));
          } else {
             //Handles case where item is removed from another tab
            setStoredValue(initialValue);
          }
        } catch (error) {
          console.error(`Error parsing localStorage change for key "${tabSpecificKey}":`, error);
          setStoredValue(initialValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [tabSpecificKey, initialValue]);


  return [storedValue, setValue];
}

export default useLocalStorage;
