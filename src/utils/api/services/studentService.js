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
   * @param {boolean|string} [params.status] - Filter by active status (accepts 'active', 'inactive', or boolean, defaults to undefined for all)
   * @param {number} [params.roleId=9] - Role ID for students (default: 9)
   * @param {string|number|null} [params.classId] - Filter by class ID, use 'null' string to get students without a class
   * @returns {Promise<Object>} Response with student data and pagination info
   */
  async getStudents(params = {}) {
    const { page = 1, limit = 10, search = '', status = undefined, roleId = 9, classId, gradeLevel } = params;

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
    if (gradeLevel !== undefined && gradeLevel !== null && gradeLevel !== '' && gradeLevel !== 'all') {
      queryParams.gradeLevel = gradeLevel;
    }

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
    console.log('🚀 Bulk register request data:', JSON.stringify({ students: studentsData }, null, 2));

    // Check for debug mode errors
    if (typeof window !== 'undefined' && window.__DEBUG_API) {
      const debugState = window.__DEBUG_API.getDebugState?.() || {};

      if (debugState.failBulkRegister) {
        console.warn('🐛 DEBUG: Simulating bulk register failure');
        return Promise.reject({
          status: 500,
          message: 'Server error: Failed to queue bulk registration',
          errors: ['Internal server error while processing bulk registration']
        });
      }

      if (debugState.simulatePartialFailure) {
        console.warn(`🐛 DEBUG: Simulating ${debugState.simulatePartialFailure} failure rate`);
        // Return successful batch with results showing some failures
        const failureRate = debugState.simulatePartialFailure === 'half' ? 0.5 :
                           debugState.simulatePartialFailure === 'quarter' ? 0.25 : 1;
        const failCount = Math.ceil(studentsData.length * failureRate);

        return Promise.resolve({
          success: true,
          data: {
            batch_id: `debug_batch_${Date.now()}`,
            total: studentsData.length,
            success_count: studentsData.length - failCount,
            failed_count: failCount,
            message: 'Batch queued for processing'
          }
        });
      }
    }

    return handleApiResponse(() =>
      apiClient_.post(ENDPOINTS.STUDENTS.BULK_REGISTER, { students: studentsData })
    );
  },

  /**
   * Get the status of a bulk registration batch
   * @param {string} batchId - The batch ID from the bulk register response
   * @returns {Promise<Object>} Batch status with completed count, results, etc.
   */
  async getBulkRegistrationStatus(batchId) {
    console.log(`📊 Checking bulk registration status for batch: ${batchId}`);

    // Check for debug mode errors
    if (typeof window !== 'undefined' && window.__DEBUG_API && batchId.startsWith('debug_batch_')) {
      const debugState = window.__DEBUG_API.getDebugState?.() || {};

      if (debugState.failBulkStatus) {
        console.warn('🐛 DEBUG: Simulating bulk status check failure');
        return Promise.reject({
          status: 500,
          message: 'Server error: Failed to check batch status',
          errors: ['Internal server error while checking batch status']
        });
      }

      // Simulate completed batch with some failures
      console.log('🐛 DEBUG: Returning simulated batch completion status');
      return Promise.resolve({
        success: true,
        data: {
          batch_id: batchId,
          completed: 5, // Simulate 5 students completed
          total: 5,
          success_count: 3,
          failed_count: 2,
          is_complete: true,
          results: [
            { index: 0, success: true, data: { id: 1, username: 'student1' } },
            { index: 1, success: true, data: { id: 2, username: 'student2' } },
            { index: 2, success: true, data: { id: 3, username: 'student3' } },
            { index: 3, success: false, error: 'Email already exists' },
            { index: 4, success: false, error: 'Username already taken' }
          ]
        }
      });
    }

    return handleApiResponse(() =>
      apiClient_.get(ENDPOINTS.STUDENTS.BULK_REGISTER_STATUS(batchId))
    );
  },

  /**
   * Clear batch data on the server after processing completes
   * @param {string} batchId - The batch ID from the bulk register response
   * @returns {Promise<Object>} Clear batch response
   */
  async clearBulkRegistrationBatch(batchId) {
    console.log(`🧹 Clearing batch data for batch: ${batchId}`);

    // Check for debug mode
    if (typeof window !== 'undefined' && window.__DEBUG_API && batchId.startsWith('debug_batch_')) {
      console.log('🐛 DEBUG: Simulating batch clear (debug mode)');
      return Promise.resolve({
        success: true,
        data: {
          message: 'Batch data cleared successfully'
        }
      });
    }

    return handleApiResponse(() =>
      apiClient_.post(ENDPOINTS.STUDENTS.BULK_REGISTER_CLEAR(batchId))
    );
  },

  /**
   * Register a single student (same format as bulk register)
   * @param {Object} studentData - Single student data object
   * @returns {Promise<Object>} Registration response
   */
  async register(studentData) {
    console.log('🚀 Single register request data:', JSON.stringify(studentData, null, 2));
    return handleApiResponse(() =>
      apiClient_.post(ENDPOINTS.STUDENTS.BULK_REGISTER, studentData)
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
        status,
        hasAccessibility,
        isEtnicgroup
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
        queryParams.gradeId = Number(gradeLevel);
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

      // Add hasAccessibility filter for students with disabilities (report6)
      if (hasAccessibility === true) {
        queryParams.hasAccessibility = true;
      }

      // Add isEtnicgroup filter for ethnic minority students (report9)
      if (isEtnicgroup === true) {
        queryParams.isEtnicgroup = true;
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
      if (gradeLevel) queryParams.gradeId = gradeLevel;
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
   * Transfer a student between schools (master classes)
   * @param {Object} payload
   * @param {string|number} payload.studentId - The ID of the student to transfer
   * @param {string|number} payload.fromSchoolId - Source school ID
   * @param {string|number} payload.toSchoolId - Target school ID
   * @param {string|number} payload.toMasterClassId - Target master class ID
   * @returns {Promise<Object>} Transfer response
   */
  async transferStudentBetweenMasterClasses({ studentId, fromSchoolId, toSchoolId, toMasterClassId }) {
    try {
      const body = {
        studentId: Number(studentId),
        fromSchoolId: Number(fromSchoolId),
        toSchoolId: Number(toSchoolId),
        toMasterClassId: Number(toMasterClassId)
      };

      console.log('Attempting to transfer student between master classes:', {
        ...body,
        endpoint: ENDPOINTS.CLASSES.TRANSFER_STUDENT_MASTERCLASS
      });

      const response = await handleApiResponse(() =>
        apiClient_.post(ENDPOINTS.CLASSES.TRANSFER_STUDENT_MASTERCLASS, body)
      );

      console.log('Transfer student between master classes response:', response);
      return response;

    } catch (error) {
      console.error('Error in transferStudentBetweenMasterClasses:', error);
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
   * @param {boolean} [params.hasAccessibility] - Filter students with disabilities (accessibility field not empty)
   * @param {boolean} [params.isEthnicMinority] - Filter ethnic minority students (ethnic_group not Khmer)
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
        gradeLevel,
        createdAt,
        status,
        hasAccessibility,
        isEthnicMinority
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
      if (createdAt) apiParams.createdAt = createdAt;
      if (status !== undefined) apiParams.status = status;

      // Add report-specific filters for performance optimization
      if (hasAccessibility === true) apiParams.hasAccessibility = true;
      if (isEthnicMinority === true) apiParams.isEthnicMinority = true;

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

      // Handle both nested user object and flat user data
      const user = student.user || student;
      const classInfo = student.class || {};

      // Extract class information from either nested object or flattened fields
      const classId = classInfo.classId || student.class_id;
      const className = classInfo.name || student.class_name;
      const classGradeLevel = classInfo.gradeLevel || student.class_grade_level;
      const classSection = classInfo.section || student.section;
      const classAcademicYear = classInfo.academicYear || student.class_academic_year;

      // Extract student number from the nested student object if available
      // Try multiple possible locations where studentNumber might be
      const studentNumber =
        student.student?.studentNumber ||      // Nested in student.student.studentNumber
        student.studentNumber ||                // Direct studentNumber field
        student.student_number ||               // Flattened student_number field
        user.student?.studentNumber ||          // Nested in user.student.studentNumber
        student.studentId ||                    // Fallback to studentId
        student.student_id ||                   // Flattened student_id
        student.id;                             // Last resort fallback

      const firstName = user.firstName || user.first_name || '';
      const lastName = user.lastName || user.last_name || '';

      return {
        id: student.studentId || student.student_id,
        userId: user.id || student.user_id,
        studentId: student.studentId || student.student_id,
        studentNumber: studentNumber,
        name: `${firstName} ${lastName}`.trim() || user.username || 'Unknown Student',
        firstName: firstName,
        lastName: lastName,
        email: user.email || '',
        phone: user.phone || '',
        gender: user.gender || '',
        dateOfBirth: user.date_of_birth || user.dateOfBirth,
        date_of_birth: user.date_of_birth || user.dateOfBirth,
        academicYear: student.academicYear || student.academic_year,
        gradeLevel: student.gradeLevel || student.grade_level,
        profilePicture: user.profile_picture || user.profilePicture,
        isActive: true, // Assume active since they're in classes
        username: user.username || '',
        class: classId ? {
          id: classId,
          classId: classId,
          name: className,
          gradeLevel: classGradeLevel,
          section: classSection,
          academicYear: classAcademicYear
        } : null,
        averageScore: student.averageScore || 0,
        timeSpent: student.timeSpent || 0,
        scores: student.scores || [],
        problemPoints: student.problemPoints || [],
        role: {
          id: 9, // Student role
          nameEn: 'Student',
          nameKh: 'សិស្ស'
        },
        // Health information
        weight_kg: user.weight_kg,
        height_cm: user.height_cm,
        bmi: user.bmi,
        // Demographics information
        ethnic_group: student.ethnic_group || user.ethnic_group,
        ethnicGroup: student.ethnicGroup || student.ethnic_group || user.ethnicGroup || user.ethnic_group,
        accessibility: student.accessibility || user.accessibility,
        specialNeeds: student.special_needs || student.specialNeeds || user.special_needs || user.specialNeeds,
        // Books information
        bookIds: student.bookIds || student.book_ids || user.bookIds || user.book_ids || [],
        // QR Code data from nested user object
        qrCode: user.qr_code || null,
        qrToken: user.qr_token || null,
        qrGeneratedAt: user.qr_generated_at || null,
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

      console.log('formatStudentData - Raw student input:', student);

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

      // School information (for global /students endpoint)
      const schoolInfo = student.school || {};
      
      return {
        // id remains for table selection; usually studentId
        id: finalId,
        // explicit users_id for API use
        userId: resolvedUserId,
        studentId: studentNumber,
        studentNumber: studentNumber,
        name: `${firstName} ${lastName}`.trim() || student.fullname || user.fullname || 'Unknown Student',
        firstName,
        lastName,
        email: student.email || user.email || '',
        phone: student.phone || user.phone || '',
        gender: student.gender || user.gender || '',
        dateOfBirth: student.date_of_birth || student.dateOfBirth || user.date_of_birth || user.dateOfBirth,
        date_of_birth: student.date_of_birth || student.dateOfBirth || user.date_of_birth || user.dateOfBirth,
        academicYear: student.academic_year || classInfo.academicYear,
        gradeLevel: student.grade_level || student.gradeLevel || classInfo.gradeLevel,
        profilePicture: student.profile_picture || student.profilePicture || user.profile_picture || user.profilePicture,
        isActive: user.is_active !== false, // Map is_active from nested user object, defaulting to true if undefined
        username: student.username || user.username || '',
        // School info
        schoolId: schoolInfo.schoolId || schoolInfo.id || student.schoolId || student.school_id,
        schoolName: schoolInfo.name,
        schoolCode: schoolInfo.code,
        school: Object.keys(schoolInfo).length ? schoolInfo : undefined,
        class:
          student.class === null && !student.class_id && !student.class_name
            ? null
            : {
                id: student.class_id || classInfo.classId || classInfo.id,
                classId: student.class_id || classInfo.classId || classInfo.id,
                name: student.class_name || classInfo.name,
                gradeLevel: student.class_grade_level || student.grade_level || classInfo.gradeLevel,
                section: student.section || classInfo.section,
                academicYear: student.class_academic_year || student.academic_year || classInfo.academicYear,
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
        // Parent information
        parents: student.parents || user.parents || [],
        // Address information
        residence: student.residence || user.residence,
        placeOfBirth: student.place_of_birth || student.placeOfBirth || user.place_of_birth || user.placeOfBirth,
        nationality: student.nationality || user.nationality,
        minority: student.minority || user.minority,
        ethnic_group: student.ethnic_group || user.ethnic_group,
        ethnicGroup: student.ethnicGroup || student.ethnic_group || user.ethnicGroup || user.ethnic_group,
        accessibility: student.accessibility || user.accessibility,
        specialNeeds: student.special_needs || student.specialNeeds || user.special_needs || user.specialNeeds,
        village: student.village || user.village,
        commune: student.commune || user.commune,
        district: student.district || user.district,
        province: student.province || user.province,
        student: student.student || user.student,
        // Health information
        weight_kg: student.weight_kg || user.weight_kg,
        height_cm: student.height_cm || user.height_cm,
        bmi: student.bmi || user.bmi,
        // Books information
        bookIds: student.bookIds || student.book_ids || user.bookIds || user.book_ids || [],
        // QR Code data from nested user object
        qrCode: user.qr_code || null,
        qrToken: user.qr_token || null,
        qrGeneratedAt: user.qr_generated_at || null,
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
    },

    /**
     * Enrich student data with full user profile information by fetching user details by ID
     * Fetches complete user data including QR code, residence info, and student details
     *
     * @param {Array} students - Array of students with userId (from nested user.id)
     * @returns {Promise<Array>} Students enriched with full user profile data
     *
     * @example
     * // Usage in component:
     * const enrichedStudents = await studentService.enrichStudentsWithUserProfiles(students);
     *
     * // Each student will have:
     * {
     *   studentId: 414656,
     *   userId: "1469188",
     *   name: "ឈ្មោះ",
     *   userProfile: {
     *     id: "1469188",
     *     username: "STU414656",
     *     first_name: "ឈ្មោះ",
     *     last_name: "ត្រកូល",
     *     email: "...",
     *     phone: "...",
     *     gender: "MALE|FEMALE",
     *     date_of_birth: "YYYY-MM-DD",
     *     profile_picture: "...",
     *     qr_code: "data:image/png;base64,...",
     *     qr_token: "...",
     *     qr_generated_at: "...",
     *     student: { studentId, userId, academicYear, gradeLevel, classId, ... },
     *     residence: { id, userId, provinceId, districtId, communeId, villageId, ... },
     *     accessibility: [...],
     *     is_active: true/false,
     *     is_hidden: true/false,
     *     last_login: "...",
     *     created_at: "...",
     *     updated_at: "...",
     *     roleNameEn: "STUDENT",
     *     roleNameKh: "សិស្ស"
     *   }
     * }
     */
    async enrichStudentsWithUserProfiles(students) {
      try {
        if (!Array.isArray(students) || students.length === 0) {
          return students;
        }

        // Import userService here to avoid circular dependency
        const { userService } = await import('./userService.js');

        // Fetch user profiles in parallel for all unique user IDs
        const userIds = [...new Set(students.map(s => s.userId).filter(Boolean))];

        console.log(`Enriching ${students.length} students with full user profiles for ${userIds.length} unique users`);

        const userProfiles = {};

        // Fetch all user profiles in parallel
        const profilePromises = userIds.map(userId =>
          userService.getUserByID(userId)
            .then(response => {
              // Handle different response structures - API might return data directly or wrapped in .data
              let profileData = null;

              if (response && response.data && typeof response.data === 'object') {
                // Response wrapped in .data (standard API response format)
                profileData = response.data;
              } else if (response && typeof response === 'object' && !Array.isArray(response)) {
                // Response is direct data (some endpoints return data directly)
                profileData = response;
              }

              if (profileData && profileData.id) {
                userProfiles[userId] = profileData;
                console.log(`✅ Fetched profile for user ${userId}:`, {
                  hasQRCode: !!profileData.qr_code,
                  hasQRToken: !!profileData.qr_token,
                  qrCode: profileData.qr_code || 'undefined',
                  qrToken: profileData.qr_token || 'undefined',
                  allKeys: Object.keys(profileData).slice(0, 15)
                });
              } else {
                console.warn(`⚠️ No valid data in response for userId ${userId}:`, response);
              }
              return null;
            })
            .catch(error => {
              console.error(`Failed to fetch user profile for userId ${userId}:`, error);
              return null;
            })
        );

        await Promise.all(profilePromises);

        // Enrich students with complete user profile data
        const enrichedStudents = students.map(student => ({
          ...student,
          userProfile: userProfiles[student.userId] || null
        }));

        console.log(`Enriched ${enrichedStudents.length} students with user profile data`);

        // Log enrichment result for first student
        if (enrichedStudents.length > 0) {
          const firstStudent = enrichedStudents[0];
          console.log(`📦 First enriched student:`, {
            name: firstStudent.name,
            userId: firstStudent.userId,
            hasUserProfile: !!firstStudent.userProfile,
            userProfileQRCode: firstStudent.userProfile?.qr_code || 'undefined',
            userProfileQRToken: firstStudent.userProfile?.qr_token || 'undefined'
          });
        }

        return enrichedStudents;
      } catch (error) {
        console.error('Error enriching students with user profiles:', error);
        // Return original students if enrichment fails
        return students;
      }
    },

    /**
     * Extract QR code data from student
     * Works with both formatted and enriched student data
     *
     * @param {Object} student - Student object (formatted or enriched)
     * @returns {Object|null} QR code object with qr_code and qr_token, or null if not available
     */
    extractQRCodeFromProfile(student) {
      // Try direct fields first (from formatted data)
      if (student?.qrCode && student?.qrToken) {
        return {
          qr_code: student.qrCode,
          qr_token: student.qrToken,
          qr_generated_at: student.qrGeneratedAt,
          username: student.username,
          userId: student.userId
        };
      }

      // Try enriched user profile
      const userProfile = student?.userProfile;
      if (userProfile) {
        // The API returns qr_code as a base64 string (data:image/png...)
        // Validate both fields exist and have content
        const hasQRCode = userProfile.qr_code &&
                         (userProfile.qr_code.startsWith('data:') ||
                          userProfile.qr_code.includes('-'));
        const hasQRToken = userProfile.qr_token && userProfile.qr_token.length > 10;

        if (hasQRCode && hasQRToken) {
          return {
            qr_code: userProfile.qr_code,
            qr_token: userProfile.qr_token,
            qr_generated_at: userProfile.qr_generated_at,
            username: userProfile.username,
            userId: userProfile.id
          };
        }
      }

      return null;
    },

    /**
     * Extract residence information from enriched student profile
     * @param {Object} enrichedStudent - Student object enriched with userProfile
     * @returns {Object|null} Residence object with location details, or null if not available
     */
    extractResidenceFromProfile(enrichedStudent) {
      const residence = enrichedStudent?.userProfile?.residence;
      if (!residence) {
        return null;
      }

      return {
        id: residence.id,
        provinceId: residence.provinceId,
        districtId: residence.districtId,
        communeId: residence.communeId,
        villageId: residence.villageId,
        fullAddress: residence.fullAddress,
        province: residence.province,
        district: residence.district,
        commune: residence.commune,
        village: residence.village
      };
    },

    /**
     * Check if a student has an existing QR code
     * Works with both:
     * 1. Formatted student data from getStudentsBySchoolClasses (has qrCode/qrToken directly)
     * 2. Enriched student data with userProfile (has userProfile.qr_code/qr_token)
     *
     * @param {Object} student - Student object (formatted or enriched)
     * @returns {boolean} True if student has existing QR code
     */
    hasExistingQRCode(student) {
      // Check direct QR code fields (from formatted data)
      if (student?.qrCode && student?.qrToken) {
        return true;
      }

      // Check enriched user profile
      const userProfile = student?.userProfile;
      if (userProfile) {
        // The API returns qr_code as a base64 string (data:image/png...)
        // Check if it's a valid base64 string or UUID token
        const hasQRCode = userProfile.qr_code &&
                         (userProfile.qr_code.startsWith('data:') ||
                          userProfile.qr_code.includes('-'));
        const hasQRToken = userProfile.qr_token && userProfile.qr_token.length > 10;

        if (hasQRCode && hasQRToken) {
          return true;
        }
      }

      return false;
    },

    /**
     * Get QR code generation timestamp
     * Works with both formatted and enriched student data
     *
     * @param {Object} student - Student object (formatted or enriched)
     * @returns {string|null} ISO format timestamp when QR was generated, or null
     */
    getQRGeneratedAt(student) {
      // Check direct field (from formatted data)
      if (student?.qrGeneratedAt) {
        return student.qrGeneratedAt;
      }

      // Check enriched user profile
      const userProfile = student?.userProfile;
      if (userProfile?.qr_generated_at) {
        return userProfile.qr_generated_at;
      }

      return null;
    },

    /**
     * Categorize students into groups based on QR code status
     * Useful for showing current QR codes vs generating new ones
     *
     * @param {Array} enrichedStudents - Array of students enriched with userProfile
     * @returns {Object} Categorized students with the structure:
     * {
     *   hasQRCode: Array<{student, qrCode, generatedAt}>,
     *   needsQRCode: Array<student>,
     *   summary: {
     *     total: number,
     *     withQR: number,
     *     withoutQR: number
     *   }
     * }
     *
     * @example
     * const enrichedStudents = await studentService.enrichStudentsWithUserProfiles(students);
     * const categorized = studentService.categorizeStudentsByQRStatus(enrichedStudents);
     *
     * // Display existing QR codes
     * categorized.hasQRCode.forEach(item => {
     *   showQRCode(item.student.name, item.qrCode, item.generatedAt);
     * });
     *
     * // Generate new QR codes for students who need them
     * if (categorized.needsQRCode.length > 0) {
     *   generateQRCodesForStudents(categorized.needsQRCode);
     * }
     */
    categorizeStudentsByQRStatus(enrichedStudents) {
      if (!Array.isArray(enrichedStudents)) {
        return {
          hasQRCode: [],
          needsQRCode: [],
          summary: { total: 0, withQR: 0, withoutQR: 0 }
        };
      }

      const hasQRCode = [];
      const needsQRCode = [];

      enrichedStudents.forEach(student => {
        if (this.hasExistingQRCode(student)) {
          hasQRCode.push({
            student,
            qrCode: this.extractQRCodeFromProfile(student),
            generatedAt: this.getQRGeneratedAt(student)
          });
        } else {
          needsQRCode.push(student);
        }
      });

      console.log(`QR Status Summary: ${hasQRCode.length} students have QR codes, ${needsQRCode.length} need new QR codes`);

      return {
        hasQRCode,
        needsQRCode,
        summary: {
          total: enrichedStudents.length,
          withQR: hasQRCode.length,
          withoutQR: needsQRCode.length
        }
      };
    },

    /**
     * Get display information for a student with QR code status
     * Combines student data with QR code information for UI display
     *
     * @param {Object} enrichedStudent - Student object enriched with userProfile
     * @returns {Object} Display-ready student data with QR status
     *
     * @example
     * const displayData = studentService.getStudentQRDisplayInfo(student);
     * console.log(displayData);
     * // {
     * //   id: 414656,
     * //   name: "ឈ្មោះ ត្រកូល",
     * //   hasQRCode: true,
     * //   qrCode: "data:image/png;base64,...",
     * //   qrToken: "1e101645f2bbbbd1121c1a1a20dd74d60f57b7cf...",
     * //   qrGeneratedAt: "2025-11-04T07:01:13.407Z",
     * //   qrStatus: "current" | "expired" | "none",
     * //   username: "STU414656",
     * //   profilePicture: "...",
     * //   gradeLevel: "4",
     * //   className: "Class Name"
     * // }
     */
    getStudentQRDisplayInfo(enrichedStudent) {
      const userProfile = enrichedStudent?.userProfile;
      const qrData = this.extractQRCodeFromProfile(enrichedStudent);
      const generatedAt = this.getQRGeneratedAt(enrichedStudent);

      // Determine QR status (you can add expiration logic here if needed)
      let qrStatus = 'none';
      if (qrData) {
        // Check if QR was generated recently (within last 30 days)
        const generatedDate = new Date(generatedAt);
        const daysSinceGeneration = Math.floor((Date.now() - generatedDate.getTime()) / (1000 * 60 * 60 * 24));
        qrStatus = daysSinceGeneration <= 30 ? 'current' : 'expired';
      }

      return {
        id: enrichedStudent.studentId || enrichedStudent.id,
        userId: enrichedStudent.userId,
        name: enrichedStudent.name,
        firstName: enrichedStudent.firstName,
        lastName: enrichedStudent.lastName,
        username: userProfile?.username || enrichedStudent.username,
        profilePicture: userProfile?.profile_picture || enrichedStudent.profilePicture,
        gradeLevel: enrichedStudent.gradeLevel,
        className: enrichedStudent.class?.name,
        classId: enrichedStudent.class?.id,
        hasQRCode: !!qrData,
        qrCode: qrData?.qr_code || null,
        qrToken: qrData?.qr_token || null,
        qrGeneratedAt: generatedAt,
        qrStatus, // 'current', 'expired', or 'none'
        email: userProfile?.email || enrichedStudent.email,
        phone: userProfile?.phone || enrichedStudent.phone,
        gender: userProfile?.gender || enrichedStudent.gender,
        dateOfBirth: userProfile?.date_of_birth || enrichedStudent.dateOfBirth
      };
    },

    /**
     * Debug helper - Log QR code data for a student
     * Use this to verify QR code data is present in formatted student data
     *
     * @param {Object} student - Student object to debug
     * @returns {Object} Debug info with all QR related fields
     */
    debugStudentQRData(student) {
      const hasDirectQR = !!(student?.qrCode && student?.qrToken);
      const hasEnrichedQR = !!(student?.userProfile?.qr_code && student?.userProfile?.qr_token);
      const qrData = this.extractQRCodeFromProfile(student);

      const debugInfo = {
        studentName: student?.name,
        studentId: student?.studentId,
        userId: student?.userId,
        hasDirectQRFields: hasDirectQR,
        directQRCode: student?.qrCode ? '✅ Present' : '❌ Missing',
        directQRToken: student?.qrToken ? '✅ Present' : '❌ Missing',
        directQRGeneratedAt: student?.qrGeneratedAt || '❌ Not available',
        hasEnrichedQRFields: hasEnrichedQR,
        enrichedQRCode: student?.userProfile?.qr_code ? '✅ Present' : '❌ Missing',
        enrichedQRToken: student?.userProfile?.qr_token ? '✅ Present' : '❌ Missing',
        enrichedQRGeneratedAt: student?.userProfile?.qr_generated_at || '❌ Not available',
        hasExistingQRCode: this.hasExistingQRCode(student),
        extractedQRData: qrData ? '✅ Successfully extracted' : '❌ Failed to extract',
        qrStatus: qrData ? (this.getQRGeneratedAt(student) ? 'Has QR code' : 'No timestamp') : 'No QR data'
      };

      console.log(`🔍 QR Debug for ${student?.name}:`, debugInfo);
      return debugInfo;
    },

    /**
     * Debug helper - Log QR data for multiple students
     * Use this to verify QR code presence across all students
     *
     * @param {Array} students - Array of students to debug
     * @returns {Object} Summary of QR code status
     */
    debugStudentListQRData(students) {
      if (!Array.isArray(students)) {
        console.warn('debugStudentListQRData: Input is not an array');
        return null;
      }

      let withQR = 0;
      let withoutQR = 0;
      const details = [];

      students.forEach((student, index) => {
        const hasQR = this.hasExistingQRCode(student);

        if (hasQR) {
          withQR++;
          details.push({
            index,
            name: student.name,
            status: '✅ Has QR',
            generatedAt: this.getQRGeneratedAt(student)
          });
        } else {
          withoutQR++;
          details.push({
            index,
            name: student.name,
            status: '⚠️ No QR',
            // Show what we're looking for to debug
            qrCodeField: student?.qrCode || 'undefined',
            qrTokenField: student?.qrToken || 'undefined',
            userProfileQRCode: student?.userProfile?.qr_code || 'undefined',
            userProfileQRToken: student?.userProfile?.qr_token || 'undefined'
          });
        }
      });

      const summary = {
        total: students.length,
        withQR,
        withoutQR,
        percentage: students.length > 0 ? Math.round((withQR / students.length) * 100) : 0
      };

      console.log(`📊 QR Code Summary: ${withQR}/${students.length} students have QR codes (${summary.percentage}%)`);
      console.log('📋 Detailed QR Status:', details);

      // Log first student's full data structure for inspection
      if (students.length > 0) {
        console.log('🔎 First student raw data:', {
          name: students[0].name,
          qrCode: students[0].qrCode,
          qrToken: students[0].qrToken,
          qrGeneratedAt: students[0].qrGeneratedAt,
          hasUserProfile: !!students[0].userProfile,
          userProfile: students[0].userProfile ? {
            qr_code: students[0].userProfile.qr_code,
            qr_token: students[0].userProfile.qr_token,
            qr_generated_at: students[0].userProfile.qr_generated_at
          } : 'No userProfile'
        });

        // Log COMPLETE first student object to see all possible fields
        console.log('📋 Complete first student object keys:', Object.keys(students[0]));
        console.log('📄 Complete first student full object:', students[0]);
      }

      return { summary, details };
    }
  }
};

export default studentService;
