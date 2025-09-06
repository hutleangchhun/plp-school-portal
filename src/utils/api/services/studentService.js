import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

/**
 * Student API Service
 * Handles all student-related API operations
 */
export const studentService = {
  /**
   * Get all students with pagination and filtering
   * @param {Object} params - Query parameters for filtering and pagination
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Number of items per page
   * @param {string} [params.search=''] - Search term for filtering students
   * @param {boolean} [params.status=true] - Filter by active status
   * @param {number} [params.roleId=9] - Role ID for students (default: 9)
   * @returns {Promise<Object>} Response with student data and pagination info
   */
  async getStudents(params = {}) {
    try {
      const { page = 1, limit = 10, search = '', status = true, roleId } = params;
      
      const response = await handleApiResponse(() =>
        apiClient_.get(`${ENDPOINTS.USERS.BASE}/filter`, {
          params: {
            page,
            limit,
            search,
            status,
            roleId
          }
        })
      );
      
      // Format the response to match the expected structure
      if (response.data && response.data.data) {
        return {
          data: response.data.data.map(student => studentService.utils.formatStudentData(student)),
          pagination: {
            page: response.data.page || 1,
            limit: response.data.limit || 10,
            total: response.data.total || 0,
            pages: response.data.pages || 1
          }
        };
      }
      
      return { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } };
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  },

  /**
   * Get all available students that can be assigned to the current teacher
   * @returns {Promise<Array>} List of available students
   */
  async getAvailableStudents(search = '', params = {}) {
    try {
      const { page = 1, limit = 10 } = params;
      
      const response = await handleApiResponse(() =>
        apiClient_.get(`${ENDPOINTS.USERS.BASE}/filter`, {
          params: { 
            search,
            page,
            limit,
            status: true,
            roleId: 9, // Student role ID
            hasClass: false // Only students without a class
          }
        })
      );
      
      if (response.data && response.data.data) {
        return {
          data: response.data.data.map(student => studentService.utils.formatStudentData(student)),
          pagination: response.data.pagination || { page, limit, total: 0, pages: 1 }
        };
      }
      return { data: [], pagination: { page, limit, total: 0, pages: 1 } };
    } catch (error) {
      console.error('Error fetching available students:', error);
      throw error;
    }
  },

  /**
   * Get student by ID
   * @param {string|number} studentId - The ID of the student to retrieve
   * @returns {Promise<Object>} Student data
   */
  async getStudentById(studentId) {
    return handleApiResponse(() =>
      apiClient_.get(`${ENDPOINTS.USERS.BASE}/${studentId}`)
    ).then(response => ({
      ...response,
      data: studentService.utils.formatStudentData(response.data)
    }));
  },

  /**
   * Create a new student
   * @param {Object} studentData - Student data to create
   * @returns {Promise<Object>} Created student data
   */
  async createStudent(studentData) {
    return handleApiResponse(() =>
      apiClient_.post(ENDPOINTS.USERS.BASE, studentData)
    ).then(response => studentService.utils.formatStudentData(response.data));
  },

  /**
   * Update a student
   * @param {string|number} studentId - The ID of the student to update
   * @param {Object} studentData - Updated student data
   * @returns {Promise<Object>} Updated student data
   */
  async updateStudent(studentId, studentData) {
    return handleApiResponse(() =>
      apiClient_.put(`${ENDPOINTS.USERS.BASE}/${studentId}`, studentData)
    ).then(response => studentService.utils.formatStudentData(response.data));
  },

  /**
   * Delete a student
   * @param {string|number} studentId - The ID of the student to delete
   * @returns {Promise<Object>} Delete response
   */
  async deleteStudent(studentId) {
    return handleApiResponse(() =>
      apiClient_.delete(`${ENDPOINTS.USERS.BASE}/${studentId}`)
    );
  },

  /**
   * Add multiple students to the current teacher's class
   * @param {Array<string|number>} studentIds - Array of student IDs to add
   * @returns {Promise<Object>} Response data
   */
  async addStudentsToMyClass(studentIds = []) {
    try {
      const response = await handleApiResponse(() =>
        apiClient_.post(ENDPOINTS.STUDENTS.ADD_TO_CLASS, { studentIds })
      );
      return response.data;
    } catch (error) {
      console.error('Error adding students to class:', error);
      throw error;
    }
  },

  /**
   * Get current teacher's students
   * @returns {Promise<Array>} List of students
   */
  async getMyStudents() {
    try {
      // Use users/my-account endpoint to get teacher's students
      const response = await handleApiResponse(() =>
        apiClient_.get('/users/my-account/students')
      );
      
      if (response.data && response.data.data) {
        return {
          data: response.data.data.map(student => studentService.utils.formatStudentData(student)),
          pagination: response.data.pagination || { page: 1, limit: 10, total: 0, pages: 1 }
        };
      }
      return { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } };
    } catch (error) {
      console.error('Error fetching my students:', error);
      throw error;
    }
  },

  /**
   * Utility functions for student data transformation
   */
  utils: {
    /**
     * Format raw student data from API to consistent format
     * @param {Object} student - Raw student data from API
     * @returns {Object} Formatted student data
     */
    formatStudentData(student) {
      if (!student) return null;
      
      return {
        id: student.id,
        studentId: student.username,
        name: `${student.first_name || ''} ${student.last_name || ''}`.trim(),
        firstName: student.first_name,
        lastName: student.last_name,
        email: student.email,
        phone: student.phone,
        gender: student.gender,
        dateOfBirth: student.date_of_birth,
        profilePicture: student.profile_picture,
        isActive: student.is_active,
        role: {
          id: student.roleId,
          nameEn: student.roleNameEn,
          nameKh: student.roleNameKh
        },
        createdAt: student.created_at,
        updatedAt: student.updated_at
      };
    },
    
    /**
     * Format API response to consistent structure
     * @param {Object} response - Raw API response
     * @returns {Object} Formatted response with student data and pagination
     */
    formatApiResponse(response) {
      if (!response) return { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } };
      
      return {
        data: Array.isArray(response.data) 
          ? response.data.map(item => this.formatStudentData(item))
          : [],
        pagination: {
          page: response.page || 1,
          limit: response.limit || 10,
          total: response.total || 0,
          pages: response.pages || 1
        }
      };
    }
  }
};

export default studentService;
