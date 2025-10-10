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
   * Bulk register multiple students
   * @param {Array} studentsData - Array of student data objects
   * @returns {Promise<Object>} Bulk registration response with success_count, failed_count, successful_students, and errors
   */
  async bulkRegister(studentsData) {
    return handleApiResponse(() =>
      apiClient_.post('/api/v1/students/bulk-register', { students: studentsData })
    );
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
   * @param {string|number} masterClassId - The ID of the master class (schoolId)
   * @param {string|number} studentId - The ID of the student to remove to master class
   * @returns {Promise<Object>} Remove response
   */
  async removeStudentToMasterClass(masterClassId, studentId) {
    try {
      console.log('Attempting to remove student from class to master class:', {
        masterClassId: masterClassId,
        studentId: studentId,
        endpoint: `/master-class/${masterClassId}/students/${studentId}/remove-from-class`
      });

      const response = await handleApiResponse(() =>
        apiClient_.delete(`/master-class/${masterClassId}/students/${studentId}/remove-from-class`, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );

      console.log('Remove student from class response:', response);
      return response;

    } catch (error) {
      console.error('Error in removeStudentToMasterClass:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        response: error.response?.data
      });
      throw error;
    }
  },

  /**
   * Remove multiple students from current class to master class
   * @param {string|number} masterClassId - The ID of the master class (schoolId)
   * @param {Array<string|number>} studentIds - Array of student IDs to remove to master class
   * @returns {Promise<Object>} Remove response
   */
  async removeStudentsToMasterClass(masterClassId, studentIds) {
    try {
      // Convert to array if it's a single ID
      const ids = Array.isArray(studentIds) ? studentIds : [studentIds];

      // Convert all IDs to numbers
      const numericIds = ids.map(id => Number(id)).filter(id => !isNaN(id));

      if (numericIds.length === 0) {
        throw new Error('No valid student IDs provided');
      }

      // Process each student individually using the new endpoint
      const results = [];
      for (const studentId of numericIds) {
        try {
          const response = await this.removeStudentToMasterClass(masterClassId, studentId);
          results.push({ studentId, success: true, response });
        } catch (error) {
          console.error(`Failed to remove student ${studentId}:`, error);
          results.push({ studentId, success: false, error: error.message });
        }
      }

      // Check if all succeeded
      const allSucceeded = results.every(r => r.success);
      const successCount = results.filter(r => r.success).length;

      console.log('Remove students to master class results:', results);

      return {
        success: allSucceeded,
        data: {
          message: `Successfully removed ${successCount} out of ${numericIds.length} students`,
          results,
          summary: {
            total: numericIds.length,
            successful: successCount,
            failed: numericIds.length - successCount
          }
        }
      };

    } catch (error) {
      console.error('Error in removeStudentsToMasterClass:', error);
      throw error;
    }
  },

  /**
   * Get students from school using the new /students/school/{schoolId}/classes endpoint
   * @param {string|number} schoolId - The ID of the school
   * @param {Object} params - Query parameters for filtering and pagination
   * @param {number} [params.page=1] - Page number for pagination
   * @param {number} [params.limit=10] - Number of items per page
   * @param {string} [params.search] - Search term for filtering students
   * @param {string|number} [params.classId] - Filter by specific class ID
   * @param {string|number} [params.gradeLevel] - Filter by grade level (1-6)
   * @param {boolean|string} [params.status] - Filter by active status (true/false/'active'/'inactive')
   * @returns {Promise<Object>} Response with student data and pagination info
   */
  async getStudentsBySchoolClasses(schoolId, params = {}) {
    try {
      if (!schoolId) {
        throw new Error('School ID is required to fetch students');
      }

      const {
        page = 1,
        limit = 10,
        search = '',
        classId,
        gradeLevel,
        status
      } = params;

      const queryParams = {
        page,
        limit
      };

      if (search && search.trim()) {
        queryParams.search = search.trim();
      }

      // Add classId filter if provided
      if (classId !== undefined && classId !== null && classId !== '' && classId !== 'all') {
        queryParams.classId = Number(classId);
      }

      // Add gradeLevel filter if provided
      if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '' && gradeLevel !== 'all') {
        queryParams.gradeLevel = Number(gradeLevel);
      }

      // Add status filter if provided
      if (status !== undefined && status !== null && status !== '' && status !== 'all') {
        // Normalize status to boolean
        if (typeof status === 'string') {
          if (status.toLowerCase() === 'active') {
            queryParams.status = true;
          } else if (status.toLowerCase() === 'inactive') {
            queryParams.status = false;
          }
        } else if (typeof status === 'boolean') {
          queryParams.status = status;
        }
      }

      console.log('=== FETCHING STUDENTS WITH FILTERS ===');
      console.log('School ID:', schoolId);
      console.log('Query params:', queryParams);

      const response = await handleApiResponse(() =>
        apiClient_.get(`/students/school/${schoolId}/classes`, {
          params: queryParams
        })
      );

      console.log('=== SCHOOL CLASSES STUDENTS API RESPONSE ===');
      console.log('Request params:', queryParams);
      console.log('Response data:', response.data);
      console.log('=== END RESPONSE ===');

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch students from school');
      }

      const d = response.data;
      const studentsData = Array.isArray(d?.data) ? d.data : [];

      // Format student data using the new structure
      const formattedStudents = studentsData.map(student => {
        return studentService.utils.formatSchoolClassesStudentData(student);
      }).filter(student => student !== null);

      // Use server-side pagination
      const pagination = {
        page: d.page || page,
        limit: d.limit || limit,
        total: d.total || formattedStudents.length,
        pages: d.totalPages || Math.max(1, Math.ceil((d.total || formattedStudents.length) / (d.limit || limit)))
      };

      console.log(`getStudentsBySchoolClasses: Found ${formattedStudents.length} students from school ${schoolId}`);

      return {
        success: true,
        data: formattedStudents,
        pagination,
        schoolInfo: d.schoolInfo
      };

    } catch (error) {
      console.error('Error in getStudentsBySchoolClasses:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch students from school',
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 1 }
      };
    }
  },

  /**
   * Get current teacher's students
   * @param {Object} params - Optional parameters for filtering and pagination
   * @param {number} [params.classId] - Specific class ID to filter students
   * @param {number} [params.page=1] - Page number for pagination
   * @param {number} [params.limit=5] - Number of items per page
   * @param {string} [params.search] - Search term for filtering students by name, username, email, etc.
   * @param {string} [params.academicYear] - Filter by academic year
   * @returns {Promise<Object>} Response with student data and pagination info
   */
  async getMyStudents(params = {}) {
    try {
      const {
        classId,
        class: classFilter,
        page = 1,
        limit = 5,
        status,
        academicYear,
        gender,
        dateOfBirth,
        gradeLevel,
        search
      } = params;

      // Use the proper my-students endpoint with pagination and optional filtering
      const queryParams = {
        page,
        limit
      };

      if (classId) queryParams.classId = classId;
      if (classFilter) queryParams.class = classFilter;
      if (status !== undefined && status !== null && status !== '') {
        queryParams.status = status;
      }
      if (academicYear) queryParams.academicYear = academicYear;
      if (gender) queryParams.gender = gender;
      if (dateOfBirth) queryParams.dateOfBirth = dateOfBirth;
      if (gradeLevel) queryParams.gradeLevel = gradeLevel;
      if (search) queryParams.search = search;
      
      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.STUDENTS.MY_STUDENTS, {
          params: queryParams
        })
      );
      
      // Handle the response data - using the same robust approach as getStudents
      const d = response?.data;
      const studentsData = Array.isArray(d?.data)
        ? d.data
        : (Array.isArray(d) ? d : (Array.isArray(response) ? response : []));
      
      console.log('=== MY-STUDENTS API RESPONSE DEBUG ===');
      console.log('Request URL params sent:', queryParams);
      console.log('Raw students data from my-students API:', studentsData);
      console.log('Students data length:', studentsData?.length);
      console.log('Full response structure:', response);
      console.log('Response.data structure:', d);
      console.log('Pagination info in response:', d?.pagination);
      console.log('Does response have pagination metadata?', !!d?.pagination);
      console.log('=== END MY-STUDENTS API RESPONSE DEBUG ===');
      
      // Format student data
      const formattedStudents = studentsData.map(student => {
        return studentService.utils.formatStudentData(student);
      }).filter(student => student !== null);
      
      // Robust pagination extraction - try multiple paths and check if server provided total
      let serverTotal = d?.total || d?.pagination?.total || response?.total || response?.pagination?.total;
      
      // If no server total and we got exactly the limit, assume there might be more pages
      if (!serverTotal && formattedStudents.length === parseInt(limit)) {
        console.warn('No server total provided but got full page - pagination may be incomplete');
      }
      
      const pagination = d?.pagination || {
        page: d?.page ?? parseInt(page),
        limit: d?.limit ?? parseInt(limit),
        total: serverTotal ?? formattedStudents.length,
        pages: d?.pages ?? Math.max(1, Math.ceil((serverTotal ?? formattedStudents.length) / (d?.limit ?? parseInt(limit))))
      };
      
      console.log('Final pagination object:', pagination);
      
      console.log(`getMyStudents: Found ${formattedStudents.length} students${classId ? ` for class ${classId}` : ' (all classes)'} - Page ${page}/${pagination.pages}`);
      
      return {
        success: true,
        data: formattedStudents,
        pagination
      };
      
    } catch (error) {
      console.error('Error in getMyStudents:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to fetch students',
        data: [],
        pagination: { page: 1, limit: 5, total: 0, pages: 1 }
      };
    }
  },

  /**
   * Transfer a student from current class to another class
   * @param {string|number} masterClassId - The ID of the master class
   * @param {string|number} studentId - The ID of the student to transfer
   * @param {string|number} targetClassId - The ID of the target class
   * @returns {Promise<Object>} Transfer response
   */
  async transferStudentToClass(masterClassId, studentId, targetClassId) {
    try {
      console.log('Attempting to transfer student:', {
        masterClassId,
        studentId,
        targetClassId,
        endpoint: `/master-class/${masterClassId}/students/${studentId}/transfer-to-class/${targetClassId}`
      });

      const response = await handleApiResponse(() =>
        apiClient_.post(`/master-class/${masterClassId}/students/${studentId}/transfer-to-class/${targetClassId}`)
      );

      console.log('Transfer student response:', response);
      return response;

    } catch (error) {
      console.error('Error in transferStudentToClass:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        statusText: error.statusText,
        response: error.response?.data
      });
      throw error;
    }
  },

  /**
   * Get all students from a specific school using master-class endpoint
   * @param {string|number} schoolId - The ID of the school
   * @param {Object} params - Query parameters for filtering
   * @param {string} [params.search=''] - Search term for filtering students
   * @param {number} [params.page=1] - Page number for pagination
   * @param {number} [params.limit=10] - Number of items per page
   * @param {string} [params.academicYear] - Filter by academic year
   * @param {string} [params.gender] - Filter by gender (MALE/FEMALE)
   * @param {string} [params.dateOfBirth] - Filter by date of birth (YYYY-MM-DD)
   * @param {string|number} [params.gradeLevel] - Filter by grade level
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
        classId: incomingClassId,
        academicYear,
        gender,
        dateOfBirth,
        gradeLevel
      } = params;

      // Use the provided classId or default to no filter (get all students from school)
      const classId = incomingClassId;

      // Import classService here to avoid circular dependency
      const { classService } = await import('./classService.js');

      // Use the master-class endpoint to get students from the school with search and pagination
      const apiParams = {
        page,
        limit,
        search: search.trim()
      };

      if (classId) {
        apiParams.classId = String(classId);
      }

      // Add additional filters
      if (academicYear) apiParams.academicYear = academicYear;
      if (gender) apiParams.gender = gender;
      if (dateOfBirth) apiParams.dateOfBirth = dateOfBirth;
      if (gradeLevel) apiParams.gradeLevel = gradeLevel;

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
     * Format student data from /students/school/{schoolId}/classes endpoint
     * @param {Object} student - Raw student data from school classes API
     * @returns {Object} Formatted student data
     */
    formatSchoolClassesStudentData(student) {
      if (!student) return null;

      const user = student.user || {};
      const classInfo = student.class || {};

      return {
        id: student.studentId,
        userId: user.id,
        studentId: student.studentId,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unknown Student',
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || '',
        dateOfBirth: user.date_of_birth || user.dateOfBirth,
        academicYear: student.academicYear,
        gradeLevel: student.gradeLevel,
        profilePicture: user.profile_picture || user.profilePicture,
        isActive: true, // Assume active since they're in classes
        username: user.username || '',
        class: {
          id: classInfo.classId,
          name: classInfo.name,
          gradeLevel: classInfo.gradeLevel,
          academicYear: student.academicYear
        },
        averageScore: student.averageScore || 0,
        timeSpent: student.timeSpent || 0,
        scores: student.scores || [],
        problemPoints: student.problemPoints || [],
        role: {
          id: 9, // Student role
          nameEn: 'Student',
          nameKh: 'សិស្ស'
        },
        createdAt: user.created_at,
        updatedAt: user.updated_at
      };
    },

    /**
     * Format raw student data from API to consistent format
     * @param {Object} student - Raw student data from API
     * @returns {Object} Formatted student data
     */
    formatStudentData(student) {
      if (!student) return null;
      
      // Handle different API response structures
      const user = student.user || student;
      const classInfo = student.class || {};
      
      // Prefer studentId (e.g., student_number) as display id if present
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
      
      // Resolve the underlying users_id for updates (nested user.id in MY_STUDENTS responses)
      const resolvedUserId = user?.id || user?.userId || user?.user_id || student.user_id || student.userId || undefined;
      
      // If still no ID, generate a temporary one for UI keys
      if (finalId === undefined || finalId === null) {
        finalId = user.username || student.username || user.email || student.email || `temp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      }
      
      // Names
      const firstName = student.first_name || user.firstName || user.first_name || student.firstName || '';
      const lastName = student.last_name || user.lastName || user.last_name || student.lastName || '';
      
      // Student number for display
      const studentNumber = student.student_number || student.studentNumber || student.studentId || finalId;
      
      return {
        // id remains for table selection; usually studentId
        id: finalId,
        // explicit users_id for API use
        userId: resolvedUserId,
        studentId: studentNumber,
        name: `${firstName} ${lastName}`.trim() || student.fullname || user.fullname || 'Unknown Student',
        firstName,
        lastName,
        email: student.email || user.email || '',
        phone: student.phone || user.phone || '',
        gender: student.gender || user.gender || '',
        dateOfBirth: student.date_of_birth || student.dateOfBirth || user.date_of_birth || user.dateOfBirth,
        academicYear: student.academic_year || classInfo.academicYear,
        gradeLevel: student.grade_level || classInfo.gradeLevel,
        profilePicture: student.profile_picture || student.profilePicture || user.profile_picture || user.profilePicture,
        isActive: student.student_status === 'ACTIVE' || student.isActive !== undefined ? student.isActive : (user.is_active !== undefined ? user.is_active : true),
        username: student.username || user.username || '',
        class: {
          id: student.class_id || classInfo.classId || classInfo.id,
          name: student.class_name || classInfo.name,
          gradeLevel: student.grade_level || classInfo.gradeLevel,
          academicYear: student.academic_year || classInfo.academicYear
        },
        averageScore: student.averageScore || 0,
        timeSpent: student.timeSpent || 0,
        scores: student.scores || [],
        problemPoints: student.problemPoints || [],
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
