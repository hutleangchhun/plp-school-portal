import axios from 'axios';
import { API_BASE_URL } from './config';
// Remove circular dependency - token management is now handled internally

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
    const token = localStorage.getItem('authToken');
    if (token) {
      // Check if token is expired before making request
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          const now = Math.floor(Date.now() / 1000);
          
          // Check if token expires within the next 5 minutes (300 seconds)
          if (payload.exp && payload.exp < (now + 300)) {
            console.warn('Auth token is expired or expiring soon');
            // Don't set the Authorization header for expired tokens
            // This will trigger a 401 response which will be handled by the response interceptor
          } else {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } else {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        console.warn('Error parsing JWT token:', error);
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
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

        if (!isPublicPage) {
          console.log('Redirecting to login from:', currentPath);
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          window.location.href = '/login';
        } else {
          console.log('Suppressing redirect on public page:', currentPath);
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
 * @param {Object} params - Query parameters
 * @param {Object} headers - Custom headers
 * @returns {Promise<Object>} The response data
 */
export const del = async (url, params = {}, headers = {}) => {
  try {
    const response = await apiClient.delete(url, { params, headers });
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
  formData.append(fieldName, file);
  
  // Append additional data to form data
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };
  
  if (onUploadProgress) {
    config.onUploadProgress = onUploadProgress;
  }
  
  try {
    const response = await apiClient.post(url, formData, config);
    return response;
  } catch (error) {
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
  formData.append(fieldName, file);
  
  // Append additional data to form data
  Object.entries(data).forEach(([key, value]) => {
    formData.append(key, value);
  });
  
  const config = {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  };
  
  if (onUploadProgress) {
    config.onUploadProgress = onUploadProgress;
  }
  
  try {
    const response = await apiClient.patch(url, formData, config);
    return response;
  } catch (error) {
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
    const response = await apiCall();
    return {
      success: true,
      data: response
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'An error occurred',
      status: error.status
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