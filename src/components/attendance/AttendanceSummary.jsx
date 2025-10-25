import { useState, useEffect, useCallback } from 'react';
import { Calendar, TrendingUp, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import DynamicLoader from '../ui/DynamicLoader';
import ErrorDisplay from '../ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { DatePickerWithDropdowns } from '../ui/date-picker-with-dropdowns';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { formatDateKhmer } from '../../utils/formatters';

/**
 * AttendanceSummary Component
 * Displays attendance statistics for a specific month with month/year filter
 */
export default function AttendanceSummary({ userId, selectedDate: propSelectedDate, onDataLoaded }) {
  const { t } = useLanguage();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError, retry } = useErrorHandler();

  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(propSelectedDate || new Date());

  // Update selectedDate when propSelectedDate changes (from calendar navigation)
  useEffect(() => {
    if (propSelectedDate) {
      setSelectedDate(propSelectedDate);
    }
  }, [propSelectedDate]);

  // Calculate start and end dates based on selected date
  const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).toISOString().split('T')[0];
  const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).toISOString().split('T')[0];

  // Fetch attendance summary
  const fetchSummary = useCallback(async () => {
    if (!userId || !startDate || !endDate) return;

    setLoading(true);
    clearError();

    try {
      const loadingKey = 'fetchSummary';
      startLoading(loadingKey, t('loadingAttendance', 'Loading attendance summary...'));

      const response = await attendanceService.getAttendanceSummary(userId, startDate, endDate);

      if (response.success) {
        setSummary(response.data);
        if (onDataLoaded) {
          onDataLoaded(response.data);
        }
      } else {
        handleError(new Error('Failed to load attendance summary'));
      }

      stopLoading(loadingKey);
    } catch (err) {
      console.error('Error fetching attendance summary:', err);
      handleError(err, {
        toastMessage: t('errorFetchingAttendance', 'Error fetching attendance summary')
      });
    } finally {
      setLoading(false);
    }
  }, [userId, startDate, endDate, t, handleError, clearError, startLoading, stopLoading, onDataLoaded]);

  // Fetch summary on mount and when date range changes
  useEffect(() => {
    if (userId && startDate && endDate) {
      fetchSummary();
    }
  }, [userId, startDate, endDate, fetchSummary]);

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => retry(fetchSummary)}
        size="sm"
      />
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <DynamicLoader
          type="spinner"
          size="md"
          variant="primary"
          message={t('loadingAttendance', 'កំពុងផ្ទុក...')}
        />
      </div>
    );
  }

  // No data state
  if (!summary) {
    return (
      <div className="text-center p-6 text-gray-500">
        {t('noData', 'No attendance data available')}
      </div>
    );
  }

  const { totalRecords, presentCount, absentCount, lateCount, attendancePercentage } = summary;

  // Calculate leave count
  const leaveCount = totalRecords - presentCount - absentCount - lateCount;

  // Status items for display
  const statusItems = [
    {
      label: t('present', 'វត្តមាន'),
      value: presentCount,
      color: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-700',
      bgColor: 'bg-green-100',
    },
    {
      label: t('absent', 'គ្មានវត្តមាន'),
      value: absentCount,
      color: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-700',
      bgColor: 'bg-red-100',
    },
    {
      label: t('late', 'យឺត'),
      value: lateCount,
      color: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-700',
      bgColor: 'bg-orange-100',
    },
    {
      label: t('leave', 'ច្បាប់'),
      value: leaveCount,
      color: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-700',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {t('attendanceSummary', 'សង្ខេបវត្តមាន')}
              </h3>
              <p className="mt-1 text-sm text-gray-600">
                {summary?.user?.first_name} {summary?.user?.last_name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Content */}
      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Attendance Percentage - Large Display */}
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 flexjustify-center items-center">
          <div className="flex items-center justify-center">
            <div className="w-40 h-40 rounded-full bg-white border-4 border-blue-200 flex items-center justify-center">
              <span className="text-lg font-bold text-blue-600">{attendancePercentage}%</span>
            </div>
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="">
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">{t('present', 'វត្តមាន')}</span>
              <span className="text-sm font-medium text-green-700">
                {presentCount} / {totalRecords} ({totalRecords > 0 ? Math.round((presentCount / totalRecords) * 100) : 0}%)
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">{t('absent', 'គ្មានវត្តមាន')}</span>
              <span className="text-sm font-medium text-red-700">
                {absentCount} / {totalRecords} ({totalRecords > 0 ? Math.round((absentCount / totalRecords) * 100) : 0}%)
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-200">
              <span className="text-sm text-gray-600">{t('late', 'យឺត')}</span>
              <span className="text-sm font-medium text-orange-700">
                {lateCount} / {totalRecords} ({totalRecords > 0 ? Math.round((lateCount / totalRecords) * 100) : 0}%)
              </span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-gray-600">{t('leave', 'ច្បាប់')}</span>
              <span className="text-sm font-medium text-purple-700">
                {leaveCount} / {totalRecords} ({totalRecords > 0 ? Math.round((leaveCount / totalRecords) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
