import { useState, useEffect } from 'react';
import { Calendar, Users, Check, X, Clock, AlertCircle, Save, RefreshCw } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import { DatePickerWithDropdowns } from '../../components/ui/date-picker-with-dropdowns';
import { studentService } from '../../utils/api/services/studentService';
import { classService } from '../../utils/api/services/classService';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import EmptyState from '@/components/ui/EmptyState';
import AttendanceExport from '../../components/attendance/AttendanceExport';

export default function TeacherAttendance({ user }) {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date()); // Date object for DatePicker
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [existingAttendance, setExistingAttendance] = useState({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showWarning, setShowWarning] = useState(true);

  // Update selected date to current date when component mounts or becomes visible
  useEffect(() => {
    const updateToCurrentDate = () => {
      setSelectedDate(new Date());
    };

    // Update immediately
    updateToCurrentDate();

    // Also update when page becomes visible (handles overnight tab switching)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        updateToCurrentDate();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const attendanceStatuses = [
    { value: 'PRESENT', label: t('present', 'Present'), icon: Check, color: 'green', bgColor: 'bg-green-100', textColor: 'text-green-600', borderColor: 'green' },
    { value: 'ABSENT', label: t('absent', 'Absent'), icon: X, color: 'red', bgColor: 'bg-red-100', textColor: 'text-red-600', borderColor: 'red' },
    { value: 'LATE', label: t('late', 'Late'), icon: Clock, color: 'yellow', bgColor: 'bg-yellow-100', textColor: 'text-yellow-600', borderColor: 'yellow' },
    { value: 'LEAVE', label: t('leave', 'Leave'), icon: Calendar, color: 'purple', bgColor: 'bg-purple-100', textColor: 'text-purple-600', borderColor: 'purple' },
  ];

  // Helper function to convert Date to YYYY-MM-DD string (avoiding timezone issues)
  const formatDateToString = (date) => {
    if (!date) return '';
    // Use local date to avoid timezone offset issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if the selected date is in the past (before today)
  const isPastDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0); // Reset time to start of day
    return selected < today;
  };

  // Check if the selected date is in the future (after today)
  const isFutureDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0); // Reset time to start of day
    return selected > today;
  };

  const isReadOnly = isPastDate();

  // Load classes on mount
  useEffect(() => {
    let mounted = true;

    async function loadClasses() {
      if (!user) {
        setInitialLoading(false);
        return;
      }

      try {
        const userId = user.id || user.userId || user.school_id || user.schoolId;
        const response = await classService.getClassByUser(userId);

        if (mounted && response.success && response.classes?.length > 0) {
          setClasses(response.classes || []);
          setSelectedClassId(String(response.classes[0].classId || response.classes[0].id));
        }
      } catch (error) {
        console.error('Error loading classes:', error);
        showError('Failed to load classes');
      } finally {
        if (mounted) {
          setInitialLoading(false);
        }
      }
    }

    loadClasses();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load students and attendance when class or date changes
  useEffect(() => {
    if (!selectedClassId || initialLoading) return;

    let mounted = true;

    async function loadStudentsAndAttendance() {
      try {
        setStudentsLoading(true);

        // Fetch students in the class (no limit to get all students)
        console.log('Fetching students for classId:', selectedClassId);
        const studentsResponse = await studentService.getMyStudents({
          classId: selectedClassId,
          page: 1,
          limit: 100 // Set very high limit to get all students
        });

        console.log('Students API response:', studentsResponse);

        if (!mounted) return;

        if (studentsResponse.success) {
          const studentsList = studentsResponse.data || [];
          console.log(`Loaded ${studentsList.length} students for attendance`);
          setStudents(studentsList);

          // Fetch existing attendance for this date and class
          const selectedDateStr = formatDateToString(selectedDate);
          console.log('=== ATTENDANCE REQUEST ===');
          console.log('Selected Date Object:', selectedDate);
          console.log('Selected Date String (formatted):', selectedDateStr);
          console.log('Current date (now):', formatDateToString(new Date()));
          console.log('Class ID:', selectedClassId);

          const attendanceResponse = await attendanceService.getAttendance({
            classId: selectedClassId,
            date: selectedDateStr,
            page: 1,
            limit: 100 // Set very high limit to get all attendance records
          });

          console.log('=== ATTENDANCE RESPONSE ===');
          console.log('Total records received:', attendanceResponse.data?.length);
          console.log('Records by date:', attendanceResponse.data?.reduce((acc, record) => {
            acc[record.date] = (acc[record.date] || 0) + 1;
            return acc;
          }, {}));
          console.log('Sample record:', attendanceResponse.data?.[0]);
          console.log('Full response:', attendanceResponse);

          if (!mounted) return;

          // Build attendance map
          const attendanceMap = {};
          const existingMap = {};

          if (attendanceResponse.success && attendanceResponse.data) {
            // WORKAROUND: Filter by date on frontend since backend might not filter correctly
            const filteredRecords = attendanceResponse.data.filter(record => {
              return record.date === selectedDateStr;
            });

            console.log(`Filtered ${filteredRecords.length} records out of ${attendanceResponse.data.length} for date ${selectedDateStr}`);
            console.log('Filtered records:', filteredRecords);

            filteredRecords.forEach(record => {
              // Normalize userId to number for consistent comparison
              const studentUserId = Number(record.userId);
              console.log('Loading attendance record:', {
                rawRecord: record,
                userId: studentUserId,
                status: record.status,
                reason: record.reason,
                date: record.date
              });
              attendanceMap[studentUserId] = {
                status: record.status,
                reason: record.reason || ''
              };
              existingMap[studentUserId] = record.id; // Store attendance record ID for updates
            });
          }

          console.log('Attendance map after loading from API:', attendanceMap);

          // Initialize attendance for all students (no default status if not marked)
          console.log('=== INITIALIZING STUDENTS ===');
          studentsList.forEach((student, index) => {
            const studentUserId = Number(student.userId || student.id);
            if (index === 0) {
              console.log('First student:', {
                rawUserId: student.userId || student.id,
                normalizedUserId: studentUserId,
                hasAttendance: !!attendanceMap[studentUserId],
                attendanceData: attendanceMap[studentUserId]
              });
            }
            if (!attendanceMap[studentUserId]) {
              attendanceMap[studentUserId] = {
                status: null, // No default status
                reason: ''
              };
            }
          });

          console.log('=== FINAL ATTENDANCE MAP ===', attendanceMap);
          setAttendance(attendanceMap);
          setExistingAttendance(existingMap);
        }
      } catch (error) {
        console.error('Error loading students and attendance:', error);
        showError('Failed to load students');
      } finally {
        if (mounted) {
          setStudentsLoading(false);
        }
      }
    }

    loadStudentsAndAttendance();

    return () => {
      mounted = false;
    };
  }, [selectedClassId, selectedDate, initialLoading, showError]);

  // Handle status change for a student
  const handleStatusChange = (studentUserId, status) => {
    // Prevent editing if the date is in the past
    if (isReadOnly) {
      showError(t('cannotEditPastAttendance', 'Cannot edit attendance for past dates'));
      return;
    }

    setAttendance(prev => {
      const currentAttendance = prev[studentUserId] || {};

      return {
        ...prev,
        [studentUserId]: {
          ...currentAttendance,
          status,
          // Clear reason if changing to PRESENT
          reason: status === 'PRESENT' ? '' : currentAttendance.reason
        }
      };
    });
  };

  // Handle reason change for a student
  const handleReasonChange = (studentUserId, reason) => {
    // Prevent editing if the date is in the past
    if (isReadOnly) {
      return;
    }

    setAttendance(prev => ({
      ...prev,
      [studentUserId]: {
        ...prev[studentUserId],
        reason
      }
    }));
  };

  // Mark all as present
  const handleMarkAllPresent = () => {
    // Prevent editing if the date is in the past
    if (isReadOnly) {
      showError(t('cannotEditPastAttendance', 'Cannot edit attendance for past dates'));
      return;
    }

    const newAttendance = {};
    students.forEach(student => {
      const studentUserId = student.userId || student.id;
      newAttendance[studentUserId] = {
        status: 'PRESENT',
        reason: ''
      };
    });
    setAttendance(newAttendance);
    showSuccess(t('markedAllPresent', 'Marked all students as present'));
  };

  // Save attendance
  const handleSaveAttendance = async () => {
    // Prevent saving if the date is in the past
    if (isReadOnly) {
      showError(t('cannotEditPastAttendance', 'Cannot edit attendance for past dates'));
      return;
    }

    try {
      setSaving(true);

      const selectedDateStr = formatDateToString(selectedDate);

      const promises = students.map(async (student) => {
        const studentUserId = student.userId || student.id;
        const attendanceData = attendance[studentUserId];

        // Skip if no status selected
        if (!attendanceData || !attendanceData.status) return;

        const payload = {
          classId: parseInt(selectedClassId),
          userId: studentUserId,
          date: selectedDateStr,
          status: attendanceData.status,
          reason: attendanceData.reason || null
        };

        // Check if attendance record already exists
        const existingId = existingAttendance[studentUserId];

        if (existingId) {
          // Update existing record using PATCH
          return attendanceService.updateAttendance(existingId, payload);
        } else {
          // Create new record using POST
          return attendanceService.createAttendance(payload);
        }
      });

      await Promise.all(promises.filter(Boolean)); // Filter out undefined promises

      showSuccess(t('attendanceSavedSuccess', 'Attendance saved successfully'));

      // Reload attendance to get the updated records
      const attendanceResponse = await attendanceService.getAttendance({
        classId: selectedClassId,
        date: selectedDate,
        page: 1,
        limit: 100
      });

      if (attendanceResponse.success && attendanceResponse.data) {
        const existingMap = {};
        attendanceResponse.data.forEach(record => {
          existingMap[record.userId] = record.id;
        });
        setExistingAttendance(existingMap);
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      showError(t('attendanceSaveFailed', 'Failed to save attendance'));
    } finally {
      setSaving(false);
    }
  };

  // Class dropdown options
  const classDropdownOptions = classes.map(cls => ({
    value: String(cls.classId || cls.id),
    label: cls.name
  }));

  // Count students by status
  const getStatusCounts = () => {
    const counts = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      LEAVE: 0,
    };

    Object.values(attendance).forEach(record => {
      if (counts[record.status] !== undefined) {
        counts[record.status]++;
      }
    });

    return counts;
  };


  if (initialLoading) {
    return <PageLoader message={t('loadingAttendance', 'Loading attendance...')} />;
  }

  if (classes.length === 0) {
    return (
      <PageTransition className='h-96 flex justify-center items-center'>
        <EmptyState
          icon={Calendar}
          title={t('noClassesAssigned', 'No Classes Assigned')}
          variant='info'
          description={t('noClassesAssignedMessage', 'You are not assigned to any classes. Please contact the administrator.')}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition className='p-3 sm:p-4'>
      <div>
        <FadeInSection>
          {/* Filters */}
          <div className="p-6">
            {/* Header */}
            <div className="mb-4">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                {t('attendance', 'Attendance')}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {t('markStudentAttendance', 'Mark student attendance for your classes')}
              </p>
            </div>
            <div className="flex gap-4 items-start items-center">
              {/* Class Selector */}
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('class', 'Class')}
                </label>
                <Dropdown
                  value={selectedClassId}
                  onValueChange={setSelectedClassId}
                  options={classDropdownOptions}
                  placeholder={t('selectClass', 'Select class...')}
                  minWidth="min-w-[200px] sm:min-w-[250px]"
                />
              </div>

              {/* Date Selector */}
              <div className="w-full sm:w-auto">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('date', 'Date')} <span className="text-red-500">*</span>
                </label>
                <DatePickerWithDropdowns
                  value={selectedDate}
                  onChange={(date) => {
                    if (date) {
                      // Check if trying to select future date
                      const tempDate = new Date(date);
                      tempDate.setHours(0, 0, 0, 0);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);

                      if (tempDate > today) {
                        showError(t('cannotMarkFutureAttendance', 'Cannot mark attendance for future dates. Please select today only.'));
                        return;
                      }
                      setSelectedDate(date);
                    }
                  }}
                  placeholder={t('pickDate', 'Pick a date')}
                  className="min-w-[200px] sm:min-w-[250px]"
                  toDate={new Date()} // Limit to today
                  fromYear={new Date().getFullYear() - 1} // Allow selecting dates from last year
                />
                {isFutureDate() && (
                  <p className="text-xs text-red-500 mt-1">
                    {t('futureDateSelected', 'Future date selected - cannot mark attendance')}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="w-full sm:w-auto sm:ml-auto flex gap-2 sm:mt-7">
                <Button
                  onClick={handleMarkAllPresent}
                  variant="outline"
                  size="sm"
                  disabled={studentsLoading || students.length === 0 || isReadOnly}
                >
                  <Check className="h-4 w-4 mr-2" />
                  {t('markAllPresent', 'Mark All Present')}
                </Button>

                {/* Export Component */}
                <AttendanceExport
                  students={students}
                  attendance={attendance}
                  className={classes.find(cls => String(cls.classId || cls.id) === selectedClassId)?.name || 'Unknown-Class'}
                  schoolName={user?.school?.name || user?.schoolName || 'សាលា'}
                  selectedDate={selectedDate}
                  exportType="daily"
                  disabled={studentsLoading}
                />

                <Button
                  onClick={handleSaveAttendance}
                  disabled={saving || studentsLoading || students.length === 0 || isReadOnly}
                  size="sm"
                >
                  {saving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {saving ? t('saving', 'Saving...') : t('save', 'Save')}
                </Button>
              </div>
            </div>

            {/* Past Date Warning */}
            {isReadOnly && showWarning && (
              <div className="mt-4 bg-yellow-50 border-l-4 border-yellow-400 p-4 hover:scale-99 transition-transform">
                <div className="flex items-start justify-between">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        {t('viewingPastAttendance', 'You are viewing attendance for a past date. Editing is disabled.')}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowWarning(false)}
                    className="ml-3 flex-shrink-0 inline-flex text-yellow-600 hover:text-yellow-800 focus:outline-none transition-colors"
                    aria-label={t('close', 'Close')}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Students List */}
          {studentsLoading ? (
            <DynamicLoader message={t('loadingStudents', 'Loading students...')} />
          ) : students.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('noStudents', 'No Students')}
              variant='info'
              description={t('noStudentsInClass', 'There are no students in this class.')}
            />
          ) : (
            <div className="p-4 sm:p-6 overflow-hidden">
              <div className="overflow-x-auto rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr className='bg-blue-500'>
                      <th className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                        {t('student', 'Student')}
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                        {t('status', 'Status')}
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-bold text-white uppercase tracking-wider">
                        {t('reason', 'Reason')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {students.map((student) => {
                      const studentUserId = Number(student.userId || student.id);
                      const studentAttendance = attendance[studentUserId] || { status: null, reason: '' };
                      const hasStatus = studentAttendance.status !== null;

                      // Debug log for first student
                      if (students.indexOf(student) === 0) {
                        console.log('First student render:', {
                          studentUserId,
                          studentAttendance,
                          hasStatus,
                          allAttendance: attendance
                        });
                      }

                      return (
                        <tr key={studentUserId} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex gap-2">
                              {attendanceStatuses.map(status => {
                                const StatusIcon = status.icon;
                                const isSelected = hasStatus && studentAttendance.status === status.value;
                                return (
                                  <button
                                    key={status.value}
                                    onClick={() => handleStatusChange(studentUserId, status.value)}
                                    disabled={isReadOnly}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all border-0 ${isSelected
                                        ? `${status.bgColor} ${status.textColor} border-${status.borderColor}-200`
                                        : `bg-transparent border-2 border-gray-100 text-gray-600 ${isReadOnly ? '' : 'hover:bg-gray-100'}`
                                      } ${isReadOnly && !isSelected ? 'opacity-50' : ''} ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                    title={isReadOnly ? t('cannotEditPastAttendance', 'Cannot edit attendance for past dates') : status.label}
                                  >
                                    <StatusIcon className="h-4 w-4" />
                                    <span className="text-xs font-medium hidden sm:inline">{status.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {(studentAttendance.status === 'ABSENT' || studentAttendance.status === 'LATE' || studentAttendance.status === 'LEAVE') && (
                              <input
                                type="text"
                                value={studentAttendance.reason}
                                onChange={(e) => handleReasonChange(studentUserId, e.target.value)}
                                placeholder={
                                  studentAttendance.status === 'LEAVE'
                                    ? t('reason', 'Enter reason...')
                                    : t('reason', 'Enter reason...')
                                }
                                disabled={isReadOnly}
                                readOnly={isReadOnly}
                                className={`block w-full p-3 border border-none ring-none outline-none rounded-md text-sm focus:outline-none focus:ring-none focus:border-none ${isReadOnly
                                    ? 'bg-gray-50 cursor-not-allowed text-gray-700'
                                    : 'hover:bg-transparent'
                                  }`}
                              />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
