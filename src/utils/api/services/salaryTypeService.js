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
};

export default salaryTypeService;
