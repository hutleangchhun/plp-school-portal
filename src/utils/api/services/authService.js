import { apiClient_, handleApiResponse, tokenManager } from '../client.js';
import { ENDPOINTS } from '../config.js';
import { userUtils } from './userService.js';
import { classService } from './classService.js';

/**
 * Helper function to fetch and store teacher's classes (for roleId = 8)
 * @param {Object} user - User object
 */
const fetchAndStoreTeacherClasses = async (user) => {
  // Only for teachers (roleId = 8)
  if (!user || user.roleId !== 8) {
    return;
  }

  try {
    console.log('📚 Fetching classes for teacher:', user.id);
    const response = await classService.getClassByUser(user.id);

    if (response.success && response.classes && response.classes.length > 0) {
      console.log('✅ Found', response.classes.length, 'classes for teacher');

      // Store classes in localStorage
      localStorage.setItem('teacherClasses', JSON.stringify(response.classes));

      // Get current selected class from localStorage, or use first class
      let currentClassId = localStorage.getItem('currentClassId');

      if (!currentClassId || !response.classes.find(c => String(c.classId || c.id) === String(currentClassId))) {
        // If no class selected or selected class not found, use first class
        currentClassId = response.classes[0].classId || response.classes[0].id;
        localStorage.setItem('currentClassId', String(currentClassId));
        console.log('✅ Set default class:', currentClassId);
      } else {
        console.log('✅ Using existing selected class:', currentClassId);
      }
    } else {
      console.warn('⚠️ No classes found for teacher');
      localStorage.removeItem('teacherClasses');
      localStorage.removeItem('currentClassId');
    }
  } catch (error) {
    console.error('❌ Error fetching teacher classes:', error);
    // Don't fail login if class fetch fails
  }
};

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

    // Handle account selection requirement
    // Check both top-level and within response.data due to handleApiResponse wrapping
    const responseData = response.data || response;
    if (responseData.requiresSelection && responseData.accounts) {
      return {
        requiresSelection: true,
        message: responseData.message,
        accounts: responseData.accounts
      };
    }

    // If login successful, save token and fetch fresh user data
    if (response.success) {
      // Handle both response structures: { data: { accessToken, user } } and { accessToken, user, data: {...} }
      const parsedData = responseData.accessToken ? responseData : responseData.data;
      const { accessToken, user } = parsedData;

      // Validate we have the required fields
      if (!user || !accessToken) {
        return {
          success: false,
          error: 'Invalid response from server. Missing user data or access token.'
        };
      }

      // Normalize user data: roleId = 14 is the primary director role
      const normalizedUser = {
        ...user,
        isDirector: user.roleId === 14,
        is_director: user.roleId === 14
      };

      // Allow users with roleId = 8 (teachers), roleId = 14 (directors), roleId = 1 (admin), and roleId 15-21 (restricted roles)
      // Teacher: roleId = 8
      // Director: roleId = 14
      // Admin: roleId = 1
      // Restricted roles: roleId = 15-21 (Deputy Principal, School Secretary, etc.)
      if (![8, 14, 1, 15, 16, 17, 18, 19, 20, 21].includes(normalizedUser.roleId)) {
        return {
          success: false,
          error: 'Only authorized users can access this portal. Please contact your administrator.'
        };
      }

      // Save token first so subsequent API calls work
      tokenManager.setToken(accessToken);

      // Fetch fresh user data from my-account endpoint to get latest school_id
      try {
        console.log('🔍 Fetching fresh user data from /users/my-account...');
        const accountResponse = await handleApiResponse(() =>
          apiClient_.get(ENDPOINTS.USERS.MY_ACCOUNT)
        );

        console.log('📥 Raw my-account API response:', JSON.stringify(accountResponse, null, 2));

        if (accountResponse.success && accountResponse.data) {
          // Use fresh data from my-account which has latest school_id
          console.log('✅ Fresh account data from my-account:');
          console.log('   - school_id:', accountResponse.data.school_id);
          console.log('   - id:', accountResponse.data.id);

          const freshUserData = {
            ...normalizedUser,
            ...accountResponse.data,
            // Ensure we keep the original user properties that might not be in account response
            id: accountResponse.data.id || normalizedUser.id,
            schoolId: accountResponse.data.school_id || normalizedUser.schoolId,
            school_id: accountResponse.data.school_id || normalizedUser.school_id,
            // roleId = 14 is the primary director role
            isDirector: accountResponse.data.roleId === 14 || accountResponse.data.role_id === 14,
            // Also keep snake_case for backwards compatibility
            is_director: accountResponse.data.roleId === 14 || accountResponse.data.role_id === 14
          };

          console.log('✅ Merged user data being saved to localStorage:');
          console.log('   - school_id:', freshUserData.school_id);
          console.log('   - schoolId:', freshUserData.schoolId);
          console.log('   - isDirector:', freshUserData.isDirector, 'Type:', typeof freshUserData.isDirector);
          console.log('   - is_director:', freshUserData.is_director, 'Type:', typeof freshUserData.is_director);
          userUtils.saveUserData(freshUserData);

          console.log('💾 Data saved. Verifying localStorage...');
          const verifyData = userUtils.getUserData();
          console.log('✓ Verified school_id in localStorage:', verifyData?.school_id);

          // Fetch and store teacher's classes if user is a teacher (roleId = 8)
          await fetchAndStoreTeacherClasses(freshUserData);

          return {
            success: true,
            data: { accessToken, user: freshUserData }
          };
        } else {
          console.warn('⚠️ my-account response not successful or missing data');
        }
      } catch (accountError) {
        console.error('❌ Failed to fetch fresh account data:', accountError);
        // Fallback to login data if my-account fails
        userUtils.saveUserData(normalizedUser);
      }

      // Fallback: save login user data
      console.log('⚠️ Using fallback login data');
      console.log('🔍 Login user data being saved:');
      console.log('   - isDirector:', normalizedUser.isDirector, 'Type:', typeof normalizedUser.isDirector);
      console.log('   - is_director:', normalizedUser.is_director, 'Type:', typeof normalizedUser.is_director);
      userUtils.saveUserData(normalizedUser);

      // Fetch and store teacher's classes if user is a teacher (roleId = 8)
      await fetchAndStoreTeacherClasses(normalizedUser);

      return {
        success: true,
        data: { accessToken, user: normalizedUser }
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

    // Clear ALL local storage data to prevent stale data issues
    tokenManager.removeToken();
    userUtils.removeUserData();

    // Clear any other cached data (selectedStudents, teacher classes, etc.)
    try {
      localStorage.removeItem('selectedStudents');
      localStorage.removeItem('selectedStudentsData');
      localStorage.removeItem('teacherClasses');
      localStorage.removeItem('currentClassId');
      // Clear any other app-specific cached data
      console.log('Cleared all cached data on logout');
    } catch (err) {
      console.warn('Error clearing cached data:', err);
    }

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
   * Check if user is authenticated (teacher, director, admin, or restricted roles 15-21)
   * @returns {boolean} Authentication status
   */
  isAuthenticated: () => {
    const hasToken = tokenManager.hasToken();
    const userData = userUtils.getUserData();
    // User must have token, valid user data, and roleId = 8 (teacher), 14 (director), 1 (admin), or 15-21 (restricted roles)
    return hasToken && userData !== null && ([8, 14, 1, 15, 16, 17, 18, 19, 20, 21].includes(userData.roleId));
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

    // Clear any other cached data
    try {
      localStorage.removeItem('selectedStudents');
      localStorage.removeItem('selectedStudentsData');
      localStorage.removeItem('teacherClasses');
      localStorage.removeItem('currentClassId');
      console.log('Cleared all auth and cached data');
    } catch (err) {
      console.warn('Error clearing cached data:', err);
    }
  },

  /**
   * Select account after multiple accounts were found
   * @param {string|number} userId - Selected user ID
   * @param {string} password - Original password from login
   * @returns {Promise<Object>} Login response with token and user data
   */
  selectAccount: async (userId, password) => {
    const response = await handleApiResponse(() =>
      apiClient_.post(ENDPOINTS.AUTH.SELECT_ACCOUNT, {
        userId: Number(userId),
        password
      })
    );

    // Process same as regular login
    if (response.success) {
      // Handle both response structures due to handleApiResponse wrapping
      const responseData = response.data || response;
      const parsedData = responseData.accessToken ? responseData : responseData.data;
      const { accessToken, user } = parsedData;

      // Validate we have the required fields
      if (!user || !accessToken) {
        return {
          success: false,
          error: 'Invalid response from server. Missing user data or access token.'
        };
      }

      const normalizedUser = {
        ...user,
        isDirector: user.roleId === 14,
        is_director: user.roleId === 14
      };

      // Check role authorization
      if (![8, 14, 1, 15, 16, 17, 18, 19, 20, 21].includes(normalizedUser.roleId)) {
        return {
          success: false,
          error: 'Only authorized users can access this portal. Please contact your administrator.'
        };
      }

      tokenManager.setToken(accessToken);

      // Fetch fresh user data
      try {
        const accountResponse = await handleApiResponse(() =>
          apiClient_.get(ENDPOINTS.USERS.MY_ACCOUNT)
        );

        if (accountResponse.success && accountResponse.data) {
          const freshUserData = {
            ...normalizedUser,
            ...accountResponse.data,
            id: accountResponse.data.id || normalizedUser.id,
            schoolId: accountResponse.data.school_id || normalizedUser.schoolId,
            school_id: accountResponse.data.school_id || normalizedUser.school_id,
            isDirector: accountResponse.data.roleId === 14 || accountResponse.data.role_id === 14,
            is_director: accountResponse.data.roleId === 14 || accountResponse.data.role_id === 14
          };

          userUtils.saveUserData(freshUserData);

          // Fetch and store teacher's classes if user is a teacher (roleId = 8)
          await fetchAndStoreTeacherClasses(freshUserData);

          return {
            success: true,
            data: { accessToken, user: freshUserData }
          };
        }
      } catch (accountError) {
        console.error('Failed to fetch fresh account data:', accountError);
        userUtils.saveUserData(normalizedUser);
      }

      userUtils.saveUserData(normalizedUser);

      // Fetch and store teacher's classes if user is a teacher (roleId = 8)
      await fetchAndStoreTeacherClasses(normalizedUser);

      return {
        success: true,
        data: { accessToken, user: normalizedUser }
      };
    }

    return response;
  }
};

/**
 * Authentication utilities
 */
export const authUtils = {
  /**
   * Check if user is a director (roleId = 14)
   * @param {Object} user - User object
   * @returns {boolean} Whether user is a director
   */
  isDirector: (user) => {
    if (!user) return false;
    // Director role ID is 14
    return user.roleId === 14;
  },

  /**
   * Validate teacher role (roleId = 8)
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
   * Validate role ID 1
   * @param {Object} user - User object
   * @returns {boolean} Whether user has role ID 1
   */
  isRole1: (user) => {
    return user && user.roleId === 1;
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
   * @returns {string} Role type (admin, director, teacher, student, unknown)
   */
  getUserRole: (user) => {
    if (!user) return 'unknown';
    if (user.roleId === 1) return 'admin';
    if (user.roleId === 14) return 'director';
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

    // Handle network/connection errors (no response from server)
    if (error.code === 'ECONNABORTED' || error.message === 'timeout of' || error.message?.includes('timeout')) {
      return t('requestTimeout', 'Request timed out. Please try again.');
    }

    if (!error.response) {
      // Network error (no internet or API not reachable)
      if (error.message?.includes('Network') || error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return t('connectionError', 'Connection Error. Please check your internet connection and try again.');
      }
      // Generic network error
      return t('networkError', 'Network Error. Please check your internet connection and try again.');
    }

    // Handle specific HTTP status codes
    if (error.response?.status === 401) {
      return t('invalidUsernameAndPassword', 'Invalid username or password');
    }

    if (error.response?.status === 403) {
      return t('permissionDenied', 'Access denied');
    }

    if (error.response?.status >= 500) {
      return t('serverError', 'Server error');
    }

    // Fallback to error message from response or error object
    const message = error.response?.data?.message || error.message || defaultMessage;
    console.log('📊 authUtils.getErrorMessage - Raw message:', message);

    // Check if it's a connection/response error message
    const msgLower = (message || '').toLowerCase();
    if (msgLower.includes('no response') || msgLower.includes('service unavailable') || msgLower.includes('cannot connect')) {
      return t('networkError', 'Network Error. Please check your internet connection and try again.');
    }

    return message;
  }
};