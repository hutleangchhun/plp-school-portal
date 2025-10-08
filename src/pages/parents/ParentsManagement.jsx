import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Edit2, Eye, Trash2, Users, Download, X, Phone, Mail } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../contexts/ToastContext';
import { useLoading } from '../../contexts/LoadingContext';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Button } from '../../components/ui/Button';
import parentService from '../../utils/api/services/parentService';
import { userService } from '../../utils/api/services/userService';
import { useStableCallback, useRenderTracker } from '../../utils/reactOptimization';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Badge } from '../../components/ui/Badge';
import { Table, MobileCards } from '../../components/ui/Table';
import ParentEditModal from '../../components/parents/ParentEditModal';
import ParentViewModal from '../../components/parents/ParentViewModal';
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
          setUser(JSON.parse(userData));
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error('Error parsing updated user data:', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userDataUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated', handleStorageChange);
    };
  }, []);

  // State management
  const [parents, setParents] = useState([]);
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

  // Fetch parents
  const fetchParents = useStableCallback(async (forceRefresh = false) => {
    if (fetchingRef.current && !forceRefresh) {
      console.log('Already fetching parents, skipping...');
      return;
    }

    fetchingRef.current = true;
    clearError();

    try {
      const loadingKey = 'fetchParents';
      startLoading(loadingKey, t('loadingParents', 'Loading parents...'));

      console.log('Fetching parents with params:', { page: pagination.page, limit: pagination.limit, search: searchTerm });

      const response = await parentService.getAllParents({
        page: pagination.page,
        limit: pagination.limit,
        search: searchTerm
      });

      console.log('Parents API response:', response);

      if (response.success) {
        const parentsData = response.data || [];

        // Apply client-side search if needed
        const filtered = performClientSideSearch(parentsData, searchTerm);

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
  }, [pagination.page, pagination.limit, searchTerm, t, handleError, clearError, performClientSideSearch]);

  // Initial fetch
  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

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
        <div className="flex items-center space-x-3">
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
          {parent.email && (
            <div className="flex items-center text-sm text-gray-600">
              <Mail className="h-3 w-3 mr-1" />
              {parent.email}
            </div>
          )}
          {parent.phone && (
            <div className="flex items-center text-sm text-gray-600">
              <Phone className="h-3 w-3 mr-1" />
              {parent.phone}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'students',
      header: t('students', 'Students'),
      render: (parent) => (
        <div className="flex items-center">
          <Users className="h-4 w-4 mr-1 text-gray-400" />
          <span className="text-sm text-gray-600">
            {parent.students?.length || 0}
          </span>
        </div>
      )
    },
    {
      key: 'actions',
      header: t('actions', 'Actions'),
      render: (parent) => (
        <div className="flex items-center space-x-2">
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
                  {t('addParent', 'Add Parent')}
                </Button>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Search and Filters */}
        <FadeInSection delay={100} className="mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('searchParents', 'Search parents by name, email, or phone...')}
                    value={localSearchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Parents Table */}
        <FadeInSection delay={200}>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <DynamicLoader
                  type="spinner"
                  size="xl"
                  variant="primary"
                  message={t('loadingParents', 'Loading parents...')}
                />
              </div>
            ) : parents.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t('noParentsFound', 'No parents found')}
                </h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm ?
                    t('noParentsMatchSearch', 'No parents match your search criteria') :
                    t('getStartedAddParent', 'Get started by adding a new parent')
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={handleAddParent} variant="primary">
                    <Plus className="h-5 w-5 mr-2" />
                    {t('addFirstParent', 'Add First Parent')}
                  </Button>
                )}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table
                    columns={tableColumns}
                    data={parents}
                    pagination={pagination}
                    onPageChange={handlePageChange}
                  />
                </div>

                {/* Mobile Cards */}
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
                          <div className="flex items-center text-gray-600">
                            <Users className="h-4 w-4 mr-2" />
                            {parent.students?.length || 0} {t('students', 'students')}
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
                    pagination={pagination}
                    onPageChange={handlePageChange}
                  />
                </div>
              </>
            )}
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
      {showViewModal && selectedParent && (
        <ParentViewModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedParent(null);
          }}
          parent={selectedParent}
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
    </PageTransition>
  );
}
