import apiClient from '../client';

/**
 * Notification Service
 * Handles all notification-related API calls
 */
const notificationService = {
  /**
   * Get notifications with pagination and filters
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.limit - Items per page (default: 10)
   * @param {string} params.userId - Filter by user ID
   * @param {boolean} params.isRead - Filter by read status
   * @param {string} params.type - Filter by notification type
   * @param {string} params.entityType - Filter by entity type (attendance, leave, etc.)
   * @returns {Promise<Object>} Paginated notifications list
   */
  async getNotifications(params = {}) {
    try {
      // Note: apiClient interceptor returns response.data directly (line 54 in client.js)
      // So 'data' here is actually the response.data from the API
      const data = await apiClient.get('/notifications', { params });

      console.log('📡 API Response (after interceptor):', data);
      console.log('📡 data.data:', data?.data);
      console.log('📡 Params sent:', params);

      // The API returns { data: [...], total, page, limit, totalPages }
      const notificationsData = Array.isArray(data?.data) ? data.data : [];

      console.log('📡 Extracted notifications:', notificationsData);
      console.log('📡 Notifications count:', notificationsData.length);

      return {
        success: true,
        data: notificationsData,
        pagination: {
          page: data?.page || 1,
          limit: data?.limit || 10,
          total: data?.total || 0,
          pages: data?.totalPages || 1
        }
      };
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      throw error;
    }
  },

  /**
   * Get unread notification count
   * @returns {Promise<number>} Count of unread notifications
   */
  async getUnreadCount() {
    try {
      // Note: apiClient interceptor returns response.data directly
      const data = await apiClient.get('/notifications/unread/count');

      console.log('📡 Unread Count Response:', data);
      console.log('📡 Unread Count Value:', data?.unreadCount);

      return data?.unreadCount || 0;
    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
      throw error;
    }
  },

  /**
   * Get a single notification by ID
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Notification object
   */
  async getNotificationById(notificationId) {
    try {
      const response = await apiClient.get(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching notification:', error);
      throw error;
    }
  },

  /**
   * Mark a single notification as read
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Updated notification
   */
  async markAsRead(notificationId) {
    try {
      const response = await apiClient.patch(`/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  /**
   * Mark all notifications as read
   * @returns {Promise<Object>} Success response
   */
  async markAllAsRead() {
    try {
      const response = await apiClient.patch('/notifications/mark-all-read');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  /**
   * Delete a notification
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Success response
   */
  async deleteNotification(notificationId) {
    try {
      const response = await apiClient.delete(`/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  /**
   * Delete all read notifications
   * @returns {Promise<Object>} Success response
   */
  async deleteAllRead() {
    try {
      const response = await apiClient.delete('/notifications/delete-all-read');
      return response.data;
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      throw error;
    }
  },

  /**
   * Create a notification (admin/system only)
   * @param {Object} notificationData - Notification data
   * @param {string} notificationData.userId - User ID to notify
   * @param {string} notificationData.type - Notification type
   * @param {string} notificationData.title - Notification title
   * @param {string} notificationData.message - Notification message
   * @param {string} notificationData.entityType - Entity type (attendance, leave, etc.)
   * @param {number} notificationData.entityId - Entity ID
   * @returns {Promise<Object>} Created notification
   */
  async createNotification(notificationData) {
    try {
      const response = await apiClient.post('/notifications', notificationData);
      return response.data;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  /**
   * Get notification by entity (e.g., attendance record)
   * @param {string} entityType - Entity type (attendance, leave, etc.)
   * @param {number} entityId - Entity ID
   * @returns {Promise<Array>} Array of notifications for this entity
   */
  async getNotificationsByEntity(entityType, entityId) {
    try {
      const response = await apiClient.get('/notifications', {
        params: { entityType, entityId }
      });
      return response.data?.data || [];
    } catch (error) {
      console.error('Error fetching entity notifications:', error);
      throw error;
    }
  },

  /**
   * Search notifications
   * @param {string} query - Search query
   * @param {Object} params - Additional parameters
   * @returns {Promise<Object>} Search results
   */
  async searchNotifications(query, params = {}) {
    try {
      const response = await apiClient.get('/notifications/search', {
        params: { q: query, ...params }
      });
      return {
        success: true,
        data: response.data?.data || [],
        pagination: {
          page: response.data?.page || 1,
          limit: response.data?.limit || 10,
          total: response.data?.total || 0,
          pages: response.data?.totalPages || 1
        }
      };
    } catch (error) {
      console.error('Error searching notifications:', error);
      throw error;
    }
  }
};

export { notificationService };
