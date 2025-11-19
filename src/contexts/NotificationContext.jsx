import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { notificationService } from '../utils/api/services/notificationService';
import { authService } from '../utils/api/services/authService';

/**
 * NotificationContext
 * Provides app-wide notification management with real-time updates
 */
const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  /**
   * Fetch notifications from API
   */
  const fetchNotifications = useCallback(async (params = {}) => {
    try {
      // Only fetch notifications if user is authenticated
      if (!authService.isAuthenticated()) {
        setNotifications([]);
        setUnreadCount(0);
        return;
      }

      setLoading(true);
      setError(null);

      const response = await notificationService.getNotifications({
        page: 1,
        limit: 50,
        ...params
      });

      console.log('📢 Notifications Response:', response);
      console.log('📢 Notifications Data:', response.data);
      console.log('📢 Data is Array?', Array.isArray(response.data));
      console.log('📢 Data Length:', response.data?.length);

      if (response.success) {
        const notificationsData = Array.isArray(response.data) ? response.data : [];
        console.log('📢 Setting Notifications:', notificationsData);
        setNotifications(notificationsData);
        setLastFetch(new Date());
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch unread notification count
   */
  const fetchUnreadCount = useCallback(async () => {
    try {
      // Only fetch unread count if user is authenticated
      if (!authService.isAuthenticated()) {
        setUnreadCount(0);
        return;
      }

      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (err) {
      console.error('Error fetching unread count:', err);
    }
  }, []);

  /**
   * Mark notification as read
   */
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await notificationService.markAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );

      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  /**
   * Mark all notifications as read
   */
  const markAllAsRead = useCallback(async () => {
    try {
      await notificationService.markAllAsRead();

      // Update local state
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      );

      // Reset unread count
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, []);

  /**
   * Delete a notification
   */
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await notificationService.deleteNotification(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.filter(n => n.id !== notificationId)
      );

      // Update unread count if deleted notification was unread
      const deletedNotification = notifications.find(n => n.id === notificationId);
      if (deletedNotification && !deletedNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, [notifications]);

  /**
   * Create a new notification (for real-time updates)
   */
  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    if (!notification.isRead) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  /**
   * Clear all read notifications
   */
  const deleteAllRead = useCallback(async () => {
    try {
      await notificationService.deleteAllRead();

      // Update local state
      setNotifications(prev =>
        prev.filter(n => !n.isRead)
      );
    } catch (err) {
      console.error('Error deleting read notifications:', err);
      throw err;
    }
  }, []);

  /**
   * Refresh notifications (polling)
   */
  const refreshNotifications = useCallback(async () => {
    // Skip refreshing if user is not authenticated
    if (!authService.isAuthenticated()) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    await Promise.all([
      fetchNotifications(),
      fetchUnreadCount()
    ]);
  }, [fetchNotifications, fetchUnreadCount]);

  /**
   * Get unread notifications
   */
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(n => !n.isRead);
  }, [notifications]);

  /**
   * Get notifications by type
   */
  const getNotificationsByType = useCallback((type) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  /**
   * Initial fetch and setup polling
   */
  useEffect(() => {
    // Fetch notifications and unread count on mount if authenticated
    if (authService.isAuthenticated()) {
      refreshNotifications();

      // Set up polling interval (check every 30 seconds)
      const pollInterval = setInterval(() => {
        // Re-check auth on each poll to avoid calling API after logout
        if (authService.isAuthenticated()) {
          refreshNotifications();
        } else {
          setNotifications([]);
          setUnreadCount(0);
        }
      }, 30 * 1000);

      return () => clearInterval(pollInterval);
    } else {
      // Ensure state is clean when not authenticated
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [refreshNotifications]);

  const value = {
    // State
    notifications,
    unreadCount,
    loading,
    error,
    lastFetch,

    // Methods
    fetchNotifications,
    fetchUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    addNotification,
    deleteAllRead,
    refreshNotifications,
    getUnreadNotifications,
    getNotificationsByType
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to use notification context
 */
export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
