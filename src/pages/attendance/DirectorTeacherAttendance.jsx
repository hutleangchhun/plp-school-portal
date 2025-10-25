import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import { Calendar, Check, X, Clock, Users, Search, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import Badge from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import EmptyState from '@/components/ui/EmptyState';
import { formatDateKhmer } from '../../utils/formatters';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { teacherService } from '../../utils/api/services/teacherService';
import { teacherSettingsService } from '../../utils/api/services/teacherSettingsService';
import { isToday } from '../attendance/utils';

/**
 * TeacherAttendance Component
 * For directors to track teacher attendance in their school
 */
export default function TeacherAttendance() {
  const { t, setLanguage } = useLanguage();
  // Force Khmer as the base language for this page
  useEffect(() => {
    setLanguage && setLanguage('km');
  }, [setLanguage]);

  const { showSuccess: _showSuccess, showError: _showError } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError, retry } = useErrorHandler();

  const [teachers, setTeachers] = useState([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState({}); // { userId: { date: { status, time, id } } }
  const [teacherSettings, setTeacherSettings] = useState({}); // { teacherId: { requiresApproval: boolean } }
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [updatingSettings, setUpdatingSettings] = useState({}); // Track which teachers are being updated
  const [selectedTeachers, setSelectedTeachers] = useState(new Set()); // Track selected teachers for bulk actions
  const [bulkUpdating, setBulkUpdating] = useState(false);

  const fetchingRef = useRef(false);

  // Helper function to get the start of the week (Monday)
  const getWeekStartHelper = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStartHelper(new Date()));

  // Generate array of dates for the current week
  const getWeekDates = useCallback((startDate) => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart, getWeekDates]);

  // Get authenticated user data
  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      console.error('Error parsing user data:', err);
      return null;
    }
  });

  const [schoolId, setSchoolId] = useState(user?.school_id || user?.schoolId || null);
  const isDirector = user?.isDirector === true;

  // Function to toggle teacher selection
  const toggleTeacherSelection = useCallback((userId) => {
    setSelectedTeachers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  }, []);

  // Function to update teacher approval setting
  // userId is the user.id (used for UI keying), teacherIdFromDb is the teacher_id from teachers table
  const updateTeacherApprovalSetting = useCallback(async (userId, teacherIdFromDb, requiresApproval) => {
    console.log(`Updating teacher_id ${teacherIdFromDb} (user_id: ${userId}) approval setting to:`, requiresApproval);
    setUpdatingSettings(prev => ({ ...prev, [userId]: true }));

    try {
      // Use teacher_id for the API call
      const response = await teacherSettingsService.updateTeacherSettings(teacherIdFromDb, {
        requiresApproval
      });

      console.log('Update response:', response);

      if (response.success) {
        setTeacherSettings(prev => ({
          ...prev,
          [userId]: {
            requiresApproval,
            teacherId: teacherIdFromDb
          }
        }));

        _showSuccess(
          requiresApproval
            ? t('approvalRequiredEnabled', 'Approval requirement enabled for this teacher')
            : t('approvalRequiredDisabled', 'Approval requirement disabled for this teacher')
        );
      } else {
        throw new Error('Failed to update settings');
      }
    } catch (err) {
      console.error('Error updating teacher approval setting:', err);
      _showError(t('errorUpdatingSettings', 'Failed to update teacher settings'));

      // Revert the UI state
      setTeacherSettings(prev => ({
        ...prev,
        [userId]: {
          requiresApproval: !requiresApproval,
          teacherId: teacherIdFromDb
        }
      }));
    } finally {
      setUpdatingSettings(prev => ({ ...prev, [userId]: false }));
    }
  }, [t, _showSuccess, _showError]);

  // Fetch teachers and attendance data
  const fetchTeachersAndAttendance = useCallback(async (_searchQuery = '') => {
    if (fetchingRef.current || !schoolId || !isDirector) {
      console.log('Skipping fetch - already fetching or not director');
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    clearError();

    try {
      const loadingKey = 'fetchTeachers';
      startLoading(loadingKey, t('loadingTeachers', 'Loading teachers...'));

      // Fetch teachers from the school
      const response = await teacherService.getTeachersBySchool(schoolId, { limit: 70 });

      if (response.data && Array.isArray(response.data)) {
        const formattedTeachers = response.data
          .filter(teacher => teacher && (teacher.id || teacher.userId || teacher.user_id))
          .map(teacher => {
            // Teacher data might be in nested user object
            const user = teacher.user || teacher;
            const userId = user.id || teacher.id || teacher.userId || teacher.user_id;
            const firstName = user.firstName || user.first_name || teacher.firstName || teacher.first_name || '';
            const lastName = user.lastName || user.last_name || teacher.lastName || teacher.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim();
            const username = user.username || teacher.username || '';

            console.log('Teacher data:', { teacher, user, userId, firstName, lastName, fullName, username });

            return {
              id: Number(userId), // User ID (for attendance queries)
              teacherId: Number(teacher.teacherId || teacher.teacher_id || teacher.id), // Teacher ID (for teacher-settings API)
              name: fullName || username || 'Unknown',
              firstName,
              lastName,
              username,
              teacherNumber: teacher.teacherNumber || teacher.teacher_number || '',
              profilePicture: user.profile_picture || user.profilePicture || teacher.profile_picture || teacher.profilePicture || ''
            };
          });

        setTeachers(formattedTeachers);

        // Fetch teacher settings for each teacher
        const settingsPromises = formattedTeachers.map(async (teacher) => {
          try {
            // Use teacherId (teacher_id from teachers table) for the API call
            const settingsResponse = await teacherSettingsService.getTeacherSettings(teacher.teacherId);
            console.log(`Settings for teacher_id ${teacher.teacherId} (user_id: ${teacher.id}):`, settingsResponse);

            // Handle API response structure: response.data contains the actual settings object
            const requiresApproval = settingsResponse.success && settingsResponse.data
              ? settingsResponse.data.requiresApproval === true
              : false;

            return {
              userId: teacher.id, // Store by user ID for easy lookup
              teacherId: teacher.teacherId,
              requiresApproval
            };
          } catch (err) {
            console.warn(`Failed to fetch settings for teacher_id ${teacher.teacherId} (user_id: ${teacher.id}):`, err);
            return {
              userId: teacher.id,
              teacherId: teacher.teacherId,
              requiresApproval: false
            };
          }
        });

        const settingsResults = await Promise.all(settingsPromises);
        const settingsMap = {};
        settingsResults.forEach(result => {
          // Store by userId for easy lookup in the UI (teacher rows are keyed by teacher.id which is userId)
          settingsMap[result.userId] = {
            requiresApproval: result.requiresApproval,
            teacherId: result.teacherId // Keep teacherId for updates
          };
        });
        setTeacherSettings(settingsMap);

        // Fetch attendance for the entire week in one go
        const weeklyAttendanceData = {};
        const dates = getWeekDates(currentWeekStart);
        const startDate = dates[0].toISOString().split('T')[0];
        const endDate = dates[6].toISOString().split('T')[0];

        try {
          const allAttendanceRecords = [];

          // Fetch attendance for each teacher
          for (const teacher of formattedTeachers) {
            try {
              const attendanceResponse = await attendanceService.getAttendance({
                userId: teacher.id,
                startDate,
                endDate,
                limit: 400
              });

              if (attendanceResponse.success && attendanceResponse.data) {
                const records = Array.isArray(attendanceResponse.data)
                  ? attendanceResponse.data
                  : attendanceResponse.data.records || [];
                allAttendanceRecords.push(...records);
              }
            } catch (err) {
              console.warn(`Failed to fetch attendance for teacher ${teacher.id}:`, err);
            }
          }

          allAttendanceRecords.forEach(record => {
            const userId = Number(record.userId || record.user_id);
            const recordDate = record.date ? record.date.split('T')[0] : null;
            if (!userId || isNaN(userId) || !recordDate) return;

            if (!weeklyAttendanceData[userId]) {
              weeklyAttendanceData[userId] = {};
            }

            weeklyAttendanceData[userId][recordDate] = {
              status: record.status?.toUpperCase() || 'PRESENT',
              time: record.createdAt ? new Date(record.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              }) : null,
              id: record.id,
              createdAt: record.createdAt,
              reason: record.reason || ''
            };
          });
        } catch (err) {
          console.error(`Error fetching weekly attendance:`, err);
        }

        setWeeklyAttendance(weeklyAttendanceData);
      } else {
        setTeachers([]);
        setWeeklyAttendance({});
      }

      stopLoading(loadingKey);
    } catch (err) {
      console.error('Error fetching teachers:', err);
      handleError(err, {
        toastMessage: t('errorFetchingTeacherData', 'Error fetching teacher data')
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
      fetchingRef.current = false;
    }
  }, [schoolId, isDirector, currentWeekStart, getWeekDates, t, handleError, clearError, startLoading, stopLoading]);

  // Filter teachers based on search term
  const displayedTeachers = useMemo(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      return teachers;
    }

    const searchLower = searchTerm.toLowerCase().trim();

    return teachers.filter(teacher => {
      const name = (teacher.name || '').toLowerCase();
      const firstName = (teacher.firstName || '').toLowerCase();
      const lastName = (teacher.lastName || '').toLowerCase();
      const username = (teacher.username || '').toLowerCase();
      const teacherNumber = (teacher.teacherNumber || '').toLowerCase();
      const fullName = `${firstName} ${lastName}`.trim().toLowerCase();

      return (
        name.includes(searchLower) ||
        firstName.includes(searchLower) ||
        lastName.includes(searchLower) ||
        username.includes(searchLower) ||
        teacherNumber.includes(searchLower) ||
        fullName.includes(searchLower) ||
        // Support Khmer text (case-sensitive)
        (teacher.name || '').includes(searchTerm) ||
        (teacher.firstName || '').includes(searchTerm) ||
        (teacher.lastName || '').includes(searchTerm) ||
        `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim().includes(searchTerm)
      );
    });
  }, [teachers, searchTerm]);

  // Function to select/deselect all teachers
  const toggleSelectAll = useCallback(() => {
    if (selectedTeachers.size === displayedTeachers.length && displayedTeachers.length > 0) {
      setSelectedTeachers(new Set());
    } else {
      setSelectedTeachers(new Set(displayedTeachers.map(t => t.id)));
    }
  }, [selectedTeachers.size, displayedTeachers]);

  // Function to bulk update teacher approval settings
  const bulkUpdateApprovalSettings = useCallback(async (requiresApproval) => {
    if (selectedTeachers.size === 0) {
      _showError(t('noTeachersSelected', 'Please select at least one teacher'));
      return;
    }

    setBulkUpdating(true);

    try {
      // Build updates array using teacher_id
      const updates = Array.from(selectedTeachers).map(userId => {
        const settings = teacherSettings[userId] || {};
        const teacherIdFromDb = settings.teacherId || displayedTeachers.find(t => t.id === userId)?.teacherId;
        return {
          teacherId: teacherIdFromDb,
          requiresApproval
        };
      });

      console.log('Bulk updating teachers:', updates);

      const response = await teacherSettingsService.bulkUpdateTeacherSettings(updates);

      if (response.success) {
        // Update state for all selected teachers
        setTeacherSettings(prev => {
          const newSettings = { ...prev };
          Array.from(selectedTeachers).forEach(userId => {
            const settings = prev[userId] || {};
            newSettings[userId] = {
              ...settings,
              requiresApproval
            };
          });
          return newSettings;
        });

        _showSuccess(
          t('bulkUpdateSuccess', `Successfully updated ${selectedTeachers.size} teacher(s)`)
        );
        setSelectedTeachers(new Set()); // Clear selection
      } else {
        throw new Error('Failed to bulk update settings');
      }
    } catch (err) {
      console.error('Error bulk updating teacher settings:', err);
      _showError(t('errorBulkUpdating', 'Failed to bulk update teacher settings'));
    } finally {
      setBulkUpdating(false);
    }
  }, [selectedTeachers, teacherSettings, displayedTeachers, t, _showSuccess, _showError]);

  // Debounce search
  const debouncedFetchRef = useRef(null);
  const previousSearchRef = useRef(searchTerm);
  const previousWeekRef = useRef(currentWeekStart);

  // Effect to handle week changes and search
  useEffect(() => {
    if (!isDirector || !schoolId) {
      setInitialLoading(false);
      return;
    }

    const weekChanged = previousWeekRef.current?.getTime() !== currentWeekStart?.getTime();
    const searchChanged = previousSearchRef.current !== searchTerm;

    previousWeekRef.current = currentWeekStart;
    previousSearchRef.current = searchTerm;

    // Cancel any pending debounced calls
    if (debouncedFetchRef.current) {
      debouncedFetchRef.current.cancel();
    }

    // If week changed, fetch immediately
    if (weekChanged) {
      fetchTeachersAndAttendance(searchTerm);
    }
    // If only search changed, debounce
    else if (searchChanged) {
      debouncedFetchRef.current = debounce(() => {
        fetchTeachersAndAttendance(searchTerm);
      }, 500);
      debouncedFetchRef.current();
    }

    return () => {
      if (debouncedFetchRef.current) {
        debouncedFetchRef.current.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart, searchTerm, isDirector, schoolId]);

  // Initial fetch
  useEffect(() => {
    if (isDirector && schoolId) {
      fetchTeachersAndAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Week navigation
  const goToPreviousWeek = useCallback(() => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  }, [currentWeekStart]);

  const goToNextWeek = useCallback(() => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  }, [currentWeekStart]);


  // Helper to check if date is weekend
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Check if user is director
  if (!isDirector) {
    return (
      <div className="p-4">
        <ErrorDisplay
          error={{ message: t('accessDeniedDirectorOnly', 'Access denied. This page is only accessible by school directors.') }}
          onRetry={() => window.history.back()}
          retryText={t('goBack', 'Go Back')}
        />
      </div>
    );
  }

  // Initial loading state
  if (initialLoading) {
    return (
      <PageLoader
        message={t('loadingTeachers', 'Loading teachers...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => retry(fetchTeachersAndAttendance)}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <FadeInSection className="mb-4">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('teacherAttendanceTracking') || 'វត្តមានគ្រូបង្រៀន'}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {t('trackTeacherAttendance') || 'តាមដាន និងគ្រប់គ្រងកំណត់ត្រាវត្តមានរបស់គ្រូបង្រៀន'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('search') || 'ស្វែងរក'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('searchTeachers') || 'ស្វែងរកគ្រូបង្រៀន...'}
                    className="pl-10 w-full border text-sm border-gray-300 rounded-sm px-3 py-2"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>

          </div>
        </FadeInSection>

        {/* Bulk Actions Toolbar */}
        {selectedTeachers.size > 0 && (
          <FadeInSection>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-sm font-medium text-blue-900">
                  {t('selectedCount', `${selectedTeachers.size} teacher(s) selected`)}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => bulkUpdateApprovalSettings(true)}
                    disabled={bulkUpdating}
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {bulkUpdating ? t('updating', 'កំពុងកែប្រែ...') : t('enableApprovalForSelected', 'Enable Approval')}
                  </button>
                  <button
                    onClick={() => bulkUpdateApprovalSettings(false)}
                    disabled={bulkUpdating}
                    className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {bulkUpdating ? t('updating', 'កំពុងកែប្រែ...') : t('disableApprovalForSelected', 'Disable Approval')}
                  </button>
                  <button
                    onClick={() => setSelectedTeachers(new Set())}
                    disabled={bulkUpdating}
                    className="px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('clearSelection', 'Clear Selection')}
                  </button>
                </div>
              </div>
            </div>
          </FadeInSection>
        )}

        {/* Attendance List */}
        <FadeInSection>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className='flex flex-row items-center gap-2'>
                    <div className='w-12 h-12 rounded-md bg-indigo-100 flex justify-center items-center'>
                      <Calendar className="inline-block h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {t('weeklyAttendance', 'វត្តមានប្រចាំសប្តាហ៍')}
                      </h3>
                    </div>
                  </div>
                  <div className='flex justify-center items-center gap-3 mt-3'>
                    <button
                      onClick={goToPreviousWeek}
                      disabled={loading}
                      className="hover:text-blue-500 transition-colors duration-300"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <div className="text-center mt-1">
                      <p className="text-sm text-gray-600">
                        {formatDateKhmer(currentWeekStart, 'dayMonth')} - {formatDateKhmer(weekDates[6], 'short')}
                      </p>
                    </div>
                    <button
                      onClick={goToNextWeek}
                      disabled={loading}
                      className="hover:text-blue-500 transition-colors duration-300"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center p-12">
                <DynamicLoader
                  type="spinner"
                  size="xl"
                  variant="primary"
                  message={t('loadingTeachers', 'កំពុងផ្ទុក...')}
                />
              </div>
            ) : displayedTeachers.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t('noTeachersFound', 'រកមិនឃើញគ្រូបង្រៀន')}
                description={searchTerm
                  ? t('tryDifferentSearch', 'សាកល្បងពាក្យស្វែងរកផ្សេង')
                  : t('noTeachersInSchool', 'គ្មានគ្រូបង្រៀននៅក្នុងសាលានេះទេ')}
                variant='info'
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="sticky left-0 z-10 bg-blue-50 px-3 py-3 text-center border-r">
                        <input
                          type="checkbox"
                          checked={selectedTeachers.size === displayedTeachers.length && displayedTeachers.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                          title={t('selectAll', 'Select All')}
                        />
                      </th>
                      <th className="sticky left-0 z-10 bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-700 uppercase tracking-wider border-r">
                        <div className='ml-3'>{t('teachers', 'គ្រូបង្រៀន')}</div>
                      </th>
                      <th className="bg-blue-50 px-3 py-3 text-center text-xs font-medium text-blue-700 uppercase tracking-wider border-r">
                        <Tooltip content={t('requiresApprovalTooltip', 'Enable if teacher attendance requires director approval')}>
                          <div className="flex flex-col items-center gap-1">
                            <Settings className="h-4 w-4" />
                            <span className='text-xs'>{t('requiresApproval', 'ត្រូវការអនុម័ត')}</span>
                          </div>
                        </Tooltip>
                      </th>
                      {/* Khmer day names mapping */}
                      {(() => {
                        const khmerDays = ['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'];
                        return weekDates.map((date, idx) => {
                          const dayName = khmerDays[date.getDay()];
                          const dayNum = date.getDate();
                          const isWeekendDay = isWeekend(date);
                          const isCurrentDay = isToday(date);
                          return (
                            <th
                              key={idx}
                              className={`px-3 py-3 text-center text-xs font-medium uppercase tracking-wider ${isCurrentDay
                                ? 'bg-blue-200 text-blue-900'
                                : isWeekendDay
                                  ? 'bg-red-100 text-red-700'
                                  : 'text-gray-700'
                                }`}
                            >
                              <div className="flex flex-col items-center">
                                <span className='text-md'>{dayName}</span>
                                <span className="font-bold text">
                                  {dayNum}
                                </span>
                              </div>
                            </th>
                          );
                        });
                      })()}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {displayedTeachers.map((teacher) => {
                      const settings = teacherSettings[teacher.id] || {};
                      const requiresApproval = settings.requiresApproval || false;
                      const teacherIdFromDb = settings.teacherId || teacher.teacherId;
                      const isUpdating = updatingSettings[teacher.id] || false;

                      return (
                        <tr key={teacher.id} className={selectedTeachers.has(teacher.id) ? 'bg-blue-50' : ''}>
                          <td className={`sticky left-0 z-10 px-3 py-3 text-center border-r ${selectedTeachers.has(teacher.id) ? 'bg-blue-50' : 'bg-white'}`}>
                            <input
                              type="checkbox"
                              checked={selectedTeachers.has(teacher.id)}
                              onChange={() => toggleTeacherSelection(teacher.id)}
                              className="h-4 w-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                          </td>
                          <td className={`sticky left-0 z-10 px-4 py-3 whitespace-nowrap border-r ${selectedTeachers.has(teacher.id) ? 'bg-blue-50' : 'bg-white'}`}>
                            <div className="flex items-center">
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{teacher.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="bg-white px-3 py-3 text-center border-r">
                            <div className="flex flex-col items-center justify-center gap-1">
                              <label className="relative inline-flex items-center cursor-pointer" title={`User ID: ${teacher.id}, Teacher ID: ${teacherIdFromDb}, Status: ${requiresApproval ? 'Enabled' : 'Disabled'}`}>
                                <input
                                  type="checkbox"
                                  checked={requiresApproval}
                                  disabled={isUpdating}
                                  onChange={(e) => updateTeacherApprovalSetting(teacher.id, teacherIdFromDb, e.target.checked)}
                                  className="sr-only peer"
                                />
                                <div className={`w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                              </label>
                              {isUpdating && (
                                <span className="text-xs text-gray-500">{t('updating', 'កំពុងកែប្រែ...')}</span>
                              )}
                            </div>
                          </td>
                          {weekDates.map((date, idx) => {
                            // Use same date formatting as in fetch
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const dateStr = `${year}-${month}-${day}`;
                            const attendance = weeklyAttendance[teacher.id]?.[dateStr];
                            const isWeekendDay = isWeekend(date);
                            const isCurrentDay = isToday(date);

                            // Status badge config
                            let badge = null;
                            if (attendance) {
                              let color = 'gray';
                              let icon = null;
                              let text = '-';
                              switch (attendance.status) {
                                case 'PRESENT':
                                  color = 'green';
                                  icon = <Check className="h-4 w-4 mr-1 text-green-600" />;
                                  text = t('present', 'វត្តមាន');
                                  break;
                                case 'ABSENT':
                                  color = 'red';
                                  icon = <X className="h-4 w-4 mr-1 text-red-600" />;
                                  text = t('absent', 'អវត្តមាន');
                                  break;
                                case 'LATE':
                                  color = 'yellow';
                                  icon = <Clock className="h-4 w-4 mr-1 text-yellow-600" />;
                                  text = t('late', 'យឺត');
                                  break;
                                case 'LEAVE':
                                  color = 'purple';
                                  icon = <Clock className="h-4 w-4 mr-1 text-purple-600" />;
                                  text = t('leave', 'ច្បាប់');
                                  break;
                                case 'ACTIVE':
                                  color = 'blue';
                                  icon = <Check className="h-4 w-4 mr-1 text-blue-600" />;
                                  text = t('active', 'សកម្ម');
                                  break;
                                default:
                                  color = 'gray';
                                  icon = null;
                                  text = t(attendance.status?.toLowerCase(), attendance.status);
                              }
                              badge = (
                                <Tooltip
                                  content={
                                    <div className="text-left">
                                      <div className="mb-1 font-semibold flex items-center gap-3">
                                        {t('status', 'ស្ថានភាព')}: {text}
                                      </div>
                                      {attendance.reason && (
                                        <div className="mb-1"><span className="font-semibold">{t('reason', 'មូលហេតុ')}:</span> {attendance.reason}</div>
                                      )}
                                      <div className="text-xs text-gray-500">{t('created', 'បានបង្កើត')}: {attendance.createdAt ? formatDateKhmer(attendance.createdAt, 'full') : '-'}</div>
                                    </div>
                                  }
                                >
                                  <Badge color={color} variant="outline" size="sm" className="gap-1">
                                    {icon}
                                    {text}
                                  </Badge>
                                </Tooltip>
                              );
                            }

                            return (
                              <td
                                key={idx}
                                className={`px-3 py-3 text-center ${isCurrentDay ? 'bg-blue-50' : isWeekendDay ? 'bg-gray-50' : ''
                                  }`}
                              >
                                {badge || <span className="text-gray-400">-</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
