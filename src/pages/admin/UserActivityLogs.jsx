import React, { useEffect, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { api } from '../../utils/api';

const UserActivityLogs = () => {
  const { t } = useLanguage();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError } = useErrorHandler();

  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [pagination, setPagination] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = async (pageToLoad = 1, { silent = false } = {}) => {
    try {
      clearError();
      if (!silent) {
        startLoading('fetchUserActivityLogs', t('loadingLogs', 'Loading activity logs...'));
      } else {
        setRefreshing(true);
      }

      const response = await api.userActivityLog.getLogs({ page: pageToLoad, limit });

      if (!response.success) {
        throw new Error(response.error || 'Failed to load activity logs');
      }

      setLogs(response.data || []);
      setPagination(response.pagination || null);
      setPage(pageToLoad);
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadLogs', 'Failed to load activity logs'),
      });
    } finally {
      if (!silent) {
        stopLoading('fetchUserActivityLogs');
      }
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling effect: refresh current page every 15 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Use silent mode to avoid global loading spinner
      fetchLogs(page, { silent: true });
    }, 5000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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

  const totalPages = pagination?.pages || 1;

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
        <FadeInSection delay={100}>
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">
                {t('userActivityLogs', 'User Activity Logs')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {refreshing && (
                <div className="mb-2 text-xs text-gray-500">
                  {t('refreshingLogs', 'Refreshing logs...')}
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">#</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('actor', 'Actor')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('target', 'Target')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('activityType', 'Activity Type')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('endpoint', 'Endpoint')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('timestamp', 'Time')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('changedFields', 'Changed Fields')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {logs.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                          {t('noLogsFound', 'No activity logs found.')}
                        </td>
                      </tr>
                    )}
                    {logs.map((log, index) => {
                      const actor = log.actor;
                      const target = log.target;
                      const details = log.activity_details || {};
                      const changes = details.changes || null;
                      const changedFields = details.changedFields || null;

                      let changesDisplay = '-';

                      // If changes is an object with data, show field: value pairs
                      if (changes && typeof changes === 'object' && Object.keys(changes).length > 0) {
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
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {(pagination?.page || page) * limit - limit + index + 1}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {actor ? `${actor.last_name || ''} ${actor.first_name || ''}`.trim() : '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {target ? `${target.last_name || ''} ${target.first_name || ''}`.trim() : '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {log.activity_type || '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700 text-xs">
                            {details.endpoint || '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700 text-xs">
                            {details.timestamp ? new Date(details.timestamp).toLocaleString() : '-'}
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

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                  <div>
                    {t('pageOf', { page, totalPages }, `Page ${page} of ${totalPages}`)}
                  </div>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={() => page > 1 && fetchLogs(page - 1)}
                      disabled={page <= 1}
                      className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    >
                      {t('previous', 'Previous')}
                    </button>
                    <button
                      type="button"
                      onClick={() => page < totalPages && fetchLogs(page + 1)}
                      disabled={page >= totalPages}
                      className="px-3 py-1 rounded border border-gray-300 bg-white text-gray-700 disabled:opacity-50"
                    >
                      {t('next', 'Next')}
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </FadeInSection>
      </div>
    </PageTransition>
  );
};

export default UserActivityLogs;
