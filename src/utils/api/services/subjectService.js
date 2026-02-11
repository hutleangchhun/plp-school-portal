import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

/**
 * Subject API Service
 * Handles all subject-related API operations
 */
export const subjectService = {
  /**
   * Get all subjects
   * @param {Object} options - Query options (page, limit, search, etc.)
   * @returns {Promise<Object>} List of subjects
   */
  async getAll(options = {}) {
    try {
      const params = {};
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;
      if (options.search) params.search = options.search;

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.SUBJECTS.BASE, { params })
      );

      const responseData = response.data || response;
      const subjectsArray = Array.isArray(responseData)
        ? responseData
        : responseData.subjects || responseData.data || [];

      return {
        success: true,
        data: subjectsArray,
        total: responseData.total || subjectsArray.length,
        pagination: responseData.pagination || {
          total: responseData.total || subjectsArray.length,
          page: options.page || 1,
          limit: options.limit || 100,
        }
      };
    } catch (error) {
      console.error('Error fetching subjects:', error);
      throw error;
    }
  },
  async getAllActive() {
    try {
      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.SUBJECTS.BASE + '/active')
      );

      const responseData = response.data || response;
      const subjectsArray = Array.isArray(responseData)
        ? responseData
        : responseData.subjects || responseData.data || [];

      return {
        success: true,
        data: subjectsArray,
      };
    } catch (error) {
      console.error('Error fetching subjects:', error);
      throw error;
    }
  },

  /**
   * Get all student subjects
   * @returns {Promise<Object>} List of student subjects
   */
  async getStudentSubjects() {
    try {
      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.SUBJECTS.BASE + '/student')
      );

      const responseData = response.data || response;
      const subjectsArray = Array.isArray(responseData)
        ? responseData
        : responseData.subjects || responseData.data || [];

      return {
        success: true,
        data: subjectsArray,
      };
    } catch (error) {
      console.error('Error fetching student subjects:', error);
      throw error;
    }
  },

  /**
   * Get subjects with their grade levels
   * @param {Object} options - Query options
   * @param {boolean} options.isStudent - Filter for student subjects only
   * @returns {Promise<Object>} List of subjects with grade levels
   */
  async getSubjectGrades(options = {}) {
    try {
      const params = {};
      if (options.isStudent !== undefined) {
        params.isStudent = options.isStudent;
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.SUBJECTS.SUBJECT_GRADES, { params })
      );

      const responseData = response.data || response;
      const subjectsArray = Array.isArray(responseData)
        ? responseData
        : responseData.subjects || responseData.data || [];

      return {
        success: true,
        data: subjectsArray,
      };
    } catch (error) {
      console.error('Error fetching subject grades:', error);
      throw error;
    }
  },

  /**
   * Get subject by ID
   * @param {string|number} subjectId - The subject ID
   * @returns {Promise<Object>} Subject details
   */
  async getById(subjectId) {
    try {
      if (!subjectId) {
        throw new Error('Subject ID is required');
      }

      const response = await handleApiResponse(() =>
        apiClient_.get(`${ENDPOINTS.SUBJECTS.BASE}/${subjectId}`)
      );

      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error(`Error fetching subject ${subjectId}:`, error);
      throw error;
    }
  },

  /**
   * Get students for a subject
   * @param {string|number} subjectId - The subject ID
   * @param {Object} options - Query options (page, limit, etc.)
   * @returns {Promise<Object>} List of students
   */
  async getStudents(subjectId, options = {}) {
    try {
      if (!subjectId) {
        throw new Error('Subject ID is required');
      }

      const params = {};
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;
      if (options.search) params.search = options.search;

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.SUBJECTS.STUDENTS(subjectId), { params })
      );

      const responseData = response.data || response;
      const studentsArray = Array.isArray(responseData)
        ? responseData
        : responseData.students || responseData.data || [];

      return {
        success: true,
        data: studentsArray,
        total: responseData.total || studentsArray.length
      };
    } catch (error) {
      console.error(`Error fetching students for subject ${subjectId}:`, error);
      throw error;
    }
  },

  /**
   * Get grades for a subject
   * @param {string|number} subjectId - The subject ID
   * @param {Object} options - Query options (page, limit, etc.)
   * @returns {Promise<Object>} List of grades
   */
  async getGrades(subjectId, options = {}) {
    try {
      if (!subjectId) {
        throw new Error('Subject ID is required');
      }

      const params = {};
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;
      if (options.studentId) params.student_id = options.studentId;

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.SUBJECTS.GRADES(subjectId), { params })
      );

      const responseData = response.data || response;
      const gradesArray = Array.isArray(responseData)
        ? responseData
        : responseData.grades || responseData.data || [];

      return {
        success: true,
        data: gradesArray,
        total: responseData.total || gradesArray.length
      };
    } catch (error) {
      console.error(`Error fetching grades for subject ${subjectId}:`, error);
      throw error;
    }
  },

  /**
   * Get attendance for a subject
   * @param {string|number} subjectId - The subject ID
   * @param {Object} options - Query options (page, limit, date range, etc.)
   * @returns {Promise<Object>} Attendance records
   */
  async getAttendance(subjectId, options = {}) {
    try {
      if (!subjectId) {
        throw new Error('Subject ID is required');
      }

      const params = {};
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;
      if (options.startDate) params.start_date = options.startDate;
      if (options.endDate) params.end_date = options.endDate;
      if (options.studentId) params.student_id = options.studentId;

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.SUBJECTS.ATTENDANCE(subjectId), { params })
      );

      const responseData = response.data || response;
      const attendanceArray = Array.isArray(responseData)
        ? responseData
        : responseData.attendance || responseData.data || [];

      return {
        success: true,
        data: attendanceArray,
        total: responseData.total || attendanceArray.length
      };
    } catch (error) {
      console.error(`Error fetching attendance for subject ${subjectId}:`, error);
      throw error;
    }
  },

  /**
   * Create a new subject (admin only)
   * @param {Object} subjectData - Subject data to create
   * @returns {Promise<Object>} Created subject
   */
  async create(subjectData) {
    try {
      if (!subjectData || !subjectData.name) {
        throw new Error('Subject name is required');
      }

      const response = await handleApiResponse(() =>
        apiClient_.post(ENDPOINTS.SUBJECTS.BASE, subjectData)
      );

      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error('Error creating subject:', error);
      throw error;
    }
  },

  /**
   * Update a subject (admin only)
   * @param {string|number} subjectId - The subject ID
   * @param {Object} subjectData - Updated subject data
   * @returns {Promise<Object>} Updated subject
   */
  async update(subjectId, subjectData) {
    try {
      if (!subjectId) {
        throw new Error('Subject ID is required');
      }

      const response = await handleApiResponse(() =>
        apiClient_.put(`${ENDPOINTS.SUBJECTS.BASE}/${subjectId}`, subjectData)
      );

      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error(`Error updating subject ${subjectId}:`, error);
      throw error;
    }
  },

  /**
   * Delete a subject (admin only)
   * @param {string|number} subjectId - The subject ID
   * @returns {Promise<Object>} Deletion response
   */
  async delete(subjectId) {
    try {
      if (!subjectId) {
        throw new Error('Subject ID is required');
      }

      const response = await handleApiResponse(() =>
        apiClient_.delete(`${ENDPOINTS.SUBJECTS.BASE}/${subjectId}`)
      );

      return {
        success: true,
        data: response.data || response
      };
    } catch (error) {
      console.error(`Error deleting subject ${subjectId}:`, error);
      throw error;
    }
  },

  /**
   * Get teacher's subjects
   * @param {Object} options - Query options
   * @returns {Promise<Object>} List of teacher's subjects
   */
  async getTeacherSubjects(options = {}) {
    try {
      const params = {};
      if (options.page) params.page = options.page;
      if (options.limit) params.limit = options.limit;

      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.SUBJECTS.TEACHER_SUBJECTS, { params })
      );

      const responseData = response.data || response;
      const subjectsArray = Array.isArray(responseData)
        ? responseData
        : responseData.subjects || responseData.data || [];

      return {
        success: true,
        data: subjectsArray,
        total: responseData.total || subjectsArray.length
      };
    } catch (error) {
      console.error('Error fetching teacher subjects:', error);
      throw error;
    }
  }
};

export default subjectService;
