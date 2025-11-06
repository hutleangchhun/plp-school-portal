import { useState, useEffect } from 'react';
import { Search, Download, ChevronDown, X, Users, Edit2, User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import { studentService } from '../../utils/api/services/studentService';
import { classService } from '../../utils/api/services/classService';
import { userService } from '../../utils/api/services/userService';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { prepareAndExportExcel, prepareAndExportCSV, prepareAndExportPDF, getTimestampedFilename } from '../../utils/exportUtils';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import EmptyState from '@/components/ui/EmptyState';
import Modal from '../../components/ui/Modal';
import StudentEditModal from '../../components/students/StudentEditModal';

export default function TeacherStudentsManagement({ user }) {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
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

  // Load classes using school classes endpoint
  useEffect(() => {
    let mounted = true;

    async function loadClasses() {
      if (!schoolId) {
        console.log('School ID not available, skipping class load');
        setInitialLoading(false);
        return;
      }

      try {
        console.log('Loading classes for school:', schoolId);
        const response = await classService.getBySchool(schoolId);

        if (mounted && response && response.success && response.classes) {
          console.log('Classes loaded:', response.classes);
          setClasses(response.classes);
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
  }, [schoolId, showError, t]);

  // Load students when filters or page change
  useEffect(() => {
    if (initialLoading || !schoolId) return;

    let mounted = true;

    async function loadStudents() {
      try {
        setStudentsLoading(true);

        const params = {
          page: pagination.page,
          limit: 10
        };

        // Add search parameter if provided
        if (searchInput.trim()) {
          params.search = searchInput.trim();
        }

        // Only add classId filter if a specific class is selected (not 'all')
        if (selectedClassId && selectedClassId !== 'all') {
          params.classId = parseInt(selectedClassId);
        }

        console.log('Loading students with params:', params);
        const response = await studentService.getStudentsBySchoolClasses(schoolId, params);
        console.log('Students response:', response);

        if (mounted && response.success) {
          setStudents(response.data || []);
          setPagination(prev => ({
            ...prev,
            total: response.pagination?.total || 0,
            pages: response.pagination?.pages || 1
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
  }, [initialLoading, schoolId, selectedClassId, searchInput, pagination.page, showError, t]);

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

  const handleExportExcel = async () => {
    try {
      const filename = getTimestampedFilename('my-students', 'xlsx');
      await prepareAndExportExcel(students, filename, t);
      showSuccess(t('exportSuccess', 'Data exported successfully'));
    } catch (error) {
      console.error('Export error:', error);
      showError(t('exportFailed', 'Failed to export data'));
    }
    setShowExportDropdown(false);
  };

  const handleExportCSV = async () => {
    try {
      const filename = getTimestampedFilename('my-students', 'csv');
      await prepareAndExportCSV(students, filename, t);
      showSuccess(t('exportSuccess', 'Data exported successfully'));
    } catch (error) {
      console.error('Export error:', error);
      showError(t('exportFailed', 'Failed to export data'));
    }
    setShowExportDropdown(false);
  };

  const handleExportPDF = async () => {
    try {
      const filename = getTimestampedFilename('my-students', 'pdf');
      await prepareAndExportPDF(students, filename, t);
      showSuccess(t('exportSuccess', 'Data exported successfully'));
    } catch (error) {
      console.error('Export error:', error);
      showError(t('exportFailed', 'Failed to export data'));
    }
    setShowExportDropdown(false);
  };

  const handleEditStudent = (student) => {
    setEditingStudent(student);
    setShowEditModal(true);
  };

  const handleStudentUpdated = (updatedStudent) => {
    setShowEditModal(false);
    setEditingStudent(null);
    // Refresh the student list
    setTimeout(async () => {
      await loadStudents();
    }, 500);
  };

  // Dropdown options
  const classDropdownOptions = [
    { value: 'all', label: t('allClasses', 'All Classes') },
    ...classes.map(cls => ({
      value: String(cls.classId || cls.id),
      label: cls.name
    }))
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
              {student.name || (student.firstName || student.lastName
                ? `${student.firstName || ''} ${student.lastName || ''}`.trim()
                : student.username || t('noName', 'No Name'))}
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
      render: (student) => (
        <p>{student?.class?.name || student?.className || 'N/A'}</p>
      )
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
          <div className="mb-6">
            {/* Header */}
            <div className="mb-4">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">
                {t('studentsManagement', 'My Students')}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {t('manageYourStudents', 'View and manage students in your classes')}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 w-full sm:max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder={t('searchStudents', 'Search students...')}
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {searchInput && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div className='flex justify-center items-center gap-2'>
                {/* Class Filter */}
                {classes.length > 0 && (
                  <div className="w-full sm:w-auto">
                    <Dropdown
                      value={selectedClassId}
                      onValueChange={handleClassFilterChange}
                      options={classDropdownOptions}
                      placeholder={t('selectClass', 'Select class...')}
                      minWidth="min-w-[200px] sm:min-w-[250px]"
                      className="w-full sm:w-auto"
                    />
                  </div>
                )}

                {/* Export */}
                <div className="relative">
                  <Button
                    onClick={() => setShowExportDropdown(!showExportDropdown)}
                    variant="outline"
                    disabled={students.length === 0}
                  >
                    <Download className="h-5 w-5 mr-2" />
                    {t('export', 'Export')}
                    <ChevronDown className="h-4 w-4 ml-1" />
                  </Button>

                  {showExportDropdown && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                      <div className="py-1">
                        <button onClick={handleExportExcel} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
                          {t('exportToExcel', 'Export to Excel')}
                        </button>
                        <button onClick={handleExportCSV} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
                          {t('exportToCSV', 'Export to CSV')}
                        </button>
                        <button onClick={handleExportPDF} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left">
                          {t('exportToPDF', 'Export to PDF')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

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


          {/* Edit Student Modal */}
          <StudentEditModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false);
              setEditingStudent(null);
            }}
            student={editingStudent}
            onStudentUpdated={handleStudentUpdated}
          />
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
