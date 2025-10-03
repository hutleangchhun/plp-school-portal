import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, BookOpen, Clock, Calendar, Building, User } from 'lucide-react';
import ClassCard from '@/components/ui/ClassCard';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import StatsCard from '../../components/ui/StatsCard';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import classService from '../../utils/api/services/classService'; // Import the classService
import studentService from '../../utils/api/services/studentService'; // Import the studentService
import { userService } from '../../utils/api/services/userService'; // Import userService for my-account
import schoolService from '../../utils/api/services/schoolService'; // Import schoolService for school info
import { getCurrentAcademicYear, generateAcademicYears } from '../../utils/academicYear'; // Import academic year utilities
import { useStableCallback, useRenderTracker } from '../../utils/reactOptimization';
import Dropdown from '@/components/ui/Dropdown';
import React from 'react'; // Added for useMemo
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';

export default function ClassesManagement() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError, retry } = useErrorHandler();

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
          console.log('🔄 localStorage changed, updating user state:', parsedUser);
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

  // Add this useEffect to log the user object when the component mounts
  useEffect(() => {
    console.log('Current user from localStorage:', user);
    console.log('User schoolId:', user?.schoolId);
    console.log('User school_id:', user?.school_id);
  }, [user]);

  const [classes, setClasses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState({ id: null, name: 'Loading...' });

  // Add this useEffect to log school info changes (after schoolInfo is declared)
  useEffect(() => {
    console.log('School info updated:', schoolInfo);
  }, [schoolInfo]);

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
    { value: '1', label: 'Grade 1' },
    { value: '2', label: 'Grade 2' },
    { value: '3', label: 'Grade 3' },
    { value: '4', label: 'Grade 4' },
    { value: '5', label: 'Grade 5' },
    { value: '6', label: 'Grade 6' }
  ];

  // Generate academic years dynamically (2 past, current, 3 future for better coverage)
  const academicYears = generateAcademicYears(2, 3);

  // Fetch school information - first try from classes, then from my-account
  const fetchSchoolInfo = async () => {
    try {
      console.log('Fetching school information...');
      
      // First try to get school info from classes API
      const classResponse = await classService.getClassByUser(user.id);
      if (classResponse && classResponse.success && classResponse.classes && classResponse.classes.length > 0) {
        const firstClass = classResponse.classes[0];
        if (firstClass.school) {
          console.log('School info found from classes API:', firstClass.school);
          setSchoolInfo({
            id: firstClass.school.schoolId,
            name: firstClass.school.name
          });
          return;
        }
      }
      
      // Fallback to my-account if no school info in classes
      console.log('Trying to get school ID from my-account...');
      const accountData = await userService.getMyAccount();
      console.log('📥 Full my-account response in ClassesManagement:', accountData);

      if (accountData && accountData.school_id) {
        console.log('✅ School ID found in account:', accountData.school_id);
        
        try {
          const schoolResponse = await schoolService.getSchoolInfo(accountData.school_id);
          console.log('School service response:', schoolResponse);
          
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
        console.log('No school ID found in account data, using default');
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
      console.log('Refreshing user authentication data...');
      console.log('Current user before refresh:', user);
      
      const accountData = await userService.getMyAccount();
      console.log('Account data from server:', accountData);
      
      if (accountData) {
        // Check what fields are available in the account data
        console.log('Available fields in accountData:', Object.keys(accountData));
        
        // Extract class information from the new API response structure
        let classIds = [];
        let classNames = [];
        let gradeLevels = [];
        
        if (accountData.classes && Array.isArray(accountData.classes)) {
          classIds = accountData.classes.map(cls => parseInt(cls.class_id));
          classNames = accountData.classes.map(cls => cls.name);
          gradeLevels = accountData.classes.map(cls => cls.grade_level);
          
          console.log('Extracted from classes array:', {
            classIds,
            classNames,
            gradeLevels
          });
        } else {
          console.warn('No classes array found in account data, keeping original user data');
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
        
        console.log('Updated user data comparison:', {
          originalClassIds: user?.classIds,
          newClassIds: updatedUser.classIds,
          originalClassNames: user?.classNames,
          newClassNames: updatedUser.classNames,
          classesArrayLength: accountData.classes?.length || 0
        });
        
        // Update localStorage and state with fresh data
        console.log('Updating user data with fresh class information');
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
      try {
        await Promise.all([
          fetchSchoolInfo(),
          fetchClasses()
        ]);
      } finally {
        setInitialLoading(false);
      }
    };

    initializePage();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch school info when user school_id changes (e.g., after login or transfer)
  useEffect(() => {
    if (user?.school_id || user?.schoolId) {
      console.log('🔄 User school_id changed, re-fetching school info:', user.school_id || user.schoolId);
      fetchSchoolInfo();
    }
  }, [user?.school_id, user?.schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch classes when user ID changes (after authentication)
  // Note: fetchClasses now uses my-account API directly, so we don't need to depend on user.classIds
  

  const fetchClasses = useStableCallback(async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.log('No user ID available for fetching classes');
        setClasses([]);
        return;
      }
      
      console.log('Fetching classes using new classes/user API...');
      
      // Get class data from new /classes/user/{userId} endpoint
      const classResponse = await classService.getClassByUser(user.id);
      
      if (!classResponse || !classResponse.success || !classResponse.classes || !Array.isArray(classResponse.classes)) {
        console.log('No classes found in API response:', classResponse);
        setClasses([]);
        return;
      }

      console.log('Found classes in API response:', classResponse.classes);

      // Process each class from the new API response
      const classPromises = classResponse.classes.map(async (classData) => {
        const classId = classData.classId;
        
        try {
          // Get students for this class
          const studentsResponse = await studentService.getMyStudents({
            classId: classId,
            class: classId,
            page: 1,
            limit: 1,
            status: 'active'
          });
          
          const studentCount = studentsResponse?.pagination?.total || studentsResponse?.total || studentsResponse?.data?.length || 0;
          
          return {
            id: classId,
            name: classData.name,
            grade: `Grade ${classData.gradeLevel}`,
            section: classData.section || 'A',
            subject: `Subject ${classData.gradeLevel}`,
            teacher: `${classData.teacher?.user?.first_name || ''} ${classData.teacher?.user?.last_name || ''}`.trim() || 'Teacher',
            schedule: 'Mon, Wed, Fri',
            room: `Room ${classId}`,
            capacity: classData.maxStudents || 50,
            enrolled: studentCount,
            description: `Class ${classData.name} - Grade ${classData.gradeLevel} (${classData.section})`,
            classId: classId,
            maxStudents: classData.maxStudents || 50,
            academicYear: classData.academicYear,
            status: classData.status,
            school: classData.school
          };
        } catch (error) {
          console.error(`Error fetching students for class ${classId}:`, error);
          // Return the class with 0 students if there's an error
          return {
            id: classId,
            name: classData.name,
            grade: `Grade ${classData.gradeLevel}`,
            section: classData.section || 'A',
            subject: `Subject ${classData.gradeLevel}`,
            teacher: `${classData.teacher?.user?.first_name || ''} ${classData.teacher?.user?.last_name || ''}`.trim() || 'Teacher',
            schedule: 'Mon, Wed, Fri',
            room: `Room ${classId}`,
            capacity: classData.maxStudents || 50,
            enrolled: 0,
            description: `Class ${classData.name} - Grade ${classData.gradeLevel} (${classData.section})`,
            classId: classId,
            maxStudents: classData.maxStudents || 50,
            academicYear: classData.academicYear,
            status: classData.status,
            school: classData.school
          };
        }
      });

      // Wait for all class promises to resolve and filter out any null values
      const formattedClasses = (await Promise.all(classPromises)).filter(cls => cls !== null);
      setClasses(formattedClasses);
      
      console.log(`Loaded ${formattedClasses.length} classes for user ${user.username}`);
      console.log('Formatted classes data:', formattedClasses);
      
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      handleError(error, {
        toastMessage: t('error.fetchingClasses') || 'Failed to fetch classes'
      });
      setClasses([]); // Set empty array on error
      setInitialLoading(false); // Stop loading on error
    } finally {
      setLoading(false);
    }
  }, [showError, t, user?.id, user?.username, handleError]);
  useEffect(() => {
    if (user?.id) {
      console.log('User authenticated, re-fetching classes...');
      fetchClasses();
    }
  }, [user?.id, fetchClasses]); // Only depend on user ID, not entire user object

  const handleAddClass = () => {
    setFormData({
      name: '',
      gradeLevel: '',
      section: '',
      schoolId: schoolInfo.id?.toString() || '',
      teacherId: user?.teacherId || user?.id || '', // Prefer teacherId, fallback to id if not available
      teacherName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'Teacher',
      academicYear: getCurrentAcademicYear(),
      maxStudents: '',
      subject: '',
      schedule: '',
      room: '',
      description: ''
    });
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
      
      // SECURITY: The server will validate permissions when we make the API call
      // This client-side check was causing issues after updates due to stale state
      console.log('Proceeding to edit class:', classData.classId || classData.id);
      
      console.log('Fetched class data for editing:', classData);
      
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
      
      console.log('Setting form data with schoolId from my-account:', formDataToSet);
      
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
        console.log('Current schoolInfo state:', schoolInfo);
        
        // If school info is still loading, just show a loading message
        if (schoolInfo.name === 'Loading...' || schoolInfo.name === t('loadingText')) {
          showError(t('schoolInfoStillLoading') || 'School information is still loading. Please wait a moment and try again.');
          return;
        }
        
        // If school info failed to load, try to refetch it automatically
        console.log('School info not available, attempting to refetch...');
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
          console.log('Class created successfully, refreshing user data...');
          await refreshUserData();

          // Then fetch classes with updated user data
          await fetchClasses();
        }
      } else if (showEditModal) {
        const response = await classService.updateClass(selectedClass.classId, classData);
        if (response.success) {
          showSuccess(t('classUpdatedSuccessfully') || 'Class updated successfully');
          clearError(); // Clear any previous errors
          setShowEditModal(false);

          // Refresh user data from server to get updated class information
          console.log('Class updated successfully, refreshing user data...');
          await refreshUserData();

          // Then fetch classes with updated user data
          await fetchClasses();
        } else {
          // Handle server-side errors (including authorization)
          const errorMessage = response.message || response.error || t('errorUpdatingClass') || 'Error updating class';
          showError(errorMessage);
        }
      }
    } catch (error) {
      console.error('Error saving class:', error);
      showError(t('errorSavingClass') || 'Error saving class');
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
        console.log('Class deleted successfully, refreshing user data...');
        await refreshUserData();

        // Then fetch classes with updated user data
        await fetchClasses();
      }
    } catch (error) {
      console.error('Error deleting class:', error);
      showError(t('errorDeletingClass') || 'Error deleting class');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getEnrollmentStatus = (enrolled, capacity) => {
    const percentage = (enrolled / capacity) * 100;
    if (percentage >= 90) return { status: 'full', color: 'bg-red-100 text-red-800' };
    if (percentage >= 70) return { status: 'high', color: 'bg-yellow-100 text-yellow-800' };
    return { status: 'available', color: 'bg-green-100 text-green-800' };
  };

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
      <div className="flex-1 bg-gray-50 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">
            {t('loadingClasses')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="p-6">
        {/* Header */}
        <FadeInSection className='bg-white shadow rounded-lg p-4 sm:p-6 transition-all duration-300 mb-4'>
          <div className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('classesManagement') || 'Classes Management'}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {t('manageClassSchedules') || 'Manage class schedules, assignments, and enrollment'}
                </p>
              </div>
              <button
                onClick={handleAddClass}
                className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('addClass') || 'Add Class'}
              </button>
            </div>
          </div>
        </FadeInSection>

        {/* Stats Cards */}
        <FadeInSection delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
            <StatsCard
              title={t('totalClasses') || 'ថ្នាក់រៀនសរុប'}
              value={classes.length}
              icon={BookOpen}
              enhanced={true}
              responsive={true}
              hoverColor="hover:border-blue-200"
              gradientFrom="from-blue-500"
              gradientTo="to-blue-600"
            />
            
            <StatsCard
              title={t('totalStudents') || 'សិស្សសរុប'}
              value={classes.reduce((sum, cls) => sum + cls.enrolled, 0)}
              icon={Users}
              enhanced={true}
              responsive={true}
              hoverColor="hover:border-green-200"
              gradientFrom="from-green-500"
              gradientTo="to-green-600"
            />
            
            <StatsCard
              title={t('activeToday') || 'សកម្មថ្ងៃនេះ'}
              value={classes.filter(cls => cls.schedule && cls.schedule.includes('Mon')).length}
              icon={Calendar}
              enhanced={true}
              responsive={true}
              hoverColor="hover:border-purple-200"
              gradientFrom="from-purple-500"
              gradientTo="to-purple-600"
            />
            <StatsCard
              title={t('mostEnrolledClass') || 'ថ្នាក់ដែលមានសិស្សច្រើនបំផុត'}
              value={mostEnrolledClass ? `${mostEnrolledClass.name}` : '—'}
              icon={Users}
              enhanced={true}
              responsive={true}
              hoverColor="hover:border-amber-200"
              gradientFrom="from-amber-500"
              gradientTo="to-amber-400"
            />
            
            
          </div>
        </FadeInSection>

        {/* Classes Grid */}
        <FadeInSection delay={0.2} className='p-6 bg-white rounded-lg shadow'>
          <div className='mb-3'>
            <h3 className="text-lg font-medium text-gray-900">{t('yourClasses') || 'Your Classes'}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => {
          const enrollmentStatus = getEnrollmentStatus(classItem.enrolled, classItem.capacity);
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
              idLabel={classItem.academicYear ? `${t('academicYear') || 'Academic Year'} ${classItem.academicYear}` : ''}
              status={enrollmentStatus.status}
              onEdit={() => handleEditClass(classItem)}
              onDelete={() => { setSelectedClass(classItem); setShowDeleteDialog(true); }}
            />
          );
            })}
          </div>
        </FadeInSection>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          clearError(); // Clear any errors when closing modal
          setShowAddModal(false);
          setShowEditModal(false);
        }}
        title={showAddModal ? (t('addClass') || 'Add Class') : (t('editClass') || 'Edit Class')}
        size="lg"
        stickyFooter={true}
        footer={
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                clearError(); // Clear any errors when clicking cancel
                setShowAddModal(false);
                setShowEditModal(false);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              form="class-form"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {loading ? (t('saving') || 'Saving...') : (showAddModal ? (t('addClass') || 'Add Class') : (t('updateClass') || 'Update Class'))}
            </button>
          </div>
        }
      >
        <form id="class-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('grade') || 'Grade Level'} *
              </label>
              <Dropdown
                value={formData.gradeLevel}
                onValueChange={(value) => handleInputChange({ target: { name: 'gradeLevel', value } })}
                options={grades}
                placeholder={t('selectGrade') || 'Select Grade'}
                className="w-full"
              />
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
                  className={`mt-1 block w-full pl-10 rounded-md shadow-sm text-sm cursor-not-allowed ${
                    schoolInfo.name === 'Loading...' 
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : schoolInfo.name.includes('Error') || schoolInfo.name.includes('No School')
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'bg-gray-50 border-0 focus:ring-0 focus:border-0 focus:outline-none'
                  }`}
                  title={`School ID: ${schoolInfo.id || 'Not available'}`}
                />
                {(schoolInfo.name.includes('Error') || schoolInfo.name.includes('No School')) && (
                  <button
                    type="button"
                    onClick={fetchSchoolInfo}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    title="Retry loading school information"
                  >
                    Retry
                  </button>
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
                {t('teacher') || 'Teacher'} *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  name="teacherName"
                  required
                  readOnly
                  value={formData.teacherName}
                  className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm bg-gray-50 border-0 cursor-not-allowed focus:ring-0 focus:border-0 focus:outline-none"
                />
              </div>
              <input
                type="hidden"
                name="teacherId"
                value={formData.teacherId}
              />
            </div>
          </div>

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
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          clearError(); // Clear any errors when closing delete dialog
          setShowDeleteDialog(false);
        }}
        onConfirm={handleConfirmDelete}
        title={t('confirmDelete') || 'Confirm Delete'}
        message={`${t('confirmDeleteClass') || 'Are you sure you want to delete'} ${selectedClass?.name}?`}
        type="danger"
        confirmText={t('delete') || 'Delete'}
        cancelText={t('cancel') || 'Cancel'}
        loading={loading}
      />
      </div>
    </PageTransition>
  );
}