import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

/**
 * Book API Service
 * Handles all book-related API operations
 */
export const bookService = {
  /**
   * Get books by grade level with pagination
   * @param {number} gradeLevel - Grade level to filter books
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @returns {Promise<Object>} Books data with pagination info
   */
  getBooksByGradeLevel: async (gradeLevel, page = 1, limit = 10) => {
    try {
      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.BOOKS.BY_GRADE_LEVEL(gradeLevel, page, limit))
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: response.data.data || [],
          pagination: {
            total: response.data.total || 0,
            page: response.data.page || page,
            limit: response.data.limit || limit,
            totalPages: response.data.totalPages || 0
          }
        };
      }

      return {
        success: false,
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0
        },
        error: response.error || 'Failed to fetch books'
      };
    } catch (error) {
      console.error('Error fetching books by grade level:', error);
      return {
        success: false,
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0
        },
        error: error.message || 'Failed to fetch books'
      };
    }
  }
};
