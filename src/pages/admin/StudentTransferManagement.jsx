import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
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
import { api } from '../../utils/api';
import { getFullName } from '../../utils/usernameUtils';
import locationService from '../../utils/api/services/locationService';
import schoolService from '../../utils/api/services/schoolService';
import classService from '../../utils/api/services/classService';
import { studentService } from '../../utils/api/services/studentService';
import { gradeLevelOptions as sharedGradeLevelOptions } from '../../utils/formOptions';
import { Users, ListFilter, RotateCcw } from 'lucide-react';

const StudentTransferManagement = () => {
  const { t } = useLanguage();
  const { startLoading, stopLoading } = useLoading();
  const { error, handleError, clearError } = useErrorHandler();

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

  const [initialLoading, setInitialLoading] = useState(true);
  const [fetchingStudents, setFetchingStudents] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);

  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetProvinces, setTargetProvinces] = useState([]);
  const [targetDistricts, setTargetDistricts] = useState([]);
  const [targetSchools, setTargetSchools] = useState([]);
  const [selectedTargetProvince, setSelectedTargetProvince] = useState('');
  const [selectedTargetDistrict, setSelectedTargetDistrict] = useState('');
  const [selectedTargetSchool, setSelectedTargetSchool] = useState('');
  const [selectedTargetMasterClassId, setSelectedTargetMasterClassId] = useState('');
  const [selectedTargetMasterClassLabel, setSelectedTargetMasterClassLabel] = useState('');
  const [targetLoading, setTargetLoading] = useState(false);

  const [studentPagination, setStudentPagination] = useState({
    page: 1,
    limit: 9,
    total: 0,
    pages: 1
  });

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

  const fetchStudentsGlobal = useCallback(async (page = 1, search = '') => {
    try {
      setFetchingStudents(true);
      clearError();

      const response = await studentService.getStudents({
        page,
        limit: 9,
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
        // Preserve source school from global /students endpoint
        schoolId: student.schoolId,
        schoolName: student.schoolName,
      }));

      const finalStudents =
        selectedGradeLevel && selectedGradeLevel !== 'all'
          ? mappedStudents.filter(s => String(s.gradeLevel) === String(selectedGradeLevel))
          : mappedStudents;

      setStudents(finalStudents);

      const pagination = response.pagination || {
        page,
        limit: 9,
        total: mappedStudents.length,
        pages: Math.max(1, Math.ceil(mappedStudents.length / 9)),
      };

      setStudentPagination({
        page: pagination.page,
        limit: pagination.limit,
        total: pagination.total,
        pages: pagination.pages,
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

  const fetchStudentsForSchool = useCallback(async (schoolId, page = 1, search = '') => {
    if (!schoolId) {
      setStudents([]);
      setStudentPagination({ page: 1, limit: 9, total: 0, pages: 1 });
      return;
    }

    try {
      setFetchingStudents(true);
      clearError();

      const response = await studentService.getStudentsBySchool(schoolId, {
        page,
        limit: 9,
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
        schoolId: schoolId,
      }));

      const finalStudents =
        selectedGradeLevel && selectedGradeLevel !== 'all'
          ? mappedStudents.filter(s => String(s.gradeLevel) === String(selectedGradeLevel))
          : mappedStudents;

      setStudents(finalStudents);

      if (response.pagination) {
        setStudentPagination(prev => ({
          ...prev,
          page,
          total: response.pagination.total,
          pages: response.pagination.pages || response.pagination.totalPages || Math.ceil(response.pagination.total / 9),
        }));
      } else {
        const totalPages = Math.ceil((response.data?.length || 0) / 9);
        setStudentPagination(prev => ({
          ...prev,
          page,
          total: response.data?.length || 0,
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
      fetchStudentsForSchool(selectedSourceSchool, 1, searchQuery);
    } else {
      fetchStudentsGlobal(1, searchQuery);
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
      fetchStudentsForSchool(selectedSourceSchool, 1, searchQuery);
    }
    setIsSourceFilterOpen(false);
  };

  const handleStudentPageChange = (newPage) => {
    if (newPage >= 1 && newPage <= studentPagination.pages) {
      setStudentPagination(prev => ({ ...prev, page: newPage }));
      if (selectedSourceSchool) {
        fetchStudentsForSchool(selectedSourceSchool, newPage, searchQuery);
      } else {
        fetchStudentsGlobal(newPage, searchQuery);
      }
    }
  };

  const openTransferModal = async () => {
    if (selectedStudentIds.size === 0) {
      handleError(new Error('Please select at least one student'));
      return;
    }

    try {
      setShowTransferModal(true);
      setTargetLoading(true);
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
                  {t('studentTransfer', 'Student Transfer Between Schools')}
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
                  {students.length > 0 && selectedStudentIds.size > 0 && (
                    <div className="flex items-center space-x-3">
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
                    </div>
                  )}
                </div>

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
                        <div
                          key={student.id}
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
                              <div className="text-xs text-gray-500">
                                {student.class?.name
                                  ? student.class.name
                                  : 'មិនមាន'}
                              </div>
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
                      ))}
                    </div>

                    {studentPagination.pages > 1 && (
                      <Pagination
                        currentPage={studentPagination.page}
                        totalPages={studentPagination.pages}
                        total={studentPagination.total}
                        limit={studentPagination.limit}
                        onPageChange={handleStudentPageChange}
                        t={t}
                        showFirstLast={true}
                        showInfo={true}
                      />
                    )}
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
            title={t('selectTargetSchool', 'Select Target School')}
            size="full"
            height="full"
            closeOnOverlayClick={!transferring}
            showCloseButton={!transferring}
            footer={
              <div className="flex items-center justify-end space-x-3 w-full">
                <Button
                  type="button"
                  variant="outline"
                  disabled={transferring}
                  onClick={closeTransferModal}
                  size="sm"
                >
                  {t('cancel', 'Cancel')}
                </Button>
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
              </div>
            }
            stickyFooter={true}
          >
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
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Modal>
    </>
  );
};

export default StudentTransferManagement;
