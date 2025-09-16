// Custom hook for API calls with loading states and error handling
import { useState, useCallback } from 'react';
import { handleError } from '../utils/errorHandler';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';

/**
 * Custom hook for handling API calls with loading states
 * @param {Function} apiFunction - The API function to call
 * @param {object} options - Configuration options
 * @returns {object} API call state and functions
 */
export const useApiCall = (apiFunction, options = {}) => {
  const {
    initialData = null,
    onSuccess = null,
    onError = null,
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = null,
    retries = 0,
    cache = false
  } = options;
  
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  
  const { showToast } = useToast();
  const { t } = useLanguage();
  
  // Cache for API responses (simple in-memory cache)
  const [cacheData, setCacheData] = useState(new Map());
  
  const execute = useCallback(async (...args) => {
    // Check cache if enabled
    if (cache) {
      const cacheKey = JSON.stringify(args);
      const cachedResult = cacheData.get(cacheKey);
      if (cachedResult && Date.now() - cachedResult.timestamp < 5 * 60 * 1000) { // 5 minutes cache
        setData(cachedResult.data);
        return cachedResult.data;
      }
    }
    
    setLoading(true);
    setError(null);
    
    let attempt = 0;
    const maxAttempts = retries + 1;
    
    while (attempt < maxAttempts) {
      try {
        const result = await apiFunction(...args);
        
        setData(result);
        setLastFetch(new Date());
        setError(null);
        
        // Cache result if enabled
        if (cache) {
          const cacheKey = JSON.stringify(args);
          setCacheData(prev => new Map(prev).set(cacheKey, {
            data: result,
            timestamp: Date.now()
          }));
        }
        
        // Show success toast if configured
        if (showSuccessToast && successMessage) {
          showToast({
            type: 'success',
            message: typeof successMessage === 'function' ? successMessage(result) : successMessage
          });
        }
        
        // Call success callback
        if (onSuccess) {
          onSuccess(result);
        }
        
        setLoading(false);
        return result;
        
      } catch (err) {
        attempt++;
        
        if (attempt === maxAttempts) {
          // Final attempt failed
          const parsedError = handleError(err, showErrorToast ? showToast : null, t, 'useApiCall');
          setError(parsedError);
          
          // Call error callback
          if (onError) {
            onError(parsedError);
          }
          
          setLoading(false);
          throw err;
        }
        
        // Wait before retry (exponential backoff)
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
  }, [apiFunction, showToast, t, onSuccess, onError, showSuccessToast, showErrorToast, successMessage, retries, cache, cacheData]);
  
  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
    setLastFetch(null);
  }, [initialData]);
  
  const clearCache = useCallback(() => {
    setCacheData(new Map());
  }, []);
  
  return {
    data,
    loading,
    error,
    lastFetch,
    execute,
    reset,
    clearCache,
    isSuccess: !loading && !error && data !== null,
    isEmpty: !loading && !error && (data === null || (Array.isArray(data) && data.length === 0))
  };
};

/**
 * Custom hook for paginated API calls
 * @param {Function} apiFunction - The API function to call
 * @param {object} options - Configuration options
 * @returns {object} Paginated API state and functions
 */
export const usePaginatedApiCall = (apiFunction, options = {}) => {
  const {
    initialPage = 1,
    initialLimit = 10,
    ...apiOptions
  } = options;
  
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  const apiCall = useApiCall(
    async (...args) => {
      const result = await apiFunction({ page, limit, ...args[0] });
      
      // Update pagination info
      if (result.pagination) {
        setTotalItems(result.pagination.total || 0);
        setTotalPages(result.pagination.totalPages || 0);
      }
      
      return result;
    },
    apiOptions
  );
  
  const goToPage = useCallback((newPage) => {
    setPage(newPage);
  }, []);
  
  const changeLimit = useCallback((newLimit) => {
    setLimit(newLimit);
    setPage(1); // Reset to first page when changing limit
  }, []);
  
  const refresh = useCallback(() => {
    return apiCall.execute();
  }, [apiCall]);
  
  return {
    ...apiCall,
    page,
    limit,
    totalItems,
    totalPages,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1
    },
    goToPage,
    changeLimit,
    refresh
  };
};

/**
 * Custom hook for infinite scroll API calls
 * @param {Function} apiFunction - The API function to call
 * @param {object} options - Configuration options
 * @returns {object} Infinite scroll API state and functions
 */
export const useInfiniteApiCall = (apiFunction, options = {}) => {
  const { initialLimit = 10, ...apiOptions } = options;
  
  const [allData, setAllData] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [limit] = useState(initialLimit);
  
  const apiCall = useApiCall(
    async (...args) => {
      const result = await apiFunction({ page, limit, ...args[0] });
      
      // Append new data to existing data
      if (page === 1) {
        setAllData(result.data || []);
      } else {
        setAllData(prev => [...prev, ...(result.data || [])]);
      }
      
      // Check if there's more data
      setHasMore(result.hasMore || (result.data && result.data.length === limit));
      
      return result;
    },
    apiOptions
  );
  
  const loadMore = useCallback(() => {
    if (!apiCall.loading && hasMore) {
      setPage(prev => prev + 1);
      return apiCall.execute();
    }
  }, [apiCall, hasMore]);
  
  const refresh = useCallback(() => {
    setPage(1);
    setAllData([]);
    setHasMore(true);
    return apiCall.execute();
  }, [apiCall]);
  
  return {
    ...apiCall,
    data: allData,
    loadMore,
    refresh,
    hasMore,
    isLoadingMore: apiCall.loading && page > 1
  };
};