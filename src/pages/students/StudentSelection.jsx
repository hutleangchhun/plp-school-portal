import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, X, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import studentService from '../../utils/api/services/studentService';
import classService from '../../utils/api/services/classService';
import { Button } from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Pagination as UIPagination } from '../../components/ui/Table';
import * as Select from '@radix-ui/react-select';
import { ChevronDownIcon, ChevronUpIcon, CheckIcon } from '@radix-ui/react-icons';

const StudentSelection = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();
  
  const [students, setStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [filters, setFilters] = useState({
    search: '',
    classId: '',
    status: 'active'
  });
  const [selectedClass, setSelectedClass] = useState('');
  const [showClassModal, setShowClassModal] = useState(false);
  const [assigningStudents, setAssigningStudents] = useState(false);

  // Debounce the search input so typing doesn't trigger immediate refetch and lose focus
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(filters.search), 400);
    return () => clearTimeout(id);
  }, [filters.search]);

  // Fetch classes once on mount
  useEffect(() => {
    (async () => {
      try {
        const classesResponse = await classService.getMyClasses();
        if (classesResponse.data) setClasses(classesResponse.data);
      } catch (e) {
        console.error('Error fetching classes:', e);
      }
    })();
  }, []);

  // Fetch students when pagination or filters change (using debounced search)
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, debouncedSearch, filters.status]);

  // Move the fetchData function inside the component and wrap it in useCallback
  const fetchData = useCallback(async () => {
    try {
      setListLoading(true);
      
      // Fetch students with roleId 9 (students) - only those without a class (classId=null)
      const studentsResponse = await studentService.getStudents({
        roleId: 9,
        status: filters.status,
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
        classId: 'null' // Get students that have no class assigned
      });
      
      if (studentsResponse && studentsResponse.data) {
        setStudents(studentsResponse.data);
        console.log('Students:', studentsResponse);
        if (studentsResponse.pagination) {
          console.log('Pagination data:', studentsResponse.pagination);
          setPagination(prev => ({
            ...prev,
            ...studentsResponse.pagination
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      showError(t('errorFetchingData') || 'កំហុសក្នុងការទាញយកទិន្នន័យ');
    } finally {
      setListLoading(false);
    }
  }, [filters.status, debouncedSearch, pagination.page, pagination.limit, showError, t]);

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

  const handleSelectStudent = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
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
      await studentService.addStudentsToClass(classId, selectedStudents);
      
      // Show success message - compare both string and number versions
      const selectedClassName = classes.find(cls => 
        cls.id === classId || cls.id === selectedClass || 
        cls.id.toString() === selectedClass
      )?.name || 'Unknown Class';
      
      showSuccess(`${selectedStudents.length} student(s) assigned to ${selectedClassName} successfully`);
      
      // Reset selections and close modal
      setSelectedStudents([]);
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
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
        <h1 className="text-2xl font-bold text-gray-900">
          {t('studentSelection') || 'ការជ្រើសរើសសិស្ស'}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('selectStudentsForAction') || 'ជ្រើសរើសសិស្សដើម្បីអនុវត្តសកម្មភាពជាក្រុម'}
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
          <div className="flex space-x-2">
            <Button
              onClick={() => handleFilterChange({ search: '', classId: '', status: 'active' })}
              variant="outline"
              size="sm"
            >
              <X className="h-4 w-4 mr-1" />
              {t('resetFilters') || 'កំណត់ឡើងវិញ'}
            </Button>
          </div>
        </div>
      </div>

      {/* Selected Students Display */}
      {selectedStudents.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="mb-4">
            <h3 className="text-sm font-medium text-blue-800 mb-3">
              សិស្សបានជ្រើសរើស ({selectedStudents.length}):
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedStudents.map(studentId => {
                const student = students.find(s => s.id === studentId);
                if (!student) return null;
                
                const studentName = student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || 'No Name';
                
                return (
                  <span key={studentId} className="inline-flex items-center bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                    {studentName}
                    <button
                      onClick={() => setSelectedStudents(prev => prev.filter(id => id !== studentId))}
                      className="ml-2 flex-shrink-0 h-4 w-4 flex items-center justify-center rounded-full hover:bg-blue-200 text-blue-600 hover:text-blue-800 transition-colors"
                      title={t('Remove') || 'ដកចេញ'}
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
              {t('selectedStudentsActions') || 'សកម្មភាពសម្រាប់សិស្សដែលបានជ្រើសរើស'}
            </div>
            <div className="space-x-2 flex items-center">
              <Button
                onClick={() => setShowClassModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                size="sm"
              >
                {t('assignToClass') || 'កំណត់ទៅថ្នាក់'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setSelectedStudents([])}>
                {t('clearSelection') || 'សម្អាតការជ្រើសរើស'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Students List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {listLoading && (
          <div className="w-full flex items-center justify-center py-4">
            <LoadingSpinner size="default" variant="primary" />
          </div>
        )}
        <ul className="divide-y divide-gray-200">
          {students.length > 0 ? (
            students.map((student) => (
              <li key={student.id} className="hover:bg-gray-50">
                <div className="px-4 py-4 flex items-center">
                  <div className="min-w-0 flex-1 flex items-center">
                    <div className="flex-shrink-0">
                      <input
                        id={`student-${student.id}`}
                        name="students"
                        type="checkbox"
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => handleSelectStudent(student.id)}
                      />
                    </div>
                    <div className="min-w-0 flex-1 px-4">
                      <div>
                        <div className="flex items-center">
                          <User className="flex-shrink-0 h-10 w-10 text-gray-400" />
                          <div className="ml-4">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              {student.name}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {student.studentId} • {student.email}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <Badge color={student.isActive ? 'green' : 'gray'} size="sm">
                        {student.isActive ? (t('active') || 'សកម្ម') : (t('inactive') || 'មិនសកម្ម')}
                      </Badge>
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-6 py-10 text-center">
              <div className="text-gray-500">
                <p>{t('noStudentsFound') || 'រកមិនឃើញសិស្សដែលស្របនឹងលក្ខខណ្ឌរបស់អ្នក។'}</p>
              </div>
            </li>
          )}
        </ul>
      </div>

      {/* Class Assignment Modal */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowClassModal(false)}></div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
                    {t('assignToClass') || 'កំណត់ទៅថ្នាក់'}
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {t('selectClassToAssign') || `Select a class to assign ${selectedStudents.length} selected student(s) to:`}
                  </p>
                  
                  <div className="mb-4">
                    <Select.Root value={selectedClass} onValueChange={setSelectedClass}>
                      <Select.Trigger className="inline-flex items-center justify-between rounded-md border border-gray-300 bg-white px-4 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 w-full">
                        <Select.Value placeholder={t('selectClass') || 'Select a class...'} />
                        <Select.Icon>
                          <ChevronDownIcon />
                        </Select.Icon>
                      </Select.Trigger>
                      <Select.Portal>
                        <Select.Content className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-md z-50">
                          <Select.ScrollUpButton className="flex items-center justify-center p-1 text-gray-500">
                            <ChevronUpIcon />
                          </Select.ScrollUpButton>
                          <Select.Viewport className="p-1 max-h-60 overflow-y-auto">
                            {classes.map((cls) => (
                              <Select.Item 
                                key={cls.id} 
                                value={cls.id.toString()} 
                                className="relative flex cursor-pointer select-none items-center rounded px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100"
                              >
                                <Select.ItemText>{cls.name} - {cls.gradeLevel}</Select.ItemText>
                                <Select.ItemIndicator className="absolute right-2">
                                  <CheckIcon />
                                </Select.ItemIndicator>
                              </Select.Item>
                            ))}
                          </Select.Viewport>
                          <Select.ScrollDownButton className="flex items-center justify-center p-1 text-gray-500">
                            <ChevronDownIcon />
                          </Select.ScrollDownButton>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </div>
                </div>
              </div>
              
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <Button
                  onClick={handleAssignToClass}
                  disabled={!selectedClass || assigningStudents}
                  className="w-full justify-center sm:ml-3 sm:w-auto"
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
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowClassModal(false);
                    setSelectedClass('');
                  }}
                  className="mt-3 w-full justify-center sm:mt-0 sm:w-auto"
                  disabled={assigningStudents}
                >
                  {t('cancel') || 'Cancel'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination (shadcn-styled from shared UI) */}
      <UIPagination
        pagination={pagination}
        onPageChange={handlePageChange}
        t={(key, fallback) => t(key) || fallback}
      />
    </div>
  );
};

export default StudentSelection;
