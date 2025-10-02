import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MinusCircle, Edit2, User, Users, ChevronDown, Download, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import { studentService } from '../../utils/api/services/studentService';
import { userService } from '../../utils/api/services/userService';
import classService from '../../utils/api/services/classService';
import { useStableCallback } from '../../utils/reactOptimization';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import useSelectedStudents from '../../hooks/useSelectedStudents';
import { Badge } from '../../components/ui/Badge';
import { Table, MobileCards } from '../../components/ui/Table';
import { prepareAndExportExcel, prepareAndExportCSV, prepareAndExportPDF, getTimestampedFilename } from '../../utils/exportUtils';
import StudentEditModal from '../../components/students/StudentEditModal';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';

/**
 * StudentsManagement Component
 * 
 * SECURITY NOTE: This component is designed with security-first approach:
 * - Only fetches students via teacher-scoped endpoint (/students/my-students)
 * - Never directly accesses class-specific student endpoints
 * - Client-side filtering ensures teachers only see their own students
 * - Validates class IDs against teacher's assigned classes
 */
export default function StudentsManagement() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError, retry } = useErrorHandler();
  
  // Debug: Log error state changes
  useEffect(() => {
    console.log('StudentsManagement: Error state changed:', error);
  }, [error]);
  
  // Debug: Add test error trigger
  const triggerTestError = () => {
    console.log('🧪 Triggering test error...');
    handleError(new Error('Test network error'), {
      toastMessage: 'Test error message'
    });
  };
  
  // Get authenticated user data
  const [user] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      console.error('Error parsing user data from localStorage:', err);
      // Can't use handleError here since hook isn't initialized yet
      return null;
    }
  });

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
  
  // State for current user's school ID (fetched from my-account endpoint)
  const [schoolId, setSchoolId] = useState(null);
  
  // State for students list and pagination
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  
  // State for classes information (derived from authenticated user)
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  
  
  // Other state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState(''); // For immediate UI feedback
  const [academicYearFilter, setAcademicYearFilter] = useState(''); // Academic year filter
  const [debouncedAcademicYear, setDebouncedAcademicYear] = useState(''); // Debounced academic year
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  // Use the custom hook for managing selected students
  const {
    selectedStudents,
    selectedStudentsData,
    handleSelectStudent,
    removeStudent,
    clearAll,
    isSelected
  } = useSelectedStudents();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const fetchingRef = useRef(false);
  const lastFetchParams = useRef(null);
  const searchTimeoutRef = useRef(null);
  const classesInitialized = useRef(false);
  
  // State for all students (unfiltered) and filtered students
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);

  
  // Enhanced client-side search function
  const performClientSideSearch = useCallback((studentsData, searchQuery) => {
    if (!searchQuery || searchQuery.trim() === '') {
      return studentsData;
    }
    
    const query = searchQuery.trim().toLowerCase();
    
    return studentsData.filter(student => {
      // Search in multiple fields
      const searchFields = [
        student.firstName || '',
        student.lastName || '',
        student.username || '',
        student.email || '',
        student.phone || '',
        (student.name || ''),
        (student.firstName && student.lastName ? `${student.firstName} ${student.lastName}` : ''),
        (student.class?.name || ''),
        (student.className || '')
      ];
      
      return searchFields.some(field => 
        field.toLowerCase().includes(query)
      );
    });
  }, []);
  
  // Debounced search handler
  const handleSearchChange = useCallback((value) => {
    setLocalSearchTerm(value);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Apply client-side filter immediately for better UX
    const filtered = performClientSideSearch(allStudents, value);
    setFilteredStudents(filtered);

    // Debounce server-side search
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
    }, 500);
  }, [allStudents, performClientSideSearch]);

  // Debounced academic year handler
  const handleAcademicYearChange = useCallback((value) => {
    setAcademicYearFilter(value);
  }, []);

  // Debounce the academic year filter
  useEffect(() => {
    const id = setTimeout(() => setDebouncedAcademicYear(academicYearFilter), 300);
    return () => clearTimeout(id);
  }, [academicYearFilter]);
  
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
    } catch (err) {
      console.error('Error fetching school ID:', err);
      handleError(err, {
        toastMessage: t('failedToFetchSchoolId', 'Failed to fetch school information')
      });
      setInitialLoading(false); // Stop loading on error
    }
  }, [schoolId, showError, t, user?.id, handleError]);
  
  // Initialize classes using new classes/user API
  const initializeClasses = useStableCallback(async () => {
    console.log('🚀 initializeClasses called');
    // Avoid re-initializing if classes are already loaded
    if (classesInitialized.current) {
      console.log('Classes already initialized, skipping');
      return;
    }
    
    console.log('=== INITIALIZING CLASSES FROM NEW API ===');
    console.log('Current user object:', user);
    
    if (!user?.id) {
      console.log('🚨 No user ID available for fetching classes');
      console.log('User object:', user);
      setClasses([]);
      setSelectedClassId('all');
      setInitialLoading(false); // Stop loading when no user
      
      // If there's no user, that's likely an authentication issue
      handleError(new Error('No authenticated user found'), {
        toastMessage: t('authenticationRequired', 'Authentication required')
      });
      return;
    }

    try {
      console.log('Fetching classes using new classes/user API...');

      // Get class data from new /classes/user/{userId} endpoint
      console.log('🌐 Calling classService.getClassByUser with user ID:', user.id);
      const classResponse = await classService.getClassByUser(user.id);
      console.log('📨 Got class response:', classResponse);
      
      if (!classResponse || !classResponse.success || !classResponse.classes || !Array.isArray(classResponse.classes)) {
        console.log('🚨 No classes found in API response:', classResponse);
        setClasses([]);
        setSelectedClassId('all');
        setInitialLoading(false); // Stop loading when no classes found
        
        // This might indicate a backend issue or authorization problem
        if (!classResponse || !classResponse.success) {
          handleError(new Error('Failed to fetch classes from server'), {
            toastMessage: t('failedToFetchClasses', 'Failed to fetch classes')
          });
        }
        return;
      }

      console.log('Found classes in API response:', classResponse.classes);

      // Process classes from the new API response
      const teacherClasses = classResponse.classes.map((classData) => ({
        classId: classData.classId,
        name: classData.name,
        gradeLevel: classData.gradeLevel,
        section: classData.section || 'A',
        academicYear: classData.academicYear,
        teacherId: classData.teacherId,
        maxStudents: classData.maxStudents,
        schoolId: classData.schoolId,
        status: classData.status
      }));

      setClasses(teacherClasses);
      classesInitialized.current = true;

      // Extract and set school ID from the first class if not already set
      if (!schoolId && teacherClasses.length > 0 && teacherClasses[0].schoolId) {
        console.log('Setting school ID from classes data:', teacherClasses[0].schoolId);
        setSchoolId(teacherClasses[0].schoolId);
      }

      // Set first class as default if none selected and teacher has only one class
      if (selectedClassId === 'all' && teacherClasses.length === 1) {
        setSelectedClassId(teacherClasses[0].classId.toString());
      }

      console.log(`User ${user.username} has access to ${teacherClasses.length} classes:`, 
        teacherClasses.map(c => `${c.name} (ID: ${c.classId})`));
      
      // Mark classes as initialized successfully
      classesInitialized.current = true;
      
      // If we get here successfully, data loading should finish soon
      // Set a fallback timer in case fetchStudents doesn't get called
      setTimeout(() => {
        if (initialLoading) {
          console.log('⏰ Fallback: Setting initialLoading to false after successful class initialization');
          setInitialLoading(false);
        }
      }, 2000);
        
    } catch (err) {
      console.error('🚨 CAUGHT ERROR in initializeClasses:', err);
      console.log('🚨 Error details:', {
        message: err.message,
        response: err.response,
        code: err.code
      });
      handleError(err, {
        toastMessage: t('failedToFetchClasses', 'Failed to fetch classes')
      });
      setClasses([]);
      setSelectedClassId('all');
      setInitialLoading(false); // Stop loading on error
      console.log('🚨 Set initialLoading to false after error');
    }
  }, [user?.id, user?.username, handleError, t]);

  // Fetch students with pagination and filters using my-students endpoint
  const fetchStudents = useStableCallback(async (search = searchTerm, force = false, skipLoading = false, academicYear = academicYearFilter) => {
    // Ensure we have classes initialized before fetching students
    if (!classesInitialized.current) {
      console.log('Classes not yet initialized, skipping student fetch...');
      return;
    }

    // Create a unique key for current fetch parameters
    const currentParams = JSON.stringify({
      search,
      selectedClassId,
      userId: user?.id,
      page: pagination.page,
      limit: pagination.limit
    });
    
    // Prevent duplicate fetches with same parameters unless forced
    if (!force && (fetchingRef.current || lastFetchParams.current === currentParams)) {
      console.log('Skipping duplicate fetch with same parameters');
      return;
    }
    
    fetchingRef.current = true;
    lastFetchParams.current = currentParams;
    try {
      if (!skipLoading) {
        setLoading(true);
      }
       
      console.log(`=== FETCH STUDENTS (MY-STUDENTS) ===`);
      console.log(`Selected class ID: ${selectedClassId}`);
      console.log(`Search term: ${search}`);
      console.log(`Available classes: ${classes.map(c => c.classId).join(', ')}`);
       
      // Always use server-side pagination like before
      const requestParams = {
        page: pagination.page,
        limit: pagination.limit
      };
       
      console.log(`=== FETCH STUDENTS CALLED ===`);
      console.log(`Current pagination state:`, pagination);
      console.log(`Request params being sent to API:`, requestParams);
       
      // Add class filter if specific class is selected
      if (selectedClassId !== 'all') {
        const selectedClassIdInt = parseInt(selectedClassId);
         
        // SECURITY: Ensure the selected class ID is actually in the teacher's authorized classes
        const authorizedClassIds = classes.map(c => c.classId);
        if (authorizedClassIds.length > 0) {
          if (!authorizedClassIds.includes(selectedClassIdInt)) {
            console.warn(`Teacher ${user?.username} attempted to access unauthorized class ID: ${selectedClassId}`);
            showError(t('unauthorizedClassAccess', 'You do not have permission to view students from this class'));
            setStudents([]);
            setAllStudents([]);
            setFilteredStudents([]);
            return;
          }
        } else {
          console.warn('No classes found for teacher, cannot validate class access');
          showError(t('noClassesAssigned', 'No classes assigned to your account'));
          setStudents([]);
          setAllStudents([]);
          setFilteredStudents([]);
          return;
        }
         
        // Send both camelCase and snake_case to be safe with backend
        requestParams.classId = selectedClassIdInt;
        requestParams.class_id = selectedClassIdInt;
        console.log(`Filtering by authorized class ${selectedClassIdInt}`);
      } else {
        // When fetching all students, ensure we only get students from authorized classes
        if (classes.length > 0) {
          console.log(`Fetching students from authorized classes: ${classes.map(c => c.classId).join(', ')}`);
          // The my-students endpoint should automatically filter by teacher's classes
        } else {
          console.warn('No classes found for teacher, cannot fetch students');
          showError(t('noClassesAssigned', 'No classes assigned to your account'));
          setStudents([]);
          setAllStudents([]);
          setFilteredStudents([]);
          return;
        }
      }
      
       
      console.log(`API request params:`, requestParams);
      console.log(`=== END FETCH STUDENTS ===`);
       
      // Add academic year filter if provided
      if (academicYear && academicYear.trim()) {
        requestParams.academicYear = academicYear.trim();
      }

      // Use my-students endpoint (teacher-scoped)
      const response = await studentService.getMyStudents(requestParams);
       
      console.log('=== API RESPONSE (MY-STUDENTS) ===');
      console.log('Full API response:', response);
      console.log('Response success:', response?.success);
      console.log('Response data length:', response?.data?.length);
      console.log('=== END API RESPONSE ===');
       
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch students from school');
      }
       
      let data = response.data || [];
       
      console.log(`Fetched ${data.length} students from school ${schoolId} for ${selectedClassId === 'all' ? 'all classes' : `class ${selectedClassId}`}`);
       
      console.log('Raw students data from API:', data);
       
      // Store for reference
      setAllStudents(data);
      setFilteredStudents(data);
       
      // Server-side pagination: use returned data and server pagination info
      setStudents(data);
      if (response.pagination) {
        setPagination({
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          pages: response.pagination.pages
        });
      }
       
    } catch (err) {
      console.error('Error fetching students from school:', err);
      handleError(err, {
        toastMessage: t('errorFetchingStudents', 'Failed to fetch students')
      });
      setStudents([]);
      setAllStudents([]);
      setFilteredStudents([]);
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [selectedClassId, user?.id, academicYearFilter, showError, t, handleError]);

  // Initialize classes when component mounts
  useEffect(() => {
    console.log('🔄 Component mounted, initializing classes...');
    initializeClasses().catch((err) => {
      console.error('🚨 Unhandled error in initializeClasses:', err);
      setInitialLoading(false); // Ensure loading stops
    });
  }, [initializeClasses]);

  // Initial fetch when classes become available
  useEffect(() => {
    if (classes.length > 0 && classesInitialized.current) {
      console.log('Classes available, initial fetch...');
      fetchStudents('', true).finally(() => {
        setInitialLoading(false);
      }); // Force initial fetch
    }
  }, [classes.length, fetchStudents]);

  // Memoized fetch parameters to avoid unnecessary re-renders
  const fetchParams = useMemo(() => ({
    searchTerm,
    selectedClassId,
    academicYearFilter: debouncedAcademicYear,
    classesLength: classes.length,
    page: pagination.page,
    limit: pagination.limit
  }), [searchTerm, selectedClassId, debouncedAcademicYear, classes.length, pagination.page, pagination.limit]);

  // Separate useEffect for class ID validation to avoid infinite loops
  useEffect(() => {
    if (classes.length === 0) return; // Wait for classes to load
    
    // SECURITY: Validate that selectedClassId belongs to teacher's authorized classes
    if (selectedClassId !== 'all') {
      const selectedClassIdInt = parseInt(selectedClassId);
      const authorizedClassIds = classes.map(c => c.classId);
      const isValidClass = authorizedClassIds.includes(selectedClassIdInt);
      if (!isValidClass) {
        console.warn(`Invalid class ID ${selectedClassId} selected for teacher ${user?.username}. Resetting to 'all'.`);
        setSelectedClassId('all');
      }
    }
  }, [selectedClassId, user?.username, classes]);

  // Single useEffect to handle all data fetching
  useEffect(() => {
    console.log(`=== USE EFFECT TRIGGERED ===`);
    console.log(`Current fetch params:`, fetchParams);
    
    if (fetchParams.classesLength === 0) {
      console.log(`Waiting for classes to load...`);
      return; // Wait for classes to load
    }

    // Debounce only for search changes, immediate for filter changes
    const isSearchChange = fetchParams.searchTerm.trim() !== '';
    const delay = isSearchChange ? 500 : 100; // Small delay to batch state changes

    console.log(`Setting timer with delay ${delay}ms to fetch students`);
    const timer = setTimeout(() => {
      console.log(`Timer fired - calling fetchStudents with page ${fetchParams.page}, limit ${fetchParams.limit}, academicYear: ${debouncedAcademicYear}`);
      // Only fetch if not already fetching and has required data
      if (!fetchingRef.current && classesInitialized.current) {
        fetchStudents(fetchParams.searchTerm, false, false, debouncedAcademicYear);
      } else {
        console.log('Skipping fetch - already fetching or classes not initialized');
      }
    }, delay);
    
    return () => {
      console.log(`Cleaning up timer`);
      clearTimeout(timer);
    };
  }, [fetchParams, fetchStudents]);
  
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
    console.log(`=== PAGINATION CHANGE DEBUG ===`);
    console.log(`Changing from page ${pagination.page} to page ${newPage}`);
    console.log(`Total pages available: ${pagination.pages}`);
    console.log(`Current limit: ${pagination.limit}`);
    
    if (newPage >= 1 && newPage <= pagination.pages) {
      console.log(`Valid page change - updating pagination state`);
      setPagination(prev => {
        const newPagination = { ...prev, page: newPage };
        console.log(`New pagination state:`, newPagination);
        return newPagination;
      });
    } else {
      console.warn(`Invalid page change attempted: page ${newPage} not in range 1-${pagination.pages}`);
    }
    console.log(`=== END PAGINATION CHANGE DEBUG ===`);
  };

  // Reset pagination to page 1 when filters change
  const prevFiltersRef = useRef({ selectedClassId, academicYearFilter: debouncedAcademicYear });
  useEffect(() => {
    const filtersChanged = prevFiltersRef.current.selectedClassId !== selectedClassId ||
                          prevFiltersRef.current.academicYearFilter !== debouncedAcademicYear;

    if (filtersChanged) {
      if (pagination.page !== 1) {
        console.log(`Filter changed - resetting pagination to page 1`);
        setPagination(prev => ({ ...prev, page: 1 }));
      }
      prevFiltersRef.current = { selectedClassId, academicYearFilter: debouncedAcademicYear };
    }
  }, [selectedClassId, debouncedAcademicYear, pagination.page]); // Reset page when filters change
  
  // Get class information for the selected class
  const classInfo = selectedClassId !== 'all' 
    ? classes.find(c => c.classId.toString() === selectedClassId)
    : null;

  // Delete Confirmation Dialog
  const DeleteDialog = () => (
    <ConfirmDialog
      isOpen={showDeleteDialog}
      onClose={() => setShowDeleteDialog(false)}
      onConfirm={handleDeleteStudent}
      title={t('moveStudentToMaster', 'Move Student to Master Class')}
      message={`${t('confirmMoveStudentToMaster', 'Are you sure you want to move')} ${selectedStudent?.firstName || t('thisStudent', 'this student')} ${t('toMasterClass', 'to the master class? This will remove them from the current class.')}`}
      confirmText={loading ? t('moving', 'Moving...') : t('moveToMaster', 'Move to Master')}
      confirmVariant="danger"
      cancelText={t('cancel', 'Cancel')}
      isConfirming={loading}
    />
  );

  // Bulk Delete Confirmation Dialog
  const BulkDeleteDialog = () => (
    <ConfirmDialog
      isOpen={showBulkDeleteDialog}
      onClose={() => setShowBulkDeleteDialog(false)}
      onConfirm={handleBulkDeleteStudents}
      title={t('moveStudentsToMaster', 'Move Students to Master Class')}
      message={`${t('confirmMoveStudentsToMaster', 'Are you sure you want to move')} ${selectedStudents.length} ${t('studentsToMasterClass', 'students to the master class? This will remove them from their current classes.')}`}
      confirmText={loading ? t('moving', 'Moving...') : t('moveToMaster', 'Move to Master')}
      confirmVariant="danger"
      cancelText={t('cancel', 'Cancel')}
      isConfirming={loading}
    />
  );
  
  // Handle delete student (remove from class)
  const handleDeleteStudent = async () => {
    if (!selectedStudent) {
      showError(t('noStudentSelected', 'No student selected'));
      return;
    }
    
    console.log('=== HANDLE DELETE STUDENT DEBUG ===');
    console.log('Selected student data:', selectedStudent);
    console.log('Current classInfo:', classInfo);
    console.log('Available classes:', classes);
    console.log('Selected class ID:', selectedClassId);
    
    // Get class info from selected student when viewing "all classes"
    const studentClassInfo = classInfo || (() => {
      const studentClassId = selectedStudent.classId || selectedStudent.class_id || 
        (selectedStudent.class && selectedStudent.class.classId) || (selectedStudent.class && selectedStudent.class.id);
      
      console.log('Student class ID extracted:', studentClassId);
      
      if (!studentClassId) {
        console.error('No class ID found in student data:', selectedStudent);
        return null;
      }
      
      const foundClass = classes.find(c => c.classId === studentClassId || c.classId === Number(studentClassId));
      console.log('Found class info:', foundClass);
      return foundClass;
    })();
    
    if (!studentClassInfo) {
      console.error('Cannot determine student class. Student data:', selectedStudent);
      showError(t('cannotFindStudentClass', 'Cannot determine student\'s class. The student may not be assigned to any class.'));
      return;
    }
    
    // SECURITY: The server will validate permissions when we make the API call
    // This client-side check was causing issues after updates due to stale state
    console.log('Proceeding to remove student from class:', studentClassInfo.classId);
    
    try {
      setLoading(true);
      
      // Get the student ID - try multiple fields to ensure we get the right ID
      const studentId = selectedStudent.id || selectedStudent.student_id || selectedStudent.user_id || selectedStudent.userId;
      
      console.log('Student ID candidates:', {
        id: selectedStudent.id,
        student_id: selectedStudent.student_id,
        user_id: selectedStudent.user_id,
        userId: selectedStudent.userId,
        selected: studentId
      });
      
      if (!studentId) {
        throw new Error('No valid student ID found in student data');
      }
      
      // Convert to number for the API
      const numericStudentId = Number(studentId);
      
      if (isNaN(numericStudentId)) {
        throw new Error(`Student ID must be a number, got: ${studentId} (${typeof studentId})`);
      }
      
      // Validate schoolId
      if (!schoolId) {
        throw new Error('School ID is required but not available');
      }
      
      console.log('Final API call parameters:', {
        classId: studentClassInfo.classId,
        schoolId: schoolId,
        studentId: numericStudentId,
        studentName: selectedStudent.name || `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        className: studentClassInfo.name
      });
      
      const response = await studentService.removeStudentToMasterClass(studentClassInfo.classId, schoolId, numericStudentId);
      console.log('Remove student API response:', response);
      
      // Check if the API response indicates success
      // handleApiResponse wraps responses as: { success: boolean, data: actualApiResponse }
      if (response && response.success && response.data) {
        const apiData = response.data;
        // Use the translated message instead of API message
        const successMessage = t('studentRemovedFromClass', 'Student removed from class successfully');
        showSuccess(successMessage);
        
        // Check if student was actually moved to master class or just removed
        if (apiData.results && apiData.results.length > 0) {
          const result = apiData.results[0];
          console.log('Student removal result:', result);
          
          // If the student's status shows they were removed but not reassigned,
          // it might mean the master class is full
          if (result.status === 'removed' && !result.newClass) {
            console.log('Student was removed from class but may not have been assigned to master class (possibly due to capacity)');
          }
        }
        
        setShowDeleteDialog(false);
        // Clear the selected student
        setSelectedStudent(null);
        // Refresh the student list after a brief delay
        setTimeout(async () => {
          await fetchStudents(searchTerm, true, true); // Skip loading since we're already managing it
        }, 500);
        // Clear any selected students
        clearAll();
      } else {
        const errorMsg = response?.data?.error || response?.error || response?.message || 'Failed to remove student from class';
        console.error('API returned unsuccessful response:', response);
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Error removing student:', error);
      
      let errorMessage = error.message || 'Unknown error occurred';
      
      // Provide more specific error messages based on the error type
      if (error.message?.includes('Network Error')) {
        errorMessage = 'Network connection failed. Please check your internet connection.';
      } else if (error.message?.includes('404')) {
        errorMessage = 'The requested operation is not available. Please contact support.';
      } else if (error.message?.includes('403')) {
        errorMessage = 'You do not have permission to perform this action.';
      } else if (error.message?.includes('500')) {
        errorMessage = 'Server error occurred. Please try again later.';
      }
      
      showError(t('failedRemoveStudent', 'Failed to remove student: ') + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk delete students (remove from class)
  const handleBulkDeleteStudents = async () => {
    if (selectedStudents.length === 0) return;
    
    console.log('Selected Students:', selectedStudents);
    console.log('Selected Students Data:', selectedStudentsData);
    console.log('Selected Class ID:', selectedClassId);
    console.log('Class Info:', classInfo);
    
    try {
      setLoading(true);
      
      // Validate schoolId
      if (!schoolId) {
        throw new Error('School ID is required but not available');
      }
      
      // Get students to remove from the stored data
      const studentsToRemove = selectedStudents.map(studentId => {
        const studentData = selectedStudentsData[studentId];
        if (!studentData) {
          console.warn(`No data found for selected student ID: ${studentId}`);
          // Try to find the student in the current students list as fallback
          const fallbackStudent = students.find(s => s.id === studentId);
          if (fallbackStudent) {
            console.log(`Found fallback student data for ID ${studentId}:`, fallbackStudent);
            return fallbackStudent;
          }
        }
        return studentData;
      }).filter(Boolean);
      
      console.log('Students to remove with full data:', studentsToRemove);
      console.log('Selected students count:', selectedStudents.length);
      console.log('Students to remove count:', studentsToRemove.length);
      
      if (studentsToRemove.length === 0) {
        throw new Error(`No matching students found for the selected IDs. Selected: ${selectedStudents.length}, Found: ${studentsToRemove.length}`);
      }
      
      if (studentsToRemove.length !== selectedStudents.length) {
        console.warn(`Mismatch: Selected ${selectedStudents.length} students but only found data for ${studentsToRemove.length}`);
      }

      if (selectedClassId === 'all') {
        // When viewing "all" classes, group students by their class and remove them individually
        const studentsByClass = new Map();
        
        studentsToRemove.forEach(student => {
          // Get the student's class ID from their data
          const studentClassId = student.classId || student.class_id || 
            (student.class && student.class.classId) || (student.class && student.class.id);
          
          if (!studentClassId) {
            console.warn('Student has no class ID, skipping:', student);
            return;
          }
          
          if (!studentsByClass.has(studentClassId)) {
            studentsByClass.set(studentClassId, []);
          }
          studentsByClass.get(studentClassId).push(student.id);
        });

        console.log('Students grouped by class:', Object.fromEntries(studentsByClass));

        // Remove students from each class
        let totalRemoved = 0;
        const results = [];
        
        for (const [classId, studentIds] of studentsByClass) {
          try {
            console.log(`Removing ${studentIds.length} students from class ${classId} to master class`);
            const response = await studentService.removeStudentsToMasterClass(classId, schoolId, studentIds);
            console.log(`Remove response for class ${classId}:`, response);
            
            // Check if the API response indicates success
            // handleApiResponse wraps responses as: { success: boolean, data: actualApiResponse }
            if (response && response.success && response.data) {
              const apiData = response.data;
              if (apiData.message || apiData.summary?.successful > 0) {
                totalRemoved += studentIds.length;
                results.push({ classId, success: true, count: studentIds.length });
              } else {
                results.push({ classId, success: false, error: apiData.error || 'Unknown error' });
              }
            } else {
              results.push({ classId, success: false, error: response?.error || 'Unknown error' });
            }
          } catch (error) {
            console.error(`Error removing students from class ${classId}:`, error);
            results.push({ classId, success: false, error: error.message });
          }
        }

        // Show results
        if (totalRemoved > 0) {
          showSuccess(t('studentsMovedToMasterSuccess').replace('{count}', totalRemoved));
        }
        
        const failedResults = results.filter(r => !r.success);
        if (failedResults.length > 0) {
          console.error('Some removals failed:', failedResults);
          showError(t('someStudentsNotRemoved', `Some students could not be removed. Check console for details.`));
        }

      } else {
        // Single class removal (existing logic)
        if (!classInfo) {
          throw new Error('No class information available');
        }
        
        // Extract the student IDs to remove
        const studentIdsToRemove = studentsToRemove.map(student => {
          const id = student.id; // Use the id field which contains the numeric studentId
          console.log(`=== DELETION DEBUG ===`);
          console.log(`Student object:`, student);
          console.log(`Student.id: ${student.id} (type: ${typeof student.id})`);
          console.log(`Student.studentId: ${student.studentId} (type: ${typeof student.studentId})`);
          console.log(`Using ID: ${id} for deletion`);
          console.log(`=== END DELETION DEBUG ===`);
          return id;
        }).filter(Boolean);
        
        console.log('Final Student IDs to remove:', studentIdsToRemove);
        
        if (studentIdsToRemove.length === 0) {
          throw new Error('No valid student IDs found for removal');
        }
        
        // Call the service to remove students to master class using student IDs
        const response = await studentService.removeStudentsToMasterClass(
          classInfo.classId, 
          schoolId,
          studentIdsToRemove
        );
        
        console.log('Remove students response:', response);
        
        // Check if the API response indicates success
        // handleApiResponse wraps responses as: { success: boolean, data: actualApiResponse }
        if (response && response.success && response.data) {
          const successMessage = t('studentsRemovedFromClass').replace('{count}', studentIdsToRemove.length);
          showSuccess(successMessage);
        } else {
          throw new Error(response?.error || 'Failed to remove students from class');
        }
      }
      
      // Clean up and refresh
      setShowBulkDeleteDialog(false);
      clearAll(); // Clear selection
      // Refresh the student list after a brief delay
      setTimeout(async () => {
        await fetchStudents(searchTerm, true, true); // Skip loading since we're already managing it
      }, 500);
      
    } catch (error) {
      console.error('Error removing students:', error);
      showError(t('failedRemoveStudents', 'Failed to remove students: ') + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Handle edit student
  const handleEditStudent = (student) => {
    console.log('Edit button clicked for student:', student);
    setEditingStudent(student);
    setShowEditModal(true);
  };

  // Handle successful student update from modal
  const handleStudentUpdated = (updatedStudent) => {
    console.log('Student updated successfully:', updatedStudent);
    setShowEditModal(false);
    setEditingStudent(null);
    // Refresh the student list
    setTimeout(async () => {
      await fetchStudents(searchTerm, true, true);
    }, 500);
  };


  // Export handlers
  const handleExportExcel = async () => {
    try {
      const selectedClass = selectedClassId !== 'all' 
        ? classes.find(c => c.classId.toString() === selectedClassId) 
        : null;
      const filename = getTimestampedFilename(
        selectedClass ? `students_${selectedClass.name.replace(/\s+/g, '_')}` : 'students_data', 
        'xlsx'
      );
      await prepareAndExportExcel(
        students,
        filename,
        t,
        {
          classFilter: selectedClass ? { id: selectedClass.classId, name: selectedClass.name } : undefined,
          passwordField: 'password_hash'
        }
      );
      showSuccess(t('exportSuccess', 'Data exported successfully'));
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Export error:', error);
      showError(t('exportError', 'Failed to export data'));
    }
  };

  const handleExportCSV = async () => {
    try {
      const selectedClass = selectedClassId !== 'all' 
        ? classes.find(c => c.classId.toString() === selectedClassId) 
        : null;
      const filename = getTimestampedFilename(
        selectedClass ? `students_${selectedClass.name.replace(/\s+/g, '_')}` : 'students_data', 
        'csv'
      );
      await prepareAndExportCSV(
        students,
        filename,
        t,
        {
          classFilter: selectedClass ? { id: selectedClass.classId, name: selectedClass.name } : undefined,
          passwordField: 'password_hash'
        }
      );
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
      const selectedClass = selectedClassId !== 'all' 
        ? classes.find(c => c.classId.toString() === selectedClassId) 
        : null;
      const filename = getTimestampedFilename(
        selectedClass ? `students_${selectedClass.name.replace(/\s+/g, '_')}` : 'students_data', 
        'pdf'
      );
      await prepareAndExportPDF(
        students,
        selectedClass,
        filename,
        t,
        {
          classFilter: selectedClass ? { id: selectedClass.classId, name: selectedClass.name } : undefined,
          passwordField: 'password_hash'
        }
      );
      showSuccess(t('exportSuccess', 'Data exported successfully'));
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Export error:', error);
      showError(t('exportError', 'Failed to export data'));
    } finally {
      setLoading(false);
    }
  };

  // Handle select all students on current page
  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      clearAll(); // Deselect all
    } else {
      // Select all current page students
      students.forEach(student => {
        if (!isSelected(student.id)) {
          handleSelectStudent(student);
        }
      });
    }
  };

  // Define table columns
  const tableColumns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedStudents.length === students.length && students.length > 0}
          onChange={handleSelectAll}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      ),
      headerClassName: 'w-12',
      cellClassName: 'w-12',
      render: (student) => (
        <input
          type="checkbox"
          checked={isSelected(student.id)}
          onChange={() => handleSelectStudent(student)}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      )
    },
    {
      key: 'name',
      header: t('name', 'Name'),
      render: (student) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:scale-110 transition-all duration-300">
            <User className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
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
      headerClassName: 'relative',
      cellClassName: 'text-left text-sm font-medium',
      render: (student) => (
        <div className="flex items-center space-x-1">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleEditStudent(student);
            }}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 hover:scale-110"
            title={t('editStudent', 'Edit student')}
          >
            <Edit2 className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Delete button clicked for student:', student);
              // Make sure we have the student ID in the expected format
              const studentToDelete = {
                ...student,
                // Ensure we have all possible ID fields
                id: student.id || student.student_id || student.user_id,
                student_id: student.student_id || student.id || student.user_id,
                user_id: student.user_id || student.id || student.student_id
              };
              console.log('Student data being set for deletion:', studentToDelete);
              setSelectedStudent(studentToDelete);
              setShowDeleteDialog(true);
            }}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-900 hover:bg-red-50 hover:scale-110"
            title={t('moveStudentToMaster', 'Move student to master class')}
          >
            <MinusCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      )
    }
  ];

  // Mobile card render function
  const renderMobileCard = (student) => (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={isSelected(student.id)}
            onChange={() => handleSelectStudent(student)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:scale-110 transition-all duration-300">
            <User className="h-5 w-5" />
          </div>
          <div className="ml-2 sm:ml-4 min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 truncate">
              {student.name || (student.firstName || student.lastName 
                ? `${student.firstName || ''} ${student.lastName || ''}`.trim() 
                : student.username || t('noName', 'No Name'))}
            </div>
            <div className="text-xs text-gray-500 truncate">{student.email || 'N/A'}</div>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleEditStudent(student);
            }}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-900 hover:bg-blue-50 hover:scale-110 flex-shrink-0"
            title={t('editStudent', 'Edit student')}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Delete button clicked for student:', student);
              // Make sure we have the student ID in the expected format
              const studentToDelete = {
                ...student,
                // Ensure we have all possible ID fields
                id: student.id || student.student_id || student.user_id,
                student_id: student.student_id || student.id || student.user_id,
                user_id: student.user_id || student.id || student.student_id
              };
              console.log('Student data being set for deletion:', studentToDelete);
              setSelectedStudent(studentToDelete);
              setShowDeleteDialog(true);
            }}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-900 hover:bg-red-50 hover:scale-110 flex-shrink-0"
            title={t('moveStudentToMaster', 'Move student to master class')}
          >
            <MinusCircle className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <div className="flex flex-col space-y-1">
          <span>{t('phone', 'Phone')}: {student.phone || 'N/A'}</span>
          {student.dateOfBirth && (
            <span>{t('dateOfBirth', 'DOB')}: {new Date(student.dateOfBirth).toLocaleDateString()}</span>
          )}
        </div>
        <Badge
          color={student.isActive ? 'green' : 'gray'}
          variant="filled"
          size="xs"
        >
          {student.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
        </Badge>
      </div>
    </>
  );

  const handleAddStudentClick = () => {
    navigate('/students/select');
  };

  // Show error state if error exists (prioritize over loading)  
  console.log('🔍 StudentsManagement render check - error:', error, 'initialLoading:', initialLoading);
  
  if (error) {
    console.log('✅ StudentsManagement: Showing error display for:', error);
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={() => retry(() => {
          clearError();
          initializeClasses();
          fetchStudents();
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
            {t('loadingStudents')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <PageTransition variant="fade" className="p-6">      
      {/* Search and filter */}
      <FadeInSection className="bg-white shadow rounded-lg p-4 sm:p-6">
        {/* Header and search bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">{t('studentsManagement')}</h1>
            {/* Debug: Test error button */}
            <button
              onClick={triggerTestError}
              className="px-3 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
            >
              Test Error
            </button>
          </div>
          <div className="mt-1 space-y-1">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-600">
                {t('manageStudentRecords')}
              </p>
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-600">
                  {students.length} {students.length === 1 ? t('student', 'student') : t('students', 'students')}
                  {localSearchTerm && allStudents.length !== students.length && (
                    <span className="text-xs text-gray-500 ml-1">
                      ({t('filteredFrom', 'filtered from')} {allStudents.length})
                    </span>
                  )}
                  {selectedClassId !== 'all' && (() => {
                    const selectedClass = classes.find(c => c.classId.toString() === selectedClassId);
                    return selectedClass ? ` នៅ ${selectedClass.name}` : '';
                  })()}
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {/* Export Dropdown */}
          <div className="relative export-dropdown">
            <Button
              onClick={() => setShowExportDropdown(!showExportDropdown)}
              variant="outline"
              size="default"
              className="shadow-lg"
              disabled={students.length === 0}
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
                    {t('exportToExcel')}
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                  >
                    {t('exportToCSV')}
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                  >
                    {t('exportToPDF')}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Add Student Button */}
          <Button
            onClick={handleAddStudentClick}
            variant="primary"
            size="default"
            className="shadow-lg"
          >
            <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
            <span className="text-xs sm:text-sm">{t('addStudent')}</span>
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
                placeholder={t('searchStudents', 'Search students by name, username, email, phone, or class...')}
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
            
            {classes.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm">
                {selectedClassId !== 'all' && (
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    {(() => {
                      const selectedClass = classes.find(c => c.classId.toString() === selectedClassId);
                      return selectedClass ? (
                        <>
                          <Badge color="orange" className="text-xs">
                            {selectedClass.name}
                          </Badge>
                          <span>{selectedClass.academicYear}</span>
                        </>
                      ) : null;
                    })()}
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <span className="text-gray-700 font-medium">{t('academicYear', 'Academic Year')}:</span>
                  <input
                    type="text"
                    placeholder="2024-2025"
                    value={academicYearFilter}
                    onChange={(e) => handleAcademicYearChange(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 min-w-[120px]"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-700 font-medium">{t('selectClass', 'Class')}:</span>
                  <Dropdown
                    value={selectedClassId}
                    onValueChange={setSelectedClassId}
                    options={[
                      { value: 'all', label: t('allClasses', 'ថ្នាក់ទាំងអស់') },
                      ...classes.map(cls => ({
                        value: cls.classId.toString(),
                        label: cls.name
                      }))
                    ]}
                    placeholder={t('selectClass', 'ជ្រើសរើសថ្នាក់')}
                    minWidth="min-w-[200px]"
                    contentClassName="max-h-[200px] overflow-y-auto"
                  />
                </div>
              </div>
            )}
            
          </div>
        </div>

        
        {/* Students table */}
        <FadeInSection delay={100}>
          {/* Mobile Cards View */}
          <MobileCards
            data={students}
            renderCard={renderMobileCard}
          />
          
          {/* Desktop Table View */}
          <div className="hidden sm:block">
            <Table
              columns={tableColumns}
              data={students}
              loading={loading}
              emptyMessage={t('noStudentsFound', 'No students found')}
              showPagination={true}
              pagination={pagination}
              onPageChange={handlePageChange}
              rowClassName="hover:bg-blue-50"
              t={t}
            />
          </div>
        </FadeInSection>
      </FadeInSection>
      
      {/* Delete Confirmation */}
      <DeleteDialog />
      
      {/* Bulk Delete Confirmation */}
      <BulkDeleteDialog />
      
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
    </PageTransition>
  );
}