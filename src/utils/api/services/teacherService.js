import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

export const teacherService = {
    // Fetch all Teacher in one school
    getTeachersBySchool: async (schoolId, params = {}) => {
        const { search, grade_level, page, limit } = params;

        // Build query parameters
        const queryParams = {};
        if (search && search.trim()) {
            queryParams.search = search.trim();
        }
        if (grade_level) {
            queryParams.grade_level = grade_level;
        }
        if (page) {
            queryParams.page = page;
        }
        if (limit) {
            queryParams.limit = limit;
        }

        const response = await handleApiResponse(() =>
            apiClient_.get(ENDPOINTS.TEACHERS.TEACHER_BY_SCHOOL(schoolId), { params: queryParams })
        );

        // Extract data from response
        const data = response?.data;
        const teachers = Array.isArray(data) ? data : (data?.data || []);
        
        // Extract pagination metadata if available
        const pagination = data?.pagination || response?.pagination || null;
        const total = pagination?.total || data?.total || teachers.length;
        const pages = pagination?.pages || data?.pages || Math.ceil(total / (limit || 10));

        return {
            success: response.success,
            data: teachers,
            pagination: {
                total,
                pages,
                page: pagination?.page || page || 1,
                limit: pagination?.limit || limit || 10
            },
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