import axios from 'axios';
import { apiClient_, handleApiResponse, tokenManager } from '../client.js';
import { ENDPOINTS, HTTPS_CONFIG } from '../config.js';
// Removed unused import: getApiBaseUrl


/**
 * BMI API Service
 * Handles all BMI-related API operations
 */
export const bmiService = {
  /**
   * Get BMI history for a specific user
   * @param {string|number} userId - The ID of the user
   * @param {Object} params - Query parameters for filtering
   * @param {string} [params.year] - Academic year filter (e.g., "2025-2026")
   * @param {number} [params.limit] - Number of records to return
   * @param {number} [params.page] - Page number for pagination
   * @returns {Promise<Object>} Response with BMI history data
   */
  async getBmiHistoryByUser(userId, params = {}) {
    try {
      if (!userId) {
        throw new Error('User ID is required to fetch BMI history');
      }

      const queryParams = {};

      // Add year filter if provided
      if (params.year) {
        queryParams.year = params.year;
      }

      // Add limit if provided
      if (params.limit) {
        queryParams.limit = params.limit;
      }

      // Add page if provided
      if (params.page) {
        queryParams.page = params.page;
      }

      console.log('📊 Fetching BMI history for user:', userId, 'with params:', queryParams);

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.BMI.BY_USER(userId), {
          params: queryParams
        })
      );

      console.log('📊 BMI history response:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch BMI history');
      }

      return {
        success: true,
        data: response.data || [],
        pagination: response.pagination
      };

    } catch (error) {
      console.error('❌ Error in getBmiHistoryByUser:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch BMI history',
        data: []
      };
    }
  },

  /**
   * Get BMI report for all users (Admin endpoint)
   * @param {Object} params - Query parameters for filtering and pagination
   * @param {number} [params.page] - Page number (default: 1)
   * @param {number} [params.limit] - Records per page (default: 20, max: 100)
   * @param {string} [params.academicYear] - Filter by academic year (e.g., "2024-2025")
   * @returns {Promise<Object>} Response with BMI report data for all users
   */
  async getBmiReportAllUsers(params = {}) {
    try {
      const queryParams = {};

      // Add pagination parameters
      if (params.page) {
        queryParams.page = params.page;
      }

      if (params.limit) {
        queryParams.limit = Math.min(params.limit, 100); // Cap at 100
      }

      // Add academic year filter if provided
      if (params.academicYear) {
        queryParams.academicYear = params.academicYear;
      }

      console.log('📊 Fetching BMI report for all users with params:', queryParams);

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.BMI.ALL_USERS_REPORT, {
          params: queryParams
        })
      );

      console.log('📊 BMI report response:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch BMI report');
      }

      return {
        success: true,
        data: response.data || [],
        pagination: response.pagination
      };

    } catch (error) {
      console.error('❌ Error in getBmiReportAllUsers:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch BMI report',
        data: []
      };
    }
  },

  /**
   * Get BMI dashboard data for a specific level (national, province, district, school)
   * @param {string} level - Dashboard level: "national", "primary", "secondary", or school level
   * @param {Object} params - Query parameters for filtering
   * @param {string} [params.academicYear] - Academic year filter (e.g., "2025-2026")
   * @param {string} [params.provinceId] - Province ID filter (optional)
   * @param {string} [params.districtId] - District ID filter (optional)
   * @param {string} [params.schoolId] - School ID filter (optional)
   * @returns {Promise<Object>} Response with BMI dashboard data including distribution
   */
  async getBmiDashboard(level = 'primary', params = {}) {
    try {
      const queryParams = {};

      // Add academic year filter if provided
      if (params.academicYear) {
        queryParams.academicYear = params.academicYear;
      }

      // Add location filters if provided
      if (params.provinceId) {
        queryParams.provinceId = params.provinceId;
      }

      if (params.districtId) {
        queryParams.districtId = params.districtId;
      }

      if (params.schoolId) {
        queryParams.schoolId = params.schoolId;
      }

      console.log('📊 Fetching BMI dashboard data for level:', level, 'with params:', queryParams);

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.BMI.DASHBOARD(level), {
          params: queryParams
        })
      );

      console.log('📊 BMI dashboard response:', response);

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch BMI dashboard data');
      }

      return {
        success: true,
        data: response.data || {}
      };

    } catch (error) {
      console.error('❌ Error in getBmiDashboard:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch BMI dashboard data',
        data: {}
      };
    }
  },

  /**
   * Get BMI history for multiple students by their user IDs
   * @param {Array<string|number>} userIds - Array of user IDs
   * @param {Object} params - Query parameters for filtering
   * @param {string} [params.year] - Academic year filter (e.g., "2025-2026")
   * @param {number} [params.limit] - Number of records to return per user
   * @returns {Promise<Object>} Response with BMI history data for all users
   */
  async getBmiHistoryForMultipleUsers(userIds, params = {}) {
    try {
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new Error('User IDs array is required to fetch BMI history');
      }

      console.log('📊 Fetching BMI history for multiple users:', userIds.length, 'users');

      // Fetch BMI history for each user
      const bmiPromises = userIds.map(userId =>
        this.getBmiHistoryByUser(userId, params)
      );

      const bmiResults = await Promise.all(bmiPromises);

      // Combine results
      const combinedData = [];
      const errors = [];

      bmiResults.forEach((result, index) => {
        if (result.success && result.data) {
          // Add user ID to each BMI record for identification
          const userBmiData = result.data.map(bmiRecord => ({
            ...bmiRecord,
            userId: userIds[index]
          }));
          combinedData.push(...userBmiData);
        } else {
          errors.push({
            userId: userIds[index],
            error: result.error
          });
        }
      });

      console.log(`📊 Combined BMI data: ${combinedData.length} records from ${userIds.length} users`);
      if (errors.length > 0) {
        console.warn('⚠️ BMI fetch errors:', errors);
      }

      return {
        success: true,
        data: combinedData,
        errors: errors.length > 0 ? errors : undefined,
        totalUsers: userIds.length,
        successfulUsers: userIds.length - errors.length
      };

    } catch (error) {
      console.error('❌ Error in getBmiHistoryForMultipleUsers:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch BMI history for multiple users',
        data: []
      };
    }
  },

  /**
   * Get BMI report for students with pagination and filtering
   * @param {Object} params - Query parameters
   * @param {string|number} params.schoolId - School ID
   * @param {string|number} [params.classId] - Class ID (optional)
   * @param {string} [params.year] - Academic year (optional)
   * @param {number} [params.page] - Page number (default: 1)
   * @param {number} [params.limit] - Records per page (default: 20)
   * @returns {Promise<Object>} Response with students data and pagination
   */
  async getStudentBmiReport(params = {}) {
    try {
      const queryParams = {
        page: params.page || 1,
        limit: params.limit || 10
      };

      if (params.schoolId) queryParams.schoolId = params.schoolId;
      if (params.classId) queryParams.classId = params.classId;
      if (params.year) queryParams.academicYear = params.year;
      if (params.academicYear) queryParams.academicYear = params.academicYear;

      console.log('📊 Fetching student BMI report with params:', queryParams);

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.BMI.STUDENTS_REPORT, {
          params: queryParams
        })
      );

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch student BMI report');
      }

      // Handle different response structures
      // Case 1: response.data is the array (standard)
      // Case 2: response.data is an object containing { data: [], pagination: {} } (nested)
      // Case 3: response.data is an object with flat pagination fields { data: [], total: 100, page: 1 }
      let studentsData = [];
      let paginationData = response.pagination; // Try top level first

      const apiBody = response.data;

      if (Array.isArray(apiBody)) {
        studentsData = apiBody;
      } else if (apiBody && Array.isArray(apiBody.data)) {
        studentsData = apiBody.data;

        // Extract pagination
        if (apiBody.pagination) {
          // Standard nested pagination object
          paginationData = apiBody.pagination;
        } else if (apiBody.meta && apiBody.meta.pagination) {
          // Meta pagination object
          paginationData = apiBody.meta.pagination;
        } else if (apiBody.total !== undefined || apiBody.totalPages !== undefined) {
          // Flat pagination fields
          paginationData = {
            page: apiBody.page || apiBody.current_page || queryParams.page,
            limit: apiBody.limit || apiBody.per_page || queryParams.limit,
            total: apiBody.total || apiBody.totalDocs || 0,
            pages: apiBody.totalPages || apiBody.last_page || 0
          };

          // Calculate pages if missing but total exists
          if (!paginationData.pages && paginationData.total && paginationData.limit) {
            paginationData.pages = Math.ceil(paginationData.total / paginationData.limit);
          }
        }
      }


      // Ensure pages is calculated if missing but total exists (for all cases)
      if (paginationData && !paginationData.pages && paginationData.total && paginationData.limit) {
        paginationData.pages = Math.ceil(paginationData.total / paginationData.limit);
      }

      console.log(`✅ BMI Service extracted ${studentsData.length} records. Pagination:`, paginationData);

      return {
        success: true,
        data: studentsData,
        pagination: paginationData
      };
    } catch (error) {
      console.error('❌ Error in getStudentBmiReport:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch student BMI report',
        data: []
      };
    }
  },

  /**
   * Export BMI report for students
   * @param {Object} params - Query parameters (same as getStudentBmiReport)
   * @returns {Promise<Blob>} Blob data for file download
   */
  async exportStudentBmiReport(params = {}) {
    try {
      const queryParams = {};
      if (params.schoolId) queryParams.schoolId = params.schoolId;
      if (params.classId) queryParams.classId = params.classId;
      if (params.year) queryParams.academicYear = params.year;
      if (params.academicYear) queryParams.academicYear = params.academicYear;

      console.log('📥 Exporting student BMI report with params:', queryParams);

      // Use raw axios to handle Blob response and headers correctly
      // This avoids the default interceptor which swallows headers and returns response.data directly
      const token = tokenManager.getToken();

      // Construct full URL since we're using raw axios
      // We can use apiClient_.defaults.baseURL, but imports might be circular or complex
      // Safer to rely on HTTPS_CONFIG or fallback
      const baseURL = apiClient_.defaults.baseURL || '/api/v1';

      const response = await axios.get(`${baseURL}${ENDPOINTS.BMI.STUDENTS_REPORT_EXPORT}`, {
        params: queryParams,
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json'
        }
      });

      return {
        success: true,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      console.error('❌ Error in exportStudentBmiReport:', error);

      // If response is a Blob (which happens when responseType is blob but server returns error JSON)
      // we need to parse it to get the error message
      if (error.response && error.response.data instanceof Blob) {
        try {
          const text = await error.response.data.text();
          const errorJson = JSON.parse(text);
          return {
            success: false,
            error: errorJson.message || errorJson.error || 'Failed to export BMI report (Server Error)',
            status: error.response.status
          };
        } catch (e) {
          // Failed to parse blob text
        }
      }

      return {
        success: false,
        error: error.message || 'Failed to export BMI report'
      };
    }
  },

  /**
   * Utility functions for BMI data transformation
   */
  utils: {
    /**
     * Format BMI data for reports
     * @param {Object} bmiRecord - Raw BMI record from API
     * @param {Object} studentInfo - Student information to merge
     * @returns {Object} Formatted BMI data for reports
     */
    formatBmiDataForReport(bmiRecord, studentInfo = {}) {
      if (!bmiRecord) return null;

      return {
        // Student information
        userId: bmiRecord.userId || studentInfo.userId,
        studentId: studentInfo.studentId,
        studentNumber: studentInfo.studentNumber,
        firstName: studentInfo.firstName || studentInfo.first_name,
        lastName: studentInfo.lastName || studentInfo.last_name,
        khmerName: studentInfo.khmerName || `${studentInfo.lastName || ''} ${studentInfo.firstName || ''}`.trim(),
        gender: studentInfo.gender,
        dateOfBirth: studentInfo.dateOfBirth || studentInfo.date_of_birth,
        class: studentInfo.class,

        // BMI information
        height: bmiRecord.height_cm || bmiRecord.height,
        weight: bmiRecord.weight_kg || bmiRecord.weight,
        bmi: bmiRecord.bmi,
        bmiCategory: this.getBmiCategory(bmiRecord.bmi),
        recordDate: bmiRecord.recorded_at || bmiRecord.createdAt || bmiRecord.created_at,

        // Academic information
        academicYear: bmiRecord.academic_year || studentInfo.academicYear,
        gradeLevel: studentInfo.gradeLevel || studentInfo.class?.gradeLevel
      };
    },

    /**
     * Get BMI category based on BMI value
     * @param {number} bmi - BMI value
     * @returns {string} BMI category in Khmer
     */
    getBmiCategory(bmi) {
      if (!bmi || isNaN(bmi)) return 'មិនបានកំណត់';

      if (bmi < 18.5) return 'ស្គម';
      if (bmi >= 18.5 && bmi < 25) return 'ធម្មតា';
      if (bmi >= 25 && bmi < 30) return 'លើសទម្ងន់';
      return 'ធាត់';
    },

    /**
     * Calculate BMI from height and weight
     * @param {number} heightCm - Height in centimeters
     * @param {number} weightKg - Weight in kilograms
     * @returns {number} BMI value rounded to 2 decimal places
     */
    calculateBmi(heightCm, weightKg) {
      if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
        return null;
      }

      const heightM = heightCm / 100;
      const bmi = weightKg / (heightM * heightM);
      return Math.round(bmi * 100) / 100;
    }
  }
};
