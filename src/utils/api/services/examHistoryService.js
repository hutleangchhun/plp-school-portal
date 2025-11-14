import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

/**
 * Exam History API Service
 * Handles all exam history and student exam records API operations
 */
export const examHistoryService = {
  /**
   * Get exam history for a specific user with optional filters
   * @param {number} userId - User ID to fetch exam history for
   * @param {Object} params - Query parameters
   * @param {string} [params.examType] - Optional exam type filter (e.g., 'exam', 'quiz')
   * @param {string} [params.startDate] - Optional start date (YYYY-MM-DD format)
   * @param {string} [params.endDate] - Optional end date (YYYY-MM-DD format)
   * @param {string} [params.status] - Optional status filter (e.g., 'COMPLETED', 'IN_PROGRESS')
   * @param {string|number} [params.subjectId] - Optional subject filter
   * @param {string|number} [params.subject_id] - Optional subject filter (alternative naming)
   * @returns {Promise<Object>} Response with exam history data
   */
  async getUserExamHistory(userId, params = {}) {
    const queryParams = {};

    if (params.examType !== undefined) queryParams.examType = params.examType;
    if (params.startDate !== undefined) queryParams.startDate = params.startDate;
    if (params.endDate !== undefined) queryParams.endDate = params.endDate;
    if (params.status !== undefined) queryParams.status = params.status;

    // Pass subjectId as-is (backend expects camelCase based on your API route)
    if (params.subjectId !== undefined) queryParams.subjectId = params.subjectId;

    const response = await handleApiResponse(() =>
      apiClient_.get(ENDPOINTS.EXAM_HISTORY.BY_USER(userId), { params: queryParams })
    );
    return response;
  },

  /**
   * Get exam history for a specific user (alias for getUserExamHistory for backward compatibility)
   * @param {number} userId - User ID to fetch exam history for
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Response with filtered exam history data
   */
  async getUserExamHistoryFiltered(userId, params = {}) {
    return this.getUserExamHistory(userId, params);
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
