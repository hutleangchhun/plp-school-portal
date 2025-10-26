import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

/**
 * Exam History API Service
 * Handles all exam history and student exam records API operations
 */
export const examHistoryService = {
  /**
   * Get exam history for a specific user
   * @param {number} userId - User ID to fetch exam history for
   * @returns {Promise<Object>} Response with exam history data
   */
  async getUserExamHistory(userId) {
    const response = await handleApiResponse(() =>
      apiClient_.get(ENDPOINTS.EXAM_HISTORY.BY_USER(userId))
    );
    return response;
  },

  /**
   * Get exam history for all students (director view)
   * @param {Object} params - Query parameters
   * @param {number} [params.classId] - Optional class filter
   * @param {string} [params.grade] - Optional grade filter
   * @param {string} [params.examType] - Optional exam type filter
   * @returns {Promise<Object>} Response with exam history data for all students
   */
  async getAllStudentsExamHistory(params = {}) {
    const queryParams = {};

    if (params.classId !== undefined) queryParams.classId = params.classId;
    if (params.grade !== undefined) queryParams.grade = params.grade;
    if (params.examType !== undefined) queryParams.examType = params.examType;

    const response = await handleApiResponse(() =>
      apiClient_.get(ENDPOINTS.EXAM_HISTORY.BASE, { params: queryParams })
    );
    return response;
  },

  /**
   * Get exam history by class
   * @param {number} classId - Class ID to filter by
   * @returns {Promise<Object>} Response with exam history data for class
   */
  async getClassExamHistory(classId) {
    const response = await handleApiResponse(() =>
      apiClient_.get(ENDPOINTS.EXAM_HISTORY.BY_CLASS(classId))
    );
    return response;
  },

  /**
   * Get detailed exam result
   * @param {number} examHistoryId - Exam history ID
   * @returns {Promise<Object>} Response with detailed exam result
   */
  async getExamHistoryDetails(examHistoryId) {
    const response = await handleApiResponse(() =>
      apiClient_.get(ENDPOINTS.EXAM_HISTORY.DETAILS(examHistoryId))
    );
    return response;
  }
};

export default examHistoryService;
