import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import { examHistoryService } from '../../utils/api/services/examHistoryService';
import { classService, studentService } from '@/utils/api';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import EmptyState from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Tooltip } from '../../components/ui/Tooltip';
import Dropdown from '../../components/ui/Dropdown';
import {
  BookOpen,
  Calendar,
  Download,
  Filter,
  Search,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';

/**
 * DirectorExamRecords Component
 * Directors can view exam records for all students in the school
 */
export default function DirectorExamRecords({ user }) {
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();
  const { startLoading, stopLoading } = useLoading();

  // State
  const [studentRecords, setStudentRecords] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Fetch all classes for the school
   */
  const fetchClasses = useCallback(async () => {
    try {
      if (user?.schoolId) {
        const response = await classService.getBySchool(user.schoolId, { limit: 10 });
        if (response.success && response.data) {
          setClasses(response.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      showError(t('errorFetchingClasses', 'Failed to fetch classes'));
    }
  }, [user, showError, t]);

  /**
   * Fetch all students from school using school API
   */
  const fetchAllStudents = useCallback(async () => {
    try {
      let studentsList = [];

      if (selectedClass && user?.schoolId) {
        const response = await studentService.getStudentsBySchoolClasses(user.schoolId, {
          classId: selectedClass,
          limit: 10
        });
        if (response.success) {
          studentsList = response.data || [];
        }
      }

      return studentsList;
    } catch (error) {
      console.error('Error fetching students:', error);
      return [];
    }
  }, [selectedClass, user]);

  /**
   * Fetch exam records
   */
  const fetchExamRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      startLoading('fetchExamRecords', t('loadingExamRecords', 'Loading exam records...'));

      let allRecords = [];

      if (selectedClass) {
        const response = await examHistoryService.getClassExamHistory(selectedClass);
        if (response.success) {
          allRecords = response.data || [];
        }
      } else {
        // Fetch all records
        const response = await examHistoryService.getAllStudentsExamHistory();
        if (response.success) {
          allRecords = response.data || [];
        }
      }

      // Fetch all students
      const studentsList = await fetchAllStudents();

      // Merge students with their exam records
      const merged = studentsList.map(student => {
        const studentExams = allRecords.filter(record => record.userId === student.id);
        return {
          student: student,
          exams: studentExams,
          hasRecords: studentExams.length > 0
        };
      });

      setStudentRecords(merged);
    } catch (error) {
      console.error('Error fetching exam records:', error);
      setError(error?.response?.data?.message || t('errorFetchingExamRecords', 'Failed to fetch exam records'));
    } finally {
      setLoading(false);
      stopLoading('fetchExamRecords');
    }
  }, [selectedClass, startLoading, stopLoading, t, fetchAllStudents]);

  /**
   * Initial load
   */
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  /**
   * Load exam records when class is selected
   */
  useEffect(() => {
    if (selectedClass) {
      fetchExamRecords();
    }
  }, [fetchExamRecords, selectedClass]);

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
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-3 sm:p-6">
        {/* Header */}
        <FadeInSection className="mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              ) : studentRecords.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title={t('noStudents', 'No Students')}
                  description={t('noStudentsDesc', 'No students found in the selected class')}
                  action={
                    <Button onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('ALL');
                    }}>
                      {t('clearFilters', 'Clear Filters')}
                    </Button>
                  }
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          {t('student', 'Student')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          {t('exam', 'Exam')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          {t('subject', 'Subject')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          {t('grade', 'Grade')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          {t('status', 'Status')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          {t('score', 'Score')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          {t('date', 'Date')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          {t('duration', 'Duration')}
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          {t('actions', 'Actions')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {studentRecords
                        .filter(sr => {
                          // Apply search filter
                          if (searchTerm.trim()) {
                            const search = searchTerm.toLowerCase();
                            const studentName = `${sr.student.firstName || ''} ${sr.student.lastName || ''}`.toLowerCase();
                            const hasMatchInStudent = studentName.includes(search);
                            const hasMatchInExams = sr.exams.some(exam =>
                              exam.examTitle?.toLowerCase().includes(search) ||
                              exam.subjectName?.toLowerCase().includes(search) ||
                              exam.subjectKhmerName?.toLowerCase().includes(search)
                            );
                            return hasMatchInStudent || hasMatchInExams;
                          }
                          return true;
                        })
                        .map((sr) => {
                          const studentName = `${sr.student.firstName || ''} ${sr.student.lastName || ''}`.trim() || '-';

                          if (!sr.hasRecords) {
                            // Student with no exam records
                            return (
                              <tr key={`student-${sr.student.id}`} className="bg-gray-50 hover:bg-gray-100 transition-colors">
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                                  {studentName}
                                </td>
                                <td colSpan="8" className="px-4 py-3 text-xs text-gray-500">
                                  {t('noExamRecordsForStudent', 'No exam records available')}
                                </td>
                              </tr>
                            );
                          }

                          // Student with exam records - show first exam in student row, then rest below
                          return sr.exams
                            .filter(exam => statusFilter === 'ALL' || exam.status === statusFilter)
                            .map((exam, examIndex) => (
                              <tr
                                key={`exam-${sr.student.id}-${exam.id}-${examIndex}`}
                                className={`${examIndex === 0 ? 'bg-blue-50' : 'bg-white'} hover:bg-gray-50 transition-colors`}
                              >
                                {examIndex === 0 && (
                                  <td rowSpan={sr.exams.filter(e => statusFilter === 'ALL' || e.status === statusFilter).length} className="px-4 py-3 text-sm font-semibold text-gray-900 bg-blue-50">
                                    {studentName}
                                  </td>
                                )}
                                {examIndex > 0 && <td className="px-4 py-3"></td>}
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  <div className="flex flex-col">
                                    <span className="font-medium">{exam.examTitle || '-'}</span>
                                    <span className="text-xs text-gray-500">{exam.examType || ''}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  <div className="flex flex-col">
                                    <span>{exam.subjectName || '-'}</span>
                                    <span className="text-xs text-gray-500">{exam.subjectKhmerName || ''}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {exam.grade || '-'}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {getStatusBadge(exam.status, exam.passed)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {exam.status === 'COMPLETED' ? (
                                    <div className="flex flex-col">
                                      <span className="font-semibold">
                                        {exam.score != null ? `${exam.score}%` : '-'}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {exam.letterGrade || ''}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        {exam.correctAnswers}/{exam.totalQuestions}
                                      </span>
                                    </div>
                                  ) : (
                                    '-'
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  <div className="flex flex-col">
                                    <span>{formatDate(exam.completedAt || exam.startedAt)}</span>
                                    {exam.completedAt && (
                                      <span className="text-xs text-gray-500">
                                        {new Date(exam.completedAt).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {formatDuration(exam.timeTaken)}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {exam.certificateFile && (
                                    <Tooltip content={t('downloadCertificate', 'Download Certificate')}>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleDownloadCertificate(exam)}
                                        className="flex items-center gap-1"
                                      >
                                        <Download className="w-4 h-4" />
                                      </Button>
                                    </Tooltip>
                                  )}
                                </td>
                              </tr>
                            ));
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
