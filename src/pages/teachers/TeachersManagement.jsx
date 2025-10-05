import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Search, Plus, MinusCircle, Edit2, User, Users, ChevronDown, Download, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import { teacherService } from '../../utils/api/services/teacherService';
import { userService } from '../../utils/api/services/userService';
import { useStableCallback, useRenderTracker } from '../../utils/reactOptimization';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Badge } from '../../components/ui/Badge';
import { Table, MobileCards } from '../../components/ui/Table';
import { prepareAndExportExcel, prepareAndExportCSV, prepareAndExportPDF, getTimestampedFilename } from '../../utils/exportUtils';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';

export default function TeachersManagement() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError, retry } = useErrorHandler();

  // Track renders to detect infinite loops (development only)
  useRenderTracker('TeachersManagement');

  // Get authenticated user data
  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      console.error('Error parsing user data from localStorage:', err);
      return null;
    }
  });

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          console.log('🔄 localStorage changed in TeachersManagement, updating user state:', parsedUser);
          setUser(parsedUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error parsing updated user data:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userDataUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated', handleStorageChange);
    };
  }, []);

  // State for current user's school ID
  const [schoolId, setSchoolId] = useState(null);

  // State for teachers list and pagination
  const [teachers, setTeachers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // Other state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedTeachers, setSelectedTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const fetchingRef = useRef(false);
  const lastFetchParams = useRef(null);
  const searchTimeoutRef = useRef(null);

  // State for all teachers (unfiltered) and filtered teachers
  const [allTeachers, setAllTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);

  // Enhanced client-side search function
  const performClientSideSearch = useCallback((teachersData, searchQuery) => {
    if (!searchQuery || searchQuery.trim() === '') {
      return teachersData;
    }

    const query = searchQuery.trim().toLowerCase();

    return teachersData.filter(teacher => {
      const searchFields = [
        teacher.firstName || '',
        teacher.lastName || '',
        teacher.username || '',
        teacher.email || '',
        teacher.phone || '',
        (teacher.name || ''),
        (teacher.firstName && teacher.lastName ? `${teacher.firstName} ${teacher.lastName}` : '')
      ];

      return searchFields.some(field =>
        field.toLowerCase().includes(query)
      );
    });
  }, []);

  // Debounced search handler - triggers server-side search
  const handleSearchChange = useCallback((value) => {
    setLocalSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce server-side search
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
      // Reset to page 1 when searching
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500);
  }, []);

  // Fetch current user's school ID
  const fetchSchoolId = useStableCallback(async () => {
    try {
      if (schoolId) {
        console.log('School ID already available:', schoolId);
        return;
      }

      console.log('Fetching school ID from my-account endpoint...');
      const accountData = await userService.getMyAccount();
      console.log('📥 Full my-account response in TeachersManagement:', accountData);

      if (accountData && accountData.school_id) {
        console.log('✅ School ID fetched from account:', accountData.school_id);
        setSchoolId(accountData.school_id);
      } else {
        console.error('No school_id found in account data:', accountData);
        showError(t('noSchoolIdFound', 'No school ID found for your account'));
        setInitialLoading(false);
      }
    } catch (err) {
      console.error('Error fetching school ID:', err);
      handleError(err, {
        toastMessage: t('failedToFetchSchoolId', 'Failed to fetch school information')
      });
      setInitialLoading(false);
    }
  }, [schoolId, showError, t, handleError]);

  // Fetch teachers from the school
  const fetchTeachers = useStableCallback(async (search = searchTerm, force = false) => {
    if (!schoolId) {
      console.log('No school ID available, skipping teacher fetch...');
      return;
    }

    const currentParams = JSON.stringify({
      search,
      schoolId,
      page: pagination.page,
      limit: pagination.limit
    });

    if (!force && (fetchingRef.current || lastFetchParams.current === currentParams)) {
      console.log('Skipping duplicate fetch with same parameters');
      return;
    }

    fetchingRef.current = true;
    lastFetchParams.current = currentParams;

    try {
      setLoading(true);

      console.log(`=== FETCH TEACHERS ===`);
      console.log(`School ID: ${schoolId}`);
      console.log(`Search term: ${search}`);

      // Build request parameters with search
      const requestParams = {};
      if (search && search.trim()) {
        requestParams.search = search.trim();
      }

      const response = await teacherService.getTeachersBySchool(schoolId, requestParams);

      console.log('=== API RESPONSE (TEACHERS) ===');
      console.log('Full API response:', response);
      console.log('Response success:', response?.success);
      console.log('Response data length:', response?.data?.length);
      console.log('=== END API RESPONSE ===');

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch teachers from school');
      }

      let data = response.data || [];

      console.log(`Fetched ${data.length} teachers from school ${schoolId}`);
      console.log('Raw teacher data:', data);

      // Map backend data structure to component format
      data = data.map(teacher => ({
        id: teacher.teacherId,
        teacherId: teacher.teacherId,
        userId: teacher.userId,
        username: teacher.user?.username || 'N/A',
        firstName: teacher.user?.first_name || '',
        lastName: teacher.user?.last_name || '',
        name: `${teacher.user?.first_name || ''} ${teacher.user?.last_name || ''}`.trim(),
        email: teacher.user?.email || 'N/A',
        phone: teacher.user?.phone || 'N/A',
        schoolId: teacher.schoolId,
        schoolName: teacher.school?.name || 'N/A',
        hireDate: teacher.hire_date,
        isDirector: teacher.isDirector,
        status: teacher.status,
        isActive: teacher.status === 'ACTIVE'
      }));

      console.log('Mapped teacher data:', data);

      // Use server-side filtered data directly (no client-side filtering needed)
      setAllTeachers(data);
      setFilteredTeachers(data);

      // Client-side pagination
      const startIndex = (pagination.page - 1) * pagination.limit;
      const endIndex = startIndex + pagination.limit;
      const paginatedData = data.slice(startIndex, endIndex);

      setTeachers(paginatedData);
      setPagination(prev => ({
        ...prev,
        total: data.length,
        pages: Math.ceil(data.length / prev.limit)
      }));

    } catch (err) {
      console.error('Error fetching teachers from school:', err);
      handleError(err, {
        toastMessage: t('errorFetchingTeachers', 'Failed to fetch teachers')
      });
      setTeachers([]);
      setAllTeachers([]);
      setFilteredTeachers([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [schoolId, searchTerm, pagination.page, pagination.limit, performClientSideSearch, showError, t, handleError]);

  // Initialize school ID and fetch teachers
  useEffect(() => {
    console.log('🔄 Component mounted, fetching school ID...');
    fetchSchoolId();
  }, [fetchSchoolId]);

  // Fetch teachers when school ID becomes available
  useEffect(() => {
    if (schoolId) {
      console.log('School ID available, fetching teachers...');
      fetchTeachers('', true).finally(() => {
        setInitialLoading(false);
      });
    }
  }, [schoolId, fetchTeachers]);

  // Memoized fetch parameters
  const fetchParams = useMemo(() => ({
    searchTerm,
    schoolId,
    page: pagination.page,
    limit: pagination.limit
  }), [searchTerm, schoolId, pagination.page, pagination.limit]);

  // Handle fetch on parameter changes
  useEffect(() => {
    if (!schoolId) return;

    const isSearchChange = fetchParams.searchTerm.trim() !== '';
    const delay = isSearchChange ? 500 : 100;

    const timer = setTimeout(() => {
      if (!fetchingRef.current) {
        fetchTeachers(fetchParams.searchTerm, false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [fetchParams, fetchTeachers, schoolId]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showExportDropdown && !event.target.closest('.export-dropdown')) {
        setShowExportDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown]);

  // Cleanup search timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle page change
  const handlePageChange = (newPage) => {
    console.log(`Changing from page ${pagination.page} to page ${newPage}`);

    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  // Handle delete teacher
  const handleDeleteTeacher = async () => {
    if (!selectedTeacher) {
      showError(t('noTeacherSelected', 'No teacher selected'));
      return;
    }

    try {
      setLoading(true);

      // Implement delete logic here when API is ready
      showSuccess(t('teacherDeleted', 'Teacher deleted successfully'));
      setShowDeleteDialog(false);
      setSelectedTeacher(null);

      setTimeout(async () => {
        await fetchTeachers(searchTerm, true);
      }, 500);

    } catch (error) {
      console.error('Error deleting teacher:', error);
      showError(t('failedDeleteTeacher', 'Failed to delete teacher: ') + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Export handlers
  const handleExportExcel = async () => {
    try {
      const filename = getTimestampedFilename('teachers_data', 'xlsx');
      await prepareAndExportExcel(teachers, filename, t);
      showSuccess(t('exportSuccess', 'Data exported successfully'));
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Export error:', error);
      showError(t('exportError', 'Failed to export data'));
    }
  };

  const handleExportCSV = async () => {
    try {
      const filename = getTimestampedFilename('teachers_data', 'csv');
      await prepareAndExportCSV(teachers, filename, t);
      showSuccess(t('exportSuccess', 'Data exported successfully'));
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Export error:', error);
      showError(t('exportError', 'Failed to export data'));
    }
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      const filename = getTimestampedFilename('teachers_data', 'pdf');
      await prepareAndExportPDF(teachers, null, filename, t);
      showSuccess(t('exportSuccess', 'Data exported successfully'));
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Export error:', error);
      showError(t('exportError', 'Failed to export data'));
    } finally {
      setLoading(false);
    }
  };

  // Handle select teacher
  const handleSelectTeacher = (teacher) => {
    setSelectedTeachers(prev => {
      const isSelected = prev.some(t => t.id === teacher.id);
      if (isSelected) {
        return prev.filter(t => t.id !== teacher.id);
      } else {
        return [...prev, teacher];
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedTeachers.length === teachers.length && teachers.length > 0) {
      setSelectedTeachers([]);
    } else {
      setSelectedTeachers([...teachers]);
    }
  };

  // Define table columns
  const tableColumns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedTeachers.length === teachers.length && teachers.length > 0}
          onChange={handleSelectAll}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      ),
      headerClassName: 'w-12',
      cellClassName: 'w-12',
      render: (teacher) => (
        <input
          type="checkbox"
          checked={selectedTeachers.some(t => t.id === teacher.id)}
          onChange={() => handleSelectTeacher(teacher)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      )
    },
    {
      key: 'name',
      header: t('name', 'Name'),
      render: (teacher) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:scale-110 transition-all duration-300">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <div className="ml-2 sm:ml-4 min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
              {teacher.name || (teacher.firstName || teacher.lastName
                ? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim()
                : teacher.username || t('noName', 'No Name'))}
            </div>
            <div className="text-xs text-gray-500 truncate lg:hidden">
              {teacher.email || 'N/A'}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'username',
      header: t('username', 'Username'),
      accessor: 'username',
      cellClassName: 'text-xs sm:text-sm text-gray-700',
      responsive: 'hidden lg:table-cell',
      render: (teacher) => (
        <p>{teacher.username || 'N/A'}</p>
      )
    },
    {
      key: 'email',
      header: t('email', 'Email'),
      accessor: 'email',
      cellClassName: 'text-xs sm:text-sm text-gray-700',
      responsive: 'hidden lg:table-cell',
      render: (teacher) => (
        <p>{teacher.email || 'N/A'}</p>
      )
    },
    {
      key: 'hireDate',
      header: t('hireDate', 'Hire Date'),
      accessor: 'hireDate',
      cellClassName: 'text-xs sm:text-sm text-gray-700',
      responsive: 'hidden xl:table-cell',
      render: (teacher) => (
        <p>{teacher.hireDate ? new Date(teacher.hireDate).toLocaleDateString() : 'N/A'}</p>
      )
    },
    {
      key: 'role',
      header: t('role', 'Role'),
      cellClassName: 'text-xs sm:text-sm text-gray-700',
      responsive: 'hidden lg:table-cell',
      render: (teacher) => (
        <Badge
          color={teacher.isDirector ? 'blue' : 'purple'}
          variant="outline"
        >
          {teacher.isDirector ? t('director', 'Director') : t('teacher', 'Teacher')}
        </Badge>
      )
    },
    {
      key: 'status',
      header: t('status', 'Status'),
      render: (teacher) => (
        <Badge
          color={teacher.isActive ? 'green' : 'gray'}
          variant="filled"
        >
          {teacher.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: t('actions', 'Actions'),
      headerClassName: 'relative',
      cellClassName: 'text-left text-sm font-medium',
      render: (teacher) => (
        <div className="flex items-center space-x-1">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Edit teacher:', teacher);
              showSuccess(t('featureComingSoon', 'This feature is coming soon'));
            }}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 hover:scale-110"
            title={t('editTeacher', 'Edit teacher')}
          >
            <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTeacher(teacher);
              setShowDeleteDialog(true);
            }}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-900 hover:bg-red-50 hover:scale-110"
            title={t('deleteTeacher', 'Delete teacher')}
          >
            <MinusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      )
    }
  ];

  // Mobile card render function
  const renderMobileCard = (teacher) => (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={selectedTeachers.some(t => t.id === teacher.id)}
            onChange={() => handleSelectTeacher(teacher)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:scale-110 transition-all duration-300">
            <User className="h-5 w-5" />
          </div>
          <div className="ml-2 sm:ml-4 min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 truncate">
              {teacher.name || (teacher.firstName || teacher.lastName
                ? `${teacher.firstName || ''} ${teacher.lastName || ''}`.trim()
                : teacher.username || t('noName', 'No Name'))}
            </div>
            <div className="text-xs text-gray-500 truncate">{teacher.email || 'N/A'}</div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Edit teacher:', teacher);
              showSuccess(t('featureComingSoon', 'This feature is coming soon'));
            }}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 hover:scale-110 flex-shrink-0"
            title={t('editTeacher', 'Edit teacher')}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTeacher(teacher);
              setShowDeleteDialog(true);
            }}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-900 hover:bg-red-50 hover:scale-110 flex-shrink-0"
            title={t('deleteTeacher', 'Delete teacher')}
          >
            <MinusCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-start text-xs text-gray-500">
        <div className="flex flex-col space-y-1">
          <span>{t('username', 'Username')}: {teacher.username || 'N/A'}</span>
          <span>{t('hireDate', 'Hire Date')}: {teacher.hireDate ? new Date(teacher.hireDate).toLocaleDateString() : 'N/A'}</span>
          <div className="flex items-center space-x-2 mt-1">
            <Badge
              color={teacher.isDirector ? 'blue' : 'purple'}
              variant="outline"
              size="xs"
            >
              {teacher.isDirector ? t('director', 'Director') : t('teacher', 'Teacher')}
            </Badge>
          </div>
        </div>
        <Badge
          color={teacher.isActive ? 'green' : 'gray'}
          variant="filled"
          size="xs"
        >
          {teacher.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
        </Badge>
      </div>
    </>
  );

  // Show error state if error exists
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => retry(() => {
          clearError();
          fetchSchoolId();
          fetchTeachers();
        })}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Show initial loading state
  if (initialLoading) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">
            {t('loadingTeachers', 'Loading teachers...')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition variant="fade" className="p-6">
      <FadeInSection className="bg-white shadow rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
          <div>
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">{t('teachersManagement', 'Teachers Management')}</h1>
            </div>
            <div className="mt-1 space-y-1">
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-600">
                  {t('manageTeacherRecords', 'Manage teacher records for your school')}
                </p>
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-600">
                    {teachers.length} {teachers.length === 1 ? t('teacher', 'teacher') : t('teachers', 'teachers')}
                    {localSearchTerm && allTeachers.length !== teachers.length && (
                      <span className="text-xs text-gray-500 ml-1">
                        ({t('filteredFrom', 'filtered from')} {allTeachers.length})
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {selectedTeachers.length > 0 && (
              <Button
                onClick={handleSelectAll}
                variant="outline"
                size="default"
                className="shadow-lg"
              >
                <X className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">{t('deselectAll', 'Deselect All')}</span>
              </Button>
            )}

            <div className="relative export-dropdown">
              <Button
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                variant="outline"
                size="default"
                className="shadow-lg"
                disabled={teachers.length === 0}
              >
                <Download className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">{t('export', 'Export')}</span>
                <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 ml-1" />
              </Button>

              {showExportDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <button
                      onClick={handleExportExcel}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                    >
                      {t('exportToExcel', 'Export to Excel')}
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                    >
                      {t('exportToCSV', 'Export to CSV')}
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                    >
                      {t('exportToPDF', 'Export to PDF')}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button
              onClick={() => showSuccess(t('featureComingSoon', 'This feature is coming soon'))}
              variant="primary"
              size="default"
              className="shadow-lg"
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
              <span className="text-xs sm:text-sm">{t('addTeacher', 'Add Teacher')}</span>
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 flex-1 justify-between">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-8 sm:pl-10 pr-8 sm:pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder={t('searchTeachers', 'Search by first name, last name, full name, or username...')}
                value={localSearchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {localSearchTerm && (
                <button
                  onClick={() => handleSearchChange('')}
                  className="absolute inset-y-0 right-0 pr-2 sm:pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  title={t('clearSearch', 'Clear search')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <FadeInSection delay={100}>
          <MobileCards
            data={teachers}
            renderCard={renderMobileCard}
          />

          <div className="hidden sm:block">
            <Table
              columns={tableColumns}
              data={teachers}
              loading={loading}
              emptyMessage={t('noTeachersFound', 'No teachers found')}
              showPagination={true}
              pagination={pagination}
              onPageChange={handlePageChange}
              rowClassName="hover:bg-blue-50"
              t={t}
            />
          </div>
        </FadeInSection>
      </FadeInSection>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDeleteTeacher}
        title={t('deleteTeacher', 'Delete Teacher')}
        message={`${t('confirmDeleteTeacher', 'Are you sure you want to delete')} ${selectedTeacher?.firstName || t('thisTeacher', 'this teacher')}? ${t('thisActionCannotBeUndone', 'This action cannot be undone.')}`}
        confirmText={loading ? t('deleting', 'Deleting...') : t('delete', 'Delete')}
        confirmVariant="danger"
        cancelText={t('cancel', 'Cancel')}
        isConfirming={loading}
      />
    </PageTransition>
  );
}
