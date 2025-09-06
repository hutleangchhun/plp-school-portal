import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Trash2, User, Users, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useToast } from '../contexts/ToastContext';
import Modal from './ui/Modal';
import ConfirmDialog from './ui/ConfirmDialog';
import { Button } from './ui/Button';
import * as Select from '@radix-ui/react-select';
import { studentService } from '../utils/api/services/studentService';
import { PageTransition, FadeInSection } from './ui/PageTransition';
import { LoadingSpinner } from './ui/LoadingSpinner';

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
  
  // Other state variables
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(false);
  // Available students state (for future implementation)
  // const [availableStudents, setAvailableStudents] = useState([]);
  // const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  // const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  
  // Fetch students with pagination and filters (only students in teacher's class)
  const fetchStudents = useCallback(async (search = searchTerm) => {
    try {
      setLoading(true);
      const { data, pagination: paginationData } = await studentService.getMyStudents();
      
      // Filter by search term if provided (client-side filtering for now)
      let filteredData = data;
      if (search && search.trim()) {
        const searchLower = search.toLowerCase();
        filteredData = data.filter(student => 
          student.firstName.toLowerCase().includes(searchLower) ||
          student.lastName.toLowerCase().includes(searchLower) ||
          student.email.toLowerCase().includes(searchLower) ||
          student.username.toLowerCase().includes(searchLower)
        );
      }
      
      setStudents(filteredData);
      setPagination(prev => ({
        ...prev,
        page: paginationData.page,
        total: paginationData.total,
        pages: paginationData.pages
      }));
      
    } catch (error) {
      console.error('Error fetching students:', error);
      showError(t('errorFetchingStudents'));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, showError]);
  
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
    const [pagination, setPagination] = useState({
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
        const response = await studentService.getAvailableStudents(search, {
          page,
          limit: 10
        });
        
        if (response.data) {
          setAvailableStudents(response.data);
          setPagination({
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
      setSelectedStudentIds(prev => {
        const newSelection = new Set(prev);
        if (newSelection.has(studentId)) {
          newSelection.delete(studentId);
        } else {
          newSelection.add(studentId);
        }
        return newSelection;
      });
    };
    
    const handleAddStudents = async () => {
      try {
        setIsLoading(true);
        await studentService.addStudentsToMyClass(Array.from(selectedStudentIds));
        showSuccess(t('studentsAddedSuccess', 'Students added successfully'));
        setShowAddModal(false);
        fetchStudents(); // Refresh the student list
        setSelectedStudentIds(new Set()); // Reset selection
        // Also refresh available students to remove the added ones
        fetchAvailableStudents(1, searchQuery);
      } catch (error) {
        console.error('Error adding students:', error);
        showError(t('failedAddStudents', 'Failed to add students'));
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
        size="xl"
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
                          checked={selectedStudentIds.has(student.id)}
                          onChange={() => handleStudentSelect(student.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                      </div>
                      <div className="ml-3 flex-1 min-w-0">
                        <label 
                          htmlFor={`student-${student.id}`}
                          className="flex items-center justify-between w-full cursor-pointer"
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
                        </label>
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
      title="Remove Student"
      message={`Are you sure you want to remove ${selectedStudent?.firstName || 'this student'} from your class? This action cannot be undone.`}
      confirmText={loading ? 'Removing...' : 'Remove'}
      confirmVariant="danger"
      cancelText="Cancel"
      isConfirming={loading}
    />
  );
  
  // Handle delete student
  const handleDeleteStudent = async () => {
    if (!selectedStudent) return;
    
    try {
      setLoading(true);
      await studentService.deleteStudent(selectedStudent.id);
      showSuccess('Student removed successfully');
      setShowDeleteDialog(false);
      fetchStudents(pagination.page); // Refresh the list
    } catch (error) {
      console.error('Error removing student:', error);
      showError('Failed to remove student');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition variant="fade" className="p-6">      
      {/* Search and filter */}
      <FadeInSection className="bg-white shadow rounded-lg p-4 sm:p-6 hover:shadow-xl transition-all duration-300">
        {/* Header and search bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('studentsManagement')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {t('manageStudentRecords')}
          </p>
        </div>
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
        <div className="flex flex-col sm:flex-row justify-between gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-2 sm:pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-8 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="Search students..."
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
                <Select.Value placeholder="Filter by grade" />
                <Select.Icon>
                  <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                </Select.Icon>
              </Select.Trigger>
              <Select.Content className="z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                <Select.Item 
                  value="all"
                  className="relative cursor-default select-none py-2 pl-3 pr-9 text-gray-900 hover:bg-gray-100"
                >
                  <Select.ItemText>All Grades</Select.ItemText>
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
                    <Select.ItemText>Grade {grade}</Select.ItemText>
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
        
        {/* Students table */}
        {loading ? (
          <FadeInSection className="flex justify-center py-12">
            <LoadingSpinner size="xl" />
          </FadeInSection>
        ) : students.length === 0 ? (
          <FadeInSection className="text-center py-12 text-gray-500">
            No students found
          </FadeInSection>
        ) : (
          <FadeInSection delay={100} className="overflow-x-auto">
            {/* Mobile Cards View */}
            <div className="block sm:hidden">
              {students.map((student, index) => (
                <div 
                  key={student.id}
                  className="bg-white border rounded-lg p-4 mb-3 shadow-sm hover:shadow-md transition-all duration-200"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:scale-110 transition-all duration-300">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {student.firstName || student.lastName 
                            ? `${student.firstName || ''} ${student.lastName || ''}`.trim() 
                            : 'No Name'}
                        </div>
                        <div className="text-xs text-gray-500 truncate">{student.email || 'N/A'}</div>
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setSelectedStudent(student);
                        setShowDeleteDialog(true);
                      }}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-900 hover:bg-red-50 hover:scale-110 flex-shrink-0"
                      title="Remove student"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>Phone: {student.phone || 'N/A'}</span>
                    <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${
                      student.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Desktop Table View */}
            <table className="min-w-full divide-y divide-gray-200 hidden sm:table">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Email
                  </th>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Phone
                  </th>
                  <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="relative px-3 sm:px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student, index) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-gray-50 hover:scale-[1.01] transition-all duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 hover:scale-110 transition-all duration-300">
                          <User className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div className="ml-2 sm:ml-4 min-w-0 flex-1">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                            {student.firstName || student.lastName 
                              ? `${student.firstName || ''} ${student.lastName || ''}`.trim() 
                              : 'No Name'}
                          </div>
                          <div className="text-xs text-gray-500 truncate lg:hidden">
                            {student.email || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden lg:table-cell">
                      <div className="truncate max-w-xs">{student.email || 'N/A'}</div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 hidden md:table-cell">
                      {student.phone || 'N/A'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                      <span className={`px-1.5 sm:px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        student.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {student.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button
                        onClick={() => {
                          setSelectedStudent(student);
                          setShowDeleteDialog(true);
                        }}
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-900 hover:bg-red-50 hover:scale-110"
                        title="Remove student"
                      >
                        <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6 animate-in fade-in duration-500">
              <div className="flex-1 flex justify-between sm:hidden">
                <Button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  variant="outline"
                  size="sm"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                  variant="outline"
                  size="sm"
                >
                  Next
                </Button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">
                      {pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1}
                    </span> to{' '}
                    <span className="font-medium">
                      {Math.min(pagination.page * pagination.limit, pagination.total)}
                    </span>{' '}
                    of <span className="font-medium">{pagination.total}</span> students
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <Button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      variant="outline"
                      size="sm"
                      className="rounded-l-md rounded-r-none border-r-0"
                    >
                      <span className="sr-only">Previous</span>
                      <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                    </Button>
                    
                    {/* Page numbers */}
                    {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                      let pageNum;
                      if (pagination.pages <= 5) {
                        pageNum = i + 1;
                      } else if (pagination.page <= 3) {
                        pageNum = i + 1;
                      } else if (pagination.page >= pagination.pages - 2) {
                        pageNum = pagination.pages - 4 + i;
                      } else {
                        pageNum = pagination.page - 2 + i;
                      }
                      
                      return (
                        <Button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          variant={pagination.page === pageNum ? 'primary' : 'outline'}
                          size="sm"
                          className="rounded-none border-r-0 hover:scale-105 transition-transform duration-200"
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    
                    <Button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page >= pagination.pages}
                      variant="outline"
                      size="sm"
                      className="rounded-r-md rounded-l-none"
                    >
                      <span className="sr-only">Next</span>
                      <ChevronRight className="h-5 w-5" aria-hidden="true" />
                    </Button>
                  </nav>
                </div>
              </div>
            </div>
          </FadeInSection>
        )}
      </FadeInSection>
      
      {/* Add Student Modal */}
      <AddStudentModal />
      
      {/* Delete Confirmation */}
      <DeleteDialog />
    </PageTransition>
  );
  
  // ... rest of the component code ...
}