import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, User, Users, ChevronDown, Check, Download } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import Modal from '../../components/ui/Modal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import * as Select from '@radix-ui/react-select';
import { studentService } from '../../utils/api/services/studentService';
import { classService } from '../../utils/api/services/classService';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Badge } from '../../components/ui/Badge';
import { Table, MobileCards } from '../../components/ui/Table';
import { exportToExcel, exportToCSV, exportToPDF, getTimestampedFilename } from '../../utils/exportUtils';

export default function StudentsManagement() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  
  // State for students list and pagination
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  
  // State for class information
  const [classInfo, setClassInfo] = useState(null);
  
  // Other state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  
  // Fetch class information
  const fetchClassInfo = useCallback(async () => {
    try {
      const { data } = await classService.getMyClasses();
      console.log('Raw class data from API:', data);
      if (data && data.length > 0) {
        // Get the first class (assuming teacher teaches one class)
        console.log('Setting class info to:', data[0]);
        setClassInfo(data[0]);
      }
    } catch (error) {
      console.error('Error fetching class info:', error);
      // Don't show error toast for class info as it's not critical
    }
  }, []);

  // Fetch students with pagination and filters (only students in teacher's class)
  const fetchStudents = useCallback(async (search = searchTerm) => {
    if (!classInfo) return;
  
    try {
      setLoading(true);
      
      // First get the current class students
      const response = await studentService.getMyStudents();
      
      if (!response || !response.success) {
        throw new Error('Failed to fetch students');
      }
      
      const data = response.data || [];
      
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
  }, [searchTerm, showError, t, classInfo]);
  
  // Handle search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm, fetchStudents]);
  
  // Fetch students when component mounts
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Fetch class info when component mounts
  useEffect(() => {
    fetchClassInfo();
  }, [fetchClassInfo]);
  
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
  
  // Add Student Modal Component
  const AddStudentModal = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [availableStudents, setAvailableStudents] = useState([]);
    const [, setModalPagination] = useState({
      page: 1,
      limit: 10,
      total: 0,
      pages: 1
    });
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
    
    // Fetch available students with debounced search
    useEffect(() => {
      const timer = setTimeout(() => {
        fetchAvailableStudents(1, searchQuery);
      }, 500);
      
      return () => clearTimeout(timer);
    }, [searchQuery]);
    
    const fetchAvailableStudents = async (page = 1, search = '') => {
      try {
        setIsLoading(true);
        
        // First get the current class students
        const response = await studentService.getAvailableStudents(search, {
          page,
          limit: 10
        });
        
        if (response.data) {
          setAvailableStudents(response.data);
          setModalPagination({
            page: response.pagination.page,
            limit: response.pagination.limit,
            total: response.pagination.total,
            pages: response.pagination.pages
          });
        }
      } catch (error) {
        console.error('Error fetching available students:', error);
        showError(t('failedLoadAvailableStudents', 'Failed to load available students'));
      } finally {
        setIsLoading(false);
      }
    };
    
    // Note: Pagination functionality for available students needs implementation
    
    const handleStudentSelect = (studentId) => {
      // Normalize the studentId to string for consistent comparison
      const normalizedId = String(studentId);
      
      setSelectedStudentIds(prev => {
        // Normalize existing IDs to strings for comparison
        const normalizedSelection = new Set(Array.from(prev).map(id => String(id)));
        const wasSelected = normalizedSelection.has(normalizedId);
        
        if (wasSelected) {
          normalizedSelection.delete(normalizedId);
        } else {
          normalizedSelection.add(normalizedId);
        }
        
        return normalizedSelection;
      });
    };
    
    const handleAddStudents = async () => {
      if (!classInfo) {
        showError('Class information is not available');
        return;
      }
      try {
        setIsLoading(true);
        const selectedStudents = availableStudents.filter(student => 
          selectedStudentIds.has(String(student.id))
        );
        
        console.log('=== ADD STUDENT DEBUG ===');
        console.log('Selected students from modal:', selectedStudents);
        selectedStudents.forEach(student => {
          console.log(`Modal student: ID=${student.id}, Name="${student.firstName} ${student.lastName}"`);
        });
        
        const studentIdsToAdd = selectedStudents
          .map(student => student.student_id || student.id)
          .filter(Boolean);
          
        console.log('Adding students with IDs:', studentIdsToAdd);
        console.log('=== END ADD STUDENT DEBUG ===');
        
        if (studentIdsToAdd.length === 0) {
          throw new Error('No valid student IDs found to add');
        }
        
        const numericStudentIds = studentIdsToAdd.map(id => Number(id));
        console.log('Calling addStudentsToClass with:', {
          classId: classInfo.id,
          studentIds: numericStudentIds
        });
        
        const response = await studentService.addStudentsToClass(classInfo.id, numericStudentIds);
        console.log('=== API ADD RESPONSE DEBUG ===');
        console.log('Full API Response:', response);
        console.log('Response success:', response?.success);
        console.log('Response data:', response?.data);
        
        // Check if API response has detailed results for each student
        if (response?.data?.results) {
          console.log('Individual student results:', response.data.results);
        }
        if (response?.data?.errors) {
          console.log('Individual student errors:', response.data.errors);
        }
        if (response?.data?.summary) {
          console.log('Summary:', response.data.summary);
        }
        console.log('=== END API ADD RESPONSE DEBUG ===');
        
        if (response && response.success) {
          // Check for partial success - some students added, some failed
          const summary = response.data?.summary;
          const successful = summary?.successful || 0;
          const failed = summary?.failed || 0;
          const errors = response.data?.errors || [];
          
          if (successful > 0) {
            if (failed > 0) {
              // Partial success
              showSuccess(t('studentsPartiallyAdded', `${successful} of ${numericStudentIds.length} students added successfully`));
              
              // Show details of failed students
              if (errors.length > 0) {
                const failedNames = errors.map(err => {
                  const failedStudent = selectedStudents.find(s => s.id == err.studentId);
                  return failedStudent ? `${failedStudent.firstName} ${failedStudent.lastName}` : `ID ${err.studentId}`;
                }).join(', ');
                showError(t('someStudentsFailed', `Failed to add: ${failedNames}`));
              }
            } else {
              // Complete success
              showSuccess(t('studentsAddedSuccess', `${successful} students added successfully`));
            }
          } else {
            // Complete failure
            throw new Error('Failed to add any students');
          }
          
          setSelectedStudentIds(new Set());
          setShowAddModal(false);
          console.log('=== BEFORE FETCH STUDENTS AFTER ADD ===');
          console.log(`Expected to add ${numericStudentIds.length} students, actually added ${successful}`);
          await fetchStudents();
          console.log('=== AFTER FETCH STUDENTS AFTER ADD ===');
        } else {
          const errorMessage = response?.error || response?.message || 'Failed to add students';
          console.error('API Error:', errorMessage);
          throw new Error(errorMessage);
        }
      } catch (error) {
        console.error('Error in handleAddStudents:', error);
        showError(t('failedAddStudents', 'Failed to add students: ' + (error.message || 'Unknown error')));
      } finally {
        setIsLoading(false);
      }
    };
    
    return (
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setSelectedStudentIds(new Set());
        }}
        title={t('addStudentsToClass', 'Add Students to Class')}
        size="2xl"
      >
        <div className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder={t('searchStudentsByNameEmail', 'Search students by name or email...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="h-96 overflow-y-auto border border-gray-200 rounded-md">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
              </div>
            ) : availableStudents.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {availableStudents.map((student) => (
                  <li key={student.id} className="hover:bg-gray-50">
                    <div className="flex items-center px-4 py-3">
                      <div className="flex items-center h-5">
                        <input
                          id={`student-${student.id}`}
                          name={`student-${student.id}`}
                          type="checkbox"
                          checked={selectedStudentIds.has(String(student.id))}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleStudentSelect(student.id);
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <div 
                          className="flex items-center justify-between w-full cursor-pointer"
                          onClick={() => handleStudentSelect(student.id)}
                        >
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {student.firstName} {student.lastName}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {student.email}
                            </p>
                          </div>
                          {student.grade && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {student.grade}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">{t('noStudentsFound')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery 
                    ? t('noStudentsMatchSearch', 'No students match your search criteria.') 
                    : t('noStudentsAvailableAdd', 'There are no students available to add.')}
                </p>
              </div>
            )}
          </div>
          
          {availableStudents.length > 0 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-700">
                {selectedStudentIds.size} {selectedStudentIds.size === 1 ? 'student' : 'students'} selected
              </p>
              <div className="flex space-x-2">
                <Button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedStudentIds(new Set());
                  }}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleAddStudents}
                  disabled={selectedStudentIds.size === 0 || isLoading}
                  variant="primary"
                  size="sm"
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </span>
                  ) : (
                    `Add ${selectedStudentIds.size} ${selectedStudentIds.size === 1 ? 'Student' : 'Students'}`
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </Modal>
    );
  };
  
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
        classId: classInfo.id,
        studentId: numericStudentId,
        studentData: selectedStudent // Log full student data for debugging
      });
      
      const response = await studentService.removeStudentFromClass(classInfo.id, numericStudentId);
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
        classInfo.id, 
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
      const filename = getTimestampedFilename('students_data', 'xlsx');
      await exportToExcel(students, filename, t);
      showSuccess(t('exportSuccess', 'Data exported successfully'));
      setShowExportDropdown(false);
    } catch (error) {
      console.error('Export error:', error);
      showError(t('exportError', 'Failed to export data'));
    }
  };

  const handleExportCSV = async () => {
    try {
      const filename = getTimestampedFilename('students_data', 'csv');
      await exportToCSV(students, filename, t);
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
      const filename = getTimestampedFilename('students_data', 'pdf');
      await exportToPDF(students, classInfo, filename, t);
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

  return (
    <PageTransition variant="fade" className="p-6">      
      {/* Search and filter */}
      <FadeInSection className="bg-white shadow rounded-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
        {/* Header and search bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('studentsManagement')}</h1>
          <div className="mt-1 space-y-1">
            <p className="text-sm text-gray-600">
              {t('manageStudentRecords')}
            </p>
            {classInfo && (
              <div className="flex items-center space-x-2 text-sm">
                <Badge color="orange">
                  {classInfo.name}
                </Badge>
                <span className="text-gray-500">
                  Grade {classInfo.gradeLevel} • Section {classInfo.section}
                </span>
                <span className="text-gray-500">
                  {classInfo.academicYear}
                </span>
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
            onClick={() => setShowAddModal(true)}
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
          
          {/* Grade filter (optional) */}
          <div className="w-full sm:w-40 lg:w-48">
            <Select.Root 
              value={selectedGrade} 
              onValueChange={setSelectedGrade}
            >
              <Select.Trigger className="inline-flex items-center justify-between w-full px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <Select.Value placeholder={t('filterByGrade', 'Filter by grade')} />
                <Select.Icon>
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Content className="z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                <Select.Item 
                  value="all"
                  className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-gray-100"
                >
                  <Select.ItemText>{t('allGrades', 'All Grades')}</Select.ItemText>
                  {selectedGrade === 'all' && (
                    <Select.ItemIndicator className="absolute inset-y-0 right-0 flex items-center pr-4">
                      <Check className="h-5 w-5 text-blue-600" />
                    </Select.ItemIndicator>
                  )}
                </Select.Item>
                {[1, 2, 3, 4, 5, 6].map((grade) => (
                  <Select.Item 
                    key={grade} 
                    value={`grade-${grade}`}
                    className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-gray-100"
                  >
                    <Select.ItemText>{t('grade', 'Grade')} {grade}</Select.ItemText>
                    {selectedGrade === `grade-${grade}` && (
                      <Select.ItemIndicator className="absolute inset-y-0 right-0 flex items-center pr-4">
                        <Check className="h-5 w-5 text-blue-600" />
                      </Select.ItemIndicator>
                    )}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedStudentIds.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="text-sm text-blue-800 font-medium">
                  {selectedStudentIds.size} {t('studentsSelected', 'students selected')}
                </span>
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
      
      {/* Add Student Modal */}
      <AddStudentModal />
      
      {/* Delete Confirmation */}
      <DeleteDialog />
      
      {/* Bulk Delete Confirmation */}
      <BulkDeleteDialog />
    </PageTransition>
  );
  
  // ... rest of the component code ...
}