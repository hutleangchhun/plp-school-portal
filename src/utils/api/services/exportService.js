import axios from 'axios';
import { apiClient_, attendanceApiClient, handleApiResponse, tokenManager } from '../client.js';
import { ENDPOINTS, getAttendanceApiBaseUrl } from '../config.js';

/**
 * Export API Service
 * Dedicated service for handling report exports and preview data fetching, specifically for the Reports page.
 */
export const exportService = {
    // ─── ASYNC EXPORT WORKFLOW METHODS ───────────────────────────────────────

    /**
     * Check accessibility report data existence
     * @param {Object} params - Query parameters
     */
    checkStudentsAccessibilityExportData(params = {}) {
        return handleApiResponse(() =>
            attendanceApiClient.get('/export/students/accessibility/check', {
                params: { schoolId: params.schoolId }
            })
        );
    },

    /**
     * Enqueue accessibility report for students (Report 6)
     * @param {Object} params - Query parameters
     */
    enqueueStudentsAccessibilityExport(params = {}) {
        return handleApiResponse(() =>
            attendanceApiClient.get('/export/students/accessibility/async', {
                params: { schoolId: params.schoolId }
            })
        );
    },

    /**
     * Check ethnic group report data existence
     * @param {Object} params - Query parameters
     */
    checkStudentEthnicExportData(params = {}) {
        return handleApiResponse(() =>
            attendanceApiClient.get('/export/students/ethnic/check', {
                params: { schoolId: params.schoolId }
            })
        );
    },

    /**
     * Enqueue ethnic group report for students (Report 9)
     * @param {Object} params - Query parameters
     */
    enqueueStudentEthnicExport(params = {}) {
        return handleApiResponse(() =>
            attendanceApiClient.get('/export/students/ethnic/async', {
                params: { schoolId: params.schoolId }
            })
        );
    },

    /**
     * Check student BMI report data existence
     * @param {Object} params - Query parameters
     */
    checkStudentBmiExportData(params = {}) {
        return handleApiResponse(() =>
            attendanceApiClient.get('/export/students/bmi/check', {
                params: {
                    schoolId: params.schoolId,
                    academicYear: params.academicYear,
                    classId: params.classId,
                    gradeLevel: params.gradeLevel
                }
            })
        );
    },

    /**
     * Enqueue student BMI report export
     * @param {Object} params - Query parameters
     */
    enqueueStudentBmiExport(params = {}) {
        return handleApiResponse(() =>
            attendanceApiClient.get('/export/students/bmi/async', {
                params: {
                    schoolId: params.schoolId,
                    academicYear: params.academicYear,
                    classId: params.classId,
                    gradeLevel: params.gradeLevel
                }
            })
        );
    },

    /**
     * Export BMI report for students
     * @param {Object} params - Query parameters
     * @returns {Promise<Blob>} Blob data for file download
     */
    async exportStudentBmiReport(params = {}) {
        try {
            const queryParams = {};
            if (params.schoolId) queryParams.schoolId = params.schoolId;
            if (params.classId) queryParams.classId = params.classId;
            if (params.year) queryParams.academicYear = params.year;
            if (params.academicYear) queryParams.academicYear = params.academicYear;

            console.log('📥 Exporting student BMI report with params:', queryParams);

            const token = tokenManager.getToken();
            const baseURL = apiClient_.defaults.baseURL || '/api/v1';

            const response = await axios.get(`${baseURL}${ENDPOINTS.BMI.STUDENTS_REPORT_EXPORT}`, {
                params: queryParams,
                responseType: 'blob',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json'
                }
            });

            return {
                success: true,
                data: response.data,
                headers: response.headers
            };
        } catch (error) {
            console.error('❌ Error in exportStudentBmiReport:', error);

            if (error.response && error.response.data instanceof Blob) {
                try {
                    const text = await error.response.data.text();
                    const errorJson = JSON.parse(text);
                    return {
                        success: false,
                        error: errorJson.message || errorJson.error || 'Failed to export BMI report (Server Error)',
                        status: error.response.status
                    };
                } catch (e) {
                }
            }

            return {
                success: false,
                error: error.message || 'Failed to export BMI report'
            };
        }
    },

    /**
     * Enqueue student list export (Report 1)
     * @param {number|string} classId
     */
    enqueueStudentListExport(classId) {
        return handleApiResponse(() =>
            attendanceApiClient.get('/export/students/async', {
                params: { classId }
            })
        );
    },

    /**
     * @param {number|string} classId
     * @param {number} year
     * @param {number} month
     */
    enqueueStudentMonthlyExport(classId, year, month) {
        return handleApiResponse(() =>
            attendanceApiClient.get(ENDPOINTS.ATTENDANCE.EXPORT.STUDENT_MONTHLY_ASYNC, {
                params: { classId, year, month }
            })
        );
    },

    /**
     * @param {number|string} schoolId
     * @param {number} year
     * @param {number} month
     */
    enqueueTeacherMonthlyExport(schoolId, year, month) {
        return handleApiResponse(() =>
            attendanceApiClient.get(ENDPOINTS.ATTENDANCE.EXPORT.TEACHER_MONTHLY_ASYNC, {
                params: { schoolId, year, month }
            })
        );
    },

    /**
     * @param {number|string} classId
     * @param {number} year
     * @param {number} month
     */
    checkStudentMonthlyExportData(classId, year, month) {
        return handleApiResponse(() =>
            attendanceApiClient.get(ENDPOINTS.ATTENDANCE.EXPORT.STUDENT_MONTHLY_CHECK, {
                params: { classId, year, month }
            })
        );
    },

    /**
     * @param {number|string} schoolId
     * @param {number} year
     * @param {number} month
     */
    checkTeacherMonthlyExportData(schoolId, year, month) {
        return handleApiResponse(() =>
            attendanceApiClient.get(ENDPOINTS.ATTENDANCE.EXPORT.TEACHER_MONTHLY_CHECK, {
                params: { schoolId, year, month }
            })
        );
    },

    /**
     * @param {string} jobId
     */
    getJobStatus(jobId) {
        return handleApiResponse(() =>
            attendanceApiClient.get(ENDPOINTS.ATTENDANCE.EXPORT.JOB(jobId))
        );
    },

    /**
     * @param {string} jobId
     */
    downloadJobResult(jobId) {
        return attendanceApiClient.get(ENDPOINTS.ATTENDANCE.EXPORT.DOWNLOAD(jobId), {
            responseType: 'blob'
        });
    }
};

export default exportService;
