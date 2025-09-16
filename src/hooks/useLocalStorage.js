// Custom hook for localStorage with React state synchronization
import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for localStorage with automatic state synchronization
 * @param {string} key - localStorage key
 * @param {any} initialValue - Initial value if key doesn't exist
 * @returns {Array} [value, setValue, removeValue]
 */
export const useLocalStorage = (key, initialValue) => {
  // Get value from localStorage or use initial value
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Set value in both state and localStorage
  const setValue = useCallback((value) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      
      setStoredValue(valueToStore);
      
      if (valueToStore === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // Remove value from both state and localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Listen for changes to localStorage from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue));
        } catch (error) {
          console.warn(`Error parsing localStorage value for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key]);

  return [storedValue, setValue, removeValue];
};

/**
 * Custom hook for localStorage with expiration
 * @param {string} key - localStorage key
 * @param {any} initialValue - Initial value if key doesn't exist
 * @param {number} ttl - Time to live in milliseconds
 * @returns {Array} [value, setValue, removeValue, isExpired]
 */
export const useLocalStorageWithExpiry = (key, initialValue, ttl = 24 * 60 * 60 * 1000) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      if (!item) return initialValue;

      const parsedItem = JSON.parse(item);
      
      // Check if item has expiry and if it's expired
      if (parsedItem.expiry && Date.now() > parsedItem.expiry) {
        window.localStorage.removeItem(key);
        return initialValue;
      }
      
      return parsedItem.value;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const [isExpired, setIsExpired] = useState(false);

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      const item = {
        value: valueToStore,
        expiry: Date.now() + ttl
      };
      
      setStoredValue(valueToStore);
      setIsExpired(false);
      
      if (valueToStore === undefined) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, JSON.stringify(item));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue, ttl]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      setIsExpired(true);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Check for expiry periodically
  useEffect(() => {
    const checkExpiry = () => {
      try {
        const item = window.localStorage.getItem(key);
        if (item) {
          const parsedItem = JSON.parse(item);
          if (parsedItem.expiry && Date.now() > parsedItem.expiry) {
            removeValue();
          }
        }
      } catch (error) {
        console.warn(`Error checking expiry for localStorage key "${key}":`, error);
      }
    };

    const interval = setInterval(checkExpiry, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [key, removeValue]);

  return [storedValue, setValue, removeValue, isExpired];
};

/**
 * Custom hook for localStorage array manipulation
 * @param {string} key - localStorage key
 * @param {Array} initialValue - Initial array value
 * @returns {object} Array manipulation methods
 */
export const useLocalStorageArray = (key, initialValue = []) => {
  const [array, setArray] = useLocalStorage(key, initialValue);

  const addItem = useCallback((item) => {
    setArray(prev => [...prev, item]);
  }, [setArray]);

  const removeItem = useCallback((index) => {
    setArray(prev => prev.filter((_, i) => i !== index));
  }, [setArray]);

  const removeItemByValue = useCallback((value) => {
    setArray(prev => prev.filter(item => item !== value));
  }, [setArray]);

  const updateItem = useCallback((index, newItem) => {
    setArray(prev => prev.map((item, i) => i === index ? newItem : item));
  }, [setArray]);

  const clearArray = useCallback(() => {
    setArray([]);
  }, [setArray]);

  const findItem = useCallback((predicate) => {
    return array.find(predicate);
  }, [array]);

  const findIndex = useCallback((predicate) => {
    return array.findIndex(predicate);
  }, [array]);

  return {
    array,
    setArray,
    addItem,
    removeItem,
    removeItemByValue,
    updateItem,
    clearArray,
    findItem,
    findIndex,
    length: array.length,
    isEmpty: array.length === 0
  };
};

/**
 * Custom hook for localStorage object manipulation
 * @param {string} key - localStorage key
 * @param {object} initialValue - Initial object value
 * @returns {object} Object manipulation methods
 */
export const useLocalStorageObject = (key, initialValue = {}) => {
  const [object, setObject] = useLocalStorage(key, initialValue);

  const updateProperty = useCallback((property, value) => {
    setObject(prev => ({ ...prev, [property]: value }));
  }, [setObject]);

  const removeProperty = useCallback((property) => {
    setObject(prev => {
      const newObj = { ...prev };
      delete newObj[property];
      return newObj;
    });
  }, [setObject]);

  const hasProperty = useCallback((property) => {
    return Object.prototype.hasOwnProperty.call(object, property);
  }, [object]);

  const getProperty = useCallback((property, defaultValue = null) => {
    return object[property] ?? defaultValue;
  }, [object]);

  const clearObject = useCallback(() => {
    setObject({});
  }, [setObject]);

  const mergeObject = useCallback((newProperties) => {
    setObject(prev => ({ ...prev, ...newProperties }));
  }, [setObject]);

  return {
    object,
    setObject,
    updateProperty,
    removeProperty,
    hasProperty,
    getProperty,
    clearObject,
    mergeObject,
    keys: Object.keys(object),
    values: Object.values(object),
    isEmpty: Object.keys(object).length === 0
  };
};