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
  Eye,
  Search
} from 'lucide-react';

/**
 * DirectorExamRecords Component
 * Directors can view exam records for all students in the school
 */
export default function DirectorExamRecords({ user }) {
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();
  const { startLoading, stopLoading } = useLoading();
  const navigate = useNavigate();

  // State
  const [studentRecords, setStudentRecords] = useState([]);
  const [gradeLevels, setGradeLevels] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState(null);
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
   * Fetch all grade levels for the school
   */
  const fetchGradeLevels = useCallback(async () => {
    try {
      const schoolId = user?.teacher?.schoolId || user?.schoolId;
      if (schoolId) {
        // Fetch all classes to extract unique grade levels
        const response = await classService.getBySchool(schoolId, { limit: 1000 });
        if (response.success && response.data && Array.isArray(response.data)) {
          // Extract unique grade levels
          const uniqueGradeLevels = [...new Set(response.data.map(cls => cls.gradeLevel))];
          const sorted = uniqueGradeLevels
            .filter(gl => gl) // Remove null/undefined
            .sort((a, b) => {
              // Sort numerically if they're numbers, otherwise alphabetically
              const aNum = parseInt(a);
              const bNum = parseInt(b);
              return isNaN(aNum) ? a.localeCompare(b) : aNum - bNum;
            });
          setGradeLevels(sorted);
        }
      }
    } catch (error) {
      console.error('Error fetching grade levels:', error);
      // Continue without grade levels - show all classes instead
    }
  }, [user]);

  /**
   * Fetch classes filtered by grade level
   */
  const fetchClasses = useCallback(async () => {
    try {
      const schoolId = user?.teacher?.schoolId || user?.schoolId;
      if (schoolId) {
        // If a grade level is selected, filter by that grade level
        const params = { limit: 1000 };
        if (selectedGradeLevel) {
          params.gradeLevel = selectedGradeLevel;
        }

        const response = await classService.getBySchool(schoolId, params);
        if (response.success && response.data) {
          setClasses(response.data || []);
          // Reset selected class when grade level changes
          setSelectedClass(null);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      showError(t('errorFetchingClasses', 'Failed to fetch classes'));
    }
  }, [user, selectedGradeLevel, showError, t]);

  /**
   * Fetch all students from school using school API with pagination
   * Pagination is controlled by the API response
   */
  const fetchAllStudents = useCallback(async (page = 1, pageSize = 10) => {
    try {
      let studentsList = [];
      const schoolId = user?.teacher?.schoolId || user?.schoolId;

      if (selectedClass && schoolId) {
        // Send page and limit to API, let API handle pagination
        const apiParams = {
          classId: selectedClass,
          page: page,
          limit: pageSize
        };

        console.log('Fetching students with pagination params:', apiParams);

        const response = await studentService.getStudentsBySchoolClasses(schoolId, apiParams);

        console.log('API Response - Total:', response.total, 'Pages:', response.pages, 'Limit:', response.limit);

        if (response.success) {
          studentsList = response.data || [];

          // Update pagination info from API response
          // API should return: total, pages, page, limit, or similar fields
          const total = response.total || response.data?.length || 0;
          const totalPages = response.pages || response.totalPages || Math.ceil(total / (response.limit || pageSize)) || 1;
          const apiPageSize = response.limit || pageSize;
          const currentPage = response.page || page || 1;

          console.log('Pagination state updated:', { currentPage, pageSize: apiPageSize, totalStudents: total, totalPages });

          setPagination(prev => ({
            ...prev,
            currentPage: currentPage,
            pageSize: apiPageSize,
            totalStudents: total,
            totalPages: totalPages,
            allStudents: studentsList
          }));
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

      // Fetch students for the current page with limit (pagination handled by API)
      const studentsList = await fetchAllStudents(page, 10);

      // Fetch exam records for each student using the new endpoint
      const studentRecordsMap = new Map();

      for (const student of studentsList) {
        try {
          // Extract userId from nested user object or use direct id
          // Response structure: { studentId, user: { id, username, first_name, last_name, ... }, class, ... }
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
            // Optionally add date filters:
            // startDate: '2025-01-01',
            // endDate: '2025-12-31'
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
  }, [selectedClass, startLoading, stopLoading, t, fetchAllStudents]);

  /**
   * Initial load - fetch grade levels
   */
  useEffect(() => {
    fetchGradeLevels();
  }, [fetchGradeLevels]);

  /**
   * Fetch classes when grade level changes
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
   * Get status badge
   */
  const getStatusBadge = (status, passed) => {
    switch (status) {
      case 'COMPLETED':
        return passed ? (
          <Badge color="green" variant="solid" size="sm" className="gap-1">
            <CheckCircle className="w-3 h-3" />
            {t('completed', 'Completed')}
          </Badge>
        ) : (
          <Badge color="red" variant="solid" size="sm" className="gap-1">
            <XCircle className="w-3 h-3" />
            {t('failed', 'Failed')}
          </Badge>
        );
      case 'IN_PROGRESS':
        return (
          <Badge color="yellow" variant="solid" size="sm" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            {t('inProgress', 'In Progress')}
          </Badge>
        );
      default:
        return (
          <Badge color="gray" variant="solid" size="sm">
            {status}
          </Badge>
        );
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  /**
   * Format time duration
   */
  const formatDuration = (seconds) => {
    if (!seconds) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  /**
   * Download certificate
   */
  const handleDownloadCertificate = async (record) => {
    if (!record.certificateFile) {
      showError(t('noCertificateAvailable', 'No certificate available'));
      return;
    }

    try {
      window.open(record.certificateFile, '_blank');
      showSuccess(t('certificateOpened', 'Certificate opened'));
    } catch (error) {
      console.error('Error opening certificate:', error);
      showError(t('errorOpeningCertificate', 'Failed to open certificate'));
    }
  };

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
                  {t('viewAllStudentExams', 'View exam records for all students in the school')}
                </p>
              </div>
            </div>
            <div className="mt-6">
              {/* Primary Filters: Grade Level, Class, Search */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                {/* Grade Level Filter */}
                {gradeLevels.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('gradeLevel', 'Grade Level')}
                    </label>
                    <Dropdown
                      value={selectedGradeLevel || ''}
                      onValueChange={(value) => setSelectedGradeLevel(value || null)}
                      options={[
                        { value: '', label: t('allGradeLevels', 'All Grades') },
                        ...gradeLevels.map(level => ({
                          value: level,
                          label: `${t('grade', 'Grade')} ${level}`
                        }))
                      ]}
                      placeholder={t('selectGradeLevel', 'Select Grade Level')}
                      className='w-full'
                    />
                  </div>
                )}

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
                    placeholder={t('searchExams', 'Search by exam, subject, or student...')}
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
