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
   * @param {boolean|string} [params.status=true] - Filter by active status (accepts 'active', 'inactive', or boolean)
   * @param {number} [params.roleId=9] - Role ID for students (default: 9)
   * @param {string|number|null} [params.classId] - Filter by class ID, use 'null' string to get students without a class
   * @returns {Promise<Object>} Response with student data and pagination info
   */
  async getStudents(params = {}) {
    const { page = 1, limit = 10, search = '', status = true, roleId = 9, classId } = params;

    // Normalize status: accept 'active' | 'inactive' | '' | boolean
    let normalizedStatus = status;
    if (typeof status === 'string') {
      const s = status.trim().toLowerCase();
      if (s === 'active') normalizedStatus = true;
      else if (s === 'inactive') normalizedStatus = false;
      else normalizedStatus = undefined; // don't send status when empty/all
    }

    // Build query params, omitting undefined values
    const queryParams = {
      page,
      limit,
      search,
      roleId
    };
    if (normalizedStatus !== undefined) queryParams.status = normalizedStatus;
    if (classId !== undefined) queryParams.classId = classId;

    const response = await handleApiResponse(() =>
      apiClient_.get(`${ENDPOINTS.STUDENTS.BASE}`, { params: queryParams })
    );

    // Robustly extract data and pagination from various response shapes
    const d = response?.data;
    const list = Array.isArray(d?.data)
      ? d.data
      : (Array.isArray(d) ? d : []);

    const pagination = d?.pagination || {
      page: d?.page ?? page,
      limit: d?.limit ?? limit,
      total: d?.total ?? list.length,
      pages: d?.pages ?? Math.max(1, Math.ceil((d?.total ?? list.length) / (d?.limit ?? limit)))
    };

    return {
      data: list.map(student => studentService.utils.formatStudentData(student)),
      pagination
    };
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
      
      // Prepare request body based on number of students (matching addStudentsToClass format)
      const requestData = {
        classId: Number(classId)
      };
      
      if (numericUserIds.length === 1) {
        requestData.studentId = numericUserIds[0];
      } else {
        requestData.studentIds = numericUserIds;
      }
      
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
    
    // Convert all student IDs to positive integers and filter out invalid ones
    const validIds = ids
      .map(id => {
        const numId = parseInt(id);
        return isNaN(numId) || numId <= 0 ? null : numId;
      })
      .filter(id => id !== null);
    
    if (validIds.length === 0) {
      throw new Error('No valid student IDs provided');
    }
    
    // Prepare request body based on number of students
    const requestBody = {
      classId: parseInt(classId)
    };
    
    if (validIds.length === 1) {
      requestBody.studentId = validIds[0];
    } else {
      requestBody.studentIds = validIds;
    }
    
    console.log('Sending request to assign students:', requestBody);
    
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
   * Remove a single student from current class to master class
   * @param {string|number} classId - The ID of the class
   * @param {string|number} schoolId - The ID of the school
   * @param {string|number} studentId - The ID of the student to remove to master class
   * @returns {Promise<Object>} Remove response
   */
  async removeStudentToMasterClass(classId, schoolId, studentId) {
    try {
      const response = await handleApiResponse(() =>
        apiClient_.delete(`${ENDPOINTS.CLASSES.BASE}/${classId}/students/remove-to-master/${schoolId}`, {
          params: { studentId: Number(studentId) },
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
      
      console.log('Remove student to master class response:', response);
      return response;
      
    } catch (error) {
      console.error('Error in removeStudentToMasterClass:', error);
      throw error;
    }
  },

  /**
   * Remove multiple students from current class to master class
   * @param {string|number} classId - The ID of the class
   * @param {string|number} schoolId - The ID of the school
   * @param {Array<string|number>} studentIds - Array of student IDs to remove to master class
   * @returns {Promise<Object>} Remove response
   */
  async removeStudentsToMasterClass(classId, schoolId, studentIds) {
    try {
      // Convert to array if it's a single ID
      const ids = Array.isArray(studentIds) ? studentIds : [studentIds];
      
      // Convert all IDs to numbers
      const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));
      
      if (numericIds.length === 0) {
        throw new Error('No valid student IDs provided');
      }
      
      // If only one student, use the single student endpoint
      if (numericIds.length === 1) {
        return await this.removeStudentToMasterClass(classId, schoolId, numericIds[0]);
      }
      
      // For multiple students, use the bulk endpoint with body
      const response = await handleApiResponse(() =>
        apiClient_.delete(`${ENDPOINTS.CLASSES.BASE}/${classId}/students/remove-to-master/${schoolId}`, {
          data: { studentIds: numericIds },
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
      
      console.log('Remove students to master class response:', response);
      return response;
      
    } catch (error) {
      console.error('Error in removeStudentsToMasterClass:', error);
      throw error;
    }
  },

  /**
   * Get current teacher's students
   * @param {Object} params - Optional parameters for filtering
   * @param {number} [params.classId] - Specific class ID to filter students
   * @returns {Promise<Array>} List of students
   */
  async getMyStudents(params = {}) {
    try {
      const { classId } = params;
      
      // Use the proper my-students endpoint with optional classId filtering
      const queryParams = {};
      if (classId) {
        queryParams.classId = classId;
      }
      
      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.STUDENTS.MY_STUDENTS, {
          params: queryParams
        })
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
      
      console.log('Raw students data from my-students API:', studentsData);
      
      // Format student data
      const formattedStudents = studentsData.map(student => {
        return studentService.utils.formatStudentData(student);
      }).filter(student => student !== null);
      
      console.log(`getMyStudents: Found ${formattedStudents.length} students${classId ? ` for class ${classId}` : ' (all classes)'}`);
      
      return {
        success: true,
        data: formattedStudents,
        pagination: { page: 1, limit: 10, total: formattedStudents.length, pages: 1 }
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
   * Get all students from a specific school using master-class endpoint
   * @param {string|number} schoolId - The ID of the school
   * @param {Object} params - Query parameters for filtering
   * @param {string} [params.search=''] - Search term for filtering students
   * @param {number} [params.page=1] - Page number for pagination
   * @param {number} [params.limit=10] - Number of items per page
   * @returns {Promise<Object>} Response with student data from all classes in the school
   */
  async getStudentsBySchool(schoolId, params = {}) {
    try {
      if (!schoolId) {
        throw new Error('School ID is required to fetch students');
      }

      const { 
        search = '', 
        page = 1, 
        limit = 10,
        classId: incomingClassId
      } = params;

      // Import classService here to avoid circular dependency
      const { classService } = await import('./classService.js');
      
      // Determine classId to query: use provided, else auto-detect the Master Class id
      let classId = incomingClassId;
      if (!classId) {
        try {
          const classesResp = await classService.getMasterClassesList(schoolId, { page: 1, limit: 50 });
          const classes = classesResp?.data || [];
          const master = classes.find(c => c.section === 'MASTER' || /master/i.test(c.name || ''));
          if (master) {
            classId = master.class_id || master.classId || master.id;
            console.log('Auto-detected Master Class ID:', classId, 'for school', schoolId);
          } else {
            console.warn('Master Class not found for school', schoolId, '- falling back to no classId filter.');
          }
        } catch (e) {
          console.warn('Failed to fetch master classes list; proceeding without classId filter:', e);
        }
      }

      // Use the master-class endpoint to get students from the school with search and pagination
      const apiParams = {
        page,
        limit,
        search: search.trim()
      };

      if (classId) {
        apiParams.classId = String(classId);
      }

      const response = await classService.getMasterClasses(schoolId, apiParams);
      
      console.log('Raw master classes response for students:', response);
      
      if (!response.success) {
        throw new Error('Failed to fetch students from school');
      }

      let allStudents = response.data || [];
      
      // Format student data using our utility function
      const formattedStudents = allStudents.map(student => {
        return studentService.utils.formatStudentData(student);
      }).filter(student => student !== null);

      // Use server-side pagination directly since we only have search and pagination
      if (response.pagination) {
        console.log(`getStudentsBySchool: Using server-side search and pagination - Found ${formattedStudents.length} students from school ${schoolId} on page ${page}`);
        
        return {
          success: true,
          data: formattedStudents,
          pagination: response.pagination
        };
      }

      // Fallback to basic pagination if API doesn't provide pagination info
      console.log(`getStudentsBySchool: Fallback pagination - Found ${formattedStudents.length} students from school ${schoolId}`);
      
      return {
        success: true,
        data: formattedStudents,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: formattedStudents.length,
          pages: Math.ceil(formattedStudents.length / limit)
        }
      };
      
    } catch (error) {
      console.error('Error in getStudentsBySchool:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch students from school',
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 1 }
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
      // Structure 4: From master-class endpoint: {student_id, user_id, student_number, first_name, last_name, etc.}
      
      const user = student.user || student;
      const classInfo = student.class || {};
      
      // Handle master-class endpoint format with direct fields
      let finalId = student.student_id || student.studentId;
      
      // Fallback to other possible ID fields
      if (!finalId) {
        finalId = student.id || 
                  student.user_id ||      
                  student.userId ||       
                  user.id || 
                  user.userId || 
                  user.user_id;
      }
      
      // If still no ID, try to create a temporary unique identifier
      if (finalId === undefined || finalId === null) {
        finalId = user.username || student.username || 
                  user.email || student.email ||
                  `temp_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      }
      
      // Handle name fields - master-class endpoint uses direct first_name/last_name
      const firstName = student.first_name || user.firstName || user.first_name || student.firstName || '';
      const lastName = student.last_name || user.lastName || user.last_name || student.lastName || '';
      
      // Handle student number/ID display
      const studentNumber = student.student_number || student.studentNumber || student.studentId || finalId;
      
      return {
        id: finalId,
        studentId: studentNumber, // Use student_number for display purposes
        name: `${firstName} ${lastName}`.trim() || student.fullname || user.fullname || 'Unknown Student',
        firstName,
        lastName,
        email: student.email || user.email || '',
        phone: student.phone || user.phone || '',
        gender: student.gender || user.gender || '',
        dateOfBirth: student.date_of_birth || student.dateOfBirth || user.date_of_birth || user.dateOfBirth,
        profilePicture: student.profile_picture || student.profilePicture || user.profile_picture || user.profilePicture,
        isActive: student.student_status === 'ACTIVE' || student.isActive !== undefined ? student.isActive : (user.is_active !== undefined ? user.is_active : true),
        username: student.username || user.username || '',
        // Class information
        class: {
          id: student.class_id || classInfo.classId || classInfo.id,
          name: student.class_name || classInfo.name,
          gradeLevel: student.grade_level || classInfo.gradeLevel
        },
        // Additional fields from the API
        averageScore: student.averageScore || 0,
        timeSpent: student.timeSpent || 0,
        scores: student.scores || [],
        problemPoints: student.problemPoints || [],
        // Role information  
        role: {
          id: student.roleId || user.roleId,
          nameEn: student.roleNameEn || user.roleNameEn,
          nameKh: student.roleNameKh || user.roleNameKh
        },
        createdAt: student.student_created_at || student.createdAt || student.created_at || user.created_at,
        updatedAt: student.student_updated_at || student.updatedAt || student.updated_at || user.updated_at
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
