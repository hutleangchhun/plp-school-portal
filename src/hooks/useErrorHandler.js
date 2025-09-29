import { useState, useCallback } from 'react';
import { useToast } from '../contexts/ToastContext';
import { useLanguage } from '../contexts/LanguageContext';

export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const { showError } = useToast();
  const { t } = useLanguage();

  const handleError = useCallback((err, options = {}) => {
    console.error('useErrorHandler: Error occurred:', err);
    console.log('useErrorHandler: Error details:', {
      message: err.message,
      response: err.response,
      code: err.code,
      options
    });
    
    // Determine error type
    let errorType = 'general';
    if (err.response?.status === 401 || err.response?.status === 403) {
      errorType = 'auth';
    } else if (err.response?.status >= 500) {
      errorType = 'server';
    } else if (err.code === 'NETWORK_ERROR' || !err.response) {
      errorType = 'network';
    }
    
    console.log('useErrorHandler: Determined error type:', errorType);

    // Create error object
    const errorObj = {
      message: err.message || t('unknownError', 'An unknown error occurred'),
      type: errorType,
      canRetry: options.canRetry !== false,
      originalError: err
    };

    // Set error state if component error display is needed
    if (options.setError !== false) {
      console.log('Setting error state for display:', errorObj);
      setError(errorObj);
    } else {
      console.log('Skipping error state display (setError: false)');
    }

    // Show toast notification if enabled
    if (options.showToast !== false) {
      const toastMessage = options.toastMessage || errorObj.message;
      showError(toastMessage);
    }

    return errorObj;
  }, [showError, t]);

  const clearError = useCallback(() => {
    console.log('useErrorHandler: Clearing error state');
    setError(null);
  }, []);

  const retry = useCallback((retryFn) => {
    clearError();
    if (retryFn) {
      retryFn();
    }
  }, [clearError]);

  return {
    error,
    handleError,
    clearError,
    retry
  };
};

export default useErrorHandler;