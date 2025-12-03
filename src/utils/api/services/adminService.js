import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

/**
 * Admin API Service
 * Handles all admin-specific API operations
 */
export const adminService = {
  /**
   * Reset teacher password by user ID
   * @param {number} userId - User ID of the teacher
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Reset password response
   */
  resetTeacherPassword: async (userId, newPassword) => {
    const response = await handleApiResponse(() =>
      apiClient_.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
        userId: userId,
        newPassword: newPassword
      })
    );

    return response;
  },

  /**
   * Reset user password (generic)
   * @param {number} userId - User ID
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Reset password response
   */
  resetUserPassword: async (userId, newPassword) => {
    const response = await handleApiResponse(() =>
      apiClient_.post(ENDPOINTS.AUTH.RESET_PASSWORD, {
        userId: userId,
        newPassword: newPassword
      })
    );

    return response;
  }
};

export default adminService;
