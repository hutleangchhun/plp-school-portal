import { useState } from 'react';
import { Bell, X, Check, AlertCircle, CheckCircle, Clock, Eye } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotification } from '../../contexts/NotificationContext';
import { Link, useNavigate } from 'react-router-dom';

/**
 * NotificationDropdown Component
 * Displays notifications in a dropdown menu in the navbar
 */
export default function NotificationDropdown() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification
  } = useNotification();

  const [isOpen, setIsOpen] = useState(false);

  // Get icon for notification type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'attendance_approved':
        return <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />;
      case 'attendance_rejected':
        return <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />;
      case 'attendance_pending':
        return <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />;
      case 'leave_approved':
        return <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />;
      case 'leave_rejected':
        return <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-blue-600 flex-shrink-0" />;
    }
  };

  // Get URL for notification entity
  const getNotificationLink = (notification) => {
    if (notification.entityType === 'attendance') {
      if (notification.type === 'attendance_pending') {
        return '/attendance/approval';
      }
      return '/my-attendance';
    }
    if (notification.entityType === 'leave') {
      if (notification.type === 'leave_pending') {
        return '/leave/approval';
      }
      return '/leave';
    }
    return '/notifications';
  };

  // Handle notification click - navigate after marking as read
  const handleNotificationClick = (notification) => {
    const link = getNotificationLink(notification);

    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    setIsOpen(false);
    navigate(link, { replace: false });
  };

  // Display all notifications
  const displayNotifications = notifications;
  const unreadNotifications = notifications.filter(n => !n.isRead);

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className="relative p-1.5 sm:p-2 text-gray-700 hover:text-gray-900 rounded-md hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          title={t('notifications', 'Notifications')}
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className="w-80 sm:w-full bg-white rounded-lg shadow-xl border border-gray-200 p-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2"
          align="end"
          sideOffset={1}
        >
          {/* Header */}
          <div className="border-b border-gray-200 px-3 sm:px-4 py-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">
                {t('notifications', 'Notifications')}
              </h3>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title={t('markAllAsRead', 'Mark all as read')}
              >
                <Check className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin">
                  <Clock className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ) : displayNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4">
                <Bell className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 text-center">
                  {t('noNotifications', 'No notifications')}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {displayNotifications.map((notification) => {
                  const isUnread = !notification.isRead;
                  const link = getNotificationLink(notification);

                  return (
                    <div
                      key={notification.id}
                      className={`px-3 sm:px-4 py-2 sm:py-3 border-l-4 transition-colors cursor-pointer ${
                        isUnread ? '!border-l-blue-500 !bg-white hover:!bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div className="flex-shrink-0 pt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <h4 className="text-xs sm:text-sm font-semibold text-gray-900 hover:text-blue-600 transition-colors truncate">
                                {notification.title}
                              </h4>
                              <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {formatTime(new Date(notification.createdAt))}
                              </p>
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteNotification(notification.id);
                              }}
                              className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0 p-1 rounded hover:bg-red-50"
                              title={t('delete', 'Delete')}
                            >
                              <X className="w-3 h-3 sm:w-4 sm:h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Unread Mark Action */}
                      {isUnread && (
                        <div className="ml-7 mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3 h-3" />
                            {t('markAsRead', 'Mark as read')}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/**
 * Format time for display (relative time)
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
