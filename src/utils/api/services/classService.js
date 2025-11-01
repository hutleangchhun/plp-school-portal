import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

/**
 * Class API Service
 * Handles all class-related API operations
 */
export const classService = {
  /**
   * Get all classes for the current teacher
   * @returns {Promise<Array>} List of classes
   */
  async getMyClasses() {
    try {
      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.CLASSES.BASE)
      );
      
      console.log('Raw classes API response:', response);
      
      if (response.data && Array.isArray(response.data)) {
        const formattedData = response.data.map(cls => {
          console.log('Raw class before formatting:', cls);
          const formatted = classService.utils.formatClassData(cls);
          console.log('Formatted class:', formatted);
          return formatted;
        });
        
        return {
          data: formattedData,
        };
      }
      return { data: [] };
    } catch (error) {
      console.error('Error fetching my classes:', error);
      throw error;
    }
  },
  async getBySchool(schoolId, options = {}) {
    try {
      if (!schoolId) {
        throw new Error('School ID is required for getBySchool');
      }

      // Build query parameters for pagination and filtering
      const params = {};
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;
      if (options.gradeLevel) params.gradeLevel = options.gradeLevel;
      if (options.search && options.search.trim()) params.search = options.search.trim();

      console.log('Fetching classes by school with params:', params);

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.CLASSES.CLASS_BY_SCHOOL(schoolId), { params })
      );

      console.log('Raw classes by school API response:', response);

      // Handle response structure: { message, classes: [...], total, schoolInfo }
      const responseData = response.data || response;
      const classesArray = responseData.classes || responseData.data || [];

      if (Array.isArray(classesArray)) {
        const formattedData = classesArray.map(cls => {
          console.log('Raw class before formatting:', cls);
          const formatted = classService.utils.formatClassData(cls);
          console.log('Formatted class:', formatted);
          return formatted;
        });

        return {
          success: true,
          message: responseData.message,
          classes: formattedData,
          data: formattedData,
          total: responseData.total || formattedData.length,
          pagination: responseData.pagination || {
            total: responseData.total || formattedData.length,
            page: options.page || 1,
            limit: options.limit || formattedData.length,
            totalPages: Math.ceil((responseData.total || formattedData.length) / (options.limit || formattedData.length || 1))
          },
          schoolInfo: responseData.schoolInfo
        };
      }
      return {
        success: true,
        classes: [],
        data: [],
        total: 0,
        schoolInfo: responseData.schoolInfo
      };
    } catch (error) {
      console.error('Error fetching classes by school:', error);
      throw error;
    }
  },

  /**
   * Get class by ID
   * @param {string|number} classId - The ID of the class to retrieve
   * @returns {Promise<Object>} Class data
   */
  async getClassById(classId) {
    return handleApiResponse(() =>
      apiClient_.get(`${ENDPOINTS.CLASSES.BASE}/${classId}`)
    ).then(response => classService.utils.formatClassData(response.data));
  },

  /**
   * Get students in a specific class
   * @param {string|number} classId - The ID of the class
   * @param {Object} params - Query parameters
   * @param {string} [params.search] - Search term to filter students by name
   * @returns {Promise<Array>} List of students in the class
   */
  async getClassStudents(classId, params = {}) {
    const queryParams = {};

    // Add search parameter if provided
    if (params.search && params.search.trim()) {
      queryParams.search = params.search.trim();
    }

    return handleApiResponse(() =>
      apiClient_.get(ENDPOINTS.CLASSES.STUDENTS(classId), {
        params: Object.keys(queryParams).length > 0 ? queryParams : undefined
      })
    ).then(response => ({
      data: Array.isArray(response.data) ? response.data : []
    }));
  },

  /**
   * Create a new class
   * @param {Object} classData - The class data to create
   * @returns {Promise<Object>} Created class data
   */
  async createClass(classData) {
    try {
      const response = await handleApiResponse(() =>
        apiClient_.post(ENDPOINTS.CLASSES.BASE, classData)
      );
      return {
        success: true,
        data: classService.utils.formatClassData(response.data)
      };
    } catch (error) {
      console.error('Error creating class:', error);
      throw error;
    }
  },

  /**
   * Update an existing class
   * @param {string|number} classId - The ID of the class to update
   * @param {Object} classData - The updated class data
   * @returns {Promise<Object>} Updated class data
   */
  async updateClass(classId, classData) {
    try {
      const response = await handleApiResponse(() =>
        apiClient_.patch(`${ENDPOINTS.CLASSES.BASE}/${classId}`, classData)
      );
      return {
        success: true,
        data: classService.utils.formatClassData(response.data)
      };
    } catch (error) {
      console.error('Error updating class:', error);
      throw error;
    }
  },

  /**
   * Delete a class
   * @param {string|number} classId - The ID of the class to delete
   * @returns {Promise<Object>} Deletion confirmation
   */
  async deleteClass(classId) {
    try {
      await handleApiResponse(() =>
        apiClient_.delete(`${ENDPOINTS.CLASSES.BASE}/${classId}`)
      );
      return {
        success: true,
        message: 'Class deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting class:', error);
      throw error;
    }
  },

  /**
   * Get master classes/students from a specific school
   * @param {string|number} schoolId - The ID of the school
   * @param {Object} params - Query parameters for pagination and filtering
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Number of items per page
   * @param {string} [params.search=''] - Search term
   * @param {string|number} [params.classId] - Class ID to filter by
   * @param {string} [params.academicYear] - Filter by academic year
   * @param {string} [params.gender] - Filter by gender (MALE/FEMALE)
   * @param {string} [params.dateOfBirth] - Filter by date of birth (YYYY-MM-DD)
   * @param {string|number} [params.gradeLevel] - Filter by grade level
   * @returns {Promise<Object>} Response with students from all classes in the school
   */
  async getMasterClasses(schoolId, params = {}) {
    try {
      if (!schoolId) {
        throw new Error('School ID is required for master classes endpoint');
      }

      const {
        page = 1,
        limit = 10,
        search = '',
        classId,
        academicYear,
        gender,
        dateOfBirth,
        gradeLevel
      } = params;

      // Build query params for the master-class endpoint
      const queryParams = {
        page,
        limit
      };

      // Add search parameter if provided
      if (search.trim()) {
        queryParams.search = search.trim();
      }

      // Forward classId if provided (filter by specific class)
      if (classId) {
        queryParams.classId = classId;
      }

      // Add additional filter parameters
      if (academicYear) queryParams.academicYear = academicYear;
      if (gender) queryParams.gender = gender;
      if (dateOfBirth) queryParams.dateOfBirth = dateOfBirth;
      if (gradeLevel) queryParams.gradeLevel = gradeLevel;

      console.log('Sending master classes API request for school', schoolId, 'with queryParams:', queryParams);

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.CLASSES.MASTER(schoolId), { params: queryParams })
      );

      console.log('Raw master classes API response for school', schoolId, 'with params', queryParams, ':', response);

      // Handle the nested response structure from the master-class endpoint
      // handleApiResponse wraps as { success: true, data: apiResponse }
      // API returns: { success: true, data: { data: [...students], total: 61, page: 1, limit: 10 } }
      const apiData = response.data;

      if (apiData && apiData.data && Array.isArray(apiData.data)) {
        return {
          success: true,
          data: apiData.data, // Extract the actual students array
          total: apiData.total || apiData.data.length,
          pagination: {
            page: apiData.page || 1,
            limit: apiData.limit || 10,
            total: apiData.total || apiData.data.length,
            pages: apiData.totalPages || Math.ceil((apiData.total || apiData.data.length) / (apiData.limit || 10))
          }
        };
      }

      // Fallback for direct array response (in case API returns array directly)
      if (apiData && Array.isArray(apiData)) {
        return {
          success: true,
          data: apiData,
          total: apiData.length
        };
      }

      // Fallback if data is not in expected format
      console.warn('Unexpected response structure from master-class endpoint:', apiData);
      return {
        success: true,
        data: [],
        total: 0,
        pagination: { page: 1, limit: 10, total: 0, pages: 1 }
      };
    } catch (error) {
      console.error('Error fetching master classes for school', schoolId, 'with params', params, ':', error);
      throw error;
    }
  },

  /**
   * Get classes list for a school via master-class classes endpoint
   * @param {string|number} schoolId
   * @param {Object} params
   * @returns {Promise<Object>} { success, data, pagination, schoolInfo }
   */
  async getMasterClassesList(schoolId, params = {}) {
    try {
      if (!schoolId) {
        throw new Error('School ID is required for master classes list endpoint');
      }

      const { page = 1, limit = 10 } = params;
      const queryParams = { page, limit };

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.CLASSES.MASTER_CLASSES(schoolId), { params: queryParams })
      );

      const payload = response?.data || {};
      const data = Array.isArray(payload.data) ? payload.data : [];

      return {
        success: true,
        data,
        pagination: {
          page: payload.page || page,
          limit: payload.limit || limit,
          total: payload.total || data.length,
          pages: payload.totalPages || Math.ceil((payload.total || data.length) / (payload.limit || limit))
        },
        schoolInfo: payload.schoolInfo
      };
    } catch (error) {
      console.error('Error fetching master classes list for school', schoolId, ':', error);
      throw error;
    }
  },

  /**
   * Utility functions for class data transformation
   */
  utils: {
    /**
     * Format raw class data from API to consistent format
     * @param {Object} cls - Raw class data from API
     * @returns {Object} Formatted class data
     */
    formatClassData(cls) {
      if (!cls) return null;

      return {
        id: cls.classId,
        classId: cls.classId,
        name: cls.name,
        gradeLevel: cls.gradeLevel,
        section: cls.section,
        schoolId: cls.schoolId,
        teacherId: cls.teacherId,
        academicYear: cls.academicYear,
        maxStudents: cls.maxStudents,
        status: cls.status,
        createdAt: cls.created_at,
        updatedAt: cls.updated_at,
        // Include student count if available
        studentCount: cls.studentCount,
        // Include nested objects if available
        school: cls.school,
        teacher: cls.teacher
      };
    }
  },
  /**
   * Get classes for a school with pagination and search
   * @param {string|number} schoolId - The ID of the school
   * @param {Object} params - Query parameters
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Number of items per page
   * @param {string} [params.search=''] - Search term
   * @returns {Promise<Object>} Response with classes data
   */
  async getClassesBySchool(schoolId, params = {}) {
    try {
      if (!schoolId) {
        throw new Error('School ID is required');
      }

      const { page = 1, limit = 10, search = '' } = params;
      const queryParams = { page, limit };

      if (search.trim()) {
        queryParams.search = search.trim();
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(`/students/school/${schoolId}/classes`, { params: queryParams })
      );

      const data = response?.data || {};
      const classes = Array.isArray(data.data) ? data.data : [];

      return {
        success: true,
        data: classes,
        pagination: {
          page: data.page || page,
          limit: data.limit || limit,
          total: data.total || classes.length,
          totalPages: data.totalPages || Math.ceil((data.total || classes.length) / (data.limit || limit))
        }
      };
    } catch (error) {
      console.error('Error fetching classes by school:', error);
      throw error;
    }
  },

  async getClassByUser(userId) {
    try {
      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.CLASSES.BY_USER(userId))
      );
      return {
        success: true,
        data: response.data,
        message: response.data?.message || response.message,
        classes: response.data?.classes || [],
        userType: response.data?.userType,
        total: response.data?.total || 0
      };
    } catch (error) {
      console.error('Error fetching class by user ID:', error);
      throw error;
    }
  }
};

export default classService;