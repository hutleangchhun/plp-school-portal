import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

/**
 * Class API Service
 * Handles all class-related API operations
 */
export const classService = {
  /**
   * Get all classes for the current teacher
   * @returns {Promise<Array>} List of classes
   */
  async getMyClasses() {
    try {
      const response = await handleApiResponse(() =>
        apiClient_.get(ENDPOINTS.CLASSES.BASE)
      );
      
      console.log('Raw classes API response:', response);
      
      if (response.data && Array.isArray(response.data)) {
        const formattedData = response.data.map(cls => {
          console.log('Raw class before formatting:', cls);
          const formatted = classService.utils.formatClassData(cls);
          console.log('Formatted class:', formatted);
          return formatted;
        });
        
        return {
          data: formattedData,
        };
      }
      return { data: [] };
    } catch (error) {
      console.error('Error fetching my classes:', error);
      throw error;
    }
  },

  /**
   * Get class by ID
   * @param {string|number} classId - The ID of the class to retrieve
   * @returns {Promise<Object>} Class data
   */
  async getClassById(classId) {
    return handleApiResponse(() =>
      apiClient_.get(`${ENDPOINTS.CLASSES.BASE}/${classId}`)
    ).then(response => classService.utils.formatClassData(response.data));
  },

  /**
   * Get students in a specific class
   * @param {string|number} classId - The ID of the class
   * @returns {Promise<Array>} List of students in the class
   */
  async getClassStudents(classId) {
    return handleApiResponse(() =>
      apiClient_.get(ENDPOINTS.CLASSES.STUDENTS(classId))
    ).then(response => ({
      data: Array.isArray(response.data) ? response.data : []
    }));
  },

  /**
   * Utility functions for class data transformation
   */
  utils: {
    /**
     * Format raw class data from API to consistent format
     * @param {Object} cls - Raw class data from API
     * @returns {Object} Formatted class data
     */
    formatClassData(cls) {
      if (!cls) return null;
      
      return {
        id: cls.classId,
        classId: cls.classId,
        name: cls.name,
        gradeLevel: cls.gradeLevel,
        section: cls.section,
        schoolId: cls.schoolId,
        teacherId: cls.teacherId,
        academicYear: cls.academicYear,
        maxStudents: cls.maxStudents,
        status: cls.status,
        createdAt: cls.created_at,
        updatedAt: cls.updated_at
      };
    }
  }
};

export default classService;