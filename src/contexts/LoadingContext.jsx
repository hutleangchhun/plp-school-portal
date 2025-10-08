import React, { createContext, useContext, useState, useCallback } from 'react';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState(new Map());
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalMessage, setGlobalMessage] = useState('');

  // Start loading for a specific key
  const startLoading = useCallback((key, message = '') => {
    setLoadingStates(prev => new Map(prev.set(key, { loading: true, message })));
  }, []);

  // Stop loading for a specific key
  const stopLoading = useCallback((key) => {
    setLoadingStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  // Check if a specific key is loading
  const isLoading = useCallback((key) => {
    return loadingStates.has(key) && loadingStates.get(key).loading;
  }, [loadingStates]);

  // Get loading message for a specific key
  const getLoadingMessage = useCallback((key) => {
    return loadingStates.get(key)?.message || '';
  }, [loadingStates]);

  // Start global loading
  const startGlobalLoading = useCallback((message = '') => {
    setGlobalLoading(true);
    setGlobalMessage(message);
  }, []);

  // Stop global loading
  const stopGlobalLoading = useCallback(() => {
    setGlobalLoading(false);
    setGlobalMessage('');
  }, []);

  // Check if any loading is active
  const hasAnyLoading = loadingStates.size > 0 || globalLoading;

  const value = {
    // Local loading states
    startLoading,
    stopLoading,
    isLoading,
    getLoadingMessage,
    loadingStates,

    // Global loading state
    startGlobalLoading,
    stopGlobalLoading,
    isGlobalLoading: globalLoading,
    loadingMessage: globalMessage,

    // Utility
    hasAnyLoading
  };

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
};

export default LoadingContext;