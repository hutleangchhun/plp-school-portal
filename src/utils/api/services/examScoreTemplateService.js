import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

/**
 * Exam Score Template API Service
 * Handles all template-related API operations for exam scoring
 */
export const examScoreTemplateService = {
    /**
     * Create a new exam score template
     * @param {Object} templateData - Template data
     * @param {string} templateData.name - Template name
     * @param {number} templateData.teacherId - Teacher ID
     * @param {string} templateData.gradeLevel - Grade level (optional)
     * @param {Array} templateData.items - Array of template items
     * @param {number} templateData.items[].subjectId - Subject ID
     * @param {number} templateData.items[].subSubjectId - Sub-subject ID (optional)
     * @param {number} templateData.items[].subjectOrder - Display order of subject (optional, default: 0)
     * @param {number} templateData.items[].subSubjectOrder - Display order within subject (optional, default: 0)
     * @returns {Promise<Object>} Created template with full details
     */
    async createTemplate(templateData) {
        try {
            if (!templateData || !templateData.name) {
                throw new Error('Template name is required');
            }

            const response = await handleApiResponse(() =>
                apiClient_.post(ENDPOINTS.EXAM_SCORE.TEMPLATE.BASE, templateData)
            );

            return {
                success: true,
                data: response.data || response
            };
        } catch (error) {
            console.error('Error creating template:', error);
            throw error;
        }
    },

    /**
     * Update an existing template
     * @param {number} templateId - Template ID
     * @param {Object} templateData - Updated template data
     * @param {string} templateData.name - Template name (optional)
     * @param {string} templateData.gradeLevel - Grade level (optional)
     * @param {boolean} templateData.isActive - Active status (optional)
     * @param {Array} templateData.items - Array of template items (optional, replaces all items if provided)
     * @param {number} templateData.items[].subjectId - Subject ID
     * @param {number} templateData.items[].subSubjectId - Sub-subject ID (optional)
     * @param {number} templateData.items[].subjectOrder - Display order of subject (optional, default: 0)
     * @param {number} templateData.items[].subSubjectOrder - Display order within subject (optional, default: 0)
     * @returns {Promise<Object>} Updated template
     */
    async updateTemplate(templateId, templateData) {
        try {
            if (!templateId) {
                throw new Error('Template ID is required');
            }

            const response = await handleApiResponse(() =>
                apiClient_.patch(ENDPOINTS.EXAM_SCORE.TEMPLATE.BY_ID(templateId), templateData)
            );

            return {
                success: true,
                data: response.data || response
            };
        } catch (error) {
            console.error(`Error updating template ${templateId}:`, error);
            throw error;
        }
    },

    /**
     * Get all templates with optional filters
     * @param {Object} filters - Query filters
     * @param {number} filters.teacherId - Filter by teacher ID
     * @param {string} filters.gradeLevel - Filter by grade level
     * @param {boolean} filters.isActive - Filter by active status
     * @returns {Promise<Object>} List of templates
     */
    async getTemplates(filters = {}) {
        try {
            const params = {};
            if (filters.teacherId) params.teacherId = filters.teacherId;
            if (filters.gradeLevel) params.gradeLevel = filters.gradeLevel;
            if (filters.isActive !== undefined) params.isActive = filters.isActive;

            const response = await handleApiResponse(() =>
                apiClient_.get(ENDPOINTS.EXAM_SCORE.TEMPLATE.BASE, { params })
            );

            const responseData = response.data || response;
            const templatesArray = Array.isArray(responseData)
                ? responseData
                : responseData.templates || responseData.data || [];

            return {
                success: true,
                data: templatesArray
            };
        } catch (error) {
            console.error('Error fetching templates:', error);
            throw error;
        }
    },

    /**
     * Get a single template by ID
     * @param {number} templateId - Template ID
     * @returns {Promise<Object>} Template details
     */
    async getTemplateById(templateId) {
        try {
            if (!templateId) {
                throw new Error('Template ID is required');
            }

            const response = await handleApiResponse(() =>
                apiClient_.get(ENDPOINTS.EXAM_SCORE.TEMPLATE.BY_ID(templateId))
            );

            return {
                success: true,
                data: response.data || response
            };
        } catch (error) {
            console.error(`Error fetching template ${templateId}:`, error);
            throw error;
        }
    },

    /**
     * Delete a template
     * @param {number} templateId - Template ID
     * @returns {Promise<Object>} Deletion response
     */
    async deleteTemplate(templateId) {
        try {
            if (!templateId) {
                throw new Error('Template ID is required');
            }

            const response = await handleApiResponse(() =>
                apiClient_.delete(ENDPOINTS.EXAM_SCORE.TEMPLATE.BY_ID(templateId))
            );

            return {
                success: true,
                data: response.data || response
            };
        } catch (error) {
            console.error(`Error deleting template ${templateId}:`, error);
            throw error;
        }
    },

    /**
     * Apply a template to a class for a specific month/year
     * @param {Object} payload - Application payload
     * @param {number} payload.templateId - Template ID to apply
     * @param {number} payload.classId - Class ID
     * @param {number} payload.month - Month (1-12)
     * @param {number} payload.year - Year
     * @returns {Promise<Object>} Application result with created/skipped counts
     */
    async applyTemplate(payload) {
        try {
            if (!payload || !payload.templateId || !payload.classId || !payload.month || !payload.year) {
                throw new Error('Template ID, class ID, month, and year are required');
            }

            const response = await handleApiResponse(() =>
                apiClient_.post(ENDPOINTS.EXAM_SCORE.APPLY_TEMPLATE, payload)
            );

            return {
                success: true,
                data: response.data || response
            };
        } catch (error) {
            console.error('Error applying template:', error);
            throw error;
        }
    },

    /**
     * Reorder subjects and sub-subjects in a template
     * @param {number} templateId - Template ID
     * @param {Object} payload - Reorder payload
     * @param {Array} payload.subjects - Array of subjects with order and optional subSubjects
     * @returns {Promise<Object>} Updated template
     */
    async reorderTemplate(templateId, payload) {
        try {
            if (!templateId) {
                throw new Error('Template ID is required');
            }

            if (!payload || !payload.subjects || !Array.isArray(payload.subjects)) {
                throw new Error('Subjects array is required');
            }

            const response = await handleApiResponse(() =>
                apiClient_.patch(`${ENDPOINTS.EXAM_SCORE.TEMPLATE.BY_ID(templateId)}/reorder`, payload)
            );

            return {
                success: true,
                data: response.data || response
            };
        } catch (error) {
            console.error(`Error reordering template ${templateId}:`, error);
            throw error;
        }
    },

    /**
     * Get scores with filters
     * @param {Object} filters - Query filters
     * @param {number} filters.classId - Class ID (required)
     * @param {number} filters.month - Month (required)
     * @param {number} filters.year - Year (required)
     * @param {number} filters.studentId - Optional student ID filter
     * @param {number} filters.subjectId - Optional subject ID filter
     * @param {number} filters.templateId - Optional template ID (enables sorting by template order)
     * @returns {Promise<Object>} List of score records (sorted by template order if templateId provided)
     */
    async getScores(filters) {
        try {
            if (!filters || !filters.classId || !filters.month || !filters.year) {
                throw new Error('Class ID, month, and year are required');
            }

            const params = {
                classId: filters.classId,
                month: filters.month,
                year: filters.year
            };

            if (filters.studentId) {
                params.studentId = filters.studentId;
            }

            if (filters.subjectId) {
                params.subjectId = filters.subjectId;
            }

            // When templateId is provided, results are sorted by template item order
            if (filters.templateId) {
                params.templateId = filters.templateId;
            }

            const response = await handleApiResponse(() =>
                apiClient_.get(ENDPOINTS.EXAM_SCORE.SCORES, { params })
            );

            const responseData = response.data || response;
            const scoresArray = Array.isArray(responseData)
                ? responseData
                : responseData.scores || responseData.data || [];

            return {
                success: true,
                data: scoresArray
            };
        } catch (error) {
            console.error('Error fetching scores:', error);
            throw error;
        }
    },

    /**
     * Bulk update multiple scores in one request
     * @param {Array} scores - Array of score updates
     * @param {number} scores[].id - Score record ID
     * @param {number|null} scores[].score - New score value (or null to clear)
     * @returns {Promise<Object>} Result with updated count and notFound IDs
     * @example
     * bulkUpdateScores([
     *   { id: 1, score: 85.5 },
     *   { id: 2, score: 90.0 },
     *   { id: 3, score: null }
     * ])
     * // Returns: { updated: 3, notFound: [] }
     */
    async bulkUpdateScores(scores) {
        try {
            if (!scores || !Array.isArray(scores) || scores.length === 0) {
                throw new Error('Scores array is required and must not be empty');
            }

            // Validate each score object has required fields
            for (const score of scores) {
                if (!score.id) {
                    throw new Error('Each score object must have an id');
                }
                if (score.score === undefined) {
                    throw new Error('Each score object must have a score field (can be null)');
                }
            }

            const response = await handleApiResponse(() =>
                apiClient_.patch(ENDPOINTS.EXAM_SCORE.SCORES, { scores })
            );

            const responseData = response.data || response;
            return {
                success: true,
                data: {
                    updated: responseData.updated || 0,
                    notFound: responseData.notFound || []
                }
            };
        } catch (error) {
            console.error('Error bulk updating scores:', error);
            throw error;
        }
    },

    /**
     * Update a single score
     * @param {number} scoreId - Score record ID
     * @param {Object} scoreData - Score data to update
     * @param {number|null} scoreData.score - Score value (or null to clear)
     * @returns {Promise<Object>} Updated score record
     */
    async updateScore(scoreId, scoreData) {
        try {
            if (!scoreId) {
                throw new Error('Score ID is required');
            }

            const response = await handleApiResponse(() =>
                apiClient_.patch(ENDPOINTS.EXAM_SCORE.SCORE_BY_ID(scoreId), scoreData)
            );

            return {
                success: true,
                data: response.data || response
            };
        } catch (error) {
            console.error(`Error updating score ${scoreId}:`, error);
            throw error;
        }
    },

    /**
     * Delete a single score record
     * @param {number} scoreId - Score record ID
     * @returns {Promise<Object>} Deletion response
     */
    async deleteScore(scoreId) {
        try {
            if (!scoreId) {
                throw new Error('Score ID is required');
            }

            const response = await handleApiResponse(() =>
                apiClient_.delete(ENDPOINTS.EXAM_SCORE.SCORE_BY_ID(scoreId))
            );

            return {
                success: true,
                data: response.data || response
            };
        } catch (error) {
            console.error(`Error deleting score ${scoreId}:`, error);
            throw error;
        }
    }
};

export default examScoreTemplateService;
