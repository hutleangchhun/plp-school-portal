import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { PageLoader } from '../../components/ui/DynamicLoader';
import { Button } from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Tooltip } from '../../components/ui/Tooltip';
import Dropdown from '../../components/ui/Dropdown';
import Table from '../../components/ui/Table';
import SidebarFilter from '../../components/ui/SidebarFilter';
import { DatePickerWithDropdowns } from '../../components/ui/date-picker-with-dropdowns';
import {
  ChevronLeft,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Filter,
  Eye,
  X
} from 'lucide-react';
import { examHistoryService } from '../../utils/api/services/examHistoryService';
import { subjectService } from '../../utils/api/services/subjectService';
import { decryptId } from '../../utils/encryption';

/**
 * StudentExamRecordsPage Component
 * Displays exam records for a specific student as a full page
 */
export default function StudentExamRecordsPage({ user }) {
  const { t } = useLanguage();
  const { userId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [student, setStudent] = useState(null);
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFilterLoading, setIsFilterLoading] = useState(false);

  // Page state
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch subjects data
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setSubjectsLoading(true);
        const response = await subjectService.getAll({ limit: 1000 });

        if (response.success && response.data) {
          setSubjects(Array.isArray(response.data) ? response.data : []);
        }
      } catch (err) {
        console.error('Error fetching subjects:', err);
        // Don't block the page if subjects fail to load
        setSubjects([]);
      } finally {
        setSubjectsLoading(false);
      }
    };

    fetchSubjects();
  }, []);

  // Fetch student exam data
  useEffect(() => {
    const fetchStudentExams = async () => {
      try {
        // If this is the initial load with location.state and no filters are applied, use location.state
        const hasFiltersApplied = statusFilter !== 'ALL' || subjectFilter || startDate || endDate;

        if (location.state?.student && !hasFiltersApplied) {
          // Initial load without filters - use location.state data
          setLoading(true);
          setStudent(location.state.student);
          setExams(location.state.exams || []);
          setLoading(false);
        } else {
          // Either filtering is active OR accessing via direct URL
          // Use separate loading state for filtered requests to not block the page
          const isInitialLoad = !exams.length && !student;
          if (isInitialLoad) {
            setLoading(true);
          } else {
            setIsFilterLoading(true);
          }

          // Always make API call with filters
          if (userId) {
            // Decrypt the encrypted user ID from the URL
            const decryptedUserId = decryptId(userId);

            if (!decryptedUserId) {
              setError('Invalid or corrupted exam records link');
              if (isInitialLoad) {
                setLoading(false);
              } else {
                setIsFilterLoading(false);
              }
              return;
            }

            // Build backend filter parameters
            const filterParams = {
              examType: 'exam'
            };

            // Add status filter if not ALL
            if (statusFilter !== 'ALL') {
              filterParams.status = statusFilter;
            }

            // Add subject filter if selected
            if (subjectFilter) {
              filterParams.subjectId = subjectFilter;
            }

            // Add date filters if selected (format as YYYY-MM-DD)
            if (startDate) {
              const startDateStr = startDate.toISOString().split('T')[0];
              filterParams.startDate = startDateStr;
            }

            if (endDate) {
              const endDateStr = endDate.toISOString().split('T')[0];
              filterParams.endDate = endDateStr;
            }

            // Fetch exams with filters from backend
            const response = await examHistoryService.getUserExamHistoryFiltered(
              decryptedUserId,
              filterParams
            );

            const examsData = Array.isArray(response.data) ? response.data : (response.data ? [response.data] : []);

            // Create a basic student object from the exams data if available
            if (examsData.length > 0 && examsData[0].student) {
              setStudent(examsData[0].student);
            }
            setExams(examsData);
            setError(null);
          }
        }
      } catch (err) {
        console.error('Error fetching student exams:', err);
        setError(err?.response?.data?.message || 'Failed to fetch exam records');
      } finally {
        setLoading(false);
        setIsFilterLoading(false);
      }
    };

    fetchStudentExams();
  }, [userId, location.state, statusFilter, subjectFilter, startDate, endDate, exams.length, student]);

  const handleClose = () => {
    // Navigate back to appropriate exam records list based on user role
    // Director: roleId = 14, Teacher: roleId = 8
    const isDirector = user?.roleId === 14;
    if (isDirector) {
      navigate('/exam-records');
    } else {
      navigate('/my-students-exams');
    }
  };

  /**
   * Clear all filters and reset to defaults
   */
  const handleClearFilters = () => {
    setStatusFilter('ALL');
    setSubjectFilter('');
    setStartDate(null);
    setEndDate(null);
    setSearchTerm('');
  };

  /**
   * Check if any filters are currently applied
   */
  const hasActiveFilters = statusFilter !== 'ALL' || subjectFilter || startDate || endDate || searchTerm.trim() !== '';

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
   * Format time taken (hh:mm:ss format)
   */
  const formatTimeTaken = (seconds) => {
    if (!seconds || seconds <= 0) return '-';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const pad = (num) => String(num).padStart(2, '0');

    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
    }
    return `${pad(minutes)}:${pad(secs)}`;
  };

  /**
   * Get color based on grade and score
   */
  const getGradeColor = (grade, percentage) => {
    // If grade exists, use it for color determination
    if (grade) {
      const gradeUpper = grade.toUpperCase();
      if (gradeUpper === 'A' || gradeUpper === 'A+') return 'text-green-600';
      if (gradeUpper === 'B' || gradeUpper === 'B+') return 'text-emerald-600';
      if (gradeUpper === 'C' || gradeUpper === 'C+') return 'text-yellow-600';
      if (gradeUpper === 'D' || gradeUpper === 'D+') return 'text-orange-600';
      if (gradeUpper === 'F') return 'text-red-600';
    }

    // Fallback to percentage if grade is not available
    if (percentage !== undefined && percentage !== null) {
      if (percentage >= 90) return 'text-green-600';
      if (percentage >= 80) return 'text-emerald-600';
      if (percentage >= 70) return 'text-yellow-600';
      if (percentage >= 60) return 'text-orange-600';
      return 'text-red-600';
    }

    return 'text-blue-600';
  };

  /**
   * Get background color based on grade and score
   */
  const getGradeBgColor = (grade, percentage) => {
    // If grade exists, use it for background color determination
    if (grade) {
      const gradeUpper = grade.toUpperCase();
      if (gradeUpper === 'A' || gradeUpper === 'A+') return 'bg-green-50';
      if (gradeUpper === 'B' || gradeUpper === 'B+') return 'bg-emerald-50';
      if (gradeUpper === 'C' || gradeUpper === 'C+') return 'bg-yellow-50';
      if (gradeUpper === 'D' || gradeUpper === 'D+') return 'bg-orange-50';
      if (gradeUpper === 'F') return 'bg-red-50';
    }

    // Fallback to percentage if grade is not available
    if (percentage !== undefined && percentage !== null) {
      if (percentage >= 90) return 'bg-green-50';
      if (percentage >= 80) return 'bg-emerald-50';
      if (percentage >= 70) return 'bg-yellow-50';
      if (percentage >= 60) return 'bg-orange-50';
      return 'bg-red-50';
    }

    return 'bg-gray-50';
  };

  /**
   * Translate exam type value to Khmer
   */
  const getExamTypeLabel = (examType) => {
    const examTypeMap = {
      'exam': t('examTypeExam', 'ការប្រលង'),
      'test': t('examTypeTest', 'ការធ្វើតេស្ត'),
      'quiz': t('examTypeQuiz', 'សាកល្បង')
    };
    return examTypeMap[examType?.toLowerCase()] || examType || '-';
  };

  /**
   * Download certificate
   */
  const handleDownloadCertificate = (record) => {
    if (!record.certificateFile) {
      return;
    }
    try {
      window.open(record.certificateFile, '_blank');
    } catch (error) {
      console.error('Error opening certificate:', error);
    }
  };

  /**
   * Open exam details modal
   */
  const handleViewDetails = (exam) => {
    setSelectedExam(exam);
    setIsModalOpen(true);
  };

  /**
   * Close exam details modal
   */
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedExam(null);
  };

  /**
   * Process and filter exams (frontend filtering as fallback)
   * Note: Subject filtering is already done by backend, so we only do status and search
   */
  const processedExams = useMemo(() => {
    let filtered = [...exams];

    // Filter by status (in case backend doesn't filter perfectly)
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(exam => exam.status === statusFilter);
    }

    // Filter by search term (frontend only - for immediate feedback)
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(exam =>
        exam.examTitle?.toLowerCase().includes(search) ||
        exam.subjectName?.toLowerCase().includes(search) ||
        exam.subjectKhmerName?.toLowerCase().includes(search)
      );
    }

    return filtered;
  }, [exams, statusFilter, searchTerm]);

  // Get student name
  const firstName = student?.user?.first_name || student?.firstName || '';
  const lastName = student?.user?.last_name || student?.lastName || '';
  const studentName = `${firstName} ${lastName}`.trim() || '-';

  // Build subject filter options
  const subjectFilterOptions = useMemo(() => {
    const options = [{ value: '', label: t('allSubjects', 'All Subjects') }];

    if (subjects && Array.isArray(subjects)) {
      subjects.forEach(subject => {
        options.push({
          value: subject.id?.toString() || subject.name,
          label: subject.khmer_name || subject.name || 'Unknown'
        });
      });
    }

    return options;
  }, [subjects, t]);

  // Memoize header section to prevent unnecessary re-renders
  const headerSection = useMemo(() => (
    <div className="">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
            {t('examRecords', 'Exam Records')}
          </h1>
          <p className="text-base font-medium text-gray-600 mt-2">{t('studentName', 'Student Name')}: {studentName}</p>
        </div>
      </div>
    </div>
  ), [studentName, t, handleClose]);

  // Memoize search and filter button section
  const searchFilterSection = useMemo(() => (
    <div className="">
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        {/* Search */}
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('search', 'Search')}
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t('search', 'Search ...')}
            className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filter Button - Responsive (works on all screen sizes) */}
        <Button
          onClick={() => setSidebarOpen(true)}
          variant="primary"
          size="sm"
          className="flex items-center justify-center sm:justify-start gap-2 shadow-lg"
          title={t('filters', 'Exam Filters')}
        >
          <Filter className="h-4 w-4" />
          <span className="sm:hidden">{t('filters', 'Filters & Actions')}</span>
          <span className="hidden sm:inline">{t('filters', 'Filters')}</span>
          {(searchTerm || statusFilter !== 'ALL' || subjectFilter || startDate || endDate) && (
            <span className="ml-auto sm:ml-1 bg-white text-blue-600 text-xs font-bold px-2.5 sm:px-2 py-0.5 rounded-full">
              {(searchTerm ? 1 : 0) + (statusFilter !== 'ALL' ? 1 : 0) + (subjectFilter ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0)}
            </span>
          )}
        </Button>
      </div>
    </div>
  ), [searchTerm, hasActiveFilters, t]);

  // Memoize table section - only re-render when data or config changes
  const tableSection = useMemo(() => (
    <div className="relative">
      {isFilterLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-10 rounded-lg">
          <div className="text-center">
            <div className="inline-block">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <p className="mt-2 text-sm text-gray-600">{t('updatingResults', 'Updating results...')}</p>
          </div>
        </div>
      )}
      <Table
        columns={[
          {
            header: t('examTitle', 'Exam Title'),
            accessor: 'examTitle',
            render: (exam) => (
              <div>
                <p className="font-medium text-gray-900">{exam.examTitle || '-'}</p>
              </div>
            )
          },
          {
            header: t('examType', 'Exam Type'),
            accessor: 'examType',
            render: (exam) => (
              <div>
                <p className="font-medium text-gray-900">{getExamTypeLabel(exam.examType)}</p>
              </div>
            )
          },
          {
            header: t('subject', 'Subject'),
            accessor: 'subjectKhmerName',
            render: (exam) => (
              <div>
                <p className="font-medium text-gray-900">
                  {exam.subjectKhmerName || exam.subjectName || '-'}
                </p>
              </div>
            )
          },
          {
            header: t('score', 'Score'),
            accessor: 'percentage',
            render: (exam) => (
              <div>
                <p className="font-medium text-gray-900">
                  {exam.percentage !== undefined && exam.percentage !== null
                    ? `${exam.percentage}%`
                    : exam.score !== undefined && exam.score !== null
                    ? `${exam.score}/${exam.totalScore || 100}`
                    : '-'}
                </p>
              </div>
            )
          },
          {
            header: t('gradeLevel', 'Grade Level'),
            accessor: 'letterGrade',
            render: (exam) => (
              <div>
                <p className="font-medium text-gray-900 text-start">
                  {exam.letterGrade || '-'}
                </p>
              </div>
            )
          },
          {
            header: t('duration', 'Duration'),
            accessor: 'timeTaken',
            render: (exam) => (
              <div>
                <p className="font-medium text-gray-900">{formatTimeTaken(exam.timeTaken)}</p>
              </div>
            )
          },
          {
            header: t('status', 'Status'),
            accessor: 'status',
            disableSort: true,
            render: (exam) => (
              <div className="space-y-2">
                {getStatusBadge(exam.status, exam.passed)}
              </div>
            )
          },
          {
            header: t('details', 'Details'),
            accessor: 'id',
            disableSort: true,
            render: (exam) => (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(exam)}
                  title={t('viewDetails', 'View Details')}
                >
                  <Eye className="w-3 h-3" />
                </Button>
                {exam.certificateFile && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadCertificate(exam)}
                    title={t('downloadCertificate', 'Download Certificate')}
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                )}
              </div>
            )
          }
        ]}
        data={processedExams}
        emptyMessage={t('noExamRecords', 'No exam records found')}
        t={t}
      />
    </div>
  ), [processedExams, t, formatDuration, formatTimeTaken, getStatusBadge, handleDownloadCertificate, handleViewDetails, isFilterLoading]);

  // Memoize sidebar filter content to prevent re-rendering when filters change
  const sidebarFilterContent = useMemo(() => (
    <div className="space-y-4">
      {/* Status Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('status', 'Status')}
        </label>
        <Dropdown
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={[
            { value: 'ALL', label: t('allStatuses', 'All Statuses') },
            { value: 'COMPLETED', label: t('completed', 'Completed') },
            { value: 'IN_PROGRESS', label: t('inProgress', 'In Progress') }
          ]}
          className='w-full'
        />
      </div>

      {/* Subject Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('subject', 'Subject')}
        </label>
        <Dropdown
          value={subjectFilter}
          onValueChange={setSubjectFilter}
          options={subjectFilterOptions}
          disabled={subjectsLoading}
          className='w-full'
        />
      </div>

      {/* Start Date Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('startDate', 'Start Date')}
        </label>
        <DatePickerWithDropdowns
          value={startDate}
          onChange={setStartDate}
          placeholder={t('selectStartDate', 'Select start date')}
          className="w-full"
        />
      </div>

      {/* End Date Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('endDate', 'End Date')}
        </label>
        <DatePickerWithDropdowns
          value={endDate}
          onChange={setEndDate}
          placeholder={t('selectEndDate', 'Select end date')}
          className="w-full"
        />
      </div>
    </div>
  ), [statusFilter, subjectFilter, startDate, endDate, subjectFilterOptions, t]);

  // Show loading state
  if (loading) {
    return (
      <PageTransition variant="fade" className="flex-1">
        <PageLoader message={t('loadingExamRecords', 'Loading exam records...')} />
      </PageTransition>
    );
  }

  // Show error state
  if (error) {
    return (
      <PageTransition variant="fade" className="flex-1">
        <div className="p-3 sm:p-6">
          <FadeInSection>
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
            </div>
          </FadeInSection>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition variant="fade" className="flex-1">
      <div className="p-3 sm:p-6">
        <Button
            variant="link"
            onClick={handleClose}
            className="flex items-center gap-2 mb-4"
          >
            <ChevronLeft className="w-4 h-4" />
            {t('goBack', 'Back')}
          </Button>
        <FadeInSection>
          <div className="w-full border p-6 rounded-lg mb-4">
            {/* Header */}
            {headerSection}
            {/* Search Bar and Filter Button */}
            {searchFilterSection}
          </div>
        </FadeInSection>
          {/* Exam Records Table */}
          {tableSection}
      </div>

      {/* Sidebar Filter */}
      <SidebarFilter
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        title={t('filters', 'Exam Filters')}
        subtitle={t('filterByActionBelow', 'Filter By Action Below')}
        hasFilters={hasActiveFilters}
        onClearFilters={handleClearFilters}
        onApply={() => { }}
        children={sidebarFilterContent}
      />

      {/* Exam Details Modal */}
      {isModalOpen && selectedExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={handleCloseModal}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{t('examDetails', 'Exam Details')}</h2>
                <p className="text-blue-100 text-sm mt-1">{selectedExam.examTitle}</p>
              </div>
              <Button
                onClick={handleCloseModal}
                variant="ghost"
                size="icon"
                className="text-blue-100 hover:text-white hover:bg-blue-700"
              >
                <X className="h-6 w-6" />
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('examTitle', 'Exam Title')}</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedExam.examTitle || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('subject', 'Subject')}</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedExam.subjectKhmerName || selectedExam.subjectName || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('examType', 'Exam Type')}</p>
                  <p className="text-lg font-semibold text-gray-900">{getExamTypeLabel(selectedExam.examType)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('status', 'Status')}</p>
                  <div className="mt-1">{getStatusBadge(selectedExam.status, selectedExam.passed)}</div>
                </div>
              </div>

              {/* Score & Grade */}
              <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-lg ${getGradeBgColor(selectedExam.letterGrade, selectedExam.percentage)}`}>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('score', 'Score')}</p>
                  <p className={`text-2xl font-bold ${getGradeColor(selectedExam.letterGrade, selectedExam.percentage)}`}>
                    {selectedExam.percentage !== undefined && selectedExam.percentage !== null
                      ? `${selectedExam.percentage}%`
                      : selectedExam.score !== undefined && selectedExam.score !== null
                      ? `${selectedExam.score}/${selectedExam.totalScore || 100}`
                      : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('gradeLevel', 'Grade Level')}</p>
                  <p className={`text-2xl font-bold ${getGradeColor(selectedExam.letterGrade, selectedExam.percentage)}`}>{selectedExam.letterGrade || '-'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('time', 'Time')}</p>
                  <p className="text-2xl font-bold text-gray-700">{formatTimeTaken(selectedExam.timeTaken)}</p>
                </div>
              </div>

              {/* Question Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-gray-600">{t('correct', 'Correct')}</p>
                  <p className="text-2xl font-bold text-green-600">{selectedExam.correctAnswers || 0}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-gray-600">{t('incorrect', 'Incorrect')}</p>
                  <p className="text-2xl font-bold text-red-600">{selectedExam.incorrectAnswers || 0}</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm text-gray-600">{t('skipped', 'Skipped')}</p>
                  <p className="text-2xl font-bold text-yellow-600">{selectedExam.skippedQuestions || 0}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-gray-600">{t('total', 'Total')}</p>
                  <p className="text-2xl font-bold text-blue-600">{selectedExam.totalQuestions || 0}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t p-6 flex gap-2 justify-end bg-gray-50">
              {selectedExam.certificateFile && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    handleDownloadCertificate(selectedExam);
                  }}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {t('downloadCertificate', 'Download Certificate')}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleCloseModal}
              >
                {t('close', 'Close')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </PageTransition>
  );
}
