import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, ChevronDown, X, Users, Edit2, ListFilter, Eye } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import { studentService } from '../../utils/api/services/studentService';
import { teacherService } from '../../utils/api/services/teacherService';
import { exportStudentsToExcel } from '../../utils/studentExportUtils';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import EmptyState from '@/components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import SidebarFilter from '../../components/ui/SidebarFilter';
import StudentViewModal from '../../components/students/StudentViewModal';
import { formatClassIdentifier } from '../../utils/helpers';
import { encryptId } from '../../utils/encryption';
import { getFullName } from '../../utils/usernameUtils';
import { genderToKhmer } from '../../utils/formatters';

export default function TeacherStudentsManagement({ user }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [schoolId, setSchoolId] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);

  // Set school ID from user object (already available from props - no extra API call needed)
  useEffect(() => {
    const teacherSchoolId = user?.schoolId || user?.school_id;
    if (teacherSchoolId) {
      console.log('✅ School ID from user object:', teacherSchoolId);
      setSchoolId(teacherSchoolId);
      setSchoolName(user?.school?.name || user?.schoolName || '');
    }
  }, [user]);

  // Load classes assigned to this teacher using the new teacher classes endpoint
  useEffect(() => {
    let mounted = true;

    async function loadClasses() {
      try {
        const teacherId = user?.teacherId || user?.id || user?.userId;

        if (!teacherId) {
          console.warn('⚠️ No teacher ID available');
          if (mounted) {
            setClasses([]);
            setInitialLoading(false);
          }
          return;
        }

        console.log('🎓 Fetching classes for teacher:', teacherId);

        // Use the new /teachers/{teacherId}/classes endpoint
        const classesResponse = await teacherService.getTeacherClasses(teacherId);

        if (classesResponse.success && classesResponse.data) {
          const teacherClasses = classesResponse.data;
          console.log(`✅ Loaded ${teacherClasses.length} classes for teacher:`, teacherClasses);

          if (mounted) {
            setClasses(teacherClasses);
            // Keep selectedClassId as 'all' - user must manually select a class
          }
        } else {
          console.warn('⚠️ Failed to fetch teacher classes');
          if (mounted) {
            setClasses([]);
          }
        }
      } catch (error) {
        console.error('Error loading classes:', error);
        showError(t('failedToFetchClasses', 'Failed to fetch classes'));
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
  }, [user, showError, t]);


  // Load students when filters or page change using the new /students/my-students endpoint
  useEffect(() => {
    // Only load if schoolId is available
    if (!schoolId) return;

    let mounted = true;

    async function loadStudents() {
      try {
        setStudentsLoading(true);

        // Build parameters for the new /students/my-students endpoint
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          schoolId: schoolId
        };

        // Add classId if filtering by specific class
        if (selectedClassId && selectedClassId !== 'all') {
          params.classId = parseInt(selectedClassId);
        }

        // Add search parameter if provided
        if (searchInput.trim()) {
          params.search = searchInput.trim();
        }

        console.log('📚 Loading students with params:', params);
        const response = await studentService.getMyStudents(params);
        console.log('📚 Students response:', response);

        if (mounted && response.success) {
          const students = response.data || [];
          const paginationData = response.pagination || {};

          console.log(`✅ Loaded ${students.length} students from /students/my-students endpoint`);

          setStudents(students);
          setPagination(prev => ({
            ...prev,
            page: paginationData.page || prev.page,
            limit: paginationData.limit || prev.limit,
            total: paginationData.total || 0,
            pages: paginationData.pages || Math.ceil((paginationData.total || 0) / (paginationData.limit || prev.limit))
          }));
          setDataFetched(true);
        } else {
          showError(t('failedToLoadStudents', 'Failed to load students'));
        }
      } catch (error) {
        console.error('Error loading students:', error);
        showError(t('failedToLoadStudents', 'Failed to load students'));
      } finally {
        if (mounted) {
          setStudentsLoading(false);
          setPaginationLoading(false);
        }
      }
    }

    loadStudents();

    return () => {
      mounted = false;
    };
  }, [schoolId, selectedClassId, searchInput, pagination.page, pagination.limit, showError, t]);

  // Handlers
  const handleSearchChange = (value) => {
    setSearchInput(value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleClassFilterChange = (classId) => {
    setSelectedClassId(classId);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages && !paginationLoading) {
      setPaginationLoading(true);
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  // Handle limit change
  const handleLimitChange = (newLimit) => {
    setPaginationLoading(true);
    setPagination(prev => ({
      ...prev,
      limit: newLimit,
      page: 1 // Reset to first page when changing limit
    }));
    // Scroll to top when changing limit
    window.scrollTo(0, 0);
  };

  // Export handlers - Export in BulkStudentImport template format
  const handleExportExcel = async () => {
    const selectedClass = selectedClassId !== 'all'
      ? classes.find(c => c.classId.toString() === selectedClassId)
      : null;

    await exportStudentsToExcel(students, {
      selectedClass,
      schoolName,
      onSuccess: () => {
        showSuccess(t('exportSuccess', 'Data exported successfully'));
        setShowExportDropdown(false);
      },
      onError: () => {
        showError(t('exportError', 'Failed to export data'));
      }
    });
  };

  const handleEditStudent = (student) => {
    console.log('Edit button clicked for student:', student);
    const studentId = student.userId || student.user_id || student.id;
    const encryptedId = encryptId(studentId);
    navigate(`/my-students/edit?id=${encryptedId}`);
  };

  const handleViewStudent = async (student) => {
    try {
      setLoadingStudentDetails(true);

      // Get user ID from student object (try multiple possible fields)
      const userId = student.userId || student.user_id || student.id;
      console.log('Fetching student details for user ID:', userId);

      if (!userId) {
        throw new Error('No valid user ID found for student');
      }

      // Fetch full student details by user ID
      const response = await studentService.getStudentById(userId);
      console.log('Student details response:', response);
      console.log('Student bookIds:', response?.data?.bookIds);

      if (response && response.success && response.data) {
        setViewingStudent(response.data);
        setShowViewModal(true);
      } else {
        throw new Error(response?.error || 'Failed to fetch student details');
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      showError(t('failedToFetchStudentDetails', 'Failed to fetch student details'));
    } finally {
      setLoadingStudentDetails(false);
    }
  };

  // Dropdown options (Kindergarten-aware class formatting)
  const classDropdownOptions = [
    { value: 'all', label: t('allClasses', 'All Classes') },
    ...classes.map(cls => {
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
    })
  ];

  // Table columns
  const columns = [
    {
      key: 'name',
      header: t('name', 'Name'),
      render: (student) => (
        <div className="flex items-center">
          <div className="ml-2 sm:ml-4 min-w-0 flex-1">
            <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
              {getFullName(student, student.username || t('noName', 'No Name'))}
            </div>
            <div className="text-xs text-gray-500 truncate lg:hidden">
              {student.email || 'N/A'}
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
      render: (student) => (
        <p>{student.username || 'N/A'}</p>
      )
    },
    {
      key: 'className',
      header: t('class', 'Class'),
      cellClassName: 'text-xs sm:text-sm text-gray-700',
      responsive: 'hidden lg:table-cell',
      render: (student) => {
        const rawGradeLevel =
          typeof (student?.class?.gradeLevel ?? student?.gradeLevel) !== 'undefined' &&
          (student?.class?.gradeLevel ?? student?.gradeLevel) !== null
            ? String(student?.class?.gradeLevel ?? student?.gradeLevel)
            : '';

        const displayGradeLevel =
          rawGradeLevel === '0'
            ? t('grade0', 'Kindergarten')
            : rawGradeLevel;

        const hasClassInfo = !!rawGradeLevel || !!student?.className;

        return (
          <p>
            {hasClassInfo ? (
              rawGradeLevel
                ? `${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, student?.class?.section || student?.section)}`
                : student?.className || 'N/A'
            ) : (
              'N/A'
            )}
          </p>
        );
      }
    },
    {
      key: 'gender',
      header: t('gender', 'Gender'),
      cellClassName: 'text-xs sm:text-sm text-gray-700',
      responsive: 'hidden md:table-cell',
      render: (student) => {
        const gender = student.gender || student.user?.gender;
        return <p>{gender ? genderToKhmer(gender) : 'N/A'}</p>;
      }
    },
    {
      key: 'status',
      header: t('status', 'Status'),
      render: (student) => (
        <Badge
          color={student.isActive ? 'green' : 'gray'}
          variant="filled"
        >
          {student.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: t('actions', 'Actions'),
      render: (student) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewStudent(student);
            }}
            disabled={loadingStudentDetails}
            className="p-2 text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={t('viewDetails', 'View Details')}
          >
            {loadingStudentDetails ? (
              <DynamicLoader type="spinner" size="sm" variant="primary" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={() => handleEditStudent(student)}
            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors duration-200"
            title={t('editStudent', 'Edit Student')}
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <PageLoader message={t('loadingStudents', 'Loading students...')} />
      </div>
    );
  }

  return (
    <PageTransition className='p-3 sm:p-4'>
      <div>
        <FadeInSection className='p-4 sm:p-6'>
          {/* Filters */}
          <div className="mb-6 flex flex-col space-y-4">
            {/* Header */}
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                {t('studentsManagement', 'My Students')}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {t('manageYourStudents', 'View and manage students in your classes')}
              </p>
            </div>

            {/* Search Bar and Filter Button */}
            <div className="flex sm:flex-row gap-3 items-center">
              {/* Search Input */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-blue-400" />
                </div>
                <input
                  type="text"
                  className="text-sm w-full pl-10 pr-8 py-2 border border-gray-200 rounded-sm leading-5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
                  placeholder={t('searchStudents', 'Search students...')}
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {searchInput && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    title={t('clearSearch', 'Clear search')}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter Button - Responsive (works on all screen sizes) */}
              <Button
                onClick={() => setShowMobileFilters(true)}
                variant="primary"
                size="sm"
                title={t('filters', 'Filters & Actions')}
                className="flex items-center justify-center sm:justify-start gap-2 whitespace-nowrap shadow-lg"
              >
                <ListFilter className="h-4 w-4" />
                <span className="sm:hidden">{t('filters', 'Filters & Actions')}</span>
                <span className="hidden sm:inline">{t('filters', 'Filters')}</span>
              </Button>
            </div>
          </div>

          {/* Active Filters Display */}
          {selectedClassId !== 'all' && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-blue-900">{t('activeFilters', 'Active Filters')}:</span>
              <Badge color="blue" variant="filled" size="sm">
                {t('class', 'Class')}: {
                  (() => {
                    const selectedClass = classes.find(cls => (cls.classId || cls.id).toString() === selectedClassId);
                    if (selectedClass) {
                      const rawGradeLevel =
                        typeof selectedClass.gradeLevel !== 'undefined' && selectedClass.gradeLevel !== null
                          ? String(selectedClass.gradeLevel)
                          : '';

                      const displayGradeLevel =
                        rawGradeLevel === '0'
                          ? t('grade0', 'Kindergarten')
                          : rawGradeLevel;

                      return formatClassIdentifier(displayGradeLevel, selectedClass.section);
                    }
                    return '';
                  })()
                }
              </Badge>
            </div>
          )}

          {/* Mobile Filters Sidebar */}
          <SidebarFilter
            isOpen={showMobileFilters}
            onClose={() => setShowMobileFilters(false)}
            title={t('filters', 'Filters & Actions')}
            subtitle={t('manageYourStudents', 'View and manage students in your classes')}
            hasFilters={selectedClassId !== 'all'}
            onClearFilters={() => {
              handleClassFilterChange('all');
            }}
            onApply={() => {
              setShowMobileFilters(false);
            }}
            children={
              <>
                {/* Class Filter */}
                <div>
                  <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">{t('selectClass', 'Class')}</label>
                  {classes.length > 0 ? (
                    <Dropdown
                      value={selectedClassId}
                      onValueChange={handleClassFilterChange}
                      options={classDropdownOptions}
                      placeholder={t('selectClass', 'Select class...')}
                      minWidth="w-full"
                      triggerClassName="text-sm w-full bg-gray-50 border-gray-200"
                    />
                  ) : (
                    <div className="w-full p-3 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600 text-center">
                      {t('noClassesAssigned', 'No classes assigned')}
                    </div>
                  )}
                </div>
              </>
            }
            actionsContent={
              <>
                {/* Export Button */}
                {students.length > 0 && (
                  <button
                    onClick={() => {
                      handleExportExcel();
                      setShowMobileFilters(false);
                    }}
                    className="w-full bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-medium py-2.5 px-3 rounded-lg flex items-center gap-2.5 transition-colors text-sm"
                  >
                    <Download className="h-4 w-4 text-purple-500" />
                    <span className="flex-1 text-left">{t('exportToExcel', 'Export to Excel')}</span>
                  </button>
                )}
              </>
            }
          />

          {/* Table/Cards */}
          {studentsLoading && !paginationLoading ? (
            <DynamicLoader message={t('loadingStudents', 'Loading students...')} />
          ) : paginationLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" variant="primary">
                {t('loadingPage', 'Loading page...')}
              </LoadingSpinner>
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={Users}
              title={t('noStudents', 'No Students')}
              description={searchInput || selectedClassId !== 'all'
                  ? t('noStudentsFound', 'No students found')
                  : t('noStudentsYet', 'No students in your classes')}
              variant='info'
            />
          ) : (
            <Table
              data={students}
              columns={columns}
              loading={paginationLoading}
              showPagination={true}
              pagination={pagination}
              onPageChange={handlePageChange}
              onLimitChange={handleLimitChange}
              limitOptions={[10, 25, 50]}
              showLimitSelector={true}
              t={t}
              disabled={paginationLoading}
            />
          )}

          {/* View Student Modal */}
          <StudentViewModal
            isOpen={showViewModal}
            onClose={() => {
              setShowViewModal(false);
              setViewingStudent(null);
            }}
            student={viewingStudent}
            className="full"
          />
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
