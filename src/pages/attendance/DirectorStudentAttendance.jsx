import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { debounce } from 'lodash';
import { Calendar, Users, Search, ChevronLeft, ChevronRight, Check, X, Clock } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import Pagination from '../../components/ui/Pagination';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import Badge from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import EmptyState from '@/components/ui/EmptyState';
import { formatDateKhmer } from '../../utils/formatters';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { classService } from '../../utils/api/services/classService';
import { studentService } from '../../utils/api/services/studentService';
import { getFullName } from '../../utils/usernameUtils';
import { isToday } from '../attendance/utils';
import Dropdown from '../../components/ui/Dropdown';
import { gradeLevelOptions } from '../../utils/formOptions';
import { formatClassIdentifier } from '../../utils/helpers';

/**
 * DirectorStudentAttendance Component
 * For directors to view student attendance in their school (read-only)
 */
export default function DirectorStudentAttendance() {
  const { t, setLanguage } = useLanguage();
  // Force Khmer as the base language for this page
  useEffect(() => {
    setLanguage && setLanguage('km');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only set language once on mount

  const { showSuccess: _showSuccess, showError: _showError } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError, retry } = useErrorHandler();

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState({}); // { studentId: { date: [records] } }
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);

  const fetchingRef = useRef(false);

  // Helper function to get the start of the week (Monday)
  const getWeekStartHelper = (date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    // If it's Sunday (0), go back 6 days to Monday. Otherwise go back (day - 1) days
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    console.log('🔵 Today:', today.toISOString().split('T')[0], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][today.getDay()]);
    const weekStart = getWeekStartHelper(today);
    console.log('🔵 Initial week start calculated:', weekStart.toISOString().split('T')[0], ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][weekStart.getDay()]);
    return weekStart;
  });

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

  // Fetch classes for the school by grade level
  const fetchClasses = useCallback(async () => {
    if (!schoolId || !isDirector || !selectedGradeLevel) return;

    try {
      const response = await classService.getClassesWithFilters(schoolId, {
        gradeLevel: selectedGradeLevel,
        limit: 1000
      });
      if (response.data && Array.isArray(response.data)) {
        setClasses(response.data);
        // Reset class selection when grade level changes
        setSelectedClassId('');
      } else if (response.classes && Array.isArray(response.classes)) {
        setClasses(response.classes);
        // Reset class selection when grade level changes
        setSelectedClassId('');
      }
    } catch (err) {
      console.warn('Error fetching classes:', err);
    }
  }, [schoolId, isDirector, selectedGradeLevel]);

  // Fetch students and attendance data
  const fetchStudentsAndAttendance = useCallback(async (_searchQuery = '', pageNum = 1, limit = itemsPerPage) => {
    if (fetchingRef.current || !schoolId || !isDirector || !selectedClassId) {
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    clearError();

    try {
      const loadingKey = 'fetchStudents';
      startLoading(loadingKey, t('loadingStudents', 'Loading students...'));

      // Fetch students for the selected class
      const response = await studentService.getStudentsBySchoolClasses(schoolId, {
        classId: selectedClassId,
        limit: limit,
        page: pageNum,
        search: _searchQuery.trim() || undefined
      });

      // Update pagination info from API response
      if (response.pagination?.limit) {
        setItemsPerPage(response.pagination.limit);
      }
      if (response.pagination?.pages) {
        setTotalPages(response.pagination.pages);
      }
      if (response.pagination?.total) {
        setTotalStudents(response.pagination.total);
      }

      if (response.data && Array.isArray(response.data)) {
        const formattedStudents = response.data
          .filter(student => student && (student.userId || student.user_id))
          .map(student => {
            const user = student.user || student;
            // Use userId for attendance lookups (this is the users.id from database)
            const userId = student.userId || student.user_id || user.id;
            const username = user.username || student.username || '';

            return {
              id: Number(userId), // This id is used for attendance lookup
              userId: Number(userId), // Keep explicit userId field
              studentId: student.studentId || student.student_id, // Keep studentId separate
              name: getFullName(user, username || 'Unknown'),
              username,
              studentNumber: student.studentNumber || student.student_number || '',
              profilePicture: user.profile_picture || user.profilePicture || student.profile_picture || student.profilePicture || ''
            };
          });

        setStudents(formattedStudents);

        // Fetch attendance for the entire week
        const weeklyAttendanceData = {};
        const dates = getWeekDates(currentWeekStart);

        // Helper function to format date without timezone issues
        const formatDate = (date) => {
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        console.log('📅 Generated week dates:', dates.map(d => ({
          date: formatDate(d),
          day: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()]
        })));
        console.log('📅 Total dates generated:', dates.length);
        console.log('📅 All dates raw:', dates);

        const startDate = formatDate(dates[0]);
        const endDate = formatDate(dates[6]);
        console.log('📅 API will fetch from:', startDate, 'to', endDate);

        try {
          const allAttendanceRecords = [];

          // Fetch attendance for each student
          for (const student of formattedStudents) {
            try {
              const attendanceResponse = await attendanceService.getAttendance({
                userId: student.id,
                classId: selectedClassId,
                startDate,
                endDate,
                limit: 400
              });

              // Handle different response structures
              let records = [];
              if (attendanceResponse.success && attendanceResponse.data) {
                // Response has success flag
                records = Array.isArray(attendanceResponse.data)
                  ? attendanceResponse.data
                  : attendanceResponse.data.records || [];
              } else if (attendanceResponse.data && Array.isArray(attendanceResponse.data)) {
                // Response is direct data array
                records = attendanceResponse.data;
              } else if (Array.isArray(attendanceResponse)) {
                // Response is array directly
                records = attendanceResponse;
              }

              allAttendanceRecords.push(...records);
              if (records.length > 0) {
                console.log(`✅ Student ${student.name} (${student.id}):`, records.length, 'attendance records');
              }
            } catch (err) {
              console.warn(`Failed to fetch attendance for student ${student.id}:`, err);
            }
          }

          console.log('📊 Total attendance records fetched:', allAttendanceRecords.length);

          // Group attendance records by userId -> date -> array of records
          allAttendanceRecords.forEach(record => {
            const userId = Number(record.userId || record.user_id);
            // Try multiple date fields that might be in the response
            const recordDate = record.date ? record.date.split('T')[0] :
                              record.checkInTime ? record.checkInTime.split('T')[0] :
                              record.createdAt ? record.createdAt.split('T')[0] : null;

            if (!userId || isNaN(userId) || !recordDate) {
              return;
            }

            // Initialize user's attendance data if not exists
            if (!weeklyAttendanceData[userId]) {
              weeklyAttendanceData[userId] = {};
            }

            // Initialize date's attendance data if not exists
            if (!weeklyAttendanceData[userId][recordDate]) {
              weeklyAttendanceData[userId][recordDate] = [];
            }

            // Add the attendance record with simplified details
            weeklyAttendanceData[userId][recordDate].push({
              status: record.status?.toUpperCase() || 'PRESENT',
              submittedAt: record.submittedAt || record.createdAt,
              time: record.submittedAt ? new Date(record.submittedAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              }) : (record.createdAt ? new Date(record.createdAt).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              }) : null),
              id: record.id,
              reason: record.reason || '',
              classId: record.classId,
              approvalStatus: record.approvalStatus || null
            });
          });

          // Sort each date's records by submittedAt
          Object.keys(weeklyAttendanceData).forEach(userId => {
            Object.keys(weeklyAttendanceData[userId]).forEach(date => {
              weeklyAttendanceData[userId][date].sort((a, b) => {
                const timeA = new Date(a.submittedAt || 0);
                const timeB = new Date(b.submittedAt || 0);
                return timeA - timeB;
              });
            });
          });
        } catch (err) {
          console.error(`Error fetching weekly attendance:`, err);
        }

        console.log('📋 Final weeklyAttendanceData:', {
          totalUsers: Object.keys(weeklyAttendanceData).length,
          userIds: Object.keys(weeklyAttendanceData),
          sampleData: Object.keys(weeklyAttendanceData)[0] ? {
            userId: Object.keys(weeklyAttendanceData)[0],
            dates: Object.keys(weeklyAttendanceData[Object.keys(weeklyAttendanceData)[0]])
          } : null
        });

        setWeeklyAttendance(weeklyAttendanceData);
      } else {
        setStudents([]);
        setWeeklyAttendance({});
      }

      stopLoading(loadingKey);
    } catch (err) {
      console.error('Error fetching students:', err);
      handleError(err, {
        toastMessage: t('errorFetchingStudentData', 'Error fetching student data')
      });
    } finally {
      setLoading(false);
      setInitialLoading(false);
      fetchingRef.current = false;
    }
  }, [schoolId, isDirector, selectedClassId, currentWeekStart, getWeekDates, t, handleError, clearError, startLoading, stopLoading, itemsPerPage]);

  const displayedStudents = students;

  // Reset to page 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
    fetchStudentsAndAttendance(searchTerm, 1);
  }, [searchTerm]);


  // Debounce search
  const debouncedFetchRef = useRef(null);
  const previousSearchRef = useRef(searchTerm);
  const previousWeekRef = useRef(currentWeekStart);

  // Effect to handle week changes and search
  useEffect(() => {
    if (!isDirector || !schoolId || !selectedClassId) {
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
      fetchStudentsAndAttendance(searchTerm);
    }
    // If only search changed, debounce
    else if (searchChanged) {
      debouncedFetchRef.current = debounce(() => {
        fetchStudentsAndAttendance(searchTerm);
      }, 500);
      debouncedFetchRef.current();
    }

    return () => {
      if (debouncedFetchRef.current) {
        debouncedFetchRef.current.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeekStart, searchTerm, isDirector, schoolId, selectedClassId]);

  // Fetch classes when grade level changes
  useEffect(() => {
    if (isDirector && schoolId && selectedGradeLevel) {
      fetchClasses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGradeLevel]);

  // Fetch students when selected class changes
  useEffect(() => {
    if (selectedClassId && isDirector && schoolId) {
      fetchStudentsAndAttendance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClassId]);

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
        message={t('loadingStudents', 'Loading students...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => retry(fetchStudentsAndAttendance)}
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
                  {t('studentAttendanceTracking') || 'វត្តមានសិស្ស'}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-gray-500">
                  {t('trackStudentAttendance') || 'មើលនិងតាមដាននូវកំណត់ត្រាវត្តមានរបស់សិស្ស'}
                </p>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-4 my-4">
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  {t('gradeLevel', 'ស្ថានីយ/ថ្នាក់')}
                </label>
                <Dropdown
                  value={selectedGradeLevel}
                  onValueChange={setSelectedGradeLevel}
                  options={[
                    { value: '', label: `-- ${t('selectGradeLevel', 'ជ្រើសរើសស្ថានីយ/ថ្នាក់')} --` },
                    ...gradeLevelOptions
                  ]}
                  placeholder={t('selectGradeLevel', 'ជ្រើសរើសស្ថានីយ/ថ្នាក់')}
                  className="w-full"
                  triggerClassName="text-xs sm:text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  {t('selectClass', 'ជ្រើសរើសថ្នាក់')}
                </label>
                <Dropdown
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                  options={[
                    { value: '', label: `-- ${t('selectAClass', 'ជ្រើសរើសថ្នាក់')} --` },
                    ...classes.map(cls => ({
                      value: String(cls.id || cls.classId),
                      label: formatClassIdentifier(cls.gradeLevel, cls.section, t) || cls.name || cls.className
                    }))
                  ]}
                  placeholder={t('selectAClass', 'ជ្រើសរើសថ្នាក់')}
                  disabled={!selectedGradeLevel}
                  className="w-full"
                  triggerClassName="text-xs sm:text-sm"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                  {t('search') || 'ស្វែងរក'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('searchStudents') || 'ស្វែងរកសិស្ស...'}
                    className="pl-10 w-full border text-xs sm:text-sm border-gray-300 rounded-sm px-3 py-2"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>

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
                  message={t('loadingStudents', 'កំពុងផ្ទុក...')}
                />
              </div>
            ) : !selectedGradeLevel ? (
              <EmptyState
                icon={Users}
                title={t('selectGradeLevel', 'ជ្រើសរើសស្ថានីយ/ថ្នាក់')}
                description={t('pleaseSelectGradeLevelFirst', 'សូមជ្រើសរើសស្ថានីយ/ថ្នាក់ដើម្បីមើលថ្នាក់រៀន')}
                variant='info'
              />
            ) : !selectedClassId ? (
              <EmptyState
                icon={Users}
                title={t('selectClass', 'ជ្រើសរើសថ្នាក់')}
                description={t('pleaseSelectClassFirst', 'សូមជ្រើសរើសថ្នាក់ដើម្បីមើលវត្តមាន')}
                variant='info'
              />
            ) : displayedStudents.length === 0 ? (
              <EmptyState
                icon={Users}
                title={t('noStudentsFound', 'រកមិនឃើញសិស្ស')}
                description={searchTerm
                  ? t('tryDifferentSearch', 'សាកល្បងពាក្យស្វែងរកផ្សេង')
                  : t('noStudentsInClass', 'គ្មានសិស្សនៅក្នុងថ្នាក់នេះទេ')}
                variant='info'
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="sticky left-0 z-10 bg-blue-50 px-4 py-3 text-left text-sm font-medium text-blue-700 uppercase tracking-wider border-r">
                        {t('students', 'សិស្ស')}
                      </th>
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
                    {displayedStudents.map((student) => {
                      return (
                        <tr key={student.id}>
                          <td className="sticky left-0 z-10 px-4 py-3 whitespace-nowrap bg-white border-r">
                            <div className="flex items-center">
                              <div className="ml-3">
                                <div className="text-xs sm:text-sm font-medium text-gray-900">{student.name}</div>
                              </div>
                            </div>
                          </td>
                          {weekDates.map((date, idx) => {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            const dateStr = `${year}-${month}-${day}`;

                            const studentAttendanceForDay = weeklyAttendance[student.id]?.[dateStr];
                            const isWeekendDay = isWeekend(date);
                            const isCurrentDay = isToday(date);

                            let attendanceRecords = [];
                            if (studentAttendanceForDay) {
                              if (Array.isArray(studentAttendanceForDay)) {
                                attendanceRecords = studentAttendanceForDay;
                              } else if (studentAttendanceForDay.status) {
                                attendanceRecords = [studentAttendanceForDay];
                              }
                            }

                            // Helper function to get badge info
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
                                default:
                                  color = 'gray';
                                  icon = null;
                                  text = t(status?.toLowerCase(), status);
                              }
                              return { color, icon, text };
                            };

                            let badge = null;
                            if (attendanceRecords.length > 0) {
                              const primaryAttendance = attendanceRecords[0];
                              const badgeInfo = getBadgeInfo(primaryAttendance.status);

                              const tooltipContent = (
                                <div className="text-left text-xs space-y-2 max-w-xs">
                                  {attendanceRecords.map((record, recordIdx) => {
                                    const recordBadgeInfo = getBadgeInfo(record.status);
                                    const submittedTime = record.time || 'N/A';

                                    return (
                                      <div key={recordIdx} className="py-1 border-b border-gray-300 last:border-b-0">
                                        <div className="mb-1 font-semibold">
                                          <span className="text-gray-900">{recordBadgeInfo.text}</span>
                                        </div>
                                        <div className="text-gray-700 text-xs">
                                          {t('submittedAt', 'បានបញ្ជូននៅ')}: {submittedTime}
                                        </div>
                                        {record.reason && record.reason.trim() !== '' && (
                                          <div className="text-gray-700 text-xs mt-1">
                                            <span className="font-semibold">{t('reason', 'មូលហេតុ')}:</span> {record.reason}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              );

                              badge = (
                                <div className="flex flex-col items-center gap-1">
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
                                className={`px-3 py-3 text-center transition-colors ${
                                  isCurrentDay ? 'bg-blue-50' : isWeekendDay ? 'bg-gray-50' : ''
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

            {/* Pagination Component */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              total={totalStudents}
              limit={itemsPerPage}
              onPageChange={(pageNum) => {
                setCurrentPage(pageNum);
                fetchStudentsAndAttendance(searchTerm, pageNum, itemsPerPage);
              }}
              onLimitChange={(limit) => {
                setItemsPerPage(limit);
                setCurrentPage(1);
                fetchStudentsAndAttendance(searchTerm, 1, limit);
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
    </PageTransition>
  );
}
