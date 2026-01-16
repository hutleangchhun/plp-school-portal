import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { Badge } from '../../components/ui/Badge';
import StatsCard from '../../components/ui/StatsCard';
import { DatePickerWithDropdowns } from '../../components/ui/date-picker-with-dropdowns';
import { LogIn, UserPlus, Edit, UserMinus } from 'lucide-react';
import { api } from '../../utils/api';
import { getFullName } from '../../utils/usernameUtils';

const UserActivityLogs = () => {
  const { t } = useLanguage();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError } = useErrorHandler();

  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activityCounts, setActivityCounts] = useState({
    USER_LOGIN: { success: 0, failed: 0 },
    USER_CREATE: { success: 0, failed: 0 },
    USER_UPDATE: { success: 0, failed: 0 },
    USER_DELETE: { success: 0, failed: 0 },
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loginUsers, setLoginUsers] = useState(null);
  const tableEndRef = React.useRef(null);
  const autoRefreshRef = React.useRef(null);
  const pageRef = React.useRef(1);

  // Helper function to convert Date object to YYYY-MM-DD format
  const formatDateToString = (date) => {
    if (!date) return new Date().toISOString().split('T')[0];
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchActivityCounts = async (dateObj) => {
    try {
      const dateString = formatDateToString(dateObj);
      const response = await api.userActivityLog.getActivityCountByDate(dateString);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load activity counts');
      }

      // Merge with default structure to ensure all types exist
      const defaultCounts = {
        USER_LOGIN: { success: 0, failed: 0 },
        USER_CREATE: { success: 0, failed: 0 },
        USER_UPDATE: { success: 0, failed: 0 },
        USER_DELETE: { success: 0, failed: 0 },
      };

      setActivityCounts({ ...defaultCounts, ...response.data });
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadActivityCounts', 'Failed to load activity counts'),
      });
    }
  };

  const fetchLoginUsers = async (dateObj) => {
    try {
      const dateString = formatDateToString(dateObj);
      const response = await api.userActivityLog.getUsersLoginByDate(dateString);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load login users');
      }

      setLoginUsers(response.data);
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadLoginUsers', 'Failed to load login users'),
      });
      setLoginUsers(null);
    }
  };

  const fetchLogs = async (pageToLoad = 1, { isLoadMore = false, silent = false, date = null } = {}) => {
    try {
      clearError();
      if (!isLoadMore && !silent) {
        startLoading('fetchUserActivityLogs', t('loadingLogs', 'Loading activity logs...'));
      } else {
        setLoadingMore(true);
      }

      const logsParams = { page: pageToLoad, limit };
      if (date) {
        logsParams.date = formatDateToString(date);
      }

      const response = await api.userActivityLog.getLogs(logsParams);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load activity logs');
      }

      const newLogs = response.data || [];

      // For load more, append to existing logs. For initial or page change, replace
      if (isLoadMore) {
        setLogs(prevLogs => {
          // Deduplicate: create a Set of existing log IDs
          const existingIds = new Set(prevLogs.map(log => log.id));
          // Filter out any new logs that already exist
          const uniqueNewLogs = newLogs.filter(log => !existingIds.has(log.id));
          return [...prevLogs, ...uniqueNewLogs];
        });
      } else {
        setLogs(newLogs);
      }

      setPage(pageToLoad);
      pageRef.current = pageToLoad;

      // For now, we only keep a single page (latest 20 logs), so disable loading more pages
      const paginationData = response.pagination;
      const moreAvailable = false;
      setHasMore(moreAvailable);
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadLogs', 'Failed to load activity logs'),
      });
    } finally {
      if (!isLoadMore && !silent) {
        stopLoading('fetchUserActivityLogs');
      } else {
        setLoadingMore(false);
      }
      setInitialLoading(false);
    }
  };

  const fetchLogById = async (logId) => {
    try {
      setDetailLoading(true);
      const response = await api.userActivityLog.getLogById(logId);

      if (!response.success) {
        throw new Error(response.error || 'Failed to load log details');
      }

      setSelectedLog(response.data);
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadLogDetails', 'Failed to load log details'),
      });
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => {
    // Start from page 1 (API already returns newest data first)
    fetchLogs(1, { date: selectedDate });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Fetch activity counts and login users when date changes
  useEffect(() => {
    fetchActivityCounts(selectedDate);
    fetchLoginUsers(selectedDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Infinite scroll effect: Load more when user scrolls to end
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !initialLoading) {
          fetchLogs(page + 1, { isLoadMore: true });
        }
      },
      { threshold: 0.1 }
    );

    if (tableEndRef.current) {
      observer.observe(tableEndRef.current);
    }

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, hasMore, loadingMore, initialLoading]);

  // Auto-refresh effect: Automatically load more data every 3 seconds if there's more data
  useEffect(() => {
    // Only set up the interval once after initial load
    if (initialLoading) {
      return;
    }

    // Clear any existing interval
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
    }

    // Set up interval to periodically refresh the latest logs (first page only)
    autoRefreshRef.current = setInterval(() => {
      fetchLogs(1, { silent: true });
    }, 5000);

    // Cleanup interval on unmount or when initialLoading changes
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLoading]);

  if (initialLoading) {
    return (
      <PageLoader
        message={t('loadingLogs', 'Loading activity logs...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => fetchLogs(page)}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  const formatChangeValue = (value) => {
    if (value === null || value === undefined) return 'null';

    if (Array.isArray(value)) {
      return value.join(', ');
    }

    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    }

    return String(value);
  };

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-3 sm:p-6 space-y-4">
        {/* Date Filter */}
        <FadeInSection delay={0}>
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 max-w-md">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('selectDate', 'Select Date')}
              </label>
              <DatePickerWithDropdowns
                date={selectedDate}
                onChange={setSelectedDate}
                placeholder={t('selectDate', 'Select Date')}
              />
            </div>
          </div>
        </FadeInSection>

        {/* Activity Count Stats */}
        <FadeInSection delay={50}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title={t('userLogins', 'User Logins')}
              value={activityCounts.USER_LOGIN.success + activityCounts.USER_LOGIN.failed}
              subtitle={`${activityCounts.USER_LOGIN.success} success / ${activityCounts.USER_LOGIN.failed} failed`}
              icon={LogIn}
              enhanced={true}
              gradientFrom="from-blue-500"
              gradientTo="to-blue-600"
              hoverColor="hover:border-blue-200"
              responsive={true}
            />

            <StatsCard
              title={t('userCreations', 'User Creations')}
              value={activityCounts.USER_CREATE.success + activityCounts.USER_CREATE.failed}
              subtitle={`${activityCounts.USER_CREATE.success} success / ${activityCounts.USER_CREATE.failed} failed`}
              icon={UserPlus}
              enhanced={true}
              gradientFrom="from-green-500"
              gradientTo="to-green-600"
              hoverColor="hover:border-green-200"
              responsive={true}
            />

            <StatsCard
              title={t('userUpdates', 'User Updates')}
              value={activityCounts.USER_UPDATE.success + activityCounts.USER_UPDATE.failed}
              subtitle={`${activityCounts.USER_UPDATE.success} success / ${activityCounts.USER_UPDATE.failed} failed`}
              icon={Edit}
              enhanced={true}
              gradientFrom="from-purple-500"
              gradientTo="to-purple-600"
              hoverColor="hover:border-purple-200"
              responsive={true}
            />

            <StatsCard
              title={t('userDeletions', 'User Deletions')}
              value={activityCounts.USER_DELETE.success + activityCounts.USER_DELETE.failed}
              subtitle={`${activityCounts.USER_DELETE.success} success / ${activityCounts.USER_DELETE.failed} failed`}
              icon={UserMinus}
              enhanced={true}
              gradientFrom="from-red-500"
              gradientTo="to-red-600"
              hoverColor="hover:border-red-200"
              responsive={true}
            />

            {loginUsers && loginUsers.count !== undefined && (
              <StatsCard
                title={t('usersLoggedInToday', 'Users Logged In Today')}
                value={loginUsers.count}
                subtitle={t('totalUniqueUsers', 'Total unique users')}
                icon={LogIn}
                enhanced={true}
                gradientFrom="from-indigo-500"
                gradientTo="to-indigo-600"
                hoverColor="hover:border-indigo-200"
                responsive={true}
              />
            )}
          </div>
        </FadeInSection>

        <FadeInSection delay={100}>
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">
                {t('userActivityLogs', 'User Activity Logs')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('id', 'ID')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('actor', 'Actor')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('target', 'Target')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('activityType', 'Activity Type')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('timestamp', 'Time')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('changedFields', 'Changed Fields')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-gray-500">
                          {t('noLogsFound', 'No activity logs found.')}
                        </td>
                      </tr>
                    )}
                    {logs.map((log) => {
                      const actor = log.actor;
                      const target = log.target;
                      const details = log.activity_details || {};
                      const changes = details.changes || null;
                      const changedFields = details.changedFields || null;
                      const isLoginActivity = log.activity_type === 'USER_LOGIN';
                      const loginDetails = isLoginActivity ? details : {};

                      const isError =
                        details.responseStatus === 'ERROR' ||
                        (typeof details.responseStatusCode === 'number' && details.responseStatusCode >= 400) ||
                        loginDetails.status === 'FAILED';

                      let changesDisplay = '-';

                      // For login logs, show username, role, status and reason if failed
                      if (isLoginActivity) {
                        const username = loginDetails.username || '-';
                        const role = loginDetails.roleEn || '-';
                        const status = loginDetails.status || '-';
                        const reason = loginDetails.reason || '';

                        if (status === 'FAILED' && reason) {
                          changesDisplay = `${username} (${role}) - ${status}: ${reason}`;
                        } else {
                          changesDisplay = `${username} (${role}) - ${status}`;
                        }
                      }
                      // If changes is an object with data, show field: value pairs
                      else if (changes && typeof changes === 'object' && Object.keys(changes).length > 0) {
                        changesDisplay = Object.entries(changes)
                          .map(([field, value]) => `${field}: ${formatChangeValue(value)}`)
                          .join(', ');
                      }
                      // Fallback to changedFields array if available
                      else if (changedFields && Array.isArray(changedFields) && changedFields.length > 0) {
                        changesDisplay = changedFields.join(', ');
                      }
                      // Show activity type if no changes available
                      else if (!changes && !changedFields && details.requestBody) {
                        changesDisplay = 'See request details';
                      }

                      return (
                        <tr
                          key={log.id}
                          className={`${
                            isError
                              ? 'bg-red-50 hover:bg-red-100'
                              : 'hover:bg-gray-50'
                          } cursor-pointer`}
                          onClick={() => fetchLogById(log.id)}
                        >
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700 font-mono text-xs">
                            {log.id}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {actor ? `${actor.last_name || ''} ${actor.first_name || ''}`.trim() : '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {target ? `${target.last_name || ''} ${target.first_name || ''}`.trim() : '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            <div className="flex flex-col gap-0.5">
                              <span>{log.activity_type || '-'}</span>
                              {details.responseStatus && (
                                <Badge
                                  color={isError ? 'red' : 'green'}
                                  variant="filled"
                                  size="xs"
                                  className="mt-0.5"
                                >
                                  {details.responseStatus}
                                  {typeof details.responseStatusCode === 'number'
                                    ? ` (${details.responseStatusCode})`
                                    : ''}
                                </Badge>
                              )}
                              {isLoginActivity && loginDetails.status && (
                                <Badge
                                  color={loginDetails.status === 'SUCCESS' ? 'green' : 'red'}
                                  variant="filled"
                                  size="xs"
                                  className="mt-0.5"
                                >
                                  {loginDetails.status}
                                </Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700 text-xs">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : '-'}
                          </td>
                          <td className="px-3 py-2 text-gray-700 text-xs max-w-xs" title={changesDisplay}>
                            <div className="truncate">
                              {changesDisplay}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Infinite scroll loading indicator */}
              {loadingMore && (
                <div className="mt-4 flex items-center justify-center py-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}

              {/* Ref for infinite scroll trigger */}
              <div ref={tableEndRef} className="mt-4" />
            </CardContent>
          </Card>
        </FadeInSection>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('activityLogDetails', 'Activity Log Details')}
              </h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <PageLoader message={t('loadingDetails', 'Loading details...')} />
                </div>
              ) : (
                <>
                  {/* Log Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t('actor', 'Actor')}
                      </label>
                      <p className="text-gray-900">
                        {selectedLog.actor ? getFullName(selectedLog.actor, '-') : '-'}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t('target', 'Target')}
                      </label>
                      <p className="text-gray-900">
                        {selectedLog.target ? getFullName(selectedLog.target, '-') : '-'}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t('activityType', 'Activity Type')}
                      </label>
                      <p className="text-gray-900">{selectedLog.activity_type || '-'}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t('timestamp', 'Timestamp')}
                      </label>
                      <p className="text-gray-900 text-sm">
                        {selectedLog.activity_details?.timestamp
                          ? new Date(selectedLog.activity_details.timestamp).toLocaleString()
                          : '-'}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t('endpoint', 'Endpoint')}
                      </label>
                      <p className="text-gray-900 text-sm font-mono break-all">
                        {selectedLog.activity_details?.endpoint || '-'}
                      </p>
                    </div>

                    {/* Login-specific details */}
                    {selectedLog.activity_type === 'USER_LOGIN' && (
                      <>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            {t('username', 'Username')}
                          </label>
                          <p className="text-gray-900">
                            {selectedLog.activity_details?.username || '-'}
                          </p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            {t('role', 'Role')}
                          </label>
                          <p className="text-gray-900">
                            {selectedLog.activity_details?.roleEn || '-'}
                          </p>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <label className="block text-sm font-semibold text-gray-700 mb-1">
                            {t('loginStatus', 'Login Status')}
                          </label>
                          <Badge
                            color={selectedLog.activity_details?.status === 'SUCCESS' ? 'green' : 'red'}
                            variant="filled"
                            size="sm"
                          >
                            {selectedLog.activity_details?.status || '-'}
                          </Badge>
                        </div>

                        {selectedLog.activity_details?.reason && (
                          <div className="bg-gray-50 p-4 rounded-lg md:col-span-2">
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                              {t('reason', 'Reason')}
                            </label>
                            <p className="text-gray-900">
                              {selectedLog.activity_details.reason}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Changed Fields */}
                  {(selectedLog.activity_details?.changedFields &&
                    selectedLog.activity_details.changedFields.length > 0) ||
                  (selectedLog.activity_details?.changes &&
                    typeof selectedLog.activity_details.changes === 'object' &&
                    Object.keys(selectedLog.activity_details.changes).length > 0) ? (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('changedFields', 'Changed Fields')}
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg space-y-3 max-h-64 overflow-y-auto">
                        {selectedLog.activity_details?.changedFields &&
                          selectedLog.activity_details.changedFields.length > 0 && (
                            <ul className="space-y-2">
                              {selectedLog.activity_details.changedFields.map((field, idx) => (
                                <li key={idx} className="text-sm text-gray-700">
                                  • <span className="font-medium">{field}</span>
                                </li>
                              ))}
                            </ul>
                          )}

                        {selectedLog.activity_details?.changes &&
                          typeof selectedLog.activity_details.changes === 'object' &&
                          Object.keys(selectedLog.activity_details.changes).length > 0 && (
                            <div className="">
                              <div className="space-y-1 text-xs text-gray-700">
                                {Object.entries(selectedLog.activity_details.changes).map(
                                  ([field, value]) => (
                                    <div key={field} className="flex flex-col sm:flex-row sm:items-start sm:space-x-2">
                                      <span className="font-semibold text-gray-900 min-w-[120px] sm:text-right">
                                        {field}:
                                      </span>
                                      <span className="flex-1 break-words">
                                        {formatChangeValue(value)}
                                      </span>
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    </div>
                  ) : null}

                  {/* Request Body */}
                  {selectedLog.activity_details?.requestBody && (
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        {t('requestBody', 'Request Details')}
                      </h3>
                      <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
                        <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                          {JSON.stringify(selectedLog.activity_details.requestBody, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* IP Address & User Agent */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t('ipAddress', 'IP Address')}
                      </label>
                      <p className="text-gray-900 font-mono text-sm">{selectedLog.ip_address || '-'}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t('userAgent', 'User Agent')}
                      </label>
                      <p className="text-gray-900 text-xs break-all">{selectedLog.user_agent || '-'}</p>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium transition-colors"
              >
                {t('close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
};

export default UserActivityLogs;
