import React, { useState, useEffect, useCallback } from 'react';
import {
  QrCode,
  Download,
  RefreshCw,
  Search,
  Filter,
  FileJson,
  FileText,
  Eye,
  EyeOff,
  Users,
  TrendingUp,
  Loader,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import Badge from '../../components/ui/Badge';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { api, utils } from '../../utils/api';
import {
  generateBulkQRCodes,
  filterUsersByRole,
  filterUsersBySearch,
  sortUsers,
  exportQRCodesAsJSON,
  exportQRCodesAsCSV,
  getQRCodeStatistics,
  isValidQRCodesArray
} from '../../utils/qrCodeAdminService';
import { notifySuccess, notifyError, NOTIFICATION_MESSAGES } from '../../utils/notificationHelper';

/**
 * QRCodeAdminManagement Component
 * Comprehensive admin panel for managing QR codes for all users
 */
export default function QRCodeAdminManagement() {
  const { t } = useLanguage();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError } = useErrorHandler();

  // State
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortField, setSortField] = useState('username');
  const [sortDirection, setSortDirection] = useState('asc');
  const [showQRCodes, setShowQRCodes] = useState(true);
  const [qrSize, setQrSize] = useState(200);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [statistics, setStatistics] = useState(null);

  // Initialize
  useEffect(() => {
    initializePage();
  }, []);

  const initializePage = async () => {
    try {
      setLoading(true);
      clearError();

      // Get current user
      const userData = utils.user.getUserData();
      if (!userData || userData.roleId !== 8 || !userData.isDirector) {
        handleError(new Error('Only directors can access this page'));
        return;
      }

      setUser(userData);

      // Fetch all teachers and students
      await fetchAllUsers(userData);
    } catch (err) {
      console.error('Error initializing page:', err);
      handleError(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch all users (teachers and students)
  const fetchAllUsers = async (currentUser) => {
    try {
      startLoading('fetchUsers', t('fetchingUsers', 'Fetching users...'));

      // Fetch teachers
      let teachers = [];
      try {
        const teachersResponse = await api.teachers.getAll();
        if (teachersResponse.success && teachersResponse.data) {
          teachers = Array.isArray(teachersResponse.data) ? teachersResponse.data : [];
        }
      } catch (err) {
        console.warn('Could not fetch teachers:', err);
      }

      // Fetch students
      let students = [];
      try {
        const studentsResponse = await api.students.getAll();
        if (studentsResponse.success && studentsResponse.data) {
          students = Array.isArray(studentsResponse.data) ? studentsResponse.data : [];
        }
      } catch (err) {
        console.warn('Could not fetch students:', err);
      }

      const combined = [...teachers, ...students];
      setAllUsers(combined);
    } catch (err) {
      console.error('Error fetching users:', err);
      notifyError('Failed to fetch users');
    } finally {
      stopLoading('fetchUsers');
    }
  };

  // Filter and sort users (calculate before using in callbacks)
  let filteredUsers = allUsers;
  filteredUsers = filterUsersByRole(filteredUsers, roleFilter);
  filteredUsers = filterUsersBySearch(filteredUsers, searchTerm);
  filteredUsers = sortUsers(filteredUsers, sortField, sortDirection);

  // Generate QR codes for filtered users
  const handleGenerateQRCodes = useCallback(async () => {
    if (filteredUsers.length === 0) {
      notifyError('No users to generate QR codes for');
      return;
    }

    setGenerating(true);
    try {
      startLoading('generateQR', t('generatingQRCodes', 'Generating QR codes...'));

      const qrCodesData = await generateBulkQRCodes(filteredUsers, qrSize);
      setQrCodes(qrCodesData);

      // Update statistics
      const stats = getQRCodeStatistics(qrCodesData);
      setStatistics(stats);

      notifySuccess(`Generated QR codes for ${qrCodesData.length} users`);
    } catch (err) {
      console.error('Error generating QR codes:', err);
      handleError(err, {
        toastMessage: 'Failed to generate QR codes'
      });
    } finally {
      stopLoading('generateQR');
      setGenerating(false);
    }
  }, [filteredUsers, qrSize, startLoading, stopLoading, t]);

  // Handle sort field change
  const handleSortChange = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Download QR code for single user
  const handleDownloadUserQR = (qrCode, username) => {
    try {
      const link = document.createElement('a');
      link.href = qrCode.qrCode;
      link.download = `${username}-qr-${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notifySuccess('QR code downloaded');
    } catch (error) {
      notifyError('Failed to download QR code');
    }
  };

  // Toggle user selection
  const handleToggleUserSelection = (userId) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  // Select all filtered users
  const handleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  // Export QR codes as JSON
  const handleExportJSON = () => {
    try {
      if (qrCodes.length === 0) {
        notifyError('No QR codes to export');
        return;
      }

      exportQRCodesAsJSON(qrCodes, `qr-codes-${new Date().toISOString().split('T')[0]}.json`);
      notifySuccess('QR codes exported as JSON');
    } catch (err) {
      notifyError('Failed to export QR codes');
    }
  };

  // Export QR codes as CSV
  const handleExportCSV = () => {
    try {
      if (qrCodes.length === 0) {
        notifyError('No QR codes to export');
        return;
      }

      exportQRCodesAsCSV(qrCodes, `qr-codes-${new Date().toISOString().split('T')[0]}.csv`);
      notifySuccess('QR codes exported as CSV');
    } catch (err) {
      notifyError('Failed to export QR codes');
    }
  };

  // Loading state
  if (loading) {
    return (
      <PageLoader
        message={t('loadingQRCodeManagement', 'Loading QR Code Management...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => initializePage()}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Not authorized state
  if (!user || user.roleId !== 8 || !user.isDirector) {
    return (
      <ErrorDisplay
        error={{ message: t('accessDenied', 'Access denied. This page is only for directors.') }}
        onRetry={() => window.history.back()}
        retryText={t('goBack', 'Go Back')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <FadeInSection className="mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <QrCode className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('qrCodeManagementAdmin', 'QR Code Management - Admin')}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {t('manageQRCodesAllUsers', 'Manage QR codes for all teachers and students')}
                </p>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Statistics */}
        {statistics && (
          <FadeInSection className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Users}
                title={t('totalUsers', 'Total Users')}
                value={statistics.total}
                color="blue"
              />
              <StatCard
                icon={CheckCircle}
                title={t('successful', 'Successful')}
                value={statistics.successful}
                color="green"
              />
              <StatCard
                icon={AlertCircle}
                title={t('failed', 'Failed')}
                value={statistics.failed}
                color="red"
              />
              <StatCard
                icon={TrendingUp}
                title={t('successRate', 'Success Rate')}
                value={`${statistics.successRate}%`}
                color="purple"
              />
            </div>
          </FadeInSection>
        )}

        {/* Controls */}
        <FadeInSection className="mb-8 space-y-4">
          {/* Search and Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={t('search', 'Search users...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Role Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white cursor-pointer"
              >
                <option value="all">{t('allRoles', 'All Roles')}</option>
                <option value="teacher">{t('teachers', 'Teachers')}</option>
                <option value="director">{t('directors', 'Directors')}</option>
                <option value="student">{t('students', 'Students')}</option>
              </select>
            </div>

            {/* QR Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('qrSize', 'QR Size')}: {qrSize}px
              </label>
              <input
                type="range"
                min="150"
                max="300"
                step="50"
                value={qrSize}
                onChange={(e) => setQrSize(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleGenerateQRCodes}
              disabled={generating || filteredUsers.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              {generating ? (
                <><Loader className="w-4 h-4 animate-spin" /> {t('generating', 'Generating...')}</>
              ) : (
                <><RefreshCw className="w-4 h-4" /> {t('generateAll', 'Generate All')}</>
              )}
            </button>

            <button
              onClick={handleExportJSON}
              disabled={qrCodes.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              <FileJson className="w-4 h-4" />
              {t('exportJSON', 'Export JSON')}
            </button>

            <button
              onClick={handleExportCSV}
              disabled={qrCodes.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold rounded-lg transition-colors"
            >
              <FileText className="w-4 h-4" />
              {t('exportCSV', 'Export CSV')}
            </button>

            <button
              onClick={() => setShowQRCodes(!showQRCodes)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
            >
              {showQRCodes ? (
                <><EyeOff className="w-4 h-4" /> {t('hide', 'Hide')}</>
              ) : (
                <><Eye className="w-4 h-4" /> {t('show', 'Show')}</>
              )}
            </button>
          </div>

          {/* Info */}
          <div className="text-sm text-gray-600">
            {t('showing', 'Showing')} <span className="font-semibold">{filteredUsers.length}</span> {t('of', 'of')} <span className="font-semibold">{allUsers.length}</span> {t('users', 'users')}
            {selectedUsers.size > 0 && (
              <span className="ml-4">| {t('selected', 'Selected')}: <span className="font-semibold">{selectedUsers.size}</span></span>
            )}
          </div>
        </FadeInSection>

        {/* Users Table with QR Codes */}
        <FadeInSection>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.size > 0 && selectedUsers.size === filteredUsers.length}
                        onChange={handleSelectAll}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      <button
                        onClick={() => handleSortChange('username')}
                        className="hover:text-gray-900"
                      >
                        {t('username', 'Username')}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      <button
                        onClick={() => handleSortChange('fullName')}
                        className="hover:text-gray-900"
                      >
                        {t('fullName', 'Full Name')}
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      {t('email', 'Email')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      {t('role', 'Role')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                      {t('qrCode', 'QR Code')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                      {t('status', 'Status')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                      {t('actions', 'Actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredUsers.map((user) => {
                    const userQR = qrCodes.find(qr => qr.userId === user.id);
                    const isSelected = selectedUsers.has(user.id);

                    return (
                      <tr key={user.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleUserSelection(user.id)}
                            className="w-4 h-4 text-blue-600 rounded border-gray-300"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                          {user.username}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.fullName || user.full_name || `${user.first_name} ${user.last_name}`}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {user.email || 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            color={
                              user.roleId === 8
                                ? user.isDirector ? 'blue' : 'green'
                                : 'purple'
                            }
                            size="sm"
                          >
                            {user.roleId === 8
                              ? user.isDirector ? t('director', 'Director') : t('teacher', 'Teacher')
                              : t('student', 'Student')}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {userQR && userQR.qrCode && showQRCodes ? (
                            <img
                              src={userQR.qrCode}
                              alt={`QR for ${user.username}`}
                              className="w-12 h-12 mx-auto"
                            />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {userQR ? (
                            userQR.status === 'success' ? (
                              <Badge color="green" size="sm">
                                {t('success', 'Success')}
                              </Badge>
                            ) : (
                              <Badge color="red" size="sm">
                                {t('error', 'Error')}
                              </Badge>
                            )
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {userQR && userQR.qrCode && (
                            <button
                              onClick={() => handleDownloadUserQR(userQR, user.username)}
                              className="text-blue-600 hover:text-blue-700 font-semibold text-sm"
                            >
                              {t('download', 'Download')}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">{t('noUsersFound', 'No users found')}</p>
                </div>
              )}
            </div>
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
}

/**
 * Statistics Card Component
 */
function StatCard({ icon: Icon, title, value, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600',
    green: 'bg-green-50 border-green-200 text-green-600',
    red: 'bg-red-50 border-red-200 text-red-600',
    purple: 'bg-purple-50 border-purple-200 text-purple-600'
  };

  return (
    <div className={`border rounded-lg p-6 ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-75">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <Icon className="w-10 h-10 opacity-20" />
      </div>
    </div>
  );
}
