import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Plus, MinusCircle, Edit2, Users, X, ArrowRightLeft, Eye, Filter, Download } from 'lucide-react';
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
import { formatClassIdentifier, getGradeLevelOptions as getSharedGradeLevelOptions } from '../../utils/helpers';
import { encryptId, decryptParams } from '../../utils/encryption';
import { getFullName } from '../../utils/usernameUtils';
import StudentActionsModal from '../../components/students/StudentActionsModal';
import StudentViewModal from '../../components/students/StudentViewModal';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import EmptyState from '../../components/ui/EmptyState';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import SidebarFilter from '../../components/ui/SidebarFilter';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { exportStudentToExcel } from '../../utils/studentDownloadUtils';

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
  const [searchParams] = useSearchParams();
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

  // State for current user's school ID (get from localStorage on mount)
  const [schoolId, setSchoolId] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const userSchoolId = user?.teacher?.schoolId || user?.school_id || user?.schoolId;
        if (userSchoolId) {
          console.log('✅ School ID from localStorage:', userSchoolId);
          return userSchoolId;
        }
      }
    } catch (err) {
      console.error('Error getting school ID from localStorage:', err);
    }
    return null;
  });

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

  // Read classId from URL query parameters and pre-select the class
  useEffect(() => {
    // Try to get encrypted params first
    const encryptedParams = searchParams.get('params');

    if (encryptedParams) {
      // Decrypt the parameters
      const decrypted = decryptParams(encryptedParams);
      if (decrypted) {
        console.log('Decrypted params from URL:', decrypted);
        // Pre-select the class if classId is provided
        if (decrypted.classId && decrypted.classId !== 'all') {
          setSelectedClassId(decrypted.classId);
        }
      }
    } else {
      // Fallback to non-encrypted params (for backward compatibility)
      const classIdParam = searchParams.get('classId');

      // Pre-select the class if classId is provided
      if (classIdParam && classIdParam !== 'all') {
        setSelectedClassId(classIdParam);
      }
    }
  }, [searchParams]);

  // Debug: Log filter changes
  // useEffect(() => {
  //   console.log('🔍 selectedClassId changed:', selectedClassId, 'type:', typeof selectedClassId);
  // }, [selectedClassId]);


  // Other state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState(''); // For immediate UI feedback
  const [poorCardIdFilter, setPoorCardIdFilter] = useState(''); // Poor card ID filter
  const [academicYearFilter, setAcademicYearFilter] = useState(''); // Academic year filter
  const [debouncedAcademicYear, setDebouncedAcademicYear] = useState(''); // Debounced academic year
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showStudentActionsModal, setShowStudentActionsModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [downloadingStudentId, setDownloadingStudentId] = useState(null);
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const fetchingRef = useRef(false);
  const lastFetchParams = useRef(null);
  const searchTimeoutRef = useRef(null);
  const classesInitialized = useRef(false);

  // State for all students (unfiltered) and filtered students
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);

  // Get grade level options from shared helper (uses GRADE_LEVELS)
  const getGradeLevelOptions = () => {
    return getSharedGradeLevelOptions(t, true);
  };

  // Memoize class dropdown options from classes returned by API (already filtered by gradeLevel)
  const classDropdownOptions = useMemo(() => {
    const options = [
      { value: 'all', label: t('allClasses', 'ថ្នាក់ទាំងអស់') },
      ...allClasses.map(cls => ({
        value: String(cls.classId),
        // Match ClassesManagement formatting: numeric grade for 1–12, localized label for grade 0
        ...(() => {
          const rawGradeLevel =
            typeof cls.gradeLevel !== 'undefined' && cls.gradeLevel !== null
              ? String(cls.gradeLevel)
              : '';

          const displayGradeLevel =
            rawGradeLevel === '0'
              ? t('grade0', 'Kindergarten')
              : rawGradeLevel;

          return {
            label: `${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, cls.section)}`
          };
        })()
      }))
    ];
    return options;
  }, [allClasses, t]);

  // Reset selectedClassId when grade level changes
  useEffect(() => {
    setSelectedClassId('all');
  }, [selectedGradeLevel]);

  // Enhanced client-side search function for class-filtered results
  const performClientSideSearch = useCallback((studentsData, searchQuery, poorCardId) => {
    let filtered = studentsData;

    // Filter by search query (name, username, email, phone)
    if (searchQuery && searchQuery.trim() !== '') {
      const query = searchQuery.trim().toLowerCase();
      filtered = filtered.filter(student => {
        // Search in multiple fields
        const searchFields = [
          student.firstName || '',
          student.lastName || '',
          student.username || '',
          student.email || '',
          student.phone || '',
          (student.name || ''),
          getFullName(student, ''),
          (student.class?.name || ''),
          (student.className || '')
        ];

        return searchFields.some(field =>
          field.toLowerCase().includes(query)
        );
      });
    }

    // Filter by poor card ID
    if (poorCardId && poorCardId.trim() !== '') {
      const cardId = poorCardId.trim();
      filtered = filtered.filter(student => {
        const studentCardId = student.poorCardId || student.poor_card_id || '';
        return String(studentCardId).includes(cardId);
      });
    }

    return filtered;
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
        console.log('🚨 No school ID available');
        showError(t('noSchoolIdFound', 'No school ID found for your account'));
        setClasses([]);
        setAllClasses([]);
        setSelectedClassId('all');
        return;
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
  }, [user?.id, user?.username, handleError, t, schoolId, selectedGradeLevel, showError]);

  // Fetch students with pagination and filters using school classes endpoint
  const fetchStudents = useStableCallback(async (search = searchTerm, force = false, skipLoading = false, academicYear = academicYearFilter, isPagination = false) => {
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
        if (isPagination) {
          setPaginationLoading(true);
        } else {
          startLoading('fetchStudents', t('loadingStudents', 'Loading students...'));
        }
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
        if (isPagination) {
          setPaginationLoading(false);
        } else {
          stopLoading('fetchStudents');
        }
      }
      fetchingRef.current = false;
    }
  }, [schoolId, showError, t, handleError, selectedClassId]);

  // Re-fetch school ID when user school_id changes (e.g., after login or transfer)
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
      }
    }
  }, [user?.teacher?.schoolId, user?.school_id, user?.schoolId, schoolId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initialize classes when component mounts or when grade level changes
  // Only call this once per grade level change
  useEffect(() => {
    console.log('🔄 Initializing classes for grade level:', selectedGradeLevel);
    // Reset the flag to force re-fetch when grade level changes
    if (selectedGradeLevel !== 'all') {
      classesInitialized.current = false;
    }
    initializeClasses().catch((err) => {
      console.error('🚨 Unhandled error in initializeClasses:', err);
    });
  }, [selectedGradeLevel]);

  // Initial fetch when school ID becomes available
  useEffect(() => {
    if (schoolId) {
      console.log('School ID available, initial fetch...');
      fetchStudents('', true); // Force initial fetch - let fetchStudents handle loading states
    }
  }, [schoolId]);

  // Memoized fetch parameters to avoid unnecessary re-renders
  const fetchParams = useMemo(() => ({
    searchTerm,
    poorCardId: poorCardIdFilter,
    page: pagination.page,
    limit: pagination.limit,
    classId: selectedClassId
  }), [searchTerm, poorCardIdFilter, pagination.page, pagination.limit, selectedClassId]);

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
  }, [fetchParams, schoolId]);

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

  // Clear pagination loading when data finishes loading
  useEffect(() => {
    if (!isLoading('fetchStudents')) {
      setPaginationLoading(false);
    }
  }, [isLoading('fetchStudents')]);

  // Handle page change
  const handlePageChange = (newPage) => {
    console.log(`=== PAGINATION CHANGE DEBUG ===`);
    console.log(`Changing from page ${pagination.page} to page ${newPage}`);
    console.log(`Total pages available: ${pagination.pages}`);
    console.log(`Current limit: ${pagination.limit}`);

    if (newPage >= 1 && newPage <= pagination.pages && !paginationLoading) {
      console.log(`Valid page change - updating pagination state`);
      setPaginationLoading(true);
      setPagination(prev => {
        const newPagination = { ...prev, page: newPage };
        console.log(`New pagination state:`, newPagination);
        return newPagination;
      });
      fetchStudents(searchTerm, false, false, academicYearFilter, true); // Call with isPagination = true
    } else {
      console.warn(`Invalid page change attempted: page ${newPage} not in range 1-${pagination.pages} or loading in progress`);
    }
    console.log(`=== END PAGINATION CHANGE DEBUG ===`);
  };

  // Handle limit change
  const handleLimitChange = (newLimit) => {
    setPaginationLoading(true);
    setPagination(prev => ({
      ...prev,
      limit: newLimit,
      page: 1 // Reset to first page when changing limit
    }));
    // Scroll to top when changing limit
    window.scrollTo(0, 0);
  };

  // Reset pagination to page 1 when filters change
  const prevFiltersRef = useRef({ selectedClassId, academicYearFilter: debouncedAcademicYear, poorCardId: poorCardIdFilter });
  useEffect(() => {
    const filtersChanged = prevFiltersRef.current.selectedClassId !== selectedClassId ||
      prevFiltersRef.current.academicYearFilter !== debouncedAcademicYear ||
      prevFiltersRef.current.poorCardId !== poorCardIdFilter;

    if (filtersChanged) {
      // Clear last fetch params to allow new fetch with new filters
      lastFetchParams.current = null;
      if (pagination.page !== 1) {
        setPagination(prev => ({ ...prev, page: 1 }));
      }
      // If already on page 1, the main useEffect will handle the fetch automatically
      prevFiltersRef.current = { selectedClassId, academicYearFilter: debouncedAcademicYear, poorCardId: poorCardIdFilter };
    }
  }, [selectedClassId, debouncedAcademicYear, poorCardIdFilter, pagination.page, schoolId, searchTerm]); // Reset page when filters change

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
      message={`${t('confirmMoveStudentToMaster', 'Are you sure you want to move')} ${getFullName(selectedStudent, t('thisStudent', 'this student'))} ${t('toMasterClass', 'to the master class? This will remove them from the current class.')}`}
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

  // Get grade levels for transfer dialog using shared helper (includes Kindergarten)
  const getTransferGradeLevelOptions = () => {
    return getSharedGradeLevelOptions(t, true);
  };

  const TransferDialog = () => (
    <ConfirmDialog
      isOpen={showTransferDialog}
      type='transfer'
      onClose={() => {
        setShowTransferDialog(false);
        setTransferTargetClassId('');
        setTransferFilterGradeLevel('all');
      }}
      onConfirm={handleTransferStudent}
      title={t('transferStudent', 'Transfer Student')}
      message={
        <div className="space-y-4 w-full">
          <p>{t('selectTargetClass', 'Select the class to transfer the student to')}:</p>
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              {t('student', 'Student')}: <span className="font-bold">{getFullName(selectedStudent, selectedStudent?.username || 'Unknown')}</span>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              {t('currentClass', 'Current Class')}: <span className="font-bold">{selectedStudent?.class?.name || 'N/A'}</span>
            </label>

            {/* Grade Level Filter for Transfer */}
            <div>
              <label className="block text-sm text-start font-medium text-gray-700 mb-1">
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
                className=''
              />
            </div>

            {/* Target Class Selection */}
            <div>
              <label className="block text-sm text-start font-medium text-gray-700 mb-1">
                {t('targetClass', 'Target Class')}:
              </label>
              <Dropdown
                value={transferTargetClassId}
                onValueChange={setTransferTargetClassId}
                options={transferFilteredClasses.map(cls => {
                  const rawGradeLevel =
                    typeof cls.gradeLevel !== 'undefined' && cls.gradeLevel !== null
                      ? String(cls.gradeLevel)
                      : '';

                  const displayGradeLevel =
                    rawGradeLevel === '0'
                      ? t('grade0', 'Kindergarten')
                      : rawGradeLevel;

                  return {
                    value: cls.classId.toString(),
                    label: `${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, cls.section)} - ${cls.academicYear}`
                  };
                })}
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
        studentName: selectedStudent.name || getFullName(selectedStudent),
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

  // Handle edit student - navigate to edit page
  const handleEditStudent = (student) => {
    console.log('Edit button clicked for student:', student);
    const studentId = student.userId || student.user_id || student.id;
    const encryptedId = encryptId(studentId);
    navigate(`/students/edit?id=${encryptedId}`);
  };

  /**
   * Download student data as Excel file
   */
  const handleDownloadStudent = async (student) => {
    try {
      setDownloadingStudentId(student.id);
      await exportStudentToExcel(student, t);
      showSuccess(t('studentDownloadSuccess', 'Student data downloaded successfully'));
    } catch (err) {
      console.error('Error downloading student:', err);
      showError(t('studentDownloadError', 'Failed to download student data'));
    } finally {
      setDownloadingStudentId(null);
    }
  };

  // Handle select all students on current page only
  const handleSelectAllCurrentPage = async () => {
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
          onChange={handleSelectAllCurrentPage}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          title={t('selectAllOnPage', 'Select all on this page')}
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
        <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
          {getFullName(student, student.username || '-')}
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
        <p>{student.username || '-'}</p>
      )
    },
    {
      key: 'className',
      header: t('class', 'Class'),
      cellClassName: 'text-xs sm:text-sm text-gray-700',
      responsive: 'hidden lg:table-cell',
      render: (student) => {
        const rawGradeLevelValue =
          student?.class?.gradeLevel ?? student?.gradeLevel;

        if (rawGradeLevelValue !== undefined && rawGradeLevelValue !== null && rawGradeLevelValue !== '') {
          const rawGradeLevel = String(rawGradeLevelValue);
          const displayGradeLevel =
            rawGradeLevel === '0'
              ? t('grade0', 'Kindergarten')
              : rawGradeLevel;

          return (
            <p>
              {`${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, student?.class?.section || student?.section)}`}
            </p>
          );
        }

        return <p>{student?.className || '-'}</p>;
      }
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
          {student.academicYear || '-'}
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
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadStudent(student);
            }}
            disabled={downloadingStudentId === student.id}
            className="p-1.5 text-gray-500 hover:text-green-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title={t('downloadStudentData', 'Download student data as Excel')}
            aria-label={t('downloadStudentData', 'Download student data as Excel')}
          >
            {downloadingStudentId === student.id ? (
              <DynamicLoader type="spinner" size="sm" variant="primary" />
            ) : (
              <Download className="h-4 w-4 stroke-[1.5]" />
            )}
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
      <div className="min-h-screen bg-gray-50">
        <PageLoader message={t('loadingStudents')} />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4">
      {/* Search and filter */}
      <div className=" p-2 sm:p-6">
        {/* Header and search bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-4 sm:space-y-0">
          <div>
            <div className="flex items-center">
              <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{t('studentsManagement')}</h1>
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center space-x-4">
                <p className="text-sm text-gray-600">
                  {t('manageStudentRecords', 'Manage Student Records')}
                </p>
              </div>
              <div>

              </div>
            </div>
          </div>
          {/* Add Student Button in Header */}
          <Button
            onClick={handleAddStudentClick}
            size="sm"
            variant="success"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>{t('addStudent', 'Add Student')}</span>
          </Button>
        </div>
        {/* Search Bar and Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center mb-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-600" />
            </div>
            <input
              type="text"
              className="text-sm w-full pl-10 pr-8 py-2 border border-gray-200 rounded-lg leading-5 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-colors"
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

          {/* Buttons Group */}
          <div className="flex gap-2 items-stretch sm:items-center">
            {/* Filter Button - Responsive (works on all screen sizes) */}
            <Button
              onClick={() => setShowMobileFilters(true)}
              variant="primary"
              size="sm"
              className=" flex items-center justify-center sm:justify-start gap-2 shadow-lg whitespace-nowrap"
              title={t('filters', 'Filters & Actions')}
            >
              <Filter className="h-4 w-4" />
              <span className="sm:hidden">{t('filters', 'Filters & Actions')}</span>
              <span className="hidden sm:inline">{t('filters', 'Filters')}</span>
              {(selectedGradeLevel !== 'all' || selectedClassId !== 'all') && (
                <span className="ml-auto sm:ml-1 bg-white text-blue-600 text-xs font-bold px-2.5 sm:px-2 py-0.5 rounded-full">
                  {(selectedGradeLevel !== 'all' ? 1 : 0) + (selectedClassId !== 'all' ? 1 : 0)}
                </span>
              )}
            </Button>
          </div>
          <div className='flex gap-2 items-center justify-end'>

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
        </div>

        {/* Active Filters Display */}
        {(selectedGradeLevel !== 'all' || selectedClassId !== 'all') && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-blue-900">{t('activeFilters', 'Active Filters')}:</span>
            {selectedClassId !== 'all' && (
              <Badge color="purple" variant="outline" size="sm">
                {t('class', 'Class')}: {
                  (() => {
                    const selectedClass = allClasses.find(cls => cls.classId.toString() === selectedClassId);
                    if (selectedClass) {
                      const rawGradeLevel =
                        typeof selectedClass.gradeLevel !== 'undefined' && selectedClass.gradeLevel !== null
                          ? String(selectedClass.gradeLevel)
                          : '';

                      const displayGradeLevel =
                        rawGradeLevel === '0'
                          ? t('grade0', 'Kindergarten')
                          : rawGradeLevel;

                      return formatClassIdentifier(displayGradeLevel, selectedClass.section);
                    }
                    return selectedClassId;
                  })()
                }
              </Badge>
            )}
            {selectedGradeLevel !== 'all' && (
              <Badge color="green" variant="outline" size="sm">
                {t('gradeLevel', 'Grade Level')}: {getSharedGradeLevelOptions(t, true).find(g => g.value === selectedGradeLevel)?.label || selectedGradeLevel}
              </Badge>
            )}
          </div>
        )}

        {/* Mobile Filters Sidebar */}
        <SidebarFilter
          isOpen={showMobileFilters}
          onClose={() => setShowMobileFilters(false)}
          title={t('filters', 'Filters & Actions')}
          subtitle={t('manageStudentRecords', 'Manage your filters and actions')}
          hasFilters={selectedGradeLevel !== 'all' || selectedClassId !== 'all'}
          onClearFilters={() => {
            setSelectedGradeLevel('all');
            setSelectedClassId('all');
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          onApply={() => {
            setShowMobileFilters(false);
          }}
          children={
            <>
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
          actionsContent={null}
        />

        {/* Students table - Show on all screen sizes */}
        {/* Only show student data if grade level is 'all' OR if there are classes for the selected grade level */}
        {selectedGradeLevel === 'all' || allClasses.length > 0 ? (
          paginationLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" variant="primary">
                {t('loadingPage', 'Loading page...')}
              </LoadingSpinner>
            </div>
          ) : (
            <Table
              columns={tableColumns}
              data={students}
              loading={paginationLoading}
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
              onLimitChange={handleLimitChange}
              limitOptions={[10, 25, 50]}
              showLimitSelector={true}
              t={t}
              disabled={paginationLoading}
            />
          )
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
        onRefresh={() => fetchStudents(undefined, true, true)}
      />

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

    </div>
  );
}