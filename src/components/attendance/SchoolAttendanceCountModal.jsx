import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { attendanceService } from '../../utils/api/services/attendanceService';
import Modal from '../ui/Modal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import StatsCard from '../ui/StatsCard';
import { Users, User, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { DatePickerWithDropdowns } from '../ui/date-picker-with-dropdowns';
import { format } from 'date-fns';

/**
 * School Attendance Count Modal
 * Shows detailed attendance statistics for a specific date with status breakdowns
 */
const SchoolAttendanceCountModal = ({ 
  isOpen, 
  onClose, 
  schoolId, 
  schoolName,
  initialFilterMode = 'single',
  initialDate = '',
  initialStartDate = '',
  initialEndDate = ''
}) => {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  
  const formatDateLocal = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = formatDateLocal(new Date());
  
  const [filterMode, setFilterMode] = useState(initialFilterMode);
  const [date, setDate] = useState(initialDate || today);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [endDate, setEndDate] = useState(initialEndDate);

  useEffect(() => {
    if (isOpen && schoolId) {
      fetchAttendanceCount();
    }
  }, [isOpen, schoolId, filterMode, date, startDate, endDate]);

  const fetchAttendanceCount = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      
      if (filterMode === 'single' && date) {
        params.date = date;
      } else if (filterMode === 'range') {
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
      }
      
      console.log('Fetching attendance count with params:', params);
      
      const response = await attendanceService.dashboard.getSchoolAttendanceCountWithDates(
        schoolId, 
        params
      );
      
      if (response && response.success) {
        setData(response.data);
      } else {
        setError(t('failedToLoadAttendanceCount', 'Failed to load attendance count'));
      }
    } catch (err) {
      console.error('Error fetching attendance count:', err);
      setError(err.message || t('errorOccurred', 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  const StatusItem = ({ label, count, colorClass }) => (
    <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-1 transition-colors">
      <span className="text-sm font-medium text-gray-600">{label}</span>
      <span className={`text-sm font-bold ${colorClass}`}>{count.toLocaleString()}</span>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={schoolName || t('schoolDetails', 'School Details')}
      size="xl"
    >
      <div className="space-y-6 py-2">
        {/* Date Filter Header */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-2xl border border-blue-100 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
              <Calendar className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-800 uppercase tracking-widest">{t('attendanceFilters', 'Attendance Filters')}</p>
              <p className="text-sm font-bold text-blue-900">
                {filterMode === 'single' && date ? format(new Date(date), 'PPPP') : 
                 filterMode === 'range' ? `${startDate || '...'} ${t('to', 'to')} ${endDate || '...'}` : 
                 t('selectDateRange', 'Select date or range')}
              </p>
            </div>
          </div>
          
          {/* Filter Mode Toggle */}
          <div className="flex bg-white p-1 rounded-lg mb-4 shadow-sm">
            <button
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                filterMode === 'single' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setFilterMode('single')}
            >
              {t('singleDate', 'Single Date')}
            </button>
            <button
              className={`flex-1 py-2 text-xs font-medium rounded-md transition-all ${
                filterMode === 'range' 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setFilterMode('range')}
            >
              {t('dateRange', 'Date Range')}
            </button>
          </div>

          {/* Date Pickers */}
          {filterMode === 'single' ? (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-700">
                {t('selectDate', 'Select Date')}
              </label>
              <DatePickerWithDropdowns
                value={date ? new Date(date) : undefined}
                onChange={(newDate) => setDate(newDate ? formatDateLocal(newDate) : '')}
                placeholder={t('selectDate', 'Select date')}
                className="w-full bg-white"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  {t('startDate', 'Start Date')}
                </label>
                <DatePickerWithDropdowns
                  value={startDate ? new Date(startDate) : undefined}
                  onChange={(newDate) => setStartDate(newDate ? formatDateLocal(newDate) : '')}
                  placeholder={t('startDate', 'Start date')}
                  className="w-full bg-white"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-xs font-medium text-gray-700">
                  {t('endDate', 'End Date')}
                </label>
                <DatePickerWithDropdowns
                  value={endDate ? new Date(endDate) : undefined}
                  onChange={(newDate) => setEndDate(newDate ? formatDateLocal(newDate) : '')}
                  placeholder={t('endDate', 'End date')}
                  className="w-full bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-gray-500 font-medium animate-pulse">
              {t('loadingAttendanceData', 'Loading attendance data...')}
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="p-4 bg-red-100 rounded-full mb-4">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('error', 'Error')}</h3>
            <p className="text-gray-600 mb-6 max-w-sm mx-auto">{error}</p>
            <button 
              onClick={fetchAttendanceCount}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md shadow-blue-100"
            >
              {t('tryAgain', 'Try Again')}
            </button>
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* Main Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatsCard
                title={t('studentAttendance', 'Student Attendance')}
                value={`${data.studentAttendanceCount || 0} / ${data.totalStudents || 0}`}
                subtitle={t('studentsExpected', 'total students')}
                icon={Users}
                enhanced
                gradientFrom="from-blue-600"
                gradientTo="to-indigo-600"
              />
              <StatsCard
                title={t('teacherAttendance', 'Teacher Attendance')}
                value={`${data.teacherAttendanceCount || 0} / ${data.totalTeachers || 0}`}
                subtitle={t('teachersExpected', 'total teachers')}
                icon={User}
                enhanced
                gradientFrom="from-emerald-600"
                gradientTo="to-teal-600"
              />
              <StatsCard
                title={t('totalAttendance', 'Total Attendance')}
                value={data.totalAttendanceCount || 0}
                subtitle={t('combinedRecordsToday', 'combined records today')}
                icon={TrendingUp}
                enhanced
                gradientFrom="from-purple-600"
                gradientTo="to-violet-600"
              />
            </div>

            {/* Detailed Status Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Students Breakdown */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-blue-50/50 px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{t('studentStatus', 'Student Status')}</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{t('records', 'RECORDS')}</span>
                </div>
                <div className="p-5 space-y-1">
                  <StatusItem label={t('presentCount', 'Present')} count={data.studentPresentCount ?? 0} colorClass="text-green-600" />
                  <StatusItem label={t('absentCount', 'Absent')} count={data.studentAbsentCount ?? 0} colorClass="text-red-600" />
                  <StatusItem label={t('lateCount', 'Late')} count={data.studentLateCount ?? 0} colorClass="text-amber-600" />
                  <StatusItem label={t('leaveCount', 'Leave/Permission')} count={data.studentLeaveCount ?? 0} colorClass="text-indigo-600" />
                </div>
              </div>

              {/* Teachers Breakdown */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="bg-emerald-50/50 px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{t('teacherStatus', 'Teacher Status')}</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">{t('records', 'RECORDS')}</span>
                </div>
                <div className="p-5 space-y-1">
                  <StatusItem label={t('presentCount', 'Present')} count={data.teacherPresentCount ?? 0} colorClass="text-green-600" />
                  <StatusItem label={t('absentCount', 'Absent')} count={data.teacherAbsentCount ?? 0} colorClass="text-red-600" />
                  <StatusItem label={t('lateCount', 'Late')} count={data.teacherLateCount ?? 0} colorClass="text-amber-600" />
                  <StatusItem label={t('leaveCount', 'Leave/Permission')} count={data.teacherLeaveCount ?? 0} colorClass="text-emerald-600" />
                </div>
              </div>
            </div>
            
            {/* Visual Coverage Progress */}
            <div className="bg-gray-50/80 rounded-2xl p-6 border border-gray-200">
               <div className="flex items-center gap-2 mb-6">
                 <TrendingUp className="h-4 w-4 text-gray-400" />
                 <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{t('coverageActivity', 'Coverage Activity')}</h3>
               </div>
               <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-bold text-gray-700">{t('studentCoverage', 'Student Coverage')}</span>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 mr-2">{data.studentAttendanceCount} / {data.totalStudents}</span>
                        <span className="text-lg font-black text-blue-600 leading-none">
                          {data.totalStudents > 0 ? Math.round((data.studentAttendanceCount / data.totalStudents) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-1000 ease-out" 
                        style={{ width: `${data.totalStudents > 0 ? (data.studentAttendanceCount / data.totalStudents) * 100 : 0}%` }} 
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-sm font-bold text-gray-700">{t('teacherCoverage', 'Teacher Coverage')}</span>
                      <div className="text-right">
                        <span className="text-xs text-gray-500 mr-2">{data.teacherAttendanceCount} / {data.totalTeachers}</span>
                        <span className="text-lg font-black text-emerald-600 leading-none">
                          {data.totalTeachers > 0 ? Math.round((data.teacherAttendanceCount / data.totalTeachers) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all duration-1000 ease-out" 
                        style={{ width: `${data.totalTeachers > 0 ? (data.teacherAttendanceCount / data.totalTeachers) * 100 : 0}%` }} 
                      />
                    </div>
                  </div>
               </div>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  );
};

export default SchoolAttendanceCountModal;
