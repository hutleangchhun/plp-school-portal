import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

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
