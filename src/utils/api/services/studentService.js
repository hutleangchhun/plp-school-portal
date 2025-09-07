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
  },

  /**
   * Get all available students that can be assigned to the current teacher
   * @returns {Promise<Array>} List of available students
   */
  async getAvailableStudents(search = '', params = {}) {
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
   * Remove a single student from class
   * @param {string|number} classId - The ID of the class
   * @param {string|number} studentId - The ID of the student to remove
   * @returns {Promise<Object>} Remove response
   */
  async removeStudentFromClass(classId, studentId) {
    const response = await handleApiResponse(() =>
      apiClient_.request({
        method: 'delete',
        url: `${ENDPOINTS.CLASSES.BASE}/students`,
        data: {
          classId: Number(classId),
          studentIds: [Number(studentId)]
        },
        headers: {
          'Content-Type': 'application/json'
        }
      })
    );
    
    return response;
  },

  /**
   * Remove multiple students from class
   * @param {string|number} classId - The ID of the class
   * @param {Array<string|number>|string|number} studentIds - Single student ID or array of student IDs to remove
   * @returns {Promise<Object>} Remove response
   */
  async removeStudentsFromClass(classId, studentUserIds) {
    try {
      // Convert to array if it's a single ID
      const userIds = Array.isArray(studentUserIds) ? studentUserIds : [studentUserIds];
      
      // Convert all IDs to numbers
      const numericUserIds = userIds.map(id => Number(id)).filter(id => !isNaN(id));
      
      if (numericUserIds.length === 0) {
        throw new Error('No valid student IDs provided');
      }
      
      // Prepare request data in the format expected by the API
      // API always expects studentIds to be an array
      const requestData = {
        classId: Number(classId),
        studentIds: numericUserIds
      };
      
      console.log('Sending delete request with data:', requestData);
      
      const deleteResponse = await handleApiResponse(() => 
        apiClient_.request({
          method: 'DELETE',
          url: `${ENDPOINTS.CLASSES.BASE}/students`,
          data: requestData,
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
      
      console.log('Delete response:', deleteResponse);
      return deleteResponse;
      
    } catch (error) {
      console.error('Error in removeStudentsFromClass:', error);
      throw error;
    }
  },

  /**
   * Add a single student to class
   * @param {string|number} classId - The ID of the class
   * @param {string|number} studentId - The ID of the student to add
   * @returns {Promise<Object>} Add response
   */
  async addStudentToClass(classId, studentId) {
    const response = await handleApiResponse(() =>
      apiClient_.put('/classes/students', {
        classId: parseInt(classId),
        studentId: parseInt(studentId)
      })
    );
    return response.data;
  },

  /**
   * Add multiple students to class
   * @param {string|number} classId - The ID of the class
   * @param {Array<string|number>} studentIds - Array of student IDs to add
   * @returns {Promise<Object>} Add response
   */
  async addStudentsToClass(classId, studentIds) {
    // Convert to array if a single ID is passed
    const ids = Array.isArray(studentIds) ? studentIds : [studentIds];
    
    // Prepare request body based on number of students
    const requestBody = {
      classId: parseInt(classId)
    };
    
    if (ids.length === 1) {
      requestBody.studentId = ids[0];
    } else {
      requestBody.studentIds = ids;
    }
    
    const response = await handleApiResponse(() =>
      apiClient_.put('/classes/students', requestBody)
    );
    
    return response;
  },

  /**
   * Add multiple students to the current teacher's class
   * @param {Array<string|number>} studentIds - Array of student IDs to add
   * @returns {Promise<Object>} Response data
   */
  async addStudentsToMyClass(studentIds = []) {
    const response = await handleApiResponse(() =>
      apiClient_.post(ENDPOINTS.STUDENTS.ADD_TO_CLASS, { studentIds })
    );
    return response.data;
  },

  /**
   * Get current teacher's students
   * @returns {Promise<Array>} List of students
   */
  async getMyStudents() {
    try {
      // First try getting the teacher's class, then get students from that class
      const classResponse = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.CLASSES.BASE)
      );
      
      if (!classResponse.data || !Array.isArray(classResponse.data) || classResponse.data.length === 0) {
        return { success: true, data: [] };
      }
      
      // Get the first class (assuming teacher teaches one class)
      const teacherClass = classResponse.data[0];
      
      // Try to get the class ID from different possible fields
      const classId = teacherClass.id || teacherClass.classId || (teacherClass.data && teacherClass.data.id);
      
      if (!classId) {
        return { success: true, data: [] };
      }
      
      // Now get students for this class
      const endpoint = `/classes/${classId}/students`;
      
      const response = await handleApiResponse(() =>
        apiClient_.get(endpoint)
      );
      
      // Handle the response data
      let studentsData = [];
      
      // Check if response is an array or has a data property that's an array
      if (Array.isArray(response)) {
        studentsData = response;
      } else if (response && Array.isArray(response.data)) {
        studentsData = response.data;
      } else if (response && response.data && Array.isArray(response.data.data)) {
        studentsData = response.data.data;
      }
      
      // Transform the API response format to match what formatStudentData expects
      // API returns: {student_id, user_id, username, first_name, last_name, class_id}
      // formatStudentData expects: {studentId, user: {firstName, lastName, username}}
      
      // Get correct user data for each student since class API has wrong mappings
      // Use student_id as the user_id since that seems to be the correct mapping
      const transformedDataPromises = studentsData.map(async (apiStudent) => {
        try {
          // The actual user ID is the student_id field, not user_id field
          const actualUserId = apiStudent.student_id;
          
          // Fetch correct user data from users API using student_id as user_id
          const userResponse = await handleApiResponse(() =>
            apiClient_.get(`${ENDPOINTS.USERS.BASE}/${actualUserId}`)
          );
          
          const userData = userResponse.data || {};
          
          return {
            studentId: parseInt(apiStudent.student_id),
            user: {
              firstName: userData.first_name || apiStudent.first_name,
              lastName: userData.last_name || apiStudent.last_name, 
              username: userData.username || apiStudent.username,
              id: actualUserId  // Use the correct user ID
            },
            class: {
              classId: parseInt(apiStudent.class_id),
              gradeLevel: apiStudent.class_grade_level
            }
          };
        } catch (error) {
          console.error(`Failed to fetch user data for student_id ${apiStudent.student_id}:`, error);
          // Fallback to class API data if user fetch fails
          return {
            studentId: parseInt(apiStudent.student_id),
            user: {
              firstName: apiStudent.first_name,
              lastName: apiStudent.last_name, 
              username: apiStudent.username,
              id: apiStudent.student_id  // Use student_id as fallback
            },
            class: {
              classId: parseInt(apiStudent.class_id),
              gradeLevel: apiStudent.class_grade_level
            }
          };
        }
      });
      
      const transformedData = await Promise.all(transformedDataPromises);
      
      // Format the student data
      const formattedStudents = transformedData.map(student => this.utils.formatStudentData(student));
      
      return {
        success: true,
        data: formattedStudents,
        pagination: response.pagination || { page: 1, limit: 10, total: formattedStudents.length, pages: 1 }
      };
      
    } catch (error) {
      console.error('Error in getMyStudents:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch students',
        data: [] 
      };
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
      
      // Handle different API response structures
      // Structure 1: Direct student object
      // Structure 2: Nested user object
      // Structure 3: From classes/{id}/students endpoint
      
      const user = student.user || student;
      const classInfo = student.class || {};
      
      // Try multiple ID field possibilities based on actual API response
      // Based on API sample: {studentId: 9, user: {...}, class: {...}}
      // Use studentId as the primary identifier for API calls - this MUST be used
      let finalId = student.studentId;    // Primary: studentId from API response
      
      // Only use fallbacks if studentId is missing (should never happen with your API)
      if (!finalId) {
        finalId = student.id || 
                  student.user_id ||      
                  student.userId ||       
                  student.student_id ||
                  user.id || 
                  user.userId || 
                  user.user_id;
      }
      
      // If still no ID, try to create a temporary unique identifier
      if (finalId === undefined || finalId === null) {
        // Use username as fallback ID if available
        finalId = user.username || student.username;
        
        // If still no ID, use email as fallback
        if (!finalId) {
          finalId = user.email || student.email;
        }
        
        // Last resort: use index-based ID (not ideal but prevents undefined)
        if (!finalId) {
          finalId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        }
      }
      
      // Only log when ID is undefined to reduce noise
      if (finalId === undefined) {
        // Removed console.error
      }
      
      const firstName = user.firstName || user.first_name || student.firstName || '';
      const lastName = user.lastName || user.last_name || student.lastName || '';
      
      return {
        id: finalId,
        studentId: finalId, // Use the same numeric studentId from API for both id and studentId
        name: `${firstName} ${lastName}`.trim(),
        firstName,
        lastName,
        email: user.email || student.email || '',
        phone: user.phone || student.phone || '',
        gender: user.gender || student.gender || '',
        dateOfBirth: user.dateOfBirth || user.date_of_birth || student.date_of_birth,
        profilePicture: user.profilePicture || user.profile_picture || student.profile_picture,
        isActive: user.isActive !== undefined ? user.isActive : (user.is_active !== undefined ? user.is_active : true),
        username: user.username || student.username || '',
        // Class information
        class: {
          id: classInfo.classId || classInfo.id,
          name: classInfo.name,
          gradeLevel: classInfo.gradeLevel
        },
        // Additional fields from the API
        averageScore: student.averageScore || 0,
        timeSpent: student.timeSpent || 0,
        scores: student.scores || [],
        problemPoints: student.problemPoints || [],
        // Fallback for role structure
        role: {
          id: student.roleId || user.roleId,
          nameEn: student.roleNameEn || user.roleNameEn,
          nameKh: student.roleNameKh || user.roleNameKh
        },
        createdAt: student.createdAt || student.created_at || user.created_at,
        updatedAt: student.updatedAt || student.updated_at || user.updated_at
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
