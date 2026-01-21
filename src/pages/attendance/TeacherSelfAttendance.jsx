import { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Check, Clock, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { Button } from '../../components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Dropdown from '../../components/ui/Dropdown';
import { formatDateKhmer } from '../../utils/formatters';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { classService } from '../../utils/api/services/classService';
import { teacherService } from '../../utils/api/services/teacherService';
import { isToday } from '../attendance/utils';
import { canAccessTeacherFeatures } from '../../utils/routePermissions';

/**
 * TeacherSelfAttendance Component
 * Allows teachers to mark their own attendance
 */
export default function TeacherSelfAttendance() {
  const { t, setLanguage } = useLanguage();
  // Force Khmer as the base language for this page
  useEffect(() => {
    setLanguage && setLanguage('km');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only set language once on mount

  const { showSuccess, showError } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError, retry } = useErrorHandler();

  const [monthlyAttendance, setMonthlyAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedShift, setSelectedShift] = useState('MORNING'); // MORNING or AFTERNOON

  // Class selection state
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Modal state for class/shift selection
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedShiftForSubmit, setSelectedShiftForSubmit] = useState('MORNING');
  const [selectedClassForSubmit, setSelectedClassForSubmit] = useState(null);
  const [reasonInput, setReasonInput] = useState('');

  // Check-in/Check-out state
  const [todayCheckInStatus, setTodayCheckInStatus] = useState(null); // Tracks today's check-in records by classId_shift
  const [selectedAttendanceForCheckout, setSelectedAttendanceForCheckout] = useState(null);

  // Real-time clock state
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get current month
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

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

  const userId = user?.teacherId || user?.id;
  const userLoginId = user?.id; // Use actual user ID for attendance marking
  const isTeacher = canAccessTeacherFeatures(user);

  // Fetch teacher's classes from teacherService
  const fetchTeacherClassesFromAPI = useCallback(async () => {
    if (!userId) return;

    try {
      setLoadingClasses(true);
      console.log('🔍 Fetching teacher classes for userId:', userId);
      const response = await teacherService.getTeacherClasses(userId);

      console.log('📋 Teacher classes response from teacherService:', {
        success: response.success,
        dataLength: response.data?.length,
        classesLength: response.classes?.length,
        fullResponse: response
      });

      // Use the already formatted classes from teacherService
      // teacherService.getTeacherClasses returns { success, data: [], classes: [] }
      let teacherClasses = [];
      
      if (response.success) {
        // Prefer the 'data' property (formatted classes), fallback to 'classes'
        teacherClasses = response.data || response.classes || [];
      }

      console.log('📚 Processed teacher classes:', teacherClasses);

      if (teacherClasses.length > 0) {
        console.log('✅ Fetched teacher classes from API:', teacherClasses);
        setClasses(teacherClasses);
        // Store in localStorage for next time
        localStorage.setItem('teacherClasses', JSON.stringify(teacherClasses));

        // Auto-select first class if available
        const firstClass = teacherClasses[0];
        const firstClassId = firstClass.classId || firstClass.id;
        setSelectedClassId(firstClassId);
        localStorage.setItem('currentClassId', String(firstClassId));
        console.log('✅ Auto-selected first class:', firstClassId);
      } else {
        console.warn('⚠️ No classes found for teacher:', userId);
        setClasses([]);
        // Clear localStorage if no classes
        localStorage.removeItem('teacherClasses');
        localStorage.removeItem('currentClassId');
      }
    } catch (err) {
      console.error('❌ Error fetching teacher classes from teacherService:', err);
      setClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  }, [userId, t]);

  // Load teacher's classes from localStorage (already fetched during login)
  useEffect(() => {
    if (!userId || !isTeacher) return;

    try {
      // Get classes from localStorage (set during login for roleId = 8)
      const storedClasses = localStorage.getItem('teacherClasses');
      const storedClassId = localStorage.getItem('currentClassId');

      if (storedClasses) {
        const parsedClasses = JSON.parse(storedClasses);
        setClasses(parsedClasses);
        console.log('📚 Loaded', parsedClasses.length, 'classes from localStorage');

        // Use stored class ID or default to first class
        if (storedClassId && parsedClasses.find(c => String(c.classId || c.id) === String(storedClassId))) {
          setSelectedClassId(Number(storedClassId));
          console.log('✅ Using stored class ID:', storedClassId);
        } else if (parsedClasses.length > 0) {
          const firstClassId = parsedClasses[0].classId || parsedClasses[0].id;
          setSelectedClassId(firstClassId);
          localStorage.setItem('currentClassId', String(firstClassId));
          console.log('✅ Using first class as default:', firstClassId);
        }
      } else {
        console.warn('⚠️ No classes found in localStorage, fetching from API...');
        // Fallback: fetch from API if not in localStorage
        fetchTeacherClassesFromAPI();
      }
    } catch (err) {
      console.error('Error loading classes from localStorage:', err);
      fetchTeacherClassesFromAPI();
    }
  }, [userId, isTeacher, fetchTeacherClassesFromAPI]);

  // Helper function to get date string in YYYY-MM-DD format without timezone conversion
  const getLocalDateString = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Get days in current month
  const getDaysInMonth = useCallback((date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty slots for days before first day of month
    const firstDayOfWeek = firstDay.getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days in month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, []);

  const daysInMonth = useMemo(() => getDaysInMonth(currentMonth), [currentMonth, getDaysInMonth]);

  // Fetch attendance for current month
  const fetchMonthlyAttendance = useCallback(async () => {
    if (!userLoginId) return; // Use userLoginId for attendance operations

    setLoading(true);
    clearError();

    try {
      const loadingKey = 'fetchAttendance';
      startLoading(loadingKey, t('loadingAttendance', 'Loading attendance...'));

      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();

      // Use date string formatting to avoid timezone conversion issues
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      console.log('DEBUG: Fetching attendance for:', {
        currentMonthDisplay: getLocalDateString(currentMonth),
        year,
        month: month + 1, // Display as 1-indexed
        startDate,
        endDate
      });

      // Fetch attendance for all classes (don't filter by classId)
      // This allows us to show attendance for all teacher's classes
      const response = await attendanceService.getAttendance({
        userId: userLoginId, // Use userLoginId for attendance operations
        startDate,
        endDate,
        limit: 400 // Increase limit to accommodate multiple classes
      });

      const attendanceData = {};
      if (response.success && response.data) {
        const records = Array.isArray(response.data) ? response.data : response.data.records || [];

        console.log('DEBUG: Raw backend response:', response.data);
        console.log('DEBUG: Processing records count:', records.length);

        records.forEach(record => {
          const recordDate = record.date ? record.date.split('T')[0] : null;
          const recordClassId = record.classId;

          // Determine shift based on class
          // Since classId itself determines if it's morning or afternoon class,
          // we'll infer shift from the submission time for now
          // In the future, class data should have a 'shift' field
          const recordTime = record.createdAt ? new Date(record.createdAt) : null;
          const recordHour = recordTime ? recordTime.getHours() : 12;

          // Infer shift: if submitted before 11am = morning, 11am-1pm = noon, after 1pm = afternoon
          const shift = recordHour < 11 ? 'MORNING' :
                        recordHour < 13 ? 'NOON' :
                        'AFTERNOON';

          console.log('DEBUG: Processing record:', {
            rawDate: record.date,
            extractedDate: recordDate,
            status: record.status,
            inferredShift: shift,
            classId: recordClassId,
            recordHour,
            id: record.id
          });

          if (recordDate) {
            // Initialize date entry if it doesn't exist
            if (!attendanceData[recordDate]) {
              attendanceData[recordDate] = {};
            }

            // Store attendance by class ID + shift combination
            // This allows tracking multiple classes per day, each with 2 shifts
            // If no classId (teacher without class), use 'null' as identifier
            const classIdKey = recordClassId || 'null';
            const key = `${classIdKey}_${shift}`;
            attendanceData[recordDate][key] = {
              status: record.status?.toUpperCase() || 'PRESENT',
              time: record.createdAt ? new Date(record.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              }) : null,
              id: record.id,
              createdAt: record.createdAt,
              reason: record.reason || '',
              shift: shift,
              classId: recordClassId,
              // Check-in/Check-out fields from new API
              checkInTime: record.checkInTime || null,
              checkOutTime: record.checkOutTime || null,
              hoursWorked: record.hoursWorked !== undefined ? record.hoursWorked : null,
              isCheckedOut: record.isCheckedOut === true // Explicitly check boolean value
            };
          }
        });
      }

      console.log('DEBUG: Final attendanceData object:', attendanceData);
      console.log('DEBUG: Keys in attendanceData:', Object.keys(attendanceData));

      setMonthlyAttendance(attendanceData);

      // Track today's check-in status for check-in/check-out UI
      const today = getLocalDateString();
      if (attendanceData[today]) {
        setTodayCheckInStatus(attendanceData[today]);
        console.log('✅ Today\'s check-in status:', attendanceData[today]);
      } else {
        setTodayCheckInStatus(null);
      }

      stopLoading(loadingKey);
    } catch (err) {
      console.error('Error fetching attendance:', err);
      handleError(err, {
        toastMessage: t('errorFetchingAttendance', 'Error fetching attendance data')
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [userLoginId, currentMonth, t, handleError, clearError, startLoading, stopLoading]);

  // Fetch attendance on mount and when month/userId changes
  useEffect(() => {
    if (userLoginId) {
      fetchMonthlyAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userLoginId, currentMonth]); // Re-fetch when userLoginId or currentMonth changes

  // Update current time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => clearInterval(timer); // Cleanup on unmount
  }, []);

  // Check if date is today
  const isDateToday = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);
    return today.getTime() === checkDate.getTime();
  };

  // Mark attendance for today with specific class
  const markAttendance = async (status, shift = 'MORNING', classId = null, userReason = '') => {
    if (!userLoginId) return; // Use userLoginId for attendance marking

    // Use provided classId or fall back to selectedClassId
    const targetClassId = classId || selectedClassId;

    // Validate class for teachers who have classes assigned
    if (isTeacher && classes.length > 0 && !targetClassId) {
      showError(t('pleaseSelectClass', 'សូមជ្រើសរើសថ្នាក់រៀន'));
      return;
    }

    // Validate that we're only marking attendance for today
    const today = getLocalDateString();
    if (!isDateToday(today)) {
      showError(t('canOnlyMarkTodayAttendance', 'អ្នកអាចបញ្ជូនវត្តមានតែថ្ងៃនេះប៉ុណ្ណោះ'));
      return;
    }

    // Check if attendance already submitted for this shift and class
    const todayAttendanceData = monthlyAttendance[today];
    const attendanceKey = `${targetClassId}_${shift}`;
    if (todayAttendanceData && todayAttendanceData[attendanceKey]) {
      const className = classes.find(c => (c.classId || c.id) === targetClassId)?.name || 'this class';
      showError(shift === 'MORNING'
        ? t('alreadySubmittedMorningForClass', `អ្នកបានបញ្ជូនវត្តមានព្រឹកសម្រាប់ថ្នាក់នេះរួចហើយ`)
        : t('alreadySubmittedAfternoonForClass', `អ្នកបានបញ្ជូនវត្តមានរសៀលសម្រាប់ថ្នាក់នេះរួចហើយ`));
      return;
    }

    try {
      setSubmitting(true);
      startLoading('markAttendance', t('submittingAttendance', 'Submitting attendance...'));

      // Double-check the date before sending to API
      const requestDate = getLocalDateString();
      if (!isDateToday(requestDate)) {
        showError(t('canOnlyMarkTodayAttendance', 'អ្នកអាចបញ្ជូនវត្តមានតែថ្ងៃនេះប៉ុណ្ណោះ'));
        setSubmitting(false);
        stopLoading('markAttendance');
        return;
      }

      // Get the class to determine if it's a morning or afternoon class
      const selectedClass = classes.find(c => (c.classId || c.id) === targetClassId);

      // Auto-determine status based on submission time and shift
      // The shift is based on the class schedule (morning or afternoon class)
      let finalStatus = status;
      if (status === 'PRESENT' || status === 'LATE') {
        const now = new Date();
        const currentHour = now.getHours();

        if (shift === 'MORNING') {
          // Morning shift: Late if submitted at or after 7:00 AM
          finalStatus = currentHour >= 7 ? 'LATE' : 'PRESENT';
        } else if (shift === 'NOON') {
          // Noon shift: Late if submitted at or after 11:00 AM
          finalStatus = currentHour >= 11 ? 'LATE' : 'PRESENT';
        } else if (shift === 'AFTERNOON') {
          // Afternoon shift: Late if submitted at or after 1:00 PM (13:00)
          finalStatus = currentHour >= 13 ? 'LATE' : 'PRESENT';
        }
      }
      // For LEAVE status, keep it as is

      // Build attendance payload with check-in timestamp (except for LEAVE status)
      const attendancePayload = {
        userId: userLoginId, // Use userLoginId for attendance marking
        date: requestDate,
        status: finalStatus,
        reason: userReason.trim(), // User's own reason
        classId: targetClassId || null // classId is optional (null if not provided)
      };

      // Only add checkInTime if status is not LEAVE
      if (finalStatus !== 'LEAVE') {
        attendancePayload.checkInTime = new Date().toISOString();
      }

      console.log('✅ Attendance payload:', attendancePayload);

      const attendanceResponse = await attendanceService.createAttendance(attendancePayload);

      showSuccess(t('attendanceMarkedSuccess', 'វត្តមានត្រូវបានបញ្ជូនដោយជោគជ័យ'));

      // If attendance requires approval, notify director
      if (attendanceResponse?.approvalStatus === 'PENDING') {
        // This will be handled by the NotificationContext polling
        showSuccess(t('awaitingApproval', 'Your attendance is awaiting director approval'));
      }

      fetchMonthlyAttendance();
    } catch (error) {
      console.error('Error marking attendance:', error);

      // Check if error is related to date validation
      const errorMessage = error?.response?.data?.message || error?.message || '';
      if (errorMessage.includes('date') || errorMessage.includes('past') || errorMessage.includes('future')) {
        showError(t('canOnlyMarkTodayAttendance', 'អ្នកអាចបញ្ជូនវត្តមានតែថ្ងៃនេះប៉ុណ្ណោះ'));
      } else {
        showError(t('failedToMarkAttendance', 'បរាជ័យក្នុងការបញ្ជូនវត្តមាន'));
      }
    } finally {
      setSubmitting(false);
      stopLoading('markAttendance');
    }
  };

  // Check-out function for existing attendance
  const checkOutAttendance = async (attendanceId, classId = null, shift = 'MORNING') => {
    if (!userLoginId || !attendanceId) return; // Use userLoginId for attendance operations

    try {
      setSubmitting(true);
      startLoading('checkOutAttendance', t('checkingOut', 'កំពុងចុះវត្តមាន...'));

      // Build check-out payload with current timestamp
      const checkOutPayload = {
        checkOutTime: new Date().toISOString()
      };

      console.log('✅ Check-out payload:', { attendanceId, ...checkOutPayload });

      const response = await attendanceService.updateAttendance(attendanceId, checkOutPayload);

      if (response) {
        showSuccess(t('checkOutSuccess', 'ចុះវត្តមានដោយជោគជ័យ'));

        // Update local state immediately
        const today = getLocalDateString();
        const targetClassId = classId || selectedClassId;
        const key = `${targetClassId}_${shift}`;
        const checkOutTimeStamp = new Date().toISOString();

        console.log('✅ Checkout response:', response);
        console.log('✅ Updating state for key:', key, 'on date:', today);

        // Update monthlyAttendance state immediately for instant UI update
        setMonthlyAttendance(prev => {
          if (!prev[today] || !prev[today][key]) {
            console.log('⚠️ Cannot find attendance record to update:', { today, key, hasToday: !!prev[today] });
            return prev;
          }

          const updated = {
            ...prev,
            [today]: {
              ...prev[today],
              [key]: {
                ...prev[today][key],
                checkOutTime: checkOutTimeStamp,
                isCheckedOut: true,
                hoursWorked: response.hoursWorked || response.data?.hoursWorked || prev[today][key].hoursWorked
              }
            }
          };

          console.log('✅ Updated monthlyAttendance:', updated[today][key]);
          return updated;
        });

        // Also update todayCheckInStatus
        setTodayCheckInStatus(prev => {
          if (!prev || !prev[key]) {
            console.log('⚠️ Cannot find todayCheckInStatus to update:', { key, hasPrev: !!prev });
            return prev;
          }

          const updated = {
            ...prev,
            [key]: {
              ...prev[key],
              checkOutTime: checkOutTimeStamp,
              isCheckedOut: true,
              hoursWorked: response.hoursWorked || response.data?.hoursWorked || prev[key].hoursWorked
            }
          };

          console.log('✅ Updated todayCheckInStatus:', updated[key]);
          return updated;
        });

        console.log('✅ Updated local state after checkout, refreshing data...');

        // Refresh attendance data to get server values
        fetchMonthlyAttendance();
      } else {
        showError(t('checkOutFailed', 'បរាជ័យក្នុងការចុះវត្តមាន'));
      }
    } catch (error) {
      console.error('Error checking out:', error);
      showError(t('checkOutFailed', 'បរាជ័យក្នុងការចុះវត្តមាន'));
    } finally {
      setSubmitting(false);
      stopLoading('checkOutAttendance');
    }
  };

  // Navigate months
  const goToPreviousMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() - 1);
    setCurrentMonth(newMonth);
  };

  const goToNextMonth = () => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + 1);
    setCurrentMonth(newMonth);
  };

  const goToCurrentMonth = () => {
    setCurrentMonth(new Date());
  };

  // Get attendance for a specific date (now checks all classes)
  const getAttendanceForDate = (date) => {
    if (!date) return null;
    // Use helper function to avoid timezone issues
    const dateStr = getLocalDateString(date);
    const dayAttendance = monthlyAttendance[dateStr];

    if (!dayAttendance) return null;

    // Aggregate all attendance records for this date across all classes
    const morningRecords = [];
    const noonRecords = [];
    const afternoonRecords = [];

    Object.entries(dayAttendance).forEach(([key, attendance]) => {
      const [classIdStr, shift] = key.split('_');
      if (shift === 'MORNING') {
        morningRecords.push(attendance);
      } else if (shift === 'NOON') {
        noonRecords.push(attendance);
      } else if (shift === 'AFTERNOON') {
        afternoonRecords.push(attendance);
      }
    });

    // Return aggregated attendance info
    return {
      morning: morningRecords.length > 0 ? morningRecords[morningRecords.length - 1] : null, // Use last for display
      noon: noonRecords.length > 0 ? noonRecords[noonRecords.length - 1] : null,
      afternoon: afternoonRecords.length > 0 ? afternoonRecords[afternoonRecords.length - 1] : null,
      morningCount: morningRecords.length,
      noonCount: noonRecords.length,
      afternoonCount: afternoonRecords.length,
      // For backward compatibility, return primary status
      status: morningRecords[morningRecords.length - 1]?.status || noonRecords[noonRecords.length - 1]?.status || afternoonRecords[afternoonRecords.length - 1]?.status,
      hasBothShifts: morningRecords.length > 0 && afternoonRecords.length > 0,
      allRecords: { morning: morningRecords, noon: noonRecords, afternoon: afternoonRecords }
    };
  };

  // Check if date is weekend
  const isWeekend = (date) => {
    if (!date) return false;
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  // Check if date is in the future
  const isFuture = (date) => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date > today;
  };

  // Check if user is teacher, director, or restricted roles (roleId = 8 for teacher, roleId = 14 for director, roleId 15-21 for restricted roles)
  const isDirector = user?.roleId === 14;
  const isRestrictedRole = user?.roleId >= 15 && user?.roleId <= 21;
  const isTeacherOrDirector = isTeacher || isDirector || isRestrictedRole;

  // Helper function to translate attendance status to Khmer
  const getStatusInKhmer = (status) => {
    const statusMap = {
      'PRESENT': t('present', 'វត្តមាន'),
      'ABSENT': t('absent', 'អវត្តមាន'),
      'LATE': t('late', 'យឺត'),
      'LEAVE': t('leave', 'ច្បាប់')
    };
    return statusMap[status?.toUpperCase()] || status;
  };

  // Helper function to get badge color for attendance status
  const getStatusBadgeColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PRESENT':
        return 'green';
      case 'LATE':
        return 'orange';
      case 'LEAVE':
        return 'purple';
      default:
        return 'gray';
    }
  };

  if (!isTeacherOrDirector) {
    return (
      <div className="p-4">
        <ErrorDisplay
          error={{ message: t('accessDenied', 'Access denied. This page is only accessible by teachers and directors.') }}
          onRetry={() => window.history.back()}
          retryText={t('goBack', 'Go Back')}
        />
      </div>
    );
  }

  // Initial loading state
  if (initialLoading || loadingClasses) {
    return (
      <PageLoader
        message={t('loadingAttendance', 'Loading attendance...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }


  // Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => retry(fetchMonthlyAttendance)}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  const todayStr = getLocalDateString();
  const todayAttendanceData = monthlyAttendance[todayStr] || {};

  console.log('DEBUG: Pre-render state:', {
    todayStr,
    todayAttendanceData,
    monthlyAttendanceKeys: Object.keys(monthlyAttendance),
    monthlyAttendanceCount: Object.keys(monthlyAttendance).length
  });

  // Check if current viewing month is the current month
  const isCurrentMonth = currentMonth.getMonth() === new Date().getMonth() &&
    currentMonth.getFullYear() === new Date().getFullYear();

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const isBeforeMorningCutoff = currentHour < 7;
  const isBeforeNoonCutoff = currentHour < 11;
  const isBeforeAfternoonCutoff = currentHour < 13;

  // Helper function to check if attendance is submitted for a specific class and shift
  const isAttendanceSubmitted = (classId, shift) => {
    const key = `${classId}_${shift}`;
    return todayAttendanceData && todayAttendanceData[key];
  };

  // Helper function to get attendance for a specific class and shift
  const getAttendanceForClassShift = (classId, shift) => {
    const key = `${classId}_${shift}`;
    return todayAttendanceData[key] || null;
  };

  // Helper function to determine if current time is late for a shift
  const isLateForShift = (shift) => {
    if (shift === 'MORNING') {
      return currentHour >= 7;
    } else if (shift === 'NOON') {
      return currentHour >= 11;
    } else if (shift === 'AFTERNOON') {
      return currentHour >= 13;
    }
    return false;
  };

  // Get current time display with real-time seconds
  const getCurrentTimeDisplay = () => {
    return currentTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Open submit modal
  const openSubmitModal = () => {
    console.log('🔓 Opening submit modal with current state:', {
      classes: classes,
      classesLength: classes.length,
      selectedClassId,
      currentHour
    });

    // Always fetch fresh classes when opening modal to ensure we have current data
    fetchTeacherClassesFromAPI().then(() => {
      // Auto-detect current shift based on time
      const autoShift = currentHour < 11 ? 'MORNING' :
                        currentHour < 13 ? 'NOON' :
                        'AFTERNOON';
      setSelectedShiftForSubmit(autoShift);

      // Auto-select first class from teacher's classes
      if (classes.length > 0) {
        const firstClass = classes[0];
        const firstClassId = firstClass.classId || firstClass.id;
        setSelectedClassForSubmit(firstClassId);
        console.log('✅ Auto-selected class for modal:', {
          firstClass,
          firstClassId,
          className: firstClass.name
        });
      } else {
        console.warn('⚠️ No classes available for teacher to select');
        setSelectedClassForSubmit(null);
      }

      setShowSubmitModal(true);
    });
  };

  // Handle submit from modal
  const handleSubmitFromModal = async (status = 'PRESENT') => {
    // Validate shift is selected
    if (!selectedShiftForSubmit) {
      showError(t('pleaseSelectShift', 'សូមជ្រើសរើសវេន'));
      return;
    }

    // Validate class for teachers with classes only
    if (isTeacher && classes.length > 0 && !selectedClassForSubmit) {
      showError(t('pleaseSelectClass', 'សូមជ្រើសរើសថ្នាក់រៀន'));
      return;
    }

    await markAttendance(status, selectedShiftForSubmit, selectedClassForSubmit, reasonInput);
    setShowSubmitModal(false);
    setReasonInput(''); // Clear reason after submit
  };

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50 p-3 sm:p-4">
      <div className="p-4 sm:p-6">
        {/* Header - Full Width */}
        <FadeInSection className="mb-6 mx-auto">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {t('myAttendance') || 'វត្តមានរបស់ខ្ញុំ'}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {t('teacherAttendanceSubtitle', 'កត់ត្រាវត្តមានរបស់លោកគ្រូ/អ្នកគ្រូ')}
              </p>
            </div>
            {!isCurrentMonth && (
              <Button onClick={goToCurrentMonth} variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                {t('today', 'ថ្ងៃនេះ')}
              </Button>
            )}
          </div>
        </FadeInSection>

        {/* Full Width Layout */}
        <FadeInSection className="mx-auto grid grid-cols-1 sm:grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4">
          <div className='grid grid-cols-1 gap-4'>
            {/* Quick Submit Section */}
            {isCurrentMonth && (
              <>
                {/* Current Time Display */}
                <div className="rounded-md border bg-white border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm text-gray-600">{t('currentTime', 'ពេលវេលាបច្ចុប្បន្ន')}</p>
                      <p className="text-2xl font-bold text-gray-900">{getCurrentTimeDisplay()}</p>
                    </div>
                    {/* Check-in/Check-out Button */}
                    <Button
                      onClick={openSubmitModal}
                      disabled={submitting}
                      size="sm"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {t('checkIn', 'ចូលវត្តមាន')}
                    </Button>
                  </div>

                  {/* Late Status Indicator */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className={`p-3 rounded-md ${isBeforeMorningCutoff ? 'bg-green-50 border border-green-300' : 'bg-orange-50 border border-orange-300'}`}>
                      <p className="text-xs font-medium text-gray-700">{t('morningShift', 'វេនព្រឹក')}</p>
                      <Badge color={isBeforeMorningCutoff ? 'green' : 'orange'} variant="outline" size="sm" className="mt-1">
                        {isBeforeMorningCutoff ? t('onTime', 'ទាន់ម៉ោង') : t('late', 'យឺត')}
                      </Badge>
                      <p className="text-xs text-gray-600 mt-2">
                        {isBeforeMorningCutoff ? 'មុន' : 'ក្រោយ'} {'7:00 AM'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-md ${isBeforeNoonCutoff ? 'bg-green-50 border border-green-300' : 'bg-orange-50 border border-orange-300'}`}>
                      <p className="text-xs font-medium text-gray-700">{t('noonShift', 'វេនថ្ងៃត្រង់')}</p>
                      <Badge color={isBeforeNoonCutoff ? 'green' : 'orange'} variant="outline" size="sm" className="mt-1">
                        {isBeforeNoonCutoff ? t('onTime', 'ទាន់ម៉ោង') : t('late', 'យឺត')}
                      </Badge>
                      <p className="text-xs text-gray-600 mt-2">
                        {isBeforeNoonCutoff ? 'មុន' : 'ក្រោយ'} {'11:00 AM'}
                      </p>
                    </div>
                    <div className={`p-3 rounded-md ${isBeforeAfternoonCutoff ? 'bg-green-50 border border-green-300' : 'bg-orange-50 border border-orange-300'}`}>
                      <p className="text-xs font-medium text-gray-700">{t('afternoonShift', 'វេនរសៀល')}</p>
                      <Badge color={isBeforeAfternoonCutoff ? 'green' : 'orange'} variant="outline" size="sm" className="mt-1">
                        {isBeforeAfternoonCutoff ? t('onTime', 'ទាន់ម៉ោង') : t('late', 'យឺត')}
                      </Badge>
                      <p className="text-xs text-gray-600 mt-2">
                        {isBeforeAfternoonCutoff ? 'មុន' : 'ក្រោយ'} {'1:00 PM'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Today's Check-in/Check-out Status - 2 Cards Per Row */}
                <div className="bg-white rounded-md border border-gray-200 p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    {t('todayStatus', 'ស្ថានភាពថ្ងៃនេះ')}
                  </h4>
                  {Object.keys(todayAttendanceData).length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(todayAttendanceData).map(([key, attendance]) => {
                        const [classIdStr, shift] = key.split('_');
                        const classId = classIdStr === 'null' ? null : Number(classIdStr);
                        const cls = classId ? classes.find(c => (c.classId || c.id) === classId) : null;
                        const className = cls?.name || (classId ? `${t('class', 'ថ្នាក់')} ${classId}` : t('personalAttendance', 'វត្តមានផ្ទាល់ខ្លួន'));

                        const checkInTime = attendance.checkInTime ? new Date(attendance.checkInTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        }) : attendance.time;

                        const checkOutTime = attendance.checkOutTime ? new Date(attendance.checkOutTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        }) : null;

                        // Debug log
                        console.log('🔍 Rendering attendance card:', {
                          key,
                          className,
                          isCheckedOut: attendance.isCheckedOut,
                          isCheckedOutType: typeof attendance.isCheckedOut,
                          checkOutTime,
                          hoursWorked: attendance.hoursWorked
                        });

                        return (
                          <div key={key} className="border border-gray-200 rounded-md p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900">{className}</p>
                              </div>
                              <Badge color={getStatusBadgeColor(attendance.status)} variant="filled" size="xs">
                                {getStatusInKhmer(attendance.status)}
                              </Badge>
                            </div>

                            {/* Check-in/Check-out section - Only show for non-LEAVE status */}
                            {attendance.status !== 'LEAVE' ? (
                              <>
                                {/* Check-in Time */}
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-gray-500">{t('checkIn', 'ចូល')}:</span>
                                  <span className="font-medium text-green-600">{checkInTime}</span>
                                </div>

                                {/* Check-out Time or Button */}
                                <div className='flex justify-between items-center w-full'>
                                  {attendance.isCheckedOut === true ? (
                                    <>
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="text-gray-500">{t('checkOut', 'ចេញ')}:</span>
                                        <span className="font-medium text-blue-600">{checkOutTime || t('completed', 'បានបញ្ចប់')}</span>
                                      </div>
                                      {attendance.hoursWorked !== null && attendance.hoursWorked !== undefined && (
                                        <div className="flex items-center gap-2 text-xs">
                                          <span className="text-gray-500">{t('hoursWorked', 'ម៉ោងធ្វើការ')}:</span>
                                          <span className="font-semibold text-indigo-600">{attendance.hoursWorked.toFixed(2)} {t('hours', 'ម៉ោង')}</span>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <Button
                                      onClick={() => checkOutAttendance(attendance.id, classId, shift)}
                                      disabled={submitting}
                                      size="xs"
                                      variant="success"
                                    >
                                      <Check className="h-3 w-3 mr-1" />
                                      {t('checkOut', 'ចេញវត្តមាន')}
                                    </Button>
                                  )}
                                </div>
                              </>
                            ) : (
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500">{t('submittedAt', 'បានបញ្ជូននៅ')}:</span>
                                <span className="font-medium text-purple-600">{checkInTime}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      {t('noCheckInsToday', 'មិនទាន់មានការចូលវត្តមានថ្ងៃនេះ')}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Calendar Section - Full Width */}
          <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
            {/* Calendar Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <button
                  onClick={goToPreviousMonth}
                  disabled={loading}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                >
                  <ChevronLeft className="h-5 w-5 text-gray-600" />
                </button>
                <h3 className="text-base font-medium text-gray-900">
                  {formatDateKhmer(currentMonth, 'monthYear')}
                </h3>
                <button
                  onClick={goToNextMonth}
                  disabled={loading}
                  className="p-2 hover:bg-gray-100 rounded-md transition-colors disabled:opacity-50"
                >
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center p-12">
                <DynamicLoader
                  type="spinner"
                  size="lg"
                  variant="primary"
                  message={t('loadingAttendance', 'កំពុងផ្ទុក...')}
                />
              </div>
            ) : (
              <div className="p-6">
                {/* Day headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['អាទិត្យ', 'ច័ន្ទ', 'អង្គារ', 'ពុធ', 'ព្រហស្បតិ៍', 'សុក្រ', 'សៅរ៍'].map((day, idx) => (
                    <div
                      key={idx}
                      className={`text-center text-xs font-medium py-2 ${idx === 0 || idx === 6 ? 'text-red-600' : 'text-gray-700'
                        }`}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-2">
                  {daysInMonth.map((date, idx) => {
                    if (!date) {
                      return <div key={`empty-${idx}`} className="aspect-square" />;
                    }

                    const attendance = getAttendanceForDate(date);
                    const isWeekendDay = isWeekend(date);
                    const isCurrentDay = isToday(date);
                    const isFutureDay = isFuture(date);

                    let bgColor = 'bg-white hover:bg-gray-50';
                    let textColor = 'text-gray-900';
                    let borderColor = 'border-gray-200';

                    if (isCurrentDay) {
                      bgColor = 'bg-blue-50';
                      borderColor = 'border-blue-500';
                      textColor = 'text-blue-900';
                    } else if (isWeekendDay) {
                      textColor = 'text-red-600';
                    }

                    // Determine colors based on attendance
                    const hasMorning = attendance?.morning;
                    const hasNoon = attendance?.noon;
                    const hasAfternoon = attendance?.afternoon;
                    const shiftsCount = (hasMorning ? 1 : 0) + (hasNoon ? 1 : 0) + (hasAfternoon ? 1 : 0);

                    if (hasMorning || hasNoon || hasAfternoon) {
                      // If all 3 shifts present - show full day color
                      if (shiftsCount === 3) {
                        bgColor = 'bg-gradient-to-br from-green-50 via-yellow-50 to-blue-50 hover:from-green-100 hover:via-yellow-100 hover:to-blue-100';
                        borderColor = 'border-green-500';
                      } else if (shiftsCount === 2) {
                        // Two shifts - determine which ones
                        if (hasMorning && hasNoon) {
                          bgColor = 'bg-gradient-to-br from-green-50 to-yellow-50 hover:from-green-100 hover:to-yellow-100';
                          borderColor = 'border-green-500';
                        } else if (hasMorning && hasAfternoon) {
                          bgColor = 'bg-gradient-to-br from-green-50 to-blue-50 hover:from-green-100 hover:to-blue-100';
                          borderColor = 'border-green-500';
                        } else if (hasNoon && hasAfternoon) {
                          bgColor = 'bg-gradient-to-br from-yellow-50 to-blue-50 hover:from-yellow-100 hover:to-blue-100';
                          borderColor = 'border-yellow-500';
                        }
                      } else if (hasMorning) {
                        // Only morning
                        const status = hasMorning.status;
                        switch (status) {
                          case 'PRESENT':
                            bgColor = 'bg-green-50 hover:bg-green-100';
                            borderColor = 'border-green-500';
                            break;
                          case 'LATE':
                            bgColor = 'bg-orange-50 hover:bg-orange-100';
                            borderColor = 'border-orange-500';
                            break;
                          case 'LEAVE':
                            bgColor = 'bg-purple-50 hover:bg-purple-100';
                            borderColor = 'border-purple-500';
                            break;
                        }
                      } else if (hasNoon) {
                        // Only noon
                        const status = hasNoon.status;
                        switch (status) {
                          case 'PRESENT':
                            bgColor = 'bg-yellow-50 hover:bg-yellow-100';
                            borderColor = 'border-yellow-500';
                            break;
                          case 'LATE':
                            bgColor = 'bg-amber-50 hover:bg-amber-100';
                            borderColor = 'border-amber-500';
                            break;
                          case 'LEAVE':
                            bgColor = 'bg-yellow-100 hover:bg-yellow-200';
                            borderColor = 'border-yellow-600';
                            break;
                        }
                      } else if (hasAfternoon) {
                        // Only afternoon
                        const status = hasAfternoon.status;
                        switch (status) {
                          case 'PRESENT':
                            bgColor = 'bg-blue-50 hover:bg-blue-100';
                            borderColor = 'border-blue-500';
                            break;
                          case 'LATE':
                            bgColor = 'bg-amber-50 hover:bg-amber-100';
                            borderColor = 'border-amber-500';
                            break;
                          case 'LEAVE':
                            bgColor = 'bg-indigo-50 hover:bg-indigo-100';
                            borderColor = 'border-indigo-500';
                            break;
                        }
                      }
                    }

                    const cellContent = (
                      <div className="flex flex-col items-center justify-center h-full p-1">
                        <span className={`text-sm font-medium ${textColor}`}>
                          {date.getDate()}
                        </span>
                        {(hasMorning || hasNoon || hasAfternoon) && (
                          <div className="flex gap-0.5 mt-0.5">
                            {hasMorning && (
                              <div className={`w-1 h-1 rounded-full ${hasMorning.status === 'PRESENT' ? 'bg-green-500' :
                                hasMorning.status === 'LATE' ? 'bg-orange-500' :
                                  hasMorning.status === 'LEAVE' ? 'bg-purple-500' : 'bg-gray-400'
                                }`} />
                            )}
                            {hasNoon && (
                              <div className={`w-1 h-1 rounded-full ${hasNoon.status === 'PRESENT' ? 'bg-yellow-500' :
                                hasNoon.status === 'LATE' ? 'bg-amber-500' :
                                  hasNoon.status === 'LEAVE' ? 'bg-yellow-600' : 'bg-gray-400'
                                }`} />
                            )}
                            {hasAfternoon && (
                              <div className={`w-1 h-1 rounded-full ${hasAfternoon.status === 'PRESENT' ? 'bg-blue-500' :
                                hasAfternoon.status === 'LATE' ? 'bg-amber-500' :
                                  hasAfternoon.status === 'LEAVE' ? 'bg-indigo-500' : 'bg-gray-400'
                                }`} />
                            )}
                          </div>
                        )}
                      </div>
                    );

                    return (
                      <div key={idx}>
                        {(hasMorning || hasNoon || hasAfternoon) ? (
                          <Tooltip
                            content={
                              <div className="text-xs space-y-1 max-w-xs">
                                {attendance.allRecords.morning.length > 0 && (
                                  <div className="space-y-1">
                                    {attendance.allRecords.morning.map((record, idx) => {
                                      const classId = record.classId;
                                      const cls = classId ? classes.find(c => (c.classId || c.id) === classId) : null;
                                      const className = cls?.name || (classId ? `Class ${classId}` : null);
                                      return (
                                        <div key={idx} className="py-0.5">
                                          <div className="text-gray-900 font-medium">
                                            {className ? `${className} - ${getStatusInKhmer(record.status)}` : getStatusInKhmer(record.status)}
                                          </div>
                                          <div className="text-gray-700 text-xs">
                                            ចូល: {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                                            {record.isCheckedOut ? ` | ចេញ: ${new Date(record.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` : ' | ឥឡូវនៅ'}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {attendance.allRecords.noon.length > 0 && (
                                  <div className="space-y-1">
                                    {attendance.allRecords.noon.map((record, idx) => {
                                      const classId = record.classId;
                                      const cls = classId ? classes.find(c => (c.classId || c.id) === classId) : null;
                                      const className = cls?.name || (classId ? `Class ${classId}` : null);
                                      return (
                                        <div key={idx} className="py-0.5">
                                          <div className="text-gray-900 font-medium">
                                            {className ? `${className} - ${getStatusInKhmer(record.status)}` : getStatusInKhmer(record.status)}
                                          </div>
                                          <div className="text-gray-700 text-xs">
                                            ចូល: {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                                            {record.isCheckedOut ? ` | ចេញ: ${new Date(record.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` : ' | ឥឡូវនៅ'}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}

                                {attendance.allRecords.afternoon.length > 0 && (
                                  <div className="space-y-1">
                                    {attendance.allRecords.afternoon.map((record, idx) => {
                                      const classId = record.classId;
                                      const cls = classId ? classes.find(c => (c.classId || c.id) === classId) : null;
                                      const className = cls?.name || (classId ? `Class ${classId}` : null);
                                      return (
                                        <div key={idx} className="py-0.5">
                                          <div className="text-gray-900 font-medium">
                                            {className ? `${className} - ${getStatusInKhmer(record.status)}` : getStatusInKhmer(record.status)}
                                          </div>
                                          <div className="text-gray-700 text-xs">
                                            ចូល: {record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                                            {record.isCheckedOut ? ` | ចេញ: ${new Date(record.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}` : ' | ឥឡូវនៅ'}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            }
                          >
                            <div
                              className={`aspect-square border rounded-md ${bgColor} ${borderColor} ${isFutureDay ? 'opacity-40' : ''
                                } transition-colors cursor-pointer`}
                            >
                              {cellContent}
                            </div>
                          </Tooltip>
                        ) : (
                          <div
                            className={`aspect-square border rounded-md ${bgColor} ${borderColor} ${isFutureDay ? 'opacity-40' : ''
                              } transition-colors`}
                          >
                            {cellContent}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </FadeInSection>

        {/* Submit Attendance Modal */}
        <Modal
          isOpen={showSubmitModal}
          onClose={() => setShowSubmitModal(false)}
          title={t('submitAttendance', 'បញ្ជូនវត្តមាន')}
          size="xl"
          className="!w-[90vw] sm:!w-[700px]"
          footer={
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
              <Button
                onClick={() => handleSubmitFromModal('LEAVE')}
                disabled={submitting || (isTeacher && classes.length > 0 && !selectedClassForSubmit)}
                variant="outline"
                className="w-full sm:w-auto"
              >
                <Calendar className="h-4 w-4 mr-2" />
                {t('leave', 'ច្បាប់')}
              </Button>
              <Button
                onClick={() => handleSubmitFromModal('PRESENT')}
                disabled={submitting || (isTeacher && classes.length > 0 && !selectedClassForSubmit)}
                className={`w-full sm:w-auto ${isLateForShift(selectedShiftForSubmit)
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                <Check className="h-4 w-4 mr-2" />
                {t('submit', 'បញ្ជូន')}
              </Button>
            </div>
          }
          stickyFooter={true}
        >
          {/* Current Time Info */}
          <div className="mb-4 p-3 bg-blue-50 rounded-md">
            <p className="text-sm font-semibold text-gray-700">
              {t('currentTime', 'ពេលវេលាបច្ចុប្បន្ន')}: <strong className='font-medium'>{getCurrentTimeDisplay()}</strong>
            </p>
          </div>

          {/* Class Selection - Only for Teachers (roleId = 8) */}
          {isTeacher && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('selectClass', 'ជ្រើសរើសថ្នាក់')} <span className='text-red-500'>*</span>
              </label>
              <Dropdown
                value={selectedClassForSubmit?.toString() || ''}
                onValueChange={(value) => {
                  console.log('🎯 Class selected in modal:', value);
                  setSelectedClassForSubmit(Number(value));
                }}
                options={classes.map((cls) => {
                  const classId = cls.classId || cls.id;
                  const className = cls.name || `${t('grade', 'ថ្នាក់ទី')} ${cls.gradeLevel} ${cls.section || ''}`;
                  console.log('🏫 Mapping class option:', { classId, className, cls });
                  return {
                    value: classId.toString(),
                    label: className
                  };
                })}
                placeholder={classes.length === 0 ? t('noClassesAvailable', 'No classes available') : t('selectClass', 'ជ្រើសរើសថ្នាក់')}
                width="w-full"
                disabled={classes.length === 0}
              />
              {classes.length === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  {t('noClassesAssigned', 'No classes assigned to you. Please contact administrator.')}
                </p>
              )}
            </div>
          )}

          {/* Shift Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('selectShift', 'ជ្រើសរើសវេន')} <span className='text-red-500'>*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setSelectedShiftForSubmit('MORNING')}
                className={`p-3 rounded-md border-2 transition-all ${selectedShiftForSubmit === 'MORNING'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
              >
                <p className="font-medium text-gray-900">{t('morning', 'ព្រឹក')}</p>
                <p className="text-xs text-gray-600">{isBeforeMorningCutoff ? 'មុន' : 'ក្រោយ'} 7:00 AM</p>
                <Badge color={isBeforeMorningCutoff ? 'green' : 'orange'} variant="filled" size="sm" className="mt-2">
                  {isBeforeMorningCutoff ? t('onTime', 'ទាន់ម៉ោង') : t('late', 'យឺត')}
                </Badge>
              </button>
              <button
                onClick={() => setSelectedShiftForSubmit('NOON')}
                className={`p-3 rounded-md border-2 transition-all ${selectedShiftForSubmit === 'NOON'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
              >
                <p className="font-medium text-gray-900">{t('noon', 'ថ្ងៃត្រង់')}</p>
                <p className="text-xs text-gray-600">{isBeforeNoonCutoff ? 'មុន' : 'ក្រោយ'} 11:00 AM</p>
                <Badge color={isBeforeNoonCutoff ? 'green' : 'orange'} variant="filled" size="sm" className="mt-2">
                  {isBeforeNoonCutoff ? t('onTime', 'ទាន់ម៉ោង') : t('late', 'យឺត')}
                </Badge>
              </button>
              <button
                onClick={() => setSelectedShiftForSubmit('AFTERNOON')}
                className={`p-3 rounded-md border-2 transition-all ${selectedShiftForSubmit === 'AFTERNOON'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
              >
                <p className="font-medium text-gray-900">{t('afternoon', 'រសៀល')}</p>
                <p className="text-xs text-gray-600">{isBeforeAfternoonCutoff ? 'មុន' : 'ក្រោយ'} 1:00 PM</p>
                <Badge color={isBeforeAfternoonCutoff ? 'green' : 'orange'} variant="filled" size="sm" className="mt-2">
                  {isBeforeAfternoonCutoff ? t('onTime', 'ទាន់ម៉ោង') : t('late', 'យឺត')}
                </Badge>
              </button>
            </div>
          </div>

          {/* Status Warning */}
          <div className={`p-3 rounded-md mb-4 ${isLateForShift(selectedShiftForSubmit)
            ? 'bg-orange-50 border border-orange-200'
            : 'bg-green-50 border border-green-200'
            }`}>
            <p className="text-sm font-medium">
              {isLateForShift(selectedShiftForSubmit)
                ? t('willBeMarkedLate', 'ប្រព័ន្ធនឹងកត់ត្រាថាអ្នកចុះវត្តមានយឺត')
                : t('willBeMarkedPresent', 'ប្រព័ន្ធនឹងកត់ត្រាថាអ្នកចុះវត្តមានទាន់')}
            </p>
          </div>

          {/* Reason Input (Optional) */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('reason', 'មូលហេតុ')} <span className="text-gray-400 text-xs">({t('optional', 'ជម្រើស')})</span>
            </label>
            <textarea
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              placeholder={t('enterReasonPlaceholder', 'បញ្ចូលមូលហេតុ (ប្រសិនបើមាន)...')}
              rows={3}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
          </div>
        </Modal>
      </div>
    </PageTransition>
  );
}
