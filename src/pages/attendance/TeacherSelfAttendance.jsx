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
import AttendanceSummary from '../../components/attendance/AttendanceSummary';
import { formatDateKhmer } from '../../utils/formatters';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { isToday } from '../attendance/utils';

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

  const userId = user?.id;
  const isTeacher = user?.roleId === 8;

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
    if (!userId) return;

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

      const response = await attendanceService.getAttendance({
        userId,
        startDate,
        endDate,
        limit: 100
      });

      const attendanceData = {};
      if (response.success && response.data) {
        const records = Array.isArray(response.data) ? response.data : response.data.records || [];

        console.log('DEBUG: Raw backend response:', response.data);
        console.log('DEBUG: Processing records count:', records.length);

        records.forEach(record => {
          const recordDate = record.date ? record.date.split('T')[0] : null;
          console.log('DEBUG: Processing record:', {
            rawDate: record.date,
            extractedDate: recordDate,
            status: record.status,
            id: record.id
          });
          if (recordDate) {
            attendanceData[recordDate] = {
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
          }
        });
      }

      console.log('DEBUG: Final attendanceData object:', attendanceData);
      console.log('DEBUG: Keys in attendanceData:', Object.keys(attendanceData));

      setMonthlyAttendance(attendanceData);
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
  }, [userId, currentMonth, t, handleError, clearError, startLoading, stopLoading]);

  // Fetch attendance on mount and when month/userId changes
  useEffect(() => {
    if (userId) {
      fetchMonthlyAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, currentMonth]); // Re-fetch when userId or currentMonth changes

  // Check if date is today
  const isDateToday = (dateStr) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(dateStr);
    checkDate.setHours(0, 0, 0, 0);
    return today.getTime() === checkDate.getTime();
  };

  // Mark attendance for today
  const markAttendance = async (status, reason = '') => {
    if (!userId) return;

    // Validate that we're only marking attendance for today
    const today = getLocalDateString();
    if (!isDateToday(today)) {
      showError(t('canOnlyMarkTodayAttendance', 'អ្នកអាចបញ្ជូនវត្តមានតែថ្ងៃនេះប៉ុណ្ណោះ'));
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

      // Auto-determine status based on submission time (only for PRESENT/LATE)
      let finalStatus = status;
      if (status === 'PRESENT' || status === 'LATE') {
        const now = new Date();
        const currentHour = now.getHours();

        // If submitted before 7:00 AM → PRESENT
        // If submitted at or after 7:00 AM → LATE
        if (currentHour < 7) {
          finalStatus = 'PRESENT';
        } else {
          finalStatus = 'LATE';
        }
      }
      // For LEAVE status, keep it as is

      const attendanceResponse = await attendanceService.createAttendance({
        userId: userId,
        date: requestDate,
        status: finalStatus,
        reason: reason
      });

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

  // Get attendance for a specific date
  const getAttendanceForDate = (date) => {
    if (!date) return null;
    // Use helper function to avoid timezone issues
    const dateStr = getLocalDateString(date);
    const attendance = monthlyAttendance[dateStr] || null;

    // Only log for dates with attendance or specific dates we're debugging
    const day = date.getDate();
    if (attendance || day === 30 || day === 31) {
      console.log('DEBUG getAttendanceForDate:', {
        inputDate: dateStr,
        foundAttendance: !!attendance,
        status: attendance?.status
      });
    }

    return attendance;
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

  // Check if user is teacher or director
  const isDirector = user?.isDirector === true;
  const isTeacherOrDirector = isTeacher || isDirector;

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
  if (initialLoading) {
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
  const todayAttendance = monthlyAttendance[todayStr];

  console.log('DEBUG: Pre-render state:', {
    todayStr,
    hasTodayAttendance: !!todayAttendance,
    monthlyAttendanceKeys: Object.keys(monthlyAttendance),
    monthlyAttendanceCount: Object.keys(monthlyAttendance).length
  });

  // Check if current viewing month is the current month
  const isCurrentMonth = currentMonth.getMonth() === new Date().getMonth() &&
    currentMonth.getFullYear() === new Date().getFullYear();

  // Can only mark attendance if:
  // 1. No attendance marked yet for today
  // 2. Currently viewing the current month
  const canMarkToday = !todayAttendance && isCurrentMonth;

  const currentHour = new Date().getHours();
  const isBeforeCutoff = currentHour < 7;

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-6 border">
        {/* Header - Full Width */}
        <FadeInSection className="mb-6 mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">
                {t('myAttendance') || 'វត្តមានរបស់ខ្ញុំ'}
              </h1>
            </div>
            {!isCurrentMonth && (
              <Button onClick={goToCurrentMonth} variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                {t('today', 'ថ្ងៃនេះ')}
              </Button>
            )}
          </div>
        </FadeInSection>

        {/* Two Column Layout */}
        <FadeInSection className="mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Left Column - Summary and Actions */}
          <div className="space-y-4">
            {/* Attendance Summary */}
            <AttendanceSummary userId={userId} selectedDate={currentMonth} />

            {/* Quick Action Section */}
            {isCurrentMonth && (
              <>
                {/* Warning for wrong month */}
                {!isCurrentMonth && (
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
                      <p className="text-sm text-amber-800">
                        {t('canOnlyMarkCurrentMonth', 'អ្នកអាចបញ្ជូនវត្តមានតែសម្រាប់ខែបច្ចុប្បន្នប៉ុណ្ណោះ។')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit Attendance Card */}
                {canMarkToday && (
                  <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {t('markTodayAttendance', 'បញ្ជូនវត្តមានថ្ងៃនេះ')}
                        </h3>
                        <p className="mt-1 text-sm text-gray-600">
                          {isBeforeCutoff ? (
                            <span className="inline-flex items-center text-green-700">
                              <Check className="h-4 w-4 mr-1" />
                              {t('submitBefore7am', 'បញ្ជូនមុនម៉ោង 7:00 ព្រឹក = វត្តមាន')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-orange-700">
                              <Clock className="h-4 w-4 mr-1" />
                              {t('submitAfter7am', 'បញ្ជូនក្រោយម៉ោង 7:00 ព្រឹក = យឺត')}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-row gap-3">
                      <Button
                        onClick={() => markAttendance('PRESENT')}
                        disabled={submitting}
                        className={isBeforeCutoff ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}
                      >
                        {isBeforeCutoff ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            {t('submitAttendance', 'បញ្ជូនវត្តមាន')}
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 mr-2" />
                            {t('submitAttendance', 'បញ្ជូនវត្តមាន')}
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => markAttendance('LEAVE')}
                        disabled={submitting}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        {t('leave', 'ច្បាប់')}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Already Submitted */}
                {todayAttendance && isCurrentMonth && (
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
                    <div className="flex items-start">
                      <Check className="h-5 w-5 text-green-400 mt-0.5 mr-3 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">
                          {t('attendanceMarked', 'វត្តមានត្រូវបានបញ្ជូនរួចរាល់')}
                        </p>
                        <div className="mt-2 flex flex-col gap-2 text-sm text-green-700">
                          <span>
                            {t('status', 'ស្ថានភាព')}: <strong>{getStatusInKhmer(todayAttendance.status)}</strong>
                          </span>
                          {todayAttendance.time && (
                            <span>
                              {t('time', 'ពេលវេលា')}: <strong>{todayAttendance.time}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Right Column - Calendar */}
          <div className="">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {/* Calendar Header */}
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between">
                  <button
                    onClick={goToPreviousMonth}
                    disabled={loading}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <ChevronLeft className="h-5 w-5 text-gray-600" />
                  </button>
                  <h3 className="text-base font-medium text-gray-900">
                    {formatDateKhmer(currentMonth, 'monthYear')}
                  </h3>
                  <button
                    onClick={goToNextMonth}
                    disabled={loading}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
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

                      if (attendance) {
                        switch (attendance.status) {
                          case 'PRESENT':
                            bgColor = 'bg-green-50 hover:bg-green-100';
                            borderColor = 'border-green-500';
                            break;
                          case 'ABSENT':
                            bgColor = 'bg-red-50 hover:bg-red-100';
                            borderColor = 'border-red-500';
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
                      }

                      const cellContent = (
                        <div className="flex items-center justify-center h-full">
                          <span className={`text-sm font-medium ${textColor}`}>
                            {date.getDate()}
                          </span>
                        </div>
                      );

                      return (
                        <div key={idx}>
                          {attendance ? (
                            <Tooltip
                              content={
                                <div className="text-xs">
                                  <div className="font-medium">{getStatusInKhmer(attendance.status)}</div>
                                  {attendance.time && (
                                    <div className="text-gray-400 mt-1">{attendance.time}</div>
                                  )}
                                </div>
                              }
                            >
                              <div
                                className={`aspect-square border rounded-lg ${bgColor} ${borderColor} ${isFutureDay ? 'opacity-40' : ''
                                  } transition-colors cursor-pointer`}
                              >
                                {cellContent}
                              </div>
                            </Tooltip>
                          ) : (
                            <div
                              className={`aspect-square border rounded-lg ${bgColor} ${borderColor} ${isFutureDay ? 'opacity-40' : ''
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
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
