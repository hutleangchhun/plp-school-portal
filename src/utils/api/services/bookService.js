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
  },

  /**
   * Get books by category with pagination
   * @param {number} bookCategoryId - Book category ID to filter books
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @returns {Promise<Object>} Books data with pagination info
   */
  getBooksByCategory: async (bookCategoryId, page = 1, limit = 10) => {
    try {
      const response = await handleApiResponse(() =>
        apiClient_.get(`books?bookCategoryId=${bookCategoryId}&page=${page}&limit=${limit}`)
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
      console.error('Error fetching books by category:', error);
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
  },

  /**
   * Get books with combined filters (category and/or grade level)
   * @param {number} bookCategoryId - Book category ID (optional)
   * @param {number} gradeLevel - Grade level (optional)
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Items per page (default: 10)
   * @returns {Promise<Object>} Books data with pagination info
   */
  getBooks: async (bookCategoryId = null, gradeLevel = null, page = 1, limit = 10) => {
    try {
      // Build query string with optional filters
      const params = new URLSearchParams();
      if (bookCategoryId) {
        params.append('bookCategoryId', bookCategoryId);
      }
      if (gradeLevel) {
        params.append('gradeLevel', gradeLevel);
      }
      params.append('page', page);
      params.append('limit', limit);

      const queryString = params.toString();
      const endpoint = queryString ? `books?${queryString}` : 'books';

      const response = await handleApiResponse(() =>
        apiClient_.get(endpoint)
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
      console.error('Error fetching books:', error);
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
