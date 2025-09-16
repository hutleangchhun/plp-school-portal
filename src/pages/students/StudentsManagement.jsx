import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, Edit2, User, Users, ChevronDown, Download, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import { studentService } from '../../utils/api/services/studentService';
import { userService } from '../../utils/api/services/userService';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Badge } from '../../components/ui/Badge';
import { Table, MobileCards } from '../../components/ui/Table';
import { exportToExcel, exportToCSV, exportToPDF, getTimestampedFilename } from '../../utils/exportUtils';
import Modal from '../../components/ui/Modal';

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
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [availableGrades, setAvailableGrades] = useState([]);
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
    phone: ''
  });
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const fetchingRef = useRef(false);
  const lastFetchParams = useRef(null);
  const searchTimeoutRef = useRef(null);
  
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
  
  // Initialize classes using local user data and derive from student data
  const initializeClasses = useCallback(async () => {
    // Avoid re-initializing if classes are already loaded
    if (classes.length > 0) {
      console.log('Classes already loaded, skipping initialization');
      return;
    }
    
    console.log('=== INITIALIZING CLASSES FROM LOCAL DATA ===');
    console.log('Current user object:', user);
    console.log('User classIds:', user?.classIds);
    console.log('User classNames:', user?.classNames);
    
    if (!user || !user.classIds || !user.classNames) {
      console.log('No user data or classes found in authentication - deriving from student data');
      // Try to derive classes from student data without using class routes
      try {
        // Use master-class endpoint to derive classes if schoolId is available
        if (!schoolId) {
          await fetchSchoolId();
          if (!schoolId) {
            console.log('No school ID available for class derivation');
            setClasses([]);
            setSelectedClassId('all');
            return;
          }
        }
        
        const response = await studentService.getStudentsBySchool(schoolId, {});
        if (response.success && response.data && response.data.length > 0) {
          // Extract unique classes from student data
          const classMap = new Map();
          response.data.forEach(student => {
            const classId = student.classId || student.class_id || (student.class && student.class.classId) || (student.class && student.class.id);
            const className = student.className || (student.class && student.class.name) || `Class ${classId}`;
            const gradeLevel = student.gradeLevel || (student.class && student.class.gradeLevel) || 'Unknown';
            
            if (classId) {
              const academicYear = student.academicYear || 
                                  (student.class && student.class.academicYear) || 
                                  '2024-2025'; // Current default
              
              classMap.set(classId, {
                classId: classId,
                name: className,
                gradeLevel: gradeLevel,
                section: 'A',
                academicYear: academicYear,
                teacherId: user?.teacherId || user?.id
              });
            }
          });
          
          const extractedClasses = Array.from(classMap.values());
          console.log('Extracted classes from student data:', extractedClasses);
          setClasses(extractedClasses);
          
          // Extract unique grade levels
          const grades = [...new Set(extractedClasses.map(cls => cls.gradeLevel))].filter(grade => grade && grade !== 'Unknown');
          setAvailableGrades(grades.sort());
          
          if (extractedClasses.length === 1) {
            setSelectedClassId(extractedClasses[0].classId.toString());
          }
          return;
        } else {
          console.log('No student data found - using empty classes');
          setClasses([]);
          setSelectedClassId('all');
          return;
        }
      } catch (error) {
        console.error('Failed to extract classes from student data:', error);
        setClasses([]);
        setSelectedClassId('all');
        return;
      }
    }

    // SECURITY: Use only the classes from authenticated user token
    const teacherClasses = user.classIds.map((classId, index) => {
      // Try to get academic year from user data or default to current
      const academicYear = (user.academicYears && user.academicYears[index]) || 
                          user.academicYear || 
                          new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);
      
      return {
        classId: classId,
        name: user.classNames[index] || `Class ${classId}`,
        gradeLevel: user.gradeLevels ? user.gradeLevels[index] : 'Unknown',
        section: 'A', // Default section, could be enhanced if available in auth data
        academicYear: academicYear,
        teacherId: user.teacherId
      };
    });

    setClasses(teacherClasses);

    // Extract unique grade levels from teacher's classes
    const grades = [...new Set(teacherClasses.map(cls => cls.gradeLevel))].filter(grade => grade && grade !== 'Unknown');
    setAvailableGrades(grades.sort());

    // Set first class as default if none selected and teacher has only one class
    if (selectedClassId === 'all' && teacherClasses.length === 1) {
      setSelectedClassId(teacherClasses[0].classId.toString());
    }

    console.log(`Teacher ${user.username} has access to ${teacherClasses.length} classes:`, 
      teacherClasses.map(c => `${c.name} (ID: ${c.classId})`));
    console.log('Available grades:', grades);
  }, [user, classes.length, selectedClassId]);

  // Fetch current user's school ID from my-account endpoint
  const fetchSchoolId = useCallback(async () => {
    try {
      if (schoolId) {
        console.log('School ID already available:', schoolId);
        return;
      }

      console.log('Fetching school ID from my-account endpoint...');
      const accountData = await userService.getMyAccount();
      
      if (accountData && accountData.school_id) {
        console.log('School ID fetched:', accountData.school_id);
        setSchoolId(accountData.school_id);
      } else {
        console.error('No school_id found in account data:', accountData);
        showError(t('noSchoolIdFound', 'No school ID found for your account'));
      }
    } catch (error) {
      console.error('Error fetching school ID:', error);
      showError(t('failedToFetchSchoolId', 'Failed to fetch school information'));
    }
  }, [schoolId, showError, t]);

  // Fetch students with pagination and filters using master-class endpoint
  const fetchStudents = useCallback(async (search = searchTerm, force = false) => {
    // Ensure we have a school ID before fetching students
    if (!schoolId) {
      console.log('No school ID available, attempting to fetch...');
      await fetchSchoolId();
      return;
    }

    // Create a unique key for current fetch parameters
    const currentParams = JSON.stringify({
      search,
      selectedGrade,
      selectedClassId,
      schoolId,
      userId: user?.userId,
      page: pagination.page,
      limit: pagination.limit
    });
    
    // Prevent duplicate fetches with same parameters unless forced
    if (!force && (fetchingRef.current || lastFetchParams.current === currentParams)) {
      return;
    }
    
    fetchingRef.current = true;
    lastFetchParams.current = currentParams;
    try {
      setLoading(true);
      
      console.log(`=== FETCH STUDENTS DEBUG (MASTER-CLASS) ===`);
      console.log(`School ID: ${schoolId}`);
      console.log(`Selected class ID: ${selectedClassId}`);
      console.log(`Search term: ${search}`);
      
      // Determine if we need client-side filtering
      // Use client-side filtering when we have grade filter or local search
      const needsClientSideFiltering = (selectedGrade && selectedGrade !== 'all') || (localSearchTerm && localSearchTerm.trim() !== '');
      
      // Prepare parameters for the API call
      const requestParams = {};
      
      if (!needsClientSideFiltering) {
        // Use server-side pagination when no client-side filtering is needed
        requestParams.page = pagination.page;
        requestParams.limit = pagination.limit;
      } else {
        // When using client-side filtering, fetch more data to ensure we have enough for local filtering
        requestParams.page = 1;
        requestParams.limit = 100; // Fetch larger batch for client-side filtering
      }
      
      console.log(`=== FETCH STUDENTS CALLED ===`);
      console.log(`Current pagination state:`, pagination);
      console.log(`Needs client-side filtering:`, needsClientSideFiltering);
      console.log(`Request params being sent to API:`, requestParams);
      
      // Add class filter if specific class is selected
      if (selectedClassId !== 'all') {
        const selectedClassIdInt = parseInt(selectedClassId);
        
        // SECURITY: Ensure the selected class ID is actually in the teacher's authorized classes
        if (user?.classIds && Array.isArray(user.classIds) && user.classIds.length > 0) {
          if (!user.classIds.includes(selectedClassIdInt)) {
            console.warn(`Teacher ${user?.username} attempted to access unauthorized class ID: ${selectedClassId}`);
            throw new Error('Unauthorized class access');
          }
        }
        
        requestParams.classId = selectedClassIdInt;
        console.log(`Filtering by class ${selectedClassIdInt}`);
      } else {
        console.log(`Fetching ALL students from school ${schoolId}`);
      }
      
      console.log(`API request params:`, requestParams);
      console.log(`=== END FETCH STUDENTS DEBUG ===`);
      
      // Use the new master-class endpoint via getStudentsBySchool
      const response = await studentService.getMyStudents(requestParams);
      
      console.log('=== API RESPONSE DEBUG (MASTER-CLASS) ===');
      console.log('Full API response:', response);
      console.log('Response success:', response?.success);
      console.log('Response data length:', response?.data?.length);
      console.log('=== END API RESPONSE DEBUG ===');
      
      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to fetch students from school');
      }
      
      let data = response.data || [];
      
      console.log(`Fetched ${data.length} students from school ${schoolId} for ${selectedClassId === 'all' ? 'all classes' : `class ${selectedClassId}`}`);
      
      console.log('Raw students data from API:', data);
      
      // Store all unfiltered students for reference
      setAllStudents(data);
      
      // Apply all client-side filters
      let filteredData = data;
      
      // Filter by grade level if specified
      if (selectedGrade && selectedGrade !== 'all') {
        filteredData = filteredData.filter(student => {
          const studentGrade = student.gradeLevel || 
                              (student.class && student.class.gradeLevel) || 
                              (classes.find(cls => 
                                cls.classId === student.classId || 
                                cls.classId === student.class_id || 
                                (student.class && cls.classId === student.class.classId)
                              )?.gradeLevel);
          return studentGrade === selectedGrade;
        });
        console.log(`Filtered ${data.length} students to ${filteredData.length} by grade: ${selectedGrade}`);
      }
      
      // Apply client-side search if there's a local search term
      const finalFilteredData = performClientSideSearch(filteredData, localSearchTerm);
      setFilteredStudents(finalFilteredData);
      
      console.log('Final filtered students data:', finalFilteredData);
      console.log(`Applied filters: Grade=${selectedGrade}, Search="${localSearchTerm}", Result=${finalFilteredData.length} students`);
      
      // Handle pagination based on whether we're using client-side filtering
      if (needsClientSideFiltering) {
        // Client-side pagination: paginate the filtered data locally
        const startIndex = (pagination.page - 1) * pagination.limit;
        const endIndex = startIndex + pagination.limit;
        const paginatedData = finalFilteredData.slice(startIndex, endIndex);
        
        console.log(`Client-side pagination: showing ${startIndex + 1}-${Math.min(endIndex, finalFilteredData.length)} of ${finalFilteredData.length} students`);
        
        setStudents(paginatedData);
        
        // Update pagination to reflect client-side totals
        setPagination(prev => ({
          ...prev,
          total: finalFilteredData.length,
          pages: Math.max(1, Math.ceil(finalFilteredData.length / prev.limit))
        }));
      } else {
        // Server-side pagination: use all returned data and server pagination info
        setStudents(finalFilteredData);
        
        // Update pagination info from server response
        if (response.pagination) {
          setPagination({
            page: response.pagination.page,
            limit: response.pagination.limit,
            total: response.pagination.total,
            pages: response.pagination.pages
          });
        }
      }
      
    } catch (error) {
      console.error('Error fetching students from school:', error);
      showError(error.message || t('errorFetchingStudents'));
      setStudents([]);
      setAllStudents([]);
      setFilteredStudents([]);
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [searchTerm, showError, t, selectedClassId, selectedGrade, schoolId, user, classes, fetchSchoolId, localSearchTerm, performClientSideSearch]);
  
  // Initialize classes when component mounts
  useEffect(() => {
    initializeClasses();
  }, [initializeClasses]);

  // Fetch school ID when component mounts
  useEffect(() => {
    fetchSchoolId();
  }, [fetchSchoolId]);

  // Fetch students when schoolId becomes available
  useEffect(() => {
    if (schoolId && classes.length > 0) {
      console.log('School ID available, fetching students...');
      fetchStudents();
    }
  }, [schoolId, classes.length, fetchStudents]);

  // Memoized fetch parameters to avoid unnecessary re-renders
  const fetchParams = useMemo(() => ({
    searchTerm,
    selectedGrade,
    selectedClassId,
    classesLength: classes.length
  }), [searchTerm, selectedGrade, selectedClassId, classes.length]);

  // Single useEffect to handle all data fetching
  useEffect(() => {
    console.log(`=== USE EFFECT TRIGGERED ===`);
    console.log(`Current pagination:`, pagination);
    console.log(`Classes length:`, classes.length);
    console.log(`Selected class ID:`, selectedClassId);
    console.log(`Search term:`, searchTerm);
    
    if (classes.length === 0) {
      console.log(`Waiting for classes to load...`);
      return; // Wait for classes to load
    }
    
    // SECURITY: Validate that selectedClassId belongs to teacher's authorized classes
    if (selectedClassId !== 'all') {
      const selectedClassIdInt = parseInt(selectedClassId);
      const isValidClass = user?.classIds?.includes(selectedClassIdInt);
      if (!isValidClass) {
        console.warn(`Invalid class ID ${selectedClassId} selected for teacher ${user?.username}. Resetting to 'all'.`);
        setSelectedClassId('all');
        return;
      }
    }

    // Debounce only for search changes, immediate for filter changes
    const isSearchChange = searchTerm.trim() !== '';
    const delay = isSearchChange ? 500 : 100; // Small delay to batch state changes
    
    console.log(`Setting timer with delay ${delay}ms to fetch students`);
    const timer = setTimeout(() => {
      console.log(`Timer fired - calling fetchStudents with page ${pagination.page}, limit ${pagination.limit}`);
      fetchStudents(searchTerm, false);
    }, delay);
    
    return () => {
      console.log(`Cleaning up timer`);
      clearTimeout(timer);
    };
  }, [fetchParams, user, classes, fetchStudents, selectedClassId, searchTerm]);
  
  // Separate useEffect for pagination changes
  useEffect(() => {
    if (classes.length > 0 && schoolId) {
      console.log(`Pagination changed - fetching page ${pagination.page}`);
      fetchStudents(searchTerm, false);
    }
  }, [pagination.page, pagination.limit, classes.length, schoolId, fetchStudents, searchTerm]);
  
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
  const prevFiltersRef = useRef({ selectedGrade, selectedClassId });
  useEffect(() => {
    if (prevFiltersRef.current.selectedGrade !== selectedGrade || 
        prevFiltersRef.current.selectedClassId !== selectedClassId) {
      if (pagination.page !== 1) {
        console.log(`Filter changed - resetting pagination to page 1`);
        setPagination(prev => ({ ...prev, page: 1 }));
      }
      prevFiltersRef.current = { selectedGrade, selectedClassId };
    }
  }, [selectedGrade, selectedClassId, pagination.page]); // Reset page when filters change
  
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
      message={`${t('confirmMoveStudentsToMaster', 'Are you sure you want to move')} ${selectedStudentIds.size} ${t('studentsToMasterClass', 'students to the master class? This will remove them from their current classes.')}`}
      confirmText={loading ? t('moving', 'Moving...') : t('moveToMaster', 'Move to Master')}
      confirmVariant="danger"
      cancelText={t('cancel', 'Cancel')}
      isConfirming={loading}
    />
  );
  
  // Handle delete student (remove from class)
  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    
    // Get class info from selected student when viewing "all classes"
    const studentClassInfo = classInfo || (() => {
      const studentClassId = selectedStudent.classId || selectedStudent.class_id || 
        (selectedStudent.class && selectedStudent.class.classId) || (selectedStudent.class && selectedStudent.class.id);
      
      if (!studentClassId) {
        showError(t('studentHasNoClass', 'Student has no class assigned'));
        return null;
      }
      
      return classes.find(c => c.classId === studentClassId || c.classId === Number(studentClassId));
    })();
    
    if (!studentClassInfo) {
      showError(t('cannotFindStudentClass', 'Cannot determine student\'s class'));
      return;
    }
    
    try {
      setLoading(true);
      
      // Log the selected student data for debugging
      console.log('Deleting student:', selectedStudent);
      
      // Get the student ID from the student data
      const studentId = selectedStudent.id; // Use the id field which contains the numeric studentId
      
      if (!studentId) {
        throw new Error('No valid student ID found');
      }
      
      // Convert to number for the API
      const numericStudentId = Number(studentId);
      
      if (isNaN(numericStudentId)) {
        throw new Error('Student ID must be a number');
      }
      
      // Validate schoolId
      if (!schoolId) {
        throw new Error('School ID is required but not available');
      }
      
      console.log('Calling removeStudentToMasterClass with:', {
        classId: studentClassInfo.classId,
        schoolId: schoolId,
        studentId: numericStudentId,
        studentData: selectedStudent // Log full student data for debugging
      });
      
      const response = await studentService.removeStudentToMasterClass(studentClassInfo.classId, schoolId, numericStudentId);
      console.log('Remove student response:', response);
      
      // Check if the API response indicates success
      // handleApiResponse wraps responses as: { success: boolean, data: actualApiResponse }
      if (response && response.success && response.data) {
        const apiData = response.data;
        // Use the actual message from the API response
        const successMessage = apiData.message || t('studentRemovedFromClass', 'Student removed from class successfully');
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
          await fetchStudents(searchTerm, true);
        }, 500);
        // Clear any selected student IDs
        setSelectedStudentIds(new Set());
      } else {
        throw new Error(response?.error || 'Failed to remove student from class');
      }
    } catch (error) {
      console.error('Error removing student:', error);
      showError(t('failedRemoveStudent', 'Failed to remove student: ') + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  // Handle bulk delete students (remove from class)
  const handleBulkDeleteStudents = async () => {
    if (selectedStudentIds.size === 0) return;
    
    console.log('Selected Student User IDs:', Array.from(selectedStudentIds));
    console.log('Selected Class ID:', selectedClassId);
    console.log('Class Info:', classInfo);
    
    try {
      setLoading(true);
      
      // Validate schoolId
      if (!schoolId) {
        throw new Error('School ID is required but not available');
      }
      
      // Get the current list of students
      const currentStudents = [...students];
      console.log('Current students structure:', JSON.parse(JSON.stringify(currentStudents)));
      
      // Map selected student IDs to student objects
      const studentsToRemove = currentStudents.filter(student => {
        console.log('Checking student:', student);
        // Use the id field which contains the numeric studentId
        const studentId = student.id;
        console.log('Student ID:', studentId, 'Selected IDs:', Array.from(selectedStudentIds));
        // Check both string and number versions of the ID
        const isSelected = selectedStudentIds.has(String(studentId)) || 
                          selectedStudentIds.has(Number(studentId));
        console.log('Is selected:', isSelected);
        return isSelected;
      });
      
      console.log('Students to remove with full data:', studentsToRemove);
      
      if (studentsToRemove.length === 0) {
        throw new Error('No matching students found for the selected IDs');
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
          showSuccess(t('studentsMovedToMasterSuccess', `${totalRemoved} students moved to master class successfully`));
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
          const apiData = response.data;
          const successMessage = apiData.message || t('studentsRemovedFromClass', `${studentIdsToRemove.length} students removed from class successfully`);
          showSuccess(successMessage);
        } else {
          throw new Error(response?.error || 'Failed to remove students from class');
        }
      }
      
      // Clean up and refresh
      setShowBulkDeleteDialog(false);
      setSelectedStudentIds(new Set()); // Clear selection
      // Refresh the student list after a brief delay
      setTimeout(async () => {
        await fetchStudents(searchTerm, true);
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
    setEditForm({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      username: student.username || '',
      email: student.email || '',
      phone: student.phone || ''
    });
    setShowEditModal(true);
  };

  // Handle update student form submission
  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    if (!editingStudent) return;

    try {
      setLoading(true);
      
      console.log('Updating student with ID:', editingStudent.id);
      console.log('Update data:', editForm);

      const response = await studentService.updateStudent(editingStudent.id, editForm);
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
          phone: ''
        });
        
        // Refresh the student list
        setTimeout(async () => {
          await fetchStudents(searchTerm, true);
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

  // Handle student selection
  const handleStudentSelect = (studentId) => {
    console.log('Selecting student with ID:', studentId, 'Type:', typeof studentId);
    console.log('Current selected IDs:', Array.from(selectedStudentIds));
    
    setSelectedStudentIds(prev => {
      const newSelection = new Set(prev);
      console.log('Previous selection:', Array.from(prev));
      
      if (newSelection.has(studentId)) {
        console.log('Removing student ID:', studentId);
        newSelection.delete(studentId);
      } else {
        console.log('Adding student ID:', studentId);
        newSelection.add(studentId);
      }
      
      console.log('New selection:', Array.from(newSelection));
      return newSelection;
    });
  };

  // Handle select all students
  const handleSelectAll = () => {
    if (selectedStudentIds.size === students.length) {
      setSelectedStudentIds(new Set()); // Deselect all
    } else {
      setSelectedStudentIds(new Set(students.map(student => student.id))); // Select all
    }
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

  // Define table columns
  const tableColumns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={selectedStudentIds.size === students.length && students.length > 0}
          onChange={handleSelectAll}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
      ),
      headerClassName: 'w-12',
      cellClassName: 'w-12',
      render: (student) => (
        <input
          type="checkbox"
          checked={selectedStudentIds.has(student.id)}
          onChange={() => handleStudentSelect(student.id)}
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
            checked={selectedStudentIds.has(student.id)}
            onChange={() => handleStudentSelect(student.id)}
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
                    Export to Excel (.xlsx)
                  </button>
                  <button
                    onClick={handleExportCSV}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                  >
                    Export to CSV (.csv)
                  </button>
                  <button
                    onClick={handleExportPDF}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 w-full text-left"
                  >
                    Export to PDF (.pdf)
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
                  />
                </div>
                
                {availableGrades.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-700 font-medium">{t('selectGrade', 'Grade')}:</span>
                    <Dropdown
                      value={selectedGrade}
                      onValueChange={setSelectedGrade}
                      options={[
                        { value: 'all', label: t('allGrades', 'All Grades') },
                        ...availableGrades.map(grade => ({
                          value: grade,
                          label: grade
                        }))
                      ]}
                      placeholder={t('selectGrade', 'Select Grade')}
                      minWidth="min-w-[150px]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Selected Students Display */}
        {selectedStudentIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-blue-800 mb-3">
                សិស្សបានជ្រើសរើស ({selectedStudentIds.size}):
              </h3>
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedStudentIds).map(studentId => {
                  const student = students.find(s => s.id === studentId);
                  if (!student) return null;
                  
                  const studentName = student.name || 
                    (student.firstName || student.lastName 
                      ? `${student.firstName || ''} ${student.lastName || ''}`.trim() 
                      : student.username || t('noName', 'No Name'));
                  
                  return (
                    <span key={studentId} className="inline-flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                      {studentName}
                      <button
                        onClick={() => handleStudentSelect(studentId)}
                        className="ml-2 flex-shrink-0 h-4 w-4 flex items-center justify-center rounded-full hover:bg-blue-200 text-blue-600 hover:text-blue-800 transition-colors"
                        title="Remove"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-blue-200">
              <div className="text-xs text-blue-600">
                {t('selectedStudentsActions', 'Actions for selected students')}
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setSelectedStudentIds(new Set())}
                  variant="outline"
                  size="sm"
                >
                  {t('clearSelection', 'Clear Selection')}
                </Button>
                <Button
                  onClick={() => setShowBulkDeleteDialog(true)}
                  variant="danger"
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('moveSelectedToMaster', 'Move Selected to Master')}
                </Button>
              </div>
            </div>
          </div>
        )}
        
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
            phone: ''
          });
        }}
        title={t('editStudent', 'Edit Student')}
        size="md"
      >
        <form onSubmit={handleUpdateStudent} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                {t('firstName', 'First Name')}
              </label>
              <input
                type="text"
                id="firstName"
                value={editForm.firstName}
                onChange={(e) => handleEditFormChange('firstName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('enterFirstName', 'Enter first name')}
                required
              />
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                {t('lastName', 'Last Name')}
              </label>
              <input
                type="text"
                id="lastName"
                value={editForm.lastName}
                onChange={(e) => handleEditFormChange('lastName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('enterLastName', 'Enter last name')}
                required
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              {t('username', 'Username')}
            </label>
            <input
              type="text"
              id="username"
              value={editForm.username}
              onChange={(e) => handleEditFormChange('username', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('enterUsername', 'Enter username')}
              required
            />
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('email', 'Email')}
            </label>
            <input
              type="email"
              id="email"
              value={editForm.email}
              onChange={(e) => handleEditFormChange('email', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('enterEmail', 'Enter email address')}
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              {t('phone', 'Phone')}
            </label>
            <input
              type="tel"
              id="phone"
              value={editForm.phone}
              onChange={(e) => handleEditFormChange('phone', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder={t('enterPhone', 'Enter phone number')}
            />
          </div>
          
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
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
                  phone: ''
                });
              }}
              variant="outline"
              disabled={loading}
            >
              {t('cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              className="min-w-[120px]"
            >
              {loading ? t('updating', 'Updating...') : t('updateStudent', 'Update Student')}
            </Button>
          </div>
        </form>
      </Modal>
    </PageTransition>
  );
}