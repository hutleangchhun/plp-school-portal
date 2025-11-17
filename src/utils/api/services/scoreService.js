import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

/**
 * Score API Service
 * Handles all student score-related API operations
 */
export const scoreService = {
  /**
   * Submit student score by subject and skill
   * @param {Object} scoreData - Score data containing studentId, subjectKey, skill, score, month
   * @returns {Promise<Object>} Response from API
   */
  async submitScore(scoreData) {
    try {
      if (!scoreData || !scoreData.studentId) {
        throw new Error('Student ID is required');
      }

      const response = await handleApiResponse(() =>
        apiClient_.post(ENDPOINTS.GRADES.SUBMIT, scoreData)
      );

      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error('Error submitting score:', error);
      throw error;
    }
  },

  /**
   * Batch submit multiple student scores
   * @param {Array} scores - Array of score objects
   * @returns {Promise<Object>} Response from API
   */
  async submitBatchScores(scores) {
    try {
      if (!Array.isArray(scores) || scores.length === 0) {
        throw new Error('Scores array is required and must not be empty');
      }

      const response = await handleApiResponse(() =>
        apiClient_.post(ENDPOINTS.GRADES.BATCH_UPDATE, { scores })
      );

      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error('Error submitting batch scores:', error);
      throw error;
    }
  },

  /**
   * Get grades for a specific student
   * @param {string|number} studentId - The student ID
   * @param {Object} options - Query options (subjectId, etc.)
   * @returns {Promise<Object>} Student grades
   */
  async getStudentGrades(studentId, options = {}) {
    try {
      if (!studentId) {
        throw new Error('Student ID is required');
      }

      const params = {};
      if (options.subjectId) params.subject_id = options.subjectId;

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.STUDENTS.GRADES.BASE(studentId), { params })
      );

      const responseData = response.data || response;
      const gradesArray = Array.isArray(responseData)
        ? responseData
        : responseData.grades || responseData.data || [];

      return {
        success: true,
        data: gradesArray
      };
    } catch (error) {
      console.error(`Error fetching grades for student ${studentId}:`, error);
      throw error;
    }
  },

  /**
   * Get grades for a specific student and subject
   * @param {string|number} studentId - The student ID
   * @param {string|number} subjectId - The subject ID
   * @returns {Promise<Object>} Student subject grades
   */
  async getStudentSubjectGrades(studentId, subjectId) {
    try {
      if (!studentId || !subjectId) {
        throw new Error('Student ID and Subject ID are required');
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.STUDENTS.GRADES.SUBJECT(studentId, subjectId))
      );

      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error(`Error fetching subject grades for student ${studentId}:`, error);
      throw error;
    }
  },

  /**
   * Get class grades report
   * @param {string|number} classId - The class ID
   * @param {string|number} subjectId - The subject ID
   * @param {string} term - The term (e.g., '2024-Q1')
   * @returns {Promise<Object>} Class grades report
   */
  async getClassGradesReport(classId, subjectId, term) {
    try {
      if (!classId || !subjectId || !term) {
        throw new Error('Class ID, Subject ID, and Term are required');
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.GRADES.REPORT.CLASS(classId, subjectId, term))
      );

      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error('Error fetching class grades report:', error);
      throw error;
    }
  },

  /**
   * Get student grades report
   * @param {string|number} studentId - The student ID
   * @param {string} term - The term (e.g., '2024-Q1')
   * @returns {Promise<Object>} Student grades report
   */
  async getStudentGradesReport(studentId, term) {
    try {
      if (!studentId || !term) {
        throw new Error('Student ID and Term are required');
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.GRADES.REPORT.STUDENT(studentId, term))
      );

      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error('Error fetching student grades report:', error);
      throw error;
    }
  }
};

export default scoreService;
