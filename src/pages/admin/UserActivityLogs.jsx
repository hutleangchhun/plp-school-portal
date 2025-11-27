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
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

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
                        <tr
                          key={log.id}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => fetchLogById(log.id)}
                        >
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
                        {selectedLog.actor
                          ? `${selectedLog.actor.lastName || selectedLog.actor.last_name || ''} ${selectedLog.actor.firstName || selectedLog.actor.first_name || ''}`.trim()
                          : '-'}
                      </p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t('target', 'Target')}
                      </label>
                      <p className="text-gray-900">
                        {selectedLog.target
                          ? `${selectedLog.target.lastName || selectedLog.target.last_name || ''} ${selectedLog.target.firstName || selectedLog.target.first_name || ''}`.trim()
                          : '-'}
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
                  </div>

                  {/* Changed Fields */}
                  {selectedLog.activity_details?.changedFields &&
                    selectedLog.activity_details.changedFields.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">
                          {t('changedFields', 'Changed Fields')}
                        </h3>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <ul className="space-y-2">
                            {selectedLog.activity_details.changedFields.map((field, idx) => (
                              <li key={idx} className="text-sm text-gray-700">
                                • <span className="font-medium">{field}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    )}

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
