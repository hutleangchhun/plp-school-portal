import { useState, useEffect, useCallback } from 'react';
import { Search, User, X, Check, Users } from 'lucide-react';
import Modal from '../ui/Modal';
import { Button } from '../ui/Button';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import studentService from '../../utils/api/services/studentService';
import { userService } from '../../utils/api/services/userService';
import { Badge } from '../ui/Badge';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import DynamicLoader from '../ui/DynamicLoader';
import { formatClassIdentifier } from '../../utils/helpers';

const StudentAssignmentModal = ({ isOpen, onClose, onSave, assignedStudents = [], parentName }) => {
  const { t } = useLanguage();
  const { showError } = useToast();

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [schoolId, setSchoolId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStudents, setSelectedStudents] = useState(new Set(assignedStudents.map(s => s.id || s.studentId)));
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Get school ID
  useEffect(() => {
    const fetchSchoolId = async () => {
      try {
        const accountData = await userService.getMyAccount();
        if (accountData?.school_id) {
          setSchoolId(accountData.school_id);
        }
      } catch (error) {
        console.error('Error fetching school ID:', error);
        showError(t('failedToFetchSchoolId', 'Failed to fetch school information'));
      }
    };

    if (isOpen) {
      fetchSchoolId();
    }
  }, [isOpen, showError, t]);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    if (!schoolId) return;

    setLoading(true);
    try {
      const response = await studentService.getStudentsBySchoolClasses(schoolId, {
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch
      });

      if (response.success) {
        setStudents(response.data);
        setPagination({
          page: response.pagination.page,
          limit: response.pagination.limit,
          total: response.pagination.total,
          pages: response.pagination.pages
        });
      } else {
        throw new Error(response.error || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      showError(t('errorFetchingStudents', 'Failed to fetch students'));
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId, pagination.page, pagination.limit, debouncedSearch, showError, t]);

  // Fetch when dependencies change
  useEffect(() => {
    if (isOpen && schoolId) {
      fetchStudents();
    }
  }, [isOpen, schoolId, fetchStudents]);

  // Handle student selection
  const handleStudentToggle = (studentId) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  // Handle save
  const handleSave = () => {
    const selectedStudentData = students.filter(student =>
      selectedStudents.has(student.id || student.studentId)
    );
    onSave(selectedStudentData);
    onClose();
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.pages) {
      setPagination(prev => ({ ...prev, page: newPage }));
    }
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStudents([]);
      setSelectedStudents(new Set(assignedStudents.map(s => s.id || s.studentId)));
      setSearchTerm('');
      setPagination({ page: 1, limit: 10, total: 0, pages: 1 });
    }
  }, [isOpen, assignedStudents]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('assignStudentsToParent', 'Assign Students to Parent')}
      size="xl"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {t('selectStudentsFor', 'Select students for')} {parentName || t('thisParent', 'this parent')}
            </h3>
            <p className="text-sm text-gray-500">
              {selectedStudents.size} {t('studentsSelected', 'students selected')}
            </p>
          </div>
          <Badge color="blue" variant="solid">
            {selectedStudents.size} {t('selected', 'selected')}
          </Badge>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchStudents', 'Search students by name, username, email...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        {/* Students List */}
        <div className="border border-gray-200 rounded-lg max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <DynamicLoader
                type="spinner"
                size="lg"
                variant="primary"
                message={t('loadingStudents', 'Loading students...')}
              />
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {debouncedSearch
                  ? t('noStudentsMatchSearch', 'No students match your search')
                  : t('noStudentsAvailable', 'No students available')
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {students.map((student) => {
                const studentId = student.id || student.studentId;
                const isSelected = selectedStudents.has(studentId);
                const isAlreadyAssigned = assignedStudents.some(s => (s.id || s.studentId) === studentId);

                return (
                  <div
                    key={studentId}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => handleStudentToggle(studentId)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-white" />}
                        </div>
                      </div>

                      <div className="flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-semibold">
                          {(student.firstName?.[0] || student.name?.[0] || 'S').toUpperCase()}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {student.name || `${student.firstName || ''} ${student.lastName || ''}`.trim()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {student.studentId} • {student.class?.gradeLevel
                                ? `${t('class') || 'Class'} ${formatClassIdentifier(student.class.gradeLevel, student.class.section)}`
                                : (student.class?.name || t('noClass', 'No class'))}
                            </p>
                          </div>
                          {isAlreadyAssigned && (
                            <Badge color="green" size="sm">
                              {t('alreadyAssigned', 'Already assigned')}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              {t('page', 'Page')} {pagination.page} {t('of', 'of')} {pagination.pages}
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                variant="outline"
                size="sm"
              >
                {t('previous', 'Previous')}
              </Button>
              <Button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                variant="outline"
                size="sm"
              >
                {t('next', 'Next')}
              </Button>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button onClick={onClose} variant="outline">
            <X className="h-4 w-4 mr-2" />
            {t('cancel', 'Cancel')}
          </Button>
          <Button onClick={handleSave} variant="primary">
            <Check className="h-4 w-4 mr-2" />
            {t('assignStudents', 'Assign Students')} ({selectedStudents.size})
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default StudentAssignmentModal;