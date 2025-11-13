import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, BookOpen, Clock, Calendar, Building, User, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react';
import ClassCard from '@/components/ui/ClassCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import classService from '../../utils/api/services/classService'; // Import the classService
import { userService } from '../../utils/api/services/userService'; // Import userService for my-account
import schoolService from '../../utils/api/services/schoolService'; // Import schoolService for school info
import { teacherService } from '../../utils/api/services/teacherService'; // Import teacherService for teacher selection
import { getCurrentAcademicYear, generateAcademicYears } from '../../utils/academicYear'; // Import academic year utilities
import { useStableCallback, useRenderTracker } from '../../utils/reactOptimization';
import Dropdown from '@/components/ui/Dropdown';
import { Button } from '../../components/ui/Button';
import React from 'react'; // Added for useMemo
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import EmptyState from '../../components/ui/EmptyState';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function ClassesManagement() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const { startLoading, stopLoading, isLoading } = useLoading();

  // Track renders to detect infinite loops (development only)
  useRenderTracker('ClassesManagement');

  // Get authenticated user data
  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      console.error('Error parsing user data from localStorage:', err);
      // Can't use handleError here since hook isn't initialized yet
      return null;
    }
  });

  // Listen for localStorage changes (e.g., after login updates user data)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error parsing updated user data:', err);
      }
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Also set up a custom event listener for same-tab updates
    window.addEventListener('userDataUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated', handleStorageChange);
    };
  }, []);

  // Handle localStorage parsing error after hooks are initialized
  useEffect(() => {
    if (!user) {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          JSON.parse(userData); // Test parsing again
        }
      } catch (err) {
        handleError(err, {
          toastMessage: t('failedToParseUserData', 'Failed to parse user data'),
          setError: false // Don't show error display for localStorage parsing issues
        });
      }
    }
  }, [user, handleError, t]);


  const [classes, setClasses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({ id: null, name: 'Loading...' });
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [filteredTeachers, setFilteredTeachers] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalClasses, setTotalClasses] = useState(0);
  const classesPerPage = 6;

  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('');
  const [isFiltering, setIsFiltering] = useState(false);
  const [showAllTeachers, setShowAllTeachers] = useState(false);


  const [formData, setFormData] = useState(() => {
    return {
      name: '',
      gradeLevel: '',
      section: '',
      schoolId: '', // Will be set when schoolInfo is loaded
      teacherId: user?.teacherId || user?.id || '',
      teacherName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'Teacher',
      academicYear: getCurrentAcademicYear(),
      maxStudents: '30',
      subject: '',
      schedule: 'Mon, Wed, Fri',
      room: '',
      description: ''
    };
  });

  const grades = [
    { value: '1', label: t('grade1', 'Grade 1') },
    { value: '2', label: t('grade2', 'Grade 2') },
    { value: '3', label: t('grade3', 'Grade 3') },
    { value: '4', label: t('grade4', 'Grade 4') },
    { value: '5', label: t('grade5', 'Grade 5') },
    { value: '6', label: t('grade6', 'Grade 6') }
  ];

  // Generate academic years dynamically (2 past, current, 3 future for better coverage)
  const academicYears = generateAcademicYears(2, 3);

  // Fetch teachers for the school with optional grade level filter
  const fetchTeachers = async (schoolId, gradeLevel = null) => {
    try {
      if (!schoolId) {
        setAvailableTeachers([]);
        setFilteredTeachers([]);
        return;
      }

      // Build request parameters with proper limits
      const params = {
        limit: 50 // Set a reasonable limit for dropdown
      };
      if (gradeLevel) {
        params.grade_level = gradeLevel;
      }

      const response = await teacherService.getTeachersBySchool(schoolId, params);

      if (response && response.success && response.data && Array.isArray(response.data)) {
        // Format teachers for dropdown
        const formattedTeachers = response.data.map(teacher => ({
          value: teacher.teacherId?.toString() || '',
          label: `${teacher.user?.first_name || ''} ${teacher.user?.last_name || ''}`.trim() || teacher.user?.username || `Teacher ${teacher.teacherId}`,
          gradeLevel: teacher.gradeLevel,
          teacherData: teacher
        }));

        if (gradeLevel) {
          // If filtering by grade level, update filtered teachers
          setFilteredTeachers(formattedTeachers);
        } else {
          // If no filter, update both available and filtered teachers
          setAvailableTeachers(formattedTeachers);
          setFilteredTeachers(formattedTeachers);
        }
      } else {
        if (gradeLevel) {
          setFilteredTeachers([]);
        } else {
          setAvailableTeachers([]);
          setFilteredTeachers([]);
        }
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      handleError(error, {
        toastMessage: t('failedToFetchTeachers', 'Failed to fetch teachers')
      });
      if (gradeLevel) {
        setFilteredTeachers([]);
      } else {
        setAvailableTeachers([]);
        setFilteredTeachers([]);
      }
    }
  };

  // Fetch school information - first try from classes, then from my-account
  const fetchSchoolInfo = async () => {
    try {
      // Get school ID from my-account endpoint
      const accountData = await userService.getMyAccount();

      if (accountData && accountData.school_id) {

        try {
          const schoolResponse = await schoolService.getSchoolInfo(accountData.school_id);

          if (schoolResponse && schoolResponse.data) {
            setSchoolInfo({
              id: schoolResponse.data.id,
              name: schoolResponse.data.name || `School ${schoolResponse.data.id}`
            });
          } else {
            setSchoolInfo({
              id: accountData.school_id,
              name: `School ${accountData.school_id}`
            });
          }
        } catch (schoolError) {
          console.error('Error fetching school details:', schoolError);
          setSchoolInfo({
            id: accountData.school_id,
            name: `School ${accountData.school_id}`
          });
        }
      } else {
        setSchoolInfo({ id: null, name: 'No School Found' });
      }
    } catch (err) {
      console.error('Error in fetchSchoolInfo:', err);
      handleError(err, {
        toastMessage: t('failedToFetchSchoolId', 'Failed to fetch school information')
      });
      setSchoolInfo({ id: null, name: 'Error Loading School' });
      setInitialLoading(false); // Stop loading on error
    }
  };

  // Function to refresh user authentication data from server
  const refreshUserData = async () => {
    try {
      const accountData = await userService.getMyAccount();

      if (accountData) {
        // Extract class information from the new API response structure
        let classIds = [];
        let classNames = [];
        let gradeLevels = [];

        if (accountData.classes && Array.isArray(accountData.classes)) {
          classIds = accountData.classes.map(cls => parseInt(cls.class_id));
          classNames = accountData.classes.map(cls => cls.name);
          gradeLevels = accountData.classes.map(cls => cls.grade_level);
        } else {
          classIds = user?.classIds || [];
          classNames = user?.classNames || [];
          gradeLevels = user?.gradeLevels || [];
        }

        // Update the user state with fresh data from server
        const updatedUser = {
          ...user,
          classIds: classIds,
          classNames: classNames,
          gradeLevels: gradeLevels,
          // Also update other fields that might have changed
          teacherId: accountData.teacherId || user.teacherId,
          school_id: accountData.school_id || user.school_id,
          schoolId: accountData.school_id || user.schoolId, // For backward compatibility
        };

        // Update localStorage and state with fresh data
        localStorage.setItem('user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('userDataUpdated')); // Notify other components
        setUser(updatedUser);
        return updatedUser;
      } else {
        console.warn('No account data received from server');
        return user;
      }
    } catch (err) {
      console.error('Error refreshing user data:', err);
      handleError(err, {
        toastMessage: t('failedToFetchUserData', 'Failed to refresh user data')
      });
      return user; // Return original user data if refresh fails
    }
  };

  useEffect(() => {
    const initializePage = async () => {
      await Promise.all([
        fetchSchoolInfo(),
        fetchClasses()
      ]);
      // Don't set initialLoading to false here - let fetchClasses handle it when real data is fetched
    };

    initializePage();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch school info when user school_id changes (e.g., after login or transfer)
  useEffect(() => {
    if (user?.teacher?.schoolId || user?.school_id || user?.schoolId) {
      fetchSchoolInfo();
    }
  }, [user?.teacher?.schoolId, user?.school_id, user?.schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch teachers when school info is loaded
  useEffect(() => {
    if (schoolInfo?.id) {
      fetchTeachers(schoolInfo.id);
    }
  }, [schoolInfo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch classes when user ID changes (after authentication)
  // Note: fetchClasses now uses my-account API directly, so we don't need to depend on user.classIds


  const fetchClasses = useStableCallback(async (page = currentPage, gradeLevel = selectedGradeLevel, search = searchTerm, isPagination = false) => {
    try {
      if (isPagination) {
        setPaginationLoading(true);
      } else {
        startLoading('fetchClasses', t('loadingClasses', 'Loading classes...'));
      }

      if (!user?.id) {
        setClasses([]);
        setTotalPages(1);
        setTotalClasses(0);
        return;
      }

      if (!schoolInfo?.id) {
        setClasses([]);
        setTotalPages(1);
        setTotalClasses(0);
        return;
      }

      // Build query parameters
      const queryParams = {
        page: page,
        limit: classesPerPage
      };

      // Add filters if they exist
      if (gradeLevel) {
        queryParams.gradeLevel = gradeLevel;
      }
      if (search && search.trim()) {
        queryParams.search = search.trim();
      }

      // Get class data from /classes/school/{schoolId} endpoint with pagination and filters
      const classResponse = await classService.getBySchool(schoolInfo.id, queryParams);

      if (!classResponse || !classResponse.success || !classResponse.classes || !Array.isArray(classResponse.classes)) {
        setClasses([]);
        return;
      }


      // Process classes from the new API response - use studentCount directly from API
      // First, collect all unique teacher IDs to fetch full teacher data
      const teacherIds = [...new Set(classResponse.classes
        .filter(classData => classData.teacher?.teacherId)
        .map(classData => classData.teacher.teacherId)
      )];

      // Fetch full teacher details for all teachers in these classes
      const teacherDetailsMap = new Map();
      if (teacherIds.length > 0) {
        try {
          const teachersResponse = await teacherService.getTeachersBySchool(schoolInfo.id);
          if (teachersResponse && teachersResponse.success && teachersResponse.data) {
            teachersResponse.data.forEach(teacher => {
              if (teacher.teacherId) {
                teacherDetailsMap.set(teacher.teacherId, teacher);
              }
            });
          }
        } catch (teacherError) {
          console.warn('Failed to fetch teacher details:', teacherError);
        }
      }

      const formattedClasses = classResponse.classes.map((classData) => {
        // Get full teacher details if available
        const teacherDetails = classData.teacher?.teacherId ? teacherDetailsMap.get(classData.teacher.teacherId) : null;

        // Construct teacher name with full details
        let teacherName = 'Teacher';
        if (teacherDetails) {
          // Use full teacher details from teacherService
          teacherName = `${teacherDetails.user?.firstName || ''} ${teacherDetails.user?.lastName || ''}`.trim() || teacherDetails.user?.username || `Teacher ${teacherDetails.teacherId}`;
        } else if (classData.teacher) {
          // Fallback to class teacher data
          teacherName = `${classData.teacher.user?.firstName || classData.teacher.firstName || ''} ${classData.teacher.user?.lastName || classData.teacher.lastName || ''}`.trim() || classData.teacher.user?.username || classData.teacher.username || `Teacher ${classData.teacher.teacherId}`;
        }

        return {
          id: classData.classId,
          name: classData.name,
          grade: `Grade ${classData.gradeLevel}`,
          section: classData.section || 'A',
          subject: `Subject ${classData.gradeLevel}`,
          teacher: teacherName,
          teacherId: classData.teacher?.teacherId,
          userId: classData.teacher?.userId,
          teacherUser: classData.teacher?.user,
          schedule: 'Mon, Wed, Fri',
          room: `Room ${classData.classId}`,
          capacity: classData.maxStudents || 50,
          enrolled: classData.studentCount || 0, // Use studentCount directly from API
          description: `Class ${classData.name} - Grade ${classData.gradeLevel} (${classData.section})`,
          classId: classData.classId,
          maxStudents: classData.maxStudents || 50,
          academicYear: classData.academicYear,
          status: classData.status,
          school: classData.school
        };
      });
      setClasses(formattedClasses);

      // Update pagination state
      const total = classResponse.pagination?.total || classResponse.total || formattedClasses.length;
      const pages = classResponse.pagination?.totalPages || Math.ceil(total / classesPerPage);

      setTotalClasses(total);
      setTotalPages(pages);
      setCurrentPage(page);
      setDataFetched(true); // Mark data as fetched after successful API call
      setInitialLoading(false); // End initial loading after successful data fetch

    } catch (error) {
      console.error('Failed to fetch classes:', error);
      handleError(error, {
        toastMessage: t('error.fetchingClasses') || 'Failed to fetch classes'
      });
      setClasses([]); // Set empty array on error
      setTotalPages(1);
      setTotalClasses(0);
      setDataFetched(true); // Mark data as fetched even on error
      setInitialLoading(false); // End initial loading even on error
    } finally {
      if (isPagination) {
        setPaginationLoading(false);
      } else {
        stopLoading('fetchClasses');
      }
    }
  }, [startLoading, stopLoading, t, user?.id, handleError, schoolInfo?.id, classesPerPage]);
  // Main effect to fetch classes when user and school are available
  useEffect(() => {
    if (user?.id && schoolInfo?.id) {
      fetchClasses(currentPage, selectedGradeLevel, searchTerm);
    }
  }, [user?.id, schoolInfo?.id]); // Removed currentPage to prevent double fetch on pagination

  // Auto-apply filters when search term or grade level changes (with debounce for search)
  useEffect(() => {
    if (!user?.id || !schoolInfo?.id) return;

    const timeoutId = setTimeout(() => {
      setCurrentPage(1); // Reset to first page
      fetchClasses(1, selectedGradeLevel, searchTerm);
      setIsFiltering(searchTerm || selectedGradeLevel ? true : false);
    }, searchTerm ? 500 : 0); // 500ms debounce for search, immediate for grade level

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedGradeLevel]); // Removed user and schoolInfo dependencies

  const handleAddClass = () => {
    setFormData({
      name: '',
      gradeLevel: '',
      section: '',
      schoolId: schoolInfo.id?.toString() || '',
      teacherId: '', // Empty by default to show placeholder
      teacherName: '',
      academicYear: getCurrentAcademicYear(),
      maxStudents: '',
      subject: '',
      schedule: '',
      room: '',
      description: ''
    });

    // Fetch all teachers when opening add modal (no grade filter)
    if (schoolInfo.id) {
      fetchTeachers(schoolInfo.id);
    }

    setShowAddModal(true);
  };

  const handleEditClass = async (classItem) => {
    try {
      setLoading(true);

      // Fetch the latest class data from the API
      const response = await classService.getClassById(classItem.classId || classItem.id);

      if (!response) {
        throw new Error('Failed to fetch class details');
      }

      const classData = response.data || response;


      // Extract grade level from class name if not available in gradeLevel
      let gradeLevel = classData.gradeLevel || classData.grade?.replace('Grade ', '') || '';
      if (!gradeLevel && classData.name) {
        const gradeMatch = classData.name.match(/\d+/);
        if (gradeMatch) {
          gradeLevel = gradeMatch[0];
        }
      }

      // Convert gradeLevel to string to match select option values
      gradeLevel = gradeLevel ? gradeLevel.toString() : '';

      // Get academic year from class data
      let academicYear = classData.academicYear || '';

      // If we don't have an academic year, use the current academic year
      if (!academicYear) {
        academicYear = getCurrentAcademicYear();
      }

      // Create form data - use schoolId from my-account instead of API response
      // For teacher name, try multiple fallback sources
      let teacherName = 'Teacher'; // default fallback

      // Try to get teacher name from API response
      if (classData.teacher?.user?.first_name || classData.teacher?.user?.last_name) {
        teacherName = `${classData.teacher.user.first_name || ''} ${classData.teacher.user.last_name || ''}`.trim();
      } else if (classData.teacher?.first_name || classData.teacher?.last_name) {
        teacherName = `${classData.teacher.first_name || ''} ${classData.teacher.last_name || ''}`.trim();
      } else if (classData.teacher?.username) {
        teacherName = classData.teacher.username;
      } else {
        // Fallback to current user's name if this is their class
        teacherName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'Teacher';
      }

      const formDataToSet = {
        name: classData.name || '',
        gradeLevel: gradeLevel,
        section: classData.section || '',
        schoolId: schoolInfo.id?.toString() || '', // Use schoolId from my-account
        teacherId: classData.teacherId?.toString() || '',
        teacherName: teacherName,
        academicYear: academicYear,
        maxStudents: classData.maxStudents?.toString() || '30',
        subject: classData.subject || `Subject ${gradeLevel || ''}`.trim(),
        schedule: classData.schedule || 'Mon, Wed, Fri',
        room: classData.room || `Room ${classData.classId || ''}`.trim(),
        description: classData.description || ''
      };

      // Fetch teachers for the grade level when editing
      // If showAllTeachers is enabled, fetch all, otherwise filter by grade
      if (gradeLevel && schoolInfo.id && !showAllTeachers) {
        await fetchTeachers(schoolInfo.id, gradeLevel);
      } else if (schoolInfo.id) {
        await fetchTeachers(schoolInfo.id);
      }

      setSelectedClass(classData);
      setFormData(formDataToSet);
      setShowEditModal(true);
    } catch (error) {
      console.error('Error fetching class details:', error);
      showError(t('errorFetchingClassDetails') || 'Error fetching class details');
    } finally {
      setLoading(false);
    }
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.name || !formData.gradeLevel || !formData.academicYear || !formData.maxStudents) {
        showError(t('pleaseCompleteAllRequiredFields') || 'Please complete all required fields');
        return;
      }

      // Validate school information is available
      if (!schoolInfo.id) {
        // If school info is still loading, just show a loading message
        if (schoolInfo.name === 'Loading...' || schoolInfo.name === t('loadingText')) {
          showError(t('schoolInfoStillLoading') || 'School information is still loading. Please wait a moment and try again.');
          return;
        }

        // If school info failed to load, try to refetch it automatically
        await fetchSchoolInfo();

        // Check again after refetch
        if (!schoolInfo.id) {
          showError(t('schoolInfoNotAvailable') || 'School information is not available. Please try refreshing the page or contact administrator.');
          return;
        }
      }

      const classData = {
        name: formData.name.trim(),
        gradeLevel: parseInt(formData.gradeLevel),
        section: formData.section?.trim() || 'A',
        schoolId: parseInt(schoolInfo.id) || 0, // Always use schoolId from my-account
        teacherId: parseInt(formData.teacherId) || 0,
        academicYear: formData.academicYear.trim(),
        maxStudents: parseInt(formData.maxStudents) || 200
      };

      // Additional validation
      if (isNaN(classData.gradeLevel) || classData.gradeLevel < 1 || classData.gradeLevel > 12) {
        showError(t('invalidGradeLevel') || 'Grade level must be between 1 and 12');
        return;
      }

      if (classData.maxStudents < 1 || classData.maxStudents > 200) {
        showError(t('invalidMaxStudents') || 'Maximum students must be between 1 and 200');
        return;
      }

      if (showAddModal) {
        const response = await classService.createClass(classData);
        if (response.success) {
          showSuccess(t('classAddedSuccessfully') || 'Class added successfully');
          clearError(); // Clear any previous errors
          setShowAddModal(false);

          // Refresh user data from server to get updated class information
          await refreshUserData();

          // Then fetch classes with updated user data
          await fetchClasses();
        } else {
          throw new Error(response.message || response.error || 'Failed to create class');
        }
      } else if (showEditModal) {
        const response = await classService.updateClass(selectedClass.classId, classData);
        if (response.success) {
          showSuccess(t('classUpdatedSuccessfully') || 'Class updated successfully');
          clearError(); // Clear any previous errors
          setShowEditModal(false);

          // Refresh user data from server to get updated class information
          await refreshUserData();

          // Then fetch classes with updated user data
          await fetchClasses();
        } else {
          // Handle server-side errors (including authorization)
          const errorMessage = response.message || response.error || t('errorUpdatingClass') || 'Error updating class';
          throw new Error(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error saving class:', error);
      showError(error.message || t('errorSavingClass') || 'Error saving class');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    setLoading(true);
    try {
      const response = await classService.deleteClass(selectedClass.classId);
      if (response.success) {
        showSuccess(t('classDeletedSuccessfully') || 'Class deleted successfully');
        clearError(); // Clear any previous errors
        setShowDeleteDialog(false);

        // Refresh user data from server to get updated class information
        await refreshUserData();

        // Then fetch classes with updated user data
        await fetchClasses();
      } else {
        throw new Error(response.message || response.error || 'Failed to delete class');
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      showError(error.message || t('errorDeletingClass') || 'Error deleting class');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Filter handlers
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  const handleGradeLevelChange = (value) => {
    setSelectedGradeLevel(value);
    setCurrentPage(1); // Reset to first page when filtering
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedGradeLevel('');
    setCurrentPage(1);
    // Fetch classes will be triggered by useEffect
  };

  // Pagination handlers - memoized to prevent unnecessary re-renders
  const handlePageChange = React.useCallback((newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== currentPage && !paginationLoading) {
      setCurrentPage(newPage);
      fetchClasses(newPage, selectedGradeLevel, searchTerm, true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentPage, totalPages, paginationLoading, fetchClasses, selectedGradeLevel, searchTerm]);


  // Use the shared enrollment status utility from exportUtils

  // Compute the class with the highest number of students
  const mostEnrolledClass = React.useMemo(() => {
    if (!classes || classes.length === 0) return null;
    return classes.reduce((maxCls, cls) => (cls.enrolled > (maxCls?.enrolled ?? -1) ? cls : maxCls), null);
  }, [classes]);

  // Show error state if error exists (prioritize over loading)
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => retry(() => {
          clearError();
          window.location.reload(); // Reload the page to reinitialize everything
        })}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Show initial loading state (only if no error)
  if (initialLoading) {
    return (
      <PageLoader
        message={t('loadingClasses')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  return (
    <PageTransition duration='200' variant='zoom'>
      <div className="p-3 sm:p-4">
        {/* Header */}
        <FadeInSection className='rounded-lg p-4 sm:p-6 transition-all duration-300 mb-4'>
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  {t('classesManagement') || 'Classes Management'}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {t('manageClassSchedules') || 'Manage class schedules, assignments, and enrollment'}
                </p>
              </div>
              <Button
                onClick={handleAddClass}
                disabled={schoolInfo.name === 'Loading...' || schoolInfo.name.includes('Error') || !schoolInfo.id}
                variant="primary"
                size="sm"
                className="mt-4 sm:mt-0 max-w-32"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('addClass') || 'Add Class'}
              </Button>
            </div>
          </div>
          <div className="">
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              {/* Search Input */}
              <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('search', 'Search')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder={t('searchClasses', 'Search classes...')}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  />
                </div>
              </div>

              {/* Grade Level Filter */}
              <div className="w-full sm:w-48">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('gradeLevel', 'Grade Level')}
                </label>
                <Dropdown
                  value={selectedGradeLevel}
                  onValueChange={handleGradeLevelChange}
                  options={[
                    { value: '', label: t('allGrades', 'All Grades') },
                    ...grades
                  ]}
                  placeholder={t('selectGrade', 'Select Grade')}
                  className="w-full"
                  icon={Filter}
                />
              </div>

              {/* Filter Actions */}
              <div className="flex gap-2">
                {(searchTerm || selectedGradeLevel) && (
                  <Button
                    onClick={handleClearFilters}
                    variant="outline"
                    size="sm"
                  >
                    {t('clearFilters', 'Reset Filters')}
                  </Button>
                )}
              </div>
            </div>
            {/* Classes Grid */}
        <FadeInSection delay={0.2} className='mt-3 sm:mt-6'>
          {paginationLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" variant="primary">
                {t('loadingPage', 'Loading page...')}
              </LoadingSpinner>
            </div>
          ) : classes.length === 0 && dataFetched ? (
            <EmptyState
              icon={BookOpen}
              title={searchTerm || selectedGradeLevel ?
                t('noClassesFound', 'No classes found') :
                t('noClassesYet', 'No classes yet')
              }
              description={searchTerm || selectedGradeLevel ?
                t('noClassesMatchFilter', 'No classes match your current filters. Try adjusting your search or grade level filter.') :
                t('noClassesDescription', 'Get started by creating your first class.')
              }
              variant="neutral"
              actionLabel={!(searchTerm || selectedGradeLevel) ? t('addClass', 'Add Class') : undefined}
              onAction={!(searchTerm || selectedGradeLevel) ? handleAddClass : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.map((classItem) => {
                const badges = [];

                if (classItem.teacher) {
                  badges.push({
                    label: classItem.teacher,
                    color: 'blue',
                    variant: 'outline'
                  });
                }
                if (classItem.academicYear) {
                  badges.push({
                    label: classItem.academicYear,
                    color: 'orange',
                    variant: 'outline'
                  });
                }

                return (
                  <ClassCard
                    key={classItem.id}
                    title={classItem.name}
                    subtitleParts={[
                      `${t('grade') || 'Grade'} ${classItem.grade.replace('Grade ', '')}`,
                      classItem.section ? `${t('section') || 'Section'} ${classItem.section}` : ''
                    ]}
                    enrolled={classItem.enrolled}
                    capacity={classItem.capacity}
                    badges={badges}
                    onEdit={() => handleEditClass(classItem)}
                    onDelete={() => { setSelectedClass(classItem); setShowDeleteDialog(true); }}
                  />
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                total={totalClasses}
                limit={classesPerPage}
                onPageChange={handlePageChange}
                t={t}
                showFirstLast={true}
                showInfo={true}
                maxVisiblePages={5}
                disabled={paginationLoading}
              />
            </div>
          )}
        </FadeInSection>
          </div>
        </FadeInSection>


        {/* Add/Edit Modal */}
        <Modal
          isOpen={showAddModal || showEditModal}
          onClose={() => {
            clearError(); // Clear any errors when closing modal
            setLoading(false); // Reset loading state when closing modal
            setShowAddModal(false);
            setShowEditModal(false);
          }}
          title={showAddModal ? (t('addClass') || 'Add Class') : (t('editClass') || 'Edit Class')}
          size="lg"

          stickyFooter={true}
          footer={
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                onClick={() => {
                  clearError(); // Clear any errors when clicking cancel
                  setShowAddModal(false);
                  setShowEditModal(false);
                }}
                variant="outline"
                size="sm"
              >
                {t('cancel') || 'Cancel'}
              </Button>
              <Button
                type="submit"
                form="class-form"
                disabled={loading || schoolInfo.name === 'Loading...' || schoolInfo.name.includes('Error') || !schoolInfo.id}
                variant="primary"
                size="sm"
              >
                {loading ? (t('saving') || 'Saving...') : (showAddModal ? (t('addClass') || 'Add Class') : (t('updateClass') || 'Update Class'))}
              </Button>
            </div>
          }
        >
          <form id="class-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('school') || 'School'} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="schoolName"
                    required
                    readOnly
                    value={schoolInfo.name}
                    className={`mt-1 block w-full pl-10 rounded-md shadow-sm text-sm cursor-not-allowed ${schoolInfo.name === 'Loading...'
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : schoolInfo.name.includes('Error') || schoolInfo.name.includes('No School')
                        ? 'bg-red-50 border-red-300 text-red-700'
                        : 'bg-gray-50 border-0 focus:ring-0 focus:border-0 focus:outline-none'
                      }`}
                    title={`School ID: ${schoolInfo.id || 'Not available'}`}
                  />
                  {(schoolInfo.name.includes('Error') || schoolInfo.name.includes('No School')) && (
                    <Button
                      type="button"
                      onClick={fetchSchoolInfo}
                      variant="primary"
                      size="xs"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2"
                      title="Retry loading school information"
                    >
                      Retry
                    </Button>
                  )}
                </div>
                <input
                  type="hidden"
                  name="schoolId"
                  value={formData.schoolId}
                />
                {schoolInfo.name === 'Loading...' && (
                  <p className="text-xs text-blue-600 mt-1">Loading school information...</p>
                )}
                {(schoolInfo.name.includes('Error') || schoolInfo.name.includes('No School')) && (
                  <p className="text-xs text-red-600 mt-1">Failed to load school information. Click "Retry" to try again.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('className') || 'Class Name'} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <BookOpen className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="name"
                    required
                    className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder={t('enterClassName') || 'Enter class name'}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('grade') || 'Grade Level'} *
                </label>
                <Dropdown
                  value={formData.gradeLevel}
                  onValueChange={(value) => {
                    // Update grade level and filter teachers by grade
                    setFormData(prev => ({
                      ...prev,
                      gradeLevel: value,
                      // Reset teacher selection when grade changes unless showing all teachers
                      teacherId: showAllTeachers ? prev.teacherId : '',
                      teacherName: showAllTeachers ? prev.teacherName : ''
                    }));

                    // Fetch teachers filtered by the selected grade level
                    if (value && schoolInfo.id && !showAllTeachers) {
                      fetchTeachers(schoolInfo.id, value);
                    } else if (schoolInfo.id && !showAllTeachers) {
                      // If grade level is cleared, fetch all teachers
                      fetchTeachers(schoolInfo.id);
                    }
                  }}
                  options={[
                    { value: '', label: t('allGrades', 'All Grades') },
                    ...grades
                  ]}
                  placeholder={t('selectGrade') || 'Select Grade'}
                  className="w-full"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('teacher') || 'Teacher'} *
                  </label>
                  <label className="flex items-center space-x-2 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showAllTeachers}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setShowAllTeachers(checked);

                        // When toggling to show all teachers, fetch all teachers
                        if (checked && schoolInfo.id) {
                          fetchTeachers(schoolInfo.id);
                        }
                        // When toggling back to filtered, re-apply grade filter
                        else if (!checked && formData.gradeLevel && schoolInfo.id) {
                          fetchTeachers(schoolInfo.id, formData.gradeLevel);
                        } else if (!checked && schoolInfo.id) {
                          fetchTeachers(schoolInfo.id);
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>{t('showAllTeachers', 'Show all teachers')}</span>
                  </label>
                </div>
                {(showAllTeachers ? availableTeachers : filteredTeachers).length > 0 ? (
                  <>
                    <Dropdown
                      value={formData.teacherId}
                      onValueChange={(value) => {
                        const teacherList = showAllTeachers ? availableTeachers : filteredTeachers;
                        const selectedTeacher = teacherList.find(t => t.value === value);
                        const teacherName = selectedTeacher?.label || '';
                        setFormData(prev => ({
                          ...prev,
                          teacherId: value,
                          teacherName: teacherName
                        }));
                      }}
                      options={showAllTeachers ? availableTeachers : filteredTeachers}
                      placeholder={t('selectTeacher', 'Select Teacher')}
                      width="w-full"
                      icon={User}
                    />
                    {formData.gradeLevel && formData.teacherId && (
                      (() => {
                        const teacherList = showAllTeachers ? availableTeachers : filteredTeachers;
                        const selectedTeacher = teacherList.find(t => t.value === formData.teacherId);
                        const teacherGrade = selectedTeacher?.gradeLevel;
                        if (teacherGrade && teacherGrade.toString() !== formData.gradeLevel) {
                          return (
                            <p className="text-xs text-blue-600 mt-1">
                              {t('teacherAssignedToDifferentGrade', 'Note: This teacher is currently assigned to grade')} {teacherGrade}
                            </p>
                          );
                        }
                        return null;
                      })()
                    )}
                  </>
                ) : (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      name="teacherName"
                      required
                      readOnly
                      value={
                        !schoolInfo?.id ? t('loadingSchool', 'Loading school...') :
                          (showAllTeachers ? availableTeachers : filteredTeachers).length === 0 && formData.gradeLevel && !showAllTeachers ?
                            t('noTeachersForGrade', 'No teachers available for this grade') :
                            t('loadingTeachers', 'Loading teachers...')
                      }
                      className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none"
                    />
                  </div>
                )}
                <input
                  type="hidden"
                  name="teacherId"
                  value={formData.teacherId}
                />
                {formData.gradeLevel && (showAllTeachers ? availableTeachers : filteredTeachers).length === 0 && schoolInfo?.id && !showAllTeachers && (
                  <p className="text-xs text-amber-600 mt-1">
                    {t('noTeachersForGradeMessage', 'No teachers are assigned to grade')} {formData.gradeLevel}. {t('tryShowAllTeachers', 'Try enabling "Show all teachers" above.')}
                  </p>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('section') || 'Section'} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    name="section"
                    required
                    placeholder={t('sectionPlaceholder') || 'Enter section'}
                    className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    value={formData.section}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('academicYear') || 'Academic Year'} *
                </label>
                <Dropdown
                  value={formData.academicYear}
                  onValueChange={(value) => handleInputChange({ target: { name: 'academicYear', value } })}
                  options={academicYears.map(year => ({ value: year, label: year }))}
                  placeholder={t('selectAcademicYear') || 'Select Academic Year'}
                  className="w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('maxStudents') || 'Maximum Students'} *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="number"
                    name="maxStudents"
                    required
                    min="1"
                    max="200"
                    placeholder={t('capacityPlaceholder') || 'Enter maximum students'}
                    className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    value={formData.maxStudents}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </form>
        </Modal>

        {/* Delete Confirmation */}
        <ConfirmDialog
          isOpen={showDeleteDialog}
          onClose={() => {
            clearError(); // Clear any errors when closing delete dialog
            setLoading(false); // Reset loading state when closing delete dialog
            setShowDeleteDialog(false);
          }}
          onConfirm={handleConfirmDelete}
          title={t('confirmDelete') || 'Confirm Delete'}
          message={`${t('confirmDeleteClass') || 'Are you sure you want to delete'} ${selectedClass?.name}?`}
          type="danger"
          confirmText={t('delete') || 'Delete'}
          cancelText={t('cancel') || 'Cancel'}
          loading={isLoading('fetchClasses')}
        />
      </div>
    </PageTransition>
  );
}