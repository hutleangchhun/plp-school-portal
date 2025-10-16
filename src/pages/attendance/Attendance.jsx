import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { debounce } from 'lodash';
import { isToday } from './utils';
import { Calendar, Check, X, Clock, Users, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { classService } from '../../utils/api/services/classService';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { Button } from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import { DatePicker } from '../../components/ui/date-picker';
import Badge from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import EmptyState from '@/components/ui/EmptyState';

export default function Attendance() {
  const { t, setLanguage } = useLanguage();
  // Force Khmer as the base language for this page
  useEffect(() => {
    setLanguage && setLanguage('km');
  }, [setLanguage]);
  const { showSuccess, showError } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError, retry } = useErrorHandler();

  const [selectedClass, setSelectedClass] = useState('');
  const [students, setStudents] = useState([]);
  const [weeklyAttendance, setWeeklyAttendance] = useState({}); // { studentId: { date: { status, time, id } } }
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);


  const fetchingRef = useRef(false);

  // Helper function to get the start of the week (Monday)
  const getWeekStartHelper = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(() => getWeekStartHelper(new Date()));

  const getWeekStart = useCallback((date) => {
    return getWeekStartHelper(date);
  }, []);

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

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          if (parsedUser?.school_id || parsedUser?.schoolId) {
            setSchoolId(parsedUser.school_id || parsedUser.schoolId);
          }
        } else {
          setUser(null);
          setSchoolId(null);
        }
      } catch (err) {
        console.error('Error parsing updated user data:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userDataUpdated', handleStorageChange);

    if (user?.school_id || user?.schoolId) {
      setSchoolId(user.school_id || user.schoolId);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated', handleStorageChange);
    };
  }, [user]);

  // Fetch classes for the school
  const fetchClasses = useCallback(async () => {
    if (!schoolId) return;

    setLoadingClasses(true);
    try {
      const response = await classService.getBySchool(schoolId);
      if (response.success && response.classes) {
        setClasses([{ id: '', name: t('allClasses', 'All Classes') }, ...response.classes]);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      handleError(err, {
        toastMessage: t('failedToLoadClasses', 'Failed to load classes')
      });
    } finally {
      setLoadingClasses(false);
    }
  }, [schoolId, t, handleError]);

  // Fetch students and weekly attendance
  const fetchStudents = useCallback(async () => {
    if (fetchingRef.current) {
      console.log('Already fetching students, skipping...');
      return;
    }

    if (!selectedClass) {
      setStudents([]);
      setWeeklyAttendance({});
      setInitialLoading(false);
      return;
    }

    fetchingRef.current = true;
    setLoading(true);
    clearError();

    try {
      const loadingKey = 'fetchStudents';
      startLoading(loadingKey, t('loadingStudents', 'Loading students...'));

      // Fetch students from the selected class with search term
      const studentsResponse = await classService.getClassStudents(selectedClass, {
        search: searchTerm || undefined
      });

      if (studentsResponse.data && Array.isArray(studentsResponse.data)) {
        const formattedStudents = studentsResponse.data
          .filter(student => student && (student.userId || student.user_id || student.id))
          .map(student => {
            const userId = student.userId || student.user_id || student.id || student.user?.id;
            const firstName = student.firstName || student.first_name || student.user?.first_name || '';
            const lastName = student.lastName || student.last_name || student.user?.last_name || '';
            const fullName = student.fullName || student.full_name || `${firstName} ${lastName}`.trim();
            const username = student.username || student.user?.username || '';

            return {
              id: Number(userId), // Normalize to number for consistent comparison
              studentId: student.studentId || student.student_id,
              name: fullName || username || 'Unknown',
              firstName,
              lastName,
              username,
              classId: selectedClass
            };
          });

        setStudents(formattedStudents);

        // Fetch attendance for the entire week in one go
        const weeklyAttendanceData = {};
        const dates = getWeekDates(currentWeekStart);
        const startDate = dates[0].toISOString().split('T')[0];
        const endDate = dates[6].toISOString().split('T')[0];

        try {
          let currentPage = 1;
          let hasMorePages = true;
          const allAttendanceRecords = [];

          while (hasMorePages) {
            const attendanceResponse = await attendanceService.getAttendance({
              classId: selectedClass,
              startDate,
              endDate,
              studentName: searchTerm || undefined,
              page: currentPage,
              limit: 400 // Increased limit to reduce number of requests
            });

            if (attendanceResponse.success && attendanceResponse.data) {
              const records = Array.isArray(attendanceResponse.data)
                ? attendanceResponse.data
                : attendanceResponse.data.records || [];
              allAttendanceRecords.push(...records);
              const pagination = attendanceResponse.pagination;
              hasMorePages = pagination && currentPage < pagination.totalPages;
              currentPage++;
            } else {
              hasMorePages = false;
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
          // Optionally, you could set an error state for attendance fetching here
        }

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
  }, [selectedClass, currentWeekStart, getWeekDates, t, handleError, clearError, startLoading, stopLoading]);

  // Initial fetch
  useEffect(() => {
    if (schoolId) {
      fetchClasses();
    }
  }, [schoolId, fetchClasses]);

  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    } else {
      setInitialLoading(false);
    }
  }, [selectedClass, currentWeekStart, fetchStudents]);

  // Use students directly as we'll filter on the server side
  const displayedStudents = students;

  // Debounce search to avoid too many API calls
  const debouncedSearch = useMemo(
    () =>
      debounce((term) => {
        if (selectedClass) {
          fetchStudents();
        }
      }, 500),
    [selectedClass, currentWeekStart, fetchStudents]
  );

  // Effect to handle search term changes
  useEffect(() => {
    if (selectedClass) {
      debouncedSearch(searchTerm);
    }
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchTerm, selectedClass, debouncedSearch]);


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

  const goToCurrentWeek = useCallback(() => {
    setCurrentWeekStart(getWeekStart(new Date()));
  }, [getWeekStart]);



  // Get weekly attendance stats
  const getWeeklyStats = () => {
    let totalMarked = 0;
    let present = 0;
    let absent = 0;
    let late = 0;

    displayedStudents.forEach(student => {
      const studentAtt = weeklyAttendance[student.id] || {};
      weekDates.forEach(date => {
        const dateStr = date.toISOString().split('T')[0];
        const record = studentAtt[dateStr];
        if (record) {
          totalMarked++;
          if (record.status === 'PRESENT') present++;
          else if (record.status === 'ABSENT') absent++;
          else if (record.status === 'LATE') late++;
        }
      });
    });

    return { total: displayedStudents.length * 7, totalMarked, present, absent, late };
  };

  const stats = getWeeklyStats();



  // Helper to check if date is weekend
  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6;
  };

  const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'PRESENT':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'ABSENT':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'LATE':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Initial loading state
  if (initialLoading && selectedClass) {
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
        onRetry={() => retry(fetchStudents)}
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
                  {t('attendanceTracking') || 'Attendance Tracking'}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {t('trackStudentAttendance') || 'Track and manage student attendance records'}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('class') || 'Class'}
                </label>
                <Dropdown
                  value={selectedClass}
                  onValueChange={setSelectedClass}
                  options={classes.map(cls => ({
                    value: cls.id,
                    label: cls.name || cls.className || `Grade ${cls.gradeLevel}`
                  }))}
                  placeholder={t('selectClass', 'Select class...')}
                  disabled={loadingClasses}
                  minWidth="min-w-full"
                  triggerClassName="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('search') || 'Search'}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('searchStudents') || 'Search students...'}
                    className="pl-10 w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-end">
                <div className="bg-indigo-50 rounded-lg p-3 flex items-center w-full justify-center">
                  <Users className="h-5 w-5 text-indigo-600 mr-2" />
                  <span className="text-sm font-medium text-indigo-600">
                    {displayedStudents.length} {t('students') || 'Students'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>
        {/* Attendance List */}
        {selectedClass ? (
          <FadeInSection>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {t('weeklyAttendance', 'Weekly Attendance')}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {currentWeekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-2 sm:mt-0">
                    <Button
                      onClick={goToPreviousWeek}
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      className="px-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={goToCurrentWeek}
                      variant="ghost"
                      size="sm"
                      className="text-xs px-2"
                    >
                      {t('currentWeek', 'Current Week')}
                    </Button>
                    <Button
                      onClick={goToNextWeek}
                      variant="outline"
                      size="sm"
                      disabled={loading}
                      className="px-2"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center p-12">
                  <DynamicLoader
                    type="spinner"
                    size="xl"
                    variant="primary"
                    message={t('loadingStudents', 'Loading students...')}
                  />
                </div>
              ) : displayedStudents.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={t('noStudentsFound', 'No students found')}
                  description={searchTerm
                    ? t('tryDifferentSearch', 'Try a different search term')
                    : t('noStudentsInClass', 'No students in this class')}
                  variant='info'
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-sm font-medium text-gray-700 uppercase tracking-wider border-r">
                          {t('students', 'Students')}
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
                                      ? 'bg-gray-100 text-gray-700'
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
                        // Debug log for first student
                        if (displayedStudents[0]?.id === student.id) {
                          console.log('Rendering first student:', student.name, 'ID:', student.id, '(type:', typeof student.id, ')');
                          console.log('Attendance data for this student:', weeklyAttendance[student.id]);
                        }

                        return (
                          <tr key={student.id}>
                            <td className="sticky left-0 z-10 bg-white px-4 py-3 whitespace-nowrap border-r">
                              <div className="flex items-center">
                                <div className="ml-3">
                                  <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                </div>
                              </div>
                            </td>
                            {weekDates.map((date, idx) => {
                              // Use same date formatting as in fetch
                              const year = date.getFullYear();
                              const month = String(date.getMonth() + 1).padStart(2, '0');
                              const day = String(date.getDate()).padStart(2, '0');
                              const dateStr = `${year}-${month}-${day}`;
                              const attendance = weeklyAttendance[student.id]?.[dateStr];
                              const isWeekendDay = isWeekend(date);

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
                                    text = t('present', 'Present');
                                    break;
                                  case 'ABSENT':
                                    color = 'red';
                                    icon = <X className="h-4 w-4 mr-1 text-red-600" />;
                                    text = t('absent', 'Absent');
                                    break;
                                  case 'LATE':
                                    color = 'yellow';
                                    icon = <Clock className="h-4 w-4 mr-1 text-yellow-600" />;
                                    text = t('late', 'Late');
                                    break;
                                  case 'LEAVE':
                                    color = 'purple';
                                    icon = <Clock className="h-4 w-4 mr-1 text-purple-600" />;
                                    text = t('leave', 'Leave');
                                    break;
                                  case 'ACTIVE':
                                    color = 'blue';
                                    icon = <Check className="h-4 w-4 mr-1 text-blue-600" />;
                                    text = t('active', 'Active');
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
                                          {t('status', 'Status')}: {text}
                                        </div>
                                        {attendance.reason && (
                                          <div className="mb-1"><span className="font-semibold">{t('reason', 'Reason')}:</span> {attendance.reason}</div>
                                        )}
                                        <div className="text-xs text-gray-500">{t('created', 'Created')}: {attendance.createdAt ? new Date(attendance.createdAt).toLocaleString() : '-'}</div>
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
                                  className={`px-2 py-3 text-center min-h-10 align-middle ${isWeekendDay ? 'bg-gray-50' : ''
                                    }`}
                                >
                                  <div className="flex flex-col items-center gap-1">
                                    {badge ? badge : <span className="text-xs text-gray-300">-</span>}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        )
                      })}

                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </FadeInSection>
        ) : (
          <FadeInSection>
            <EmptyState
              icon={Users}
              title={t('selectClassToViewAttendance', 'Select a class to view attendance')}
              description={t('pleaseSelectClassAbove', 'Please select a class above to load students and their attendance records.')}
              variant='info'
            />
          </FadeInSection>
        )}
      </div>
    </PageTransition>
  );
}