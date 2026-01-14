import { get, post, patch, put, del, uploadFile, uploadFilePatch } from '../client';
import { ENDPOINTS, getStaticAssetBaseUrl } from '../config';

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
   * Generate a username suggestion from the backend
   * @param {string} baseUsername - The desired base username
   * @returns {Promise<Object>} Response from /users/generate-username
   */
  generateUsername: async (baseUsername) => {
    const safeBase = (baseUsername || '').trim();
    const query = encodeURIComponent(safeBase || 'student');
    const url = `${ENDPOINTS.USERS.GENERATE_USERNAME}?username=${query}`;
    return get(url);
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

    // Add roleId if provided (important for maintaining user role)
    if (userData.roleId) {
      formattedData.roleId = userData.roleId;
    }

    // Add weight and height for BMI calculation
    if (userData.weight_kg) {
      formattedData.weight_kg = userData.weight_kg;
    }
    if (userData.height_cm) {
      formattedData.height_cm = userData.height_cm;
    }

    // Add additional fields
    if (userData.employment_type) {
      formattedData.employment_type = userData.employment_type;
    }
    if (userData.ethnic_group) {
      formattedData.ethnic_group = userData.ethnic_group;
    }
    // Allow gradeLevel = 0 by checking explicitly for undefined/null/empty
    if (userData.gradeLevel !== undefined && userData.gradeLevel !== null && userData.gradeLevel !== '') {
      formattedData.gradeLevel = userData.gradeLevel;
    }
    if (userData.hire_date) {
      formattedData.hire_date = userData.hire_date;
    }

    // Add accessibility array if provided
    if (userData.accessibility && Array.isArray(userData.accessibility) && userData.accessibility.length > 0) {
      formattedData.accessibility = userData.accessibility;
    }

    // Add profile picture if provided
    if (userData.profile_picture) {
      formattedData.profile_picture = userData.profile_picture;
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
   * Update user account using /api/v1/users/my-account route (PATCH method)
   * @param {Object} userData - User data with all profile fields
   * @returns {Promise<Object>} Updated user data
   */
  updateMyAccount: async (userData) => {
    // Format data to match backend expectations
    const formattedData = {
      roleId: userData.roleId,
      username: userData.username,
      first_name: userData.firstName || userData.first_name,
      last_name: userData.lastName || userData.last_name,
      email: userData.email,
      date_of_birth: userData.dateOfBirth || userData.date_of_birth,
      gender: userData.gender,
      phone: userData.phone,
      teacher_number: userData.teacherNumber || userData.teacher_number,
      nationality: userData.nationality,
      profile_picture: userData.profile_picture,
      weight_kg: userData.weight_kg,
      height_cm: userData.height_cm,
      bmi: userData.bmi,
      ethnic_group: userData.ethnic_group,
      accessibility: userData.accessibility,
      employment_type: userData.employment_type,
      gradeLevel: userData.gradeLevel,
      hire_date: userData.hire_date,
      educationLevel: userData.educationLevel,
      salaryTypeId: userData.salaryTypeId ? parseInt(userData.salaryTypeId) : undefined,
      trainingType: userData.trainingType,
      teacherStatus: userData.teacherStatus,
      subject: userData.subject,
      teachingType: userData.teachingType,
      teacherExtraLearningTool: userData.teacherExtraLearningTool,
      appointed: userData.appointed,
      burden: userData.burden,
      schoolId: userData.schoolId,
      teacher_family: userData.teacher_family,
      bookIds: userData.bookIds
    };

    // Add password if provided
    if (userData.newPassword && userData.newPassword.trim()) {
      formattedData.newPassword = userData.newPassword;
    }

    // Handle residence data (nested object)
    if (userData.residence || userData.provinceId || userData.districtId || userData.communeId || userData.villageId) {
      formattedData.residence = {
        provinceId: userData.residence?.provinceId || userData.provinceId,
        districtId: userData.residence?.districtId || userData.districtId,
        communeId: userData.residence?.communeId || userData.communeId,
        villageId: userData.residence?.villageId || userData.villageId
      };
    }

    // Handle place of birth data (nested object)
    if (userData.placeOfBirth) {
      formattedData.placeOfBirth = {
        provinceId: userData.placeOfBirth.provinceId,
        districtId: userData.placeOfBirth.districtId,
        communeId: userData.placeOfBirth.communeId,
        villageId: userData.placeOfBirth.villageId
      };
    }

    // Remove undefined/null values to avoid sending empty fields
    Object.keys(formattedData).forEach(key => {
      if (formattedData[key] === undefined || formattedData[key] === null || formattedData[key] === '') {
        delete formattedData[key];
      }
    });

    console.log('Updating user account via PATCH /users/my-account');
    console.log('Formatted data:', formattedData);

    return patch(ENDPOINTS.USERS.MY_ACCOUNT, formattedData);
  },

  /**
   * Generate QR code for a user using /api/v1/users/generate-qr-code route (POST method)
   * @param {string} username - User's username
   * @param {string} password - User's password
   * @returns {Promise<Object>} QR code data
   */
  generateQRCode: async (username, password) => {
    return post(ENDPOINTS.USERS.GENERATE_QR_CODE, {
      username,
      password
    });
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
    console.log('Available endpoints to try (in order):');
    console.log('1. PATCH /users/my-account/profile-picture (primary)');
    console.log('2. POST /users/{userId}/upload-profile (if userId provided)');
    console.log('3. POST /upload/single (generic fallback)');
    console.log('=== END UPLOAD SERVICE DEBUG ===');
    
    const endpoints = [];

    // Build list of endpoints to try in order of preference
    // Primary: Use /users/my-account/profile-picture endpoint (PATCH method)
    endpoints.push({
      name: 'Profile picture endpoint',
      method: 'PATCH',
      url: ENDPOINTS.USERS.MY_PROFILE_PICTURE,
      uploadFn: () => uploadFilePatch(ENDPOINTS.USERS.MY_PROFILE_PICTURE, file, 'file')
    });

    // Fallback: User-specific upload endpoint
    if (userId && userId !== null && userId !== undefined && userId !== '') {
      endpoints.push({
        name: 'User-specific upload endpoint',
        method: 'POST',
        url: ENDPOINTS.USERS.UPLOAD_PROFILE(userId),
        uploadFn: () => uploadFile(ENDPOINTS.USERS.UPLOAD_PROFILE(userId), file, 'file')
      });
    }

    // Last resort: Generic upload endpoint
    endpoints.push({
      name: 'Generic upload endpoint',
      method: 'POST',
      url: ENDPOINTS.UPLOAD.SINGLE,
      uploadFn: () => uploadFile(ENDPOINTS.UPLOAD.SINGLE, file, 'file')
    });
    
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
  },

  /**
   * Get users by school ID (public endpoint)
   * @param {string|number} schoolId - School ID
   * @param {Object} params - Query parameters {page, limit, roleId}
   * @returns {Promise<Object>} Users data with pagination
   */
  getPublicSchoolUsers: async (schoolId, params = {}) => {
    const { page = 1, limit = 10, roleId = '8' } = params;
    const queryParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      roleId: roleId.toString()
    });

    const url = `${ENDPOINTS.USERS.PUBLIC_SCHOOL_USERS(schoolId)}?${queryParams}`;
    console.log('🌐 Loading users from:', url);

    const response = await get(url);

    // Transform response to normalize pagination format
    if (response && response.pagination) {
      return {
        data: response.data || [],
        totalPages: response.pagination.pages || 1,
        total: response.pagination.total || 0,
        schoolInfo: response.schoolInfo
      };
    }

    return response;
  },

  /**
   * Create a new teacher user
   * @param {Object} teacherData - Teacher data to create
   * @returns {Promise<Object>} Created teacher data
   */
  createTeacher: async (teacherData) => {
    // Helper function to convert location object IDs to numbers while preserving other fields
    const convertLocationIds = (location) => {
      if (!location || typeof location !== 'object') return undefined;

      const converted = {};
      // Convert numeric IDs
      if (location.provinceId) converted.provinceId = parseInt(location.provinceId);
      if (location.districtId) converted.districtId = parseInt(location.districtId);
      if (location.communeId) converted.communeId = parseInt(location.communeId);
      if (location.villageId) converted.villageId = parseInt(location.villageId);
      // Preserve other fields like fullAddress
      if (location.fullAddress) converted.fullAddress = location.fullAddress;

      return Object.keys(converted).length > 0 ? converted : undefined;
    };

    // Build payload for teacher creation.
    // This is designed to mirror the rich createPayload from TeacherEditModal (create mode)
    // so that all teacher fields are sent on create, not just a subset.
    const payload = {
      // Basic Personal Information
      username: teacherData.username?.trim(),
      first_name: teacherData.first_name || teacherData.firstName,
      last_name: teacherData.last_name || teacherData.lastName,
      email: teacherData.email?.trim(),
      password: teacherData.password?.trim(),
      roleId: teacherData.roleId || 8, // Default to teacher role

      // Date & Identity
      date_of_birth: teacherData.date_of_birth || teacherData.dateOfBirth,
      gender: teacherData.gender,
      nationality: teacherData.nationality?.trim(),
      profile_picture: teacherData.profile_picture || teacherData.profilePicture,

      // Physical Information
      weight_kg: teacherData.weight_kg || (teacherData.weight ? parseFloat(teacherData.weight) : undefined),
      height_cm: teacherData.height_cm || (teacherData.height ? parseFloat(teacherData.height) : undefined),
      bmi: teacherData.bmi ? parseFloat(teacherData.bmi) : undefined,

      // Location & Ethnicity
      ethnic_group: teacherData.ethnic_group || teacherData.ethnicGroup?.trim(),
      // Include location fields with numeric IDs
      residence: convertLocationIds(teacherData.residence),
      placeOfBirth: convertLocationIds(teacherData.placeOfBirth),

      // Health & Accessibility
      accessibility: teacherData.accessibility && Array.isArray(teacherData.accessibility) && teacherData.accessibility.length > 0 ? teacherData.accessibility : undefined,

      // Teacher-Specific Fields
      // Preserve gradeLevel = 0 by using nullish coalescing instead of ||
      gradeLevel: teacherData.gradeLevel ?? teacherData.grade_level,
      teacher_number: teacherData.teacher_number,
      schoolId: teacherData.schoolId,
      employment_type: teacherData.employment_type || teacherData.employmentType,
      salaryTypeId: teacherData.salaryTypeId || (teacherData.salary_type ? parseInt(teacherData.salary_type) : undefined),
      educationLevel: teacherData.educationLevel || teacherData.education_level,
      trainingType: teacherData.trainingType || teacherData.training_type,
      teachingType: teacherData.teachingType || teacherData.teaching_type,
      teacherStatus: teacherData.teacherStatus || teacherData.teacher_status,
      subject: Array.isArray(teacherData.subject) && teacherData.subject.length > 0 ? teacherData.subject : undefined,
      hire_date: teacherData.hire_date || teacherData.hireDate,
      appointed: typeof teacherData.appointed === 'boolean' ? teacherData.appointed : undefined,
      burden: typeof teacherData.burden === 'boolean' ? teacherData.burden : undefined,

      // Teacher Learning Tools
      teacherExtraLearningTool: teacherData.teacherExtraLearningTool,

      // Books Assignment
      bookIds: Array.isArray(teacherData.bookIds) ? (teacherData.bookIds.length > 0 ? teacherData.bookIds : null) : undefined,

      // Family Information
      teacher_family: teacherData.teacher_family,
    };

    // Remove undefined/null values to avoid sending empty fields
    Object.keys(payload).forEach(key => {
      // Keep bookIds and teacherExtraLearningTool even when null so backend sees explicit values
      if (key === 'bookIds' || key === 'teacherExtraLearningTool') {
        return;
      }

      if (payload[key] === undefined || payload[key] === null || payload[key] === '') {
        delete payload[key];
      }
    });

    console.log('Creating teacher with payload:', payload);

    return post(ENDPOINTS.USERS.CREATE_USER, payload);
  },

  /**
   * Validate if email exists in the system
   * @param {string} email - Email address to validate
   * @returns {Promise<Object>} Response with { email, exists }
   */
  validateEmail: async (email) => {
    if (!email || !email.trim()) return { email: '', exists: false };
    const url = ENDPOINTS.USERS.VALIDATE_EMAIL(email.trim());
    return get(url);
  },

  /**
   * Check if teacher number exists
   * @param {string} teacherNumber - Teacher number to check
   * @returns {Promise<Object>} Response with { exists, teacherNumber }
   */
  checkTeacherNumber: async (teacherNumber) => {
    if (!teacherNumber || !teacherNumber.trim()) return { teacherNumber: '', exists: false };
    const url = ENDPOINTS.TEACHERS.CHECK_NUMBER(teacherNumber.trim());
    try {
      const response = await get(url);
      return response;
    } catch (error) {
      console.error('Error checking teacher number:', error);
      // Return exists: false if check fails
      return { teacherNumber: teacherNumber.trim(), exists: false };
    }
  },

  /**
   * Delete a user by ID
   * @param {string|number} userId - User ID to delete
   * @returns {Promise<Object>} Response from DELETE /users/{userId}
   */
  deleteUser: async (userId) => {
    return del(ENDPOINTS.USERS.UPDATE_USER(userId));
  },

  /**
   * Bulk delete users by their IDs
   * @param {Array<number>} userIds - Array of user IDs to delete
   * @returns {Promise<Object>} Response with success count, failed count, and detailed results
   */
  bulkDelete: async (userIds) => {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      throw new Error('User IDs array is required and must not be empty');
    }

    return del(ENDPOINTS.USERS.BULK_DELETE, { user_ids: userIds });
  },

  /**
   * Toggle user active/inactive status
   * @param {string|number} userId - User ID
   * @param {boolean} isActive - Active status to set
   * @returns {Promise<Object>} Updated user data with new status
   */
  updateUserActiveStatus: async (userId, isActive) => {
    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`Updating user ${userId} active status to: ${isActive}`);
    return patch(ENDPOINTS.USERS.ACTIVE_STATUS(userId), {
      is_active: isActive
    });
  },

  /**
   * Get user's secondary/officer roles
   * @returns {Promise<Object>} Secondary role data { role, data }
   */
  getSecondaryRoles: async () => {
    console.log('📥 Fetching secondary roles from /auth/secondary-roles');
    try {
      const response = await get(ENDPOINTS.AUTH.SECONDARY_ROLES);
      console.log('✅ Secondary roles response:', response);
      return response;
    } catch (error) {
      console.error('❌ Error fetching secondary roles:', error);
      throw error;
    }
  },

  /**
   * Create provincial officer role
   * @param {Object} data - Officer data { userId, provinceId, position, department }
   * @returns {Promise<Object>} Created provincial officer data
   */
  createProvincialOfficer: async (data) => {
    console.log('📤 Creating provincial officer:', data);
    return post('/provincial-officers', data);
  },

  /**
   * Update provincial officer role by user ID
   * @param {string|number} userId - User ID
   * @param {Object} data - Officer data to update { provinceId?, position?, department?, is_active? }
   * @returns {Promise<Object>} Updated provincial officer data
   */
  updateProvincialOfficer: async (userId, data) => {
    console.log('📤 Updating provincial officer for user:', userId, data);
    return put(`/provincial-officers/user/${userId}`, data);
  },

  /**
   * Create district officer role
   * @param {Object} data - Officer data { userId, provinceId, districtId, position, department }
   * @returns {Promise<Object>} Created district officer data
   */
  createDistrictOfficer: async (data) => {
    console.log('📤 Creating district officer:', data);
    return post('/district-officers', data);
  },

  /**
   * Update district officer role by user ID
   * @param {string|number} userId - User ID
   * @param {Object} data - Officer data to update { provinceId?, districtId?, position?, department? }
   * @returns {Promise<Object>} Updated district officer data
   */
  updateDistrictOfficer: async (userId, data) => {
    console.log('📤 Updating district officer for user:', userId, data);
    return put(`/district-officers/user/${userId}`, data);
  },

  /**
   * Create commune officer role
   * @param {Object} data - Officer data { userId, provinceId, districtId, communeId, position, department }
   * @returns {Promise<Object>} Created commune officer data
   */
  createCommuneOfficer: async (data) => {
    console.log('📤 Creating commune officer:', data);
    return post('/commune-officers', data);
  },

  /**
   * Update commune officer role by user ID
   * @param {string|number} userId - User ID
   * @param {Object} data - Officer data to update { provinceId?, districtId?, communeId?, position?, department? }
   * @returns {Promise<Object>} Updated commune officer data
   */
  updateCommuneOfficer: async (userId, data) => {
    console.log('📤 Updating commune officer for user:', userId, data);
    return put(`/commune-officers/user/${userId}`, data);
  },

  /**
   * Delete provincial officer role by user ID
   * @param {string|number} userId - User ID
   * @returns {Promise<Object>} Delete response message
   */
  deleteProvincialOfficer: async (userId) => {
    console.log('🗑️ Deleting provincial officer for user:', userId);
    return del(`/provincial-officers/user/${userId}`);
  },

  /**
   * Delete district officer role by user ID
   * @param {string|number} userId - User ID
   * @returns {Promise<Object>} Delete response message
   */
  deleteDistrictOfficer: async (userId) => {
    console.log('🗑️ Deleting district officer for user:', userId);
    return del(`/district-officers/user/${userId}`);
  },

  /**
   * Delete commune officer role by user ID
   * @param {string|number} userId - User ID
   * @returns {Promise<Object>} Delete response message
   */
  deleteCommuneOfficer: async (userId) => {
    console.log('🗑️ Deleting commune officer for user:', userId);
    return del(`/commune-officers/user/${userId}`);
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
      // Use CustomEvent for better compatibility
      const event = new CustomEvent('userDataUpdated', { detail: userData });
      window.dispatchEvent(event);
      // Also dispatch as a regular event for fallback
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
   * Check if user has multiple roles
   * @param {Object} user - User object
   * @returns {boolean} Whether user has multiple roles
   */
  hasMultipleRoles: (user) => {
    if (!user) return false;
    const roles = user.roles || [];
    const officerRoles = user.officerRoles || [];
    return roles.length > 1 || officerRoles.length > 0;
  },

  /**
   * Check if user is a provincial officer
   * @param {Object} user - User object
   * @returns {boolean} Whether user has PROVINCIAL_OFFICER role
   */
  isProvincialOfficer: (user) => {
    if (!user) return false;
    const officerRoles = user.officerRoles || [];
    return officerRoles.includes('PROVINCIAL_OFFICER');
  },

  /**
   * Check if user is a district officer
   * @param {Object} user - User object
   * @returns {boolean} Whether user has DISTRICT_OFFICER role
   */
  isDistrictOfficer: (user) => {
    if (!user) return false;
    const officerRoles = user.officerRoles || [];
    return officerRoles.includes('DISTRICT_OFFICER');
  },

  /**
   * Check if user is a commune officer
   * @param {Object} user - User object
   * @returns {boolean} Whether user has COMMUNE_OFFICER role
   */
  isCommuneOfficer: (user) => {
    if (!user) return false;
    const officerRoles = user.officerRoles || [];
    return officerRoles.includes('COMMUNE_OFFICER');
  },

  /**
   * Get all roles (primary + officer roles) as display text
   * @param {Object} user - User object
   * @param {Function} t - Translation function
   * @returns {Array} Array of role display texts
   */
  getAllRolesDisplay: (user, t) => {
    if (!user) return [];

    const roles = [];
    const roleMap = {
      TEACHER: t('roles.teacher') || 'Teacher',
      DIRECTOR: t('roles.director') || 'Director',
      ADMIN: t('roles.admin') || 'Administrator',
      STUDENT: t('roles.student') || 'Student',
      PARENT: t('roles.parent') || 'Parent',
      PROVINCIAL_OFFICER: t('roles.provincialOfficer') || 'Provincial Officer',
      DISTRICT_OFFICER: t('roles.districtOfficer') || 'District Officer',
      COMMUNE_OFFICER: t('roles.communeOfficer') || 'Commune Officer'
    };

    // Add primary role
    if (user.roleEn) {
      roles.push(roleMap[user.roleEn] || user.roleEn);
    }

    // Add officer roles
    if (user.officerRoles && Array.isArray(user.officerRoles)) {
      user.officerRoles.forEach(role => {
        const displayRole = roleMap[role] || role;
        if (!roles.includes(displayRole)) {
          roles.push(displayRole);
        }
      });
    }

    return roles;
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
      try {
        const parsedUrl = new URL(profilePicture);

        // If backend returns absolute URLs like http://<ip>/api/v1/files/..., rewrite to use
        // the app's /api proxy which maps to backend /api/v1/.
        if (parsedUrl.pathname.startsWith('/api/v1/')) {
          const rewrittenPath = `/api${parsedUrl.pathname.slice('/api/v1'.length)}`;
          return `${rewrittenPath}${parsedUrl.search}`;
        }

        // If backend returns absolute URLs for uploads, prefer serving via current origin/proxy.
        if (parsedUrl.pathname.startsWith('/uploads/')) {
          const staticBaseUrl = getStaticAssetBaseUrl();
          return `${staticBaseUrl}${parsedUrl.pathname}${parsedUrl.search}`;
        }
      } catch {
        // If parsing fails, fall back to original behavior below.
      }

      if (forceHttps && profilePicture.startsWith('http://')) {
        return profilePicture.replace('http://', 'https://');
      }

      return profilePicture;
    }
    
    // Use environment-aware static base URL from config
    const staticBaseUrl = getStaticAssetBaseUrl();
    
    // Handle different path formats
    let profilePath = profilePicture;

    // Ensure path starts with /uploads/ (handle both 'uploads/...' and '/uploads/...' formats)
    if (profilePath.startsWith('uploads/')) {
      profilePath = '/' + profilePath;
    } else if (!profilePath.startsWith('/uploads/')) {
      // If path doesn't have /uploads prefix, add it
      if (profilePath.startsWith('/')) {
        profilePath = '/uploads' + profilePath;
      } else {
        profilePath = '/uploads/' + profilePath;
      }
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
    
    // Always use full API URL for profile pictures
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