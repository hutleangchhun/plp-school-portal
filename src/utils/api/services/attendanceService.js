import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

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
      apiClient_.get(`${ENDPOINTS.ATTENDANCE.BASE}`, { params: queryParams })
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
   * Get attendance by ID
   * @param {string|number} attendanceId - The ID of the attendance record to retrieve
   * @returns {Promise<Object>} Attendance data
   */
  async getAttendanceById(attendanceId) {
    return handleApiResponse(() =>
      apiClient_.get(`${ENDPOINTS.ATTENDANCE.BASE}/${attendanceId}`)
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
      apiClient_.post(ENDPOINTS.ATTENDANCE.BASE, attendanceData)
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
      apiClient_.patch(`${ENDPOINTS.ATTENDANCE.BASE}/${attendanceId}`, attendanceData)
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
      apiClient_.delete(`${ENDPOINTS.ATTENDANCE.BASE}/${attendanceId}`)
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
      apiClient_.get(`${ENDPOINTS.ATTENDANCE.BASE}/summary/${userId}`, {
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
      apiClient_.get(`${ENDPOINTS.ATTENDANCE.BASE}/pending/approval`, { params: queryParams })
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
      apiClient_.patch(`${ENDPOINTS.ATTENDANCE.BASE}/${attendanceId}/approve`, approvalData)
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
      apiClient_.patch(`${ENDPOINTS.ATTENDANCE.BASE}/${attendanceId}/reject`, rejectionData)
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
      apiClient_.post(`${ENDPOINTS.ATTENDANCE.BASE}/bulk-approve`, {
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
      apiClient_.post(`${ENDPOINTS.ATTENDANCE.BASE}/bulk-reject`, {
        attendanceIds,
        rejectionReason
      })
    );
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
        apiClient_.get(ENDPOINTS.ATTENDANCE.DASHBOARD.PRIMARY, { params: queryParams })
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
        apiClient_.get(ENDPOINTS.ATTENDANCE.DASHBOARD.GENDER_COMPARISON, { params: queryParams })
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
        apiClient_.get(ENDPOINTS.ATTENDANCE.DASHBOARD.GRADE_BREAKDOWN, { params: queryParams })
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
        apiClient_.get(ENDPOINTS.ATTENDANCE.DASHBOARD.CLASS_BREAKDOWN, { params: queryParams })
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
        apiClient_.get(ENDPOINTS.ATTENDANCE.DASHBOARD.SCHOOL_RANKINGS, { params: queryParams })
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
        apiClient_.get(ENDPOINTS.ATTENDANCE.DASHBOARD.DAILY_TRENDS, { params: queryParams })
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
        apiClient_.get(ENDPOINTS.ATTENDANCE.DASHBOARD.MONTHLY_TRENDS, { params: queryParams })
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
        apiClient_.get(ENDPOINTS.ATTENDANCE.DASHBOARD.APPROVAL_STATUS, { params: queryParams })
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
        apiClient_.get(ENDPOINTS.ATTENDANCE.DASHBOARD.TEACHER_PRIMARY, { params: queryParams })
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
        apiClient_.get(ENDPOINTS.ATTENDANCE.DASHBOARD.TEACHER_BY_ROLE, { params: queryParams })
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
        apiClient_.get(ENDPOINTS.ATTENDANCE.DASHBOARD.TEACHER_MONTHLY_TRENDS, { params: queryParams })
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
          id: attendance.class.id,
          name: attendance.class.name,
          gradeLevel: attendance.class.grade_level || attendance.class.gradeLevel,
          academicYear: attendance.class.academic_year || attendance.class.academicYear
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
