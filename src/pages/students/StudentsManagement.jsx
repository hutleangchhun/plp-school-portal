import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Edit2, User, Users, User2, ChevronDown, Download, X, Building, Mail, Phone, Eye, Upload } from 'lucide-react';
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
import SelectedStudentsManager from '../../components/students/SelectedStudentsManager';
import useSelectedStudents from '../../hooks/useSelectedStudents';
import { Badge } from '../../components/ui/Badge';
import { Table, MobileCards } from '../../components/ui/Table';
import { exportToExcel, exportToCSV, exportToPDF, getTimestampedFilename } from '../../utils/exportUtils';
import Modal from '../../components/ui/Modal';
import { DatePickerWithDropdowns } from '../../components/ui/date-picker-with-dropdowns';
import ProfileImage from '../../components/ui/ProfileImage';
import { useLocationData } from '../../hooks/useLocationData';

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    gender: '',
    dateOfBirth: null,
    nationality: '',
    profilePicture: '',
    residence: {
      provinceId: '',
      districtId: '',
      communeId: '',
      villageId: ''
    },
    placeOfBirth: {
      provinceId: '',
      districtId: '',
      communeId: '',
      villageId: ''
    }
  });
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
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [profilePictureFile, setProfilePictureFile] = useState(null);
  const fetchingRef = useRef(false);
  const lastFetchParams = useRef(null);
  const searchTimeoutRef = useRef(null);
  const classesInitialized = useRef(false);
  const fileInputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  // State for all students (unfiltered) and filtered students
  const [allStudents, setAllStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  
  // Location data hooks for residence
  const {
    provinces: residenceProvinces,
    districts: residenceDistricts,
    communes: residenceCommunes,
    villages: residenceVillages,
    selectedProvince: selectedResidenceProvince,
    selectedDistrict: selectedResidenceDistrict,
    selectedCommune: selectedResidenceCommune,
    selectedVillage: selectedResidenceVillage,
    handleProvinceChange: handleResidenceProvinceChange,
    handleDistrictChange: handleResidenceDistrictChange,
    handleCommuneChange: handleResidenceCommuneChange,
    handleVillageChange: handleResidenceVillageChange,
    getProvinceOptions: getResidenceProvinceOptions,
    getDistrictOptions: getResidenceDistrictOptions,
    getCommuneOptions: getResidenceCommuneOptions,
    getVillageOptions: getResidenceVillageOptions,
    setInitialValues: setResidenceInitialValues,
    resetSelections: resetResidenceSelections
  } = useLocationData();

  // Location data hooks for place of birth
  const {
    provinces: birthProvinces,
    districts: birthDistricts,
    communes: birthCommunes,
    villages: birthVillages,
    selectedProvince: selectedBirthProvince,
    selectedDistrict: selectedBirthDistrict,
    selectedCommune: selectedBirthCommune,
    selectedVillage: selectedBirthVillage,
    handleProvinceChange: handleBirthProvinceChange,
    handleDistrictChange: handleBirthDistrictChange,
    handleCommuneChange: handleBirthCommuneChange,
    handleVillageChange: handleBirthVillageChange,
    getProvinceOptions: getBirthProvinceOptions,
    getDistrictOptions: getBirthDistrictOptions,
    getCommuneOptions: getBirthCommuneOptions,
    getVillageOptions: getBirthVillageOptions,
    setInitialValues: setBirthInitialValues,
    resetSelections: resetBirthSelections
  } = useLocationData();

  // Profile picture handlers
  const handleViewPicture = () => {
    setShowImageModal(true);
    setShowDropdown(false);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
    setShowDropdown(false);
  };

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePictureFile(file);
      // Update the form data with the file URL for preview
      const fileURL = URL.createObjectURL(file);
      handleEditFormChange('profilePicture', fileURL);
    }
  };
  
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
  
  // Initialize classes using new classes/user API
  const initializeClasses = useStableCallback(async () => {
    // Avoid re-initializing if classes are already loaded
    if (classesInitialized.current) {
      console.log('Classes already initialized, skipping');
      return;
    }
    
    console.log('=== INITIALIZING CLASSES FROM NEW API ===');
    console.log('Current user object:', user);
    
    if (!user?.id) {
      console.log('No user ID available for fetching classes');
      setClasses([]);
      setSelectedClassId('all');
      return;
    }

    try {
      console.log('Fetching classes using new classes/user API...');
      
      // Get class data from new /classes/user/{userId} endpoint
      const classResponse = await classService.getClassByUser(user.id);
      
      if (!classResponse || !classResponse.success || !classResponse.classes || !Array.isArray(classResponse.classes)) {
        console.log('No classes found in API response:', classResponse);
        setClasses([]);
        setSelectedClassId('all');
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
        
    } catch (error) {
      console.error('Failed to fetch classes from API:', error);
      setClasses([]);
      setSelectedClassId('all');
    }
  }, [user?.id, user?.username]);

  // Fetch students with pagination and filters using my-students endpoint
  const fetchStudents = useStableCallback(async (search = searchTerm, force = false, skipLoading = false) => {
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
       
    } catch (error) {
      console.error('Error fetching students from school:', error);
      showError(error.message || t('errorFetchingStudents'));
      setStudents([]);
      setAllStudents([]);
      setFilteredStudents([]);
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
      fetchingRef.current = false;
    }
  }, [selectedClassId, user?.id, showError, t]);

  // Initialize classes when component mounts
  useEffect(() => {
    initializeClasses();
  }, [initializeClasses]);

  // Initial fetch when classes become available
  useEffect(() => {
    if (classes.length > 0 && classesInitialized.current) {
      console.log('Classes available, initial fetch...');
      fetchStudents('', true); // Force initial fetch
    }
  }, [classes.length, fetchStudents]);

  // Memoized fetch parameters to avoid unnecessary re-renders
  const fetchParams = useMemo(() => ({
    searchTerm,
    selectedClassId,
    classesLength: classes.length,
    page: pagination.page,
    limit: pagination.limit
  }), [searchTerm, selectedClassId, classes.length, pagination.page, pagination.limit]);

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
      console.log(`Timer fired - calling fetchStudents with page ${fetchParams.page}, limit ${fetchParams.limit}`);
      // Only fetch if not already fetching and has required data
      if (!fetchingRef.current && classesInitialized.current) {
        fetchStudents(fetchParams.searchTerm, false);
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExportDropdown, showDropdown]);
  
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
  const prevFiltersRef = useRef({ selectedClassId });
  useEffect(() => {
    if (prevFiltersRef.current.selectedClassId !== selectedClassId) {
      if (pagination.page !== 1) {
        console.log(`Filter changed - resetting pagination to page 1`);
        setPagination(prev => ({ ...prev, page: 1 }));
      }
      prevFiltersRef.current = { selectedClassId };
    }
  }, [selectedClassId, pagination.page]); // Reset page when filters change
  
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
  const handleEditStudent = async (student) => {
    console.log('Edit button clicked for student:', student);
    try {
      setLoading(true);
      
      const userId = student.userId || student.user_id || student.id;
      let fullData = student;
      if (userId) {
        const resp = await userService.getUserByID(userId);
        // Some clients wrap data; support both shapes
        fullData = resp?.data || resp || student;
      }
      setEditingStudent({ ...student, userId: userId });
      setEditForm({
        firstName: fullData.firstName || fullData.first_name || '',
        lastName: fullData.lastName || fullData.last_name || '',
        username: fullData.username || '',
        email: fullData.email || '',
        phone: fullData.phone || '',
        gender: fullData.gender || '',
        dateOfBirth: fullData.dateOfBirth ? new Date(fullData.dateOfBirth) : (fullData.date_of_birth ? new Date(fullData.date_of_birth) : null),
        nationality: fullData.nationality || '',
        profilePicture: fullData.profile_picture || fullData.profilePicture || '',
        residence: {
          provinceId: fullData.residence?.provinceId || fullData.province_id || '',
          districtId: fullData.residence?.districtId || fullData.district_id || '',
          communeId: fullData.residence?.communeId || fullData.commune_id || '',
          villageId: fullData.residence?.villageId || fullData.village_id || ''
        },
        placeOfBirth: {
          provinceId: fullData.placeOfBirth?.provinceId || fullData.residence?.provinceId || fullData.province_id || '',
          districtId: fullData.placeOfBirth?.districtId || fullData.residence?.districtId || fullData.district_id || '',
          communeId: fullData.placeOfBirth?.communeId || fullData.residence?.communeId || fullData.commune_id || '',
          villageId: fullData.placeOfBirth?.villageId || fullData.residence?.villageId || fullData.village_id || ''
        }
      });
      
      // Initialize dropdown selections
      const res = fullData.residence || {};
      setResidenceInitialValues({
        provinceId: res.provinceId || fullData.province_id || '',
        districtId: res.districtId || fullData.district_id || '',
        communeId: res.communeId || fullData.commune_id || '',
        villageId: res.villageId || fullData.village_id || ''
      });
      
      const birth = fullData.placeOfBirth || {};
      setBirthInitialValues({
        provinceId: birth.provinceId || res.provinceId || fullData.province_id || '',
        districtId: birth.districtId || res.districtId || fullData.district_id || '',
        communeId: birth.communeId || res.communeId || fullData.commune_id || '',
        villageId: birth.villageId || res.villageId || fullData.village_id || ''
      });
      setShowEditModal(true);
    } catch (e) {
      console.error('Failed to fetch user by ID for edit:', e);
      setEditingStudent(student);
      setShowEditModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle update student form submission
  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      setLoading(true);
      
      const userId = editingStudent.userId || editingStudent.user_id || editingStudent.id;
      console.log('Updating user by users_id:', userId);
      console.log('Update data (form):', editForm);

      // Normalize date to YYYY-MM-DD
      const formatDate = (val) => {
        if (!val) return undefined;
        const d = val instanceof Date ? val : new Date(val);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      // Backend expects snake_case keys on updateUser
      const payload = {
        username: editForm.username?.trim(),
        first_name: editForm.firstName?.trim(),
        last_name: editForm.lastName?.trim(),
        email: editForm.email?.trim(),
        phone: editForm.phone?.trim(),
        date_of_birth: formatDate(editForm.dateOfBirth),
        gender: editForm.gender || undefined,
        nationality: editForm.nationality?.trim() || undefined,
        profile_picture: editForm.profilePicture || undefined,
        residence: {
          provinceId: selectedResidenceProvince || editForm.residence.provinceId || undefined,
          districtId: selectedResidenceDistrict || editForm.residence.districtId || undefined,
          communeId: selectedResidenceCommune || editForm.residence.communeId || undefined,
          villageId: selectedResidenceVillage || editForm.residence.villageId || undefined,
        },
        placeOfBirth: {
          provinceId: selectedBirthProvince || editForm.placeOfBirth.provinceId || undefined,
          districtId: selectedBirthDistrict || editForm.placeOfBirth.districtId || undefined,
          communeId: selectedBirthCommune || editForm.placeOfBirth.communeId || undefined,
          villageId: selectedBirthVillage || editForm.placeOfBirth.villageId || undefined,
        }
      };

      // Remove undefined/empty values
      Object.keys(payload).forEach(k => {
        if (payload[k] === undefined || payload[k] === null || payload[k] === '') delete payload[k];
      });

      const response = await userService.updateUser(userId, payload);
      console.log('Update response:', response);

      if (response) {
        showSuccess(t('studentUpdatedSuccess', 'Student updated successfully'));
        setShowEditModal(false);
        setEditingStudent(null);
        setEditForm({
          firstName: '',
          lastName: '',
          username: '',
          email: '',
          phone: '',
          gender: '',
          dateOfBirth: null,
          nationality: '',
          profilePicture: '',
          residence: { provinceId: '', districtId: '', communeId: '', villageId: '' },
          placeOfBirth: { provinceId: '', districtId: '', communeId: '', villageId: '' },
        });
        
        // Reset location selections
        resetResidenceSelections();
        resetBirthSelections();
        
        // Clear profile picture state
        setProfilePictureFile(null);
        setShowDropdown(false);
        
        // Refresh the student list
        setTimeout(async () => {
          await fetchStudents(searchTerm, true, true); // Skip loading since we're already managing it
        }, 500);
      } else {
        throw new Error('Failed to update student');
      }
    } catch (error) {
      console.error('Error updating student:', error);
      showError(t('failedUpdateStudent', 'Failed to update student: ') + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Handle edit form input changes
  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
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
      exportToExcel(students, filename, t);
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
      exportToCSV(students, filename, t);
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
      await exportToPDF(students, selectedClass, filename, t);
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
            <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
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
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{t('phone', 'Phone')}: {student.phone || 'N/A'}</span>
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

  return (
    <PageTransition variant="fade" className="p-6">      
      {/* Search and filter */}
      <FadeInSection className="bg-white shadow rounded-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
        {/* Header and search bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('studentsManagement')}</h1>
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

        {/* Selected Students Display */}
        <SelectedStudentsManager
          selectedStudents={selectedStudents}
          selectedStudentsData={selectedStudentsData}
          onRemoveStudent={removeStudent}
          onClearAll={clearAll}
          onBulkAction={(actionKey) => {
            if (actionKey === 'moveToMaster') {
              setShowBulkDeleteDialog(true);
            }
          }}
          actions={[
            {
              key: 'moveToMaster',
              label: t('moveSelectedToMaster') || 'Move Selected to Master',
              className: 'bg-red-600 hover:bg-red-700 text-white'
            }
          ]}
        />
        
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
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingStudent(null);
          setEditForm({
            firstName: '',
            lastName: '',
            username: '',
            email: '',
            phone: '',
            gender: '',
            dateOfBirth: null,
            nationality: '',
            profilePicture: '',
            residence: { provinceId: '', districtId: '', communeId: '', villageId: '' },
            placeOfBirth: { provinceId: '', districtId: '', communeId: '', villageId: '' },
          });
          resetResidenceSelections();
          resetBirthSelections();
          setProfilePictureFile(null);
          setShowDropdown(false);
        }}
        title={t('editStudent', 'Edit Student')}
        size="2xl"
        height='xl'
        stickyFooter={true}
        footer={
          <div className="flex items-center justify-end space-x-3">
            <Button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setEditingStudent(null);
                setEditForm({
                  firstName: '',
                  lastName: '',
                  username: '',
                  email: '',
                  phone: '',
                  gender: '',
                  dateOfBirth: null,
                  nationality: '',
                  profilePicture: '',
                  residence: { provinceId: '', districtId: '', communeId: '', villageId: '' },
                  placeOfBirth: { provinceId: '', districtId: '', communeId: '', villageId: '' },
                });
                resetResidenceSelections();
                resetBirthSelections();
                setProfilePictureFile(null);
                setShowDropdown(false);
              }}
              variant="outline"
              disabled={loading}
            >
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              form="edit-student-form"
              variant="primary"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? t('updating', 'Updating...') : t('updateStudent', 'Update Student')}
            </Button>
          </div>
        }
      >
        <form id="edit-student-form" onSubmit={handleUpdateStudent} className="space-y-6">
          {/* Profile Picture Section */}
          <div className="">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('profilePicture', 'Profile Picture')}
            </label>
            
            {/* Profile Picture with Dropdown */}
            <div className="relative mb-4" ref={dropdownRef}>
              <div 
                className="relative inline-block cursor-pointer"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {profilePictureFile ? (
                  <img 
                    src={URL.createObjectURL(profilePictureFile)}
                    alt="Profile Preview" 
                    className="h-16 w-16 sm:h-20 sm:w-20 rounded-full object-cover border-2 border-gray-300 hover:border-blue-500 transition-colors"
                  />
                ) : (
                  <ProfileImage
                    user={{ profile_picture: editForm.profilePicture, firstName: editForm.firstName, lastName: editForm.lastName }}
                    size="lg"
                    alt="Profile"
                    className="hover:border-blue-500 transition-colors"
                    borderColor="border-gray-300"
                    fallbackType="image"
                    clickable={true}
                  />
                )}
              </div>

              {/* Dropdown Menu */}
              {showDropdown && (
                <div className="absolute z-10 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200">
                  <div className="py-1">
                    {editForm.profilePicture && (
                      <Button
                        type="button"
                        onClick={handleViewPicture}
                        variant="ghost"
                        size="sm"
                        fullWidth
                        className="justify-start rounded-none"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {t('viewPicture') || 'View Picture'}
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={handleUploadClick}
                      variant="ghost"
                      size="sm"
                      fullWidth
                      className="justify-start rounded-none"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {t('uploadNewPicture') || 'Upload New Picture'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfilePictureChange}
              className="hidden"
            />
            
            {profilePictureFile && (
              <p className="mt-2 text-sm text-green-600 mb-4">
                {t('newPictureSelected') || 'New picture selected'}: {profilePictureFile.name}
              </p>
            )}
          </div>
          <div  className='border-t pt-4'>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <User2 className="inline w-5 h-5 mr-2" />
              {t('personalInformation', 'Personal Information')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('firstName', 'First Name')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="firstName"
                    value={editForm.firstName}
                    onChange={(e) => handleEditFormChange('firstName', e.target.value)}
                    className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    placeholder={t('enterFirstName', 'Enter first name')}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('lastName', 'Last Name')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="lastName"
                    value={editForm.lastName}
                    onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                    className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                    placeholder={t('enterLastName', 'Enter last name')}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('gender', 'Gender')}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <select
                    value={editForm.gender}
                    onChange={(e) => handleEditFormChange('gender', e.target.value)}
                    className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                  >
                  <option value="">{t('selectGender', 'Select gender')}</option>
                  <option value="MALE">{t('male', 'Male')}</option>
                  <option value="FEMALE">{t('female', 'Female')}</option>
                  <option value="OTHER">{t('other', 'Other')}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('dateOfBirth', 'Date of Birth')}
                </label>
                <DatePickerWithDropdowns
                  value={editForm.dateOfBirth}
                  onChange={(date) => handleEditFormChange('dateOfBirth', date)}
                  placeholder={t('pickDate', 'Pick a date')}
                />
              </div>
            </div>
          </div>
          
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
             
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                {t('username', 'Username')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="username"
                  value={editForm.username}
                  onChange={(e) => handleEditFormChange('username', e.target.value)}
                  className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                  placeholder={t('enterUsername', 'Enter username')}
                  required
                />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                {t('email', 'Email')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  value={editForm.email}
                  onChange={(e) => handleEditFormChange('email', e.target.value)}
                  className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                  placeholder={t('enterEmail', 'Enter email address')}
                />
              </div>
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                {t('phone', 'Phone')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="tel"
                  id="phone"
                  value={editForm.phone}
                  onChange={(e) => handleEditFormChange('phone', e.target.value)}
                  className="mt-1 block w-full pl-10 rounded-md shadow-sm text-sm transition-all duration-300 border border-gray-300 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 focus:scale-[1.01] hover:shadow-md"
                  placeholder={t('enterPhone', 'Enter phone number')}
                />
              </div>
            </div>
          </div>
          
          {/* Current Residence */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Building className="inline w-5 h-5 mr-2" />
              {t('currentResidence', 'Current Residence')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('province', 'Province')}
                </label>
                <Dropdown
                  options={getResidenceProvinceOptions()}
                  value={selectedResidenceProvince}
                  onValueChange={handleResidenceProvinceChange}
                  placeholder={t('selectProvince', 'Select Province')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={false}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('district', 'District')}
                </label>
                <Dropdown
                  options={getResidenceDistrictOptions()}
                  value={selectedResidenceDistrict}
                  onValueChange={handleResidenceDistrictChange}
                  placeholder={t('selectDistrict', 'Select District')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={!selectedResidenceProvince}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('commune', 'Commune')}
                </label>
                <Dropdown
                  options={getResidenceCommuneOptions()}
                  value={selectedResidenceCommune}
                  onValueChange={handleResidenceCommuneChange}
                  placeholder={t('selectCommune', 'Select Commune')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={!selectedResidenceDistrict}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('village', 'Village')}
                </label>
                <Dropdown
                  options={getResidenceVillageOptions()}
                  value={selectedResidenceVillage}
                  onValueChange={handleResidenceVillageChange}
                  placeholder={t('selectVillage', 'Select Village')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={!selectedResidenceCommune}
                />
              </div>
            </div>
          </div>
          
          {/* Place of Birth */}
          <div className="border-t pt-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              <Building className="inline w-5 h-5 mr-2" />
              {t('placeOfBirth', 'Place of Birth')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('province', 'Province')}
                </label>
                <Dropdown
                  options={getBirthProvinceOptions()}
                  value={selectedBirthProvince}
                  onValueChange={handleBirthProvinceChange}
                  placeholder={t('selectProvince', 'Select Province')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={false}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('district', 'District')}
                </label>
                <Dropdown
                  options={getBirthDistrictOptions()}
                  value={selectedBirthDistrict}
                  onValueChange={handleBirthDistrictChange}
                  placeholder={t('selectDistrict', 'Select District')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={!selectedBirthProvince}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('commune', 'Commune')}
                </label>
                <Dropdown
                  options={getBirthCommuneOptions()}
                  value={selectedBirthCommune}
                  onValueChange={handleBirthCommuneChange}
                  placeholder={t('selectCommune', 'Select Commune')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={!selectedBirthDistrict}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('village', 'Village')}
                </label>
                <Dropdown
                  options={getBirthVillageOptions()}
                  value={selectedBirthVillage}
                  onValueChange={handleBirthVillageChange}
                  placeholder={t('selectVillage', 'Select Village')}
                  contentClassName="max-h-[200px] overflow-y-auto"
                  disabled={!selectedBirthCommune}
                />
              </div>
            </div>
          </div>
        </form>
      </Modal>

      {/* Image Modal */}
      {showImageModal && editForm.profilePicture && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50" onClick={() => setShowImageModal(false)}>
          <div className="relative max-w-4xl max-h-full p-4">
            <Button
              onClick={() => setShowImageModal(false)}
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 text-white hover:text-gray-300 hover:bg-white/10 z-10"
            >
              <X className="w-6 h-6" />
            </Button>
            <img 
              src={editForm.profilePicture}
              alt="Profile" 
              className="max-w-full max-h-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </PageTransition>
  );
}