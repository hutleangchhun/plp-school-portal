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
  
  // Use the custom hook for managing selected students
  const {
    selectedStudents,
    selectedStudentsData,
    handleSelectStudent,
    removeStudent,
    clearAll,
    isSelected
  } = useSelectedStudents();
  const [schoolId, setSchoolId] = useState(null);
  const [listLoading, setListLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [filters, setFilters] = useState({
    search: ''
  });
  const [selectedClass, setSelectedClass] = useState('');
  const [showClassModal, setShowClassModal] = useState(false);
  const [assigningStudents, setAssigningStudents] = useState(false);

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
      
      console.log('=== STUDENT SELECTION FETCH DEBUG ===');
      console.log('School ID:', schoolId);
      console.log('Search term:', debouncedSearch);
      console.log('Pagination:', pagination);
      
      // Use the master-class endpoint to get all students from the school with search only
      const studentsResponse = await studentService.getStudentsBySchool(schoolId, {
        search: debouncedSearch,
        page: pagination.page,
        limit: pagination.limit
      });
      
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
      showError(error.message || t('errorFetchingData') || 'កំហុសក្នុងការទាញយកទិន្នន័យ');
      setStudents([]);
    } finally {
      setListLoading(false);
    }
  }, [schoolId, debouncedSearch, pagination.page, pagination.limit, showError, t]);

  // Fetch students when pagination or search changes (using debounced search)
  useEffect(() => {
    if (schoolId) {
      fetchData();
    }
  }, [schoolId, fetchData]); // Simplified dependencies

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
    // Reset to first page when filters change
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };


  const handleAssignToClass = async () => {
    if (!selectedClass || selectedStudents.length === 0) {
      showError(t('selectClassFirst') || 'សូមជ្រើសរើសថ្នាក់ជាមុនសិន');
      return;
    }

    try {
      setAssigningStudents(true);
      
      // Convert selectedClass to number for API call
      const classId = parseInt(selectedClass);
      
      // Find the selected class details to check capacity
      const selectedClassData = classes.find(cls => 
        cls.id === classId || cls.id === selectedClass || 
        cls.id.toString() === selectedClass
      );
      
      if (selectedClassData && selectedClassData.maxStudents) {
        // Get current enrollment count for this class
        try {
          const currentStudentsResponse = await studentService.getMyStudents({ classId: classId });
          const currentEnrollment = currentStudentsResponse?.data?.length || 0;
          const maxStudents = selectedClassData.maxStudents;
          const remainingCapacity = maxStudents - currentEnrollment;
          
          console.log(`Class capacity check: ${currentEnrollment}/${maxStudents} (${remainingCapacity} remaining)`);
          
          // Check if adding selected students would exceed capacity
          if (selectedStudents.length > remainingCapacity) {
            showError(
              t('classCapacityExceeded') || 
              `Cannot assign ${selectedStudents.length} students. Class "${selectedClassData.name}" has only ${remainingCapacity} spots remaining (${currentEnrollment}/${maxStudents} currently enrolled).`
            );
            return;
          }
        } catch (error) {
          console.warn('Could not check current enrollment, proceeding with assignment:', error);
        }
      }
      
      await studentService.addStudentsToClass(classId, selectedStudents);
      
      // Show success message
      const selectedClassName = selectedClassData?.name || 'Unknown Class';
      showSuccess(t('studentsAssignedSuccessfully').replace('{count}', selectedStudents.length).replace('{className}', selectedClassName));
      
      // Reset selections and close modal
      clearAll();
      setSelectedClass('');
      setShowClassModal(false);
      
      // Refresh the student list
      fetchData();
      
    } catch (error) {
      console.error('Error assigning students to class:', error);
      showError(t('errorAssigningStudents') || 'កំហុសក្នុងការកំណត់សិស្សទៅថ្នាក់');
    } finally {
      setAssigningStudents(false);
    }
  };

  // Show initial loading state
  if (initialLoading) {
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
              <div className="flex justify-end">
                <Button
                  onClick={() => handleFilterChange({ search: '' })}
                  variant="outline"
                  size="sm"
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('resetFilters') || 'កំណត់ឡើងវិញ'}
                </Button>
              </div>
            </div>
          </div>
          
        </FadeInSection>

        {/* Selected Students Display */}
        <FadeInSection delay={300}>
          <SelectedStudentsManager
            selectedStudents={selectedStudents}
            selectedStudentsData={selectedStudentsData}
            onRemoveStudent={removeStudent}
            onClearAll={clearAll}
            onBulkAction={(actionKey) => {
              if (actionKey === 'assignToClass') {
                setShowClassModal(true);
              }
            }}
            actions={[
              {
                key: 'assignToClass',
                label: t('assignToClass') || 'កំណត់ទៅថ្នាក់',
                className: 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }
            ]}
          />
        </FadeInSection>

        {/* Students List */}
        <FadeInSection delay={400}>
          <div className="bg-white shadow-sm border border-gray-200 rounded-xl overflow-hidden">
        {listLoading && (
          <div className="w-full flex items-center justify-center py-8">
            <LoadingSpinner size="default" variant="primary" />
          </div>
        )}
        {students.length > 0 ? (
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
                      checked={isSelected(student.id)}
                      onChange={() => handleSelectStudent(student)}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-indigo-600" />
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {student.name}
                        </h3>
                        <Badge color={student.isActive ? 'green' : 'gray'} size="sm">
                          {student.isActive ? (t('active') || 'សកម្ម') : (t('inactive') || 'មិនសកម្ម')}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">
                          {student.studentId}
                        </span>
                        <span>•</span>
                        <span className="truncate">{student.email}</span>
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
              {debouncedSearch && (
                <Button
                  onClick={() => handleFilterChange({ search: '' })}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  <X className="h-4 w-4 mr-2" />
                  {t('clearSearch') || 'Clear Search'}
                </Button>
              )}
            </div>
          </div>
        )}
          {/* Pagination (shadcn-styled from shared UI) */}
          <FadeInSection delay={500}>
            <UIPagination
              pagination={pagination}
              onPageChange={handlePageChange}
              t={(key, fallback) => t(key) || fallback}
            />
          </FadeInSection>
        </div>
        </FadeInSection>

      {/* Class Assignment Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowClassModal(false)}></div>
          
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">
                  {t('assignToClass') || 'កំណត់ទៅថ្នាក់'}
                </h3>
                <button
                  onClick={() => setShowClassModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-400" />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-4">
                  {t('selectClassToAssign') || `Assign ${selectedStudents.length} selected student${selectedStudents.length !== 1 ? 's' : ''} to:`}
                </p>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 block">
                    {t('selectClass') || 'Select Class'}
                  </label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('selectClass') || 'Select a class...'} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem 
                          key={cls.id} 
                          value={cls.id.toString()}
                        >
                          {cls.name} - Grade {cls.gradeLevel} (Max: {cls.maxStudents || 50})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowClassModal(false);
                    setSelectedClass('');
                  }}
                  className="flex-1 h-11 border-gray-300 hover:bg-gray-50"
                  disabled={assigningStudents}
                >
                  {t('cancel') || 'Cancel'}
                </Button>
                <Button
                  onClick={handleAssignToClass}
                  disabled={!selectedClass || assigningStudents}
                  className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300"
                >
                  {assigningStudents ? (
                    <>
                      <LoadingSpinner size="sm" variant="white" className="mr-2" />
                      {t('assigning') || 'Assigning...'}
                    </>
                  ) : (
                    <>{t('assignStudents') || 'Assign Students'}</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </PageTransition>
  );
};

export default StudentSelection;
