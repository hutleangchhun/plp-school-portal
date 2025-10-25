import apiClient from '../client';

/**
 * Teacher Settings Service
 * Handles all teacher-specific settings and preferences
 */
const teacherSettingsService = {
  /**
   * Get teacher settings
   * @param {number} teacherId - Teacher user ID
   * @returns {Promise<Object>} Teacher settings object
   */
  async getTeacherSettings(teacherId) {
    try {
      const response = await apiClient.get(`/teacher-settings/${teacherId}`);
      console.log(`Raw API response for teacher ${teacherId}:`, response);

      // apiClient already unwraps response.data, so response is the actual data
      // API returns: { id, teacherId, requiresApproval, updatedBy, updatedAt, ... }
      return {
        success: true,
        data: response || {}
      };
    } catch (error) {
      console.error('Error fetching teacher settings:', error);

      // If 404, it means teacher has no settings yet - return default
      if (error.status === 404) {
        console.log(`No settings found for teacher ${teacherId}, using defaults`);
        return {
          success: true,
          data: { requiresApproval: false }
        };
      }

      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  },

  /**
   * Update teacher settings
   * @param {number} teacherId - Teacher user ID
   * @param {Object} settingsData - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateTeacherSettings(teacherId, settingsData) {
    try {
      const response = await apiClient.patch(`/teacher-settings/${teacherId}`, settingsData);
      console.log(`Update response for teacher ${teacherId}:`, response);

      // apiClient already unwraps response.data
      return {
        success: true,
        data: response || {}
      };
    } catch (error) {
      console.error('Error updating teacher settings:', error);
      throw error;
    }
  },

  /**
   * Get notification preferences
   * @param {number} teacherId - Teacher user ID
   * @returns {Promise<Object>} Notification preferences
   */
  async getNotificationPreferences(teacherId) {
    try {
      const response = await apiClient.get(`/teacher-settings/${teacherId}/notification-preferences`);
      return {
        success: true,
        data: response.data || {
          emailNotifications: true,
          attendanceReminders: true,
          approvalNotifications: true,
          leaveNotifications: true,
          systemNotifications: true,
          reminderTime: '07:00' // Default reminder time
        }
      };
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  },

  /**
   * Update notification preferences
   * @param {number} teacherId - Teacher user ID
   * @param {Object} preferences - Preferences to update
   * @returns {Promise<Object>} Updated preferences
   */
  async updateNotificationPreferences(teacherId, preferences) {
    try {
      const response = await apiClient.patch(
        `/teacher-settings/${teacherId}/notification-preferences`,
        preferences
      );
      return {
        success: true,
        data: response.data || {}
      };
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  },

  /**
   * Get attendance settings
   * @param {number} teacherId - Teacher user ID
   * @returns {Promise<Object>} Attendance settings
   */
  async getAttendanceSettings(teacherId) {
    try {
      const response = await apiClient.get(`/teacher-settings/${teacherId}/attendance-settings`);
      return {
        success: true,
        data: response.data || {
          requiresApproval: false,
          autoMarkPresent: false,
          attendanceDeadline: '08:00',
          lateMarkTime: '07:00'
        }
      };
    } catch (error) {
      console.error('Error fetching attendance settings:', error);
      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  },

  /**
   * Update attendance settings
   * @param {number} teacherId - Teacher user ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateAttendanceSettings(teacherId, settings) {
    try {
      const response = await apiClient.patch(
        `/teacher-settings/${teacherId}/attendance-settings`,
        settings
      );
      return {
        success: true,
        data: response.data || {}
      };
    } catch (error) {
      console.error('Error updating attendance settings:', error);
      throw error;
    }
  },

  /**
   * Get leave settings
   * @param {number} teacherId - Teacher user ID
   * @returns {Promise<Object>} Leave settings
   */
  async getLeaveSettings(teacherId) {
    try {
      const response = await apiClient.get(`/teacher-settings/${teacherId}/leave-settings`);
      return {
        success: true,
        data: response.data || {
          requiresApproval: true,
          allowedLeaveTypes: ['medical', 'personal', 'emergency'],
          maxLeavePerMonth: 2
        }
      };
    } catch (error) {
      console.error('Error fetching leave settings:', error);
      return {
        success: false,
        data: {},
        error: error.message
      };
    }
  },

  /**
   * Update leave settings
   * @param {number} teacherId - Teacher user ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateLeaveSettings(teacherId, settings) {
    try {
      const response = await apiClient.patch(
        `/teacher-settings/${teacherId}/leave-settings`,
        settings
      );
      return {
        success: true,
        data: response.data || {}
      };
    } catch (error) {
      console.error('Error updating leave settings:', error);
      throw error;
    }
  },

  /**
   * Reset settings to defaults
   * @param {number} teacherId - Teacher user ID
   * @returns {Promise<Object>} Reset confirmation
   */
  async resetSettingsToDefaults(teacherId) {
    try {
      const response = await apiClient.post(`/teacher-settings/${teacherId}/reset-defaults`);
      return {
        success: true,
        data: response.data || {}
      };
    } catch (error) {
      console.error('Error resetting settings:', error);
      throw error;
    }
  },

  /**
   * Get all settings for a teacher (comprehensive)
   * @param {number} teacherId - Teacher user ID
   * @returns {Promise<Object>} Complete settings object
   */
  async getAllSettings(teacherId) {
    try {
      const [generalSettings, notificationPrefs, attendanceSettings, leaveSettings] = await Promise.all([
        this.getTeacherSettings(teacherId),
        this.getNotificationPreferences(teacherId),
        this.getAttendanceSettings(teacherId),
        this.getLeaveSettings(teacherId)
      ]);

      return {
        success: true,
        data: {
          general: generalSettings.data,
          notifications: notificationPrefs.data,
          attendance: attendanceSettings.data,
          leave: leaveSettings.data
        }
      };
    } catch (error) {
      console.error('Error fetching all settings:', error);
      throw error;
    }
  },

  /**
   * Bulk update teacher settings
   * @param {Array<Object>} teachers - Array of teacher updates [{teacherId, requiresApproval}, ...]
   * @returns {Promise<Object>} Bulk update response
   */
  async bulkUpdateTeacherSettings(teachers) {
    try {
      // API expects { "teachers": [...] } format
      const response = await apiClient.patch('/teacher-settings/bulk', { teachers });
      console.log('Bulk update request:', { teachers });
      console.log('Bulk update response:', response);

      // apiClient already unwraps response.data
      return {
        success: true,
        data: response || {}
      };
    } catch (error) {
      console.error('Error bulk updating teacher settings:', error);
      throw error;
    }
  }
};

export { teacherSettingsService };
