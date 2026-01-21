import axios from 'axios';
import { API_BASE_URL } from './config';
// Remove circular dependency - token management is now handled internally

// Flag to prevent multiple simultaneous redirects
let isRedirecting = false;

// Token expiry cache to avoid parsing JWT on every request
let tokenExpiryCache = {
  token: null,
  expiryTime: null,
  isExpiring: false
};

// Debug mode for testing error scenarios
let debugMode = {
  enabled: false,
  failBulkRegister: false,
  failBulkStatus: false,
  simulatePartialFailure: null // null, 'half', 'quarter', 'all'
};

// Expose debug mode to window for console access
if (typeof window !== 'undefined') {
  window.__DEBUG_API = {
    toggleDebugMode: () => {
      debugMode.enabled = !debugMode.enabled;
      console.log('🐛 Debug mode:', debugMode.enabled ? 'ENABLED' : 'DISABLED');
    },
    failBulkRegister: () => {
      debugMode.failBulkRegister = true;
      console.log('❌ Bulk register will fail on next attempt. Reset with: window.__DEBUG_API.resetErrors()');
    },
    failBulkStatus: () => {
      debugMode.failBulkStatus = true;
      console.log('❌ Bulk status check will fail on next attempt. Reset with: window.__DEBUG_API.resetErrors()');
    },
    simulatePartialFailure: (type = 'half') => {
      debugMode.simulatePartialFailure = type; // 'half', 'quarter', 'all'
      console.log(`📊 Simulating ${type} failure rate on next bulk register. Reset with: window.__DEBUG_API.resetErrors()`);
    },
    resetErrors: () => {
      debugMode.failBulkRegister = false;
      debugMode.failBulkStatus = false;
      debugMode.simulatePartialFailure = null;
      console.log('✅ All debug errors reset');
    },
    getDebugState: () => {
      console.log('🐛 Debug State:', debugMode);
      return debugMode;
    }
  };
  console.log('🐛 Debug API available at window.__DEBUG_API');
}

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request interceptor to add auth token to requests
apiClient.interceptors.request.use(
  (config) => {
    // If data is FormData, remove Content-Type header to let axios set it with proper boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
      console.log('📤 FormData detected - removed Content-Type header to allow axios to set boundary');
    }

    const token = localStorage.getItem('authToken');
    if (token) {
      // Use cached token expiry to avoid JWT parsing overhead
      let isExpiring = false;

      // Only parse JWT if token has changed
      if (tokenExpiryCache.token !== token) {
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            const now = Math.floor(Date.now() / 1000);

            // Cache token and its expiry status
            tokenExpiryCache.token = token;
            tokenExpiryCache.expiryTime = payload.exp;
            tokenExpiryCache.isExpiring = payload.exp && payload.exp < (now + 300);
          }
        } catch (error) {
          console.warn('Error parsing JWT token:', error);
          // Allow request even if parsing fails
        }
      }

      // Use cached expiry status
      if (!tokenExpiryCache.isExpiring && token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (tokenExpiryCache.isExpiring) {
        // Recalculate if cached expiry time is in the past
        const now = Math.floor(Date.now() / 1000);
        if (tokenExpiryCache.expiryTime && tokenExpiryCache.expiryTime < (now + 300)) {
          console.warn('Auth token is expired or expiring soon');
          // Don't set Authorization header for expired tokens
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }

    // Log the outgoing request for debugging
    console.log('🌐 Outgoing API request:', {
      method: config.method?.toUpperCase() || 'GET',
      url: config.url,
      headers: config.headers,
      hasAuth: !!config.headers.Authorization,
      params: config.params
    });

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => {
    // Handle successful responses
    return response.data;
  },
  async (error) => {
    // Handle response errors
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const { status, data } = error.response;
      
      // Handle specific status codes
      if (status === 401) {
        // Unauthorized - clear auth data
        // Only redirect if not already on login page or public pages to prevent refresh loop
        const currentPath = window.location.pathname.toLowerCase();
        const publicPages = ['/login', '/school-lookup', '/register', '/'];
        const isPublicPage = publicPages.some(page => currentPath === page || currentPath.startsWith(page + '/'));

        console.log('🔐 401 Unauthorized - Current path:', currentPath, 'Is public page:', isPublicPage);

        if (!isPublicPage && !isRedirecting) {
          console.log('Redirecting to login from:', currentPath);
          isRedirecting = true;
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');

          // Use setTimeout to ensure this happens after current promise chain completes
          // This prevents race conditions in Chrome
          setTimeout(() => {
            window.location.href = '/login';
          }, 100);
        } else if (isPublicPage) {
          console.log('Suppressing redirect on public page:', currentPath);
        } else if (isRedirecting) {
          console.log('Redirect already in progress, skipping duplicate redirect');
        }
      } else if (status === 403) {
        // Forbidden - user doesn't have permission
        console.error('Forbidden: You do not have permission to perform this action');
      } else if (status === 404) {
        // Not found
        console.error('Resource not found');
      } else if (status === 500) {
        // Server error
        console.error('Server error occurred');
      }
      
      // Return error with status and message
      return Promise.reject({
        status,
        message: data?.message || 'An error occurred',
        errors: data?.errors,
        data: data?.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from server. Please check your internet connection.');
      
      return Promise.reject({
        status: 0,
        message: 'No response received from server. Please check your internet connection.'
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
      return Promise.reject({
        status: -1,
        message: error.message || 'Error setting up request'
      });
    }
  }
);

/**
 * Make a GET request
 * @param {string} url - The URL to make the request to
 * @param {Object} params - Query parameters
 * @param {Object} headers - Custom headers
 * @returns {Promise<Object>} The response data
 */
export const get = async (url, params = {}, headers = {}) => {
  try {
    const response = await apiClient.get(url, { params, headers });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Make a POST request
 * @param {string} url - The URL to make the request to
 * @param {Object} data - The data to send
 * @param {Object} params - Query parameters
 * @param {Object} headers - Custom headers
 * @returns {Promise<Object>} The response data
 */
export const post = async (url, data = {}, params = {}, headers = {}) => {
  try {
    const response = await apiClient.post(url, data, { params, headers });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Make a PUT request
 * @param {string} url - The URL to make the request to
 * @param {Object} data - The data to send
 * @param {Object} params - Query parameters
 * @param {Object} headers - Custom headers
 * @returns {Promise<Object>} The response data
 */
export const put = async (url, data = {}, params = {}, headers = {}) => {
  try {
    const response = await apiClient.put(url, data, { params, headers });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Make a PATCH request
 * @param {string} url - The URL to make the request to
 * @param {Object} data - The data to send
 * @param {Object} params - Query parameters
 * @param {Object} headers - Custom headers
 * @returns {Promise<Object>} The response data
 */
export const patch = async (url, data = {}, params = {}, headers = {}) => {
  try {
    const response = await apiClient.patch(url, data, { params, headers });
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Make a DELETE request
 * @param {string} url - The URL to make the request to
 * @param {Object} data - Request body data or query parameters
 * @param {Object} headers - Custom headers
 * @returns {Promise<Object>} The response data
 */
export const del = async (url, data = {}, headers = {}) => {
  try {
    const config = { headers };

    // If data is provided, send it as request body
    // Otherwise, treat it as query parameters for backwards compatibility
    if (data && Object.keys(data).length > 0) {
      config.data = data;
    }

    const response = await apiClient.delete(url, config);
    return response;
  } catch (error) {
    throw error;
  }
};

/**
 * Make a file upload request
 * @param {string} url - The URL to upload the file to
 * @param {File} file - The file to upload
 * @param {string} fieldName - The field name for the file (default: 'file')
 * @param {Object} data - Additional form data to send
 * @param {Function} onUploadProgress - Progress callback
 * @returns {Promise<Object>} The response data
 */
export const uploadFile = async (url, file, fieldName = 'file', data = {}, onUploadProgress = null) => {
  const formData = new FormData();

  // Verify file exists and is valid
  if (!file) {
    throw new Error('No file provided for upload');
  }

  console.log(`📤 Preparing file upload: ${fieldName}`, {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    url: url
  });

  formData.append(fieldName, file);

  // Append additional data to form data
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const config = {
    // Don't explicitly set Content-Type header - let axios detect FormData and set proper boundary
    headers: {},
  };

  if (onUploadProgress) {
    config.onUploadProgress = onUploadProgress;
  }

  try {
    const response = await apiClient.post(url, formData, config);
    return response;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Upload file using PATCH method (for legacy endpoints that expect PATCH)
 * @param {string} url - The API endpoint URL
 * @param {File} file - The file to upload
 * @param {string} fieldName - The form field name for the file
 * @param {Object} data - Additional form data
 * @param {Function} onUploadProgress - Upload progress callback
 * @returns {Promise<Object>} The response data
 */
export const uploadFilePatch = async (url, file, fieldName = 'file', data = {}, onUploadProgress = null) => {
  const formData = new FormData();

  // Verify file exists and is valid
  if (!file) {
    throw new Error('No file provided for upload');
  }

  console.log(`📤 Preparing file upload (PATCH): ${fieldName}`, {
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    url: url
  });

  formData.append(fieldName, file);

  // Append additional data to form data
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });

  const config = {
    // Don't explicitly set Content-Type header - let axios detect FormData and set proper boundary
    headers: {},
  };

  if (onUploadProgress) {
    config.onUploadProgress = onUploadProgress;
  }

  try {
    const response = await apiClient.patch(url, formData, config);
    return response;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};

/**
 * Handle API response with consistent error handling
 * @param {Function} apiCall - The API call function to execute
 * @returns {Promise<Object>} Standardized response object
 */
export const handleApiResponse = async (apiCall) => {
  try {
    console.log('🚀 Making API call:', apiCall.toString());
    const response = await apiCall();
    console.log('📥 API response received:', response);
    return {
      success: true,
      data: response
    };
  } catch (error) {
    console.error('❌ API call failed:', error);
    return {
      success: false,
      error: error.message || 'An error occurred',
      status: error.status,
      errors: error.errors // Pass through detailed validation errors
    };
  }
};

/**
 * Token management utilities
 */
export const tokenManager = {
  /**
   * Set authentication token
   * @param {string} token - JWT token
   */
  setToken: (token) => {
    localStorage.setItem('authToken', token);
    // Clear token expiry cache when token is updated
    tokenExpiryCache = {
      token: null,
      expiryTime: null,
      isExpiring: false
    };
  },

  /**
   * Get authentication token
   * @returns {string|null} JWT token or null
   */
  getToken: () => {
    return localStorage.getItem('authToken');
  },

  /**
   * Remove authentication token
   */
  removeToken: () => {
    localStorage.removeItem('authToken');
    // Clear token expiry cache
    tokenExpiryCache = {
      token: null,
      expiryTime: null,
      isExpiring: false
    };
  },

  /**
   * Check if token exists
   * @returns {boolean} Whether token exists
   */
  hasToken: () => {
    return !!localStorage.getItem('authToken');
  }
};


export { apiClient as apiClient_ };
export default apiClient;