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
import StudentContextMenu from '../../components/admin/StudentContextMenu';
import ResetPasswordModal from '../../components/admin/ResetPasswordModal';
import ExportProgressModal from '../../components/modals/ExportProgressModal';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { userService } from '../../utils/api/services/userService';
import { getFullName } from '../../utils/usernameUtils';
import { formatClassIdentifier } from '../../utils/helpers';
import locationService from '../../utils/api/services/locationService';
import schoolService from '../../utils/api/services/schoolService';
import classService from '../../utils/api/services/classService';
import { studentService } from '../../utils/api/services/studentService';
import { gradeLevelOptions as sharedGradeLevelOptions } from '../../utils/formOptions';
import { Users, ListFilter, RotateCcw, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const StudentTransferManagement = () => {
  const { t } = useLanguage();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError } = useErrorHandler();
  const { showSuccess } = useToast();

  const [sourceProvinces, setSourceProvinces] = useState([]);
  const [sourceDistricts, setSourceDistricts] = useState([]);
  const [sourceSchools, setSourceSchools] = useState([]);
  const [selectedSourceProvince, setSelectedSourceProvince] = useState('');
  const [selectedSourceDistrict, setSelectedSourceDistrict] = useState('');
  const [selectedSourceSchool, setSelectedSourceSchool] = useState('');
  const [selectedGradeLevel, setSelectedGradeLevel] = useState('all');

  const [students, setStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [selectedStudentsMap, setSelectedStudentsMap] = useState(new Map());
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);

  const [isSourceFilterOpen, setIsSourceFilterOpen] = useState(false);

  // Reset password modal state
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedStudentForReset, setSelectedStudentForReset] = useState(null);

  // Delete confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedStudentForDelete, setSelectedStudentForDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferModalTab, setTransferModalTab] = useState('transfer'); // 'transfer' or 'bulkDelete'
  const [targetProvinces, setTargetProvinces] = useState([]);
  const [targetDistricts, setTargetDistricts] = useState([]);
  const [targetSchools, setTargetSchools] = useState([]);
  const [selectedTargetProvince, setSelectedTargetProvince] = useState('');
  const [selectedTargetDistrict, setSelectedTargetDistrict] = useState('');
  const [selectedTargetSchool, setSelectedTargetSchool] = useState('');
  const [selectedTargetMasterClassId, setSelectedTargetMasterClassId] = useState('');
  const [selectedTargetMasterClassLabel, setSelectedTargetMasterClassLabel] = useState('');
  const [targetLoading, setTargetLoading] = useState(false);
  const [creatingMasterClass, setCreatingMasterClass] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Export progress modal state
  const [showExportProgress, setShowExportProgress] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('processing'); // 'processing', 'success', 'error'

  const [studentPagination, setStudentPagination] = useState({
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

  useEffect(() => {
    const init = async () => {
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
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, [clearError, handleError, selectedGradeLevel, t]);

  const fetchStudentsGlobal = useCallback(async (page = 1, search = '', limit = studentPagination.limit) => {
    try {
      setFetchingStudents(true);
      clearError();

      const actualLimit = typeof limit === 'number' ? limit : parseInt(limit);
      const response = await studentService.getStudents({
        page,
        limit: actualLimit,
        search: search.trim() || '',
        gradeLevel: selectedGradeLevel && selectedGradeLevel !== 'all' ? selectedGradeLevel : undefined,
      });

      const mappedStudents = (response.data || []).map(student => ({
        id: student.studentId || student.id,
        studentId: student.studentId || student.id,
        userId: student.userId,
        username: student.username,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        gradeLevel: student.gradeLevel,
        class: student.class,
        // Preserve source school from global /students endpoint or nested school object
        schoolId: student.schoolId || student.school?.schoolId,
        schoolName: student.schoolName || student.school?.name,
        rawStudent: student // Keep raw for school fetch
      }));

      // Fetch school details for students that don't have schoolName
      const studentsWithSchoolInfo = await Promise.all(
        mappedStudents.map(async (student) => {
          // If we already have schoolName, use it
          if (student.schoolName) {
            return student;
          }

          // Otherwise, fetch school info by schoolId
          if (student.schoolId) {
            try {
              const schoolResponse = await schoolService.getSchoolById(student.schoolId);
              if (schoolResponse && schoolResponse.data) {
                return {
                  ...student,
                  schoolName: schoolResponse.data.name || ''
                };
              }
            } catch (err) {
              console.error(`Failed to fetch school info for student ${student.id}:`, err);
            }
          }

          return student;
        })
      );

      const finalStudents =
        selectedGradeLevel && selectedGradeLevel !== 'all'
          ? studentsWithSchoolInfo.filter(s => String(s.gradeLevel) === String(selectedGradeLevel))
          : studentsWithSchoolInfo;

      setStudents(finalStudents);

      const pagination = response.pagination || {
        page,
        limit: actualLimit,
        total: studentsWithSchoolInfo.length,
        pages: Math.max(1, Math.ceil(studentsWithSchoolInfo.length / actualLimit)),
      };

      setStudentPagination({
        page: pagination.page,
        limit: actualLimit,
        total: pagination.total,
        pages: pagination.pages || Math.ceil(pagination.total / actualLimit),
      });
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadStudents', 'Failed to load students'),
      });
      setStudents([]);
    } finally {
      setFetchingStudents(false);
    }
  }, [clearError, handleError, selectedGradeLevel, t]);

  const fetchStudentsForSchool = useCallback(async (schoolId, page = 1, search = '', limit = studentPagination.limit) => {
    if (!schoolId) {
      setStudents([]);
      const actualLimit = typeof limit === 'number' ? limit : parseInt(limit);
      setStudentPagination({ page: 1, limit: actualLimit, total: 0, pages: 1 });
      return;
    }

    try {
      setFetchingStudents(true);
      clearError();

      const actualLimit = typeof limit === 'number' ? limit : parseInt(limit);
      const response = await studentService.getStudentsBySchool(schoolId, {
        page,
        limit: actualLimit,
        search: search.trim() || undefined,
        gradeLevel: selectedGradeLevel && selectedGradeLevel !== 'all' ? selectedGradeLevel : undefined,
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to load students');
      }

      const mappedStudents = (response.data || []).map(student => ({
        id: student.studentId || student.id,
        studentId: student.studentId || student.id,
        userId: student.userId,
        username: student.username,
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        gradeLevel: student.gradeLevel,
        class: student.class,
        classId: student.class?.classId || student.class?.id,
        schoolId: schoolId,
        // Extract school name from nested school object or use default
        schoolName: student.school?.name,
        rawStudent: student // Keep raw for school fetch
      }));

      // Fetch school details and class info if needed
      const studentsWithSchoolInfo = await Promise.all(
        mappedStudents.map(async (student) => {
          let updatedStudent = student;

          // Fetch school info if not already available
          if (!student.schoolName && student.schoolId) {
            try {
              const schoolResponse = await schoolService.getSchoolById(student.schoolId);
              if (schoolResponse && schoolResponse.data) {
                updatedStudent = {
                  ...updatedStudent,
                  schoolName: schoolResponse.data.name || ''
                };
              }
            } catch (err) {
              console.error(`Failed to fetch school info for student ${student.id}:`, err);
            }
          }

          // Fetch class info if student has a classId
          if (student.classId) {
            try {
              const classResponse = await classService.getClassById(student.classId);
              updatedStudent = {
                ...updatedStudent,
                currentClass: classResponse
              };
            } catch (err) {
              console.error(`Failed to fetch class info for student ${student.id}:`, err);
            }
          }

          return updatedStudent;
        })
      );

      const finalStudents =
        selectedGradeLevel && selectedGradeLevel !== 'all'
          ? studentsWithSchoolInfo.filter(s => String(s.gradeLevel) === String(selectedGradeLevel))
          : studentsWithSchoolInfo;

      setStudents(finalStudents);

      if (response.pagination) {
        setStudentPagination(prev => ({
          ...prev,
          page,
          limit: actualLimit,
          total: response.pagination.total,
          pages: response.pagination.pages || response.pagination.totalPages || Math.ceil(response.pagination.total / actualLimit),
        }));
      } else {
        const totalPages = Math.ceil((studentsWithSchoolInfo?.length || 0) / actualLimit);
        setStudentPagination(prev => ({
          ...prev,
          page,
          limit: actualLimit,
          total: studentsWithSchoolInfo?.length || 0,
          pages: totalPages,
        }));
      }
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadStudents', 'Failed to load students'),
      });
      setStudents([]);
    } finally {
      setFetchingStudents(false);
    }
  }, [clearError, handleError, selectedGradeLevel, t]);

  const handleSearchChange = (value) => {
    setSearchQuery(value);
  };

  const handleSearchSubmit = (e) => {
    if (e) {
      e.preventDefault();
    }
    setStudentPagination(prev => ({ ...prev, page: 1 }));

    if (selectedSourceSchool) {
      fetchStudentsForSchool(selectedSourceSchool, 1, searchQuery, studentPagination.limit);
    } else {
      fetchStudentsGlobal(1, searchQuery, studentPagination.limit);
    }

    if (searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  };

  const handleSourceProvinceChange = async (provinceId) => {
    setSelectedSourceProvince(provinceId);
    setSelectedSourceDistrict('');
    setSelectedSourceSchool('');
    setStudents([]);
    setSelectedStudentIds(new Set());
    setSelectedStudentsMap(new Map());
    setStudentPagination({ page: 1, limit: 9, total: 0, pages: 1 });

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
    setStudents([]);
    setSelectedStudentIds(new Set());
    setSelectedStudentsMap(new Map());
    setStudentPagination({ page: 1, limit: 50, total: 0, pages: 1 });

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
    setSearchQuery('');
    setStudentPagination({ page: 1, limit: 9, total: 0, pages: 1 });
    setStudents([]);
    setSelectedStudentIds(new Set());
    setSelectedStudentsMap(new Map());
  };

  const handleResetSourceFilters = () => {
    setSelectedSourceProvince('');
    setSelectedSourceDistrict('');
    setSelectedSourceSchool('');
    setSelectedGradeLevel('all');
    setSourceDistricts([]);
    setSourceSchools([]);
    setStudents([]);
    setSearchQuery('');
    setStudentPagination({ page: 1, limit: 9, total: 0, pages: 1 });
    setSelectedStudentIds(new Set());
    setSelectedStudentsMap(new Map());
    setIsSourceFilterOpen(false);
  };

  const handleApplySourceFilters = () => {
    if (selectedSourceSchool) {
      fetchStudentsForSchool(selectedSourceSchool, 1, searchQuery, studentPagination.limit);
    }
    setIsSourceFilterOpen(false);
  };

  const handleStudentPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= studentPagination.pages) {
      setStudentPagination(prev => ({ ...prev, page: newPage }));
      if (selectedSourceSchool) {
        fetchStudentsForSchool(selectedSourceSchool, newPage, searchQuery, studentPagination.limit);
      } else {
        fetchStudentsGlobal(newPage, searchQuery, studentPagination.limit);
      }
    }
  };

  const handleLimitChange = (newLimit) => {
    setStudentPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
    if (selectedSourceSchool) {
      fetchStudentsForSchool(selectedSourceSchool, 1, searchQuery, newLimit);
    } else {
      fetchStudentsGlobal(1, searchQuery, newLimit);
    }
  };

  const openTransferModal = async () => {
    if (selectedStudentIds.size === 0) {
      handleError(new Error('Please select at least one student'));
      return;
    }

    // Provinces already loaded in initial useEffect - no need to fetch again
    // targetProvinces is already set, just open the modal
    setShowTransferModal(true);
  };

  const handleCreateMasterClass = async () => {
    if (!selectedTargetSchool) return;

    try {
      setCreatingMasterClass(true);
      clearError();

      const currentYear = new Date().getFullYear();
      const academicYear = `${currentYear}-${currentYear + 1}`;

      const payload = {
        className: `Master Class - School ${selectedTargetSchool}`,
        classCode: `MC-${academicYear}`,
        academicYear,
      };

      await classService.createMasterClassForSchool(selectedTargetSchool, payload);

      const response = await classService.getMasterClassesList(selectedTargetSchool, {
        page: 1,
        limit: 5,
      });

      const data = Array.isArray(response?.data) ? response.data : [];

      if (data.length > 0) {
        const masterClass = data[0];
        const masterClassId = String(
          masterClass.master_class_id ??
          masterClass.classId ??
          masterClass.id
        );
        const masterClassName =
          masterClass.class_name ||
          masterClass.name ||
          `${t('class', 'Class')} ${masterClassId}`;

        setSelectedTargetMasterClassId(masterClassId);
        setSelectedTargetMasterClassLabel(masterClassName);
      } else {
        setSelectedTargetMasterClassId('');
        setSelectedTargetMasterClassLabel('');
      }
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToCreateMasterClass', 'Failed to create master class'),
      });
    } finally {
      setCreatingMasterClass(false);
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
    setSelectedTargetMasterClassId('');
    setSelectedTargetMasterClassLabel('');
  };

  const handleTargetProvinceChange = async (provinceId) => {
    setSelectedTargetProvince(provinceId);
    setSelectedTargetDistrict('');
    setSelectedTargetSchool('');
    setSelectedTargetMasterClassId('');
    setSelectedTargetMasterClassLabel('');

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
    setSelectedTargetMasterClassId('');
    setSelectedTargetMasterClassLabel('');

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

  const handleTargetSchoolChange = async (value) => {
    setSelectedTargetSchool(value);
    setSelectedTargetMasterClassId('');
    setSelectedTargetMasterClassLabel('');

    if (!value) {
      return;
    }

    try {
      setTargetLoading(true);
      const response = await classService.getMasterClassesList(value, {
        page: 1,
        limit: 5,
      });

      const data = Array.isArray(response?.data) ? response.data : [];

      if (data.length > 0) {
        const masterClass = data[0];
        const masterClassId = String(
          masterClass.master_class_id ??
          masterClass.classId ??
          masterClass.id
        );
        const masterClassName =
          masterClass.class_name ||
          masterClass.name ||
          `${t('class', 'Class')} ${masterClassId}`;

        setSelectedTargetMasterClassId(masterClassId);
        setSelectedTargetMasterClassLabel(masterClassName);
      } else {
        setSelectedTargetMasterClassId('');
        setSelectedTargetMasterClassLabel('');
      }
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToLoadClasses', 'Failed to load master classes'),
      });
      setSelectedTargetMasterClassId('');
      setSelectedTargetMasterClassLabel('');
    } finally {
      setTargetLoading(false);
    }
  };

  const handleTargetMasterClassChange = (value) => {
    setSelectedTargetMasterClassId(value);
  };

  const handleSelectStudent = (student) => {
    const id = student.id;
    const newSelectedIds = new Set(selectedStudentIds);
    const newSelectedMap = new Map(selectedStudentsMap);

    if (newSelectedIds.has(id)) {
      newSelectedIds.delete(id);
      newSelectedMap.delete(id);
    } else {
      newSelectedIds.add(id);
      newSelectedMap.set(id, student);
    }

    setSelectedStudentIds(newSelectedIds);
    setSelectedStudentsMap(newSelectedMap);
  };

  const handleResetPassword = (student) => {
    setSelectedStudentForReset(student);
    setShowResetPasswordModal(true);
  };

  const handleCloseResetPasswordModal = () => {
    setShowResetPasswordModal(false);
    setSelectedStudentForReset(null);
  };

  const handleDeleteStudent = (student) => {
    setSelectedStudentForDelete(student);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedStudentForDelete) return;

    try {
      setIsDeleting(true);
      clearError();

      const response = await studentService.deleteStudent(selectedStudentForDelete.userId);

      console.log('Delete response:', response, 'Status:', response?.status);

      // Check if deletion was successful
      // API may return { success: true }, { success: false }, or no success field
      const isSuccess = response?.success !== false && response?.error === undefined;

      if (isSuccess) {
        // Remove student from the list
        setStudents(prev => prev.filter(s => s.userId !== selectedStudentForDelete.userId));
        // Remove from selection if selected
        const newSelected = new Set(selectedStudentIds);
        newSelected.delete(selectedStudentForDelete.id);
        setSelectedStudentIds(newSelected);

        const newMap = new Map(selectedStudentsMap);
        newMap.delete(selectedStudentForDelete.id);
        setSelectedStudentsMap(newMap);

        showSuccess(t('userDeletedSuccessfully', `${getFullName(selectedStudentForDelete)} has been deleted successfully`));
        setShowDeleteConfirm(false);
        setSelectedStudentForDelete(null);
      } else {
        throw new Error(response?.error || 'Failed to delete student');
      }
    } catch (err) {
      console.error('Delete student error:', err);
      handleError(err, {
        toastMessage: t('deleteUserFailed', 'Failed to delete user'),
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setSelectedStudentForDelete(null);
  };

  const handleExportStudents = async () => {
    try {
      setShowExportProgress(true);
      setExportProgress(0);
      setExportStatus('processing');
      clearError();

      let allStudentsData = [];

      // If a specific school is selected, fetch all students from that school
      if (selectedSourceSchool) {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await studentService.getStudentsBySchool(selectedSourceSchool, {
            page,
            limit: 100, // Fetch 100 at a time
            gradeLevel: selectedGradeLevel && selectedGradeLevel !== 'all' ? selectedGradeLevel : undefined,
          });

          if (!response.success || !response.data || response.data.length === 0) {
            hasMore = false;
            break;
          }

          // Map students with school info
          const mappedStudents = response.data.map(student => ({
            id: student.studentId || student.id,
            studentId: student.studentId || student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            gradeLevel: student.gradeLevel,
            schoolId: selectedSourceSchool,
            schoolName: student.school?.name || sourceSchools.find(s => s.id.toString() === selectedSourceSchool)?.name || '',
            schoolCode: student.school?.code || sourceSchools.find(s => s.id.toString() === selectedSourceSchool)?.code || '',
          }));

          allStudentsData = [...allStudentsData, ...mappedStudents];
          setExportProgress(Math.min(50, (allStudentsData.length / 1000) * 50)); // Progress up to 50%

          // Check if there are more pages
          if (response.pagination) {
            hasMore = page < response.pagination.pages || page < response.pagination.totalPages;
          } else {
            hasMore = false;
          }

          page++;
        }
      } else {
        // If no school selected, fetch all students globally
        let page = 1;
        let hasMore = true;

        while (hasMore) {
          const response = await studentService.getStudents({
            page,
            limit: 100, // Fetch 100 at a time
            gradeLevel: selectedGradeLevel && selectedGradeLevel !== 'all' ? selectedGradeLevel : undefined,
          });

          if (!response.data || response.data.length === 0) {
            hasMore = false;
            break;
          }

          // Map students with school info
          const mappedStudents = response.data.map(student => ({
            id: student.studentId || student.id,
            studentId: student.studentId || student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            gradeLevel: student.gradeLevel,
            schoolId: student.schoolId || student.school?.schoolId,
            schoolName: student.schoolName || student.school?.name || '',
            schoolCode: student.school?.code || '',
          }));

          allStudentsData = [...allStudentsData, ...mappedStudents];
          setExportProgress(Math.min(50, (allStudentsData.length / 1000) * 50)); // Progress up to 50%

          // Check if there are more pages
          if (response.pagination) {
            hasMore = page < response.pagination.pages || page < response.pagination.totalPages;
          } else {
            hasMore = false;
          }

          page++;
        }
      }

      if (allStudentsData.length === 0) {
        setShowExportProgress(false);
        handleError(new Error(t('noStudentsToExport', 'No students to export')));
        return;
      }

      setExportProgress(60); // Progress to 60% for data processing

      // Prepare data for export with school name, code, names, and grade level only
      const exportData = allStudentsData.map(student => ({
        [t('schoolCode', 'លេខសាលា')]: student.schoolCode || '',
        [t('school', 'សាលា')]: student.schoolName || '',
        [t('firstName', 'នាមខ្លួន')]: student.firstName || '',
        [t('lastName', 'នាមត្រកូល')]: student.lastName || '',
        [t('fullName', 'ឈ្មោះពេញ')]: getFullName(student),
        [t('gradeLevel', 'កម្រិតថ្នាក់')]: student.gradeLevel || '',
      }));

      setExportProgress(75); // Progress to 75% for worksheet creation

      // Create worksheet
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Students');

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

      setExportProgress(90); // Progress to 90% for file generation

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const schoolName = selectedSourceSchool
        ? sourceSchools.find(s => s.id.toString() === selectedSourceSchool)?.name || 'All_Schools'
        : 'All_Schools';
      const filename = `student_transfer_${schoolName.replace(/\s+/g, '_')}_${timestamp}.xlsx`;

      // Write file
      XLSX.writeFile(wb, filename);

      setExportProgress(100); // Complete
      setExportStatus('success');

      // Close modal after 1 second
      setTimeout(() => {
        setShowExportProgress(false);
        alert(t('exportSuccess', `Data exported successfully - ${allStudentsData.length} students`));
      }, 1000);
    } catch (err) {
      setExportStatus('error');
      setShowExportProgress(false);
      handleError(err, {
        toastMessage: t('exportFailed', 'Failed to export students'),
      });
    }
  };

  const handleTransferStudent = async () => {
    if (selectedStudentIds.size === 0 || !selectedTargetSchool || !selectedTargetMasterClassId) {
      handleError(new Error('Please select students, target school and target class'));
      return;
    }

    if (selectedSourceSchool === selectedTargetSchool) {
      handleError(new Error('Source and target schools must be different'));
      return;
    }

    try {
      setTransferring(true);
      clearError();
      startLoading('transferStudent', t('transferringStudent', 'Transferring students...'));

      const idsArray = Array.from(selectedStudentIds);

      const transferPromises = idsArray.map(id => {
        const student = selectedStudentsMap.get(id) || students.find(s => s.id === id);
        const studentId = student?.studentId || student?.id;
        if (!studentId) {
          return Promise.resolve({ success: false, error: 'Missing studentId' });
        }

        // Use the student's own source school if available (from global /students response)
        const fromSchoolId = student?.schoolId || selectedSourceSchool;

        return studentService.transferStudentBetweenMasterClasses({
          studentId,
          fromSchoolId,
          toSchoolId: selectedTargetSchool,
          toMasterClassId: selectedTargetMasterClassId,
        });
      });

      const results = await Promise.allSettled(transferPromises);

      const successful = results.filter(r => r.status === 'fulfilled' && r.value && r.value.success !== false).length;
      const failed = results.length - successful;

      if (successful > 0) {
        const message = failed === 0
          ? t('studentsTransferredSuccess', `${successful} student(s) transferred successfully`)
          : t('partialTransferSuccess', `${successful} transferred, ${failed} failed`);
        alert(message);

        closeTransferModal();
        setSelectedStudentIds(new Set());
        setSelectedStudentsMap(new Map());
        fetchStudentsForSchool(selectedSourceSchool, studentPagination.page, searchQuery);
      }

      if (failed > 0) {
        handleError(new Error(`${failed} transfer(s) failed`));
      }
    } catch (err) {
      handleError(err, {
        toastMessage: t('transferFailed', 'Student transfer failed'),
      });
    } finally {
      stopLoading('transferStudent');
      setTransferring(false);
    }
  };

  const handleBulkDeleteStudents = async () => {
    if (selectedStudentIds.size === 0) {
      handleError(new Error('Please select at least one student to delete'));
      return;
    }

    try {
      setBulkDeleting(true);
      clearError();
      startLoading('bulkDelete', t('deletingStudents', 'Deleting students...'));

      const userIds = Array.from(selectedStudentIds).map(id => {
        const student = selectedStudentsMap.get(id) || students.find(s => s.id === id);
        return student?.userId;
      }).filter(Boolean);

      const response = await userService.bulkDelete(userIds);

      const { success = 0, failed = 0, results = [] } = response || {};

      // Remove deleted students from the list
      const deletedUserIds = new Set(results
        .filter(r => r.status === 'deleted')
        .map(r => r.userId));

      setStudents(prev => prev.filter(s => !deletedUserIds.has(s.userId)));

      // Remove from selection
      const newSelectedIds = new Set(selectedStudentIds);
      const newSelectedMap = new Map(selectedStudentsMap);
      deletedUserIds.forEach(userId => {
        const student = Array.from(selectedStudentsMap.values()).find(s => s.userId === userId);
        if (student) {
          newSelectedIds.delete(student.id);
          newSelectedMap.delete(student.id);
        }
      });

      setSelectedStudentIds(newSelectedIds);
      setSelectedStudentsMap(newSelectedMap);

      if (success > 0) {
        const message = failed === 0
          ? t('studentsDeletedSuccess', `${success} student(s) deleted successfully`)
          : t('partialDeleteSuccess', `${success} deleted, ${failed} failed`);
        alert(message);

        closeTransferModal();
      }

      if (failed > 0) {
        handleError(new Error(`${failed} deletion(s) failed`));
      }
    } catch (err) {
      handleError(err, {
        toastMessage: t('bulkDeleteFailed', 'Failed to delete students'),
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
  
  const gradeLevelOptions = [
    { value: 'all', label: t('allGrades', 'All grades') },
    ...sharedGradeLevelOptions.map(option => ({
      value: option.value,
      label: option.label,
    })),
  ];


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
          <FadeInSection delay={200} className='px-3'>
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {t('studentsManagement', 'Student Transfer Between Schools')}
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  {t('transferStudentsDesc', 'Transfer a student from one school master class to another')}
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

          {error && (
            <FadeInSection delay={150}>
              <ErrorDisplay error={error} />
            </FadeInSection>
          )}

          <FadeInSection delay={250}>
            <Card className="border border-gray-200 shadow-md hover:shadow-lg transition-shadow rounded-sm">
              <CardHeader className="space-y-4 bg-white border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                      <span className="inline-block w-1 h-6 bg-green-600 rounded"></span>
                      <span>{t('selectStudent', 'Select Student')}</span>
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      {studentPagination.total > 0
                        ? `${t('showing', 'Showing')} ${(studentPagination.page - 1) * studentPagination.limit + 1}-${Math.min(studentPagination.page * studentPagination.limit, studentPagination.total)} ${t('of', 'of')} ${studentPagination.total}`
                        : t('noDataAvailable', 'No data available')}
                    </p>
                  </div>
                  {students.length > 0 && (
                    <div className="flex items-center space-x-2">
                      {/* Export Button - Always show when students exist */}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExportStudents}
                        disabled={fetchingStudents}
                        className="whitespace-nowrap"
                      >
                        <Download className="w-4 h-4 mr-1" />
                        {t('export', 'Export')}
                      </Button>

                      {/* Transfer Button - Only show when students are selected */}
                      {selectedStudentIds.size > 0 && (
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          disabled={transferring}
                          onClick={openTransferModal}
                          className="whitespace-nowrap"
                        >
                          {t('proceedToTransfer', `Transfer ${selectedStudentIds.size} Student(s)`)}
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {/* Active Filters Display */}
                {(selectedSourceProvince || selectedSourceDistrict || selectedSourceSchool || (selectedGradeLevel && selectedGradeLevel !== 'all')) && (
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
                      {selectedGradeLevel && selectedGradeLevel !== 'all' && (
                        <Badge color="purple" variant="filled" size="sm">
                          {t('gradeLevel', 'Grade Level')}: {gradeLevelOptions.find(g => g.value === selectedGradeLevel)?.label}
                        </Badge>
                      )}
                    </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('searchStudent', 'Search Students')}
                  </label>
                  <form onSubmit={handleSearchSubmit} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder={t('searchStudents', 'Search by name, username, or email...')}
                        value={searchQuery}
                        onChange={(e) => handleSearchChange(e.target.value)}
                        disabled={fetchingStudents}
                        className="w-full text-sm px-4 py-2.5 pl-10 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed transition-colors"
                      />
                      <svg className="absolute left-3 top-3 h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={fetchingStudents}
                    >
                      {t('search', 'Search')}
                    </Button>
                  </form>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {fetchingStudents ? (
                  <div className="flex items-center justify-center py-12">
                    <PageLoader message={t('loadingStudents', 'Loading students...')} />
                  </div>
                ) : students.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title={t('noStudentsFound', 'No Students Found')}
                    description={t('noStudentsInSchool', 'No students available in this school')}
                    variant="neutral"
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
                      {students.map((student) => (
                        <StudentContextMenu
                          key={student.id}
                          student={student}
                          onResetPassword={handleResetPassword}
                          onDelete={handleDeleteStudent}
                        >
                          <div
                            className={
                              `bg-white rounded-sm border hover:border-blue-400 hover:shadow-md transition-all duration-200 flex justify-between items-start p-4 ` +
                              (selectedStudentIds.has(student.id)
                                ? 'border-blue-500 ring-2 ring-blue-200'
                                : 'border-gray-200')
                            }
                          >
                          <div className="space-3">
                            <div>
                              <div>
                                <span
                                  className="font-semibold text-gray-900 text-sm line-clamp-2 hover:text-blue-600 cursor-pointer"
                                  onClick={() => handleSelectStudent(student)}
                                >
                                  {getFullName(student)}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {student.username}
                              </div>
                              {/* Display current class if available */}
                              {student.currentClass && student.currentClass.gradeLevel !== undefined && student.currentClass.gradeLevel !== null ? (
                                <div className="text-xs text-gray-600 font-medium mt-1">
                                  {t('class', 'Class')}: {formatClassIdentifier(student.currentClass.gradeLevel, student.currentClass.section)}
                                </div>
                              ) : student.classId ? (
                                <div className="text-xs text-gray-500 mt-1">
                                  {t('loadingClass', 'Loading class...')}
                                </div>
                              ) : (
                                <div className="text-xs text-gray-500 mt-1">
                                  {t('noClassAssigned', 'No class assigned')}
                                </div>
                              )}
                              {student.schoolName && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {student.schoolName}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-2 mt-1">
                                {student.gradeLevel && (
                                  <Badge color="blue" variant="outlined" size="sm">
                                    {t('gradeLevelShort', 'Grade')} {student.gradeLevel}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-start">
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.has(student.id)}
                              onChange={() => handleSelectStudent(student)}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer mt-0.5"
                            />
                          </div>
                          </div>
                        </StudentContextMenu>
                      ))}
                    </div>

                    {/* Pagination Component with built-in Limit Selector */}
                    <Pagination
                      currentPage={studentPagination.page}
                      totalPages={studentPagination.pages}
                      total={studentPagination.total}
                      limit={studentPagination.limit}
                      onPageChange={handleStudentPageChange}
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
        </div>
      </PageTransition>
      <SidebarFilter
            isOpen={isSourceFilterOpen}
            onClose={() => setIsSourceFilterOpen(false)}
            title={t('filterBySchool', 'Filter by School')}
            onApply={handleApplySourceFilters}
            onReset={handleResetSourceFilters}
            applyDisabled={sourceLoading}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('school', 'School')}
                </label>
                <SearchableDropdown
                  options={sourceSchoolOptions}
                  value={selectedSourceSchool}
                  onValueChange={handleSourceSchoolChange}
                  placeholder={t('selectSchool', 'Select School')}
                  searchPlaceholder={t('searchSchool', 'Search schools...')}
                  className="w-full"
                  disabled={!selectedSourceDistrict || sourceLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('gradeLevel', 'Grade Level')}
                </label>
                <Dropdown
                  options={gradeLevelOptions}
                  value={selectedGradeLevel}
                  onValueChange={setSelectedGradeLevel}
                  placeholder={t('selectGradeLevel', 'Select Grade Level')}
                  className="w-full"
                  disabled={sourceLoading}
                />
              </div>
            </div>
          </SidebarFilter>

          <Modal
            isOpen={showTransferModal}
            onClose={closeTransferModal}
            title={t('studentActions', 'Student Actions')}
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
                      !selectedTargetMasterClassId ||
                      selectedSourceSchool === selectedTargetSchool
                    }
                    onClick={handleTransferStudent}
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
                    disabled={bulkDeleting || selectedStudentIds.size === 0}
                    onClick={handleBulkDeleteStudents}
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
                  {selectedStudentIds.size > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="inline-block w-1 h-5 bg-blue-600 rounded"></span>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {t('selectedStudents', 'Selected Students')} ({selectedStudentIds.size})
                        </h3>
                      </div>
                      <div className="max-h-40 overflow-y-auto border border-dashed border-gray-300 rounded-md bg-white px-3 py-2 space-y-1">
                        {Array.from(selectedStudentIds).map(id => {
                          const student = selectedStudentsMap.get(id) || students.find(s => s.id === id);
                          if (!student) return null;
                          return (
                            <div
                              key={id}
                              className="flex items-center justify-between text-xs text-gray-700 border-b border-gray-100 last:border-b-0 py-1"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {getFullName(student)}
                                </span>
                                {student.username && (
                                  <span className="text-gray-500">
                                    {student.username}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="inline-block w-1 h-5 bg-purple-600 rounded"></span>
                      <h3 className="text-base font-semibold text-gray-900">
                        {t('selectSchool', 'Choose Target School')}
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('province', 'Province')}
                        </label>
                        <Dropdown
                          options={targetProvinceOptions}
                          value={selectedTargetProvince}
                          onValueChange={handleTargetProvinceChange}
                          placeholder={t('selectProvince', 'Select Province')}
                          className="w-full"
                          disabled={targetLoading || transferring}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('district', 'District')}
                        </label>
                        <Dropdown
                          options={targetDistrictOptions}
                          value={selectedTargetDistrict}
                          onValueChange={handleTargetDistrictChange}
                          placeholder={t('selectDistrict', 'Select District')}
                          className="w-full"
                          disabled={!selectedTargetProvince || targetLoading || transferring}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {t('school', 'School')} <span className="text-red-500">*</span>
                        </label>
                        <SearchableDropdown
                          options={targetSchoolOptions}
                          value={selectedTargetSchool}
                          onValueChange={handleTargetSchoolChange}
                          placeholder={t('selectSchool', 'Select School')}
                          searchPlaceholder={t('searchSchool', 'Search schools...')}
                          className="w-full"
                          disabled={!selectedTargetDistrict || targetLoading || transferring}
                        />
                      </div>
                    </div>
                  </div>

                  {selectedTargetSchool && (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="inline-block w-1 h-5 bg-green-600 rounded"></span>
                        <h3 className="text-sm font-semibold text-gray-900">
                          {t('masterClassInfo', 'Master Class Information')}
                        </h3>
                      </div>
                      <div className="text-sm text-gray-700 bg-gray-50 border border-dashed border-gray-300 rounded-md px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <span>
                          {selectedTargetMasterClassLabel
                            ? `${t('masterClassLabel', 'Master class')}: ${selectedTargetMasterClassLabel}`
                            : t('noMasterClassFound', 'No master class found for this school')}
                        </span>
                        {!selectedTargetMasterClassLabel && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCreateMasterClass}
                            disabled={creatingMasterClass || targetLoading || transferring}
                          >
                            {creatingMasterClass
                              ? t('creatingMasterClass', 'Creating...')
                              : t('createMasterClass', 'Create master class')}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {transferModalTab === 'bulkDelete' && (
              <div className="space-y-6">
                {selectedStudentIds.size > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="inline-block w-1 h-5 bg-red-600 rounded"></span>
                      <h3 className="text-sm font-semibold text-gray-900">
                        {t('selectedStudents', 'Selected Students')} ({selectedStudentIds.size})
                      </h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto border border-dashed border-red-300 rounded-md bg-red-50 px-3 py-2 space-y-1">
                      {Array.from(selectedStudentIds).map(id => {
                        const student = selectedStudentsMap.get(id) || students.find(s => s.id === id);
                        if (!student) return null;
                        return (
                          <div
                            key={id}
                            className="flex items-center justify-between text-xs text-gray-700 border-b border-red-100 last:border-b-0 py-1"
                          >
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {getFullName(student)}
                              </span>
                              {student.username && (
                                <span className="text-gray-500">
                                  {student.username}
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
                    <span className="font-semibold">{t('warning', 'Warning')}:</span> {t('bulkDeleteWarning', 'This action will permanently delete the selected students. This cannot be undone.')}
                  </p>
                </div>
              </div>
            )}
          </Modal>

      {/* Reset Password Modal */}
      <ResetPasswordModal
        isOpen={showResetPasswordModal}
        onClose={handleCloseResetPasswordModal}
        teacher={selectedStudentForReset}
        userType="student"
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
        message={selectedStudentForDelete ? t('confirmDeleteUser', `Are you sure you want to delete ${getFullName(selectedStudentForDelete)}? This action cannot be undone.`) : ''}
        type="danger"
        confirmText={t('delete', 'Delete')}
        cancelText={t('cancel', 'Cancel')}
        loading={isDeleting}
      />
    </>
  );
};

export default StudentTransferManagement;
