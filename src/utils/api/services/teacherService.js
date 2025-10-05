import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

export const teacherService = {
    // Fetch all Teacher in one school
    getTeachersBySchool: async (schoolId, params = {}) => {
        const { search } = params;

        // Build query parameters
        const queryParams = {};
        if (search && search.trim()) {
            queryParams.search = search.trim();
        }

        const response = await handleApiResponse(() =>
            apiClient_.get(ENDPOINTS.TEACHERS.TEACHER_BY_SCHOOL(schoolId), { params: queryParams })
        );

        // Extract data from response
        const data = response?.data;
        const teachers = Array.isArray(data) ? data : (data?.data || []);

        return {
            success: response.success,
            data: teachers,
            error: response.error
        };
    },

    // Fetch a Teacher by ID
    getTeacherById: async (teacherId) => {
        const response = await handleApiResponse(() =>
            apiClient_.get(ENDPOINTS.TEACHERS.TEACHER_ID(teacherId))
        );

        return {
            success: response.success,
            data: response?.data,
            error: response.error
        };
    },
};