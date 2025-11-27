import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

/**
 * User Activity Log Service
 * Fetches paginated user activity logs for admin view
 */
export const userActivityLogService = {
  /**
   * Get user activity logs
   * @param {Object} params
   * @param {number} [params.page=1]
   * @param {number} [params.limit=20]
   */
  async getLogs(params = {}) {
    const query = new URLSearchParams();
    const page = params.page || 1;
    const limit = params.limit || 20;

    query.append('page', page);
    query.append('limit', limit);

    const url = `${ENDPOINTS.USER_ACTIVITY_LOGS.BASE}?${query.toString()}`;

    const response = await handleApiResponse(() => apiClient_.get(url));

    if (!response || !response.success) {
      return {
        success: false,
        error: response?.error || 'Failed to fetch user activity logs',
        data: [],
        pagination: null,
      };
    }

    const apiData = response.data || {};

    return {
      success: true,
      data: apiData.data || [],
      pagination: apiData.pagination || null,
    };
  },
};
