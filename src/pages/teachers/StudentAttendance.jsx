import { useState, useEffect, useRef } from 'react';
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
import { getFullName } from '../../utils/usernameUtils';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import EmptyState from '@/components/ui/EmptyState';
import AttendanceExport from '../../components/attendance/AttendanceExport';
import { formatClassIdentifier } from '../../utils/helpers';
import Pagination from '../../components/ui/Pagination';

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

  // Redis Queue State
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [processingJob, setProcessingJob] = useState(false);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [studentsPerPage, setStudentsPerPage] = useState(10);

  // Refs to track previous class and date for detecting changes
  const prevClassIdRef = useRef(selectedClassId);
  const prevDateRef = useRef(selectedDate);

  // Date is initialized once in state: const [selectedDate, setSelectedDate] = useState(() => new Date());

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

  // Handle limit change
  const handleLimitChange = (newLimit) => {
    setStudentsPerPage(newLimit);
    setCurrentPage(1); // Reset to first page when changing limit
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

  // Load classes on mount using new teacher classes endpoint
  useEffect(() => {
    let mounted = true;

    async function loadClasses() {
      if (!user) {
        setInitialLoading(false);
        return;
      }

      try {
        const teacherId = user.teacherId || user.id || user.userId;

        if (!teacherId) {
          console.warn('⚠️ No teacher ID available');
          setInitialLoading(false);
          return;
        }

        console.log('🎓 Fetching classes for teacher:', teacherId);
        const response = await classService.getTeacherClasses(teacherId);

        if (mounted && response.success && response.data?.length > 0) {
          setClasses(response.data || []);
          setSelectedClassId(String(response.data[0].classId || response.data[0].id));
          console.log(`✅ Loaded ${response.data.length} classes for attendance`);
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

  // Load students and attendance when class, date, or page changes
  useEffect(() => {
    if (!selectedClassId || initialLoading) return;

    let mounted = true;

    async function loadStudentsAndAttendance() {
      try {
        // Check if class or date changed (not just page change)
        const classChanged = prevClassIdRef.current !== selectedClassId;
        const dateChanged = prevDateRef.current?.getTime() !== selectedDate?.getTime();

        if (classChanged || dateChanged) {
          console.log('Class or date changed, clearing attendance state');
          setAttendance({});
          setExistingAttendance({});
          setCurrentPage(1);
          prevClassIdRef.current = selectedClassId;
          prevDateRef.current = selectedDate;
        }

        setStudentsLoading(true);

        const selectedDateStr = formatDateToString(selectedDate);
        console.log('Fetching unified attendance for classId:', selectedClassId, 'page:', currentPage);

        const attendanceResponse = await attendanceService.getClassAttendance(
          selectedClassId,
          selectedDateStr,
          { page: currentPage, limit: studentsPerPage }
        );

        if (!mounted) return;

        if (attendanceResponse.success) {
          const records = attendanceResponse.data || [];

          const paginationInfo = attendanceResponse.pagination || {};
          const total = paginationInfo.total || records.length;
          const pages = paginationInfo.totalPages || Math.ceil(total / studentsPerPage);

          console.log(`Loaded ${records.length} students/attendance for page ${currentPage} of ${pages}, total: ${total}`);

          setTotalStudents(total);
          setTotalPages(pages);

          // Build a unified students array from the populated 'user' object in each record.
          const studentsList = records.map(record => ({
            ...record.user,
            userId: record.user.id
          }));

          setStudents(studentsList);

          const attendanceMap = {};
          const existingMap = {};

          records.forEach(record => {
            if (!record.user || !record.user.id) return;

            const studentUserId = Number(record.user.id);
            if (record.id) {
              existingMap[studentUserId] = record.id;
            }
            if (record.status) {
              attendanceMap[studentUserId] = {
                status: record.status,
                reason: record.reason || ''
              };
            }
          });

          // Merge with existing attendance state to preserve pending selections from other pages
          setAttendance(prev => {
            const merged = { ...prev };

            studentsList.forEach(student => {
              const studentUserId = Number(student.userId);

              if (prev[studentUserId] && prev[studentUserId].status !== null) {
                // Keep local unsaved changes
              } else if (attendanceMap[studentUserId]) {
                // Pre-fill existing API status
                merged[studentUserId] = attendanceMap[studentUserId];
              } else {
                // Initialize empty for unmarked students
                merged[studentUserId] = { status: null, reason: '' };
              }
            });
            return merged;
          });

          setExistingAttendance(prev => ({
            ...prev,
            ...existingMap
          }));
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
  }, [selectedClassId, selectedDate, currentPage, initialLoading, showError, studentsPerPage]);

  // Poll job status when processing
  useEffect(() => {
    if (!processingJob || !jobId) return;

    let mounted = true;
    let pollInterval;

    const pollJobStatus = async () => {
      try {
        console.log('Polling job status for:', jobId);
        const response = await attendanceService.getBulkJobStatus(jobId);

        if (!mounted) return;

        if (response.success && response.data) {
          const status = response.data;
          setJobStatus(status);

          console.log('Job status:', status.status, `${status.processedRecords}/${status.totalRecords}`);

          // Check if job is completed
          if (status.status === 'completed' || status.status === 'failed') {
            setProcessingJob(false);

            if (status.status === 'completed') {
              const { successfulRecords = 0, failedRecords = 0, totalRecords = 0 } = status;

              if (failedRecords > 0) {
                showError(
                  t('attendancePartialSuccess',
                    `Attendance saved with some errors: ${successfulRecords}/${totalRecords} successful, ${failedRecords} failed`
                  )
                    .replace('{successfulRecords}', successfulRecords)
                    .replace('{totalRecords}', totalRecords)
                    .replace('{failedRecords}', failedRecords)
                );
                console.warn('Failed records:', status.results?.failed);
              } else {
                showSuccess(
                  t('attendanceSavedSuccess',
                    `Attendance saved successfully! ${successfulRecords} records processed`
                  )
                    .replace('{successfulRecords}', successfulRecords)
                );
              }

              // Reload attendance to reflect changes
              const attendanceResponse = await attendanceService.getAttendance({
                classId: selectedClassId,
                date: formatDateToString(selectedDate),
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
            } else {
              showError(t('attendanceProcessingFailed', 'Attendance processing failed'));
            }

            // Clear job data
            setJobId(null);
            setJobStatus(null);
          }
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        if (mounted) {
          setProcessingJob(false);
          showError(t('attendanceStatusCheckFailed', 'Failed to check processing status'));
        }
      }
    };

    // Initial poll
    pollJobStatus();

    // Set up polling interval (every 2 seconds)
    pollInterval = setInterval(pollJobStatus, 2000);

    return () => {
      mounted = false;
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [processingJob, jobId, selectedClassId, selectedDate, showError, showSuccess, t]);

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

  // Mark all as present - ALL students across ALL pages
  const handleMarkAllPresent = async () => {
    // Prevent editing if the date is in the past
    if (isReadOnly) {
      showError(t('cannotEditPastAttendance', 'Cannot edit attendance for past dates'));
      return;
    }

    // Show confirmation dialog - REMOVED per user request
    // const confirmMarkAll = window.confirm(
    //   `${t('confirmMarkAllPresent', 'Mark All Present?')}\n\n` +
    //   `${t('confirmMarkAllMessage', `This will mark ALL ${totalStudents} students in this class as present across all ${totalPages} pages. Are you sure?`)}`
    // );

    // if (!confirmMarkAll) return;

    try {
      setStudentsLoading(true);

      // Fetch ALL students from the class (not just current page)
      const selectedDateStr = formatDateToString(selectedDate);
      const allStudentsResponse = await attendanceService.getClassAttendance(
        selectedClassId,
        selectedDateStr,
        { page: 1, limit: totalStudents || 1000 } // Fetch all students at once
      );

      if (allStudentsResponse.success && allStudentsResponse.data) {
        const newAttendance = { ...attendance };

        // Mark ALL students as present
        allStudentsResponse.data.forEach(record => {
          if (!record.user || !record.user.id) return;
          const studentUserId = record.user.id;
          newAttendance[studentUserId] = {
            status: 'PRESENT',
            reason: ''
          };
        });

        setAttendance(newAttendance);
        showSuccess(
          t('markedAllPresentSuccess', `Successfully marked all ${allStudentsResponse.data.length} students as present!`)
            .replace('{count}', allStudentsResponse.data.length)
        );
      }
    } catch (error) {
      console.error('Error marking all students present:', error);
      showError(t('markAllPresentFailed', 'Failed to mark all students as present'));
    } finally {
      setStudentsLoading(false);
    }
  };

  // Save attendance using Redis bulk queue
  const handleSaveAttendance = async () => {
    // Prevent saving if the date is in the past
    if (isReadOnly) {
      showError(t('cannotEditPastAttendance', 'Cannot edit attendance for past dates'));
      return;
    }

    try {
      setSaving(true);

      // Format date as YYYY-MM-DD (backend expects this format, not ISO)
      const selectedDateStr = formatDateToString(selectedDate);

      // Collect ALL attendance records from the attendance state (across all pages)
      // Separate into creates (POST) and updates (PUT)
      const createRecords = [];
      const updateRecords = [];

      Object.entries(attendance).forEach(([userId, attendanceData]) => {
        // Skip if no status selected
        if (!attendanceData || !attendanceData.status) return;

        // Check if this student already has an attendance record
        const existingRecordId = existingAttendance[userId];

        if (existingRecordId) {
          // Update existing record (PUT) - only send id and changed fields
          updateRecords.push({
            id: existingRecordId,
            status: attendanceData.status,
            reason: attendanceData.reason || null
          });
        } else {
          // Create new record (POST) - send all required fields
          createRecords.push({
            classId: parseInt(selectedClassId),
            userId: parseInt(userId),
            date: selectedDateStr,
            status: attendanceData.status,
            reason: attendanceData.reason || null
          });
        }
      });

      const totalRecords = createRecords.length + updateRecords.length;
      if (totalRecords === 0) {
        showError(t('noAttendanceToSave', 'No attendance records to save'));
        setSaving(false);
        return;
      }

      console.log('🚀 Queueing attendance records:', {
        creates: createRecords.length,
        updates: updateRecords.length,
        total: totalRecords
      });
      console.log('📦 Sample CREATE record:', createRecords[0]);
      console.log('📦 Sample UPDATE record:', updateRecords[0]);

      let response;

      // Send creates and updates using appropriate HTTP methods
      if (createRecords.length > 0 && updateRecords.length > 0) {
        // Both creates and updates - send two separate requests
        console.log('📤 Sending creates (POST):', createRecords);
        const createResponse = await attendanceService.queueBulkAttendance(createRecords);

        console.log('📤 Sending updates (PUT):', updateRecords);
        const updateResponse = await attendanceService.updateBulkAttendance(updateRecords);

        // Use the first response for job tracking (you may want to track both)
        response = createResponse.success ? createResponse : updateResponse;
      } else if (createRecords.length > 0) {
        // Only creates - use POST
        console.log('📤 Sending creates only (POST):', createRecords);
        response = await attendanceService.queueBulkAttendance(createRecords);
      } else {
        // Only updates - use PUT
        console.log('📤 Sending updates only (PUT):', updateRecords);
        response = await attendanceService.updateBulkAttendance(updateRecords);
      }

      if (response.success && response.data?.jobId) {
        const { jobId: newJobId } = response.data;

        console.log(`✅ Queued ${totalRecords} records (${createRecords.length} creates, ${updateRecords.length} updates). Job ID: ${newJobId}`);

        setJobId(newJobId);
        setProcessingJob(true);

        showSuccess(
          t('attendanceQueued', `Attendance queued successfully! Processing ${totalRecords} records (${createRecords.length} new, ${updateRecords.length} updates)...`)
            .replace('{totalRecords}', totalRecords)
            .replace('{createRecords}', createRecords.length)
            .replace('{updateRecords}', updateRecords.length)
        );
      } else {
        throw new Error('Failed to queue attendance records');
      }
    } catch (error) {
      console.error('Error queueing attendance:', error);
      showError(t('attendanceQueueFailed', 'Failed to queue attendance records'));
      setSaving(false);
      setProcessingJob(false);
    } finally {
      setSaving(false);
    }
  };

  // Class dropdown options (Kindergarten-aware formatting)
  const classDropdownOptions = classes.map(cls => {
    const rawGradeLevel =
      typeof cls.gradeLevel !== 'undefined' && cls.gradeLevel !== null
        ? String(cls.gradeLevel)
        : '';

    const displayGradeLevel =
      rawGradeLevel === '0'
        ? t('grade0', 'Kindergarten')
        : rawGradeLevel;

    return {
      value: String(cls.classId || cls.id),
      label: `${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, cls.section)}`
    };
  });

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
    return (
      <div className='h-96 flex justify-center items-center'>
        <PageLoader message={t('loadingAttendance', 'Loading attendance...')} />
      </div>
    );
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
    <PageTransition className='bg-gray-50'>
      <div className='p-3 sm:p-6'>
        <FadeInSection delay={100} className="my-4 mx-2">
          {/* Filters */}
          {/* Header */}
          <div className="mb-4">
            <h4 className="text-lg sm:text-2xl font-bold text-gray-900">
              {t('attendance', 'Attendance')}
            </h4>
            <p className="text-xs sm:text-sm text-gray-600">
              {t('markStudentAttendance', 'Mark student attendance for your classes')}
            </p>
          </div>

          {/* Filters Grid - Responsive Layout */}
          <div className="flex flex-col lg:flex-row items-end gap-4 mb-4">
            {/* Class Selector */}
            <div className="w-full">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                {t('class', 'Class')}
              </label>
              <Dropdown
                value={selectedClassId}
                onValueChange={setSelectedClassId}
                options={classDropdownOptions}
                placeholder={t('selectClass', 'Select class...')}
                minWidth="w-full"
              />
            </div>

            {/* Date Selector */}
            <div className="w-full">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
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
                className="w-full"
                toDate={new Date()} // Limit to today
                fromYear={new Date().getFullYear() - 1} // Allow selecting dates from last year
              />
              {isFutureDate() && (
                <p className="text-xs text-red-500 mt-1">
                  {t('futureDateSelected', 'Future date selected - cannot mark attendance')}
                </p>
              )}
            </div>
            <Button
              onClick={handleMarkAllPresent}
              variant="outline"
              size="sm"
              disabled={studentsLoading || students.length === 0 || isReadOnly}
              className="w-full lg:w-auto whitespace-nowrap"
            >
              <Check className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">{t('markAllPresent', 'Mark All Present')}</span>
              <span className="sm:hidden">{t('allPresent', 'All Present')}</span>
            </Button>

            <div className="grid grid-cols-2 gap-2 w-full lg:flex lg:w-auto lg:gap-2 lg:ml-auto">
              {/* Export Component */}
              <AttendanceExport
                students={students}
                attendance={attendance}
                className={classes.find(cls => String(cls.classId || cls.id) === selectedClassId)?.name || 'Unknown-Class'}
                schoolName={user?.school?.name || user?.schoolName || 'សាលា'}
                selectedDate={selectedDate}
                exportType="daily"
                disabled={studentsLoading}
                buttonClassName="w-full lg:w-auto whitespace-nowrap"
                containerClassName="w-full lg:w-auto"
              />

              <Button
                onClick={handleSaveAttendance}
                disabled={saving || processingJob || studentsLoading || students.length === 0 || isReadOnly}
                size="sm"
                className="w-full lg:w-auto whitespace-nowrap"
              >
                {(saving || processingJob) ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving
                  ? t('queueing', 'Queueing...')
                  : processingJob
                    ? t('processing', 'Processing...')
                    : t('save', 'Save')}
              </Button>
            </div>
          </div>

          {/* Past Date Warning */}
          {isReadOnly && showWarning && (
            <div className="my-4 bg-yellow-50 border-l-4 border-yellow-400 p-3 sm:p-4 hover:scale-99 transition-transform rounded-r-md">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start flex-1 min-w-0">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600" />
                  </div>
                  <div className="ml-2 sm:ml-3 flex-1 min-w-0">
                    <p className="text-xs sm:text-sm text-yellow-700 break-words">
                      {t('viewingPastAttendance', 'You are viewing attendance for a past date. Editing is disabled.')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowWarning(false)}
                  className="flex-shrink-0 text-yellow-600 hover:text-yellow-800 focus:outline-none transition-colors"
                  aria-label={t('close', 'Close')}
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              </div>
            </div>
          )}

          {/* Processing Progress Banner */}
          {processingJob && jobStatus && (
            <div className="mt-4 bg-blue-50 border-l-4 border-blue-400 p-3 sm:p-4 shadow-sm rounded-r-md">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="flex-shrink-0">
                  <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 animate-spin" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs sm:text-sm font-medium text-blue-800 mb-2">
                    {t('processingAttendance', 'Processing Attendance Records')}
                  </h3>
                  <div className="space-y-2">
                    {/* Progress Text */}
                    <div className="flex items-center justify-between text-xs sm:text-sm text-blue-700">
                      <span className="font-medium">
                        {t('progress', 'Progress')}
                      </span>
                      <span className="font-semibold">
                        {jobStatus.processedRecords || 0}/{jobStatus.totalRecords || 0}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative w-full bg-blue-200 rounded-full h-2 sm:h-2.5 overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-blue-600 rounded-full transition-all duration-300 ease-out"
                        style={{
                          width: `${jobStatus.totalRecords > 0
                            ? ((jobStatus.processedRecords || 0) / jobStatus.totalRecords) * 100
                            : 0
                            }%`
                        }}
                      />
                    </div>

                    {/* Status Message */}
                    <p className="text-xs text-blue-600 leading-relaxed">
                      {jobStatus.status === 'processing'
                        ? t('pleaseWait', 'Please wait while we process your attendance records...')
                        : t('almostDone', 'Almost done...')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Students List */}
          {studentsLoading ? (
            <div className='h-96 flex justify-center items-center'>
              <DynamicLoader message={t('loadingStudents', 'Loading students...')} />
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('noStudents', 'No Students')}
              variant='info'
              description={t('noStudentsInClass', 'There are no students in this class.')}
            />
          ) : (
            <div className="overflow-hidden">
              {/* Mobile Card View - Visible on small screens */}
              <div className="block lg:hidden space-y-3">
                {students.map((student) => {
                  const studentUserId = Number(student.userId || student.id);
                  const studentAttendance = attendance[studentUserId] || { status: null, reason: '' };
                  const hasStatus = studentAttendance.status !== null;

                  return (
                    <div key={studentUserId} className="bg-white rounded-sm border border-gray-200 p-4 shadow-sm">
                      {/* Student Name */}
                      <div className="font-medium text-gray-900 mb-3 text-sm">
                        {getFullName(student, student.username)}
                      </div>

                      {/* Status Buttons */}
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-700 mb-2">
                          {t('status', 'Status')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          {attendanceStatuses.map(status => {
                            const StatusIcon = status.icon;
                            const isSelected = hasStatus && studentAttendance.status === status.value;
                            return (
                              <button
                                key={status.value}
                                onClick={() => handleStatusChange(studentUserId, status.value)}
                                disabled={isReadOnly}
                                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-md transition-all border ${isSelected
                                  ? `${status.bgColor} ${status.textColor} border-${status.borderColor}-300`
                                  : `bg-white border-2 border-gray-200 text-gray-600 ${isReadOnly ? '' : 'hover:bg-gray-50 active:bg-gray-100'}`
                                  } ${isReadOnly && !isSelected ? 'opacity-50' : ''} ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                title={status.label}
                              >
                                <StatusIcon className="h-4 w-4" />
                                <span className="text-xs font-medium">{status.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Reason Input */}
                      {(studentAttendance.status === 'ABSENT' || studentAttendance.status === 'LATE' || studentAttendance.status === 'LEAVE') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-2">
                            {t('reason', 'Reason')}
                          </label>
                          <input
                            type="text"
                            value={studentAttendance.reason}
                            onChange={(e) => handleReasonChange(studentUserId, e.target.value)}
                            placeholder={t('enterReason', 'Enter reason...')}
                            disabled={isReadOnly}
                            readOnly={isReadOnly}
                            className={`block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isReadOnly
                              ? 'bg-gray-50 cursor-not-allowed text-gray-500'
                              : 'bg-white'
                              }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View - Hidden on small screens */}
              <div className="hidden lg:block overflow-x-auto rounded-sm shadow">
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
                        <tr key={studentUserId} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {getFullName(student, student.username)}
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
                                    className={`flex items-center gap-2 px-3 py-2 rounded-sm transition-all border-0 ${isSelected
                                      ? `${status.bgColor} ${status.textColor} border-${status.borderColor}-200`
                                      : `bg-transparent border-2 border-gray-100 text-gray-600 ${isReadOnly ? '' : 'hover:bg-gray-100'}`
                                      } ${isReadOnly && !isSelected ? 'opacity-50' : ''} ${isReadOnly ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                    title={isReadOnly ? t('cannotEditPastAttendance', 'Cannot edit attendance for past dates') : status.label}
                                  >
                                    <StatusIcon className="h-4 w-4" />
                                    <span className="text-xs font-medium hidden xl:inline">{status.label}</span>
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
                                placeholder={t('enterReason', 'Enter reason...')}
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

              {/* Pagination Controls */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={totalStudents}
                limit={studentsPerPage}
                onPageChange={setCurrentPage}
                onLimitChange={handleLimitChange}
                t={t}
                showFirstLast={true}
                showInfo={true}
                showLimitSelector={true}
                limitOptions={[10, 25, 50, 100]}
              />
            </div>
          )}
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
