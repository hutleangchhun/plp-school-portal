// Centralized error handling utilities
import { TOAST_TYPES } from '../constants';

/**
 * Custom error class for application errors
 */
export class AppError extends Error {
  constructor(message, code = 'UNKNOWN_ERROR', statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * API error class for handling API-specific errors
 */
export class ApiError extends AppError {
  constructor(message, code, statusCode, endpoint = null) {
    super(message, code, statusCode);
    this.name = 'ApiError';
    this.endpoint = endpoint;
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  constructor(message, field = null, value = null) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
    this.field = field;
    this.value = value;
  }
}

/**
 * Error codes for consistent error handling
 */
export const ERROR_CODES = {
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',

  // Authentication errors
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  REQUIRED_FIELD: 'REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Server errors
  SERVER_ERROR: 'SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Business logic errors
  OPERATION_FAILED: 'OPERATION_FAILED',
  CONSTRAINT_VIOLATION: 'CONSTRAINT_VIOLATION',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED'
};

/**
 * Parse error from different sources (API response, Error object, string)
 * @param {any} error - Error to parse
 * @param {object} t - Translation function
 * @returns {object} Parsed error object
 */
export const parseError = (error, t = null) => {
  let message = 'An unknown error occurred';
  let code = ERROR_CODES.SERVER_ERROR;
  let statusCode = 500;

  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      timestamp: error.timestamp
    };
  }

  if (error?.response) {
    // Axios error with response
    statusCode = error.response.status;

    switch (statusCode) {
      case 400:
        code = ERROR_CODES.VALIDATION_ERROR;
        message = error.response.data?.message || 'Invalid request data';
        break;
      case 401:
        code = ERROR_CODES.UNAUTHORIZED;
        message = t ? t('unauthorized') : 'You are not authorized to perform this action';
        break;
      case 403:
        code = ERROR_CODES.FORBIDDEN;
        message = t ? t('forbidden') : 'Access forbidden';
        break;
      case 404:
        code = ERROR_CODES.NOT_FOUND;
        message = t ? t('notFound') : 'Resource not found';
        break;
      case 409:
        code = ERROR_CODES.ALREADY_EXISTS;
        message = error.response.data?.message || 'Resource already exists';
        break;
      case 429:
        code = ERROR_CODES.QUOTA_EXCEEDED;
        message = t ? t('tooManyRequests') : 'Too many requests, please try again later';
        break;
      case 500:
      default:
        code = ERROR_CODES.SERVER_ERROR;
        message = t ? t('serverError') : 'Internal server error';
        break;
    }

    // Override with specific error message if available
    if (error.response.data?.message) {
      message = error.response.data.message;
    }
  } else if (error?.request) {
    // Network error
    code = ERROR_CODES.NETWORK_ERROR;
    message = t ? t('networkError') : 'Network error, please check your connection';
  } else if (error?.message) {
    // General error with message
    message = error.message;

    // Check for specific error types
    if (error.message.includes('timeout')) {
      code = ERROR_CODES.TIMEOUT_ERROR;
      message = t ? t('requestTimeout') : 'Request timed out, please try again';
    } else if (error.message.includes('network')) {
      code = ERROR_CODES.NETWORK_ERROR;
      message = t ? t('networkError') : 'Network error occurred';
    }
  } else if (typeof error === 'string') {
    message = error;
  }

  return {
    message,
    code,
    statusCode,
    type: error.type || (statusCode >= 500 ? 'server' : statusCode >= 400 ? 'client' : statusCode === 0 ? 'network' : 'unknown'),
    originalError: error,
    timestamp: new Date().toISOString()
  };
};

/**
 * Handle error and show appropriate notification
 * @param {any} error - Error to handle
 * @param {Function} showToast - Toast notification function
 * @param {object} t - Translation function
 * @param {string} context - Context where error occurred
 */
export const handleError = (error, showToast = null, t = null, context = '') => {
  const parsedError = parseError(error, t);

  // Log error for debugging
  console.error(`Error in ${context}:`, {
    ...parsedError,
    originalError: error
  });

  // Show user-friendly notification
  if (showToast) {
    showToast({
      type: TOAST_TYPES.ERROR,
      message: parsedError.message,
      duration: 5000
    });
  }

  return parsedError;
};

/**
 * Retry function with error handling
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} delay - Delay between retries in milliseconds
 * @param {Function} shouldRetry - Function to determine if error should trigger retry
 * @returns {Promise} Promise that resolves with function result
 */
export const retryWithErrorHandling = async (
  fn,
  maxRetries = 3,
  delay = 1000,
  shouldRetry = (error) => error?.response?.status >= 500
) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }

  throw lastError;
};

/**
 * Wrapper for async operations with error boundary
 * @param {Function} fn - Async function to wrap
 * @param {object} options - Options for error handling
 * @returns {Function} Wrapped function
 */
export const withErrorBoundary = (fn, options = {}) => {
  const {
    showToast = null,
    t = null,
    context = '',
    fallbackValue = null,
    rethrow = false
  } = options;

  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const parsedError = handleError(error, showToast, t, context);

      if (rethrow) {
        throw new AppError(parsedError.message, parsedError.code, parsedError.statusCode);
      }

      return fallbackValue;
    }
  };
};

/**
 * Create error message based on field validation
 * @param {string} field - Field name
 * @param {string} rule - Validation rule that failed
 * @param {object} t - Translation function
 * @returns {string} Error message
 */
export const createFieldError = (field, rule, t = null) => {
  const fieldName = t ? t(field) : field;

  switch (rule) {
    case 'required':
      return t ? t('fieldRequired', { field: fieldName }) : `${fieldName} is required`;
    case 'email':
      return t ? t('invalidEmail') : 'Please enter a valid email address';
    case 'phone':
      return t ? t('invalidPhone') : 'Please enter a valid phone number';
    case 'minLength':
      return t ? t('fieldTooShort', { field: fieldName }) : `${fieldName} is too short`;
    case 'maxLength':
      return t ? t('fieldTooLong', { field: fieldName }) : `${fieldName} is too long`;
    default:
      return t ? t('fieldInvalid', { field: fieldName }) : `${fieldName} is invalid`;
  }
};

/**
 * Global error handler for unhandled promise rejections
 */
export const setupGlobalErrorHandler = (showToast = null, t = null) => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, showToast, t, 'unhandledrejection');
    event.preventDefault(); // Prevent default browser handling
  });

  // Handle general errors
  window.addEventListener('error', (event) => {
    handleError(event.error, showToast, t, 'global');
  });
};