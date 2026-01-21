import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

export const teacherService = {
    // Fetch all Teacher in one school
    getTeachersBySchool: async (schoolId, params = {}) => {
        const { search, grade_level, page, limit, is_active, roleId } = params;

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
        if (is_active !== undefined && is_active !== null) {
            queryParams.is_active = is_active;
        }
        if (roleId && roleId !== '') {
            queryParams.roleId = roleId;
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

    // Fetch all teachers across all schools with pagination and search
    getAllTeachers: async (params = {}) => {
        const { search, page, limit, is_active, roleId } = params;

        // Build query parameters
        const queryParams = {};
        if (search && search.trim()) {
            queryParams.search = search.trim();
        }
        if (page) {
            queryParams.page = page;
        }
        if (limit) {
            queryParams.limit = limit;
        }
        if (is_active !== undefined && is_active !== null) {
            queryParams.is_active = is_active;
        }
        if (roleId && roleId !== '') {
            queryParams.roleId = roleId;
        }

        const response = await handleApiResponse(() =>
            apiClient_.get(ENDPOINTS.TEACHERS.BASE, { params: queryParams })
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
    // Uses the same payload pattern as StudentEditModal for consistency
    // Backend may or may not accept location fields - they're included but will be removed if empty
    updateTeacher: async (teacherId, updateData) => {
        // Build payload in the same format as StudentEditModal (matching TeacherEditModal's payload structure)
        const payload = {
            username: updateData.username?.trim(),
            first_name: updateData.first_name || updateData.firstName,
            last_name: updateData.last_name || updateData.lastName,
            email: updateData.email?.trim(),
            phone: updateData.phone?.trim(),
            date_of_birth: updateData.date_of_birth || updateData.dateOfBirth,
            gender: updateData.gender,
            nationality: updateData.nationality?.trim(),
            profile_picture: updateData.profile_picture || updateData.profilePicture,
            weight_kg: updateData.weight_kg || (updateData.weight ? parseFloat(updateData.weight) : undefined),
            height_cm: updateData.height_cm || (updateData.height ? parseFloat(updateData.height) : undefined),
            ethnic_group: updateData.ethnic_group || updateData.ethnicGroup?.trim(),
            gradeLevel: updateData.grade_level || updateData.gradeLevel,
            accessibility: updateData.accessibility && updateData.accessibility.length > 0 ? updateData.accessibility : undefined,
            hire_date: updateData.hire_date || updateData.hireDate,
            isDirector: updateData.isDirector || updateData.is_director,
            status: updateData.status,
            schoolId: updateData.schoolId,
            // Include location fields as received from TeacherEditModal
            // TeacherEditModal sends these with camelCase properties
            residence: updateData.residence,
            placeOfBirth: updateData.placeOfBirth,
        };

        // Handle password if provided
        if (updateData.newPassword && updateData.newPassword.trim()) {
            payload.newPassword = updateData.newPassword;
        }

        // Remove undefined/null values to avoid sending empty fields
        Object.keys(payload).forEach(key => {
            if (payload[key] === undefined || payload[key] === null || payload[key] === '') {
                delete payload[key];
            }
        });

        console.log('Updating teacher with ID:', teacherId);
        console.log('Update payload:', payload);

        const response = await handleApiResponse(() =>
            apiClient_.patch(ENDPOINTS.TEACHERS.UPDATE(teacherId), payload)
        );

        return {
            success: response.success,
            data: response?.data,
            error: response.error
        };
    },

    // Transfer teacher to a different school using PATCH /teachers/:id/school route
    transferTeacherToSchool: async (teacherId, schoolId) => {
        const payload = {
            school_id: parseInt(schoolId, 10)
        };

        console.log('Transferring teacher', teacherId, 'to school', schoolId);
        console.log('Transfer payload:', payload);

        const response = await handleApiResponse(() =>
            apiClient_.patch(ENDPOINTS.TEACHERS.TRANSFER_SCHOOL(teacherId), payload)
        );

        return {
            success: response.success,
            data: response?.data,
            error: response.error
        };
    },

    // Fetch classes for a specific teacher using GET /teachers/:teacherId/classes route
    // API response format: Direct array of class objects
    // Response structure from backend:
    // [
    //   { classId, name, gradeLevel, section, schoolId, teacherId, academicYear, maxStudents, status, school: { name } },
    //   ...
    // ]
    getTeacherClasses: async (teacherId) => {
        const response = await handleApiResponse(() =>
            apiClient_.get(ENDPOINTS.TEACHERS.CLASSES(teacherId))
        );

        console.log('getTeacherClasses - Full response:', response);

        // Extract data from response
        // handleApiResponse wraps the response, so response.data contains the actual API response
        const apiResponse = response?.data;
        console.log('getTeacherClasses - API response data:', apiResponse);

        // Classes are returned as a direct array from the new endpoint
        const classes = Array.isArray(apiResponse) ? apiResponse :
                        (apiResponse?.classes && Array.isArray(apiResponse.classes) ? apiResponse.classes : []);
        console.log('getTeacherClasses - Extracted classes:', classes);

        // Format classes with normalized field names
        const formattedClasses = classes.map(cls => ({
            classId: cls.classId || cls.id,
            id: cls.classId || cls.id,
            name: cls.name,
            gradeLevel: cls.gradeLevel || cls.grade_level,
            section: cls.section || '',
            schoolId: cls.schoolId || cls.school_id,
            schoolName: cls.school?.name || cls.schoolName || cls.school_name,
            teacherId: cls.teacherId || cls.teacher_id,
            academicYear: cls.academicYear || cls.academic_year,
            maxStudents: cls.maxStudents || cls.max_students,
            status: cls.status || 'ACTIVE',
            createdAt: cls.createdAt || cls.created_at,
            updatedAt: cls.updatedAt || cls.updated_at
        }));

        return {
            success: response.success,
            data: formattedClasses,
            classes: formattedClasses, // Keep both for backward compatibility
            total: formattedClasses.length,
            error: response.error
        };
    },
};