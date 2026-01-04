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
import { Server, Users, Activity, Zap } from 'lucide-react';
import { dashboardService } from '../../utils/api/services/dashboardService';

const AdminLogs = () => {
  const { t } = useLanguage();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError } = useErrorHandler();

  const [serverInfo, setServerInfo] = useState(null);
  const [users, setUsers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const autoRefreshRef = React.useRef(null);

  const fetchRateLimitData = async (silent = false) => {
    try {
      clearError();
      if (!silent) {
        startLoading('fetchRateLimitData', t('loadingRateLimitData', 'Loading rate limit data...'));
      }

      const response = await dashboardService.getRateLimitAllUsers();

      if (!response.success) {
        throw new Error(response.error || 'Failed to load rate limit data');
      }

      const data = response.data;
      setServerInfo(data.server);
      setUsers(data.users || []);
      setSummary(data.summary);
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadRateLimitData', 'Failed to load rate limit data'),
      });
    } finally {
      if (!silent) {
        stopLoading('fetchRateLimitData');
      }
      setInitialLoading(false);
    }
  };

  useEffect(() => {
    fetchRateLimitData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || initialLoading) {
      return;
    }

    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
    }

    autoRefreshRef.current = setInterval(() => {
      fetchRateLimitData(true);
    }, 5000);

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [autoRefresh, initialLoading]);

  if (initialLoading) {
    return (
      <PageLoader
        message={t('loadingRateLimitData', 'Loading rate limit data...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => fetchRateLimitData()}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getUsagePercentage = (user) => {
    return Math.round(((user.limit - user.remaining) / user.limit) * 100);
  };

  const getStatusColor = (percentage) => {
    if (percentage < 50) return 'green';
    if (percentage < 80) return 'yellow';
    return 'red';
  };

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-3 sm:p-6 space-y-4">

        {/* Summary Stats */}
        {summary && (
          <FadeInSection delay={50}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title={t('totalUsers', 'Total Users')}
                value={summary.totalUsers || 0}
                icon={Users}
                enhanced={true}
                gradientFrom="from-blue-500"
                gradientTo="to-blue-600"
                hoverColor="hover:border-blue-200"
                responsive={true}
              />

              <StatsCard
                title={t('totalRequests', 'Total Requests')}
                value={summary.totalRequests || 0}
                subtitle={`Avg: ${summary.averageRequestsPerUser || 0} per user`}
                icon={Activity}
                enhanced={true}
                gradientFrom="from-green-500"
                gradientTo="to-green-600"
                hoverColor="hover:border-green-200"
                responsive={true}
              />

              {summary.topUser && (
                <>
                  <StatsCard
                    title={t('topUser', 'Top User')}
                    value={summary.topUser.totalRequests || 0}
                    subtitle={`ID: ${summary.topUser.identifier}`}
                    icon={Zap}
                    enhanced={true}
                    gradientFrom="from-purple-500"
                    gradientTo="to-purple-600"
                    hoverColor="hover:border-purple-200"
                    responsive={true}
                  />

                  <StatsCard
                    title={t('averageUsage', 'Avg Usage')}
                    value={`${summary.averageRequestsPerUser || 0}`}
                    subtitle={t('requestsPerUser', 'requests per user')}
                    icon={Activity}
                    enhanced={true}
                    gradientFrom="from-orange-500"
                    gradientTo="to-orange-600"
                    hoverColor="hover:border-orange-200"
                    responsive={true}
                  />
                </>
              )}
            </div>
          </FadeInSection>
        )}

        {/* Controls */}
        <FadeInSection delay={100}>
          <div className="flex items-center justify-between">
            <button
              onClick={() => fetchRateLimitData()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {t('refresh', 'Refresh')}
            </button>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-700">{t('autoRefresh', 'Auto Refresh')}</span>
            </label>
          </div>
        </FadeInSection>

        {/* Users Table */}
        <FadeInSection delay={150}>
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-900">
                {t('rateLimitByUser', 'Rate Limit by User')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('identifier', 'Identifier')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('type', 'Type')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('usage', 'Usage')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('remaining', 'Remaining')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('ttl', 'TTL')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('serverHostname', 'Server Hostname')}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-700">{t('resetAt', 'Reset At')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {users.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-3 py-4 text-center text-gray-500">
                          {t('noDataAvailable', 'No data available.')}
                        </td>
                      </tr>
                    )}
                    {users.map((user) => {
                      const usagePercentage = getUsagePercentage(user);
                      const statusColor = getStatusColor(usagePercentage);

                      return (
                        <tr
                          key={`${user.identifier}-${user.identifierType}`}
                          className="hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelectedUser(user)}
                        >
                          <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-gray-700">
                            {user.identifier}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            <Badge
                              color={user.identifierType === 'user_id' ? 'blue' : 'purple'}
                              variant="outline"
                              size="xs"
                            >
                              {user.identifierType === 'user_id' ? 'User' : 'IP'}
                            </Badge>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full transition-all ${
                                    statusColor === 'green'
                                      ? 'bg-green-500'
                                      : statusColor === 'yellow'
                                      ? 'bg-yellow-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${usagePercentage}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium text-gray-700">{usagePercentage}%</span>
                            </div>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700">
                            {user.remaining.toLocaleString()} / {user.limit.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700 text-xs">
                            {user.ttl}s
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-gray-700">
                            {user.lastRequestServer?.hostname || '-'}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-gray-700 text-xs">
                            {new Date(user.resetAt).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </FadeInSection>
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {t('rateLimitDetails', 'Rate Limit Details')}
              </h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('identifier', 'Identifier')}
                  </label>
                  <p className="text-gray-900 font-mono text-sm">{selectedUser.identifier}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('type', 'Type')}
                  </label>
                  <Badge
                    color={selectedUser.identifierType === 'user_id' ? 'blue' : 'purple'}
                    variant="filled"
                    size="sm"
                  >
                    {selectedUser.identifierType === 'user_id' ? 'User ID' : 'IP Address'}
                  </Badge>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('rateLimit', 'Rate Limit')}
                  </label>
                  <p className="text-gray-900 font-mono text-sm">{selectedUser.limit.toLocaleString()} requests</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('totalRequests', 'Total Requests')}
                  </label>
                  <p className="text-gray-900 font-mono text-sm">{selectedUser.totalRequests.toLocaleString()}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('remaining', 'Remaining')}
                  </label>
                  <p className="text-gray-900 font-mono text-sm">{selectedUser.remaining.toLocaleString()}</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('usagePercentage', 'Usage Percentage')}
                  </label>
                  <p className="text-gray-900 font-mono text-sm">{getUsagePercentage(selectedUser)}%</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('ttl', 'TTL (seconds)')}
                  </label>
                  <p className="text-gray-900 font-mono text-sm">{selectedUser.ttl}s</p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    {t('resetAt', 'Reset At')}
                  </label>
                  <p className="text-gray-900 text-sm">{new Date(selectedUser.resetAt).toLocaleString()}</p>
                </div>
              </div>

              {/* Last Request Server Info */}
              {selectedUser.lastRequestServer && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    {t('lastRequestServer', 'Last Request Server')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t('hostname', 'Hostname')}
                      </label>
                      <p className="text-gray-900 font-mono text-sm">{selectedUser.lastRequestServer.hostname}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t('port', 'Port')}
                      </label>
                      <p className="text-gray-900 font-mono text-sm">{selectedUser.lastRequestServer.port}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t('nodeVersion', 'Node Version')}
                      </label>
                      <p className="text-gray-900 font-mono text-sm">{selectedUser.lastRequestServer.nodeVersion}</p>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {t('timestamp', 'Timestamp')}
                      </label>
                      <p className="text-gray-900 text-sm">{new Date(selectedUser.lastRequestServer.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedUser(null)}
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

export default AdminLogs;
