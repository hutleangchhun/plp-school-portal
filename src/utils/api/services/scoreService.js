import axios from 'axios';
import { apiClient_, handleApiResponse, tokenManager } from '../client.js';
import { ENDPOINTS, API_BASE_URL } from '../config.js';

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
   * Submit student monthly exam records in bulk
   * @param {Array} records - Array of monthly exam record objects with flattened subject scores
   * @returns {Promise<Object>} Response from API
   */
  async submitMonthlyExamBulk(records) {
    try {
      if (!Array.isArray(records) || records.length === 0) {
        throw new Error('Records array is required and must not be empty');
      }

      const response = await handleApiResponse(() =>
        apiClient_.post(ENDPOINTS.STUDENT_MONTHLY_EXAM.BULK, records)
      );

      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error('Error submitting monthly exam records:', error);
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
  },

  /**
   * Get monthly exam scores for a class
   * @param {Object} params - Query parameters
   * @param {number} params.classId - The class ID
   * @param {number} params.month - The month (1-12)
   * @param {number} params.year - The year
   * @returns {Promise<Object>} Monthly exam scores
   */
  async getMonthlyExamScores(params) {
    try {
      if (!params.classId || !params.month || !params.year) {
        throw new Error('Class ID, month, and year are required');
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.STUDENT_MONTHLY_EXAM.BASE, { params })
      );

      // Handle different response formats
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.data && Array.isArray(response.data.data)
          ? response.data.data
          : [];

      return {
        success: true,
        data
      };
    } catch (error) {
      console.error('Error fetching monthly exam scores:', error);
      throw error;
    }
  },

  /**
   * Export class scores to Excel
   * @param {number} classId - The class ID
   * @param {number} year - The year
   * @param {number} month - The month (1-12)
   * @returns {Promise<Blob>} Excel file as blob
   */
  async exportClassScores(classId, year, month) {
    try {
      if (!classId || !year || !month) {
        throw new Error('Class ID, year, and month are required');
      }

      // Build full URL (PDF export)
      const relativeUrl = ENDPOINTS.STUDENT_MONTHLY_EXAM.EXPORT.CLASS_PDF(classId, year, month);
      const url = relativeUrl.startsWith('http') ? relativeUrl : `${API_BASE_URL}${relativeUrl}`;

      // Get token properly
      const token = tokenManager.getToken();
      const headers = {
        'Accept': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Use raw axios to bypass interceptors that strip the request information
      const response = await axios.get(
        url,
        {
          headers,
          responseType: 'blob',
          validateStatus: () => true, // Accept all status codes
        }
      );

      // Check for error responses
      if (response.status && response.status >= 400) {
        let errorMessage = `Server error: HTTP ${response.status}`;

        // Try to read error message from blob if it's text
        if (response.data && response.data.type && response.data.type.includes('text')) {
          try {
            const text = await response.data.text();
            errorMessage = `Server error (${response.status}): ${text}`;
          } catch (e) {
            // Ignore text parsing errors
          }
        }

        throw new Error(errorMessage);
      }

      // Validate blob size
      const blob = response.data;
      if (blob && blob.size < 1000) {
        if (blob.type && blob.type.includes('text')) {
          try {
            const text = await blob.text();
            throw new Error('Invalid response from server: ' + text);
          } catch (err) {
            if (err.message.includes('Invalid response')) throw err;
            throw new Error('Server returned empty or invalid response');
          }
        } else {
          // It might be a small excel file, so we shouldn't fail aggressively if it's not text
          // But 1000 bytes is very small for an excel file
        }
      }

      return blob;
    } catch (error) {
      console.error('Error exporting class scores:', error);
      throw error;
    }
  }
};

export default scoreService;
