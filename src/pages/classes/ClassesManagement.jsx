import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, BookOpen, Clock, Calendar } from 'lucide-react';
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
import { useStableCallback } from '../../utils/reactOptimization';

export default function ClassesManagement() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  
  // Get authenticated user data
  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error parsing user data:', error);
      return null;
    }
  });
  
  // Add this useEffect to log the user object when the component mounts
  useEffect(() => {
    console.log('Current user from localStorage:', user);
    console.log('User schoolId:', user?.schoolId);
  }, [user]);

  const [classes, setClasses] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loading, setLoading] = useState(false);
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

  // Fetch school information using schoolService
  const fetchSchoolInfo = async () => {
    try {
      console.log('Fetching school ID from my-account...');
      // First get the school ID from my-account
      const accountData = await userService.getMyAccount();
      
      if (accountData && accountData.school_id) {
        console.log('School ID fetched from account:', accountData.school_id);
        
        // Then get detailed school information using schoolService
        console.log('Fetching school details using schoolService...');
        console.log('School ID to fetch:', accountData.school_id);
        console.log('API URL will be:', `${import.meta.env.VITE_API_URL || 'http://157.10.73.52:8085/api/v1'}/schools/${accountData.school_id}`);
        
        try {
          const schoolResponse = await schoolService.getSchoolInfo(accountData.school_id);
          console.log('Raw school service response:', schoolResponse);
          
          if (schoolResponse && schoolResponse.data) {
            console.log('School information fetched successfully:', {
              schoolId: schoolResponse.data.id,
              schoolName: schoolResponse.data.name
            });
            
            setSchoolInfo({
              id: schoolResponse.data.id,
              name: schoolResponse.data.name || `School ${schoolResponse.data.id}`
            });
          } else {
            console.warn('No school data returned from schoolService, using fallback');
            setSchoolInfo({
              id: accountData.school_id,
              name: `School ${accountData.school_id}`
            });
          }
        } catch (schoolError) {
          console.error('Error calling schoolService.getSchoolInfo:', schoolError);
          console.error('School error details:', {
            message: schoolError.message,
            status: schoolError.status,
            response: schoolError.response
          });
          
          // Use fallback with school ID but show a warning
          setSchoolInfo({
            id: accountData.school_id,
            name: `School ${accountData.school_id} (Failed to load name)`
          });
          
          // Show a less alarming message to the user
          console.log('Using school ID as fallback due to school service error');
        }
      } else {
        console.error('No school ID found in account data:', accountData);
        setSchoolInfo({ id: null, name: 'No School Found' });
        showError(t('noSchoolIdInAccount', 'No school ID found in your account. Please contact administrator.'));
      }
    } catch (error) {
      console.error('Error in fetchSchoolInfo (outer catch):', error);
      
      // Only show error if it's a critical account data error
      if (error.message && error.message.includes('account')) {
        showError(t('failedToFetchAccountInfo', 'Failed to fetch account information: ') + (error.message || 'Unknown error'));
      } else {
        console.log('Non-critical error in fetchSchoolInfo, will use fallback');
      }
      
      setSchoolInfo({ id: null, name: 'Error Loading School' });
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
        setUser(updatedUser);
        return updatedUser;
      } else {
        console.warn('No account data received from server');
        return user;
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
      return user; // Return original user data if refresh fails
    }
  };

  useEffect(() => {
    fetchSchoolInfo();
    fetchClasses();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch classes when user ID changes (after authentication)
  // Note: fetchClasses now uses my-account API directly, so we don't need to depend on user.classIds
  

  const fetchClasses = useStableCallback(async () => {
    try {
      setLoading(true);
      
      console.log('Fetching classes using my-account API...');
      
      // Get fresh class data from my-account API
      const accountData = await userService.getMyAccount();
      
      if (!accountData || !accountData.classes || !Array.isArray(accountData.classes)) {
        console.log('No classes found in account data');
        setClasses([]);
        return;
      }

      console.log('Found classes in account data:', accountData.classes);

      // Process each class from the my-account response
      const classPromises = accountData.classes.map(async (classData) => {
        const classId = parseInt(classData.class_id);
        
        try {
          // Get students for this class
          const studentsResponse = await studentService.getMyStudents({
            classId: classId,
            status: true
          });
          
          const studentCount = studentsResponse.data?.length || 0;
          
          return {
            id: classId,
            name: classData.name,
            grade: `Grade ${classData.grade_level}`,
            section: classData.section || 'A',
            subject: `Subject ${classData.grade_level}`,
            teacher: `Teacher ${accountData.teacherId || user.teacherId}`,
            schedule: 'Mon, Wed, Fri',
            room: `Room ${classId}`,
            capacity: parseInt(classData.max_students) || 50,
            enrolled: studentCount,
            description: `Class ${classData.name} - Grade ${classData.grade_level} (${classData.section})`,
            classId: classId,
            maxStudents: parseInt(classData.max_students) || 50,
            academicYear: classData.academic_year,
            status: classData.status
          };
        } catch (error) {
          console.error(`Error fetching students for class ${classId}:`, error);
          // Return the class with 0 students if there's an error
          return {
            id: classId,
            name: classData.name,
            grade: `Grade ${classData.grade_level}`,
            section: classData.section || 'A',
            subject: `Subject ${classData.grade_level}`,
            teacher: `Teacher ${accountData.teacherId || user.teacherId}`,
            schedule: 'Mon, Wed, Fri',
            room: `Room ${classId}`,
            capacity: parseInt(classData.max_students) || 50,
            enrolled: 0,
            description: `Class ${classData.name} - Grade ${classData.grade_level} (${classData.section})`,
            classId: classId,
            maxStudents: parseInt(classData.max_students) || 50,
            academicYear: classData.academic_year,
            status: classData.status
          };
        }
      });

      // Wait for all class promises to resolve and filter out any null values
      const formattedClasses = (await Promise.all(classPromises)).filter(cls => cls !== null);
      setClasses(formattedClasses);
      
      console.log(`Loaded ${formattedClasses.length} classes for teacher ${accountData.username || user.username}`);
      console.log('Formatted classes data:', formattedClasses);
      
    } catch (error) {
      console.error('Failed to fetch classes:', error);
      showError(t('error.fetchingClasses') || 'Failed to fetch classes');
      setClasses([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [showError, t]);
  useEffect(() => {
    if (user?.userId) {
      console.log('User authenticated, re-fetching classes...');
      fetchClasses();
    }
  }, [user?.userId, fetchClasses]); // Only depend on user ID, not entire user object

  const handleAddClass = () => {
    setFormData({
      name: '',
      gradeLevel: '',
      section: '',
      schoolId: schoolInfo.id?.toString() || '',
      teacherId: user?.teacherId || user?.id || '', // Prefer teacherId, fallback to id if not available
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
      
      // SECURITY: Validate that the class belongs to the authenticated teacher
      if (!user?.classIds?.includes(classData.classId)) {
        console.warn(`Teacher ${user?.username} attempted to edit unauthorized class ${classData.classId}`);
        showError(t('unauthorizedAction') || 'Unauthorized action');
        return;
      }
      
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
      const formDataToSet = {
        name: classData.name || '',
        gradeLevel: gradeLevel,
        section: classData.section || '',
        schoolId: schoolInfo.id?.toString() || '', // Use schoolId from my-account
        teacherId: classData.teacherId?.toString() || '',
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

  const handleDeleteClass = (classItem) => {
    // SECURITY: Validate that the class belongs to the authenticated teacher
    if (!user?.classIds?.includes(classItem.classId)) {
      console.warn(`Teacher ${user?.username} attempted to delete unauthorized class ${classItem.classId}`);
      showError(t('unauthorizedAction') || 'Unauthorized action');
      return;
    }
    
    setSelectedClass(classItem);
    setShowDeleteDialog(true);
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
          setShowEditModal(false);
          
          // Refresh user data from server to get updated class information
          console.log('Class updated successfully, refreshing user data...');
          await refreshUserData();
          
          // Then fetch classes with updated user data
          await fetchClasses();
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
              title={t('averageLoad') || 'ការទាក់ទញជាមធ្យម'}
              value={`${classes.length > 0 ? Math.round(classes.reduce((sum, cls) => sum + (cls.enrolled / cls.capacity), 0) / classes.length * 100) : 0}%`}
              icon={Clock}
              enhanced={true}
              responsive={true}
              hoverColor="hover:border-orange-200"
              gradientFrom="from-orange-500"
              gradientTo="to-orange-400"
            />
          </div>
        </FadeInSection>

        {/* Classes Grid */}
        <FadeInSection delay={0.2}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => {
          const enrollmentStatus = getEnrollmentStatus(classItem.enrolled, classItem.capacity);
          return (
            <div key={classItem.id} className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEditClass(classItem)}
                      className="text-indigo-600 hover:text-indigo-900 p-1 rounded"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-gray-800">
                      {t('grade') || 'Grade Level'} {classItem.grade.replace('Grade ', '')}
                    </span>
                    
                  </div>

                  <div className="text-sm text-gray-600">
                    <p className="flex items-center mb-1">
                      <Users className="h-4 w-4 mr-2" />
                      {t('Teacher:') || 'គ្រូ:'} {classItem.teacher}
                    </p>
                  </div>

                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">{t('Enrollment') || 'ចុះឈ្មោះ'}</span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${enrollmentStatus.color}`}>
                        {classItem.enrolled}/{classItem.capacity}
                      </span>
                    </div>
                    <div className="w-full bg-green-100 rounded-full h-2">
                      <div 
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(classItem.enrolled / classItem.capacity) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {classItem.description && (
                    <p className="text-sm text-gray-500 border-t pt-3">
                      {classItem.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
              );
            })}
          </div>
        </FadeInSection>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
        }}
        title={showAddModal ? (t('addClass') || 'Add Class') : (t('editClass') || 'Edit Class')}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('className') || 'Class Name'} *
              </label>
              <input
                type="text"
                name="name"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('grade') || 'Grade Level'} *
              </label>
              <select
                name="gradeLevel"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.gradeLevel}
                onChange={handleInputChange}
              >
                <option value="">{t('selectGrade') || 'Select Grade'}</option>
                {grades.map(grade => (
                  <option key={grade.value} value={grade.value}>
                    {grade.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('section') || 'Section'} *
              </label>
              <input
                type="text"
                name="section"
                required
                placeholder={t('sectionPlaceholder')}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.section}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('academicYear') || 'Academic Year'} *
              </label>
              <select
                name="academicYear"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={formData.academicYear}
                onChange={handleInputChange}
              >
                <option value="">{t('selectAcademicYear') || 'Select Academic Year'}</option>
                {academicYears.map(year => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('school') || 'School'} *
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="schoolName"
                  required
                  readOnly
                  value={schoolInfo.name}
                  className={`w-full border rounded-lg px-3 py-2 cursor-not-allowed ${
                    schoolInfo.name === 'Loading...' 
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : schoolInfo.name.includes('Error') || schoolInfo.name.includes('No School')
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'bg-gray-100 border-gray-300'
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
                {t('teacherId') || 'Teacher ID'} *
              </label>
              <input
                type="text"
                name="teacherId"
                required
                readOnly
                value={formData.teacherId}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-gray-100 cursor-not-allowed"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('maxStudents') || 'Maximum Students'} *
            </label>
            <input
              type="number"
              name="maxStudents"
              required
              min="1"
              max="200"
              placeholder={t('capacityPlaceholder')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={formData.maxStudents}
              onChange={handleInputChange}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowAddModal(false);
                setShowEditModal(false);
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t('cancel') || 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            >
              {loading ? (t('saving') || 'Saving...') : (showAddModal ? (t('addClass') || 'Add Class') : (t('updateClass') || 'Update Class'))}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
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