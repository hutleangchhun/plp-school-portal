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

    // Update teacher by ID using PATCH /teachers/:id route
    updateTeacher: async (teacherId, updateData) => {
        // Format data to match backend expectations (snake_case)
        const formattedData = {
            username: updateData.username?.trim() || undefined,
            first_name: updateData.first_name || updateData.firstName || undefined,
            last_name: updateData.last_name || updateData.lastName || undefined,
            email: updateData.email?.trim() || undefined,
            phone: updateData.phone?.trim() || undefined,
            date_of_birth: updateData.date_of_birth || updateData.dateOfBirth || undefined,
            gender: updateData.gender || undefined,
            nationality: updateData.nationality?.trim() || undefined,
            profile_picture: updateData.profile_picture || updateData.profilePicture || undefined,
            weight_kg: updateData.weight_kg || updateData.weight ? parseFloat(updateData.weight_kg || updateData.weight) : undefined,
            height_cm: updateData.height_cm || updateData.height ? parseFloat(updateData.height_cm || updateData.height) : undefined,
            ethnic_group: updateData.ethnic_group || updateData.ethnicGroup?.trim() || undefined,
            grade_level: updateData.grade_level || updateData.gradeLevel || undefined,
            accessibility: updateData.accessibility || undefined,
            hire_date: updateData.hire_date || updateData.hireDate || undefined,
            isDirector: updateData.isDirector || updateData.is_director || undefined,
            status: updateData.status || undefined,
            residence: updateData.residence || undefined,
            placeOfBirth: updateData.placeOfBirth || updateData.place_of_birth || undefined,
        };

        // Handle password if provided
        if (updateData.newPassword && updateData.newPassword.trim()) {
            formattedData.password = updateData.newPassword;
        }

        // Remove undefined/null values to avoid sending empty fields
        Object.keys(formattedData).forEach(key => {
            if (formattedData[key] === undefined || formattedData[key] === null || formattedData[key] === '') {
                delete formattedData[key];
            }
        });

        console.log('Updating teacher with ID:', teacherId);
        console.log('Update payload:', formattedData);

        const response = await handleApiResponse(() =>
            apiClient_.patch(ENDPOINTS.TEACHERS.UPDATE(teacherId), formattedData)
        );

        return {
            success: response.success,
            data: response?.data,
            error: response.error
        };
    },
};