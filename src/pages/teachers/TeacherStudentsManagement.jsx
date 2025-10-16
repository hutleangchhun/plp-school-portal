import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Download, ChevronDown, X, Users } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import { Button } from '../../components/ui/Button';
import { studentService } from '../../utils/api/services/studentService';
import { classService } from '../../utils/api/services/classService';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Badge } from '../../components/ui/Badge';
import { Table, MobileCards } from '../../components/ui/Table';
import { prepareAndExportExcel, prepareAndExportCSV, prepareAndExportPDF, getTimestampedFilename } from '../../utils/exportUtils';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';

/**
 * TeacherStudentsManagement Component
 * Displays and manages students for teachers across their assigned classes
 * Uses the getMyStudents endpoint which is scoped to the logged-in teacher
 */
export default function TeacherStudentsManagement({ user }) {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError } = useErrorHandler();
  const { startLoading, stopLoading, isLoading } = useLoading();

  // State for students list and pagination
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // State for classes information
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('all');

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);

  const fetchingRef = useRef(false);
  const searchTimeoutRef = useRef(null);
  const classesInitialized = useRef(false);

  // Memoize class dropdown options
  const classDropdownOptions = useMemo(() => {
    return [
      { value: 'all', label: t('allClasses', 'All Classes') },
      ...classes.map(cls => ({
        value: String(cls.classId || cls.id),
        label: cls.name
      }))
    ];
  }, [classes, t]);

  // Initialize classes for the teacher
  const initializeClasses = useCallback(async () => {
    if (classesInitialized.current || !user?.id) {
      return;
    }

    try {
      console.log('Fetching classes for user:', user.id);
      const response = await classService.getClassByUser(user.id);

      if (response.success && Array.isArray(response.classes)) {
        setClasses(response.classes);
        classesInitialized.current = true;
        console.log('Loaded', response.classes.length, 'classes for teacher');
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      handleError(err, {
        toastMessage: t('failedToFetchClasses', 'Failed to fetch classes')
      });
    }
  }, [user, handleError, t]);

  // Fetch students using getMyStudents
  const fetchStudents = useCallback(async (page = 1, classFilter = selectedClassId, search = searchTerm) => {
    if (fetchingRef.current || !user) {
      console.log('Skipping fetch - already fetching or no user');
      return;
    }

    try {
      fetchingRef.current = true;
      startLoading('students');

      const params = {
        page,
        limit: pagination.limit,
        search: search.trim()
      };

      // Add class filter if not "all"
      if (classFilter && classFilter !== 'all') {
        params.classId = classFilter;
      }

      console.log('Fetching students with params:', params);
      const response = await studentService.getMyStudents(params);

      if (response.success) {
        setStudents(response.data || []);
        setPagination(response.pagination || {
          page,
          limit: pagination.limit,
          total: response.data?.length || 0,
          pages: 1
        });
        console.log(`Loaded ${response.data?.length || 0} students`);
      } else {
        showError(t('failedToFetchStudents', 'Failed to fetch students'));
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      handleError(err, {
        toastMessage: t('failedToFetchStudents', 'Failed to fetch students')
      });
    } finally {
      fetchingRef.current = false;
      stopLoading('students');
      setInitialLoading(false);
    }
  }, [user, selectedClassId, searchTerm, pagination.limit, startLoading, stopLoading, showError, handleError, t]);

  // Debounced search handler
  const handleSearchChange = useCallback((value) => {
    setLocalSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500);
  }, []);

  // Handle class filter change
  const handleClassFilterChange = useCallback((classId) => {
    setSelectedClassId(classId);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);

  // Export handlers
  const handleExportExcel = useCallback(async () => {
    try {
      const filename = getTimestampedFilename('my-students', 'xlsx');
      await prepareAndExportExcel(students, filename, t);
      showSuccess(t('exportSuccess', 'Data exported successfully'));
    } catch (err) {
      console.error('Export error:', err);
      showError(t('exportFailed', 'Failed to export data'));
    }
    setShowExportDropdown(false);
  }, [students, showSuccess, showError, t]);

  const handleExportCSV = useCallback(async () => {
    try {
      const filename = getTimestampedFilename('my-students', 'csv');
      await prepareAndExportCSV(students, filename, t);
      showSuccess(t('exportSuccess', 'Data exported successfully'));
    } catch (err) {
      console.error('Export error:', err);
      showError(t('exportFailed', 'Failed to export data'));
    }
    setShowExportDropdown(false);
  }, [students, showSuccess, showError, t]);

  const handleExportPDF = useCallback(async () => {
    try {
      const filename = getTimestampedFilename('my-students', 'pdf');
      await prepareAndExportPDF(students, filename, t);
      showSuccess(t('exportSuccess', 'Data exported successfully'));
    } catch (err) {
      console.error('Export error:', err);
      showError(t('exportFailed', 'Failed to export data'));
    }
    setShowExportDropdown(false);
  }, [students, showSuccess, showError, t]);

  // Initialize classes on mount
  useEffect(() => {
    initializeClasses();
  }, [initializeClasses]);

  // Fetch students when filters change
  useEffect(() => {
    if (classesInitialized.current) {
      fetchStudents(pagination.page, selectedClassId, searchTerm);
    }
  }, [pagination.page, selectedClassId, searchTerm, fetchStudents]);

  // Table columns configuration
  const columns = [
    {
      key: 'studentId',
      label: t('studentId', 'Student ID'),
      sortable: true,
      render: (student) => (
        <span className="font-medium text-gray-900">{student.studentId || student.id}</span>
      )
    },
    {
      key: 'name',
      label: t('studentName', 'Student Name'),
      sortable: true,
      render: (student) => (
        <div className="flex items-center">
          <div>
            <div className="font-medium text-gray-900">{student.name}</div>
            <div className="text-xs text-gray-500">{student.username}</div>
          </div>
        </div>
      )
    },
    {
      key: 'class',
      label: t('class', 'Class'),
      sortable: true,
      render: (student) => (
        <Badge variant="secondary">
          {student.class?.name || t('noClass', 'No Class')}
        </Badge>
      )
    },
    {
      key: 'gradeLevel',
      label: t('gradeLevel', 'Grade'),
      sortable: true,
      render: (student) => student.class?.gradeLevel || student.gradeLevel || '-'
    },
    {
      key: 'gender',
      label: t('gender', 'Gender'),
      sortable: true,
      render: (student) => {
        const gender = student.gender;
        if (!gender) return '-';
        return gender === 'MALE' ? t('male', 'Male') : t('female', 'Female');
      }
    },
    {
      key: 'status',
      label: t('status', 'Status'),
      sortable: true,
      render: (student) => (
        <Badge variant={student.isActive ? 'success' : 'danger'}>
          {student.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
        </Badge>
      )
    }
  ];

  // Mobile card renderer
  const renderMobileCard = (student) => (
    <div className="bg-white p-4 rounded-lg shadow space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <div className="font-medium text-gray-900">{student.name}</div>
          <div className="text-xs text-gray-500">{student.username}</div>
        </div>
        <Badge variant={student.isActive ? 'success' : 'danger'}>
          {student.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
        </Badge>
      </div>
      <div className="text-sm text-gray-600">
        <div><span className="font-medium">{t('studentId', 'ID')}:</span> {student.studentId || student.id}</div>
        <div><span className="font-medium">{t('class', 'Class')}:</span> {student.class?.name || '-'}</div>
        <div><span className="font-medium">{t('gradeLevel', 'Grade')}:</span> {student.class?.gradeLevel || student.gradeLevel || '-'}</div>
        <div><span className="font-medium">{t('gender', 'Gender')}:</span> {student.gender || '-'}</div>
      </div>
    </div>
  );

  if (initialLoading) {
    return <PageLoader message={t('loadingStudents', 'Loading students...')} />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={() => { clearError(); fetchStudents(); }} />;
  }

  return (
    <PageTransition>
      <div className="container mx-auto px-4 py-6">
        <FadeInSection>
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  <Users className="inline-block h-7 w-7 mr-2 text-blue-600" />
                  {t('myStudents', 'My Students')}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {t('manageYourStudents', 'View and manage students in your classes')}
                </p>
              </div>
            </div>
          </div>

          {/* Filters and Actions */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 w-full sm:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder={t('searchStudents', 'Search students...')}
                  value={localSearchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {localSearchTerm && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Class Filter */}
              {classes.length > 0 && (
                <div className="w-full sm:w-auto">
                  <select
                    value={selectedClassId}
                    onChange={(e) => handleClassFilterChange(e.target.value)}
                    className="block w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  >
                    {classDropdownOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Export Dropdown */}
              <div className="relative">
                <Button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  variant="outline"
                  size="default"
                  disabled={students.length === 0}
                >
                  <Download className="h-5 w-5 mr-2" />
                  <span>{t('export', 'Export')}</span>
                  <ChevronDown className="h-4 w-4 ml-1" />
                </Button>

                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <button
                        onClick={handleExportExcel}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        {t('exportToExcel', 'Export to Excel')}
                      </button>
                      <button
                        onClick={handleExportCSV}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        {t('exportToCSV', 'Export to CSV')}
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                      >
                        {t('exportToPDF', 'Export to PDF')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Students Count */}
          <div className="mb-4 text-sm text-gray-600">
            {t('totalStudents', 'Total Students')}: <span className="font-semibold">{pagination.total || 0}</span>
            {selectedClassId !== 'all' && (
              <span className="ml-2">
                ({t('filtered', 'Filtered')})
              </span>
            )}
          </div>

          {/* Students Table/Cards */}
          {isLoading('students') ? (
            <DynamicLoader message={t('loadingStudents', 'Loading students...')} />
          ) : students.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                {searchTerm || selectedClassId !== 'all'
                  ? t('noStudentsFound', 'No students found matching your criteria')
                  : t('noStudentsYet', 'No students in your classes yet')}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden sm:block">
                <Table
                  data={students}
                  columns={columns}
                  pagination={pagination}
                  onPageChange={handlePageChange}
                />
              </div>

              {/* Mobile Cards */}
              <div className="sm:hidden">
                <MobileCards
                  data={students}
                  renderCard={renderMobileCard}
                  pagination={pagination}
                  onPageChange={handlePageChange}
                />
              </div>
            </>
          )}
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
