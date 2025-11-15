import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import { examHistoryService } from '../../utils/api/services/examHistoryService';
import { classService, studentService } from '@/utils/api';
import { encryptId } from '../../utils/encryption';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import EmptyState from '../../components/ui/EmptyState';
import Table from '../../components/ui/Table';
import { Button } from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Dropdown from '../../components/ui/Dropdown';
import {
  BookOpen,
  Eye
} from 'lucide-react';

/**
 * TeacherExamRecords Component
 * Teachers can view exam records for students in their assigned classes
 */
export default function TeacherExamRecords({ user }) {
  const { t } = useLanguage();
  const { showError } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const navigate = useNavigate();

  // State
  const [studentRecords, setStudentRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    totalStudents: 0,
    totalPages: 1,
    allStudents: []
  });

  /**
   * Fetch teacher's assigned classes
   */
  const fetchClasses = useCallback(async () => {
    try {
      if (user?.classIds?.length > 0) {
        const classPromises = user.classIds.map(classId =>
          classService.getClassById(classId)
        );
        const responses = await Promise.allSettled(classPromises);
        const teacherClasses = responses
          .filter(res => res.status === 'fulfilled' && res.value)
          .map(res => res.value);
        setClasses(teacherClasses);

        // If teacher has only one class, auto-select it
        if (teacherClasses.length === 1) {
          setSelectedClass(teacherClasses[0].classId || teacherClasses[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      showError(t('errorFetchingClasses', 'Failed to fetch classes'));
    }
  }, [user, showError, t]);

  /**
   * Fetch all students from teacher's classes using school API with pagination
   */
  const fetchAllStudents = useCallback(async (page = 1, pageSize = 10) => {
    try {
      let studentsList = [];
      const schoolId = user?.teacher?.schoolId || user?.schoolId;

      if (selectedClass && schoolId) {
        const apiParams = {
          classId: selectedClass,
          page: page,
          limit: pageSize
        };

        console.log('Fetching students with pagination params:', apiParams);

        const response = await studentService.getStudentsBySchoolClasses(schoolId, apiParams);

        console.log('API Response:', response);
        console.log('Pagination from API:', response.pagination);

        if (response.success) {
          studentsList = response.data || [];

          // Update pagination info from API response directly
          console.log('=== PAGINATION DEBUG ===');
          console.log('Requested pageSize:', pageSize);
          console.log('API returned students count:', studentsList.length);
          console.log('API pagination object:', response.pagination);
          console.log('=== END DEBUG ===');

          if (response.pagination) {
            setPagination(prev => ({
              ...prev,
              currentPage: response.pagination.page,
              pageSize: response.pagination.limit,
              totalStudents: response.pagination.total,
              totalPages: response.pagination.pages,
              allStudents: studentsList
            }));
          }
        }
      }

      return studentsList;
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  }, [selectedClass, user]);

  /**
   * Fetch exam records for the current page
   */
  const fetchExamRecords = useCallback(async (page = 1) => {
    try {
      // Only proceed if a class is selected
      if (!selectedClass) {
        setStudentRecords([]);
        setLoading(false);
        stopLoading('fetchExamRecords');
        return;
      }

      setLoading(true);
      setError(null);
      startLoading('fetchExamRecords', t('loadingExamRecords', 'Loading exam records...'));

      // Fetch students for the current page with the current pageSize limit (pagination handled by API)
      const studentsList = await fetchAllStudents(page, pagination.pageSize);

      // Fetch exam records for each student using the new endpoint
      const studentRecordsMap = new Map();

      for (const student of studentsList) {
        try {
          // Extract userId from nested user object or use direct id
          const userId = student.user?.id || student.userId || student.id;

          if (!userId) {
            console.warn('Student has no userId:', student);
            studentRecordsMap.set(student.studentId || student.id, {
              student: student,
              exams: [],
              hasRecords: false
            });
            continue;
          }

          console.log(`Fetching exam history for student userId: ${userId}, studentId: ${student.studentId}`);

          const response = await examHistoryService.getUserExamHistoryFiltered(userId, {
            examType: 'exam'
          });

          // API returns array of exam records for the user
          const exams = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);

          console.log(`Found ${exams.length} exam records for userId ${userId}`);

          studentRecordsMap.set(student.studentId || student.id, {
            student: student,
            exams: exams,
            hasRecords: exams.length > 0
          });
        } catch (error) {
          const userId = student.user?.id || student.userId || student.id;
          console.warn(`Failed to fetch exam history for student ${userId}:`, error);
          // Continue with other students even if one fails
          studentRecordsMap.set(student.studentId || student.id, {
            student: student,
            exams: [],
            hasRecords: false
          });
        }
      }

      // Convert map to array, maintaining student order
      const merged = studentsList.map(student =>
        studentRecordsMap.get(student.studentId || student.id) || {
          student: student,
          exams: [],
          hasRecords: false
        }
      );

      setStudentRecords(merged);
    } catch (error) {
      console.error('Error fetching exam records:', error);
      setError(error?.response?.data?.message || t('errorFetchingExamRecords', 'Failed to fetch exam records'));
      setStudentRecords([]);
    } finally {
      setLoading(false);
      stopLoading('fetchExamRecords');
    }
  }, [selectedClass, startLoading, stopLoading, t, fetchAllStudents, pagination.pageSize]);

  /**
   * Initial load - fetch classes
   */
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  /**
   * Reset pagination and load exam records when class is selected
   */
  useEffect(() => {
    if (selectedClass) {
      setPagination(prev => ({
        ...prev,
        currentPage: 1
      }));
      fetchExamRecords(1);
    }
  }, [selectedClass, fetchExamRecords]);

  /**
   * Handle viewing student exam records
   * Navigate to the student exam records page with encrypted user ID
   */
  const handleViewStudentRecords = (studentRecord) => {
    const userId = studentRecord.student.user?.id || studentRecord.student.userId || studentRecord.student.id;
    const encryptedUserId = encryptId(userId);

    navigate(`/exam-records/${encryptedUserId}`, {
      state: {
        student: studentRecord.student,
        exams: studentRecord.exams || []
      }
    });
  };

  /**
   * Get table columns configuration - shows only students with records
   */
  const getTableColumns = () => [
    {
      key: 'studentName',
      header: t('student', 'Student'),
      accessor: 'studentName',
      disableSort: false
    },
    {
      key: 'totalExams',
      header: t('totalExams', 'Total Exams'),
      accessor: 'totalExams',
      render: (item) => (
        <Badge color="blue" variant="outline">
          {item.totalExams}
        </Badge>
      ),
      disableSort: false
    },
    {
      key: 'passedCount',
      header: t('passed', 'Passed'),
      accessor: 'passedCount',
      render: (item) => (
        <Badge color="green" variant="solid" size="sm">
          {item.passedCount}
        </Badge>
      ),
      disableSort: false
    },
    {
      key: 'failedCount',
      header: t('failed', 'Failed'),
      accessor: 'failedCount',
      render: (item) => (
        <Badge color="red" variant="solid" size="sm">
          {item.failedCount}
        </Badge>
      ),
      disableSort: false
    },
    {
      key: 'completedCount',
      header: t('completed', 'Completed'),
      accessor: 'completedCount',
      render: (item) => (
        <Badge color="gray" variant="outline" size="sm">
          {item.completedCount}
        </Badge>
      ),
      disableSort: false
    },
    {
      key: 'actions',
      header: t('actions', 'Actions'),
      disableSort: true,
      render: (item) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleViewStudentRecords(item.studentRecord)}
          className="flex items-center gap-1"
        >
          <Eye className="w-4 h-4" />
          {t('viewRecords', 'View Records')}
        </Button>
      )
    }
  ];

  /**
   * Get table data - ALL students, but calculate stats only for those with exam records
   */
  const getTableData = useMemo(() => {
    const rows = [];

    studentRecords.forEach((sr) => {
      // Handle nested user structure
      const firstName = sr.student.user?.first_name || sr.student.firstName || '';
      const lastName = sr.student.user?.last_name || sr.student.lastName || '';
      const studentName = `${firstName} ${lastName}`.trim() || '-';
      const studentId = sr.student.studentId || sr.student.user?.id || sr.student.id;

      // Calculate statistics
      const totalExams = sr.exams?.length || 0;
      const passedCount = sr.exams?.filter(e => e.status === 'COMPLETED' && e.passed).length || 0;
      const failedCount = sr.exams?.filter(e => e.status === 'COMPLETED' && !e.passed).length || 0;
      const completedCount = sr.exams?.filter(e => e.status === 'COMPLETED').length || 0;

      rows.push({
        id: `student-${studentId}`,
        studentName,
        totalExams,
        passedCount,
        failedCount,
        completedCount,
        studentRecord: sr, // Keep full record for modal
        hasRecords: sr.hasRecords // Flag to filter in display
      });
    });

    return rows;
  }, [studentRecords, t]);

  /**
   * Apply search filter to table data (show all students)
   */
  const filteredTableData = useMemo(() => {
    if (!searchTerm.trim()) {
      return getTableData;
    }

    const search = searchTerm.toLowerCase();
    return getTableData.filter((row) => {
      const studentName = (row.studentName || '').toLowerCase();
      return studentName.includes(search);
    });
  }, [getTableData, searchTerm]);

  // Loading state
  if (loading && classes.length === 0) {
    return <PageLoader message={t('loadingExamRecords', 'Loading exam records...')} />;
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        message={error}
        onRetry={fetchExamRecords}
      />
    );
  }

  return (
    <PageTransition variant="fade" className="flex-1">
      <div className="p-3 sm:p-6">
        {/* Header */}
        <FadeInSection className="mb-6">
          <div className="bg-white rounded-xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('studentExamRecords', 'Student Exam Records')}
                </h1>
                <p className="text-sm text-gray-600">
                  {t('viewClassStudentExams', 'View exam records for your students')}
                </p>
              </div>
            </div>
            <div className="mt-6">
              {/* Primary Filters: Class, Search */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Class Selection - Mandatory */}
                {classes.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('selectClass', 'Select Class')}
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <Dropdown
                      value={selectedClass ? selectedClass.toString() : ''}
                      onValueChange={(value) => setSelectedClass(value ? parseInt(value) : null)}
                      options={classes.map(cls => ({
                        value: (cls.classId || cls.id).toString(),
                        label: cls.name || `${t('class', 'Class')} ${cls.gradeLevel || ''} ${cls.section || ''}`.trim()
                      }))}
                      placeholder={t('chooseOption', 'ជ្រើសរើសជម្រើស')}
                      className='w-full'
                    />
                  </div>
                )}

                {/* Search */}
                <div className="">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('search', 'Search')}
                  </label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t('searchStudents', 'Search by student name...')}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden mt-4">
              {!selectedClass ? (
                <EmptyState
                  icon={BookOpen}
                  title={t('selectClassFirst', 'Select a Class')}
                  description={t('selectClassFirstDesc', 'Please select a class from the filters above to view exam records')}
                />
              ) : loading ? (
                <PageLoader message={t('loadingExamRecords', 'Loading exam records...')} />
              ) : filteredTableData.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title={t('noStudents', 'No Students')}
                  description={t('noStudentsInClass', 'No students found in this class')}
                  actionLabel={t('clearSearch', 'Clear Search')}
                  onAction={() => {
                    setSearchTerm('');
                  }}
                />
              ) : (
                <>
                  <Table
                    columns={getTableColumns()}
                    data={filteredTableData}
                    loading={loading}
                    t={t}
                    showPagination={pagination.totalPages > 1}
                    pagination={{
                      page: pagination.currentPage,
                      pages: pagination.totalPages,
                      total: pagination.totalStudents,
                      limit: pagination.pageSize
                    }}
                    onPageChange={(newPage) => {
                      setPagination(prev => ({
                        ...prev,
                        currentPage: newPage
                      }));
                      fetchExamRecords(newPage);
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
