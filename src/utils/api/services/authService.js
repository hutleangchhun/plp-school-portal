import { apiClient_, handleApiResponse, tokenManager } from '../client.js';
import { ENDPOINTS } from '../config.js';
import { userUtils } from './userService.js';

/**
 * Authentication API Service
 * Handles all authentication-related API operations
 */
export const authService = {
  /**
   * Login user with credentials
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.username - Username
   * @param {string} credentials.password - Password
   * @returns {Promise<Object>} Login response with token and user data
   */
  login: async (credentials) => {
    const response = await handleApiResponse(() => 
      apiClient_.post(ENDPOINTS.AUTH.LOGIN, credentials)
    );

    // If login successful, save token and user data
    if (response.success) {
      const { accessToken, user } = response.data;
      
      // Validate user role (teachers only)
      if (user.roleId !== 8) {
        return {
          success: false,
          error: 'Only teachers and students can access this portal'
        };
      }

      tokenManager.setToken(accessToken);
      userUtils.saveUserData(user);
      
      return {
        success: true,
        data: { accessToken, user }
      };
    }

    return response;
  },

  /**
   * Logout current user
   * @returns {Promise<Object>} Logout response
   */
  logout: async () => {
    const response = await handleApiResponse(() => 
      apiClient_.post(ENDPOINTS.AUTH.LOGOUT)
    );

    // Clear local storage regardless of API response
    tokenManager.removeToken();
    userUtils.removeUserData();

    return response;
  },

  /**
   * Refresh authentication token
   * @returns {Promise<Object>} Refresh response with new token
   */
  refreshToken: async () => {
    const response = await handleApiResponse(() => 
      apiClient_.post(ENDPOINTS.AUTH.REFRESH)
    );

    // If refresh successful, save new token
    if (response.success && response.data.accessToken) {
      tokenManager.setToken(response.data.accessToken);
    }

    return response;
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated: () => {
    return tokenManager.hasToken() && userUtils.getUserData() !== null;
  },

  /**
   * Get current authenticated user
   * @returns {Object|null} Current user or null
   */
  getCurrentUser: () => {
    return userUtils.getUserData();
  },

  /**
   * Clear all authentication data
   */
  clearAuth: () => {
    tokenManager.removeToken();
    userUtils.removeUserData();
  }
};

/**
 * Authentication utilities
 */
export const authUtils = {
  /**
   * Validate teacher role
   * @param {Object} user - User object
   * @returns {boolean} Whether user is a teacher
   */
  isTeacher: (user) => {
    return user && user.roleId === 8;
  },

  /**
   * Validate student role
   * @param {Object} user - User object
   * @returns {boolean} Whether user is a student
   */
  isStudent: (user) => {
    return user && user.roleId === 9;
  },

  /**
   * Check if user has access to route based on role
   * @param {Object} user - User object
   * @param {Array} allowedRoles - Array of allowed role IDs
   * @returns {boolean} Whether user has access
   */
  hasAccess: (user, allowedRoles = []) => {
    if (!user || !allowedRoles.length) return false;
    return allowedRoles.includes(user.roleId);
  },

  /**
   * Get user role type
   * @param {Object} user - User object
   * @returns {string} Role type (teacher, student, unknown)
   */
  getUserRole: (user) => {
    if (!user) return 'unknown';
    if (user.roleId === 8) return 'teacher';
    if (user.roleId === 9) return 'student';
    return 'unknown';
  },

  /**
   * Get authentication headers
   * @returns {Object} Headers object with authorization
   */
  getAuthHeaders: () => {
    const token = tokenManager.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  },

  /**
   * Handle authentication errors
   * @param {Error} error - API error
   * @param {Function} t - Translation function
   * @returns {string} Localized error message
   */
  getErrorMessage: (error, t) => {
    const defaultMessage = t('loginFailed', 'បរាជ័យក្នុងការចូល');
    
    if (!error) return defaultMessage;
    
    // Handle specific error cases
    if (error.status === 401) {
      return t('ឈ្មោះអ្នកប្រើ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ', 'Invalid username or password');
    }
    
    if (error.status === 403) {
      return t('មិនអនុញ្ញាតឱ្យចូលប្រើ', 'Access denied');
    }
    
    if (error.status >= 500) {
      return t('បញ្ហាម៉ាស៊ីនមេ', 'Server error');
    }
    
    return error.message || defaultMessage;
  }
};