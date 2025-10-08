import { get, post, patch, put, uploadFile, uploadFilePatch } from '../client';
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


  getUserByID: async (userId) => {
    // UPDATE_USER is a function that builds the URL, so call it with userId
    return get(ENDPOINTS.USERS.UPDATE_USER(userId));
  },

  /**
   * Update user by ID (internal method)
   * @param {string|number} userId - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} Updated user data
   */
  updateUser: async (userId, userData) => {
    return put(ENDPOINTS.USERS.UPDATE_USER(userId), userData);
  },

  /**
   * Update user profile using /users/{id} route (PUT method)
   * Gets user ID from localStorage automatically
   * @param {Object} userData - User data with all profile fields
   * @returns {Promise<Object>} Updated user data
   */
  updateUserProfile: async (userData) => {
    // Get user ID from localStorage
    const currentUser = userUtils.getUserData();
    if (!currentUser || !currentUser.id) {
      throw new Error('User ID not found in localStorage. Please log in again.');
    }

    // Format data to match backend expectations
    const formattedData = {
      username: userData.username,
      first_name: userData.firstName || userData.first_name,
      last_name: userData.lastName || userData.last_name,
      email: userData.email,
      phone: userData.phone,
      date_of_birth: userData.dateOfBirth || userData.date_of_birth,
      gender: userData.gender,
      nationality: userData.nationality,
      teacher_number: userData.teacherNumber || userData.teacher_number
    };

    // Add password if provided
    if (userData.newPassword && userData.newPassword.trim()) {
      formattedData.newPassword = userData.newPassword;
    }

    // Handle residence data (nested object)
    const residenceData = userData.residence || {};
    const residenceProvinceId = residenceData.provinceId || userData.provinceId;
    const residenceDistrictId = residenceData.districtId || userData.districtId;
    const residenceCommuneId = residenceData.communeId || userData.communeId;
    const residenceVillageId = residenceData.villageId || userData.villageId;

    if (residenceProvinceId || residenceDistrictId || residenceCommuneId || residenceVillageId) {
      formattedData.residence = {};
      if (residenceProvinceId) formattedData.residence.provinceId = parseInt(residenceProvinceId);
      if (residenceDistrictId) formattedData.residence.districtId = parseInt(residenceDistrictId);
      if (residenceCommuneId) formattedData.residence.communeId = parseInt(residenceCommuneId);
      if (residenceVillageId) formattedData.residence.villageId = parseInt(residenceVillageId);
    }

    // Handle place of birth data (nested object)
    const placeOfBirthData = userData.placeOfBirth || {};
    const birthProvinceId = placeOfBirthData.provinceId;
    const birthDistrictId = placeOfBirthData.districtId;
    const birthCommuneId = placeOfBirthData.communeId;
    const birthVillageId = placeOfBirthData.villageId;

    if (birthProvinceId || birthDistrictId || birthCommuneId || birthVillageId) {
      formattedData.placeOfBirth = {};
      if (birthProvinceId) formattedData.placeOfBirth.provinceId = parseInt(birthProvinceId);
      if (birthDistrictId) formattedData.placeOfBirth.districtId = parseInt(birthDistrictId);
      if (birthCommuneId) formattedData.placeOfBirth.communeId = parseInt(birthCommuneId);
      if (birthVillageId) formattedData.placeOfBirth.villageId = parseInt(birthVillageId);
    } else if (formattedData.residence) {
      // Default to residence data if place of birth is not provided
      formattedData.placeOfBirth = { ...formattedData.residence };
    }

    // Remove undefined/null values to avoid sending empty fields
    Object.keys(formattedData).forEach(key => {
      if (formattedData[key] === undefined || formattedData[key] === null || formattedData[key] === '') {
        delete formattedData[key];
      }
    });

    console.log('Updating user profile for ID:', currentUser.id);
    console.log('Formatted data:', formattedData);
    
    return put(ENDPOINTS.USERS.UPDATE_USER(currentUser.id), formattedData);
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
    // Validate file first
    if (!file) {
      throw new Error('No file provided for upload');
    }
    
    if (!file.type.startsWith('image/')) {
      throw new Error('Invalid file type. Please select an image file.');
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      throw new Error('File too large. Please select an image smaller than 10MB.');
    }
    
    console.log('=== UPLOAD SERVICE DEBUG ===');
    console.log('File details:', {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type
    });
    console.log('User ID provided:', userId);
    console.log('Available endpoints to try:');
    console.log('1. POST /users/{userId}/upload-profile (if userId provided)');
    console.log('2. PATCH /users/my-account/profile-picture');
    console.log('3. POST /upload/single (generic fallback)');
    console.log('=== END UPLOAD SERVICE DEBUG ===');
    
    const endpoints = [];
    
    // Build list of endpoints to try in order of preference
    if (userId && userId !== null && userId !== undefined && userId !== '') {
      endpoints.push({
        name: 'User-specific upload endpoint',
        method: 'POST',
        url: ENDPOINTS.USERS.UPLOAD_PROFILE(userId),
        uploadFn: () => uploadFile(ENDPOINTS.USERS.UPLOAD_PROFILE(userId), file, 'file')
      });
    }
    
    endpoints.push(
      {
        name: 'Legacy profile picture endpoint',
        method: 'PATCH',
        url: ENDPOINTS.USERS.MY_PROFILE_PICTURE,
        uploadFn: () => uploadFilePatch(ENDPOINTS.USERS.MY_PROFILE_PICTURE, file, 'file')
      },
      {
        name: 'Generic upload endpoint',
        method: 'POST',
        url: ENDPOINTS.UPLOAD.SINGLE,
        uploadFn: () => uploadFile(ENDPOINTS.UPLOAD.SINGLE, file, 'file')
      }
    );
    
    let lastError = null;
    const errors = [];
    
    // Try each endpoint in sequence
    for (let i = 0; i < endpoints.length; i++) {
      const endpoint = endpoints[i];
      
      try {
        console.log(`Attempting upload ${i + 1}/${endpoints.length}: ${endpoint.name}`);
        console.log(`${endpoint.method} ${endpoint.url}`);
        
        const response = await endpoint.uploadFn();
        
        console.log(`✅ Upload successful using ${endpoint.name}:`, response);
        
        // Normalize response format
        if (response && (response.profile_picture || response.url || response.path || response.filename)) {
          return {
            profile_picture: response.profile_picture || response.url || response.path || response.filename,
            originalResponse: response
          };
        }
        
        return response;
        
      } catch (error) {
        lastError = error;
        const errorInfo = {
          endpoint: endpoint.name,
          method: endpoint.method,
          url: endpoint.url,
          status: error.status,
          message: error.message
        };
        
        errors.push(errorInfo);
        console.warn(`❌ ${endpoint.name} failed:`, errorInfo);
        
        // For 403/401 errors, don't try other endpoints as it's likely an auth issue
        if (error.status === 403 || error.status === 401) {
          console.log('Authentication/authorization error detected, stopping further attempts');
          break;
        }
        
        // For 413 (payload too large), don't try other endpoints
        if (error.status === 413) {
          console.log('File too large error detected, stopping further attempts');
          break;
        }
        
        // Continue to next endpoint for other errors
        if (i < endpoints.length - 1) {
          console.log(`Trying next endpoint...`);
        }
      }
    }
    
    // All endpoints failed
    console.error('🚫 All upload endpoints failed:', errors);
    
    // Return a meaningful error based on the most relevant failure
    if (lastError?.status === 403) {
      throw new Error('Access denied: You do not have permission to upload profile pictures. Please contact your administrator or try logging out and logging in again.');
    } else if (lastError?.status === 401) {
      throw new Error('Authentication failed: Your session may have expired. Please log out and log in again.');
    } else if (lastError?.status === 413) {
      throw new Error('File too large: Please select a smaller image file.');
    } else if (lastError?.status === 415) {
      throw new Error('Unsupported file type: Please select a valid image file (JPG, PNG, GIF, etc.).');
    } else if (lastError?.status === 500) {
      throw new Error('Server error: The server encountered an error while processing your upload. Please try again later.');
    } else {
      const errorMessages = errors.map(e => `${e.endpoint}: ${e.message || 'Unknown error'}`).join('; ');
      throw new Error(`Upload failed on all endpoints: ${errorMessages}. Please check your internet connection and try again.`);
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
      // Dispatch custom event to notify components in the same tab
      window.dispatchEvent(new Event('userDataUpdated'));
      console.log('💾 User data saved to localStorage and event dispatched');
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
      return `${lastName} ${firstName}`.trim();
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