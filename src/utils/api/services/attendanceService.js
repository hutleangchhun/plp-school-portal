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
      limit = 10,
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
