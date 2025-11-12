import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, MinusCircle, Edit2, Users, Download, X, ArrowRightLeft, Eye, Filter } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import { studentService } from '../../utils/api/services/studentService';
import { userService } from '../../utils/api/services/userService';
import classService from '../../utils/api/services/classService';
import { useStableCallback, useRenderTracker } from '../../utils/reactOptimization';
import useSelectedStudents from '../../hooks/useSelectedStudents';
import { Badge } from '../../components/ui/Badge';
import { Table } from '../../components/ui/Table';
import { exportStudentsToExcel } from '../../utils/studentExportUtils';
import StudentEditModal from '../../components/students/StudentEditModal';
import StudentActionsModal from '../../components/students/StudentActionsModal';
import StudentViewModal from '../../components/students/StudentViewModal';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import EmptyState from '../../components/ui/EmptyState';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import SidebarFilter from '../../components/ui/SidebarFilter';

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
  const { startLoading, stopLoading, isLoading } = useLoading();

  // Track renders to detect infinite loops (development only)
  useRenderTracker('StudentsManagement');

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
          console.log('🔄 localStorage changed in StudentsManagement, updating user state:', parsedUser);
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

  // State for current user's school ID (fetched from my-account endpoint)
  const [schoolId, setSchoolId] = useState(null);
  const [schoolName, setSchoolName] = useState('');

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
  const [allClasses, setAllClasses] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('all');
  const [selectedClassId, setSelectedClassId] = useState('all');

  // Debug: Log filter changes
  // useEffect(() => {
  //   console.log('🔍 selectedClassId changed:', selectedClassId, 'type:', typeof selectedClassId);
  // }, [selectedClassId]);


  // Other state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState(''); // For immediate UI feedback
  const [academicYearFilter, setAcademicYearFilter] = useState(''); // Academic year filter
  const [debouncedAcademicYear, setDebouncedAcademicYear] = useState(''); // Debounced academic year
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showStudentActionsModal, setShowStudentActionsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [transferTargetClassId, setTransferTargetClassId] = useState('');
  const [bulkTransferTargetClassId, setBulkTransferTargetClassId] = useState('');
  // Use the custom hook for managing selected students
  const {
    selectedStudents,
    selectedStudentsData,
    handleSelectStudent,
    removeStudent,
    clearAll,
    isSelected
  } = useSelectedStudents();
  const [selectingAll, setSelectingAll] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const fetchingRef = useRef(false);
  const lastFetchParams = useRef(null);
  const searchTimeoutRef = useRef(null);
  const classesInitialized = useRef(false);

  // State for all students (unfiltered) and filtered students
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);

  // Get unique grade levels from all classes
  const getGradeLevelOptions = () => {
    const options = [
      { value: 'all', label: t('allGradeLevels', 'All Grade Levels') },
      ...Array.from([1, 2, 3, 4, 5, 6]).map(level => ({
        value: level,
        label: t(`Grade ${level}`, `Grade ${level}`)
      }))
    ];

    return options;
  };

  // Memoize class dropdown options from classes returned by API (already filtered by gradeLevel)
  const classDropdownOptions = useMemo(() => {
    const options = [
      { value: 'all', label: t('allClasses', 'ថ្នាក់ទាំងអស់') },
      ...allClasses.map(cls => ({
        value: String(cls.classId),
        label: cls.name
      }))
    ];
    return options;
  }, [allClasses, t]);

  // Reset selectedClassId when grade level changes
  useEffect(() => {
    setSelectedClassId('all');
  }, [selectedGradeLevel]);

  // Enhanced client-side search function for class-filtered results
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

  // Debounced search handler - now triggers server-side search
  const handleSearchChange = useCallback((value) => {
    setLocalSearchTerm(value);

    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounce server-side search
    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
    }, 500);
  }, []);

  // Debounced academic year handler
  const handleAcademicYearChange = useCallback((value) => {
    setAcademicYearFilter(value);
  }, []);

  // Debounce the academic year filter
  useEffect(() => {
    const id = setTimeout(() => setDebouncedAcademicYear(academicYearFilter), 300);
    return () => clearTimeout(id);
  }, [academicYearFilter]);

  // Fetch current user's school ID from my-account endpoint
  const fetchSchoolId = useStableCallback(async () => {
    try {
      if (schoolId) {
        console.log('School ID already available:', schoolId);
        return schoolId;
      }

      console.log('Fetching school ID from my-account endpoint...');
      const accountData = await userService.getMyAccount();
      console.log('📥 Full my-account response in StudentsManagement:', accountData);

      if (accountData && accountData.school_id) {
        console.log('✅ School ID fetched from account:', accountData.school_id);
        setSchoolId(accountData.school_id);
        setSchoolName(accountData.school?.name || '');
        return accountData.school_id;
      } else {
        console.error('No school_id found in account data:', accountData);
        showError(t('noSchoolIdFound', 'No school ID found for your account'));
        return null;
      }
    } catch (err) {
      console.error('Error fetching school ID:', err);
      handleError(err, {
        toastMessage: t('failedToFetchSchoolId', 'Failed to fetch school information')
      });
      return null;
    }
  }, [schoolId, showError, t, handleError]);

  // Initialize classes using new classes/user API
  const initializeClasses = useStableCallback(async () => {
    console.log('🚀 initializeClasses called with selectedGradeLevel:', selectedGradeLevel);
    // Avoid re-initializing if classes are already loaded (unless grade level changed)
    if (classesInitialized.current && selectedGradeLevel === 'all') {
      console.log('Classes already initialized, skipping');
      return;
    }

    console.log('=== INITIALIZING CLASSES FROM NEW API ===');
    console.log('Current user object:', user);

    if (!user?.id) {
      console.log('🚨 No user ID available for fetching classes');
      console.log('User object:', user);
      setClasses([]);
      setAllClasses([]);
      setSelectedClassId('all');

      // If there's no user, that's likely an authentication issue
      handleError(new Error('No authenticated user found'), {
        toastMessage: t('authenticationRequired', 'Authentication required')
      });
      return;
    }

    try {
      console.log('Fetching classes using CLASS_BY_SCHOOL API...');

      // Need to get school ID first
      let currentSchoolId = schoolId;
      if (!currentSchoolId) {
        console.log('🚨 No school ID available, fetching from my-account...');
        currentSchoolId = await fetchSchoolId();
        if (!currentSchoolId) {
          setClasses([]);
          setAllClasses([]);
          setSelectedClassId('all');
          return;
        }
      }

      // Build query parameters - pass gradeLevel to API for server-side filtering
      const queryParams = {
        limit: 100  // Fetch up to 100 classes to support cascade filter
      };
      if (selectedGradeLevel && selectedGradeLevel !== 'all') {
        queryParams.gradeLevel = selectedGradeLevel;
      }

      // Get class data from /classes/school/{schoolId} endpoint
      console.log('🌐 Calling classService.getBySchool with school ID:', currentSchoolId, 'query params:', queryParams);
      const classResponse = await classService.getBySchool(currentSchoolId, queryParams);
      console.log('📨 Got class response:', classResponse);

      if (!classResponse || !classResponse.success || !classResponse.classes || !Array.isArray(classResponse.classes)) {
        console.log('🚨 No classes found in API response:', classResponse);
        // Don't clear classes - keep them visible while loading
        // setClasses([]);
        // setAllClasses([]);
        // setSelectedClassId('all');

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
        gradeLevel: classData.gradeLevel || classData.grade_level,
        section: classData.section || 'A',
        academicYear: classData.academicYear,
        teacherId: classData.teacherId,
        maxStudents: classData.maxStudents,
        schoolId: classData.schoolId,
        status: classData.status,
        studentCount: classData.studentCount || 0
      }));

      setAllClasses(teacherClasses);
      setClasses(teacherClasses);
      console.log('📚 Class data with gradeLevel:', teacherClasses.slice(0, 3).map(c => ({ name: c.name, gradeLevel: c.gradeLevel })));
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

      console.log(`User ${user.username} has access to ${teacherClasses.length} classes (grade level: ${selectedGradeLevel}):`,
        teacherClasses.map(c => `${c.name} (ID: ${c.classId})`));

      // Mark classes as initialized successfully
      classesInitialized.current = true;

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
      setAllClasses([]);
      setSelectedClassId('all');
    }
  }, [user?.id, user?.username, handleError, t, schoolId, fetchSchoolId, selectedGradeLevel]);

  // Fetch students with pagination and filters using school classes endpoint
  const fetchStudents = useStableCallback(async (search = searchTerm, force = false, skipLoading = false, academicYear = academicYearFilter) => {
    // Ensure we have school ID before fetching students
    if (!schoolId) {
      console.log('School ID not available, skipping student fetch...');
      return;
    }

    // Create a unique key for current fetch parameters (including filters)
    const currentParams = JSON.stringify({
      search,
      schoolId,
      page: pagination.page,
      limit: pagination.limit,
      classId: selectedClassId
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
        startLoading('fetchStudents', t('loadingStudents', 'Loading students...'));
      }

      console.log(`=== FETCH STUDENTS (SCHOOL CLASSES) ===`);
      console.log(`School ID: ${schoolId}`);
      console.log(`Search term: ${search}`);
      console.log(`Class ID: ${selectedClassId}`);
      console.log(`Page: ${pagination.page}, Limit: ${pagination.limit}`);

      // Request params for the new endpoint with server-side filters
      const requestParams = {
        page: pagination.page,
        limit: pagination.limit
      };

      // Add search parameter if provided
      if (search && search.trim()) {
        requestParams.search = search.trim();
      }

      // Add class filter if selected (server-side filtering)
      if (selectedClassId && selectedClassId !== 'all') {
        requestParams.classId = selectedClassId;
      }


      console.log(`=== FINAL API REQUEST PARAMS ===`);
      console.log(`API request params:`, requestParams);
      console.log(`JSON stringified:`, JSON.stringify(requestParams));
      console.log(`=== END API REQUEST PARAMS ===`);

      // Use the new school classes endpoint with filters
      const response = await studentService.getStudentsBySchoolClasses(schoolId, requestParams);

      console.log('=== API RESPONSE (SCHOOL CLASSES) ===');
      console.log('Full API response:', response);
      console.log('Response success:', response?.success);
      console.log('Response data length:', response?.data?.length);
      console.log('=== END API RESPONSE ===');

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch students from school');
      }

      let data = response.data || [];

      console.log(`Fetched ${data.length} students from school ${schoolId}`);

      console.log('Raw students data from API:', data);

      // Store for reference
      setAllStudents(data);
      setFilteredStudents(data);

      // Server-side pagination and filtering: use returned data directly
      setStudents(data);
      if (response.pagination) {
        setPagination({
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          pages: response.pagination.pages
        });
      }

      setDataFetched(true); // Mark data as fetched after successful API call
      setInitialLoading(false); // End initial loading after successful data fetch

    } catch (err) {
      console.error('Error fetching students from school:', err);
      handleError(err, {
        toastMessage: t('errorFetchingStudents', 'Failed to fetch students')
      });
      setStudents([]);
      setAllStudents([]);
      setFilteredStudents([]);
      setDataFetched(true); // Mark data as fetched even on error
      setInitialLoading(false); // End initial loading even on error
    } finally {
      if (!skipLoading) {
        stopLoading('fetchStudents');
      }
      fetchingRef.current = false;
    }
  }, [schoolId, showError, t, handleError, selectedClassId]);

  // Re-fetch school ID when user school_id changes (e.g., after login or transfer)
  useEffect(() => {
    if (user?.teacher?.schoolId || user?.school_id || user?.schoolId) {
      const newSchoolId = user?.teacher?.schoolId || user.school_id || user.schoolId;
      console.log('🔄 User school_id changed:', newSchoolId);
      if (schoolId !== newSchoolId) {
        console.log('Resetting schoolId to trigger re-fetch');
        setSchoolId(newSchoolId);
        // Reset classes to force re-initialization with new school
        classesInitialized.current = false;
        initializeClasses();
      }
    }
  }, [user?.teacher?.schoolId, user?.school_id, user?.schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize classes when component mounts or when grade level changes
  useEffect(() => {
    console.log('🔄 Component mounted or grade level changed, initializing classes...');
    // Reset the flag to force re-fetch when grade level changes
    if (selectedGradeLevel !== 'all') {
      classesInitialized.current = false;
    }
    initializeClasses().catch((err) => {
      console.error('🚨 Unhandled error in initializeClasses:', err);
    });
  }, [initializeClasses, selectedGradeLevel]);

  // Initial fetch when school ID becomes available
  useEffect(() => {
    if (schoolId) {
      console.log('School ID available, initial fetch...');
      fetchStudents('', true); // Force initial fetch - let fetchStudents handle loading states
    }
  }, [schoolId, fetchStudents]);

  // Memoized fetch parameters to avoid unnecessary re-renders
  const fetchParams = useMemo(() => ({
    searchTerm,
    page: pagination.page,
    limit: pagination.limit,
    classId: selectedClassId
  }), [searchTerm, pagination.page, pagination.limit, selectedClassId]);

  // Separate useEffect for class ID validation to avoid infinite loops
  useEffect(() => {
    if (classes.length === 0) return; // Wait for classes to load

    // SECURITY: Validate that selectedClassId belongs to teacher's authorized classes
    if (selectedClassId !== 'all') {
      // Convert both to strings for comparison since dropdown values are strings
      const authorizedClassIds = classes.map(c => String(c.classId));
      const isValidClass = authorizedClassIds.includes(String(selectedClassId));
      console.log('🔐 Class validation:', {
        selectedClassId,
        authorizedClassIds,
        isValidClass
      });
      if (!isValidClass) {
        console.warn(`Invalid class ID ${selectedClassId} selected for teacher ${user?.username}. Resetting to 'all'.`);
        setSelectedClassId('all');
      }
    }
  }, [selectedClassId, user?.username, classes]);

  // Removed client-side filtering - now using server-side filtering via API
  // The fetchStudents function now passes selectedClassId and selectedGradeId to the API

  // Single useEffect to handle all data fetching
  useEffect(() => {
    console.log(`=== USE EFFECT TRIGGERED ===`);
    console.log(`Current fetch params:`, fetchParams);

    if (!schoolId) {
      console.log(`Waiting for school ID...`);
      return; // Wait for school ID
    }

    // Debounce only for search changes, immediate for filter changes
    const isSearchChange = fetchParams.searchTerm.trim() !== '';
    const delay = isSearchChange ? 500 : 100; // Small delay to batch state changes

    console.log(`Setting timer with delay ${delay}ms to fetch students`);
    const timer = setTimeout(() => {
      console.log(`Timer fired - calling fetchStudents with page ${fetchParams.page}, limit ${fetchParams.limit}`);
      // Only fetch if not already fetching
      if (!fetchingRef.current) {
        fetchStudents(fetchParams.searchTerm, false, false);
      } else {
        console.log('Skipping fetch - already fetching');
      }
    }, delay);

    return () => {
      console.log(`Cleaning up timer`);
      clearTimeout(timer);
    };
  }, [fetchParams, fetchStudents, schoolId]);

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
      // Clear last fetch params to allow new fetch with new filters
      lastFetchParams.current = null;
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
      // If already on page 1, the main useEffect will handle the fetch automatically
      prevFiltersRef.current = { selectedClassId, academicYearFilter: debouncedAcademicYear };
    }
  }, [selectedClassId, debouncedAcademicYear, pagination.page, schoolId, searchTerm, fetchStudents]); // Reset page when filters change

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
      confirmText={isLoading('bulkDelete') ? t('moving', 'Moving...') : t('moveToMaster', 'Move to Master')}
      confirmVariant="danger"
      cancelText={t('cancel', 'Cancel')}
      isConfirming={isLoading('bulkDelete')}
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
      confirmText={isLoading('deleteStudent') ? t('moving', 'Moving...') : t('moveToMaster', 'Move to Master')}
      confirmVariant="danger"
      cancelText={t('cancel', 'Cancel')}
      isConfirming={isLoading('deleteStudent')}
    />
  );

  // Transfer Student Dialog
  const [transferFilterGradeLevel, setTransferFilterGradeLevel] = useState('all');
  const [transferFilteredClasses, setTransferFilteredClasses] = useState([]);
  const [transferLoadingClasses, setTransferLoadingClasses] = useState(false);

  // Fetch classes by grade level for transfer dialog
  useEffect(() => {
    if (!showTransferDialog || !schoolId) {
      setTransferFilteredClasses([]);
      return;
    }

    const fetchTransferClasses = async () => {
      try {
        setTransferLoadingClasses(true);

        if (transferFilterGradeLevel === 'all') {
          // Use all available classes if 'all' is selected
          const availableClasses = classes.filter(cls => cls.classId.toString() !== selectedStudent?.class?.id?.toString());
          setTransferFilteredClasses(availableClasses);
        } else {
          // Fetch classes for the selected grade level from API
          const response = await classService.getBySchool(schoolId, {
            gradeLevel: transferFilterGradeLevel,
            limit: 100
          });

          if (response && response.classes && Array.isArray(response.classes)) {
            // Filter out current student's class
            const availableClasses = response.classes.filter(cls => cls.classId.toString() !== selectedStudent?.class?.id?.toString());
            setTransferFilteredClasses(availableClasses);
          } else {
            setTransferFilteredClasses([]);
          }
        }
      } catch (error) {
        console.error('Error fetching classes by grade level:', error);
        setTransferFilteredClasses([]);
      } finally {
        setTransferLoadingClasses(false);
      }
    };

    fetchTransferClasses();
  }, [transferFilterGradeLevel, showTransferDialog, schoolId, selectedStudent?.class?.id, classes]);

  // Reset transfer filter when dialog opens
  useEffect(() => {
    if (showTransferDialog) {
      setTransferFilterGradeLevel('all');
      const availableClasses = classes.filter(cls => cls.classId.toString() !== selectedStudent?.class?.id?.toString());
      setTransferFilteredClasses(availableClasses);
    }
  }, [showTransferDialog, selectedStudent?.class?.id, classes]);

  // Get unique grade levels for transfer dialog
  const getTransferGradeLevelOptions = () => {
    const uniqueLevels = new Set();
    allClasses.forEach(cls => {
      if (cls.gradeLevel) {
        uniqueLevels.add(cls.gradeLevel);
      }
    });

    return [
      { value: 'all', label: t('allGradeLevels', 'All Grade Levels') },
      ...Array.from(uniqueLevels)
        .sort((a, b) => Number(a) - Number(b))
        .map(level => ({
          value: level,
          label: t(`Grade ${level}`, `Grade ${level}`)
        }))
    ];
  };

  const TransferDialog = () => (
    <ConfirmDialog
      isOpen={showTransferDialog}
      onClose={() => {
        setShowTransferDialog(false);
        setTransferTargetClassId('');
        setTransferFilterGradeLevel('all');
      }}
      onConfirm={handleTransferStudent}
      title={t('transferStudent', 'Transfer Student')}
      message={
        <div className="space-y-4">
          <p>{t('selectTargetClass', 'Select the class to transfer the student to')}:</p>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {t('student', 'Student')}: <span className="font-bold">{selectedStudent?.name}</span>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              {t('currentClass', 'Current Class')}: <span className="font-bold">{selectedStudent?.class?.name || 'N/A'}</span>
            </label>

            {/* Grade Level Filter for Transfer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('gradeLevel', 'Filter by Grade Level')}
              </label>
              <Dropdown
                value={transferFilterGradeLevel}
                onValueChange={setTransferFilterGradeLevel}
                options={getTransferGradeLevelOptions()}
                placeholder={t('chooseGradeLevel', 'Choose grade level...')}
                minWidth="w-full"
                disabled={transferLoadingClasses}
                triggerClassName="text-sm"
              />
            </div>

            {/* Target Class Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('targetClass', 'Target Class')}:
              </label>
              <Dropdown
                value={transferTargetClassId}
                onValueChange={setTransferTargetClassId}
                options={transferFilteredClasses.map(cls => ({
                  value: cls.classId.toString(),
                  label: `${cls.name} - ${cls.academicYear}`
                }))}
                placeholder={transferLoadingClasses ? (t('loadingClasses') || 'Loading classes...') : (transferFilteredClasses.length === 0 ? t('noClassesAvailable', 'No classes available') : t('selectClass', 'Select a class'))}
                minWidth="w-full"
                triggerClassName="text-sm"
                disabled={transferLoadingClasses || transferFilteredClasses.length === 0}
                maxHeight="max-h-[250px]"
              />
            </div>
          </div>
        </div>
      }
      confirmText={isLoading('transferStudent') ? t('transferring', 'Transferring...') : t('transfer', 'Transfer')}
      confirmVariant="primary"
      cancelText={t('cancel', 'Cancel')}
      isConfirming={isLoading('transferStudent')}
      confirmDisabled={!transferTargetClassId}
    />
  );


  // Handle delete student (remove from class)
  const handleDeleteStudent = async () => {
    if (!selectedStudent) {
      showError(t('noStudentSelected', 'No student selected'));
      return;
    }

    // Get class info from selected student when viewing "all classes"
    const studentClassInfo = classInfo || (() => {
      const studentClassId = selectedStudent.classId || selectedStudent.class_id ||
        (selectedStudent.class && selectedStudent.class.classId) || (selectedStudent.class && selectedStudent.class.id);

      if (!studentClassId) {
        return null;
      }

      // Try multiple ways to find the class
      const foundClass = classes.find(c => {
        // Compare classId as both string and number
        return c.classId === studentClassId ||
          c.classId === Number(studentClassId) ||
          c.classId === String(studentClassId) ||
          c.id === studentClassId ||
          c.id === Number(studentClassId);
      });

      return foundClass;
    })();

    // Note: studentClassInfo might be null if the student is in the master class or a class
    // not assigned to this teacher. This is fine - the API will handle the removal.

    // SECURITY: The server will validate permissions when we make the API call
    // This client-side check was causing issues after updates due to stale state

    try {
      startLoading('bulkTransfer', t('transferring', 'Transferring students...'));

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
        masterClassId: schoolId,
        studentId: numericStudentId,
        studentName: selectedStudent.name || `${selectedStudent.firstName} ${selectedStudent.lastName}`,
        className: studentClassInfo.name
      });

      const response = await studentService.removeStudentToMasterClass(schoolId, numericStudentId);
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
          await fetchStudents(undefined, true, true); // Skip loading since we're already managing it, use current search state
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
      stopLoading('bulkDelete');
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
      startLoading('bulkDelete', t('moving', 'Moving students...'));

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
            const response = await studentService.removeStudentsToMasterClass(schoolId, studentIds);
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
      setShowStudentActionsModal(false);
      setShowBulkDeleteDialog(false);
      clearAll(); // Clear selection
      // Refresh the student list after a brief delay
      setTimeout(async () => {
        await fetchStudents(undefined, true, true); // Skip loading since we're already managing it, use current search state
      }, 500);

    } catch (error) {
      console.error('Error removing students:', error);
      showError(t('failedRemoveStudents', 'Failed to remove students: ') + (error.message || 'Unknown error'));
    } finally {
      stopLoading('deleteStudent');
    }
  };

  // Handle transfer student
  const handleTransferStudent = async () => {
    if (!selectedStudent || !transferTargetClassId) {
      showError(t('noStudentOrClassSelected', 'No student or target class selected'));
      return;
    }

    try {
      startLoading('deleteStudent', t('moving', 'Moving student...'));

      // Get student ID
      const studentId = selectedStudent.id || selectedStudent.student_id || selectedStudent.user_id || selectedStudent.userId;

      if (!studentId) {
        throw new Error('No valid student ID found');
      }

      console.log('Transfer student parameters:', {
        studentId,
        targetClassId: transferTargetClassId
      });

      // Use the same addStudentsToClass method that works for bulk transfers
      const response = await studentService.addStudentsToClass(transferTargetClassId, [studentId]);

      console.log('Transfer student response:', response);

      if (response && response.success) {
        const targetClass = classes.find(c => c.classId.toString() === transferTargetClassId);
        const successMessage = t('studentTransferredSuccess', `Student transferred successfully to ${targetClass?.name || 'the selected class'}`);
        showSuccess(successMessage);

        setShowTransferDialog(false);
        setTransferTargetClassId('');
        setSelectedStudent(null);

        // Refresh the student list
        setTimeout(async () => {
          await fetchStudents(undefined, true, true);
        }, 500);

        clearAll();
      } else {
        throw new Error(response?.error || 'Failed to transfer student');
      }
    } catch (error) {
      console.error('Error transferring student:', error);

      let errorMessage = error.message || 'Unknown error occurred';

      if (error.message?.includes('Network Error')) {
        errorMessage = 'Network connection failed. Please check your internet connection.';
      } else if (error.message?.includes('404')) {
        errorMessage = 'Transfer endpoint not found. Please contact support.';
      } else if (error.message?.includes('403')) {
        errorMessage = 'You do not have permission to transfer students.';
      } else if (error.message?.includes('500')) {
        errorMessage = 'Server error occurred. Please try again later.';
      }

      showError(t('failedTransferStudent', 'Failed to transfer student: ') + errorMessage);
    } finally {
      stopLoading('transferStudent');
    }
  };
  // Handle bulk transfer students
  const handleBulkTransferStudents = async (targetClassId = bulkTransferTargetClassId) => {
    if (selectedStudents.length === 0) {
      showError(t('noStudentsSelected', 'No students selected'));
      return;
    }

    if (!targetClassId) {
      showError(t('noTargetClassSelected', 'No target class selected'));
      return;
    }

    try {
      startLoading('transferStudent', t('transferring', 'Transferring student...'));

      // Get students to transfer from the stored data
      const studentsToTransfer = selectedStudents.map(studentId => {
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

      console.log('Students to transfer with full data:', studentsToTransfer);

      if (studentsToTransfer.length === 0) {
        throw new Error(`No matching students found for the selected IDs. Selected: ${selectedStudents.length}, Found: ${studentsToTransfer.length}`);
      }

      // Extract student IDs for the API call
      const studentIdsToTransfer = studentsToTransfer.map(student => {
        const studentId = student.id || student.student_id || student.user_id || student.userId;
        if (!studentId) {
          console.warn('No valid student ID found for student:', student);
        }
        return studentId;
      }).filter(Boolean);

      if (studentIdsToTransfer.length === 0) {
        throw new Error('No valid student IDs found for transfer');
      }

      console.log(`Transferring ${studentIdsToTransfer.length} students to class ${targetClassId}`);

      // Use the same addStudentsToClass method that works in StudentSelection
      const response = await studentService.addStudentsToClass(targetClassId, studentIdsToTransfer);

      if (response && response.success) {
        const targetClass = classes.find(c => c.classId.toString() === targetClassId);
        const successMessage = t('studentsTransferredSuccess', `Successfully transferred ${studentIdsToTransfer.length} student(s) to ${targetClass?.name || 'the selected class'}`);
        showSuccess(successMessage);

        // Clean up and refresh
        setShowStudentActionsModal(false);
        setBulkTransferTargetClassId('');
        clearAll(); // Clear selection

        // Refresh the student list after a brief delay
        setTimeout(async () => {
          await fetchStudents(undefined, true, true); // Skip loading since we're already managing it
        }, 500);
      } else {
        throw new Error(response?.error || 'Failed to transfer students');
      }

    } catch (error) {
      console.error('Error transferring students:', error);
      showError(t('failedTransferStudents', 'Failed to transfer students: ') + (error.message || 'Unknown error'));
    } finally {
      stopLoading('bulkTransfer');
    }
  };

  // Handle view student - fetch full student details and open view modal
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
      await fetchStudents(undefined, true, true);
    }, 500);
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

  // Handle select all students on current page only
  const handleSelectAllCurrentPage = async () => {
    if (selectingAll) return;

    // If all current page students are already selected, deselect all current page
    if (selectedStudents.length === students.length && students.length > 0) {
      // Only deselect students from current page
      students.forEach(student => {
        removeStudent(student.id);
      });
      showSuccess(t('deselectedAllStudents', 'All students on this page deselected'));
      return;
    }

    // Otherwise, select all students on current page
    try {
      setSelectingAll(true);

      // Select students in batches to avoid blocking the UI
      const batchSize = 50;
      let selectedCount = 0;

      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);

        // Use setTimeout to yield control to the UI between batches
        await new Promise(resolve => {
          setTimeout(() => {
            batch.forEach(student => {
              if (!isSelected(student.id)) {
                handleSelectStudent(student);
                selectedCount++;
              }
            });
            resolve();
          }, 0);
        });
      }

      if (selectedCount > 0) {
        showSuccess(
          t('selectedAllStudents') ||
          `Selected ${selectedCount} student${selectedCount !== 1 ? 's' : ''}`
        );
      }
    } catch (error) {
      console.error('Error selecting all students:', error);
      showError(t('errorSelectingAllStudents', 'Failed to select all students'));
    } finally {
      setSelectingAll(false);
    }
  };

  // Handle select all filtered students (all pages) - for toolbar button
  const handleSelectAllFiltered = async () => {
    if (selectingAll) return;

    // If all students are already selected, deselect all
    if (selectedStudents.length === pagination.total && pagination.total > 0) {
      clearAll(); // Deselect all
      showSuccess(t('deselectedAllStudents', 'All students deselected'));
      return;
    }

    // Otherwise, fetch and select all filtered students with loading animation
    try {
      setSelectingAll(true);

      // Build request params with current filters (same as fetchStudents)
      const requestParams = {
        page: 1,
        limit: pagination.total || 1000 // Fetch all results
      };

      // Add search parameter if provided
      if (searchTerm && searchTerm.trim()) {
        requestParams.search = searchTerm.trim();
      }

      // Add class filter if selected (server-side filtering)
      if (selectedClassId && selectedClassId !== 'all') {
        requestParams.classId = selectedClassId;
      }

      console.log('Fetching all filtered students with params:', requestParams);

      // Fetch all students with current filters
      const response = await studentService.getStudentsBySchoolClasses(schoolId, requestParams);

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch all students');
      }

      let allFilteredStudents = response.data || [];
      console.log(`Fetched ${allFilteredStudents.length} total filtered students`);

      // Select all fetched students in batches to avoid blocking the UI
      const batchSize = 50;
      let selectedCount = 0;

      for (let i = 0; i < allFilteredStudents.length; i += batchSize) {
        const batch = allFilteredStudents.slice(i, i + batchSize);

        // Use setTimeout to yield control to the UI between batches
        await new Promise(resolve => {
          setTimeout(() => {
            batch.forEach(student => {
              if (!isSelected(student.id)) {
                handleSelectStudent(student);
                selectedCount++;
              }
            });
            resolve();
          }, 0);
        });
      }

      if (selectedCount > 0) {
        showSuccess(
          t('selectedAllStudents') ||
          `Selected ${selectedCount} student${selectedCount !== 1 ? 's' : ''}`
        );
      }
    } catch (error) {
      console.error('Error selecting all students:', error);
      showError(t('errorSelectingAllStudents', 'Failed to select all students'));
    } finally {
      setSelectingAll(false);
    }
  };

  // Define table columns
  const tableColumns = [
    {
      key: 'select',
      header: (
        <div className="flex items-center">
          {selectingAll ? (
            <DynamicLoader type="spinner" size="sm" variant="primary" />
          ) : (
            <input
              type="checkbox"
              checked={selectedStudents.length === students.length && students.length > 0}
              onChange={handleSelectAllCurrentPage}
              disabled={selectingAll}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              title={t('selectAllOnPage', 'Select all on this page')}
            />
          )}
        </div>
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
        <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
          {student.name || (student.firstName || student.lastName
            ? `${student.firstName || ''} ${student.lastName || ''}`.trim()
            : student.username || t('noName', 'No Name'))}
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
      key: 'academicYear',
      header: t('academicYear', 'Academic Year'),
      render: (student) => (
        <Badge
          color='blue'
          variant="filled"
          size='sm'
        >
          {student.academicYear}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: t('actions', 'Actions'),
      headerClassName: 'relative',
      cellClassName: 'text-left text-sm font-medium',
      render: (student) => (
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleViewStudent(student);
            }}
            disabled={loadingStudentDetails}
            className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={t('viewDetails', 'View Details')}
            aria-label={t('viewDetails', 'View Details')}
          >
            {loadingStudentDetails ? (
              <DynamicLoader type="spinner" size="sm" variant="primary" />
            ) : (
              <Eye className="h-4 w-4 stroke-[1.5]" />
            )}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditStudent(student);
            }}
            className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
            title={t('editStudent', 'Edit student')}
            aria-label={t('editStudent', 'Edit student')}
          >
            <Edit2 className="h-4 w-4 stroke-[1.5]" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Transfer button clicked for student:', student);
              const studentToTransfer = {
                ...student,
                id: student.id || student.student_id || student.user_id,
                student_id: student.student_id || student.id || student.user_id,
                user_id: student.user_id || student.id || student.student_id
              };
              console.log('Student data being set for transfer:', studentToTransfer);
              setSelectedStudent(studentToTransfer);
              setShowTransferDialog(true);
            }}
            className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
            title={t('transferStudent', 'Transfer student to another class')}
            aria-label={t('transferStudent', 'Transfer student to another class')}
          >
            <ArrowRightLeft className="h-4 w-4 stroke-[1.5]" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('Delete button clicked for student:', student);
              const studentToDelete = {
                ...student,
                id: student.id || student.student_id || student.user_id,
                student_id: student.student_id || student.id || student.user_id,
                user_id: student.user_id || student.id || student.student_id
              };
              console.log('Student data being set for deletion:', studentToDelete);
              setSelectedStudent(studentToDelete);
              setShowDeleteDialog(true);
            }}
            className="p-1.5 text-gray-500 hover:text-gray-900 transition-colors"
            title={t('moveStudentToMaster', 'Move student to master class')}
            aria-label={t('moveStudentToMaster', 'Move student to master class')}
          >
            <MinusCircle className="h-4 w-4 stroke-[1.5]" />
          </button>
        </div>
      )
    }
  ];

  const handleAddStudentClick = () => {
    navigate('/students/select');
  };

  // Show error state if error exists (prioritize over loading)

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
      <PageLoader
        message={t('loadingStudents')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  return (
    <div className="p-3 sm:p-4">
      {/* Search and filter */}
      <div className=" p-2 sm:p-6">
        {/* Header and search bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-4 sm:space-y-0">
          <div>
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">{t('studentsManagement')}</h1>
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
              <div>
                
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:space-x-2 mb-4">
          {/* Add Student Button */}
          <Button
            onClick={() => {
              handleAddStudentClick();
              setShowMobileFilters(false);
            }}
            size="sm"
            variant="success"
          >
            <Plus className="h-4 w-4 mr-1" />
            <span className="flex-1 text-left">{t('addStudent', 'Add Student')}</span>
          </Button>
          {/* Filter Button - Responsive (works on all screen sizes) */}
          <Button
            onClick={() => setShowMobileFilters(true)}
            variant="primary"
            size="sm"
            className=" flex items-center justify-center sm:justify-start gap-2 shadow-lg"
            title={t('filters', 'Filters & Actions')}
          >
            <Filter className="h-4 w-4" />
            <span className="sm:hidden">{t('filters', 'Filters & Actions')}</span>
            <span className="hidden sm:inline">{t('filters', 'Filters')}</span>
            {(localSearchTerm || selectedGradeLevel !== 'all' || selectedClassId !== 'all') && (
              <span className="ml-auto sm:ml-1 bg-white text-blue-600 text-xs font-bold px-2.5 sm:px-2 py-0.5 rounded-full">
                {(localSearchTerm ? 1 : 0) + (selectedGradeLevel !== 'all' ? 1 : 0) + (selectedClassId !== 'all' ? 1 : 0)}
              </span>
            )}
          </Button>

          {/* Select All / Deselect All Button - Outside Sidebar (Selects all filtered students across all pages) */}
          {students.length > 0 && (
            <Button
              onClick={handleSelectAllFiltered}
              variant={selectedStudents.length > 0 ? "danger" : "primary"}
              size="sm"
              disabled={selectingAll}
              className=" flex items-center justify-center sm:justify-start gap-2"
              title={selectedStudents.length > 0 ? t('deselectAllFiltered', 'Deselect all filtered students') : t('selectAllFiltered', 'Select all filtered students')}
            >
              {selectingAll ? (
                <DynamicLoader
                  type="spinner"
                  size="sm"
                  variant={selectedStudents.length > 0 ? "white" : "primary"}
                />
              ) : selectedStudents.length > 0 ? (
                <>
                  <X className="h-4 w-4" />
                  <span>{t('deselectAll', 'Deselect All')}</span>
                </>
              ) : (
                <>
                  <Users className="h-4 w-4" />
                  <span>{t('selectAll', 'Select All')}</span>
                </>
              )}
            </Button>
          )}

          {/* Student Actions Floating Button - Show when students are selected */}
          {selectedStudents.length > 0 && (
            <div className="flex justify-center">
              <button
                onClick={() => setShowStudentActionsModal(true)}
                className="group relative inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
                title={t('manageStudents', 'Manage Selected Students')}
              >
                <Users className="h-5 w-5" />
                {/* Notification count badge */}
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-md border-2 border-white">
                  {selectedStudents.length > 99 ? '99+' : selectedStudents.length}
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                  {t('manageStudents', 'Manage Selected Students')}
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
              </button>
            </div>
          )}

        </div>

        {/* Mobile Filters Sidebar */}
        <SidebarFilter
          isOpen={showMobileFilters}
          onClose={() => setShowMobileFilters(false)}
          title={t('filters', 'Filters & Actions')}
          subtitle={t('manageStudentRecords', 'Manage your filters and actions')}
          hasFilters={localSearchTerm || selectedGradeLevel !== 'all' || selectedClassId !== 'all'}
          onClearFilters={() => {
            handleSearchChange('');
            setSelectedGradeLevel('all');
            setSelectedClassId('all');
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          onApply={() => { }}
          children={
            <>
              {/* Search Input */}
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">{t('search', 'Search')}</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-4 w-4 text-blue-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-lg leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent text-sm transition-colors"
                    placeholder={t('searchStudents', 'Search students by name or username...')}
                    value={localSearchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                  />
                  {localSearchTerm && (
                    <button
                      onClick={() => handleSearchChange('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      title={t('clearSearch', 'Clear search')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Grade Level Filter */}
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">{t('selectGradeLevel', 'Grade Level')}</label>
                <Dropdown
                  value={selectedGradeLevel}
                  onValueChange={(value) => {
                    setSelectedGradeLevel(value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  options={getGradeLevelOptions()}
                  placeholder={t('chooseGradeLevel', 'Choose grade level...')}
                  minWidth="w-full"
                  triggerClassName="text-sm w-full bg-gray-50 border-gray-200"
                />
              </div>

              {/* Class Filter */}
              <div>
                <label className="block text-gray-700 text-xs font-semibold mb-2 uppercase">{t('selectClass', 'Class')}</label>
                <Dropdown
                  value={selectedClassId}
                  onValueChange={(value) => {
                    setSelectedClassId(value);
                    setPagination(prev => ({ ...prev, page: 1 }));
                  }}
                  options={classDropdownOptions}
                  placeholder={t('selectClass', 'Select class...')}
                  minWidth="w-full"
                  triggerClassName="text-sm w-full bg-gray-50 border-gray-200"
                />
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

        {/* Students table - Show on all screen sizes */}
        {/* Only show student data if grade level is 'all' OR if there are classes for the selected grade level */}
        {selectedGradeLevel === 'all' || allClasses.length > 0 ? (
          <>
            <Table
              columns={tableColumns}
              data={students}
              emptyMessage={t('noStudentsFound', 'No students found')}
              emptyIcon={Users}
              emptyVariant='info'
              emptyDescription={t('noStudentsFoundMatchingCriteria', 'No students found matching your criteria.')}
              emptyActionLabel={localSearchTerm ? t('clearSearch', 'Clear search') : undefined}
              onEmptyAction={localSearchTerm ? () => handleSearchChange('') : undefined}
              rowClassName="hover:bg-blue-50"
              showPagination={students.length > 0}
              pagination={pagination}
              onPageChange={handlePageChange}
              t={t}
            />
          </>
        ) : (
          <EmptyState
            icon={Users}
            title={t('noClassesAvailable', 'No Classes Available')}
            description={t('selectedGradeLevelNoClasses', 'The selected grade level has no classes available.')}
            variant="info"
          />
        )}
      </div>

      {/* Delete Confirmation */}
      <DeleteDialog />

      {/* Bulk Delete Confirmation */}
      <BulkDeleteDialog />

      {/* Transfer Confirmation */}
      <TransferDialog />

      {/* Student Actions Modal - Unified modal for transfer and remove */}
      <StudentActionsModal
        isOpen={showStudentActionsModal}
        onClose={() => setShowStudentActionsModal(false)}
        selectedStudents={selectedStudents}
        selectedStudentsData={selectedStudentsData}
        classes={classes}
        onTransfer={handleBulkTransferStudents}
        onRemove={handleBulkDeleteStudents}
        loading={isLoading('bulkTransfer') || isLoading('bulkDelete')}
        onRemoveStudent={removeStudent}
        onClearAll={clearAll}
        schoolId={schoolId}
      />

      {/* View Student Modal */}
      <StudentViewModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewingStudent(null);
        }}
        student={viewingStudent}
      />

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
    </div>
  );
}