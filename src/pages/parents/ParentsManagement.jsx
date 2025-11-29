import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Edit2, Trash2, Users, Download, X, Phone, Mail, Filter, User } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import parentService from '../../utils/api/services/parentService';
import { classService } from '../../utils/api/services/classService';
import { useStableCallback, useRenderTracker } from '../../utils/reactOptimization';
import { Table } from '../../components/ui/Table';
import Dropdown from '../../components/ui/Dropdown';
import ParentEditModal from '../../components/parents/ParentEditModal';
import ParentActionsModal from '../../components/parents/ParentActionsModal';
import Modal from '../../components/ui/Modal';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import SelectedCard from '../../components/ui/SelectedCard';
import { formatClassIdentifier } from '../../utils/helpers';
import { getFullName } from '../../utils/usernameUtils';


export default function ParentsManagement() {
  const { t } = useLanguage();
  const { showSuccess, showError } = useToast();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const { startLoading, stopLoading } = useLoading();

  // Track renders (development only)
  useRenderTracker('ParentsManagement');

  // Get authenticated user data
  const [user, setUser] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      console.error('Error parsing user data:', err);
      return null;
    }
  });

  // Listen for localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          // Update schoolId when user data changes
          if (parsedUser?.teacher?.schoolId || parsedUser?.school_id || parsedUser?.schoolId) {
            setSchoolId(parsedUser?.teacher?.schoolId || parsedUser.school_id || parsedUser.schoolId);
          }
        } else {
          setUser(null);
          setSchoolId(null);
        }
      } catch (err) {
        console.error('Error parsing updated user data:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userDataUpdated', handleStorageChange);

    // Initialize schoolId from current user data
    if (user?.teacher?.schoolId || user?.school_id || user?.schoolId) {
      setSchoolId(user?.teacher?.schoolId || user.school_id || user.schoolId);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated', handleStorageChange);
    };
  }, [user]);

  // State management
  const [parents, setParents] = useState([]);
  const [schoolId, setSchoolId] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [localSearchTerm, setLocalSearchTerm] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [editingParent, setEditingParent] = useState(null);
  const [selectedParents, setSelectedParents] = useState([]);
  const [isParentsManagerOpen, setIsParentsManagerOpen] = useState(false);
  const [bulkDeletingParents, setBulkDeletingParents] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [dataFetched, setDataFetched] = useState(false);
  const [selectingAll, setSelectingAll] = useState(false);

  // Filter states
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedStudentId, setSelectedStudentId] = useState('all');
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Parent Actions Modal state
  const [showParentActionsModal, setShowParentActionsModal] = useState(false);

  const fetchingRef = useRef(false);
  const searchTimeoutRef = useRef(null);

  // Client-side search
  const performClientSideSearch = useCallback((parentsData, searchQuery) => {
    if (!searchQuery || searchQuery.trim() === '') {
      return parentsData;
    }

    const query = searchQuery.trim().toLowerCase();
    return parentsData.filter(parent => {
      const searchFields = [
        parent.firstName || '',
        parent.lastName || '',
        parent.fullname || '',
        parent.email || '',
        parent.phone || '',
        parent.relationship || '',
        getFullName(parent, ''),
      ];

      return searchFields.some(field =>
        field.toLowerCase().includes(query)
      );
    });
  }, []);

  // Debounced search handler
  const handleSearchChange = useCallback((value) => {
    setLocalSearchTerm(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setSearchTerm(value);
      setPagination(prev => ({ ...prev, page: 1 }));
    }, 500);
  }, []);

  // Fetch classes for filter
  const fetchClasses = useStableCallback(async () => {
    if (!schoolId) return;

    setLoadingClasses(true);
    try {
      const response = await classService.getBySchool(schoolId);
      if (response.success && response.classes) {
        setClasses(response.classes);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    } finally {
      setLoadingClasses(false);
    }
  }, [schoolId]);

  // Fetch students for filter (based on selected class)
  const fetchStudents = useStableCallback(async (classId) => {
    if (!schoolId || !classId || classId === 'all') {
      setStudents([]);
      return;
    }

    setLoadingStudents(true);
    try {

      const response = await classService.getClassStudents(classId);

      if (response.data && Array.isArray(response.data)) {

        // Format student data for dropdown
        const formattedStudents = response.data
          .filter(student => {
            if (!student) return false;
            // Prioritize studentId (relationship ID) for filtering parents
            const hasId = student.studentId || student.id || student.userId || student.user_id;
            if (!hasId) {
              console.warn('⚠️ Student without ID:', student);
            }
            return hasId;
          })
          .map(student => {
            
            const enrollmentId = student.studentId || student.student_id;
            const userId = student.id || student.userId || student.user_id || student.user?.id;

            // Prefer enrollmentId, fall back to userId if not found
            const id = enrollmentId || userId;

            const firstName = student.firstName || student.first_name || student.user?.first_name || '';
            const lastName = student.lastName || student.last_name || student.user?.last_name || '';
            const username = student.username || student.user?.username || '';
            const fullName = getFullName(student, username || 'Unknown');

            return {
              id: id,
              fullName: fullName,
              firstName: firstName,
              lastName: lastName,
              username: username
            };
          });

        console.log('✅ Formatted students for dropdown:', formattedStudents);
        setStudents(formattedStudents);
      } else {
        console.warn('⚠️ Invalid students response format:', response);
        setStudents([]);
      }
    } catch (err) {
      console.error('❌ Error fetching students:', err);
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  }, [schoolId]);

  // Handle class selection change
  const handleClassChange = useStableCallback((classId) => {
    setSelectedClassId(classId);
    setSelectedStudentId('all'); // Reset student selection

    // Fetch students for the selected class
    if (classId && classId !== 'all') {
      fetchStudents(classId);
    } else {
      setStudents([]);
    }

    setPagination(prev => ({ ...prev, page: 1 }));
  }, [fetchStudents]);

  // Handle student selection change
  const handleStudentChange = useStableCallback((studentId) => {
    setSelectedStudentId(studentId);
    setPagination(prev => ({ ...prev, page: 1 }));
  }, []);

  // Initial fetch of classes
  useEffect(() => {
    if (schoolId) {
      fetchClasses();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId]);

  // Fetch parents
  const fetchParents = useStableCallback(async (forceRefresh = false) => {
    if (fetchingRef.current && !forceRefresh) {
      console.log('Already fetching parents, skipping...');
      return;
    }

    // Ensure we have schoolId before fetching
    if (!schoolId) {
      console.log('No school ID available, cannot fetch parents');
      return;
    }

    fetchingRef.current = true;
    clearError();

    try {
      const loadingKey = 'fetchParents';
      startLoading(loadingKey, t('loadingParents', 'Loading parents...'));

      const params = {
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm
      };

      // Add studentId filter if selected
      // Note: studentId is the enrollment/relationship ID (e.g., 919751), NOT the user.id
      // This filters parents by which student enrollment they are associated with
      if (selectedStudentId && selectedStudentId !== 'all') {
        const studentIdNum = parseInt(selectedStudentId, 10);
        if (!isNaN(studentIdNum)) {
          params.studentId = studentIdNum;
        }
      }

      console.log('🔍 Fetching parents with params:', { schoolId, ...params });

      const response = await parentService.getParentsBySchool(schoolId, params);

      console.log('Parents API response:', response);

      if (response.success) {
        const parentsData = response.data || [];

        // Transform data to match expected format - the API returns parents with students array
        const transformedParents = parentsData.map(parent => {
          // Handle both flat and nested parent structures
          const userData = parent.user || parent;
          const parentInfo = parent.parent || parent;

          return {
            ...userData, // Spread user data as the main parent object
            parentId: parent.parentId || parentInfo.parentId,
            id: userData.id,
            students: parent.students || [], // Use students array from API response
            fullname: getFullName(userData, userData.username),
            firstName: userData.first_name,
            lastName: userData.last_name,
            email: userData.email,
            phone: userData.phone,
            occupation: parent.occupation || parentInfo.occupation
          };
        });

        // Apply client-side search if needed
        const filtered = performClientSideSearch(transformedParents, searchTerm);

        setParents(filtered);
        setPagination(prev => ({
          ...prev,
          total: response.total || filtered.length,
          pages: response.totalPages || Math.ceil((response.total || filtered.length) / prev.limit)
        }));
      } else {
        throw new Error(response.error || t('failedToLoadParents', 'Failed to load parents'));
      }

      stopLoading(loadingKey);
      setDataFetched(true); // Mark data as fetched after successful API call
      setInitialLoading(false); // End initial loading after successful data fetch
    } catch (err) {
      console.error('Error fetching parents:', err);
      handleError(err, {
        toastMessage: t('failedToLoadParents', 'Failed to load parents')
      });
      setDataFetched(true); // Mark data as fetched even on error
      setInitialLoading(false); // End initial loading even on error
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [schoolId, pagination.page, pagination.limit, searchTerm, selectedStudentId, t, handleError, clearError, performClientSideSearch]);

  // Initial fetch
  useEffect(() => {
    if (schoolId) {
      fetchParents();
    }
  }, [schoolId, fetchParents]);

  // Handle select parent
  const handleSelectParent = useCallback((parent) => {
    const parentId = parent.id || parent.parentId;
    setSelectedParents(prev => {
      if (prev.includes(parentId)) {
        return prev.filter(id => id !== parentId);
      } else {
        return [...prev, parentId];
      }
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(async () => {
    if (selectedParents.length === parents.length && parents.length > 0) {
      setSelectedParents([]);
      return;
    }

    if (parents.length > 0) {
      const allIds = parents.map(p => p.id || p.parentId);
      setSelectedParents(allIds);
    }
  }, [parents, selectedParents]);

  // Check if parent is selected
  const isParentSelected = useCallback((parent) => {
    const parentId = parent.id || parent.parentId;
    return selectedParents.includes(parentId);
  }, [selectedParents]);

  // Handle edit parent
  const handleEditParent = useCallback((parent) => {
    setEditingParent(parent);
    setShowEditModal(true);
  }, []);

  // Handle delete parent
  const handleDeleteParent = useCallback((parent) => {
    setSelectedParent(parent);
    setShowDeleteDialog(true);
  }, []);

  // Bulk delete selected parents
  const handleBulkDeleteSelectedParents = useCallback(async () => {
    if (selectedParents.length === 0) return;
    try {
      setBulkDeletingParents(true);
      for (const pid of selectedParents) {
        const parentId = pid; // already id
        try {
          await parentService.deleteParent(parentId);
        } catch (e) {
          console.error('Failed to delete parent', parentId, e);
        }
      }
      setSelectedParents([]);
      setIsParentsManagerOpen(false);
      // refresh
      fetchParents(true);
      showSuccess(t('parentDeletedSuccess', 'Parent deleted successfully'));
    } catch (err) {
      console.error('Bulk delete error:', err);
      showError(t('failedToDeleteParent', 'Failed to delete parent'));
    } finally {
      setBulkDeletingParents(false);
    }
  }, [selectedParents, fetchParents, showSuccess, showError, t]);

  // Create a map of selected parents data for the modal
  const selectedParentsData = parents.reduce((acc, parent) => {
    const parentId = parent.id || parent.parentId;
    if (selectedParents.includes(parentId)) {
      acc[parentId] = parent;
    }
    return acc;
  }, {});

  // Remove individual parent from selection
  const removeParentFromSelection = useCallback((parentId) => {
    setSelectedParents(prev => prev.filter(id => id !== parentId));
  }, []);

  // Clear all selections
  const clearAllSelections = useCallback(() => {
    setSelectedParents([]);
    setShowParentActionsModal(false);
  }, []);

  // Confirm delete
  const confirmDelete = useStableCallback(async () => {
    if (!selectedParent) return;

    try {
      const loadingKey = 'deleteParent';
      startLoading(loadingKey, t('deletingParent', 'Deleting parent...'));

      const parentId = selectedParent.id || selectedParent.parentId;
      const response = await parentService.deleteParent(parentId);

      if (response.success) {
        showSuccess(t('parentDeletedSuccess', 'Parent deleted successfully'));
        setShowDeleteDialog(false);
        setSelectedParent(null);
        fetchParents(true);
      } else {
        throw new Error(response.error || t('failedToDeleteParent', 'Failed to delete parent'));
      }

      stopLoading(loadingKey);
    } catch (err) {
      console.error('Error deleting parent:', err);
      handleError(err, {
        toastMessage: t('failedToDeleteParent', 'Failed to delete parent')
      });
    }
  }, [selectedParent, t, fetchParents, handleError]);

  // Handle add new parent
  const handleAddParent = useCallback(() => {
    setEditingParent(null);
    setShowEditModal(true);
  }, []);

  // Handle save parent (create or update)
  const handleSaveParent = useStableCallback(async (parentData) => {
    try {
      const isEditing = !!editingParent;
      const loadingKey = isEditing ? 'updateParent' : 'createParent';
      startLoading(loadingKey, isEditing ? t('updatingParent', 'Updating parent...') : t('creatingParent', 'Creating parent...'));

      let response;
      if (isEditing) {
        const parentId = editingParent.id || editingParent.parentId;
        response = await parentService.updateParent(parentId, parentData);
      } else {
        response = await parentService.createParent(parentData);
      }

      if (response.success) {
        showSuccess(isEditing ?
          t('parentUpdatedSuccess', 'Parent updated successfully') :
          t('parentCreatedSuccess', 'Parent created successfully')
        );
        setShowEditModal(false);
        setEditingParent(null);
        fetchParents(true);
      } else {
        throw new Error(response.error || (isEditing ?
          t('failedToUpdateParent', 'Failed to update parent') :
          t('failedToCreateParent', 'Failed to create parent')
        ));
      }

      stopLoading(loadingKey);
    } catch (err) {
      console.error('Error saving parent:', err);
      handleError(err, {
        toastMessage: editingParent ?
          t('failedToUpdateParent', 'Failed to update parent') :
          t('failedToCreateParent', 'Failed to create parent')
      });
    }
  }, [editingParent, t, fetchParents, handleError]);

  // Handle bulk add student to selected parents
  const handleBulkAddStudentToParents = useStableCallback(async (data) => {
    if (selectedParents.length === 0 || !data.studentId) {
      showError(t('pleaseSelectStudent', 'Please select a student'));
      return;
    }

    try {
      const loadingKey = 'bulkAddStudentToParents';
      startLoading(loadingKey, t('addingStudentToParents', 'Adding student to parents...'));

      let successCount = 0;
      let failCount = 0;

      for (const parentId of selectedParents) {
        try {
          const relationshipData = {
            studentId: parseInt(data.studentId, 10),
            parentId: parentId,
            relationship: data.relationship,
            isPrimaryContact: data.isPrimaryContact
          };

          const response = await parentService.addStudentToParent(relationshipData);

          if (response.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          console.error('Failed to add student to parent', parentId, e);
          failCount++;
        }
      }

      if (successCount > 0) {
        showSuccess(t('studentAddedToParentsSuccess', `Student added to ${successCount} parent(s) successfully`));
        setShowParentActionsModal(false);
        setSelectedParents([]);
        fetchParents(true);
      }

      if (failCount > 0) {
        showError(t('failedToAddStudentToSomeParents', `Failed to add student to ${failCount} parent(s)`));
      }

      stopLoading(loadingKey);
    } catch (err) {
      console.error('Error adding student to parents:', err);
      handleError(err, {
        toastMessage: t('failedToAddStudentToParents', 'Failed to add student to parents')
      });
    }
  }, [selectedParents, t, fetchParents, handleError, showError, showSuccess, startLoading, stopLoading]);

  // Handle pagination
  const handlePageChange = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);

  // Table columns
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
              checked={selectedParents.length === parents.length && parents.length > 0}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          )}
        </div>
      ),
      render: (parent) => (
        <input
          type="checkbox"
          checked={selectedParents.includes(parent.id || parent.parentId)}
          onChange={() => handleSelectParent(parent)}
          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      ),
      width: 'w-12'
    },
    {
      key: 'name',
      header: t('name', 'Name'),
      render: (parent) => (
        <div className="flex items-center space-x-3 text-sm">
            <div className="font-medium text-gray-900">
              {getFullName(parent, parent.username || '-')}
            </div>
        </div>
      )
    },
    {
      key: 'contact',
      header: t('contact', 'Contact'),
      render: (parent) => (
        <div className="space-y-1">
          {parent.phone && (
            <div className="flex items-center text-sm text-gray-600">
              {parent.phone}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'relationship',
      header: t('relationship', 'Relationship'),
      render: (parent) => {
        const relationships = parent.students.map(student => {
          const rel = student.relationship;
          if (rel === 'FATHER') return t('father', 'Father');
          if (rel === 'MOTHER') return t('mother', 'Mother');
          return rel;
        });
        const displayRelationship = [...new Set(relationships)].join(', ');
        return (
          <div>
            {displayRelationship ? (
              <span title={displayRelationship} className="text-sm text-gray-600">
                {displayRelationship}
              </span>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'students',
      header: t('students', 'Students'),
      render: (parent) => {
        const studentNames = parent.students?.map(student =>
          getFullName(student.user || student, 'Unknown Student')
        ) || [];

        return (
          <div className="space-y-1">
            {studentNames.length > 0 && (
              <div className="text-sm text-gray-500 max-w-xs">
                {studentNames.slice(0, 2).join(', ')}
                {studentNames.length > 2 && ` +${studentNames.length - 2} more`}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      header: t('actions', 'Actions'),
      render: (parent) => (
        <div className="flex items-center">
          <Button
            onClick={() => handleEditParent(parent)}
            variant="ghost"
            size="sm"
            className="text-yellow-600 hover:text-yellow-700"
            title={t('edit', 'Edit')}
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => handleDeleteParent(parent)}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
            title={t('delete', 'Delete')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      width: 'w-24'
    }
  ];

  // Initial loading state
  if (initialLoading) {
    return (
      <PageLoader
        message={t('loadingParents', 'Loading parents...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => retry(fetchParents)}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  return (
    <div>
      <div className="p-3 sm:p-4">
        {/* Header */}
          <div className="p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                    {t('parentsManagement', 'Parents Management')}
                  </h1>
                  <p className="text-gray-600 text-sm">
                    {t('manageParentsDescription', 'Manage parent information and contacts')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Parent Actions Floating Button - Show when parents are selected */}
                {selectedParents.length > 0 && (
                  <div className="flex justify-center">
                    <button
                      onClick={() => setShowParentActionsModal(true)}
                      className="group relative inline-flex items-center justify-center p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300"
                      title={t('manageParents', 'Manage Selected Parents')}
                    >
                      <Users className="h-5 w-5" />
                      {/* Notification count badge */}
                      <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center shadow-md border-2 border-white">
                        {selectedParents.length > 99 ? '99+' : selectedParents.length}
                      </div>
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
                        {t('manageParents', 'Manage Selected Parents')}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                      </div>
                    </button>
                  </div>
                )}

                <Button
                  onClick={handleAddParent}
                  variant="primary"
                  size="default"
                  className="shadow-lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  <span className='text-xs sm:text-sm'>{t('addParent', 'Add Parent')}</span>
                </Button>
              </div>
            </div>

            <div className="my-6">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                {/* Search Bar */}
                <div className="flex flex-col flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('search', 'Search')}
                  </label>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('searchParents', 'Search parents...')}
                      value={localSearchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* Class Filter */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('filterByClass', 'Filter by Class')}
                  </label>
                  <div className="flex-1">
                    <Dropdown
                      value={selectedClassId}
                      onValueChange={handleClassChange}
                      options={[
                        { value: 'all', label: t('allClasses', 'All Classes') },
                        ...classes.map((cls) => ({
                          value: cls.id.toString(),
                          label: cls.gradeLevel ? `${t('class') || 'Class'} ${formatClassIdentifier(cls.gradeLevel, cls.section)}` : (cls.className || cls.name || `Grade ${cls.gradeLevel}`)
                        }))
                      ]}
                      placeholder={t('selectClass', 'Select class...')}
                      disabled={loadingClasses}
                      contentClassName="max-h-[200px] overflow-y-auto"
                    />
                  </div>
                </div>

                {/* Student Filter */}
                <div className="flex flex-col">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('filterByStudent', 'Filter by Student')}
                  </label>
                  <div className="flex-1">
                    <Dropdown
                      value={selectedStudentId}
                      onValueChange={handleStudentChange}
                      options={[
                        {
                          value: 'all',
                          label: selectedClassId === 'all'
                            ? t('selectClassFirst', 'Select a class first')
                            : t('allStudents', 'All Students')
                        },
                        ...students
                          .filter(student => student && student.id)
                          .map((student) => ({
                            value: student.id.toString(),
                            label: getFullName(student, student.username || 'Unknown')
                          }))
                      ]}
                      placeholder={t('selectStudent', 'Select student...')}
                      disabled={loadingStudents || selectedClassId === 'all'}
                      contentClassName="max-h-[200px] overflow-y-auto"
                    />
                  </div>
                </div>

                {/* Clear Filters Button */}
                {(selectedClassId !== 'all' || selectedStudentId !== 'all') && (
                  <Button
                    onClick={() => {
                      setSelectedClassId('all');
                      setSelectedStudentId('all');
                      setStudents([]);
                      setPagination(prev => ({ ...prev, page: 1 }));
                    }}
                    variant="outline"
                    size="default"
                    className="whitespace-nowrap h-10"
                  >
                    <X className="h-4 w-4 mr-2" />
                    <span className='text-xs sm:text-sm'>{t('resetFilters', 'Reset Filters')}</span>
                  </Button>
                )}
              </div>
            </div>
            <div className="bg-white overflow-hidden">
              <Table
                columns={tableColumns}
                data={parents}
                loading={loading}
                emptyMessage={t('noParentsFound', 'No parents found')}
                emptyIcon={Users}
                emptyVariant='info'
                emptyDescription={t('noDataFound', 'No data found')}
                emptyActionLabel={localSearchTerm ? t('clearSearch', 'Clear search') : undefined}
                onEmptyAction={localSearchTerm ? () => handleSearchChange('') : undefined}
                showPagination={true}
                pagination={pagination}
                onPageChange={handlePageChange}
                t={t}
              />
            </div>
          </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <ParentEditModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingParent(null);
          }}
          onSave={handleSaveParent}
          parent={editingParent}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => {
          setShowDeleteDialog(false);
          setSelectedParent(null);
        }}
        onConfirm={confirmDelete}
        title={t('confirmDeleteParent', 'Delete Parent')}
        message={t('confirmDeleteParentMessage', 'Are you sure you want to delete this parent? This action cannot be undone.')}
        type="danger"
        confirmText={t('delete', 'Delete')}
        cancelText={t('cancel', 'Cancel')}
      />

      {/* Floating trigger removed; modal controlled by header button */}

      {/* Selected Parents modal with bulk delete */}
      <Modal
        isOpen={isParentsManagerOpen}
        onClose={() => setIsParentsManagerOpen(false)}
        title={
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span>{t('selectedParents', 'Selected Parents')}</span>
            <span className="bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">{selectedParents.length}</span>
          </div>
        }
        size="lg"
        height="xl"
        footer={
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setSelectedParents([])}>
              {t('clearSelection', 'Clear Selection')}
            </Button>
            <Button onClick={handleBulkDeleteSelectedParents} disabled={bulkDeletingParents || selectedParents.length === 0} size="sm" className="bg-red-600 hover:bg-red-700 text-white">
              {bulkDeletingParents ? t('deleting', 'Deleting...') : t('deleteSelected', 'Delete Selected')}
            </Button>
          </div>
        }
      >
        {selectedParents.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">{t('noParentsSelected', 'No parents selected')}</div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {selectedParents.map((pid) => {
            const parent = parents.find(p => (p.id || p.parentId) === pid) || {};
            const displayName = getFullName(parent, parent.username || `Parent ${pid}`);
            const contact = [parent.email, parent.phone].filter(Boolean).join(' • ');
            return (
              <SelectedCard
                key={pid}
                title={displayName}
                subtitle={contact}
                statusColor="blue"
                onRemove={() => setSelectedParents(prev => prev.filter(id => id !== pid))}
              />
            );
          })}
        </div>
        )}
      </Modal>

      {/* Parent Actions Modal */}
      <ParentActionsModal
        isOpen={showParentActionsModal}
        onClose={() => setShowParentActionsModal(false)}
        selectedParents={selectedParents}
        selectedParentsData={selectedParentsData}
        onRemove={handleBulkDeleteSelectedParents}
        loading={bulkDeletingParents}
        onRemoveParent={removeParentFromSelection}
        onClearAll={clearAllSelections}
        students={students}
        onAddStudent={handleBulkAddStudentToParents}
      />
    </div>
  );
}
