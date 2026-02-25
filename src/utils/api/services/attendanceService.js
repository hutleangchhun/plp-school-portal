import { apiClient_, attendanceApiClient, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

// Attendance-specific client for /attendance and /attendance-dashboard endpoints
const attendanceClient = attendanceApiClient;

/**
 * Attendance API Service
 * Handles all attendance-related API operations
 */
export const attendanceService = {
  /**
   * Get all attendance records with pagination and filtering
   * @param {Object} params - Query parameters for filtering and pagination
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Number of items per page
   * @param {number} [params.classId] - Filter by class ID
   * @param {number} [params.userId] - Filter by user ID (student)
   * @param {string} [params.date] - Filter by date (YYYY-MM-DD)
   * @param {string} [params.status] - Filter by status (PRESENT, ABSENT, LATE, EXCUSED)
   * @param {string} [params.startDate] - Filter by start date (YYYY-MM-DD)
   * @param {string} [params.endDate] - Filter by end date (YYYY-MM-DD)
   * @returns {Promise<Object>} Response with attendance data and pagination info
   */
  async getTeacherAttendanceRecords(params = {}) {
    const {
      page = 1,
      limit = 20,
      schoolId,
      gradeLevel,
      roleId,
      date,
      startDate,
      endDate,
    } = params;

    const queryParams = { page, limit };
    if (schoolId !== undefined) queryParams.schoolId = schoolId;
    if (gradeLevel !== undefined) queryParams.gradeLevel = gradeLevel;
    if (roleId !== undefined) queryParams.roleId = roleId;
    if (date !== undefined) queryParams.date = date;
    if (startDate !== undefined) queryParams.startDate = startDate;
    if (endDate !== undefined) queryParams.endDate = endDate;

    const response = await handleApiResponse(() =>
      attendanceClient.get(ENDPOINTS.ATTENDANCE.TEACHER, { params: queryParams })
    );

    const d = response?.data;
    const list = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);

    const pagination = {
      page: d?.page ?? page,
      limit: d?.limit ?? limit,
      total: d?.total ?? list.length,
      totalPages: d?.totalPages ?? Math.max(1, Math.ceil((d?.total ?? list.length) / (d?.limit ?? limit)))
    };

    return {
      success: true,
      data: list,
      pagination
    };
  },

  async getAttendance(params = {}) {
    const {
      page = 1,
      limit = 400,
      classId,
      userId,
      date,
      startDate,
      endDate,
      studentName
    } = params;

    // Build query params, omitting undefined values
    const queryParams = {
      page,
      limit
    };

    if (classId !== undefined) queryParams.classId = classId;
    if (userId !== undefined) queryParams.userId = userId;
    if (date !== undefined) queryParams.date = date;
    if (startDate !== undefined) queryParams.startDate = startDate;
    if (endDate !== undefined) queryParams.endDate = endDate;
    if (studentName !== undefined) queryParams.studentName = studentName;

    console.log('=== ATTENDANCE SERVICE REQUEST ===');
    console.log('Endpoint:', ENDPOINTS.ATTENDANCE.BASE);
    console.log('Query params:', queryParams);
    console.log('Date param specifically:', queryParams.date);

    const response = await handleApiResponse(() =>
      attendanceClient.get(`${ENDPOINTS.ATTENDANCE.BASE}`, { params: queryParams })
    );

    console.log('Raw API response:', response);

    // Robustly extract data and pagination from various response shapes
    const d = response?.data;
    const list = Array.isArray(d?.data)
      ? d.data
      : (Array.isArray(d) ? d : []);

    console.log('Extracted list before formatting:', list);

    const pagination = d?.pagination || {
      page: d?.page ?? page,
      limit: d?.limit ?? limit,
      total: d?.total ?? list.length,
      pages: d?.pages ?? Math.max(1, Math.ceil((d?.total ?? list.length) / (d?.limit ?? limit)))
    };

    const formattedData = list.map(attendance => attendanceService.utils.formatAttendanceData(attendance));
    console.log('Formatted attendance data:', formattedData);

    return {
      success: true,
      data: formattedData,
      pagination
    };
  },

  /**
   * Get comprehensive class attendance (includes all students in the class, with their attendance records if available)
   * @param {string|number} classId - The class ID
   * @param {string} date - The date to fetch for (YYYY-MM-DD)
   * @param {Object} params - Query parameters for pagination
   * @returns {Promise<Object>} Response with unified class attendance data
   */
  async getClassAttendance(classId, date, params = {}) {
    const { page = 1, limit = 100 } = params;
    const queryParams = { date, page, limit };

    console.log(`=== CLASS ATTENDANCE REQUEST for class ${classId} on ${date} ===`);

    const response = await handleApiResponse(() =>
      attendanceClient.get(ENDPOINTS.ATTENDANCE.CLASS_ATTENDANCE(classId), { params: queryParams })
    );

    const d = response?.data;
    const list = Array.isArray(d?.data) ? d.data : (Array.isArray(d) ? d : []);

    const pagination = d?.pagination || {
      page: d?.page ?? page,
      limit: d?.limit ?? limit,
      total: d?.total ?? list.length,
      totalPages: d?.totalPages ?? Math.max(1, Math.ceil((d?.total ?? list.length) / (d?.limit ?? limit)))
    };

    // Keep the raw records as they contain populated 'user' and 'id' fields.
    // The UI handles distinguishing between existing and missing records natively.
    return {
      success: true,
      data: list,
      pagination
    };
  },

  /**
   * Get attendance by ID
   * @param {string|number} attendanceId - The ID of the attendance record to retrieve
   * @returns {Promise<Object>} Attendance data
   */
  async getAttendanceById(attendanceId) {
    return handleApiResponse(() =>
      attendanceClient.get(`${ENDPOINTS.ATTENDANCE.BASE}/${attendanceId}`)
    ).then(response => ({
      ...response,
      data: attendanceService.utils.formatAttendanceData(response.data)
    }));
  },

  /**
   * Create a new attendance record
   * POST /attendance
   * @param {Object} attendanceData - Attendance data to create
   * @param {number} attendanceData.classId - Class ID
   * @param {number} attendanceData.userId - User ID (student)
   * @param {string} attendanceData.date - Date (YYYY-MM-DD)
   * @param {string} attendanceData.status - Status (PRESENT, ABSENT, LATE, EXCUSED)
   * @param {string} [attendanceData.reason] - Optional reason for absence/lateness
   * @returns {Promise<Object>} Created attendance data
   */
  async createAttendance(attendanceData) {
    return handleApiResponse(() =>
      attendanceClient.post(ENDPOINTS.ATTENDANCE.BASE, attendanceData)
    ).then(response => attendanceService.utils.formatAttendanceData(response.data));
  },

  /**
   * Update an attendance record
   * PATCH /attendance/:id
   * @param {string|number} attendanceId - The ID of the attendance record to update
   * @param {Object} attendanceData - Updated attendance data
   * @returns {Promise<Object>} Updated attendance data
   */
  async updateAttendance(attendanceId, attendanceData) {
    return handleApiResponse(() =>
      attendanceClient.patch(`${ENDPOINTS.ATTENDANCE.BASE}/${attendanceId}`, attendanceData)
    ).then(response => attendanceService.utils.formatAttendanceData(response.data));
  },

  /**
   * Delete an attendance record
   * DELETE /attendance/:id
   * @param {string|number} attendanceId - The ID of the attendance record to delete
   * @returns {Promise<Object>} Delete response
   */
  async deleteAttendance(attendanceId) {
    return handleApiResponse(() =>
      attendanceClient.delete(`${ENDPOINTS.ATTENDANCE.BASE}/${attendanceId}`)
    );
  },

  /**
   * Get attendance summary for a user for a specific date range
   * GET /attendance/summary/:userId
   * @param {number} userId - User ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Attendance summary with statistics
   */
  async getAttendanceSummary(userId, startDate, endDate) {
    return handleApiResponse(() =>
      attendanceClient.get(`${ENDPOINTS.ATTENDANCE.BASE}/summary/${userId}`, {
        params: { startDate, endDate }
      })
    );
  },

  /**
   * Get pending approval attendance records
   * GET /attendance/pending/approval
   * @param {Object} params - Query parameters for filtering and pagination
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Items per page
   * @param {number} [params.userId] - Filter by user ID
   * @param {number} [params.schoolId] - Filter by school ID
   * @param {string} [params.startDate] - Filter by start date
   * @param {string} [params.endDate] - Filter by end date
   * @returns {Promise<Object>} Pending approval attendance records
   */
  async getPendingApprovals(params = {}) {
    const {
      page = 1,
      limit = 10,
      userId,
      schoolId,
      startDate,
      endDate
    } = params;

    const queryParams = { page, limit };
    if (userId !== undefined) queryParams.userId = userId;
    if (schoolId !== undefined) queryParams.schoolId = schoolId;
    if (startDate !== undefined) queryParams.startDate = startDate;
    if (endDate !== undefined) queryParams.endDate = endDate;

    const response = await handleApiResponse(() =>
      attendanceClient.get(`${ENDPOINTS.ATTENDANCE.BASE}/pending/approval`, { params: queryParams })
    );

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

    const formattedData = list.map(attendance => attendanceService.utils.formatAttendanceData(attendance));

    return {
      success: true,
      data: formattedData,
      pagination
    };
  },

  /**
   * Approve attendance record
   * PATCH /attendance/:id/approve
   * @param {string|number} attendanceId - Attendance record ID
   * @param {Object} approvalData - Approval details
   * @param {string} approvalData.approvalStatus - APPROVED or REJECTED
   * @param {string} [approvalData.approvalComments] - Comments from director
   * @returns {Promise<Object>} Updated attendance data
   */
  async approveAttendance(attendanceId, approvalData) {
    const result = await handleApiResponse(() =>
      attendanceClient.patch(`${ENDPOINTS.ATTENDANCE.BASE}/${attendanceId}/approve`, approvalData)
    );

    if (result.success) {
      return {
        success: true,
        data: attendanceService.utils.formatAttendanceData(result.data.data)
      };
    }
    return result;
  },

  /**
   * Reject attendance record
   * PATCH /attendance/:id/reject
   * @param {string|number} attendanceId - Attendance record ID
   * @param {Object} rejectionData - Rejection details
   * @param {string} rejectionData.rejectionReason - Reason for rejection
   * @param {string} [rejectionData.rejectionComments] - Comments from director
   * @returns {Promise<Object>} Updated attendance data
   */
  async rejectAttendance(attendanceId, rejectionData) {
    return handleApiResponse(() =>
      attendanceClient.patch(`${ENDPOINTS.ATTENDANCE.BASE}/${attendanceId}/reject`, rejectionData)
    ).then(response => attendanceService.utils.formatAttendanceData(response.data));
  },

  /**
   * Bulk approve attendance records
   * POST /attendance/bulk-approve
   * @param {Array<number>} attendanceIds - Array of attendance IDs to approve
   * @param {string} [comments] - Optional comments for bulk approval
   * @returns {Promise<Object>} Bulk approval result
   */
  async bulkApproveAttendance(attendanceIds, comments = '') {
    return handleApiResponse(() =>
      attendanceClient.post(`${ENDPOINTS.ATTENDANCE.BASE}/bulk-approve`, {
        attendanceIds,
        comments
      })
    );
  },

  /**
   * Bulk reject attendance records
   * POST /attendance/bulk-reject
   * @param {Array<number>} attendanceIds - Array of attendance IDs to reject
   * @param {string} rejectionReason - Reason for bulk rejection
   * @returns {Promise<Object>} Bulk rejection result
   */
  async bulkRejectAttendance(attendanceIds, rejectionReason) {
    return handleApiResponse(() =>
      attendanceClient.post(`${ENDPOINTS.ATTENDANCE.BASE}/bulk-reject`, {
        attendanceIds,
        rejectionReason
      })
    );
  },

  /**
   * Queue bulk attendance records for CREATE (POST)
   * POST /attendance/bulk/queue
   * @param {Array<Object>} records - Array of NEW attendance records to queue
   * @param {number} records[].userId - User ID (student)
   * @param {number} records[].classId - Class ID
   * @param {string} records[].date - Date (YYYY-MM-DD)
   * @param {string} records[].status - Status (PRESENT, ABSENT, LATE, LEAVE)
   * @param {string} [records[].reason] - Optional reason for absence/lateness
   * @returns {Promise<Object>} Job ID and queue status
   */
  async queueBulkAttendance(records) {
    return handleApiResponse(() =>
      attendanceClient.post(ENDPOINTS.ATTENDANCE.BULK_QUEUE, { records })
    );
  },

  /**
   * Queue bulk attendance updates (PUT)
   * PUT /attendance/bulk/queue
   * @param {Array<Object>} records - Array of attendance records to UPDATE
   * @param {number} records[].id - Attendance record ID (required)
   * @param {string} [records[].status] - Status (PRESENT, ABSENT, LATE, LEAVE)
   * @param {string} [records[].reason] - Optional reason for absence/lateness
   * @returns {Promise<Object>} Job ID and queue status
   */
  async updateBulkAttendance(records) {
    return handleApiResponse(() =>
      attendanceClient.put(ENDPOINTS.ATTENDANCE.BULK_QUEUE, { records })
    );
  },

  /**
   * Check the status of a queued bulk attendance job
   * GET /attendance/bulk/status/:jobId
   * @param {string} jobId - The job ID returned from queueBulkAttendance
   * @returns {Promise<Object>} Job status with progress information
   * @example
   * const status = await getBulkJobStatus("job-id-here");
   * // {
   * //   jobId: "uuid",
   * //   status: "completed",
   * //   totalRecords: 100,
   * //   processedRecords: 100,
   * //   successfulRecords: 95,
   * //   failedRecords: 5,
   * //   results: { successful: [...], failed: [...] }
   * // }
   */
  async getBulkJobStatus(jobId) {
    return handleApiResponse(() =>
      attendanceClient.get(ENDPOINTS.ATTENDANCE.BULK_STATUS(jobId))
    );
  },

  /**
   * Get the current queue length
   * GET /attendance/bulk/queue-length
   * @returns {Promise<Object>} Current queue length
   * @example
   * const queueInfo = await getQueueLength();
   * // { queueLength: 5 }
   */
  async getQueueLength() {
    return handleApiResponse(() =>
      attendanceClient.get(ENDPOINTS.ATTENDANCE.QUEUE_LENGTH)
    );
  },

  /**
   * Get teacher attendance with consolidated data
   * GET /teachers/teacher-attendance/:schoolId
   * Combines teachers, settings, and attendance in a single optimized call
   * @param {number} schoolId - School ID
   * @param {Object} params - Query parameters for filtering and pagination
   * @param {string} [params.startDate] - Start date (YYYY-MM-DD)
   * @param {string} [params.endDate] - End date (YYYY-MM-DD)
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=10] - Items per page
   * @param {string} [params.search] - Search query for teacher name
   * @returns {Promise<Object>} Response with teachers, settings, attendance and pagination
   */
  async getTeacherAttendance(schoolId, params = {}) {
    const {
      startDate,
      endDate,
      page = 1,
      limit = 10,
      search = ''
    } = params;

    const queryParams = {
      page,
      limit
    };

    if (startDate) queryParams.startDate = startDate;
    if (endDate) queryParams.endDate = endDate;
    if (search) queryParams.search = search;

    const wrappedResponse = await handleApiResponse(() =>
      apiClient_.get(ENDPOINTS.TEACHERS.TEACHER_ATTENDANCE(schoolId), {
        params: queryParams
      })
    );

    // handleApiResponse wraps the response, so unwrap it
    const apiResponse = wrappedResponse?.data || {};

    return {
      success: apiResponse.success !== false,
      data: apiResponse.data || {},
      pagination: apiResponse.pagination || {
        page,
        limit,
        total: 0,
        pages: 0
      }
    };
  },

  /**
   * Get teacher attendance settings (combined teacher + settings data)
   * GET /teachers/attendance-settings/:schoolId
   * Returns teachers with their attendance settings (requiresApproval, etc.)
   * @param {number} schoolId - School ID
   * @param {Object} params - Query parameters for filtering and pagination
   * @param {string} [params.search] - Search query for teacher name/email
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=20] - Items per page
   * @returns {Promise<Object>} Response with teachers, settings and pagination
   */
  async getTeacherAttendanceSettings(schoolId, params = {}) {
    const {
      search = '',
      page = 1,
      limit = 20
    } = params;

    const queryParams = {
      page,
      limit
    };

    if (search) queryParams.search = search;

    const wrappedResponse = await handleApiResponse(() =>
      apiClient_.get(ENDPOINTS.TEACHERS.ATTENDANCE_SETTINGS(schoolId), {
        params: queryParams
      })
    );

    // handleApiResponse wraps the response, so unwrap it
    const apiResponse = wrappedResponse?.data || {};

    return {
      success: apiResponse.success !== false,
      data: apiResponse.data || [],
      pagination: apiResponse.pagination || {
        page,
        limit,
        total: 0,
        totalPages: 0
      }
    };
  },

  /**
   * Attendance Dashboard API Methods
   */
  dashboard: {
    /**
     * Get primary dashboard statistics
     * @param {Object} params - Query parameters
     * @param {string} [params.academicYear] - Academic year (e.g., "2024-2025")
     * @param {string} [params.startDate] - Start date (ISO 8601)
     * @param {string} [params.endDate] - End date (ISO 8601)
     * @param {number} [params.provinceId] - Province ID
     * @param {number} [params.districtId] - District ID
     * @param {number} [params.schoolId] - School ID
     * @param {number} [params.classId] - Class ID
     * @returns {Promise<Object>} Primary dashboard data
     */
    async getPrimaryDashboard(params = {}) {
      const queryParams = {};
      if (params.academicYear) queryParams.academicYear = params.academicYear;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;
      if (params.schoolId) queryParams.schoolId = params.schoolId;
      if (params.classId) queryParams.classId = params.classId;

      return handleApiResponse(() =>
        attendanceClient.get(ENDPOINTS.ATTENDANCE.DASHBOARD.PRIMARY, { params: queryParams })
      );
    },

    /**
     * Get gender comparison statistics
     * @param {Object} params - Query parameters (same as getPrimaryDashboard)
     * @returns {Promise<Array>} Gender comparison data
     */
    async getGenderComparison(params = {}) {
      const queryParams = {};
      if (params.academicYear) queryParams.academicYear = params.academicYear;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;
      if (params.schoolId) queryParams.schoolId = params.schoolId;
      if (params.classId) queryParams.classId = params.classId;

      return handleApiResponse(() =>
        attendanceClient.get(ENDPOINTS.ATTENDANCE.DASHBOARD.GENDER_COMPARISON, { params: queryParams })
      );
    },

    /**
     * Get grade breakdown statistics
     * @param {Object} params - Query parameters
     * @param {string} [params.academicYear] - Academic year
     * @param {string} [params.startDate] - Start date
     * @param {string} [params.endDate] - End date
     * @param {number} [params.provinceId] - Province ID
     * @param {number} [params.districtId] - District ID
     * @param {number} [params.schoolId] - School ID
     * @returns {Promise<Array>} Grade breakdown data
     */
    async getGradeBreakdown(params = {}) {
      const queryParams = {};
      if (params.academicYear) queryParams.academicYear = params.academicYear;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;
      if (params.schoolId) queryParams.schoolId = params.schoolId;

      return handleApiResponse(() =>
        attendanceClient.get(ENDPOINTS.ATTENDANCE.DASHBOARD.GRADE_BREAKDOWN, { params: queryParams })
      );
    },

    /**
     * Get class breakdown statistics
     * @param {Object} params - Query parameters
     * @param {string} [params.academicYear] - Academic year
     * @param {string} [params.startDate] - Start date
     * @param {string} [params.endDate] - End date
     * @param {number} [params.provinceId] - Province ID
     * @param {number} [params.districtId] - District ID
     * @param {number} [params.schoolId] - School ID
     * @returns {Promise<Array>} Class breakdown data
     */
    async getClassBreakdown(params = {}) {
      const queryParams = {};
      if (params.academicYear) queryParams.academicYear = params.academicYear;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;
      if (params.schoolId) queryParams.schoolId = params.schoolId;

      return handleApiResponse(() =>
        attendanceClient.get(ENDPOINTS.ATTENDANCE.DASHBOARD.CLASS_BREAKDOWN, { params: queryParams })
      );
    },

    /**
     * Get school rankings by attendance percentage
     * @param {Object} params - Query parameters
     * @param {string} [params.academicYear] - Academic year
     * @param {string} [params.startDate] - Start date
     * @param {string} [params.endDate] - End date
     * @param {number} [params.provinceId] - Province ID
     * @param {number} [params.districtId] - District ID
     * @param {number} [params.limit=20] - Maximum results
     * @returns {Promise<Array>} School rankings data
     */
    async getSchoolRankings(params = {}) {
      const queryParams = {};
      if (params.academicYear) queryParams.academicYear = params.academicYear;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;
      if (params.limit !== undefined) queryParams.limit = params.limit;

      return handleApiResponse(() =>
        attendanceClient.get(ENDPOINTS.ATTENDANCE.DASHBOARD.SCHOOL_RANKINGS, { params: queryParams })
      );
    },

    /**
     * Get daily attendance trends
     * @param {Object} params - Query parameters (same as getPrimaryDashboard)
     * @returns {Promise<Array>} Daily trends data
     */
    async getDailyTrends(params = {}) {
      const queryParams = {};
      if (params.academicYear) queryParams.academicYear = params.academicYear;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;
      if (params.schoolId) queryParams.schoolId = params.schoolId;
      if (params.classId) queryParams.classId = params.classId;

      return handleApiResponse(() =>
        attendanceClient.get(ENDPOINTS.ATTENDANCE.DASHBOARD.DAILY_TRENDS, { params: queryParams })
      );
    },

    /**
     * Get monthly attendance trends
     * @param {Object} params - Query parameters (same as getPrimaryDashboard)
     * @returns {Promise<Array>} Monthly trends data
     */
    async getMonthlyTrends(params = {}) {
      const queryParams = {};
      if (params.academicYear) queryParams.academicYear = params.academicYear;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;
      if (params.schoolId) queryParams.schoolId = params.schoolId;
      if (params.classId) queryParams.classId = params.classId;

      return handleApiResponse(() =>
        attendanceClient.get(ENDPOINTS.ATTENDANCE.DASHBOARD.MONTHLY_TRENDS, { params: queryParams })
      );
    },

    /**
     * Get approval status distribution
     * @param {Object} params - Query parameters (same as getPrimaryDashboard)
     * @returns {Promise<Object>} Approval status distribution data
     */
    async getApprovalStatus(params = {}) {
      const queryParams = {};
      if (params.academicYear) queryParams.academicYear = params.academicYear;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;
      if (params.schoolId) queryParams.schoolId = params.schoolId;
      if (params.classId) queryParams.classId = params.classId;

      return handleApiResponse(() =>
        attendanceClient.get(ENDPOINTS.ATTENDANCE.DASHBOARD.APPROVAL_STATUS, { params: queryParams })
      );
    },

    /**
     * Get teacher attendance primary dashboard statistics
     * @param {Object} params - Query parameters
     * @param {string} [params.startDate] - Start date (YYYY-MM-DD)
     * @param {string} [params.endDate] - End date (YYYY-MM-DD)
     * @param {number} [params.provinceId] - Province ID
     * @param {number} [params.districtId] - District ID
     * @param {number} [params.schoolId] - School ID
     * @returns {Promise<Object>} Teacher primary dashboard data with averageHoursWorked, etc.
     */
    async getTeacherPrimaryDashboard(params = {}) {
      const queryParams = {};
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;
      if (params.schoolId) queryParams.schoolId = params.schoolId;

      return handleApiResponse(() =>
        attendanceClient.get(ENDPOINTS.ATTENDANCE.DASHBOARD.TEACHER_PRIMARY, { params: queryParams })
      );
    },

    /**
     * Get teacher attendance by role breakdown
     * @param {Object} params - Query parameters
     * @param {string} [params.startDate] - Start date (YYYY-MM-DD)
     * @param {string} [params.endDate] - End date (YYYY-MM-DD)
     * @param {number} [params.provinceId] - Province ID
     * @param {number} [params.districtId] - District ID
     * @param {number} [params.schoolId] - School ID
     * @returns {Promise<Array>} Teacher attendance by role data
     */
    async getTeacherByRoleBreakdown(params = {}) {
      const queryParams = {};
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;
      if (params.schoolId) queryParams.schoolId = params.schoolId;

      return handleApiResponse(() =>
        attendanceClient.get(ENDPOINTS.ATTENDANCE.DASHBOARD.TEACHER_BY_ROLE, { params: queryParams })
      );
    },

    /**
     * Get teacher attendance monthly trends
     * @param {Object} params - Query parameters
     * @param {string} [params.startDate] - Start date (YYYY-MM-DD)
     * @param {string} [params.endDate] - End date (YYYY-MM-DD)
     * @param {number} [params.provinceId] - Province ID
     * @param {number} [params.districtId] - District ID
     * @param {number} [params.schoolId] - School ID
     * @returns {Promise<Array>} Teacher monthly trends data
     */
    async getTeacherMonthlyTrends(params = {}) {
      const queryParams = {};
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;
      if (params.schoolId) queryParams.schoolId = params.schoolId;

      return handleApiResponse(() =>
        attendanceClient.get(ENDPOINTS.ATTENDANCE.DASHBOARD.TEACHER_MONTHLY_TRENDS, { params: queryParams })
      );
    },

    /**
     * Get schools coverage (combined student + teacher attendance data)
     * @param {Object} params - Query parameters
     * @param {number} [params.page=1] - Page number
     * @param {number} [params.limit=10] - Items per page
     * @param {number} [params.provinceId] - Province ID
     * @param {number} [params.districtId] - District ID
     * @returns {Promise<Object>} Schools coverage data with pagination
     */
    async getSchoolsCoverage(params = {}) {
      const queryParams = {
        page: params.page || 1,
        limit: params.limit || 10
      };
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;
      if (params.date) queryParams.date = params.date;
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;

      return handleApiResponse(() =>
        attendanceClient.get(`${ENDPOINTS.ATTENDANCE.DASHBOARD.BASE}/schools/coverage`, { params: queryParams })
      );
    },

    /**
     * Get list of school IDs with attendance data
     * @param {Object} params - Query parameters
     * @param {number} [params.page=1] - Page number
     * @param {number} [params.limit=10] - Items per page
     * @param {number} [params.provinceId] - Province ID
     * @param {number} [params.districtId] - District ID
     * @returns {Promise<Object>} School IDs with pagination
     */
    async getSchoolIds(params = {}) {
      const queryParams = {
        page: params.page || 1,
        limit: params.limit || 10
      };
      if (params.provinceId) queryParams.provinceId = params.provinceId;
      if (params.districtId) queryParams.districtId = params.districtId;

      return handleApiResponse(() =>
        attendanceClient.get(`${ENDPOINTS.ATTENDANCE.DASHBOARD.BASE}/schools/ids`, { params: queryParams })
      );
    },

    /**
     * Get attendance count for a specific school
     * @param {number} schoolId - School ID
     * @returns {Promise<Object>} Attendance counts (student, teacher, total)
     */
    async getSchoolAttendanceCount(schoolId) {
      return handleApiResponse(() =>
        attendanceClient.get(`${ENDPOINTS.ATTENDANCE.DASHBOARD.BASE}/schools/${schoolId}/attendance-count`)
      );
    },

    /**
     * Get attendance count for a specific school with date range or specific date
     * @param {number} schoolId - School ID
     * @param {Object} params - Query parameters (startDate, endDate, date)
     * @returns {Promise<Object>} Attendance counts with breakdown
     */
    async getSchoolAttendanceCountWithDates(schoolId, params = {}) {
      const queryParams = {};
      if (params.startDate) queryParams.startDate = params.startDate;
      if (params.endDate) queryParams.endDate = params.endDate;
      if (params.date) queryParams.date = params.date;

      return handleApiResponse(() =>
        attendanceClient.get(`${ENDPOINTS.ATTENDANCE.DASHBOARD.BASE}/schools/${schoolId}/attendance-count`, { params: queryParams })
      );
    }
  },

  /**
   * Utility functions for attendance data transformation
   */
  utils: {
    /**
     * Format raw attendance data from API to consistent format
     * @param {Object} attendance - Raw attendance data from API
     * @returns {Object} Formatted attendance data
     */
    formatAttendanceData(attendance) {
      if (!attendance) return null;

      // Normalize userId to number for consistent comparison
      const userId = attendance.user_id || attendance.userId;
      const normalizedUserId = userId ? Number(userId) : null;

      return {
        id: attendance.id,
        classId: attendance.class_id || attendance.classId,
        userId: normalizedUserId,
        studentId: attendance.student_id || attendance.studentId, // Deprecated, will be removed
        date: attendance.date,
        status: attendance.status,
        reason: attendance.reason || '',
        createdAt: attendance.created_at || attendance.createdAt,
        updatedAt: attendance.updated_at || attendance.updatedAt,
        // Check-in/Check-out fields (new API)
        checkInTime: attendance.checkInTime || attendance.check_in_time || null,
        checkOutTime: attendance.checkOutTime || attendance.check_out_time || null,
        hoursWorked: attendance.hoursWorked !== undefined ? attendance.hoursWorked : (attendance.hours_worked !== undefined ? attendance.hours_worked : null),
        isCheckedOut: attendance.isCheckedOut === true || attendance.is_checked_out === true,
        // Approval-related fields
        approvalStatus: attendance.approval_status || attendance.approvalStatus || null, // PENDING, APPROVED, REJECTED
        approvedBy: attendance.approved_by || attendance.approvedBy || null,
        approvedAt: attendance.approved_at || attendance.approvedAt || null,
        approvalComments: attendance.approval_comments || attendance.approvalComments || '',
        submittedAt: attendance.submitted_at || attendance.submittedAt || null,
        rejectionReason: attendance.rejection_reason || attendance.rejectionReason || '',
        rejectionComments: attendance.rejection_comments || attendance.rejectionComments || '',
        // Include student info if available
        student: attendance.student ? {
          id: attendance.student.id,
          userId: attendance.student.user_id || attendance.student.userId,
          name: `${attendance.student.first_name || ''} ${attendance.student.last_name || ''}`.trim() || attendance.student.username || 'Unknown',
          firstName: attendance.student.first_name || attendance.student.firstName || '',
          lastName: attendance.student.last_name || attendance.student.lastName || '',
          email: attendance.student.email || '',
          profilePicture: attendance.student.profile_picture || attendance.student.profilePicture || ''
        } : null,
        // Include user details if available (for teacher attendance approvals)
        userDetails: attendance.user_details || attendance.userDetails ? {
          id: attendance.user_details?.id || attendance.userDetails?.id,
          firstName: attendance.user_details?.first_name || attendance.userDetails?.firstName || '',
          lastName: attendance.user_details?.last_name || attendance.userDetails?.lastName || '',
          email: attendance.user_details?.email || attendance.userDetails?.email || '',
          name: `${attendance.user_details?.first_name || attendance.userDetails?.firstName || ''} ${attendance.user_details?.last_name || attendance.userDetails?.lastName || ''}`.trim() || attendance.user_details?.username || attendance.userDetails?.username || 'Unknown'
        } : null,
        // Include class info if available
        class: attendance.class ? {
          id: attendance.class.classId || attendance.class.id,
          classId: attendance.class.classId || attendance.class.id,
          name: attendance.class.name,
          gradeLevel: attendance.class.grade_level || attendance.class.gradeLevel,
          section: attendance.class.section || '',
          academicYear: attendance.class.academic_year || attendance.class.academicYear
        } : null,
        // Include shift info
        shiftId: attendance.shift_id || attendance.shiftId || null,
        shift: attendance.shift ? {
          id: attendance.shift.id,
          name: attendance.shift.name,
          startTime: attendance.shift.start_time || attendance.shift.startTime,
          endTime: attendance.shift.end_time || attendance.shift.endTime
        } : null
      };
    },

    /**
     * Format API response to consistent structure
     * @param {Object} response - Raw API response
     * @returns {Object} Formatted response with attendance data and pagination
     */
    formatApiResponse(response) {
      if (!response) return { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } };

      return {
        data: Array.isArray(response.data)
          ? response.data.map(item => this.formatAttendanceData(item))
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

export default attendanceService;
