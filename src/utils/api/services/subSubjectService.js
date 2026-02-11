import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

/**
 * Sub-Subject API Service
 * Handles all sub-subject-related API operations
 */
export const subSubjectService = {
    /**
     * Get sub-subjects by subject ID
     * @param {string|number} subjectId - The subject ID
     * @returns {Promise<Object>} List of sub-subjects for the subject
     */
    async getBySubjectId(subjectId) {
        try {
            if (!subjectId) {
                throw new Error('Subject ID is required');
            }

            const response = await handleApiResponse(() =>
                apiClient_.get(ENDPOINTS.SUB_SUBJECTS.BY_SUBJECT(subjectId))
            );

            const responseData = response.data || response;
            const subSubjectsArray = Array.isArray(responseData)
                ? responseData
                : responseData.subSubjects || responseData.data || [];

            return {
                success: true,
                data: subSubjectsArray,
            };
        } catch (error) {
            console.error(`Error fetching sub-subjects for subject ${subjectId}:`, error);
            throw error;
        }
    },

    /**
     * Get all sub-subjects
     * @returns {Promise<Object>} List of all sub-subjects
     */
    async getAll() {
        try {
            const response = await handleApiResponse(() =>
                apiClient_.get(ENDPOINTS.SUB_SUBJECTS.BASE)
            );

            const responseData = response.data || response;
            const subSubjectsArray = Array.isArray(responseData)
                ? responseData
                : responseData.subSubjects || responseData.data || [];

            return {
                success: true,
                data: subSubjectsArray,
            };
        } catch (error) {
            console.error('Error fetching sub-subjects:', error);
            throw error;
        }
    },
};
