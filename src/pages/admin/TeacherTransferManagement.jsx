import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { useToast } from '../../contexts/ToastContext';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import Dropdown from '../../components/ui/Dropdown';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import Modal from '../../components/ui/Modal';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import SidebarFilter from '../../components/ui/SidebarFilter';
import TeacherContextMenu from '../../components/admin/TeacherContextMenu';
import ResetPasswordModal from '../../components/admin/ResetPasswordModal';
import ExportProgressModal from '../../components/modals/ExportProgressModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { api } from '../../utils/api';
import { getFullName } from '../../utils/usernameUtils';
import locationService from '../../utils/api/services/locationService';
import schoolService from '../../utils/api/services/schoolService';
import { userService } from '../../utils/api/services/userService';
import { roleOptions } from '../../utils/formOptions';
import { Users, ListFilter, RotateCcw, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const getRoleName = (roleId) => {
  const role = roleOptions.find(r => r.value === String(roleId));
  return role ? role.label : '-';
};

const TeacherTransferManagement = () => {
  const { t } = useLanguage();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError } = useErrorHandler();
  const { showSuccess, showError } = useToast();

  // Location state for source school cascade filtering
  const [sourceProvinces, setSourceProvinces] = useState([]);
  const [sourceDistricts, setSourceDistricts] = useState([]);
  const [sourceSchools, setSourceSchools] = useState([]);
  const [selectedSourceProvince, setSelectedSourceProvince] = useState('');
  const [selectedSourceDistrict, setSelectedSourceDistrict] = useState('');
  const [selectedSourceSchool, setSelectedSourceSchool] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('8'); // Default to teacher role (8)

  // Other state
  const [teachers, setTeachers] = useState([]);
  const [allSelectedTeacherIds, setAllSelectedTeacherIds] = useState(new Set()); // Global selection across all pages
  const [selectedTeachersMap, setSelectedTeachersMap] = useState(new Map()); // id -> teacher object for modal preview
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const [isSourceFilterOpen, setIsSourceFilterOpen] = useState(false);

  // Reset password modal state
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedTeacherForReset, setSelectedTeacherForReset] = useState(null);

  // Delete confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedTeacherForDelete, setSelectedTeacherForDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Status toggle dialog state
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [selectedTeacherForStatus, setSelectedTeacherForStatus] = useState(null);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchingTeachers, setFetchingTeachers] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);

  // Modal state for target school selection
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferModalTab, setTransferModalTab] = useState('transfer'); // 'transfer' or 'bulkDelete'
  const [targetProvinces, setTargetProvinces] = useState([]);
  const [targetDistricts, setTargetDistricts] = useState([]);
  const [targetSchools, setTargetSchools] = useState([]);
  const [selectedTargetProvince, setSelectedTargetProvince] = useState('');
  const [selectedTargetDistrict, setSelectedTargetDistrict] = useState('');
  const [selectedTargetSchool, setSelectedTargetSchool] = useState('');
  const [targetLoading, setTargetLoading] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Export progress modal state
  const [showExportProgress, setShowExportProgress] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('processing');

  // Pagination state
  const [teacherPagination, setTeacherPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    pages: 1
  });

  // Limit options for pagination
  const limitOptions = [
    { value: 9, label: '9' },
    { value: 20, label: '20' },
    { value: 50, label: '50' },
    { value: 100, label: '100' }
  ];

  // Fetch provinces and all teachers on component mount
  useEffect(() => {
    fetchProvinces();
    fetchAllTeachers();
  }, []);

  const fetchProvinces = async () => {
    try {
      clearError();
      const response = await locationService.getProvinces();
      const provincesData = response.data || response;
      setSourceProvinces(provincesData);
      setTargetProvinces(provincesData);
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadProvinces', 'Failed to load provinces'),
      });
    }
  };

  const fetchAllTeachers = async (page = 1, search = '', limit = teacherPagination.limit) => {
    try {
      setFetchingTeachers(true);
      clearError();
      const actualLimit = typeof limit === 'number' ? limit : parseInt(limit);

      // Convert status filter to API parameter
      let statusParam = undefined;
      if (selectedStatusFilter === 'active') {
        statusParam = true;
      } else if (selectedStatusFilter === 'inactive') {
        statusParam = false;
      }

      const response = await api.teacher.getAllTeachers({
        page: page,
        limit: actualLimit,
        search: search.trim() || undefined,
        is_active: statusParam,
        roleId: selectedRoleFilter // Filter by selected role
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to load teachers');
      }

      // Map teacher data to ensure proper structure
      const mappedTeachers = (response.data || []).map(teacher => ({
        id: teacher.teacherId || teacher.id,
        teacherId: teacher.teacherId,
        userId: teacher.userId,
        username: teacher.user?.username || '',
        firstName: teacher.user?.first_name || '',
        lastName: teacher.user?.last_name || '',
        email: teacher.user?.email || '',
        phone: teacher.user?.phone || '',
        gradeLevel: teacher.gradeLevel || null,
        roleId: teacher.roleId,
        schoolId: teacher.schoolId,
        schoolName: teacher.school?.name || '',
        status: teacher.status,
        classes: teacher.classes || [],
        isActive: teacher.is_active !== false // Map is_active from API to isActive
      }));

      // Fetch school details for teachers that don't have schoolName
      const teachersWithSchoolInfo = await Promise.all(
        mappedTeachers.map(async (teacher) => {
          // If we already have schoolName, use it
          if (teacher.schoolName) {
            return teacher;
          }

          // Otherwise, fetch school info by schoolId
          if (teacher.schoolId) {
            try {
              const schoolResponse = await schoolService.getSchoolById(teacher.schoolId);
              if (schoolResponse && schoolResponse.data) {
                return {
                  ...teacher,
                  schoolName: schoolResponse.data.name || ''
                };
              }
            } catch (err) {
              console.error(`Failed to fetch school info for teacher ${teacher.id}:`, err);
            }
          }

          return teacher;
        })
      );

      setTeachers(teachersWithSchoolInfo);
      // Don't clear selections - they persist across pages

      // Update pagination info from API response
      if (response.pagination) {
        setTeacherPagination(prev => ({
          ...prev,
          page: page,
          limit: actualLimit,
          total: response.pagination.total,
          pages: response.pagination.pages || response.pagination.totalPages || Math.ceil(response.pagination.total / actualLimit)
        }));
      } else {
        // Fallback
        const totalPages = Math.ceil((response.data?.length || 0) / actualLimit);
        setTeacherPagination(prev => ({
          ...prev,
          page: page,
          limit: actualLimit,
          total: response.data?.length || 0,
          pages: totalPages
        }));
      }
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadTeachers', 'Failed to load teachers'),
      });
      setTeachers([]);
    } finally {
      setFetchingTeachers(false);
      setInitialLoading(false);
    }
  };

  const fetchTeachersForSchool = useCallback(async (schoolId, page = 1, search = '', limit = teacherPagination.limit) => {
    if (!schoolId) {
      setTeachers([]);
      return;
    }

    try {
      setFetchingTeachers(true);
      clearError();
      const actualLimit = typeof limit === 'number' ? limit : parseInt(limit);

      // Convert status filter to API parameter
      let statusParam = undefined;
      if (selectedStatusFilter === 'active') {
        statusParam = true;
      } else if (selectedStatusFilter === 'inactive') {
        statusParam = false;
      }

      const response = await api.teacher.getTeachersBySchool(schoolId, {
        page: page,
        limit: actualLimit,
        search: search.trim() || undefined,
        is_active: statusParam,
        roleId: selectedRoleFilter // Filter by selected role
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to load teachers');
      }

      // Map teacher data to ensure proper structure
      const mappedTeachers = (response.data || []).map(teacher => ({
        id: teacher.teacherId || teacher.id,
        teacherId: teacher.teacherId,
        userId: teacher.userId,
        username: teacher.user?.username || '',
        firstName: teacher.user?.first_name || '',
        lastName: teacher.user?.last_name || '',
        email: teacher.user?.email || '',
        phone: teacher.user?.phone || '',
        gradeLevel: teacher.gradeLevel || null,
        roleId: teacher.roleId,
        schoolId: teacher.schoolId,
        status: teacher.status,
        classes: teacher.classes || [],
        isActive: teacher.is_active !== false // Map is_active from API to isActive
      }));

      // Fetch school details for teachers that don't have schoolName
      const teachersWithSchoolInfo = await Promise.all(
        mappedTeachers.map(async (teacher) => {
          // If we need to fetch school info by schoolId
          if (teacher.schoolId) {
            try {
              const schoolResponse = await schoolService.getSchoolById(teacher.schoolId);
              if (schoolResponse && schoolResponse.data) {
                return {
                  ...teacher,
                  schoolName: schoolResponse.data.name || ''
                };
              }
            } catch (err) {
              console.error(`Failed to fetch school info for teacher ${teacher.id}:`, err);
            }
          }

          return teacher;
        })
      );

      setTeachers(teachersWithSchoolInfo);

      // Update pagination info from API response
      if (response.pagination) {
        setTeacherPagination(prev => ({
          ...prev,
          page: page,
          limit: actualLimit,
          total: response.pagination.total,
          pages: response.pagination.pages || response.pagination.totalPages || Math.ceil(response.pagination.total / actualLimit)
        }));
      } else {
        // Fallback
        const totalPages = Math.ceil((teachersWithSchoolInfo?.length || 0) / actualLimit);
        setTeacherPagination(prev => ({
          ...prev,
          page: page,
          limit: actualLimit,
          total: teachersWithSchoolInfo?.length || 0,
          pages: totalPages
        }));
      }
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadTeachers', 'Failed to load teachers'),
      });
      setTeachers([]);
    } finally {
      setFetchingTeachers(false);
    }
  }, [clearError, handleError, selectedStatusFilter, t]);

  // Search handlers: only hit API on explicit submit
  const handleSearchChange = (value) => {
    setSearchQuery(value);
  };

  const handleSearchSubmit = (e) => {
    if (e) {
      e.preventDefault();
    }

    setTeacherPagination(prev => ({ ...prev, page: 1 }));

    if (selectedSourceSchool) {
      fetchTeachersForSchool(selectedSourceSchool, 1, searchQuery, teacherPagination.limit);
    } else {
      fetchAllTeachers(1, searchQuery, teacherPagination.limit);
    }

    if (searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  };

  // Source location handlers
  const handleSourceProvinceChange = async (provinceId) => {
    setSelectedSourceProvince(provinceId);
    setSelectedSourceDistrict('');
    setSelectedSourceSchool('');
    setTeachers([]);
    setAllSelectedTeacherIds(new Set());
    setSelectedTeachersMap(new Map());
    setTeacherPagination({ page: 1, limit: 9, total: 0, pages: 1 });

    if (!provinceId) {
      setSourceDistricts([]);
      setSourceSchools([]);
      return;
    }

    try {
      setSourceLoading(true);
      const response = await locationService.getDistrictsByProvince(String(provinceId));
      const districtsData = response.data || response;
      setSourceDistricts(Array.isArray(districtsData) ? districtsData : []);
      setSourceSchools([]);
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadDistricts', 'Failed to load districts'),
      });
      setSourceDistricts([]);
      setSourceSchools([]);
    } finally {
      setSourceLoading(false);
    }
  };

  const handleSourceDistrictChange = async (districtCode) => {
    setSelectedSourceDistrict(districtCode);
    setSelectedSourceSchool('');
    setTeachers([]);
    setAllSelectedTeacherIds(new Set());
    setSelectedTeachersMap(new Map());
    setTeacherPagination({ page: 1, limit: 50, total: 0, pages: 1 });

    if (!districtCode) {
      setSourceSchools([]);
      return;
    }

    try {
      setSourceLoading(true);
      const districtObj = sourceDistricts.find(d => d.district_code === districtCode);
      const districtId = districtObj?.district_id || districtObj?.id || districtObj?.districtId;

      if (!districtId) {
        throw new Error('District ID not found');
      }

      const response = await schoolService.getSchoolsByDistrict(districtId);
      const schoolsData = response.data || [];
      setSourceSchools(Array.isArray(schoolsData) ? schoolsData : []);
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadSchools', 'Failed to load schools'),
      });
      setSourceSchools([]);
    } finally {
      setSourceLoading(false);
    }
  };

  const handleSourceSchoolChange = (value) => {
    setSelectedSourceSchool(value);
    // Reset search and pagination; actual fetch will happen on Apply
    setSearchQuery('');
    setTeacherPagination({ page: 1, limit: 9, total: 0, pages: 1 });
    // Clear current teachers and selection when changing source school
    setTeachers([]);
    setAllSelectedTeacherIds(new Set());
    setSelectedTeachersMap(new Map());
  };

  const handleResetSourceFilters = () => {
    setSelectedSourceProvince('');
    setSelectedSourceDistrict('');
    setSelectedSourceSchool('');
    setSelectedStatusFilter('all');
    setSelectedRoleFilter('8');
    setSourceDistricts([]);
    setSourceSchools([]);
    setTeachers([]);
    setSearchQuery('');
    setTeacherPagination({ page: 1, limit: 9, total: 0, pages: 1 });
    setAllSelectedTeacherIds(new Set());
    setSelectedTeachersMap(new Map());
    setIsSourceFilterOpen(false);
  };

  const handleApplySourceFilters = () => {
    // Only fetch when a source school is selected
    if (selectedSourceSchool) {
      fetchTeachersForSchool(selectedSourceSchool, 1, searchQuery, teacherPagination.limit);
    } else {
      // If no specific school is chosen, fall back to all teachers
      fetchAllTeachers(1, searchQuery, teacherPagination.limit);
    }
    // Close the sidebar after applying filters
    setIsSourceFilterOpen(false);
  };

  const handleTeacherPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= teacherPagination.pages) {
      setTeacherPagination(prev => ({ ...prev, page: newPage }));
      if (selectedSourceSchool) {
        fetchTeachersForSchool(selectedSourceSchool, newPage, searchQuery, teacherPagination.limit);
      } else {
        fetchAllTeachers(newPage, searchQuery, teacherPagination.limit);
      }
    }
  };

  const handleLimitChange = (newLimit) => {
    setTeacherPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    if (selectedSourceSchool) {
      fetchTeachersForSchool(selectedSourceSchool, 1, searchQuery, newLimit);
    } else {
      fetchAllTeachers(1, searchQuery, newLimit);
    }
  };

  // Modal handlers
  const openTransferModal = async () => {
    try {
      setShowTransferModal(true);
      setTargetLoading(true);
      // Load target provinces when modal opens
      const response = await locationService.getProvinces();
      const provincesData = response.data || response;
      setTargetProvinces(provincesData);
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadProvinces', 'Failed to load provinces'),
      });
    } finally {
      setTargetLoading(false);
    }
  };

  const closeTransferModal = () => {
    setShowTransferModal(false);
    setTransferModalTab('transfer');
    setSelectedTargetProvince('');
    setSelectedTargetDistrict('');
    setSelectedTargetSchool('');
    setTargetDistricts([]);
    setTargetSchools([]);
  };

  // Target location handlers in modal
  const handleTargetProvinceChange = async (provinceId) => {
    setSelectedTargetProvince(provinceId);
    setSelectedTargetDistrict('');
    setSelectedTargetSchool('');

    if (!provinceId) {
      setTargetDistricts([]);
      setTargetSchools([]);
      return;
    }

    try {
      setTargetLoading(true);
      const response = await locationService.getDistrictsByProvince(String(provinceId));
      const districtsData = response.data || response;
      setTargetDistricts(Array.isArray(districtsData) ? districtsData : []);
      setTargetSchools([]);
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadDistricts', 'Failed to load districts'),
      });
      setTargetDistricts([]);
      setTargetSchools([]);
    } finally {
      setTargetLoading(false);
    }
  };

  const handleTargetDistrictChange = async (districtCode) => {
    setSelectedTargetDistrict(districtCode);
    setSelectedTargetSchool('');

    if (!districtCode) {
      setTargetSchools([]);
      return;
    }

    try {
      setTargetLoading(true);
      const districtObj = targetDistricts.find(d => d.district_code === districtCode);
      const districtId = districtObj?.district_id || districtObj?.id || districtObj?.districtId;

      if (!districtId) {
        throw new Error('District ID not found');
      }

      const response = await schoolService.getSchoolsByDistrict(districtId);
      const schoolsData = response.data || [];
      setTargetSchools(Array.isArray(schoolsData) ? schoolsData : []);
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadSchools', 'Failed to load schools'),
      });
      setTargetSchools([]);
    } finally {
      setTargetLoading(false);
    }
  };

  const handleTargetSchoolChange = (value) => {
    setSelectedTargetSchool(value);
  };

  const handleSelectTeacher = (teacher) => {
    const teacherId = teacher.id;
    const newSelected = new Set(allSelectedTeacherIds);
    const newMap = new Map(selectedTeachersMap);

    if (newSelected.has(teacherId)) {
      newSelected.delete(teacherId);
      newMap.delete(teacherId);
    } else {
      newSelected.add(teacherId);
      newMap.set(teacherId, teacher);
    }

    setAllSelectedTeacherIds(newSelected);
    setSelectedTeachersMap(newMap);
  };

  const handleSelectAllTeachers = () => {
    if (allSelectedTeacherIds.size === teachers.length && teachers.length > 0) {
      // Deselect all
      setAllSelectedTeacherIds(new Set());
      setSelectedTeachersMap(new Map());
    } else {
      // Select all
      const newSelected = new Set(teachers.map(t => t.id));
      const newMap = new Map(teachers.map(t => [t.id, t]));
      setAllSelectedTeacherIds(newSelected);
      setSelectedTeachersMap(newMap);
    }
  };

  const handleResetPassword = (teacher) => {
    setSelectedTeacherForReset(teacher);
    setShowResetPasswordModal(true);
  };

  const handleCloseResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setSelectedTeacherForReset(null);
  };

  const handleDeleteUser = (teacher) => {
    setSelectedTeacherForDelete(teacher);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedTeacherForDelete) return;

    try {
      setIsDeleting(true);
      clearError();

      const response = await userService.deleteUser(selectedTeacherForDelete.userId);

      console.log('Delete response:', response, 'Status:', response?.status);

      // Check if deletion was successful
      // API may return { success: true }, { success: false }, or no success field
      const isSuccess = response?.success !== false && response?.error === undefined;

      if (isSuccess) {
        // Remove teacher from the list
        setTeachers(prev => prev.filter(t => t.userId !== selectedTeacherForDelete.userId));
        // Remove from selection if selected
        const newSelected = new Set(allSelectedTeacherIds);
        newSelected.delete(selectedTeacherForDelete.id);
        setAllSelectedTeacherIds(newSelected);

        const newMap = new Map(selectedTeachersMap);
        newMap.delete(selectedTeacherForDelete.id);
        setSelectedTeachersMap(newMap);

        showSuccess(t('userDeletedSuccessfully', `${getFullName(selectedTeacherForDelete)} has been deleted successfully`));
        setShowDeleteConfirm(false);
        setSelectedTeacherForDelete(null);
      } else {
        throw new Error(response?.error || 'Failed to delete user');
      }
    } catch (err) {
      console.error('Delete user error:', err);
      handleError(err, {
        toastMessage: t('deleteUserFailed', 'Failed to delete user'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setSelectedTeacherForDelete(null);
  };

  const handleToggleUserStatus = (teacher) => {
    setSelectedTeacherForStatus(teacher);
    setShowStatusDialog(true);
  };

  const handleConfirmStatusChange = async () => {
    if (!selectedTeacherForStatus) return;

    try {
      const newStatus = !selectedTeacherForStatus.isActive;
      setIsTogglingStatus(true);
      clearError();
      console.log(`Toggling teacher ${selectedTeacherForStatus.userId} status from ${selectedTeacherForStatus.isActive} to ${newStatus}`);

      // Call API to update status
      const response = await userService.updateUserActiveStatus(selectedTeacherForStatus.userId, newStatus);

      if (response && response.success !== false) {
        // Update the teacher in the list
        const updatedTeachers = teachers.map(t => {
          if (t.userId === selectedTeacherForStatus.userId) {
            return {
              ...t,
              isActive: newStatus
            };
          }
          return t;
        });

        setTeachers(updatedTeachers);

        // Update selectedTeachersMap to remove disabled teachers
        if (!newStatus) {
          const newSelectedIds = new Set(allSelectedTeacherIds);
          const newSelectedMap = new Map(selectedTeachersMap);
          newSelectedIds.delete(selectedTeacherForStatus.id);
          newSelectedMap.delete(selectedTeacherForStatus.id);
          setAllSelectedTeacherIds(newSelectedIds);
          setSelectedTeachersMap(newSelectedMap);
        }

        showSuccess(
          newStatus
            ? t('teacherActivatedSuccess', 'Teacher activated successfully')
            : t('teacherDeactivatedSuccess', 'Teacher deactivated successfully')
        );

        // Optionally refetch to ensure consistency
        if (selectedSourceSchool) {
          fetchTeachersForSchool(selectedSourceSchool, teacherPagination.page, searchQuery, teacherPagination.limit);
        } else {
          fetchAllTeachers(teacherPagination.page, searchQuery, teacherPagination.limit);
        }
      } else {
        showError(response?.error || t('failedToUpdateStatus', 'Failed to update teacher status'));
      }
    } catch (err) {
      console.error('Error toggling teacher status:', err);
      handleError(err, {
        toastMessage: t('errorUpdatingTeacherStatus', 'Failed to update teacher status')
      });
    } finally {
      setIsTogglingStatus(false);
      setShowStatusDialog(false);
      setSelectedTeacherForStatus(null);
    }
  };

  const handleCancelStatusChange = () => {
    setShowStatusDialog(false);
    setSelectedTeacherForStatus(null);
  };

  const handleExportTeachers = async () => {
    if (teachers.length === 0) {
      handleError(new Error(t('noTeachersToExport', 'No teachers to export')));
      return;
    }

    try {
      setShowExportProgress(true);
      setExportProgress(0);
      setExportStatus('processing');

      // Start fetching all teachers without pagination limit
      setExportProgress(50);
      setExportStatus('processing');

      let allTeachersData = [];
      let hasMore = true;
      let page = 1;

      if (selectedSourceSchool) {
        // Fetch teachers from specific school in batches of 100
        while (hasMore) {
          const response = await api.teacher.getTeachersBySchool(selectedSourceSchool, {
            page: page,
            limit: 100,
            search: searchQuery.trim() || undefined
          });

          if (!response.success || !response.data) {
            break;
          }

          const mappedTeachers = (response.data || []).map(teacher => ({
            id: teacher.teacherId || teacher.id,
            teacherId: teacher.teacherId,
            userId: teacher.userId,
            username: teacher.user?.username || '',
            firstName: teacher.user?.first_name || '',
            lastName: teacher.user?.last_name || '',
            email: teacher.user?.email || '',
            phone: teacher.user?.phone || '',
            gradeLevel: teacher.gradeLevel || null,
            roleId: teacher.roleId,
            schoolId: teacher.schoolId,
            schoolName: teacher.school?.name || '',
            schoolCode: teacher.school?.code || sourceSchools.find(s => s.id.toString() === selectedSourceSchool)?.code || '',
            status: teacher.status,
            classes: teacher.classes || []
          }));

          allTeachersData = allTeachersData.concat(mappedTeachers);

          // Check if there are more pages
          if (response.pagination && response.pagination.pages) {
            hasMore = page < response.pagination.pages;
          } else {
            hasMore = mappedTeachers.length === 100;
          }

          page++;
        }
      } else {
        // Fetch all teachers globally in batches of 100
        while (hasMore) {
          const response = await api.teacher.getAllTeachers({
            page: page,
            limit: 100,
            search: searchQuery.trim() || undefined
          });

          if (!response.success || !response.data) {
            break;
          }

          const mappedTeachers = (response.data || []).map(teacher => ({
            id: teacher.teacherId || teacher.id,
            teacherId: teacher.teacherId,
            userId: teacher.userId,
            username: teacher.user?.username || '',
            firstName: teacher.user?.first_name || '',
            lastName: teacher.user?.last_name || '',
            email: teacher.user?.email || '',
            phone: teacher.user?.phone || '',
            gradeLevel: teacher.gradeLevel || null,
            roleId: teacher.roleId,
            schoolId: teacher.schoolId,
            schoolName: teacher.school?.name || '',
            schoolCode: teacher.school?.code || '',
            status: teacher.status,
            classes: teacher.classes || []
          }));

          allTeachersData = allTeachersData.concat(mappedTeachers);

          // Check if there are more pages
          if (response.pagination && response.pagination.pages) {
            hasMore = page < response.pagination.pages;
          } else {
            hasMore = mappedTeachers.length === 100;
          }

          page++;
        }
      }

      setExportProgress(60);

      // Prepare export data with teacher-specific columns
      const exportData = allTeachersData.map(teacher => ({
        [t('schoolCode', 'លេខសាលា')]: teacher.schoolCode || '',
        [t('school', 'សាលា')]: teacher.schoolName || '',
        [t('firstName', 'នាមខ្លួន')]: teacher.firstName || '',
        [t('lastName', 'នាមត្រកូល')]: teacher.lastName || '',
        [t('fullName', 'ឈ្មោះពេញ')]: getFullName(teacher),
        [t('role', 'តួនាទី')]: getRoleName(teacher.roleId) || '',
      }));

      setExportProgress(75);

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Teachers');

      // Auto-size columns
      const range = XLSX.utils.decode_range(ws['!ref']);
      const colWidths = [];
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxWidth = 0;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
          const cell = ws[cellAddress];
          if (cell && cell.v) {
            const cellLength = cell.v.toString().length;
            if (cellLength > maxWidth) {
              maxWidth = cellLength;
            }
          }
        }
        colWidths.push({ wch: Math.min(maxWidth + 2, 50) });
      }
      ws['!cols'] = colWidths;

      setExportProgress(90);

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const schoolName = selectedSourceSchool
        ? sourceSchools.find(s => s.id.toString() === selectedSourceSchool)?.name || 'All_Schools'
        : 'All_Schools';
      const filename = `teacher_transfer_${schoolName.replace(/\s+/g, '_')}_${timestamp}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      setExportProgress(100);
      setExportStatus('success');

      // Auto-close after 1 second
      setTimeout(() => {
        setShowExportProgress(false);
        setExportProgress(0);
        setExportStatus('processing');
      }, 1000);
    } catch (err) {
      setExportStatus('error');
      handleError(err, {
        toastMessage: t('exportFailed', 'Failed to export teachers'),
      });
      setTimeout(() => {
        setShowExportProgress(false);
        setExportProgress(0);
        setExportStatus('processing');
      }, 1500);
    }
  };

  const handleTransferTeachers = async () => {
    const selectedTeachersArray = Array.from(allSelectedTeacherIds);

    if (!selectedTargetSchool || selectedTeachersArray.length === 0) {
      handleError(new Error('Please select target school and at least one teacher'));
      return;
    }

    if (selectedSourceSchool === selectedTargetSchool) {
      handleError(new Error('Source and target schools must be different'));
      return;
    }

    try {
      setTransferring(true);
      clearError();
      startLoading('transferTeachers', t('transferringTeachers', 'Transferring teachers...'));

      // Transfer each selected teacher using the dedicated transfer endpoint
      const transferPromises = selectedTeachersArray.map(teacherId =>
        api.teacher.transferTeacherToSchool(teacherId, selectedTargetSchool)
      );

      const results = await Promise.allSettled(transferPromises);

      // Count successes and failures
      const successful = results.filter(r => r.status === 'fulfilled' && r.value?.success).length;
      const failed = results.filter(r => r.status === 'rejected' || !r.value?.success).length;

      if (successful > 0) {
        // Refresh teachers list
        fetchTeachersForSchool(selectedSourceSchool);

        const message = failed === 0
          ? t('transferSuccessful', `${successful} teacher(s) transferred successfully`)
          : t('partialTransferSuccess', `${successful} transferred, ${failed} failed`);

        alert(message);

        // Close modal and reset selections
        closeTransferModal();
        setAllSelectedTeacherIds(new Set());
        setSelectedTeachersMap(new Map());
      }

      if (failed > 0) {
        handleError(new Error(`${failed} transfer(s) failed`));
      }
    } catch (err) {
      handleError(err, {
        toastMessage: t('transferFailed', 'Teacher transfer failed'),
      });
    } finally {
      stopLoading('transferTeachers');
      setTransferring(false);
    }
  };

  const handleBulkDeleteTeachers = async () => {
    if (allSelectedTeacherIds.size === 0) {
      handleError(new Error('Please select at least one teacher to delete'));
      return;
    }

    try {
      setBulkDeleting(true);
      clearError();
      startLoading('bulkDelete', t('deletingTeachers', 'Deleting teachers...'));

      const userIds = Array.from(allSelectedTeacherIds).map(id => {
        const teacher = selectedTeachersMap.get(id) || teachers.find(t => t.id === id);
        return teacher?.userId;
      }).filter(Boolean);

      const response = await userService.bulkDelete(userIds);

      const { success = 0, failed = 0, results = [] } = response || {};

      // Remove deleted teachers from the list
      const deletedUserIds = new Set(results
        .filter(r => r.status === 'deleted')
        .map(r => r.userId));

      setTeachers(prev => prev.filter(t => !deletedUserIds.has(t.userId)));

      // Remove from selection
      const newSelectedIds = new Set(allSelectedTeacherIds);
      const newSelectedMap = new Map(selectedTeachersMap);
      deletedUserIds.forEach(userId => {
        const teacher = Array.from(selectedTeachersMap.values()).find(t => t.userId === userId);
        if (teacher) {
          newSelectedIds.delete(teacher.id);
          newSelectedMap.delete(teacher.id);
        }
      });

      setAllSelectedTeacherIds(newSelectedIds);
      setSelectedTeachersMap(newSelectedMap);

      if (success > 0) {
        const message = failed === 0
          ? t('operationSuccessful', `${success} teacher(s) deleted successfully`)
          : t('operationFailed', `${success} deleted, ${failed} failed`);

        showSuccess(message);
        closeTransferModal();

        // Refetch teachers with current filters to refresh data while preserving filters
        fetchTeachersForSchool(selectedSourceSchool, teacherPagination.page, searchQuery);
      }

      if (failed > 0) {
        handleError(new Error(`${failed} deletion(s) failed`));
      }
    } catch (err) {
      handleError(err, {
        toastMessage: t('bulkDeleteFailed', 'Failed to delete teachers'),
      });
    } finally {
      stopLoading('bulkDelete');
      setBulkDeleting(false);
    }
  };

  const getProvinceOptions = (provinces) => {
    return provinces.map(province => ({
      value: province.id.toString(),
      label: province.province_name_kh || province.province_name_en,
    }));
  };

  const getDistrictOptions = (districts) => {
    return districts.map(district => ({
      value: district.district_code,
      label: district.district_name_kh || district.district_name_en,
    }));
  };

  const getSchoolOptions = (schools) => {
    return schools.map(school => ({
      value: school.id.toString(),
      label: school.name || `School ${school.id}`,
    }));
  };

  const sourceProvinceOptions = getProvinceOptions(sourceProvinces);
  const sourceDistrictOptions = getDistrictOptions(sourceDistricts);
  const sourceSchoolOptions = getSchoolOptions(sourceSchools);

  const targetProvinceOptions = getProvinceOptions(targetProvinces);
  const targetDistrictOptions = getDistrictOptions(targetDistricts);
  const targetSchoolOptions = getSchoolOptions(targetSchools);

  if (initialLoading) {
    return <PageLoader message={t('loadingProvinces', 'Loading provinces...')} className="min-h-screen bg-gray-50" />;
  }

  return (
    <>
      <PageTransition variant="fade" className="flex-1 min-h-screen bg-gray-50">
        <div className="p-3 sm:p-6 space-y-6">
        {/* Header */}
        <FadeInSection delay={200} className='px-3'>
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {t('teachersManagement', 'Teacher Transfer')}
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {t('transferTeachersDesc', 'Manage & Transfer teacher by school')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetSourceFilters}
                disabled={sourceLoading}
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => setIsSourceFilterOpen(true)}
                size="sm"
              >
                <ListFilter className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </FadeInSection>

        {/* Error Display */}
        {error && (
          <FadeInSection delay={150}>
            <ErrorDisplay error={error} />
          </FadeInSection>
        )}
        {/* Teachers List Card */}
        <FadeInSection delay={250}>
          <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-shadow rounded-sm">
            <CardHeader className="space-y-4 bg-white border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                    <span className="inline-block w-1 h-6 bg-green-600 rounded"></span>
                    <span>{t('selectTeachers', 'Select Teachers')}</span>
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {teacherPagination.total > 0
                      ? `${t('showing', 'Showing')} ${(teacherPagination.page - 1) * teacherPagination.limit + 1}-${Math.min(teacherPagination.page * teacherPagination.limit, teacherPagination.total)} ${t('of', 'of')} ${teacherPagination.total}`
                      : t('noDataAvailable', 'No data available')}
                  </p>
                </div>
                {teachers.length > 0 && (
                  <div className="flex items-center space-x-2">
                    {/* Select All Button */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAllTeachers}
                      disabled={fetchingTeachers}
                      className="whitespace-nowrap"
                    >
                      {allSelectedTeacherIds.size === teachers.length && teachers.length > 0
                        ? t('deselectAll', 'Deselect All')
                        : t('selectAll', 'Select All')}
                    </Button>

                    {/* Export Button - Always show when teachers exist */}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleExportTeachers}
                      disabled={fetchingTeachers}
                      className="whitespace-nowrap"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      {t('export', 'Export')}
                    </Button>

                    {/* Transfer Button - Only show when teachers are selected */}
                    {allSelectedTeacherIds.size > 0 && (
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        disabled={transferring}
                        onClick={openTransferModal}
                        className="whitespace-nowrap"
                      >
                        {t('proceedToTransfer', `Transfer ${allSelectedTeacherIds.size} Teacher(s)`)}
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Active Filters Display */}
              {(selectedSourceProvince || selectedSourceDistrict || selectedSourceSchool || (selectedStatusFilter && selectedStatusFilter !== 'all') || (selectedRoleFilter && selectedRoleFilter !== '8')) && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-blue-900">{t('activeFilters', 'Active Filters')}:</span>
                    {selectedSourceProvince && (
                      <Badge color="blue" variant="filled" size="sm">
                        {t('province', 'Province')}: {sourceProvinces.find(p => p.id.toString() === selectedSourceProvince)?.province_name_kh || sourceProvinces.find(p => p.id.toString() === selectedSourceProvince)?.province_name_en}
                      </Badge>
                    )}
                    {selectedSourceDistrict && (
                      <Badge color="blue" variant="filled" size="sm">
                        {t('district', 'District')}: {sourceDistricts.find(d => d.district_code === selectedSourceDistrict)?.district_name_kh || sourceDistricts.find(d => d.district_code === selectedSourceDistrict)?.district_name_en}
                      </Badge>
                    )}
                    {selectedSourceSchool && (
                      <Badge color="green" variant="filled" size="sm">
                        {t('school', 'School')}: {sourceSchools.find(s => s.id.toString() === selectedSourceSchool)?.name}
                      </Badge>
                    )}
                    {selectedStatusFilter && selectedStatusFilter !== 'all' && (
                      <Badge color="orange" variant="filled" size="sm">
                        {t('status', 'Status')}: {selectedStatusFilter === 'active' ? t('active', 'Active') : t('inactive', 'Inactive')}
                      </Badge>
                    )}
                    {selectedRoleFilter && selectedRoleFilter !== '8' && (
                      <Badge color="purple" variant="filled" size="sm">
                        {t('role', 'Role')}: {roleOptions.find(r => r.value === selectedRoleFilter)?.label || selectedRoleFilter}
                      </Badge>
                    )}
                  </div>
              )}

              {/* Search Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('searchTeacher', 'Search Teachers')}
                </label>
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder={t('searchTeachers', 'Search by name, username, or email...')}
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      disabled={fetchingTeachers}
                      className="w-full text-sm px-4 py-2.5 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
                    />
                    <svg className="absolute left-3 top-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={fetchingTeachers}
                  >
                    {t('search', 'Search')}
                  </Button>
                </form>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {fetchingTeachers ? (
                <div className="flex items-center justify-center py-12">
                  <PageLoader message={t('loadingTeachers', 'Loading teachers...')} />
                </div>
              ) : teachers.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={t('noTeachersFound', 'No Teachers Found')}
                  description={t('noTeachersInSchool', 'No teachers available in this school')}
                  variant="neutral"
                />
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                    {teachers.map((teacher) => (
                      <TeacherContextMenu
                        key={teacher.id}
                        teacher={teacher}
                        onResetPassword={handleResetPassword}
                        onDelete={handleDeleteUser}
                        onToggleActiveStatus={handleToggleUserStatus}
                      >
                        <div
                          className={
                            `bg-white rounded-sm border hover:border-blue-400 hover:shadow-md transition-all duration-200 flex justify-between items-start p-4 ` +
                            (teacher.isActive === false ? 'opacity-50 ' : '') +
                            (allSelectedTeacherIds.has(teacher.id)
                              ? 'border-blue-500 ring-2 ring-blue-200'
                              : 'border-gray-200')
                          }
                        >
                        <div className="space-3">
                          <div>
                            {/* Teacher name */}
                            <div>
                              <label
                                htmlFor={`teacher-${teacher.id}`}
                                className="font-semibold text-gray-900 text-sm cursor-pointer line-clamp-2 hover:text-blue-600"
                              >
                                {getFullName(teacher)}
                              </label>
                            </div>

                            {/* Username */}
                            <div className="text-xs text-gray-500">
                              {teacher.username}
                            </div>

                            {/* School */}
                            {teacher.schoolName && (
                              <div className="text-xs text-gray-500">
                                {teacher.schoolName}
                              </div>
                            )}

                            {/* Grade level and role */}
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {teacher.isActive === false && (
                                <Badge color="red" variant="filled" size="sm">
                                  {t('inactive', 'Inactive')}
                                </Badge>
                              )}
                              {teacher.gradeLevel && (
                                <Badge color="blue" variant="outlined" size="sm">
                                  {t('gradeLevelShort', 'Grade')} {teacher.gradeLevel}
                                </Badge>
                              )}
                              {teacher.roleId && (
                                <Badge color="blue" variant="outline" size="sm">
                                  {getRoleName(teacher.roleId)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Checkbox */}
                        <div className="flex items-start">
                          <input
                            type="checkbox"
                            id={`teacher-${teacher.id}`}
                            checked={allSelectedTeacherIds.has(teacher.id)}
                            onChange={() => handleSelectTeacher(teacher)}
                            disabled={teacher.isActive === false}
                            className={`w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 mt-0.5 ${
                              teacher.isActive === false
                                ? 'cursor-not-allowed opacity-50 bg-gray-100'
                                : 'cursor-pointer'
                            }`}
                          />
                        </div>

                        </div>
                      </TeacherContextMenu>
                    ))}
                  </div>

                  {/* Pagination Component with built-in Limit Selector */}
                  <Pagination
                    currentPage={teacherPagination.page}
                    totalPages={teacherPagination.pages}
                    total={teacherPagination.total}
                    limit={teacherPagination.limit}
                    onPageChange={handleTeacherPageChange}
                    onLimitChange={handleLimitChange}
                    limitOptions={limitOptions.map(opt => opt.value)}
                    showLimitSelector={true}
                    t={t}
                    showFirstLast={true}
                    showInfo={true}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </FadeInSection>

        {/* Transfer Modal */}
        <Modal
          isOpen={showTransferModal}
          onClose={closeTransferModal}
          title={t('teacherActions', 'Teacher Actions')}
          size="full"
          height="full"
          closeOnOverlayClick={!transferring && !bulkDeleting}
          showCloseButton={!transferring && !bulkDeleting}
          footer={
            <div className="flex items-center justify-end space-x-3 w-full">
              <Button
                type="button"
                variant="outline"
                disabled={transferring || bulkDeleting}
                onClick={closeTransferModal}
                size="sm"
              >
                {t('cancel', 'Cancel')}
              </Button>
              {transferModalTab === 'transfer' && (
                <Button
                  type="button"
                  variant="primary"
                  disabled={
                    transferring ||
                    !selectedTargetSchool ||
                    selectedSourceSchool === selectedTargetSchool
                  }
                  onClick={handleTransferTeachers}
                  size='sm'
                >
                  {transferring
                    ? t('transferring', 'Transferring...')
                    : t('transfer', 'Transfer')}
                </Button>
              )}
              {transferModalTab === 'bulkDelete' && (
                <Button
                  type="button"
                  variant="danger"
                  disabled={bulkDeleting || allSelectedTeacherIds.size === 0}
                  onClick={handleBulkDeleteTeachers}
                  size='sm'
                >
                  {bulkDeleting
                    ? t('deleting', 'Deleting...')
                    : t('deleteSelected', 'Delete Selected')}
                </Button>
              )}
            </div>
          }
          stickyFooter={true}
        >
          {/* Tab Navigation */}
          <div className="flex gap-2 mb-6 border-b border-gray-200">
            <button
              onClick={() => setTransferModalTab('transfer')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                transferModalTab === 'transfer'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              {t('transfer', 'Transfer')}
            </button>
            <button
              onClick={() => setTransferModalTab('bulkDelete')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                transferModalTab === 'bulkDelete'
                  ? 'text-red-600 border-red-600'
                  : 'text-gray-600 border-transparent hover:text-gray-900'
              }`}
            >
              {t('bulkDelete', 'Bulk Delete')}
            </button>
          </div>

          {/* Tab Content */}
          {transferModalTab === 'transfer' && (
            <div className="space-y-6">
              <div className="space-y-6">
                {/* Target School Selection */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="inline-block w-1 h-5 bg-purple-600 rounded"></span>
                    <h3 className="text-base font-semibold text-gray-900">
                      {t('selectSchool', 'Choose Target School')}
                    </h3>
                  </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Target Province */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('province', 'Province')}
                    </label>
                    <Dropdown
                      options={getProvinceOptions(targetProvinces)}
                      value={selectedTargetProvince}
                      onValueChange={handleTargetProvinceChange}
                      placeholder={t('selectProvince', 'Select Province')}
                      className="w-full"
                      disabled={targetLoading || transferring}
                    />
                  </div>

                  {/* Target District */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('district', 'District')}
                    </label>
                    <Dropdown
                      options={getDistrictOptions(targetDistricts)}
                      value={selectedTargetDistrict}
                      onValueChange={handleTargetDistrictChange}
                      placeholder={t('selectDistrict', 'Select District')}
                      className="w-full"
                      disabled={!selectedTargetProvince || targetLoading || transferring}
                    />
                  </div>

                  {/* Target School */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('school', 'School')} <span className="text-red-500">*</span>
                    </label>
                    <SearchableDropdown
                      options={getSchoolOptions(targetSchools)}
                      value={selectedTargetSchool}
                      onValueChange={handleTargetSchoolChange}
                      placeholder={t('selectSchool', 'Select School')}
                      searchPlaceholder={t('searchSchool', 'Search schools...')}
                      className="w-full"
                      disabled={!selectedTargetDistrict || targetLoading || transferring}
                      isLoading={targetLoading}
                      emptyMessage={t('noSchoolsFound', 'No schools found')}
                    />
                  </div>
                </div>

                {selectedTargetSchool && (
                  <div className="mt-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-green-900">
                        <span className="font-semibold">{t('targetSchool', 'Target school')}</span>: {getSchoolOptions(targetSchools).find(s => s.value === selectedTargetSchool)?.label}
                      </p>
                    </div>
                  </div>
                )}
                </div>
              </div>

              {/* Teacher List Preview - now below filters */}
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="inline-block w-1 h-5 bg-orange-600 rounded"></span>
                  <h3 className="text-base font-semibold text-gray-900">
                    {t('teachersToTransfer', 'Teachers to Transfer')}
                  </h3>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-yellow-50 rounded-lg p-4 max-h-80 overflow-y-auto border border-orange-200">
                  {selectedTeachersMap.size === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-6">
                      {t('noTeachersSelected', 'No teachers selected yet')}
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array.from(selectedTeachersMap.values()).map((teacher, idx) => (
                        <div
                          key={teacher.id}
                          className="bg-white rounded-sm border border-blue-500 ring-2 ring-blue-200 flex flex-col justify-between p-4 text-sm hover:shadow-md transition-all duration-200"
                        >
                          <div className="space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-900 text-sm line-clamp-2">
                                  {idx + 1}. {getFullName(teacher)}
                                </div>
                                <div className="text-xs text-gray-500 truncate">
                                  {teacher.username}
                                </div>
                                {teacher.schoolName && (
                                  <div className="text-xs text-gray-500 truncate">
                                    {teacher.schoolName}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {teacher.gradeLevel && (
                                <Badge color="blue" variant="outlined" size="sm">
                                  {t('gradeLevelShort', 'Grade')} {teacher.gradeLevel}
                                </Badge>
                              )}
                              {teacher.roleId && (
                                <Badge color="blue" variant="outline" size="sm">
                                  {getRoleName(teacher.roleId)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {transferModalTab === 'bulkDelete' && (
            <div className="space-y-6">
              {allSelectedTeacherIds.size > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="inline-block w-1 h-5 bg-red-600 rounded"></span>
                    <h3 className="text-sm font-semibold text-gray-900">
                      {t('selectedTeachers', 'Selected Teachers')} ({allSelectedTeacherIds.size})
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto border border-dashed border-red-300 rounded-md bg-red-50 px-3 py-2 space-y-1">
                    {Array.from(allSelectedTeacherIds).map(id => {
                      const teacher = selectedTeachersMap.get(id) || teachers.find(t => t.id === id);
                      if (!teacher) return null;
                      return (
                        <div
                          key={id}
                          className="flex items-center justify-between text-xs text-gray-700 border-b border-red-100 last:border-b-0 py-1"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {getFullName(teacher)}
                            </span>
                            {teacher.username && (
                              <span className="text-gray-500">
                                {teacher.username}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-800">
                  <span className="font-semibold">{t('warning', 'Warning')}:</span> {t('bulkDeleteWarning', 'This action will permanently delete the selected teachers. This cannot be undone.')}
                </p>
              </div>
            </div>
          )}
        </Modal>
      </div>
      </PageTransition>

      <SidebarFilter
        isOpen={isSourceFilterOpen}
        onClose={() => setIsSourceFilterOpen(false)}
        title={t('filters', 'Filters')}
        subtitle={t('selectSourceSchoolDesc', 'Choose the school where teachers are currently assigned')}
        hasFilters={Boolean(selectedSourceProvince || selectedSourceDistrict || selectedSourceSchool || (selectedStatusFilter && selectedStatusFilter !== 'all') || (selectedRoleFilter && selectedRoleFilter !== '8'))}
        overlayClassName="bg-gray-500/75"
        onApply={handleApplySourceFilters}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('province', 'Province')}
            </label>
            <Dropdown
              options={sourceProvinceOptions}
              value={selectedSourceProvince}
              onValueChange={handleSourceProvinceChange}
              placeholder={t('selectProvince', 'Select Province')}
              className="w-full"
              disabled={sourceLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('district', 'District')}
            </label>
            <Dropdown
              options={sourceDistrictOptions}
              value={selectedSourceDistrict}
              onValueChange={handleSourceDistrictChange}
              placeholder={t('selectDistrict', 'Select District')}
              className="w-full"
              disabled={!selectedSourceProvince || sourceLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('school', 'School')} <span className="text-red-500">*</span>
            </label>
            <SearchableDropdown
              options={sourceSchoolOptions}
              value={selectedSourceSchool}
              onValueChange={handleSourceSchoolChange}
              placeholder={t('selectSchool', 'Select School')}
              searchPlaceholder={t('searchSchool', 'Search schools...')}
              className="w-full"
              disabled={!selectedSourceDistrict || sourceLoading}
              isLoading={sourceLoading}
              emptyMessage={t('noSchoolsFound', 'No schools found')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('status', 'Status')}
            </label>
            <Dropdown
              options={[
                { value: 'all', label: t('all', 'All') },
                { value: 'active', label: t('active', 'Active') },
                { value: 'inactive', label: t('inactive', 'Inactive') }
              ]}
              value={selectedStatusFilter}
              onValueChange={setSelectedStatusFilter}
              placeholder={t('selectStatus', 'Select Status')}
              className="w-full"
              disabled={sourceLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('role', 'Role')}
            </label>
            <Dropdown
              options={roleOptions}
              value={selectedRoleFilter}
              onValueChange={setSelectedRoleFilter}
              placeholder={t('selectRole', 'Select Role')}
              className="w-full"
              disabled={sourceLoading}
            />
          </div>
        </div>
      </SidebarFilter>

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={handleCloseResetPasswordModal}
        teacher={selectedTeacherForReset}
        userType="teacher"
      />

      {/* Export Progress Modal */}
      <ExportProgressModal
        isOpen={showExportProgress}
        progress={exportProgress}
        status={exportStatus}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title={t('deleteUser', 'Delete User')}
        message={selectedTeacherForDelete ? t('confirmDeleteUser', `Are you sure you want to delete ${getFullName(selectedTeacherForDelete)}? This action cannot be undone.`) : ''}
        type="danger"
        confirmText={t('delete', 'Delete')}
        cancelText={t('cancel', 'Cancel')}
        loading={isDeleting}
      />

      {/* Status Change Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showStatusDialog}
        onClose={handleCancelStatusChange}
        onConfirm={handleConfirmStatusChange}
        title={t('changeUserStatus', 'Change User Status')}
        message={selectedTeacherForStatus
          ? t('confirmStatusChange', `Are you sure you want to ${selectedTeacherForStatus.isActive ? 'disable' : 'enable'} ${getFullName(selectedTeacherForStatus)}?`)
          : ''}
        type="warning"
        confirmText={t('confirm', 'Confirm')}
        cancelText={t('cancel', 'Cancel')}
        loading={isTogglingStatus}
      />
    </>
  );
};

export default TeacherTransferManagement;
