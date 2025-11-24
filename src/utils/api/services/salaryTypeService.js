import { get } from '../client';
import { ENDPOINTS } from '../config';

const salaryTypeService = {
  /**
   * Get all salary types
   * @returns {Promise<Array>} List of all salary types
   */
  getAllSalaryTypes: async () => {
    try {
      const response = await get(ENDPOINTS.SALARY_TYPES.BASE);
      console.log('All salary types response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching all salary types:', error);
      throw error;
    }
  },

  /**
   * Get salary types by employment type
   * @param {string} employmentType - Employment type (e.g., "បឋម")
   * @returns {Promise<Array>} List of salary types for the given employment type
   */
  getSalaryTypesByEmploymentType: async (employmentType) => {
    try {
      if (!employmentType) {
        return [];
      }
      const response = await get(ENDPOINTS.SALARY_TYPES.BY_EMPLOYMENT_TYPE(employmentType));
      console.log(`Salary types for ${employmentType}:`, response);
      return response || [];
    } catch (error) {
      // Return empty array if API returns 404 or error - employment type may not have salary types
      console.warn(`No salary types available for ${employmentType}:`, error.message);
      return [];
    }
  },

  /**
   * Get a single salary type by its ID
   * @param {number|string} id - Salary type ID
   * @returns {Promise<Object|null>} Salary type object or null if not found
   */
  getSalaryTypeById: async (id) => {
    try {
      if (!id && id !== 0) return null;
      const url = `${ENDPOINTS.SALARY_TYPES.BASE}/${id}`;
      const response = await get(url);
      console.log(`Salary type detail for id ${id}:`, response);
      return response || null;
    } catch (error) {
      console.error(`Error fetching salary type with id ${id}:`, error);
      return null;
    }
  },
};

export default salaryTypeService;
