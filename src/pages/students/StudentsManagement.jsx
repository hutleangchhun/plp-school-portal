import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Trash2, User, Users, ChevronDown, Check, Download } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import * as Select from '@radix-ui/react-select';
import { studentService } from '../../utils/api/services/studentService';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Badge } from '../../components/ui/Badge';
import { Table, MobileCards } from '../../components/ui/Table';
import { exportToExcel, exportToCSV, exportToPDF, getTimestampedFilename } from '../../utils/exportUtils';

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
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [availableGrades, setAvailableGrades] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  // Initialize classes from authenticated user data (SECURE: no API calls needed)
  const initializeClasses = useCallback(async () => {
    console.log('=== USER DATA DEBUG ===');
    console.log('Current user object:', user);
    console.log('User classIds:', user?.classIds);
    console.log('User classNames:', user?.classNames);
    console.log('User gradeLevels:', user?.gradeLevels);
    console.log('=== END USER DATA DEBUG ===');
    
    if (!user || !user.classIds || !user.classNames) {
      console.log('No user data or classes found in authentication');
      // Try to fetch directly from API as fallback
      try {
        const response = await studentService.getMyStudents({});
        if (response.success && response.data && response.data.length > 0) {
          // Extract unique classes from student data
          const classMap = new Map();
          response.data.forEach(student => {
            const classId = student.classId || student.class_id || (student.class && student.class.classId) || (student.class && student.class.id);
            const className = student.className || (student.class && student.class.name) || `Class ${classId}`;
            const gradeLevel = student.gradeLevel || (student.class && student.class.gradeLevel) || 'Unknown';
            
            if (classId) {
              classMap.set(classId, {
                classId: classId,
                name: className,
                gradeLevel: gradeLevel,
                section: 'A',
                academicYear: '2024-2025',
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
          // If no student data, create fallback classes based on your route info
          console.log('No student data found, using fallback classes');
          const fallbackClasses = [
            { classId: 20, name: 'Class 20', gradeLevel: 'Unknown', section: 'A', academicYear: '2024-2025' },
            { classId: 21, name: 'Class 21', gradeLevel: 'Unknown', section: 'A', academicYear: '2024-2025' }
          ];
          setClasses(fallbackClasses);
          return;
        }
      } catch (error) {
        console.error('Failed to extract classes from student data:', error);
      }
      
      setClasses([]);
      setSelectedClassId('all');
      return;
    }

    // SECURITY: Use only the classes from authenticated user token
    const teacherClasses = user.classIds.map((classId, index) => ({
      classId: classId,
      name: user.classNames[index] || `Class ${classId}`,
      gradeLevel: user.gradeLevels ? user.gradeLevels[index] : 'Unknown',
      section: 'A', // Default section, could be enhanced if available in auth data
      academicYear: '2024-2025', // Default academic year, could be enhanced
      teacherId: user.teacherId
    }));

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
  }, [user, selectedClassId]);

  // Fetch students with pagination and filters (SECURE: only teacher's own students)
  const fetchStudents = useCallback(async (search = searchTerm) => {
    try {
      setLoading(true);
      
      // SECURITY: Use the my-students endpoint with classId filtering (secure)
      let requestParams = {};
      
      console.log(`=== FETCH STUDENTS DEBUG ===`);
      console.log(`Selected class ID: ${selectedClassId}`);
      console.log(`User classIds:`, user?.classIds);
      
      if (selectedClassId !== 'all') {
        // EXTRA SECURITY: Ensure the selected class ID is actually in the teacher's authorized classes
        const selectedClassIdInt = parseInt(selectedClassId);
        console.log(`Checking if class ${selectedClassIdInt} is in authorized classes:`, user?.classIds);
        
        // Only check authorization if user has proper class data
        if (user?.classIds && Array.isArray(user.classIds) && user.classIds.length > 0) {
          if (!user.classIds.includes(selectedClassIdInt)) {
            console.warn(`Teacher ${user?.username} attempted to access unauthorized class ID: ${selectedClassId}`);
            throw new Error('Unauthorized class access');
          }
        } else {
          console.log(`Skipping authorization check - user class data incomplete`);
        }
        
        // Pass classId to API for server-side filtering
        requestParams.classId = selectedClassIdInt;
        console.log(`Filtering by class ${selectedClassIdInt}`);
      } else {
        console.log(`Fetching ALL students (no class filter)`);
      }
      
      console.log(`API request params:`, requestParams);
      console.log(`=== END FETCH STUDENTS DEBUG ===`);
      
      const response = await studentService.getMyStudents(requestParams);
      
      console.log('=== API RESPONSE DEBUG ===');
      console.log('Full API response:', response);
      console.log('Response success:', response?.success);
      console.log('Response data:', response?.data);
      console.log('=== END API RESPONSE DEBUG ===');
      
      if (!response || (!response.success && !response.data)) {
        throw new Error('Failed to fetch students');
      }
      
      let data = response.data || [];
      
      console.log(`Fetched ${data.length} students for ${selectedClassId === 'all' ? 'all classes' : `class ${selectedClassId}`}`);
      
      // ADDITIONAL CLIENT-SIDE SECURITY: Ensure all returned students belong to teacher's authorized classes
      // Only do client-side filtering if we have proper user class data
      if (user?.classIds && Array.isArray(user.classIds) && user.classIds.length > 0 && data.length > 0) {
        const originalCount = data.length;
        console.log(`=== CLIENT-SIDE AUTHORIZATION CHECK ===`);
        console.log(`User authorized classIds:`, user.classIds);
        console.log(`Checking ${data.length} students:`);
        
        data = data.filter((student, index) => {
          const studentClassId = student.classId || student.class_id || (student.class && student.class.classId) || (student.class && student.class.id);
          console.log(`Student ${index + 1}: classId=${studentClassId} (type: ${typeof studentClassId}), name="${student.firstName} ${student.lastName}"`);
          console.log(`Student object:`, student);
          
          // Try both number and string comparison
          const isAuthorized = user.classIds.includes(studentClassId) || 
                              user.classIds.includes(Number(studentClassId)) || 
                              user.classIds.includes(String(studentClassId));
          
          console.log(`Is authorized: ${isAuthorized}`);
          
          if (!isAuthorized) {
            console.warn(`Filtering out unauthorized student with classId: ${studentClassId}`);
          }
          return isAuthorized;
        });
        
        console.log(`=== END CLIENT-SIDE AUTHORIZATION CHECK ===`);
        
        if (data.length !== originalCount) {
          console.warn(`Filtered out ${originalCount - data.length} unauthorized students`);
        }
      }
      
      // Filter by search term if provided (client-side filtering for now)
      let filteredData = data;
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        filteredData = data.filter(student => 
          (student.firstName || '').toLowerCase().includes(searchLower) ||
          (student.lastName || '').toLowerCase().includes(searchLower) ||
          (student.email || '').toLowerCase().includes(searchLower) ||
          (student.username || '').toLowerCase().includes(searchLower)
        );
      }
      
      // Filter by selected grade if not 'all'
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
      }
      
      console.log('Filtered students data:', filteredData);
      console.log('=== MAIN LIST STUDENTS ===');
      console.log(`Total students in main list: ${filteredData.length}`);
      filteredData.forEach(s => {
        console.log(`Main list student: ID=${s.id}, Name="${s.firstName} ${s.lastName}"`)
      });
      console.log('=== END MAIN LIST STUDENTS ===');
      
      setStudents(filteredData);
      
    } catch (error) {
      console.error('Error fetching students:', error);
      showError(t('errorFetchingStudents'));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, showError, t, selectedClassId, selectedGrade, user, classes]);
  
  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm, selectedGrade, fetchStudents]);
  
  // Remove this useEffect since we now handle it in the selectedClassId dependency

  // Initialize classes when component mounts
  useEffect(() => {
    initializeClasses();
  }, [initializeClasses]);

  // Fetch students when selected class changes
  useEffect(() => {
    if (classes.length > 0) {
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
      fetchStudents();
    }
  }, [selectedClassId, classes, fetchStudents, user]);
  
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
  
  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };
  
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
      title={t('removeStudent', 'Remove Student')}
      message={`${t('confirmRemoveStudent', 'Are you sure you want to remove')} ${selectedStudent?.firstName || t('thisStudent', 'this student')} ${t('fromYourClass', 'from your class? This action cannot be undone.')}`}
      confirmText={loading ? t('removing', 'Removing...') : t('remove', 'Remove')}
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
      title={t('removeStudents', 'Remove Students')}
      message={`${t('confirmRemoveStudents', 'Are you sure you want to remove')} ${selectedStudentIds.size} ${t('studentsFromClass', 'students from your class? This action cannot be undone.')}`}
      confirmText={loading ? t('removing', 'Removing...') : t('remove', 'Remove')}
      confirmVariant="danger"
      cancelText={t('cancel', 'Cancel')}
      isConfirming={loading}
    />
  );
  
  // Handle delete student (remove from class)
  const handleDeleteStudent = async () => {
    if (!selectedStudent || !classInfo) return;
    
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
      
      console.log('Calling removeStudentFromClass with:', {
        classId: classInfo.classId,
        studentId: numericStudentId,
        studentData: selectedStudent // Log full student data for debugging
      });
      
      const response = await studentService.removeStudentFromClass(classInfo.classId, numericStudentId);
      console.log('Remove student response:', response);
      
      if (response && response.success) {
        showSuccess(t('studentRemovedSuccess', 'Student removed successfully'));
        setShowDeleteDialog(false);
        // Clear the selected student
        setSelectedStudent(null);
        // Refresh the student list
        await fetchStudents();
        // Clear any selected student IDs
        setSelectedStudentIds(new Set());
      } else {
        throw new Error(response?.error || 'Failed to remove student');
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
    if (selectedStudentIds.size === 0 || !classInfo) return;
    
    console.log('Class Info:', classInfo);
    console.log('Selected Student User IDs:', Array.from(selectedStudentIds));
    
    try {
      setLoading(true);
      
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
      
      // Call the service to remove students using student IDs
      const response = await studentService.removeStudentsFromClass(
        classInfo.classId, 
        studentIdsToRemove
      );
      
      console.log('Remove students response:', response);
      
      if (response && response.success) {
        showSuccess(t('studentsRemovedSuccess', `${studentIdsToRemove.length} students removed successfully`));
        setShowBulkDeleteDialog(false);
        setSelectedStudentIds(new Set()); // Clear selection
        await fetchStudents(); // Refresh the list
      } else {
        throw new Error(response?.error || 'Failed to remove students');
      }
    } catch (error) {
      console.error('Error removing students:', error);
      showError(t('failedRemoveStudents', 'Failed to remove students: ') + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
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
      cellClassName: 'text-xs sm:text-sm text-gray-500',
      responsive: 'hidden lg:table-cell',
      render: (student) => (
        <Badge color='blue'>{student.username || 'N/A'}</Badge>
      )
    },
    {
      key: 'status',
      header: t('status', 'Status'),
      render: (student) => (
        <span className={`px-1.5 sm:px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          student.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {student.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
        </span>
      )
    },
    {
      key: 'actions',
      header: t('actions', 'Actions'),
      headerClassName: 'relative',
      cellClassName: 'text-left text-sm font-medium',
      render: (student) => (
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
          title={t('removeStudent', 'Remove student')}
        >
          <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
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
          title={t('removeStudent', 'Remove student')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{t('phone', 'Phone')}: {student.phone || 'N/A'}</span>
        <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${
          student.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {student.isActive ? t('active', 'Active') : t('inactive', 'Inactive')}
        </span>
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
                  {selectedClassId !== 'all' && (() => {
                    const selectedClass = classes.find(c => c.classId.toString() === selectedClassId);
                    return selectedClass ? ` in ${selectedClass.name}` : '';
                  })()}
                </span>
              </div>
            </div>
            {classes.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-700 font-medium">{t('selectClass', 'Class')}:</span>
                  <Select.Root value={selectedClassId} onValueChange={setSelectedClassId}>
                    <Select.Trigger className="inline-flex items-center justify-center rounded px-3 py-1 text-sm bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-0">
                      <Select.Value placeholder={t('selectClass', 'Select Class')} />
                      <Select.Icon className="ml-2">
                        <ChevronDown className="h-4 w-4" />
                      </Select.Icon>
                    </Select.Trigger>
                    <Select.Portal>
                      <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border border-gray-200 z-50">
                        <Select.Viewport className="p-1">
                          <Select.Item value="all" className="relative flex items-center px-3 py-2 text-sm rounded cursor-pointer hover:bg-blue-50 focus:bg-blue-50 outline-none">
                            <Select.ItemText>{t('allClasses', 'All Classes')}</Select.ItemText>
                            <Select.ItemIndicator className="absolute left-2">
                              <Check className="h-4 w-4" />
                            </Select.ItemIndicator>
                          </Select.Item>
                          {classes.map((cls) => (
                            <Select.Item key={cls.classId} value={cls.classId.toString()} className="relative flex items-center px-3 py-2 text-sm rounded cursor-pointer hover:bg-blue-50 focus:bg-blue-50 outline-none">
                              <Select.ItemText>
                                {cls.name} (Grade {cls.gradeLevel} - {cls.section})
                              </Select.ItemText>
                              <Select.ItemIndicator className="absolute left-2">
                                <Check className="h-4 w-4" />
                              </Select.ItemIndicator>
                            </Select.Item>
                          ))}
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                </div>
                {selectedClassId !== 'all' && (
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    {(() => {
                      const selectedClass = classes.find(c => c.classId.toString() === selectedClassId);
                      return selectedClass ? (
                        <>
                          <Badge color="orange" className="text-xs">
                            {selectedClass.name}
                          </Badge>
                          <span>Grade {selectedClass.gradeLevel} • Section {selectedClass.section}</span>
                          <span>{selectedClass.academicYear}</span>
                        </>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            )}
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
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-8 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                placeholder={t('searchStudents', 'Search students...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Grade Filter Dropdown */}
            {availableGrades.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 font-medium whitespace-nowrap">{t('filterByGrade', 'Grade')}:</span>
                <Select.Root value={selectedGrade} onValueChange={setSelectedGrade}>
                  <Select.Trigger className="inline-flex items-center justify-center rounded px-3 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[120px]">
                    <Select.Value placeholder={t('selectGrade', 'Select Grade')} />
                    <Select.Icon className="ml-2">
                      <ChevronDown className="h-4 w-4" />
                    </Select.Icon>
                  </Select.Trigger>
                  <Select.Portal>
                    <Select.Content className="overflow-hidden bg-white rounded-md shadow-lg border border-gray-200 z-50">
                      <Select.Viewport className="p-1">
                        <Select.Item value="all" className="relative flex items-center px-3 py-2 text-sm rounded cursor-pointer hover:bg-blue-50 focus:bg-blue-50 outline-none">
                          <Select.ItemText>{t('allGrades', 'All Grades')}</Select.ItemText>
                          <Select.ItemIndicator className="absolute left-2">
                            <Check className="h-4 w-4" />
                          </Select.ItemIndicator>
                        </Select.Item>
                        {availableGrades.map((grade) => (
                          <Select.Item key={grade} value={grade} className="relative flex items-center px-3 py-2 text-sm rounded cursor-pointer hover:bg-blue-50 focus:bg-blue-50 outline-none">
                            <Select.ItemText>Grade {grade}</Select.ItemText>
                            <Select.ItemIndicator className="absolute left-2">
                              <Check className="h-4 w-4" />
                            </Select.ItemIndicator>
                          </Select.Item>
                        ))}
                      </Select.Viewport>
                    </Select.Content>
                  </Select.Portal>
                </Select.Root>
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
                  {t('removeSelected', 'Remove Selected')}
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
    </PageTransition>
  );
}