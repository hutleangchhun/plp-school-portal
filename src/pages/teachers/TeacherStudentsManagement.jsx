import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Download, ChevronDown, X, Users, Edit2, User, Plus, Filter, Eye } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import { studentService } from '../../utils/api/services/studentService';
import { classService } from '../../utils/api/services/classService';
import { userService } from '../../utils/api/services/userService';
import { exportStudentsToExcel } from '../../utils/studentExportUtils';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import SidebarFilter from '../../components/ui/SidebarFilter';
import StudentViewModal from '../../components/students/StudentViewModal';
import { formatClassIdentifier } from '../../utils/helpers';
import { encryptId } from '../../utils/encryption';
import { getFullName } from '../../utils/usernameUtils';

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

  // Fetch school ID from my-account endpoint
  useEffect(() => {
    let mounted = true;

    async function fetchSchoolId() {
      try {
        console.log('Fetching school ID from my-account endpoint...');
        const accountData = await userService.getMyAccount();
        console.log('📥 Account data:', accountData);

        if (mounted && accountData && accountData.school_id) {
          console.log('✅ School ID fetched:', accountData.school_id);
          setSchoolId(accountData.school_id);
          setSchoolName(accountData.school?.name || '');
        }
      } catch (error) {
        console.error('Error fetching school ID:', error);
        showError(t('failedToFetchSchoolId', 'Failed to fetch school information'));
      }
    }

    fetchSchoolId();

    return () => {
      mounted = false;
    };
  }, [showError, t]);

  // Load classes assigned to this teacher
  // Uses user.classIds array to fetch teacher's assigned classes
  useEffect(() => {
    let mounted = true;

    async function loadClasses() {
      try {
        // Check if teacher has assigned classes
        if (user?.classIds?.length > 0) {
          console.log('🎓 Teacher has classIds:', user.classIds);

          // Fetch each assigned class using classIds
          const classPromises = user.classIds.map(classId =>
            classService.getClassById(classId)
          );

          const responses = await Promise.allSettled(classPromises);
          const teacherClasses = responses
            .filter(res => res.status === 'fulfilled' && res.value)
            .map(res => res.value);

          console.log(`✅ Loaded ${teacherClasses.length} classes for teacher:`, teacherClasses);

          if (mounted) {
            setClasses(teacherClasses);

            // If teacher has only one class, auto-select it
            if (teacherClasses.length === 1) {
              setSelectedClassId(teacherClasses[0].classId || teacherClasses[0].id);
              console.log('Auto-selected single class:', teacherClasses[0].name);
            }
          }
        } else {
          console.warn('⚠️ Teacher has no classIds assigned');
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

  // Load students when filters or page change
  useEffect(() => {
    // Only load if schoolId is available
    // If selectedClassId is 'all', only load if we have classes loaded
    // If selectedClassId is specific, we can load immediately
    if (!schoolId) return;
    if (selectedClassId === 'all' && classes.length === 0) return;

    let mounted = true;

    async function loadStudents() {
      try {
        setStudentsLoading(true);

        let allStudents = [];
        let totalCount = 0;

        // Determine if we're loading a specific class or all classes
        const isSpecificClass = selectedClassId && selectedClassId !== 'all';
        const isAllClasses = !selectedClassId || selectedClassId === 'all';

        if (isSpecificClass) {
          // Load students for a specific class
          const params = {
            page: pagination.page,
            limit: 10,
            classId: parseInt(selectedClassId)
          };

          // Add search parameter if provided
          if (searchInput.trim()) {
            params.search = searchInput.trim();
          }

          console.log('Loading students for specific class with params:', params);
          const response = await studentService.getStudentsBySchoolClasses(schoolId, params);
          console.log('Students response:', response);

          if (mounted && response.success) {
            allStudents = response.data || [];
            totalCount = response.pagination?.total || 0;
          }
        } else if (isAllClasses && classes.length > 0) {
          // Load students from all teacher's assigned classes
          // Fetch all students from each teacher's class and combine them
          const classPromises = classes.map(cls =>
            studentService.getStudentsBySchoolClasses(schoolId, {
              classId: cls.classId || cls.id,
              search: searchInput.trim() || undefined,
              limit: 100 // Get all students from this class
            })
          );

          const responses = await Promise.all(classPromises);
          responses.forEach(response => {
            if (response.success && response.data) {
              allStudents.push(...response.data);
              totalCount += response.pagination?.total || response.data.length;
            }
          });

          // Apply pagination on combined results
          const startIndex = (pagination.page - 1) * 10;
          const paginatedStudents = allStudents.slice(startIndex, startIndex + 10);
          allStudents = paginatedStudents;

          console.log(`Loaded ${allStudents.length} students from ${classes.length} teacher classes`);
        }

        if (mounted) {
          setStudents(allStudents);
          setPagination(prev => ({
            ...prev,
            total: totalCount,
            pages: Math.ceil(totalCount / 10)
          }));
        }
      } catch (error) {
        console.error('Error loading students:', error);
        showError(t('failedToLoadStudents', 'Failed to load students'));
      } finally {
        if (mounted) {
          setStudentsLoading(false);
        }
      }
    }

    loadStudents();

    return () => {
      mounted = false;
    };
  }, [schoolId, selectedClassId, searchInput, pagination.page, classes, showError, t]);

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
    setPagination(prev => ({ ...prev, page: newPage }));
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
    return <PageLoader message={t('loadingStudents', 'Loading students...')} />;
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
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Search Input */}
              <div className="flex-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-blue-400" />
                </div>
                <input
                  type="text"
                  className="text-sm w-full pl-10 pr-8 py-2 border border-gray-200 rounded-lg leading-5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
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
              <button
                onClick={() => setShowMobileFilters(true)}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-2.5 sm:py-2 px-4 sm:px-3 rounded-lg shadow-lg flex items-center justify-center sm:justify-start gap-2 transition-all duration-200 active:scale-95 text-sm whitespace-nowrap"
                title={t('filters', 'Filters & Actions')}
              >
                <Filter className="h-4 w-4" />
                <span className="sm:hidden">{t('filters', 'Filters & Actions')}</span>
                <span className="hidden sm:inline">{t('filters', 'Filters')}</span>
                {selectedClassId !== 'all' && (
                  <span className="ml-auto sm:ml-1 bg-white text-blue-600 text-xs font-bold px-2.5 sm:px-2 py-0.5 rounded-full">
                    1
                  </span>
                )}
              </button>
            </div>
          </div>

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
          {studentsLoading ? (
            <DynamicLoader message={t('loadingStudents', 'Loading students...')} />
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
              showPagination={true}
              pagination={pagination}
              onPageChange={handlePageChange}
              t={t}
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
