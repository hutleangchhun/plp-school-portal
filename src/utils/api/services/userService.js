import { get, post, patch, uploadFile, uploadFilePatch } from '../client';
import { ENDPOINTS } from '../config';

/**
 * User API Service
 * Handles all user-related API operations
 */
const userService = {
  /**
   * Get current user account information
   * @returns {Promise<Object>} User account data
   */
  getMyAccount: async () => {
    const response = await get(ENDPOINTS.USERS.MY_ACCOUNT);
    console.log('My account response:', response);
    return response;
  },

  /**
   * Update user account using /users/my-account route (PATCH method)
   * @param {Object} userData - User data with fields: {username, first_name, last_name, email, newPassword, date_of_birth, gender, phone, teacher_number, provinceId, districtId, communeId, villageId, nationality}
   * @returns {Promise<Object>} Updated user data
   */
  updateMyAccount: async (userData) => {
    // Format data to match backend expectations
    const formattedData = {
      username: userData.username,
      first_name: userData.firstName || userData.first_name,
      last_name: userData.lastName || userData.last_name,
      email: userData.email,
      newPassword: userData.newPassword || userData.password,
      date_of_birth: userData.dateOfBirth || userData.date_of_birth,
      gender: userData.gender,
      phone: userData.phone,
      teacher_number: userData.teacherNumber || userData.teacher_number,
      provinceId: userData.provinceId,
      districtId: userData.districtId,
      communeId: userData.communeId,
      villageId: userData.villageId,
      nationality: userData.nationality
    };
    
    return patch(ENDPOINTS.USERS.MY_ACCOUNT, formattedData);
  },

  /**
   * Upload profile picture using /users/my-account/profile-picture route (PATCH method)
   * @param {File} file - Profile picture file
   * @param {string|number} [userId] - Optional user ID for specific user upload (uses /users/{id}/upload-profile)
   * @returns {Promise<Object>} Upload response with image path
   */
  uploadProfilePicture: async (file, userId = null) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // If userId is provided, try the new endpoint format first
    if (userId && userId !== null && userId !== undefined && userId !== '') {
      try {
        console.log(`Attempting to upload profile picture using new POST endpoint: /users/${userId}/upload-profile`);
        console.log('Full URL will be:', import.meta.env.VITE_API_URL || 'http://157.10.73.52:8085/api/v1' + ENDPOINTS.USERS.UPLOAD_PROFILE(userId));
        return await uploadFile(
          ENDPOINTS.USERS.UPLOAD_PROFILE(userId),
          file,
          'file'
        );
      } catch (error) {
        console.warn('New endpoint failed:', error.message);
        
        // If the new endpoint fails, try different approaches
        if (error.status === 404) {
          console.log('New endpoint not found (404), falling back to legacy endpoint');
        } else if (error.status === 405) {
          console.log('Method not allowed (405), endpoint may require different HTTP method');
        } else {
          console.log('New endpoint failed with error:', error.status || 'unknown');
        }
        
        // Fall back to the legacy endpoint if the new one fails (using PATCH method)
        try {
          console.log('Attempting legacy endpoint with PATCH:', ENDPOINTS.USERS.MY_PROFILE_PICTURE);
          console.log('Full URL will be:', import.meta.env.VITE_API_URL || 'http://157.10.73.52:8085/api/v1' + ENDPOINTS.USERS.MY_PROFILE_PICTURE);
          return await uploadFilePatch(
            ENDPOINTS.USERS.MY_PROFILE_PICTURE,
            file,
            'file'
          );
        } catch (legacyError) {
          console.error('Legacy endpoint also failed:', legacyError.message);
          
          // Try generic upload endpoint as last resort
          try {
            console.log('Attempting generic upload endpoint: /upload/single');
            const genericResponse = await uploadFile(
              ENDPOINTS.UPLOAD.SINGLE,
              file,
              'file'
            );
            
            // If generic upload succeeds, we might need to handle the response differently
            if (genericResponse && (genericResponse.url || genericResponse.path || genericResponse.filename)) {
              return {
                profile_picture: genericResponse.url || genericResponse.path || genericResponse.filename
              };
            }
            
            return genericResponse;
          } catch (genericError) {
            console.error('Generic upload endpoint also failed:', genericError.message);
            throw new Error(`All endpoints failed. New: ${error.message}, Legacy: ${legacyError.message}, Generic: ${genericError.message}`);
          }
        }
      }
    }
    
    // Otherwise, use the existing my-account endpoint for backward compatibility (using PATCH method)
    console.log('Using legacy endpoint with PATCH:', ENDPOINTS.USERS.MY_PROFILE_PICTURE);
    console.log('Full URL will be:', import.meta.env.VITE_API_URL || 'http://157.10.73.52:8085/api/v1' + ENDPOINTS.USERS.MY_PROFILE_PICTURE);
    try {
      return await uploadFilePatch(
        ENDPOINTS.USERS.MY_PROFILE_PICTURE,
        file,
        'file'
      );
    } catch (error) {
      console.error('Legacy endpoint failed:', error.message);
      
      // Try generic upload endpoint as last resort
      try {
        console.log('Attempting generic upload endpoint: /upload/single');
        const genericResponse = await uploadFile(
          ENDPOINTS.UPLOAD.SINGLE,
          file,
          'file'
        );
        
        // If generic upload succeeds, we might need to handle the response differently
        if (genericResponse && (genericResponse.url || genericResponse.path || genericResponse.filename)) {
          return {
            profile_picture: genericResponse.url || genericResponse.path || genericResponse.filename
          };
        }
        
        return genericResponse;
      } catch (genericError) {
        console.error('Generic upload endpoint also failed:', genericError.message);
        throw new Error(`All endpoints failed. Legacy: ${error.message}, Generic: ${genericError.message}. Please check if the server supports profile picture uploads.`);
      }
    }
  },

  /**
   * Upload profile picture for specific user using new endpoint format (POST method)
   * @param {string|number} userId - User ID for the upload
   * @param {File} file - Profile picture file
   * @returns {Promise<Object>} Upload response with image path
   */
  uploadUserProfilePicture: async (userId, file) => {
    if (!userId) {
      throw new Error('User ID is required for this method');
    }
    
    console.log(`Uploading profile picture for user ${userId} using new POST endpoint: /users/${userId}/upload-profile`);
    return uploadFile(
      ENDPOINTS.USERS.UPLOAD_PROFILE(userId),
      file,
      'file'
    );
  },

  /**
   * Upload profile picture using legacy PATCH endpoint
   * @param {File} file - Profile picture file
   * @returns {Promise<Object>} Upload response with image path
   */
  uploadProfilePicturePatch: async (file) => {
    console.log('Using legacy PATCH endpoint: /users/my-account/profile-picture');
    return uploadFilePatch(
      ENDPOINTS.USERS.MY_PROFILE_PICTURE,
      file,
      'file'
    );
  },

  /**
   * Legacy profile update method (kept for backward compatibility)
   * @deprecated Use updateMyAccount instead
   */
  updateProfile: async (userData) => {
    return patch(ENDPOINTS.USERS.MY_ACCOUNT, userData);
  },

  /**
   * Legacy method - use updateMyAccount instead
   * @deprecated Use updateMyAccount instead
   */
  updateMyProfile: async (profileData) => {
    return this.updateMyAccount(profileData);
  },

  /**
   * Change user password
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Response data
   */
  changePassword: async (currentPassword, newPassword) => {
    return post(ENDPOINTS.USERS.CHANGE_PASSWORD, {
      currentPassword,
      newPassword
    });
  },

  /**
   * Request password reset
   * @param {string} email - User's email address
   * @returns {Promise<Object>} Response data
   */
  requestPasswordReset: async (email) => {
    return post(ENDPOINTS.USERS.RESET_PASSWORD, { email });
  },

  /**
   * Verify email with token
   * @param {string} token - Verification token
   * @returns {Promise<Object>} Response data
   */
  verifyEmail: async (token) => {
    return post(ENDPOINTS.USERS.VERIFY_EMAIL, { token });
  },

  /**
   * Resend verification email
   * @returns {Promise<Object>} Response data
   */
  resendVerificationEmail: async () => {
    return post(ENDPOINTS.USERS.RESEND_VERIFICATION);
  }
};

