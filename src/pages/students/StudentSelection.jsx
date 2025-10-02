import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, X, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import studentService from '../../utils/api/services/studentService';
import classService from '../../utils/api/services/classService';
import { userService } from '../../utils/api/services/userService';
import { Button } from '../../components/ui/Button';
import { useStableCallback } from '../../utils/reactOptimization';
import Badge from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Pagination as UIPagination } from '../../components/ui/Table';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import SelectedStudentsManager from '../../components/students/SelectedStudentsManager';
import useSelectedStudents from '../../hooks/useSelectedStudents';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { DatePickerWithDropdowns } from '../../components/ui/date-picker-with-dropdowns';
import Dropdown from '../../components/ui/Dropdown';

const StudentSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();
  
  // Get authenticated user data
  const [user] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  });
  
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  
  // Use the custom hook for managing selected students (fresh session - no persistence)
  const {
    selectedStudents,
    selectedStudentsData,
    handleSelectStudent,
    removeStudent,
    clearAll,
    isSelected
  } = useSelectedStudents();

  // Override: Always start with empty selection for StudentSelection
  const [freshSelectedStudents, setFreshSelectedStudents] = useState([]);
  const [freshSelectedStudentsData, setFreshSelectedStudentsData] = useState({});

  // Custom handlers that don't persist to localStorage
  const freshHandleSelectStudent = useCallback((student) => {
    const studentId = student.id;
    setFreshSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        setFreshSelectedStudentsData(prevData => {
          const newData = { ...prevData };
          delete newData[studentId];
          return newData;
        });
        return prev.filter(id => id !== studentId);
      } else {
        setFreshSelectedStudentsData(prevData => ({
          ...prevData,
          [studentId]: student
        }));
        return [...prev, studentId];
      }
    });
  }, []);

  const freshRemoveStudent = useCallback((studentId) => {
    setFreshSelectedStudents(prev => prev.filter(id => id !== studentId));
    setFreshSelectedStudentsData(prevData => {
      const newData = { ...prevData };
      delete newData[studentId];
      return newData;
    });
  }, []);

  const freshClearAll = useCallback(() => {
    setFreshSelectedStudents([]);
    setFreshSelectedStudentsData({});
  }, []);

  const freshIsSelected = useCallback((studentId) => {
    return freshSelectedStudents.includes(studentId);
  }, [freshSelectedStudents]);

  // Use fresh state instead of persisted state
  const actualSelectedStudents = freshSelectedStudents;
  const actualSelectedStudentsData = freshSelectedStudentsData;
  const actualHandleSelectStudent = freshHandleSelectStudent;
  const actualRemoveStudent = freshRemoveStudent;
  const actualClearAll = freshClearAll;
  const actualIsSelected = freshIsSelected;

  // Auto-open sidebar when students are selected
  useEffect(() => {
    if (actualSelectedStudents.length > 0) {
      setShowSelectedStudentsSidebar(true);
    } else {
      setShowSelectedStudentsSidebar(false);
    }
  }, [actualSelectedStudents.length]);
  const [schoolId, setSchoolId] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [filters, setFilters] = useState({
    search: '',
    academicYear: '',
    gender: '',
    dateOfBirth: null, // Date object for DatePicker
    gradeLevel: ''
  });
  const [selectedClass, setSelectedClass] = useState('');
  const [selectingAll, setSelectingAll] = useState(false);
  const [showSelectedStudentsSidebar, setShowSelectedStudentsSidebar] = useState(false);

  // Clear any persisted selected students on component mount (fresh session)
  useEffect(() => {
    clearAll();
  }, []); // Empty dependency array = runs once on mount

  // Debounce the search input so typing doesn't trigger immediate refetch and lose focus
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(filters.search), 400);
    return () => clearTimeout(id);
  }, [filters.search]);


  // Initialize classes using new classes/user API
  useEffect(() => {
    const fetchClassDetails = async () => {
      if (!user?.id) {
        console.log('No user ID available for fetching classes');
        setClasses([]);
        return;
      }

      try {
        console.log('Fetching classes using new classes/user API...');
        
        // Get class data from new /classes/user/{userId} endpoint
        const classResponse = await classService.getClassByUser(user.id);
        
        if (!classResponse || !classResponse.success || !classResponse.classes || !Array.isArray(classResponse.classes)) {
          console.log('No classes found in API response:', classResponse);
          setClasses([]);
          return;
        }

        console.log('Found classes in API response:', classResponse.classes);

        // Process classes from the new API response
        const teacherClasses = classResponse.classes.map((classData) => ({
          id: classData.classId,
          classId: classData.classId,
          name: classData.name,
          gradeLevel: classData.gradeLevel,
          section: classData.section || 'A',
          academicYear: classData.academicYear,
          teacherId: classData.teacherId,
          maxStudents: classData.maxStudents || 50,
          capacity: classData.maxStudents || 50,
          schoolId: classData.schoolId,
          status: classData.status
        }));

        setClasses(teacherClasses);
        
        // Extract and set school ID from the first class if not already set
        if (!schoolId && teacherClasses.length > 0 && teacherClasses[0].schoolId) {
          console.log('Setting school ID from classes data:', teacherClasses[0].schoolId);
          setSchoolId(teacherClasses[0].schoolId);
        }
        
        console.log(`User ${user.username} has access to ${teacherClasses.length} classes for student selection:`, 
          teacherClasses.map(c => `${c.name} (ID: ${c.classId}, Max: ${c.maxStudents})`));
          
      } catch (error) {
        console.error('Error fetching class details:', error);
        showError(t('errorFetchingClasses', 'Failed to load classes. Some features may not work properly.'));
        // Fallback to empty classes array
        setClasses([]);
      }
    };

    fetchClassDetails();
  }, [user?.id, user?.username]);

  // Set initial loading to false once classes are loaded
  useEffect(() => {
    if (classes.length > 0) {
      setInitialLoading(false);
    }
  }, [classes.length]);

  // Fetch current user's school ID - try from classes first, then my-account
  const fetchSchoolId = useStableCallback(async () => {
    try {
      if (schoolId) {
        console.log('School ID already available:', schoolId);
        return;
      }

      console.log('Fetching school ID from classes API...');
      
      // First try to get school ID from classes API
      if (user?.id) {
        const classResponse = await classService.getClassByUser(user.id);
        if (classResponse && classResponse.success && classResponse.classes && classResponse.classes.length > 0) {
          const firstClass = classResponse.classes[0];
          if (firstClass.schoolId) {
            console.log('School ID found in classes:', firstClass.schoolId);
            setSchoolId(firstClass.schoolId);
            return;
          }
        }
      }

      // Fallback to my-account endpoint
      console.log('Trying school ID from my-account endpoint...');
      const accountData = await userService.getMyAccount();
      
      if (accountData && accountData.school_id) {
        console.log('School ID fetched from account:', accountData.school_id);
        setSchoolId(accountData.school_id);
      } else {
        console.error('No school_id found in account data:', accountData);
        showError(t('noSchoolIdFound', 'No school ID found for your account'));
      }
    } catch (error) {
      console.error('Error fetching school ID:', error);
      showError(t('failedToFetchSchoolId', 'Failed to fetch school information'));
    }
  }, [schoolId, showError, t, user?.id]);

  // Fetch school ID when component mounts
  useEffect(() => {
    fetchSchoolId();
  }, [fetchSchoolId]);

  // Move the fetchData function inside the component and wrap it in useStableCallback
  const fetchData = useStableCallback(async () => {
    try {
      if (!schoolId) {
        console.log('No school ID available, cannot fetch students');
        return;
      }

      setListLoading(true);
      setFetchError(null); // Clear any previous errors
      setStudents([]); // Clear previous students data when loading starts
      
      console.log('=== STUDENT SELECTION FETCH DEBUG ===');
      console.log('School ID:', schoolId);
      console.log('Search term:', debouncedSearch);
      console.log('Pagination:', pagination);
      
      // Build filter parameters
      const filterParams = {
        search: debouncedSearch,
        page: pagination.page,
        limit: pagination.limit
      };
      
      // Add additional filters
      if (filters.academicYear) filterParams.academicYear = filters.academicYear;
      if (filters.gender) filterParams.gender = filters.gender;
      if (filters.dateOfBirth) {
        // Format date as YYYY-MM-DD for API
        const year = filters.dateOfBirth.getFullYear();
        const month = String(filters.dateOfBirth.getMonth() + 1).padStart(2, '0');
        const day = String(filters.dateOfBirth.getDate()).padStart(2, '0');
        filterParams.dateOfBirth = `${year}-${month}-${day}`;
      }
      if (filters.gradeLevel) filterParams.gradeLevel = filters.gradeLevel;
      
      // Use the master-class endpoint to get all students from the school with filters
      const studentsResponse = await studentService.getStudentsBySchool(schoolId, filterParams);
      
      console.log('Master-class response:', studentsResponse);
      
      if (studentsResponse && studentsResponse.success && studentsResponse.data) {
        // For student selection, we might want to show all students or filter by some criteria
        // The user can then choose which students to assign to which classes
        setStudents(studentsResponse.data);
        console.log(`Loaded ${studentsResponse.data.length} students from school ${schoolId} for selection`);
        
        if (studentsResponse.pagination) {
          console.log('Pagination data:', studentsResponse.pagination);
          setPagination(prev => ({
            ...prev,
            ...studentsResponse.pagination
          }));
        }
      } else {
        console.error('Invalid response from master-class endpoint:', studentsResponse);
        setStudents([]);
      }
    } catch (error) {
      console.error('Error fetching student data from master-class:', error);
      
      // Set error state for display
      const errorMessage = error.message || t('errorFetchingData') || 'Error fetching data from server';
      setFetchError({
        message: errorMessage,
        type: error.response?.status >= 500 ? 'server' : 'network',
        canRetry: true
      });
      
      // Show toast error
      showError(errorMessage);
      setStudents([]);
    } finally {
      setListLoading(false);
    }
  }, [schoolId, debouncedSearch, pagination.page, pagination.limit, filters.academicYear, filters.gender, filters.dateOfBirth, filters.gradeLevel, showError, t]);

  // Fetch students when pagination, search, or filters change
  useEffect(() => {
    if (schoolId) {
      fetchData();
    }
  }, [schoolId, fetchData]); // fetchData now includes all filter dependencies

  // Reset pagination to page 1 when filters change (but not when pagination changes)
  useEffect(() => {
    if (schoolId && pagination.page !== 1) {
      setPagination(prev => ({ ...prev, page: 1 }));
    }
  }, [filters.academicYear, filters.gender, filters.dateOfBirth, filters.gradeLevel, schoolId]);

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({
        ...prev,
        page: newPage
      }));
      // Scroll to top when changing pages
      window.scrollTo(0, 0);
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    // Page reset is handled by useEffect for filter changes
  };

  // Handle select all students (with current filters)
  const handleSelectAllStudents = async () => {
    if (selectingAll) return;
    
    try {
      setSelectingAll(true);
      
      // Build filter parameters to get all students matching current filters
      const filterParams = {
        search: debouncedSearch,
        page: 1,
        limit: 1000, // Get a large number to capture all students
      };
      
      // Add additional filters
      if (filters.academicYear) filterParams.academicYear = filters.academicYear;
      if (filters.gender) filterParams.gender = filters.gender;
      if (filters.dateOfBirth) {
        // Format date as YYYY-MM-DD for API
        const year = filters.dateOfBirth.getFullYear();
        const month = String(filters.dateOfBirth.getMonth() + 1).padStart(2, '0');
        const day = String(filters.dateOfBirth.getDate()).padStart(2, '0');
        filterParams.dateOfBirth = `${year}-${month}-${day}`;
      }
      if (filters.gradeLevel) filterParams.gradeLevel = filters.gradeLevel;
      
      // Fetch all students matching current filters
      const allStudentsResponse = await studentService.getStudentsBySchool(schoolId, filterParams);
      
      if (allStudentsResponse && allStudentsResponse.success && allStudentsResponse.data) {
        // Filter out students that are already selected to avoid unnecessary operations
        const studentsToSelect = allStudentsResponse.data.filter(student => !actualIsSelected(student.id));
        
        // Select students in batches to avoid blocking the UI
        let selectedCount = 0;
        const batchSize = 50;
        
        for (let i = 0; i < studentsToSelect.length; i += batchSize) {
          const batch = studentsToSelect.slice(i, i + batchSize);
          
          // Use setTimeout to yield control to the UI between batches
          await new Promise(resolve => {
            setTimeout(() => {
              batch.forEach(student => {
                actualHandleSelectStudent(student);
                selectedCount++;
              });
              resolve();
            }, 0);
          });
        }
        
        showSuccess(
          t('selectedAllStudents') || 
          `Selected ${selectedCount} student${selectedCount !== 1 ? 's' : ''}`
        );
      }
    } catch (error) {
      console.error('Error selecting all students:', error);
      const errorMsg = error.message || t('errorSelectingAllStudents') || 'Failed to select all students';
      showError(`${errorMsg} - ${t('checkConnection', 'Please check your connection and try again.')}`);
    } finally {
      setSelectingAll(false);
    }
  };

  // Check if all current page students are selected
  const areAllCurrentStudentsSelected = () => {
    return students.length > 0 && students.every(student => actualIsSelected(student.id));
  };

  // Handle select/deselect all students on current page
  const handleSelectAllCurrentPage = () => {
    if (areAllCurrentStudentsSelected()) {
      // Deselect all students on current page
      students.forEach(student => {
        if (actualIsSelected(student.id)) {
          actualRemoveStudent(student.id);
        }
      });
    } else {
      // Select all students on current page
      students.forEach(student => {
        if (!actualIsSelected(student.id)) {
          actualHandleSelectStudent(student);
        }
      });
    }
  };



  // Show initial loading state or error
  if (initialLoading) {
    // Show error if there's an issue loading classes
    if (classes.length === 0 && !user?.id) {
      return (
        <div className="flex-1 bg-gray-50 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <X className="h-10 w-10 text-red-500" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium text-red-600">
                {t('authenticationError', 'Authentication Error')}
              </p>
              <p className="text-sm text-gray-600">
                {t('pleaseLoginAgain', 'Please login again to continue')}
              </p>
            </div>
            <Button
              onClick={() => navigate('/login')}
              variant="primary"
              size="sm"
            >
              {t('goToLogin', 'Go to Login')}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">
            {t('loadingStudentSelection')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition variant="slideUp" duration="duration-700">
      <div className="p-6">
        <FadeInSection delay={100} className='bg-white shadow rounded-lg p-4 sm:p-6 transition-all duration-300 mb-4'>
          <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('studentSelection') || 'ការជ្រើសរើសសិស្ស'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {t('selectStudentsForAction') || 'ជ្រើសរើសសិស្សដើម្បីអនុវត្តសកម្មភាពជាក្រុម'}
              </p>
            </div>
            <div className="">
              <Button
                onClick={() => navigate('/students')}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>{t('backToStudents') || 'ត្រឡប់ទៅសិស្ស'}</span>
              </Button>
            </div>
          </div>
          <div className="">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder={t('searchStudents') || 'ស្វែងរកសិស្ស...'}
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ ...filters, search: e.target.value })}
                />
              </div>
          
              <div className="flex justify-end space-x-2">
                <Button
                  onClick={handleSelectAllStudents}
                  variant="primary"
                  size="sm"
                  disabled={selectingAll}
                >
                  {selectingAll ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-1"></div>
                      {t('selectingAll') || 'Selecting...'}
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 mr-1" />
                      {t('selectAllStudents') || 'Select All'}
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => handleFilterChange({ 
                    search: '', 
                    academicYear: '', 
                    gender: '', 
                    dateOfBirth: null, 
                    gradeLevel: '' 
                  })}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('resetFilters') || 'កំណត់ឡើងវិញ'}
                </Button>
              </div>
            </div>
            
            {/* Additional Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('academicYear', 'Academic Year')}</label>
                <input
                  type="text"
                  placeholder="2024-2025"
                  value={filters.academicYear}
                  onChange={(e) => handleFilterChange({ ...filters, academicYear: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('gender', 'Gender')}</label>
                <Dropdown
                  value={filters.gender}
                  onValueChange={(value) => handleFilterChange({ ...filters, gender: value })}
                  options={[
                    { value: '', label: t('allGenders', 'All Genders') },
                    { value: 'MALE', label: t('male', 'Male') },
                    { value: 'FEMALE', label: t('female', 'Female') }
                  ]}
                  placeholder={t('selectGender', 'Select Gender')}
                />
              </div>
              
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('dateOfBirth', 'Date of Birth')}</label>
                <DatePickerWithDropdowns
                  value={filters.dateOfBirth}
                  onChange={(date) => handleFilterChange({ ...filters, dateOfBirth: date })}
                  placeholder={t('selectDate', 'Select Date')}
                />
              </div>
              
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium text-gray-700">{t('gradeLevel', 'Grade Level')}</label>
                <Dropdown
                  value={filters.gradeLevel}
                  onValueChange={(value) => handleFilterChange({ ...filters, gradeLevel: value })}
                  options={[
                    { value: '', label: t('allGrades', 'All Grades') },
                    { value: '1', label: t('grade1', 'Grade 1') },
                    { value: '2', label: t('grade2', 'Grade 2') },
                    { value: '3', label: t('grade3', 'Grade 3') },
                    { value: '4', label: t('grade4', 'Grade 4') },
                    { value: '5', label: t('grade5', 'Grade 5') },
                    { value: '6', label: t('grade6', 'Grade 6') }
                  ]}
                  placeholder={t('selectGrade', 'Select Grade')}
                />
              </div>
            </div>
          </div>
          
        </FadeInSection>

        {/* Selected Students Sidebar */}
        <SelectedStudentsManager
          selectedStudents={actualSelectedStudents}
          selectedStudentsData={actualSelectedStudentsData}
          onRemoveStudent={actualRemoveStudent}
          onClearAll={actualClearAll}
          classes={classes}
          isOpen={showSelectedStudentsSidebar}
          onToggle={setShowSelectedStudentsSidebar}
          autoOpen={false}
        />

        {/* Students List */}
        <FadeInSection delay={400}>
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        {/* Header with select all checkbox */}
        {!listLoading && students.length > 0 && (
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={areAllCurrentStudentsSelected()}
                  onChange={handleSelectAllCurrentPage}
                  className="h-4 w-4 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 border-gray-300 rounded-md transition-colors"
                />
                <label className="text-sm font-medium text-gray-700">
                  {areAllCurrentStudentsSelected() 
                    ? (t('deselectAllOnPage') || 'Deselect all on page')
                    : (t('selectAllOnPage') || 'Select all on page')
                  }
                </label>
              </div>
            </div>
          </div>
        )}
        
        {listLoading ? (
          <div className="w-full flex items-center justify-center py-8">
            <LoadingSpinner size="default" variant="primary" />
          </div>
        ) : fetchError ? (
          <div className="flex items-center justify-center min-h-[400px] p-6">
            <div className="text-center space-y-4 max-w-md">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <X className="h-10 w-10 text-red-500" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-red-600">
                  {t('connectionError', 'Connection Error')}
                </p>
                <p className="text-sm text-gray-600">
                  {fetchError.message}
                </p>
                <p className="text-xs text-gray-500">
                  {fetchError.type === 'server' 
                    ? (t('serverError', 'Server is temporarily unavailable. Please try again later.'))
                    : (t('networkError', 'Please check your internet connection and try again.'))
                  }
                </p>
              </div>
              {fetchError.canRetry && (
                <Button
                  onClick={() => fetchData()}
                  variant="primary"
                  size="sm"
                  className="mt-4"
                >
                  {t('retry', 'Try Again')}
                </Button>
              )}
            </div>
          </div>
        ) : students.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
            {students.map((student) => (
              <div key={student.id} className="group hover:bg-gray-50/50 transition-colors duration-150 border border-gray-100 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <input
                      id={`student-${student.id}`}
                      name="students"
                      type="checkbox"
                      className="h-5 w-5 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 border-gray-300 rounded-md transition-colors"
                      checked={actualIsSelected(student.id)}
                      onChange={() => actualHandleSelectStudent(student)}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between space-x-2">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 truncate">
                            {student.name}
                          </h3>
                        </div>
                        <Badge color={student.isActive ? 'green' : 'red'} size="sm">
                          {student.isActive ? (t('active') || 'សកម្ម') : (t('inactive') || 'មិនសកម្ម')}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {student.studentId}
                        </span>
                        <span>•</span>
                        {student.gender && (
                          <>
                            <span className={`px-2 py-0.5 rounded font-medium ${
                              student.gender === 'MALE'
                                ? 'bg-blue-100 text-blue-700'
                                : student.gender === 'FEMALE'
                                ? 'bg-pink-100 text-pink-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {student.gender === 'MALE' ? t('male', 'Male') :
                               student.gender === 'FEMALE' ? t('female', 'Female') :
                               student.gender}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        {student.gradeLevel && (
                          <>
                            <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">
                              {t('grade', 'Grade')} {student.gradeLevel}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        {student.academicYear && (
                          <>
                            <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-medium">
                              {student.academicYear}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        {student.dateOfBirth && (
                          <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
                            {new Date(student.dateOfBirth).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center min-h-[400px] p-6">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <User className="h-10 w-10 text-gray-400" />
              </div>
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-500">
                  {t('noStudentsFound') || 'រកមិនឃើញសិស្សដែលស្របនឹងលក្ខខណ្ឌរបស់អ្នក។'}
                </p>
                <p className="text-sm text-gray-400">
                  {debouncedSearch 
                    ? (t('tryDifferentSearch') || 'Try adjusting your search criteria')
                    : (t('noStudentsAvailable') || 'No students are available in this school')
                  }
                </p>
              </div>
              {(debouncedSearch || filters.academicYear || filters.gender || filters.dateOfBirth || filters.gradeLevel) && (
                <Button
                  onClick={() => handleFilterChange({ 
                    search: '', 
                    academicYear: '', 
                    gender: '', 
                    dateOfBirth: null, 
                    gradeLevel: '' 
                  })}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('clearFilters') || 'Clear Filters'}
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* Pagination (shadcn-styled from shared UI) */}
        {!listLoading && students.length > 0 && (
          <FadeInSection delay={500}>
            <UIPagination
              pagination={pagination}
              onPageChange={handlePageChange}
              t={(key, fallback) => t(key) || fallback}
            />
          </FadeInSection>
        )}
        </div>
        </FadeInSection>

      </div>
    </PageTransition>
  );
};

export default StudentSelection;
