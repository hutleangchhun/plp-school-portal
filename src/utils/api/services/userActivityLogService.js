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
   * @param {string} [params.date] - Optional date filter in YYYY-MM-DD format
   */
  async getLogs(params = {}) {
    const query = new URLSearchParams();
    const page = params.page || 1;
    const limit = params.limit || 20;

    query.append('page', page);
    query.append('limit', limit);

    if (params.date) {
      query.append('date', params.date);
    }

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

  /**
   * Get a single user activity log by ID
   * @param {string} logId
   */
  async getLogById(logId) {
    const url = `${ENDPOINTS.USER_ACTIVITY_LOGS.BASE}/${logId}`;

    const response = await handleApiResponse(() => apiClient_.get(url));

    if (!response || !response.success) {
      return {
        success: false,
        error: response?.error || 'Failed to fetch activity log details',
        data: null,
      };
    }

    return {
      success: true,
      data: response.data || null,
    };
  },

  /**
   * Get activity count by date grouped by activity type
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async getActivityCountByDate(date) {
    const url = `${ENDPOINTS.USER_ACTIVITY_LOGS.BASE}/activity-count/by-date?date=${date}`;

    const response = await handleApiResponse(() => apiClient_.get(url));

    if (!response || !response.success) {
      return {
        success: false,
        error: response?.error || 'Failed to fetch activity counts',
        data: null,
      };
    }

    return {
      success: true,
      data: response.data || {},
    };
  },

  /**
   * Get users who logged in on a specific date
   * @param {string} date - Date in YYYY-MM-DD format
   */
  async getUsersLoginByDate(date) {
    const url = `/api/usage/users?date=${date}`;

    const response = await handleApiResponse(() => apiClient_.get(url));

    if (!response || !response.success) {
      return {
        success: false,
        error: response?.error || 'Failed to fetch users login data',
        data: { date, count: 0, userIds: [] },
      };
    }

    return {
      success: true,
      data: response.data || { date, count: 0, userIds: [] },
    };
  },
};
