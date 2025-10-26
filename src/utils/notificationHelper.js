/**
 * Notification Helper Utility
 * Provides standardized success and error notification handling across the entire project
 */

/**
 * Get a reference to the toast context (populated dynamically when needed)
 * This avoids circular dependencies
 */
let toastContextRef = null;

export const setToastContext = (context) => {
  toastContextRef = context;
};

/**
 * Get the current toast context
 */
const getToastContext = () => {
  if (!toastContextRef) {
    console.warn('Toast context not initialized. Make sure setToastContext was called.');
    return null;
  }
  return toastContextRef;
};

/**
 * Show a success notification
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the notification (ms)
 */
export const notifySuccess = (message, duration = 4000) => {
  const context = getToastContext();
  if (context && context.showSuccess) {
    context.showSuccess(message, duration);
  } else {
    console.log('✓ Success:', message);
  }
};

/**
 * Show an error notification
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the notification (ms)
 */
export const notifyError = (message, duration = 5000) => {
  const context = getToastContext();
  if (context && context.showError) {
    context.showError(message, duration);
  } else {
    console.error('✗ Error:', message);
  }
};

/**
 * Show a warning notification
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the notification (ms)
 */
export const notifyWarning = (message, duration = 4000) => {
  const context = getToastContext();
  if (context && context.showWarning) {
    context.showWarning(message, duration);
  } else {
    console.warn('⚠ Warning:', message);
  }
};

/**
 * Show an info notification
 * @param {string} message - The message to display
 * @param {number} duration - How long to show the notification (ms)
 */
export const notifyInfo = (message, duration = 3000) => {
  const context = getToastContext();
  if (context && context.showInfo) {
    context.showInfo(message, duration);
  } else {
    console.info('ℹ Info:', message);
  }
};

/**
 * Handle API call success with automatic notification
 * @param {*} response - The API response
 * @param {string} successMessage - Custom success message (uses response message if not provided)
 */
export const handleSuccessResponse = (response, successMessage = null) => {
  const message = successMessage || response?.message || 'Operation completed successfully';
  notifySuccess(message);
  return response;
};

/**
 * Handle API call error with automatic notification
 * @param {Error} error - The error object
 * @param {string} fallbackMessage - Fallback message if error has no message
 */
export const handleErrorResponse = (error, fallbackMessage = 'An error occurred') => {
  let message = fallbackMessage;

  if (error) {
    // Try to extract message from different error structures
    message = error.response?.data?.message ||
              error.response?.statusText ||
              error.message ||
              fallbackMessage;
  }

  notifyError(message);
  return error;
};

/**
 * Wrapper for async API calls with automatic notification
 * @param {Function} apiCall - The async function to execute
 * @param {Object} options - Configuration options
 */
export const executeWithNotification = async (apiCall, options = {}) => {
  const {
    successMessage = 'Operation completed successfully',
    errorMessage = 'An error occurred',
    showLoader = false,
    onSuccess = null,
    onError = null,
    context = null // For loading context
  } = options;

  if (showLoader && context?.startLoading) {
    context.startLoading('operation', 'Processing...');
  }

  try {
    const result = await apiCall();
    notifySuccess(successMessage);

    if (onSuccess) {
      onSuccess(result);
    }

    return result;
  } catch (error) {
    const message = error.response?.data?.message || error.message || errorMessage;
    notifyError(message);

    if (onError) {
      onError(error);
    }

    throw error;
  } finally {
    if (showLoader && context?.stopLoading) {
      context.stopLoading('operation');
    }
  }
};

/**
 * Bulk operation notification wrapper
 * Shows success/error notifications for bulk operations with item count
 */
export const notifyBulkOperation = (success, total, failedCount = 0) => {
  if (failedCount > 0) {
    notifyWarning(
      `Operation completed: ${success} succeeded, ${failedCount} failed out of ${total}`,
      6000
    );
  } else {
    notifySuccess(
      `Successfully processed ${total} item${total !== 1 ? 's' : ''}`,
      4000
    );
  }
};

/**
 * Common notification messages
 */
export const NOTIFICATION_MESSAGES = {
  // Success messages
  CREATED: 'Created successfully',
  UPDATED: 'Updated successfully',
  DELETED: 'Deleted successfully',
  SAVED: 'Saved successfully',
  SENT: 'Sent successfully',
  APPROVED: 'Approved successfully',
  REJECTED: 'Rejected successfully',
  MARKED: 'Marked successfully',
  LOADED: 'Loaded successfully',
  IMPORTED: 'Imported successfully',
  EXPORTED: 'Exported successfully',
  COPIED: 'Copied to clipboard',
  RESTORED: 'Restored successfully',
  SYNCED: 'Synced successfully',

  // Error messages
  FAILED_TO_CREATE: 'Failed to create item',
  FAILED_TO_UPDATE: 'Failed to update item',
  FAILED_TO_DELETE: 'Failed to delete item',
  FAILED_TO_SAVE: 'Failed to save changes',
  FAILED_TO_SEND: 'Failed to send',
  FAILED_TO_LOAD: 'Failed to load data',
  FAILED_TO_IMPORT: 'Failed to import',
  FAILED_TO_EXPORT: 'Failed to export',
  FAILED_TO_FETCH: 'Failed to fetch data',
  NETWORK_ERROR: 'Network error. Please check your connection',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  FORBIDDEN: 'Access denied',
  NOT_FOUND: 'Item not found',
  VALIDATION_ERROR: 'Please check your input and try again',
  SERVER_ERROR: 'Server error. Please try again later',

  // Info messages
  LOADING: 'Loading...',
  PROCESSING: 'Processing...',
  PLEASE_WAIT: 'Please wait...',
  NO_CHANGES: 'No changes made',
  ALREADY_DONE: 'This action has already been completed'
};

/**
 * Get appropriate error message based on error code or type
 */
export const getErrorMessage = (error, customMap = {}) => {
  const statusCode = error.response?.status;
  const errorMessage = error.response?.data?.message || error.message;

  // Check custom mappings first
  if (customMap[statusCode] || customMap[error.code]) {
    return customMap[statusCode] || customMap[error.code];
  }

  // Map HTTP status codes to messages
  const statusMessageMap = {
    400: NOTIFICATION_MESSAGES.VALIDATION_ERROR,
    401: NOTIFICATION_MESSAGES.UNAUTHORIZED,
    403: NOTIFICATION_MESSAGES.FORBIDDEN,
    404: NOTIFICATION_MESSAGES.NOT_FOUND,
    500: NOTIFICATION_MESSAGES.SERVER_ERROR,
    503: 'Service temporarily unavailable'
  };

  // Return mapped message or fall back to error message
  return statusMessageMap[statusCode] || errorMessage || NOTIFICATION_MESSAGES.FAILED_TO_FETCH;
};

export default {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
  handleSuccessResponse,
  handleErrorResponse,
  executeWithNotification,
  notifyBulkOperation,
  getErrorMessage,
  NOTIFICATION_MESSAGES,
  setToastContext,
  getToastContext
};
