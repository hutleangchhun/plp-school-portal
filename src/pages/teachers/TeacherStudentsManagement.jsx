import { useState, useEffect } from 'react';
import { Search, Download, ChevronDown, X, Users, Eye } from 'lucide-react';
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
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // Load classes once on mount
  useEffect(() => {
    let mounted = true;

    async function loadClasses() {
      if (!user) {
        setInitialLoading(false);
        return;
      }

      try {
        const userId = user.id || user.userId || user.school_id || user.schoolId;
        const response = await classService.getClassByUser(userId);

        if (mounted && response.success) {
          setClasses(response.classes || []);
        }
      } catch (error) {
        console.error('Error loading classes:', error);
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

  // Load students when filters or page change
  useEffect(() => {
    if (initialLoading) return;

    let mounted = true;

    async function loadStudents() {
      try {
        setStudentsLoading(true);

        const params = {
          page: pagination.page,
          limit: 10,
          search: searchInput.trim()
        };

        // Only add classId filter if a specific class is selected (not 'all')
        if (selectedClassId && selectedClassId !== 'all') {
          params.classId = parseInt(selectedClassId);
        }

        console.log('Loading students with params:', params);
        const response = await studentService.getMyStudents(params);
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
        showError('Failed to load students');
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
  }, [initialLoading, selectedClassId, searchInput, pagination.page, showError]);

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

  const handleViewStudent = async (student) => {
    try {
      setShowViewModal(true);
      setLoadingStudentDetails(true);
      setSelectedStudent(student); // Show basic info first

      console.log('===== VIEW STUDENT DEBUG =====');
      console.log('1. Original student data:', student);
      console.log('2. Student userId:', student.userId);

      // Fetch detailed student information using userId
      const userId = student.userId || student.user?.id;
      if (userId) {
        console.log('3. Fetching user details for user ID:', userId);
        const detailedUser = await userService.getUserByID(userId);
        console.log('4. Detailed user API response:', detailedUser);
        console.log('5. Has residence?', !!detailedUser.residence);
        console.log('6. Has placeOfBirth?', !!detailedUser.placeOfBirth);

        // Merge detailed user data with student data
        const mergedData = {
          ...student,
          ...detailedUser,
          // Preserve student-specific fields that shouldn't be overwritten
          studentId: student.studentId,
          academicYear: student.academicYear,
          gradeLevel: student.gradeLevel,
          class: student.class,
          user: student.user,
          // Handle both isActive and is_active field names
          isActive: detailedUser.is_active !== undefined ? detailedUser.is_active :
                    detailedUser.isActive !== undefined ? detailedUser.isActive :
                    student.isActive
        };
        console.log('7. Final merged data:', mergedData);
        console.log('8. Final data has residence?', !!mergedData.residence);
        console.log('9. Final data has placeOfBirth?', !!mergedData.placeOfBirth);
        console.log('===== END DEBUG =====');
        setSelectedStudent(mergedData);
      } else {
        console.warn('No userId found in student data!');
        console.log('Student object keys:', Object.keys(student));
      }
    } catch (error) {
      console.error('Error fetching student details:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response
      });
      showError(t('failedToLoadDetails', 'Failed to load student details'));
    } finally {
      setLoadingStudentDetails(false);
    }
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedStudent(null);
    setLoadingStudentDetails(false);
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
      key: 'class',
      header: t('class', 'Class'),
      accessor: 'className',
      cellClassName: 'text-xs sm:text-sm text-gray-700',
      responsive: 'hidden lg:table-cell',
      render: (student) => (
        <p>{student?.class?.name || 'N/A'}</p>
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
            onClick={() => handleViewStudent(student)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors duration-200"
            title={t('viewDetails', 'View Details')}
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  if (initialLoading) {
    return <PageLoader message={t('loadingStudents', 'Loading students...')} />;
  }

  return (
    <PageTransition className='p-6'>
      <div>
        <FadeInSection>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
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

          {/* View Student Modal */}
          {selectedStudent && (
            <Modal
              isOpen={showViewModal}
              onClose={handleCloseViewModal}
              title={t('studentDetails', 'Student Details')}
              size="2xl"
              height='lg'
            >
              {loadingStudentDetails && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-lg">
                  <DynamicLoader message={t('loadingDetails', 'Loading details...')} />
                </div>
              )}
              <div className="space-y-6">
                {/* Student Avatar and Basic Info */}
                <div className="flex items-center space-x-4 pb-4 border-b border-gray-200">
                  <div className="flex-shrink-0 h-16 w-16 flex items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {selectedStudent.name ||
                       (selectedStudent.firstName || selectedStudent.lastName
                        ? `${selectedStudent.firstName || ''} ${selectedStudent.lastName || ''}`.trim()
                        : selectedStudent.user?.first_name || selectedStudent.user?.last_name
                        ? `${selectedStudent.user?.first_name || ''} ${selectedStudent.user?.last_name || ''}`.trim()
                        : selectedStudent.username || selectedStudent.user?.username || t('noName', 'No Name'))}
                    </h3>
                    <div className="mt-1">
                      <Badge
                        color={(selectedStudent.isActive || selectedStudent.is_active) ? 'green' : 'gray'}
                        variant="filled"
                      >
                        {(selectedStudent.isActive || selectedStudent.is_active) ? t('active', 'Active') : t('inactive', 'Inactive')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Personal Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    {t('personalInformation', 'Personal Information')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('firstName', 'First Name')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.firstName || selectedStudent.first_name || selectedStudent.user?.first_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('lastName', 'Last Name')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.lastName || selectedStudent.last_name || selectedStudent.user?.last_name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('username', 'Username')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.username || selectedStudent.user?.username || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('gender', 'Gender')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.gender
                          ? (selectedStudent.gender === 'MALE' ? t('male', 'Male') : t('female', 'Female'))
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    {t('contactInformation', 'Contact Information')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('email', 'Email')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.email || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('phone', 'Phone')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.phone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('address', 'Address')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.address || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Academic Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    {t('academicInformation', 'Academic Information')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('class', 'Class')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.class?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('studentId', 'Student ID')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.studentId || selectedStudent.id || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('gradeLevel', 'Grade Level')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.gradeLevel || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('academicYear', 'Academic Year')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.academicYear || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('enrollmentDate', 'Enrollment Date')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.enrollmentDate
                          ? new Date(selectedStudent.enrollmentDate).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Additional Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    {t('additionalInformation', 'Additional Information')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('dateOfBirth', 'Date of Birth')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {(selectedStudent.dateOfBirth || selectedStudent.date_of_birth)
                          ? new Date(selectedStudent.dateOfBirth || selectedStudent.date_of_birth).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('nationality', 'Nationality')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.nationality || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('role', 'Role')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.roleNameKh || selectedStudent.roleNameEn || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('accountCreated', 'Account Created')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.created_at
                          ? new Date(selectedStudent.created_at).toLocaleDateString()
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('lastLogin', 'Last Login')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.last_login
                          ? new Date(selectedStudent.last_login).toLocaleString()
                          : t('neverLoggedIn', 'Never logged in')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Residence Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    {t('residenceInformation', 'Residence Information')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('province', 'Province')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.residence?.province?.province_name_kh ||
                         selectedStudent.residence?.province?.province_name_en ||
                         selectedStudent.residence?.province?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('district', 'District')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.residence?.district?.district_name_kh ||
                         selectedStudent.residence?.district?.district_name_en ||
                         selectedStudent.residence?.district?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('commune', 'Commune')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.residence?.commune?.commune_name_kh ||
                         selectedStudent.residence?.commune?.commune_name_en ||
                         selectedStudent.residence?.commune?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('village', 'Village')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.residence?.village?.village_name_kh ||
                         selectedStudent.residence?.village?.village_name_en ||
                         selectedStudent.residence?.village?.name || 'N/A'}
                      </p>
                    </div>
                    {selectedStudent.residence?.fullAddress && (
                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-500">
                          {t('fullAddress', 'Full Address')}
                        </label>
                        <p className="mt-1 text-sm text-gray-900">
                          {selectedStudent.residence.fullAddress}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Place of Birth Information */}
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    {t('placeOfBirth', 'Place of Birth')}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('province', 'Province')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.placeOfBirth?.province?.province_name_kh ||
                         selectedStudent.placeOfBirth?.province?.province_name_en ||
                         selectedStudent.placeOfBirth?.province?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('district', 'District')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.placeOfBirth?.district?.district_name_kh ||
                         selectedStudent.placeOfBirth?.district?.district_name_en ||
                         selectedStudent.placeOfBirth?.district?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('commune', 'Commune')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.placeOfBirth?.commune?.commune_name_kh ||
                         selectedStudent.placeOfBirth?.commune?.commune_name_en ||
                         selectedStudent.placeOfBirth?.commune?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">
                        {t('village', 'Village')}
                      </label>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedStudent.placeOfBirth?.village?.village_name_kh ||
                         selectedStudent.placeOfBirth?.village?.village_name_en ||
                         selectedStudent.placeOfBirth?.village?.name || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Modal>
          )}
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
