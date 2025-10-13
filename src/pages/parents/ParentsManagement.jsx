import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Edit2, Eye, Trash2, Users, Download, X, Phone, Mail, Filter, UserRoundX} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import parentService from '../../utils/api/services/parentService';
import { classService } from '../../utils/api/services/classService';
import { useStableCallback, useRenderTracker } from '../../utils/reactOptimization';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Badge } from '../../components/ui/Badge';
import { Table, MobileCards, Pagination } from '../../components/ui/Table';
import Dropdown from '../../components/ui/Dropdown';
import ParentEditModal from '../../components/parents/ParentEditModal';
import Modal from '../../components/ui/Modal';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';


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
          if (parsedUser?.school_id || parsedUser?.schoolId) {
            setSchoolId(parsedUser.school_id || parsedUser.schoolId);
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
    if (user?.school_id || user?.schoolId) {
      setSchoolId(user.school_id || user.schoolId);
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
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedParent, setSelectedParent] = useState(null);
  const [editingParent, setEditingParent] = useState(null);
  const [selectedParents, setSelectedParents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [selectingAll, setSelectingAll] = useState(false);
  const [classInfoMap, setClassInfoMap] = useState({});

  // Filter states
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [selectedStudentId, setSelectedStudentId] = useState('all');
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

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
        `${parent.firstName || ''} ${parent.lastName || ''}`,
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
            const fullName = student.fullName || student.full_name || `${firstName} ${lastName}`.trim();
            const username = student.username || student.user?.username || '';

            return {
              id: id,
              fullName: fullName || username || 'Unknown',
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
      setInitialLoading(false);
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
        const transformedParents = parentsData.map(parent => ({
          ...parent.user, // Spread user data as the main parent object
          parentId: parent.parentId,
          id: parent.user.id,
          students: parent.students || [], // Use students array from API response
          fullname: parent.user.first_name && parent.user.last_name
            ? `${parent.user.first_name} ${parent.user.last_name}`
            : parent.user.username,
          firstName: parent.user.first_name,
          lastName: parent.user.last_name,
          email: parent.user.email,
          phone: parent.user.phone,
          occupation: parent.occupation
        }));

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
    } catch (err) {
      console.error('Error fetching parents:', err);
      handleError(err, {
        toastMessage: t('failedToLoadParents', 'Failed to load parents')
      });
    } finally {
      setInitialLoading(false);
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

  // Handle view parent
  const handleViewParent = useCallback((parent) => {
    setSelectedParent(parent);
    setShowViewModal(true);
    try {
      const classIds = Array.isArray(parent?.students)
        ? Array.from(new Set(parent.students.map(s => s.classId).filter(id => !!id)))
        : [];
      if (classIds.length === 0) return;
      (async () => {
        const results = await Promise.allSettled(classIds.map(id => classService.getClassById(id)));
        const map = {};
        results.forEach((res, idx) => {
          const id = classIds[idx];
          if (res.status === 'fulfilled' && res.value) {
            const cls = res.value.data || res.value; // getClassById returns formatted object
            map[id] = cls;
          }
        });
        setClassInfoMap(prev => ({ ...prev, ...map }));
      })();
    } catch {}
  }, []);

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
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white font-semibold">
              {(parent.firstName?.[0] || parent.fullname?.[0] || 'P').toUpperCase()}
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900">
              {parent.fullname || `${parent.firstName || ''} ${parent.lastName || ''}`.trim() || '-'}
            </div>
            {parent.relationship && (
              <div className="text-xs text-gray-500">{parent.relationship}</div>
            )}
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
        const relationship = parent.students.map(student => student.relationship);
        return (
          <div>
            {relationship.length > 0 ? (
              <span title={relationship} className="text-sm text-gray-600">
                {relationship}
              </span>
            ) : (
              <span className="text-sm text-gray-600">{relationship}</span>
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
          student.user?.first_name && student.user?.last_name
            ? `${student.user.first_name} ${student.user.last_name}`
            : student.user?.username || 'Unknown Student'
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
            onClick={() => handleViewParent(parent)}
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => handleEditParent(parent)}
            variant="ghost"
            size="sm"
            className="text-yellow-600 hover:text-yellow-700"
          >
            <Edit2 className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => handleDeleteParent(parent)}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
      width: 'w-32'
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
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <FadeInSection className="mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {t('parentsManagement', 'Parents Management')}
                  </h1>
                  <p className="text-gray-600 text-sm">
                    {t('manageParentsDescription', 'Manage parent information and contacts')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {selectedParents.length > 0 && (
                  <Badge color="blue" variant="solid" size="lg">
                    {selectedParents.length} {t('selected', 'selected')}
                  </Badge>
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
              <div className="flex items-center justify-between gap-4">
                {/* Search Bar */}
                <div className="">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      placeholder={t('searchParents', 'Search parents by name, email, or phone...')}
                      value={localSearchTerm}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                {/* Cascade Filters */}
                <div className="flex justify-between items-center gap-4">
                  {/* Class Filter */}
                  <div className="flex justify-center items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      {t('filterByClass', 'Filter by Class')}
                    </label>
                    <Dropdown
                      value={selectedClassId}
                      onValueChange={handleClassChange}
                      options={[
                        { value: 'all', label: t('allClasses', 'All Classes') },
                        ...classes.map((cls) => ({
                          value: cls.id.toString(),
                          label: cls.className || cls.name || `Grade ${cls.gradeLevel}`
                        }))
                      ]}
                      placeholder={t('selectClass', 'Select class...')}
                      disabled={loadingClasses}
                      minWidth="min-w-[200px]"
                      contentClassName="max-h-[200px] overflow-y-auto"
                    />
                  </div>

                  {/* Student Filter */}
                  <div className="flex justify-center items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">
                      {t('filterByStudent', 'Filter by Student')}
                    </label>
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
                            label: student.fullName || `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username || 'Unknown'
                          }))
                      ]}
                      placeholder={t('selectStudent', 'Select student...')}
                      disabled={loadingStudents || selectedClassId === 'all'}
                      minWidth="min-w-[200px]"
                      contentClassName="max-h-[200px] overflow-y-auto"
                    />
                  </div>

                  {/* Clear Filters Button */}
                  {(selectedClassId !== 'all' || selectedStudentId !== 'all') && (
                    <div className="flex items-end">
                      <Button
                        onClick={() => {
                          setSelectedClassId('all');
                          setSelectedStudentId('all');
                          setStudents([]);
                          setPagination(prev => ({ ...prev, page: 1 }));
                        }}
                        variant="outline"
                        size="default"
                        className="whitespace-nowrap"
                      >
                        <X className="h-4 w-4 mr-2" />
                        <span className='text-xs sm:text-sm'>{t('resetFilters', 'Reset Filters')}</span>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="bg-white overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
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

              {/* Mobile Cards */}
              {parents.length > 0 && (
                <div className="md:hidden">
                  <MobileCards
                    data={parents}
                    renderCard={(parent) => (
                      <div className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedParents.includes(parent.id || parent.parentId)}
                              onChange={() => handleSelectParent(parent)}
                              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                            />
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white font-semibold">
                              {(parent.firstName?.[0] || parent.fullname?.[0] || 'P').toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">
                                {parent.fullname || `${parent.firstName || ''} ${parent.lastName || ''}`.trim()}
                              </div>
                              {parent.relationship && (
                                <div className="text-xs text-gray-500">{parent.relationship}</div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          {parent.email && (
                            <div className="flex items-center text-gray-600">
                              <Mail className="h-4 w-4 mr-2" />
                              {parent.email}
                            </div>
                          )}
                          {parent.phone && (
                            <div className="flex items-center text-gray-600">
                              <Phone className="h-4 w-4 mr-2" />
                              {parent.phone}
                            </div>
                          )}
                          <div className="space-y-1">
                            <div className="flex items-center text-gray-600">
                              <Users className="h-4 w-4 mr-2" />
                              {parent.students?.length || 0} {t('students', 'students')}
                            </div>
                            {parent.students?.length > 0 && (
                              <div className="text-xs text-gray-500 ml-6">
                                {parent.students.slice(0, 2).map(student =>
                                  student.user?.first_name && student.user?.last_name
                                    ? `${student.user.first_name} ${student.user.last_name}`
                                    : student.user?.username || 'Unknown Student'
                                ).join(', ')}
                                {parent.students.length > 2 && ` +${parent.students.length - 2} more`}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 pt-2 border-t">
                          <Button
                            onClick={() => handleViewParent(parent)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {t('view', 'View')}
                          </Button>
                          <Button
                            onClick={() => handleEditParent(parent)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <Edit2 className="h-4 w-4 mr-1" />
                            {t('edit', 'Edit')}
                          </Button>
                          <Button
                            onClick={() => handleDeleteParent(parent)}
                            variant="danger"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  />
                  {/* Mobile Pagination */}
                  <Pagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    t={t}
                  />
                </div>
              )}
            </div>
          </div>
        </FadeInSection>
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

      {/* View Modal */}
      <Modal
        isOpen={showViewModal && !!selectedParent}
        onClose={() => { setShowViewModal(false); setSelectedParent(null); }}
        title={t('parentDetails', 'Parent Details')}
        size="lg"
        height="xl"
      >
        {selectedParent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-600 flex items-center justify-center text-white font-semibold">
                {(selectedParent.firstName?.[0] || selectedParent.fullname?.[0] || 'P').toUpperCase()}
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  {selectedParent.fullname || `${selectedParent.firstName || ''} ${selectedParent.lastName || ''}`.trim()}
                </div>
                {selectedParent.relationship && (
                  <div className="text-xs text-gray-500">{selectedParent.relationship}</div>
                )}
              </div>
            </div>

            {/* Account & Contact */}
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="bg-gray-50 border border-gray-100 rounded-md p-3">
                <div className="text-xs font-medium text-gray-500 mb-2">{t('account', 'Account')}</div>
                <div className="space-y-1">
                  {selectedParent.username && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{t('username', 'Username')}</span>
                      <span className="text-gray-900">{selectedParent.username}</span>
                    </div>
                  )}
                  {(selectedParent.firstName || selectedParent.lastName) && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{t('name', 'Name')}</span>
                      <span className="text-gray-900">{`${selectedParent.firstName || ''} ${selectedParent.lastName || ''}`.trim()}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-md p-3">
                <div className="text-xs font-medium text-gray-500 mb-2">{t('contact', 'Contact')}</div>
                <div className="space-y-1">
                  {selectedParent.email && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{t('email', 'Email')}</span>
                      <span className="text-gray-900">{selectedParent.email}</span>
                    </div>
                  )}
                  {selectedParent.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">{t('phone', 'Phone')}</span>
                      <span className="text-gray-900">{selectedParent.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {(selectedParent.occupation || selectedParent.address) && (
                <div className="bg-gray-50 border border-gray-100 rounded-md p-3">
                  <div className="text-xs font-medium text-gray-500 mb-2">{t('additionalInfo', 'Additional info')}</div>
                  <div className="space-y-1">
                    {selectedParent.occupation && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500">{t('occupation', 'Occupation')}</span>
                        <span className="text-gray-900">{selectedParent.occupation}</span>
                      </div>
                    )}
                    {selectedParent.address && (
                      <div className="flex items-start justify-between">
                        <span className="text-gray-500 mr-3">{t('address', 'Address')}</span>
                        <span className="text-gray-900 text-right">{selectedParent.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Students */}
            {Array.isArray(selectedParent.students) && selectedParent.students.length > 0 && (
              <div className="bg-gray-50 border border-gray-100 rounded-md p-3">
                <div className="text-xs font-medium text-gray-500 mb-2">{t('students', 'Students')}</div>
                <ul className="text-sm text-gray-700 list-disc pl-5 space-y-1">
                  {selectedParent.students.map((s, idx) => (
                    <li key={idx} className="flex items-center justify-between">
                      <span>
                        {s.user?.first_name && s.user?.last_name
                          ? `${s.user.first_name} ${s.user.last_name}`
                          : s.user?.username || 'Unknown Student'}
                      </span>
                      <span className="text-xs text-gray-500 ml-3">
                        {(() => {
                          const info = classInfoMap?.[s.classId];
                          if (info) {
                            const bits = [info.name, info.section ? `${t('section', 'Section')} ${info.section}` : '', info.gradeLevel ? `${t('grade', 'Grade')} ${info.gradeLevel}` : ''].filter(Boolean);
                            return bits.join(' • ');
                          }
                          return s.class?.name || `${t('class', 'Class')} ${s.classId}`;
                        })()}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>

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

      {/* SelectedParentsManager removed as requested */}
    </PageTransition>
  );
}
