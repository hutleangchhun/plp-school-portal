import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { debounce } from 'lodash';
import { Calendar, Check, X, Clock, Users, Search, ChevronLeft, ChevronRight, Settings, FileCheck, Download } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { Button } from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import Badge from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import EmptyState from '@/components/ui/EmptyState';
import { formatDateKhmer } from '../../utils/formatters';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { teacherService } from '../../utils/api/services/teacherService';
import { getFullName } from '../../utils/usernameUtils';
import { teacherSettingsService } from '../../utils/api/services/teacherSettingsService';
import schoolService from '../../utils/api/services/schoolService';
import { isToday } from '../attendance/utils';
import { exportTeacherAttendanceToExcel } from '../../utils/teacherAttendanceExportUtils';
import ExportProgressModal from '../../components/modals/ExportProgressModal';

/**
 * TeacherAttendance Component
 * For directors to track teacher attendance in their school
 */
export default function TeacherAttendance() {
  const navigate = useNavigate();
  const { t, setLanguage } = useLanguage();
  // Force Khmer as the base language for this page
  useEffect(() => {
    setLanguage && setLanguage('km');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only set language once on mount

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
  const [attendanceModal, setAttendanceModal] = useState({
    isOpen: false,
    teacher: null,
    date: null,
    existingAttendance: null
  });
  const [submittingAttendance, setSubmittingAttendance] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10); // Default from API
  const [totalPages, setTotalPages] = useState(1); // Total pages from API
  const [totalTeachers, setTotalTeachers] = useState(0); // Total teachers count from API
  const [exportModal, setExportModal] = useState({
    isOpen: false,
    status: 'processing', // 'processing', 'success', 'error'
    progress: 0,
    processedItems: 0,
    totalItems: 0,
    errorMessage: null
  });

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
      date.setDate(date.getDate() + i); // Use date.getDate() instead of startDate.getDate()
      dates.push(date);
    }
    return dates;
  }, []);

  const weekDates = useMemo(() => getWeekDates(currentWeekStart), [currentWeekStart, getWeekDates]);

  // Get authenticated user data
  const [user] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      console.error('Error parsing user data:', err);
      return null;
    }
  });

  const [schoolId] = useState(user?.teacher?.schoolId || user?.school_id || user?.schoolId || null);
  const isDirector = user?.roleId === 14;

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
  const fetchTeachersAndAttendance = useCallback(async (_searchQuery = '', pageNum = 1, limit = itemsPerPage) => {
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

      // ✅ Single optimized call to fetch teachers + settings combined
      console.log(`🚀 Fetching teachers with attendance settings from: /teachers/attendance-settings/${schoolId}`);
      const response = await attendanceService.getTeacherAttendanceSettings(schoolId, {
        search: _searchQuery.trim() || '',
        page: pageNum,
        limit
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch teacher attendance settings');
      }

      // Update pagination info from API response
      const pagination = response.pagination || {};
      if (pagination?.limit) {
        setItemsPerPage(pagination.limit);
      }
      if (pagination?.totalPages) {
        setTotalPages(pagination.totalPages);
      }
      if (pagination?.total) {
        setTotalTeachers(pagination.total);
      }

      console.log('✅ Received data from single endpoint:', {
        teachersCount: response.data?.length,
        pagination,
        networkRequests: '1 (optimized single call)'
      });

      // Process teachers data from the new endpoint
      const teachersData = response.data || [];
      if (Array.isArray(teachersData) && teachersData.length > 0) {
        const formattedTeachers = teachersData
          .filter(item => item && (item.userId || item.teacherId))
          .map(item => {
            const user = item.user || {};
            const firstName = user.firstName || '';
            const lastName = user.lastName || '';
            const fullName = `${lastName} ${firstName}`.trim() || 'Unknown';

            return {
              id: Number(item.userId), // User ID
              teacherId: Number(item.teacherId), // Teacher ID
              name: fullName,
              username: user.username || '',
              teacherNumber: item.teacherNumber || '',
              profilePicture: user.profilePicture || '',
              gender: user.gender || '',
              isActive: user.isActive !== false
            };
          });

        setTeachers(formattedTeachers);

        // Extract teacher settings from the same response (no separate API call needed)
        const settingsMap = {};
        teachersData.forEach(item => {
          const userId = Number(item.userId);
          const settings = item.attendanceSettings || {};

          settingsMap[userId] = {
            requiresApproval: settings.requiresApproval === true,
            teacherId: Number(item.teacherId),
            settingsId: settings.id,
            updatedAt: settings.updatedAt,
            updatedBy: settings.updatedBy
          };
        });
        setTeacherSettings(settingsMap);

        // ✅ Fetch attendance data separately (not included in the settings endpoint)
        console.log('📅 Fetching attendance data for teachers...');
        const dates = getWeekDates(currentWeekStart);
        const startDate = dates[0].toISOString().split('T')[0];
        const endDate = dates[6].toISOString().split('T')[0];

        const weeklyAttendanceData = {};

        // Fetch attendance for each teacher
        const attendancePromises = formattedTeachers.map(async (teacher) => {
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

              return {
                userId: teacher.id,
                records
              };
            }
            return { userId: teacher.id, records: [] };
          } catch (err) {
            console.warn(`Failed to fetch attendance for teacher ${teacher.id}:`, err);
            return { userId: teacher.id, records: [] };
          }
        });

        const attendanceResults = await Promise.all(attendancePromises);

        // Process attendance records and group by date
        attendanceResults.forEach(({ userId, records }) => {
          weeklyAttendanceData[userId] = {};

          records.forEach(record => {
            const recordDate = record.date ? record.date.split('T')[0] : null;

            if (!recordDate) return;

            if (!weeklyAttendanceData[userId][recordDate]) {
              weeklyAttendanceData[userId][recordDate] = [];
            }

            // Format attendance record
            const recordTime = record.checkInTime
              ? new Date(record.checkInTime)
              : record.createdAt
              ? new Date(record.createdAt)
              : null;

            const recordHour = recordTime ? recordTime.getHours() : 12;
            const shift =
              recordHour < 11 ? 'MORNING' : recordHour < 13 ? 'NOON' : 'AFTERNOON';

            weeklyAttendanceData[userId][recordDate].push({
              status: record.status?.toUpperCase() || 'PRESENT',
              time: recordTime
                ? recordTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })
                : null,
              id: record.id,
              createdAt: record.createdAt,
              reason: record.reason || '',
              classId: record.classId,
              className: record.class?.name || null,
              shift,
              checkInTime: record.checkInTime || null,
              checkOutTime: record.checkOutTime || null,
              hoursWorked: record.hoursWorked !== undefined ? record.hoursWorked : null,
              isCheckedOut: record.isCheckedOut === true,
              approvalStatus: record.approvalStatus || null
            });
          });

          // Sort records by time
          Object.keys(weeklyAttendanceData[userId]).forEach(date => {
            weeklyAttendanceData[userId][date].sort((a, b) => {
              const timeA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
              const timeB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
              return timeA - timeB;
            });
          });
        });

        console.log('✅ Attendance data processed:', {
          teachersWithAttendance: Object.keys(weeklyAttendanceData).length,
          totalRecords: attendanceResults.reduce((sum, a) => sum + a.records.length, 0)
        });

        setWeeklyAttendance(weeklyAttendanceData);
      } else {
        setTeachers([]);
        setWeeklyAttendance({});
        setTeacherSettings({});
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
  }, [schoolId, isDirector, currentWeekStart, getWeekDates, t, handleError, clearError, startLoading, stopLoading, itemsPerPage]);

  // With server-side search and pagination, teachers are already filtered by API
  // No need for client-side filtering
  const displayedTeachers = teachers;

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
    fetchTeachersAndAttendance(searchTerm, 1);
  }, [searchTerm]);

  // Function to select/deselect all teachers on current page
  const toggleSelectAll = useCallback(() => {
    const pageTeacherIds = new Set(displayedTeachers.map(t => t.id));
    const allPageSelected = displayedTeachers.length > 0 &&
      displayedTeachers.every(t => selectedTeachers.has(t.id));

    if (allPageSelected) {
      // Deselect all on current page
      const newSelection = new Set(selectedTeachers);
      pageTeacherIds.forEach(id => newSelection.delete(id));
      setSelectedTeachers(newSelection);
    } else {
      // Select all on current page
      const newSelection = new Set(selectedTeachers);
      pageTeacherIds.forEach(id => newSelection.add(id));
      setSelectedTeachers(newSelection);
    }
  }, [selectedTeachers, displayedTeachers]);

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

  // Function to export teacher attendance to Excel
  const handleExportAttendance = useCallback(async () => {
    try {
      // Open export modal with processing state
      setExportModal({
        isOpen: true,
        status: 'processing',
        progress: 10,
        processedItems: 0,
        totalItems: 0,
        errorMessage: null
      });

      // Fetch ALL teachers with limit 100 for export (not paginated)
      console.log('Fetching all teachers for export...');
      const allTeachersResponse = await teacherService.getTeachersBySchool(schoolId, {
        limit: 100,
        page: 1
      });

      if (!allTeachersResponse.data || !Array.isArray(allTeachersResponse.data)) {
        throw new Error('Failed to fetch teachers for export');
      }

      // Format teachers
      const exportTeachers = allTeachersResponse.data
        .filter(teacher => teacher && (teacher.id || teacher.userId || teacher.user_id))
        .map(teacher => {
          const user = teacher.user || teacher;
          const userId = user.id || teacher.id || teacher.userId || teacher.user_id;
          const username = user.username || teacher.username || '';

          return {
            id: Number(userId),
            teacherId: Number(teacher.teacherId || teacher.teacher_id || teacher.id),
            name: getFullName(user, username || 'Unknown'),
            username,
            teacherNumber: teacher.teacherNumber || teacher.teacher_number || '',
            profilePicture: user.profile_picture || user.profilePicture || teacher.profile_picture || teacher.profilePicture || ''
          };
        });

      setExportModal(prev => ({
        ...prev,
        progress: 30,
        totalItems: exportTeachers.length,
        processedItems: 0
      }));

      // Fetch school info to get school name
      let schoolName = 'សាលា'; // Default fallback
      try {
        if (schoolId) {
          const schoolResponse = await schoolService.getSchoolInfo(schoolId);
          if (schoolResponse?.data?.name) {
            schoolName = schoolResponse.data.name;
          }
        }
      } catch (err) {
        console.warn('Failed to fetch school name:', err);
        // Continue with default name
      }

      setExportModal(prev => ({ ...prev, progress: 45 }));

      const result = await exportTeacherAttendanceToExcel(
        exportTeachers,
        schoolId,
        {
          selectedDate: currentWeekStart,
          schoolName,
          onProgress: (processed, total) => {
            const progress = 45 + (processed / total) * 45; // 45-90%
            setExportModal(prev => ({
              ...prev,
              progress: Math.round(progress),
              processedItems: processed,
              totalItems: total
            }));
          },
          onSuccess: () => {
            setExportModal(prev => ({
              ...prev,
              progress: 100,
              status: 'success',
              errorMessage: null
            }));
            _showSuccess(t('exportSuccess', 'នាំចេញជោគជ័យ'));
            // Close modal after brief delay
            setTimeout(() => {
              setExportModal(prev => ({ ...prev, isOpen: false }));
            }, 1000);
          },
          onError: (error) => {
            // Close modal and show error toast
            setExportModal(prev => ({
              ...prev,
              isOpen: false,
              status: 'error',
              errorMessage: error.message || 'Export failed'
            }));
            _showError(t('exportError', 'នាំចេញបរាជ័យ: ' + error.message));
          }
        }
      );

      if (!result.success) {
        throw new Error(result.error?.message || 'Export failed');
      }
    } catch (error) {
      console.error('Error exporting attendance:', error);
      // Close modal and show error toast
      setExportModal(prev => ({
        ...prev,
        isOpen: false,
        status: 'error',
        errorMessage: error.message || 'An error occurred during export'
      }));
      _showError(t('exportError', 'នាំចេញបរាជ័យ'));
    }
  }, [schoolId, currentWeekStart, t, _showSuccess, _showError]);

  // Function to open attendance modal
  const openAttendanceModal = useCallback((teacher, date, existingAttendance) => {
    // Only allow marking attendance for today
    if (!isToday(date)) {
      _showError(t('canOnlyMarkTodayAttendance', 'អ្នកអាចបញ្ជូនវត្តមានតែថ្ងៃនេះប៉ុណ្ណោះ'));
      return;
    }

    setAttendanceModal({
      isOpen: true,
      teacher,
      date,
      existingAttendance
    });
  }, [t, _showError]);

  // Function to close attendance modal
  const closeAttendanceModal = useCallback(() => {
    setAttendanceModal({
      isOpen: false,
      teacher: null,
      date: null,
      existingAttendance: null
    });
  }, []);

  // Function to mark attendance
  const markAttendance = useCallback(async (status, reason = '') => {
    const { teacher, date } = attendanceModal;
    if (!teacher || !date) return;

    // Double-check it's today
    if (!isToday(date)) {
      _showError(t('canOnlyMarkTodayAttendance', 'អ្នកអាចបញ្ជូនវត្តមានតែថ្ងៃនេះប៉ុណ្ណោះ'));
      return;
    }

    const dateStr = date.toISOString().split('T')[0];
    const existingAttendanceId = attendanceModal.existingAttendance?.id;

    // Optimistic UI update - update state immediately
    const optimisticAttendance = {
      status: status.toUpperCase(),
      time: new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }),
      id: existingAttendanceId || Date.now(), // Temporary ID for new records
      createdAt: new Date().toISOString(),
      reason: reason || ''
    };

    // Update local state immediately for instant feedback
    setWeeklyAttendance(prev => ({
      ...prev,
      [teacher.id]: {
        ...(prev[teacher.id] || {}),
        [dateStr]: optimisticAttendance
      }
    }));

    // Close modal immediately for better UX
    closeAttendanceModal();

    // Show success message immediately
    _showSuccess(t('attendanceMarkedSuccess', 'វត្តមានត្រូវបានបញ្ជូនដោយជោគជ័យ'));

    try {
      setSubmittingAttendance(true);

      // For teacher attendance: NO classId required (unlike student attendance)
      const payload = {
        userId: teacher.id, // Use userId not teacherId
        date: dateStr,
        status: status,
        reason: reason || null
      };

      let response;
      if (existingAttendanceId) {
        // Update existing record using PATCH
        response = await attendanceService.updateAttendance(existingAttendanceId, payload);
      } else {
        // Create new record using POST
        response = await attendanceService.createAttendance(payload);
      }

      // Update with actual server response if available
      if (response?.data) {
        const record = response.data;
        setWeeklyAttendance(prev => ({
          ...prev,
          [teacher.id]: {
            ...(prev[teacher.id] || {}),
            [dateStr]: {
              status: record.status?.toUpperCase() || status.toUpperCase(),
              time: record.createdAt ? new Date(record.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              }) : optimisticAttendance.time,
              id: record.id || optimisticAttendance.id,
              createdAt: record.createdAt || optimisticAttendance.createdAt,
              reason: record.reason || reason || ''
            }
          }
        }));
      }
    } catch (error) {
      console.error('Error marking attendance:', error);

      // Revert optimistic update on error
      setWeeklyAttendance(prev => {
        const newState = { ...prev };
        if (attendanceModal.existingAttendance) {
          // Restore previous attendance
          newState[teacher.id] = {
            ...(prev[teacher.id] || {}),
            [dateStr]: attendanceModal.existingAttendance
          };
        } else {
          // Remove the optimistic entry
          if (newState[teacher.id]) {
            const { [dateStr]: removed, ...rest } = newState[teacher.id];
            newState[teacher.id] = rest;
          }
        }
        return newState;
      });

      const errorMessage = error.response?.data?.message || error.message || '';
      _showError(t('failedToMarkAttendance', 'បរាជ័យក្នុងការបញ្ជូនវត្តមាន') + (errorMessage ? ': ' + errorMessage : ''));
    } finally {
      setSubmittingAttendance(false);
    }
  }, [attendanceModal, t, _showSuccess, _showError, closeAttendanceModal]);

  // Helper function to translate attendance status to Khmer
  const getStatusInKhmer = useCallback((status) => {
    const statusMap = {
      'PRESENT': t('present', 'វត្តមាន'),
      'ABSENT': t('absent', 'អវត្តមាន'),
      'LATE': t('late', 'យឺត'),
      'LEAVE': t('leave', 'ច្បាប់')
    };
    return statusMap[status?.toUpperCase()] || status;
  }, [t]);

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
    <PageTransition variant="fade" className="flex-1">
      <div className="p-3 sm:p-4">
        {/* Header */}
        <FadeInSection>
          <div className="p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                  {t('teacherAttendanceTracking') || 'វត្តមានគ្រូបង្រៀន'}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  {t('trackTeacherAttendance') || 'តាមដាន និងគ្រប់គ្រងកំណត់ត្រាវត្តមានរបស់គ្រូបង្រៀន'}
                </p>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-4 my-4">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  {t('search') || 'ស្វែងរក'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('searchTeachers') || 'ស្វែងរកគ្រូបង្រៀន...'}
                    className="pl-10 w-full border text-xs sm:text-sm border-gray-300 rounded-sm px-3 py-2"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleExportAttendance}
                  variant="outline"
                  className="flex items-center gap-2 whitespace-nowrap"
                  title={t('exportAttendance', 'នាំចេញវត្តមាន')}
                  size="sm"
                >
                  <Download className="w-4 h-4" />
                  {t('export', 'នាំចេញ')}
                </Button>
                <Button
                  onClick={() => navigate('/attendance/approval')}
                  variant="primary"
                  className="flex items-center gap-2 whitespace-nowrap"
                  title={t('attendanceApprovals') || 'ការឯកភាពវត្តមាន'}
                  size="sm"
                >
                  <FileCheck className="w-4 h-4" />
                  {t('attendanceApprovals') || 'ការឯកភាពវត្តមាន'}
                </Button>
              </div>
            </div>

          </div>
        </FadeInSection>

        {/* Bulk Actions Toolbar */}
        {selectedTeachers.size > 0 && (
          <FadeInSection>
            <div className="p-4">
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
        <FadeInSection className='p-0 sm:px-4'>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className='flex flex-row items-center gap-2'>
                    <div className='w-12 h-12 rounded-md bg-indigo-100 flex justify-center items-center'>
                      <Calendar className="inline-block h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-md sm:text-lg font-semibold text-gray-900">
                        {t('weeklyAttendance', 'វត្តមានប្រចាំសប្តាហ៍')}
                      </h3>
                    </div>
                  </div>
                  <div className='flex justify-start items-center gap-3 mt-3'>
                    <button
                      onClick={goToPreviousWeek}
                      disabled={loading}
                      className="hover:text-blue-500 transition-colors duration-300"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <div className="text-center mt-1">
                      <p className="text-xs sm:text-sm text-gray-600">
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
                          checked={displayedTeachers.length > 0 && displayedTeachers.every(t => selectedTeachers.has(t.id))}
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
                                <div className="text-xs sm:text-sm font-medium text-gray-900">{teacher.name}</div>
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
                                <div className={`w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 ${isUpdating ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
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

                            // Get all attendance records for this teacher on this date
                            const teacherAttendanceForDay = weeklyAttendance[teacher.id]?.[dateStr];
                            const isWeekendDay = isWeekend(date);
                            const isCurrentDay = isToday(date);

                            // attendanceRecords is now always an array
                            let attendanceRecords = [];
                            if (teacherAttendanceForDay) {
                              if (Array.isArray(teacherAttendanceForDay)) {
                                // New structure: array of records
                                attendanceRecords = teacherAttendanceForDay;
                              } else if (teacherAttendanceForDay.status) {
                                // Old structure: single attendance record object
                                attendanceRecords = [teacherAttendanceForDay];
                              } else {
                                // Fallback: try to convert object to array
                                attendanceRecords = Object.values(teacherAttendanceForDay).filter(r => r && r.status);
                              }
                            }

                            // Helper function to get badge info for a status
                            const getBadgeInfo = (status) => {
                              let color = 'gray';
                              let icon = null;
                              let text = '-';
                              switch (status) {
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
                                  text = t(status?.toLowerCase(), status);
                              }
                              return { color, icon, text };
                            };

                            // Status badge config
                            let badge = null;
                            if (attendanceRecords.length > 0) {
                              // Use the first record for display
                              const primaryAttendance = attendanceRecords[0];
                              const badgeInfo = getBadgeInfo(primaryAttendance.status);

                              // Build tooltip content showing all records
                              const tooltipContent = (
                                <div className="text-left text-xs space-y-2 max-w-xs">
                                  {attendanceRecords.map((record, recordIdx) => {
                                    const recordBadgeInfo = getBadgeInfo(record.status);
                                    const shift = record.shift ? (
                                      record.shift === 'MORNING' ? t('morning', 'ព្រឹក') :
                                      record.shift === 'NOON' ? t('noon', 'ថ្ងៃត្រង់') :
                                      record.shift === 'AFTERNOON' ? t('afternoon', 'រសៀល') :
                                      ''
                                    ) : '';
                                    const className = record.className || (record.classId ? `${t('class', 'ថ្នាក់')} ${record.classId}` : '');
                                    const checkInTime = record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    }) : record.time;
                                    const checkOutTime = record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString('en-US', {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: true
                                    }) : null;

                                    return (
                                      <div key={recordIdx} className="py-1 border-b border-gray-300 last:border-b-0">
                                        <div className="mb-1 font-semibold flex items-center gap-2 flex-wrap">
                                          {className && <span className="text-blue-500">{className}</span>}
                                          {shift && <span className="text-purple-500">{shift}</span>}
                                          <span className="text-gray-900">{recordBadgeInfo.text}</span>
                                        </div>
                                        {record.status !== 'LEAVE' ? (
                                          <>
                                            <div className="text-gray-700 text-xs">
                                              {t('checkIn', 'ចូល')}: {checkInTime || 'N/A'}
                                            </div>
                                            {record.isCheckedOut && checkOutTime && (
                                              <div className="text-gray-700 text-xs">
                                                {t('checkOut', 'ចេញ')}: {checkOutTime}
                                              </div>
                                            )}
                                            {!record.isCheckedOut && (
                                              <div className="text-yellow-600 text-xs">
                                                {t('notCheckedOut', 'មិនទាន់ចេញវត្តមាន')}
                                              </div>
                                            )}
                                            {record.hoursWorked !== null && record.hoursWorked !== undefined && (
                                              <div className="text-gray-700 text-xs">
                                                {t('hoursWorked', 'ម៉ោងធ្វើការ')}: {record.hoursWorked.toFixed(2)} {t('hours', 'ម៉ោង')}
                                              </div>
                                            )}
                                          </>
                                        ) : (
                                          <div className="text-gray-700 text-xs">
                                            {t('submittedAt', 'បានបញ្ជូននៅ')}: {checkInTime}
                                          </div>
                                        )}
                                        {record.reason && (
                                          <div className="text-gray-700 text-xs mt-1">
                                            <span className="font-semibold">{t('reason', 'មូលហេតុ')}:</span> {record.reason}
                                          </div>
                                        )}
                                        {record.approvalStatus && (
                                          <div className="text-gray-700 text-xs mt-1">
                                            <span className="font-semibold">{t('approvalStatus', 'ស្ថានភាពអនុម័ត')}:</span> {
                                              record.approvalStatus === 'APPROVED' ? t('approved', 'បានអនុម័ត') :
                                              record.approvalStatus === 'PENDING' ? t('pending', 'កំពុងរង់ចាំ') :
                                              record.approvalStatus === 'REJECTED' ? t('rejected', 'បានបដិសេធ') :
                                              record.approvalStatus
                                            }
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );

                              badge = (
                                <div
                                  className="flex flex-col items-center gap-1"
                                  onClick={(e) => {
                                    // Allow clicks to propagate if it's today (for opening modal to update)
                                    if (!isToday(date)) {
                                      e.stopPropagation();
                                      e.preventDefault();
                                    }
                                  }}
                                  onMouseDown={(e) => {
                                    // Allow mouse events to propagate if it's today
                                    if (!isToday(date)) {
                                      e.stopPropagation();
                                      e.preventDefault();
                                    }
                                  }}
                                >
                                  <Tooltip content={tooltipContent}>
                                    <div className="flex flex-col items-center gap-1">
                                      <Badge color={badgeInfo.color} variant="outline" size="sm" className="gap-1">
                                        {badgeInfo.icon}
                                        {badgeInfo.text}
                                      </Badge>
                                      {attendanceRecords.length > 1 && (
                                        <span className="text-xs text-gray-500">+{attendanceRecords.length - 1}</span>
                                      )}
                                    </div>
                                  </Tooltip>
                                </div>
                              );
                            }

                            return (
                              <td
                                key={idx}
                                className={`px-3 py-3 text-center ${isToday(date) ? 'cursor-pointer hover:bg-blue-100' : ''} transition-colors ${
                                  isCurrentDay ? 'bg-blue-50' : isWeekendDay ? 'bg-gray-50' : ''
                                }`}
                                onClick={() => {
                                  // Allow updating attendance only for today
                                  if (isToday(date)) {
                                    const existingAttendance = attendanceRecords.length > 0 ? attendanceRecords[0] : null;
                                    openAttendanceModal(teacher, date, existingAttendance);
                                  }
                                }}
                                title={isToday(date) ? t('clickToMarkAttendance', 'ចុចដើម្បីបញ្ជូនវត្តមាន') : ''}
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

            {/* Pagination Component */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={totalTeachers}
              limit={itemsPerPage}
              onPageChange={(pageNum) => {
                setCurrentPage(pageNum);
                fetchTeachersAndAttendance(searchTerm, pageNum, itemsPerPage);
              }}
              onLimitChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
                fetchTeachersAndAttendance(searchTerm, 1, limit);
              }}
              limitOptions={[10, 20, 50, 100]}
              showLimitSelector={true}
              t={t}
              showFirstLast={true}
              showInfo={true}
              maxVisiblePages={5}
            />
          </div>
        </FadeInSection>
      </div>

      {/* Attendance Modal */}
      {attendanceModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {t('markAttendance', 'បញ្ជូនវត្តមាន')}
                </h3>
                <button
                  onClick={closeAttendanceModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={submittingAttendance}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">{t('teacher', 'គ្រូបង្រៀន')}:</p>
                <p className="text-base font-medium text-gray-900">{attendanceModal.teacher?.name}</p>
              </div>
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-1">{t('date', 'កាលបរិច្ឆេទ')}:</p>
                <p className="text-base font-medium text-gray-900">
                  {attendanceModal.date ? formatDateKhmer(attendanceModal.date, 'full') : ''}
                </p>
              </div>

              {/* Existing Attendance Warning */}
              {attendanceModal.existingAttendance && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    {t('attendanceAlreadyMarked', 'វត្តមានត្រូវបានបញ្ជូនរួចរាល់')}: <strong>{getStatusInKhmer(attendanceModal.existingAttendance.status)}</strong>
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">
                    {t('markingAgainWillUpdate', 'ការបញ្ជូនម្តងទៀតនឹងធ្វើបច្ចុប្បន្នភាពកំណត់ត្រា')}
                  </p>
                </div>
              )}

              {/* Status Buttons */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 mb-3">{t('selectStatus', 'ជ្រើសរើសស្ថានភាព')}:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => markAttendance('PRESENT')}
                    disabled={submittingAttendance}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Check className="h-5 w-5" />
                    <span>{t('present', 'វត្តមាន')}</span>
                  </button>
                  <button
                    onClick={() => markAttendance('LATE')}
                    disabled={submittingAttendance}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Clock className="h-5 w-5" />
                    <span>{t('late', 'យឺត')}</span>
                  </button>
                  <button
                    onClick={() => markAttendance('ABSENT')}
                    disabled={submittingAttendance}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <X className="h-5 w-5" />
                    <span>{t('absent', 'អវត្តមាន')}</span>
                  </button>
                  <button
                    onClick={() => markAttendance('LEAVE')}
                    disabled={submittingAttendance}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Calendar className="h-5 w-5" />
                    <span>{t('leave', 'ច្បាប់')}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={closeAttendanceModal}
                disabled={submittingAttendance}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {t('cancel', 'បោះបង់')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Progress Modal */}
      <ExportProgressModal
        isOpen={exportModal.isOpen}
        progress={exportModal.progress}
        status={exportModal.status}
        onComplete={() => {
          setExportModal(prev => ({ ...prev, isOpen: false }));
        }}
      />
    </PageTransition>
  );
}