/**
 * User data utilities
 */
const userUtils = {
  /**
   * Save user data to localStorage
   * @param {Object} userData - User data to save
   */
  saveUserData: (userData) => {
    try {
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Error saving user data to localStorage:', error);
    }
  },

  /**
   * Get user data from localStorage
   * @returns {Object|null} User data or null if not found
   */
  getUserData: () => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data from localStorage:', error);
      return null;
    }
  },

  /**
   * Remove user data from localStorage
   */
  removeUserData: () => {
    try {
      localStorage.removeItem('user');
    } catch (error) {
      console.error('Error removing user data from localStorage:', error);
    }
  },

  /**
   * Format user display name
   * @param {Object} user - User object
   * @returns {string} Formatted display name
   */
  getDisplayName: (user) => {
    if (!user) return 'User';
    
    // Handle both camelCase and snake_case property names
    const firstName = user.firstName || user.first_name;
    const lastName = user.lastName || user.last_name;
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    // Fallback to fullname if available
    if (user.fullname) {
      return user.fullname;
    }
    
    return user.username || user.email || 'User';
  },

  /**
   * Get user role display text
   * @param {Object} user - User object
   * @param {Function} t - Translation function
   * @returns {string} Role display text
   */
  getRoleDisplay: (user, t) => {
    if (!user || !user.roleNameEn) return t('roles.unknown') || 'Unknown';
    
    const roleMap = {
      admin: t('roles.admin') || 'Administrator',
      teacher: t('roles.teacher') || 'Teacher',
      student: t('roles.student') || 'Student',
      parent: t('roles.parent') || 'Parent',
      staff: t('roles.staff') || 'Staff'
    };
    
    return roleMap[user.roleNameEn.toLowerCase()] || user.roleNameEn;
  },

  /**
   * Get gender display text
   * @param {Object} user - User object
   * @param {Function} t - Translation function
   * @returns {string} Gender display text
   */
  getGenderDisplay: (user, t) => {
    if (!user || user.gender === undefined || user.gender === null) {
      return t('profile.unspecified') || 'Unspecified';
    }
    
    const genderMap = {
      male: t('profile.male') || 'Male',
      female: t('profile.female') || 'Female',
      other: t('profile.other') || 'Other',
      prefer_not_to_say: t('profile.preferNotToSay') || 'Prefer not to say'
    };
    
    return genderMap[user.gender] || user.gender;
  },

  /**
   * Get full profile picture URL with fallback handling
   * @param {Object} user - User object
   * @param {boolean} forceHttps - Force HTTPS protocol (default: false)
   * @returns {string} Full profile picture URL or empty string
   */
  getProfilePictureUrl: (user, forceHttps = false) => {
    if (!user) return '';
    
    // Handle both camelCase and snake_case property names
    const profilePicture = user.profilePicture || user.profile_picture;
    if (!profilePicture) return '';
    
    // If it's already a full URL, handle protocol conversion if needed
    if (profilePicture.startsWith('http')) {
      if (forceHttps && profilePicture.startsWith('http://')) {
        return profilePicture.replace('http://', 'https://');
      }
      return profilePicture;
    }
    
    // Determine base URL with environment-specific logic
    let staticBaseUrl;
    
    // In development, use direct server URL
    if (import.meta.env.DEV) {
      staticBaseUrl = import.meta.env.VITE_STATIC_BASE_URL || 'http://157.10.73.52:8085';
      
      // Handle forceHttps for development
      if (forceHttps && staticBaseUrl.startsWith('http://')) {
        staticBaseUrl = staticBaseUrl.replace('http://', 'https://');
      }
    } else {
      // In production (Vercel), use relative URLs that will be proxied
      staticBaseUrl = '';
    }
    
    // Handle different path formats
    let profilePath = profilePicture;
    if (!profilePath.startsWith('/')) {
      profilePath = '/' + profilePath;
    }
    
    // Handle special characters in filename by encoding only the filename part
    const pathParts = profilePath.split('/');
    if (pathParts.length > 1) {
      const filename = pathParts[pathParts.length - 1];
      // Only encode if the filename contains special characters
      if (filename.match(/[^a-zA-Z0-9.-]/)) {
        pathParts[pathParts.length - 1] = encodeURIComponent(filename);
      }
      profilePath = pathParts.join('/');
    }
    
    // In production, use relative URL that will be proxied by Vercel
    if (import.meta.env.PROD) {
      return profilePath; // This will become /uploads/filename and be proxied by Vercel
    }
    
    // In development, use full URL
    return `${staticBaseUrl}${profilePath}`;
  },

  /**
   * Check if profile picture URL is accessible
   * @param {string} url - Profile picture URL
   * @returns {Promise<boolean>} True if accessible, false otherwise
   */
  checkProfilePictureUrl: async (url) => {
    if (!url) return false;
    
    try {
      const response = await fetch(url, { 
        method: 'HEAD',
        mode: 'cors',
        cache: 'no-cache'
      });
      return response.ok;
    } catch {
      // If HTTPS fails and URL was HTTPS, try HTTP fallback
      if (url.startsWith('https://')) {
        try {
          const httpUrl = url.replace('https://', 'http://');
          const fallbackResponse = await fetch(httpUrl, { 
            method: 'HEAD',
            mode: 'cors',
            cache: 'no-cache'
          });
          return fallbackResponse.ok;
        } catch {
          return false;
        }
      }
      return false;
    }
  },

  /**
   * Get profile picture URL with automatic fallback
   * @param {Object} user - User object
   * @returns {Promise<string>} Working profile picture URL or empty string
   */
  getWorkingProfilePictureUrl: async (user) => {
    if (!user) return '';
    
    // Try HTTPS first
    const httpsUrl = userUtils.getProfilePictureUrl(user, true);
    if (httpsUrl && await userUtils.checkProfilePictureUrl(httpsUrl)) {
      return httpsUrl;
    }
    
    // Fallback to HTTP
    const httpUrl = userUtils.getProfilePictureUrl(user, false);
    if (httpUrl && await userUtils.checkProfilePictureUrl(httpUrl)) {
      return httpUrl;
    }
    
    return '';
  }
};

export { userService, userUtils };