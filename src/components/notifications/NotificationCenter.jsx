import { useState, useEffect } from 'react';
import { Bell, X, Check, Trash2, AlertCircle, CheckCircle, Clock, Eye, EyeOff } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Button } from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import DynamicLoader from '../ui/DynamicLoader';

/**
 * NotificationCenter Component
 * Displays and manages notifications for the user
 */
export default function NotificationCenter({ open, onClose }) {
  const { t } = useLanguage();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead
  } = useNotification();

  const [filter, setFilter] = useState('all'); // all, unread, read

  // Get icon for notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'attendance_approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'attendance_rejected':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'attendance_pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'leave_approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'leave_rejected':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  // Get color for notification type
  const getNotificationColor = (type) => {
    switch (type) {
      case 'attendance_approved':
      case 'leave_approved':
        return 'bg-green-50 border-green-200';
      case 'attendance_rejected':
      case 'leave_rejected':
        return 'bg-red-50 border-red-200';
      case 'attendance_pending':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'unread') return !n.isRead;
    if (filter === 'read') return n.isRead;
    return true;
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Notification Panel */}
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-lg flex flex-col z-50">
        {/* Header */}
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('notifications', 'Notifications')}
            </h2>
            {unreadCount > 0 && (
              <p className="text-sm text-gray-600">
                {t('unread', 'Unread')}: {unreadCount}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="border-b border-gray-200 px-4 pt-3 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t('all', 'All')}
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
              filter === 'unread'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t('unread', 'Unread')} ({unreadCount})
          </button>
          <button
            onClick={() => setFilter('read')}
            className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
              filter === 'read'
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {t('read', 'Read')}
          </button>
        </div>

        {/* Action Buttons */}
        {filteredNotifications.length > 0 && (
          <div className="border-b border-gray-200 px-4 py-2 flex gap-2">
            {filter === 'unread' && unreadCount > 0 && (
              <Button
                onClick={markAllAsRead}
                size="sm"
                variant="outline"
                className="flex-1 text-xs flex items-center justify-center gap-1"
              >
                <Check className="w-3 h-3" />
                {t('markAllRead', 'Mark all as read')}
              </Button>
            )}
            {filter === 'read' && (
              <Button
                onClick={deleteAllRead}
                size="sm"
                variant="outline"
                className="flex-1 text-xs flex items-center justify-center gap-1 text-red-600"
              >
                <Trash2 className="w-3 h-3" />
                {t('deleteAll', 'Delete all')}
              </Button>
            )}
          </div>
        )}

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4">
              <DynamicLoader />
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title={t('noNotifications', 'No notifications')}
                message={t('noNotificationsMessage', 'You\'re all caught up!')}
                icon={Bell}
              />
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-l-4 transition-colors cursor-pointer hover:bg-gray-50 ${
                    notification.isRead ? 'border-gray-200 bg-gray-50' : 'border-blue-500 bg-white'
                  }`}
                >
                  <div className="flex gap-3">
                    {/* Icon */}
                    <div className="flex-shrink-0 pt-1">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full" />
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {notification.message}
                      </p>

                      <p className="text-xs text-gray-400 mt-2">
                        {formatTime(new Date(notification.createdAt))}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-2 flex gap-2 pl-8">
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        {t('markAsRead', 'Mark as read')}
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {t('delete', 'Delete')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Format time for display
 */
function formatTime(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

/**
 * NotificationIcon Component
 * Bell icon with unread badge
 */
export function NotificationIcon({ unreadCount, onClick }) {
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
      title={t('notifications', 'Notifications')}
    >
      <Bell className="w-6 h-6" />
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full">
          {unreadCount > 99 ? '99+' : unreadCount}
        </div>
      )}
    </button>
  );
}
