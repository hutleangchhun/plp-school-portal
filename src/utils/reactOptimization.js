/**
 * React Performance Optimization Utilities
 * Prevents infinite loops, reduces re-renders, and improves React performance
 */

import { useCallback, useMemo, useRef, useEffect } from 'react';

/**
 * Custom hook to prevent function recreation on every render
 * Use this for functions passed to useEffect dependencies
 * @param {Function} fn - Function to stabilize
 * @param {Array} deps - Dependencies for the function
 * @returns {Function} Stable function reference
 */
export const useStableCallback = (fn, deps = []) => {
  const callbackRef = useRef(fn);
  
  // Update the ref when dependencies change
  useEffect(() => {
    callbackRef.current = fn;
  });
  
  // Return a stable callback that uses the ref
  return useCallback((...args) => callbackRef.current(...args), deps);
};

/**
 * Custom hook for debounced effects to prevent rapid re-renders
 * @param {Function} effect - Effect function to debounce
 * @param {Array} deps - Dependencies
 * @param {number} delay - Debounce delay in milliseconds
 */
export const useDebouncedEffect = (effect, deps, delay = 300) => {
  useEffect(() => {
    const timer = setTimeout(effect, delay);
    return () => clearTimeout(timer);
  }, [...deps, delay]);
};

/**
 * Custom hook to prevent object recreation causing infinite loops
 * @param {Object} obj - Object to memoize
 * @returns {Object} Stable object reference
 */
export const useStableObject = (obj) => {
  const serialized = JSON.stringify(obj);
  return useMemo(() => obj, [serialized]);
};

/**
 * Custom hook to prevent array recreation causing infinite loops
 * @param {Array} arr - Array to memoize
 * @returns {Array} Stable array reference
 */
export const useStableArray = (arr) => {
  const serialized = JSON.stringify(arr);
  return useMemo(() => arr, [serialized]);
};

/**
 * Custom hook for one-time effects that should never re-run
 * Useful for initialization that shouldn't depend on any values
 * @param {Function} effect - Effect to run once
 */
export const useOnceEffect = (effect) => {
  const hasRun = useRef(false);
  
  useEffect(() => {
    if (!hasRun.current) {
      hasRun.current = true;
      effect();
    }
  }, []);
};

/**
 * Custom hook to track render count and detect excessive re-renders
 * @param {string} componentName - Name of component for debugging
 */
export const useRenderTracker = (componentName) => {
  const renderCount = useRef(0);
  const componentNameRef = useRef(componentName);
  
  useEffect(() => {
    renderCount.current += 1;
    const count = renderCount.current;
    const name = componentNameRef.current;
    
    if (count > 10 && count <= 20) {
      console.warn(`⚠️ Component ${name} has rendered ${count} times. Check for infinite loops!`);
    }
    
    if (count > 20) {
      console.error(`🚨 Component ${name} has rendered ${count} times. INFINITE LOOP DETECTED!`);
    }
  });
  
  return renderCount.current;
};

/**
 * Custom hook for async operations with cleanup
 * Prevents setState on unmounted components
 * @param {Function} asyncFn - Async function to execute
 * @param {Array} deps - Dependencies
 */
export const useAsyncEffect = (asyncFn, deps) => {
  useEffect(() => {
    let cancelled = false;
    
    const execute = async () => {
      try {
        await asyncFn(() => cancelled);
      } catch (error) {
        if (!cancelled) {
          console.error('Async effect error:', error);
        }
      }
    };
    
    execute();
    
    return () => {
      cancelled = true;
    };
  }, deps);
};

/**
 * Performance monitoring utilities
 */
export const PerformanceMonitor = {
  /**
   * Start monitoring a component's performance
   * @param {string} componentName - Component name
   */
  startMonitoring: (componentName) => {
    const startTime = performance.now();
    console.log(`🚀 ${componentName} render started`);
    
    return {
      end: () => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (duration > 100) {
          console.warn(`⚠️ ${componentName} took ${duration.toFixed(2)}ms to render (slow)`);
        } else {
          console.log(`✅ ${componentName} rendered in ${duration.toFixed(2)}ms`);
        }
      }
    };
  },
  
  /**
   * Monitor API call performance
   * @param {string} apiName - API call name
   * @param {Function} apiCall - API function
   */
  monitorAPI: async (apiName, apiCall) => {
    const startTime = performance.now();
    console.log(`📡 ${apiName} API call started`);
    
    try {
      const result = await apiCall();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (duration > 2000) {
        console.warn(`⚠️ ${apiName} took ${duration.toFixed(2)}ms (slow API)`);
      } else {
        console.log(`✅ ${apiName} completed in ${duration.toFixed(2)}ms`);
      }
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      console.error(`❌ ${apiName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }
};