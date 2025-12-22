import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { attendanceService } from '../../utils/api/services/attendanceService';
import schoolService from '../../utils/api/services/schoolService';
import locationService from '../../utils/api/services/locationService';
import { School, Users, ChevronRight, Filter } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import StatsCard from '../../components/ui/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import SidebarFilter from '../../components/ui/SidebarFilter';
import SchoolAttendanceDetailModal from '../../components/attendance/SchoolAttendanceDetailModal';

const SchoolAttendanceList = () => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();

  const [loading, setLoading] = useState(true);
  const [schoolsData, setSchoolsData] = useState([]);
  const [schoolDetails, setSchoolDetails] = useState({}); // Map of schoolId -> school details
  const [schoolSummary, setSchoolSummary] = useState({
    schoolsWithStudentAttendance: 0,
    schoolsWithTeacherAttendance: 0
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalPages: 1,
    totalSchools: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    province: '',
    district: ''
  });

  const [tempFilters, setTempFilters] = useState({
    province: '',
    district: ''
  });

  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);

  // Location options
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);

  // Selected school for detail modal
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Fetch provinces on mount
  useEffect(() => {
    fetchProvinces();
  }, []);

  const fetchProvinces = async () => {
    try {
      const response = await locationService.getProvinces();
      const provincesData = response.data || response;
      setProvinces(provincesData);
    } catch (err) {
      console.error('Error fetching provinces:', err);
    }
  };

  const fetchDistricts = async (provinceId) => {
    if (!provinceId) {
      setDistricts([]);
      return;
    }

    try {
      const response = await locationService.getDistrictsByProvince(provinceId);
      const districtsData = response.data || response;
      setDistricts(districtsData);
    } catch (err) {
      console.error('Error fetching districts:', err);
    }
  };

  // Fetch schools with attendance data
  const fetchSchools = useCallback(async (page = 1, limitOverride = null) => {
    setLoading(true);
    clearError();

    try {
      const effectiveLimit = limitOverride ?? pagination.limit;

      const params = {
        page,
        limit: effectiveLimit
      };

      if (filters.province) params.provinceId = parseInt(filters.province, 10);
      if (filters.district) params.districtId = parseInt(filters.district, 10);

      console.log('Fetching school IDs with params:', params);

      const response = await attendanceService.dashboard.getSchoolIds(params);
      console.log('School IDs response:', response);

      if (response.success && response.data) {
        const {
          schoolIds,
          totalSchools,
          schoolsWithStudentAttendance = 0,
          schoolsWithTeacherAttendance = 0,
          page: currentPage,
          totalPages
        } = response.data;

        const validSchoolIds = schoolIds.filter(id => id !== null);

        setPagination(prev => ({
          ...prev,
          page: currentPage || page,
          // Preserve the UI-selected limit
          limit: effectiveLimit,
          totalPages: totalPages || 1,
          totalSchools: totalSchools || 0
        }));

        // Store overall summary counts from the API (not just current page)
        setSchoolSummary({
          schoolsWithStudentAttendance,
          schoolsWithTeacherAttendance
        });

        // Fetch school details for each ID
        if (validSchoolIds.length > 0) {
          await fetchSchoolDetails(validSchoolIds);
        } else {
          setSchoolsData([]);
        }
      }
    } catch (err) {
      console.error('Error fetching schools:', err);
      handleError(err, {
        toastMessage: t('failedToLoadSchools', 'Failed to load schools')
      });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, clearError, handleError, t]);

  // Fetch school details by IDs
  const fetchSchoolDetails = async (schoolIds) => {
    try {
      const detailsPromises = schoolIds.map(async (schoolId) => {
        try {
          // Fetch school basic info
          const schoolResponse = await schoolService.getSchoolById(schoolId);
          const schoolData = schoolResponse.data || schoolResponse;

          // Fetch attendance counts
          const countResponse = await attendanceService.dashboard.getSchoolAttendanceCount(schoolId);
          const countData = countResponse.data || countResponse;

          return {
            schoolId,
            schoolName: schoolData.school_name_kh || schoolData.school_name_en || schoolData.name || 'Unknown School',
            studentAttendanceCount: countData.studentAttendanceCount || 0,
            teacherAttendanceCount: countData.teacherAttendanceCount || 0,
            totalAttendanceCount: countData.totalAttendanceCount || 0
          };
        } catch (err) {
          console.error(`Error fetching details for school ${schoolId}:`, err);
          return {
            schoolId,
            schoolName: 'Unknown School',
            studentAttendanceCount: 0,
            teacherAttendanceCount: 0,
            totalAttendanceCount: 0,
            error: true
          };
        }
      });

      const details = await Promise.all(detailsPromises);
      setSchoolsData(details);

      // Store details in map for quick lookup
      const detailsMap = {};
      details.forEach(detail => {
        detailsMap[detail.schoolId] = detail;
      });
      setSchoolDetails(detailsMap);
    } catch (err) {
      console.error('Error fetching school details:', err);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchSchools(1);
  }, [filters]);

  // Handle filter changes
  const handleOpenFilterSidebar = () => {
    setTempFilters(filters);
    setFilterSidebarOpen(true);
  };

  const handleApplyFilters = () => {
    setFilters(tempFilters);
    setFilterSidebarOpen(false);
  };

  const handleProvinceChange = (value) => {
    setTempFilters(prev => ({
      ...prev,
      province: value,
      district: ''
    }));
    setDistricts([]);
    if (value) {
      fetchDistricts(value);
    }
  };

  const handleDistrictChange = (value) => {
    setTempFilters(prev => ({
      ...prev,
      district: value
    }));
  };

  const handleResetFilters = () => {
    setFilters({ province: '', district: '' });
    setTempFilters({ province: '', district: '' });
    setDistricts([]);
  };

  // Handle school click
  const handleSchoolClick = (school) => {
    setSelectedSchool(school);
    setDetailModalOpen(true);
  };

  // Handle pagination
  const handlePageChange = (newPage) => {
    fetchSchools(newPage);
  };

  if (loading && schoolsData.length === 0) {
    return (
      <PageLoader
        message={t('loadingSchools', 'Loading schools...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <ErrorDisplay
          error={error}
          onRetry={() => fetchSchools(pagination.page)}
          size="lg"
          className="min-h-[400px]"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-3 sm:p-4">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('schoolAttendanceList', 'School Attendance List')}
              </h1>
              <p className="text-sm text-gray-600 mt-2">
                {t('schoolAttendanceListDesc', 'View attendance records for each school')}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleOpenFilterSidebar}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {t('filters', 'Filters')}
              {(filters.province || filters.district) && (
                <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-white text-blue-600 rounded-full">
                  {[filters.province, filters.district].filter(Boolean).length}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title={t('totalSchools', 'Total Schools')}
            value={pagination.totalSchools}
            icon={School}
            enhanced
            responsive
            gradientFrom="from-blue-500"
            gradientTo="to-blue-600"
          />

          <StatsCard
            title={t('withStudentData', 'With Student Data')}
            value={schoolSummary.schoolsWithStudentAttendance}
            icon={Users}
            enhanced
            responsive
            gradientFrom="from-green-500"
            gradientTo="to-green-600"
          />

          <StatsCard
            title={t('withTeacherData', 'With Teacher Data')}
            value={schoolSummary.schoolsWithTeacherAttendance}
            icon={Users}
            enhanced
            responsive
            gradientFrom="from-purple-500"
            gradientTo="to-purple-600"
          />
        </div>

        {/* Schools List */}
        <Card>
          <CardHeader>
            <CardTitle>{t('schools', 'Schools')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              // Loading skeleton cards while fetching a new page
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-4 border border-gray-100 rounded-lg bg-gray-50 animate-pulse h-full"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-gray-200 rounded-lg">
                        <div className="h-6 w-6 bg-gray-300 rounded" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4" />
                        <div className="flex gap-3 mt-2">
                          <div className="h-3 bg-gray-200 rounded w-20" />
                          <div className="h-3 bg-gray-200 rounded w-20" />
                          <div className="h-3 bg-gray-200 rounded w-24" />
                        </div>
                      </div>
                    </div>
                    <div className="h-5 w-5 bg-gray-200 rounded" />
                  </div>
                ))}
              </div>
            ) : schoolsData.length === 0 ? (
              <div className="text-center py-12">
                <School className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">{t('noSchoolsFound', 'No schools found')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schoolsData.map((school) => (
                  <div
                    key={school.schoolId}
                    onClick={() => handleSchoolClick(school)}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 cursor-pointer transition-all h-full"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <School className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{school.schoolName}</h3>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {school.studentAttendanceCount} {t('students', 'Students')}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {school.teacherAttendanceCount} {t('teachers', 'Teachers')}
                          </span>
                          <span className="font-medium text-gray-900">
                            {t('total', 'Total')}: {school.totalAttendanceCount}
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.totalSchools}
              limit={pagination.limit}
              onPageChange={(newPage) => {
                if (newPage < 1 || newPage > pagination.totalPages) return;
                fetchSchools(newPage);
              }}
              onLimitChange={(newLimit) => {
                // When limit changes, restart from page 1 with new limit
                setPagination(prev => ({
                  ...prev,
                  limit: newLimit,
                  page: 1
                }));
                fetchSchools(1, newLimit);
              }}
              limitOptions={[10, 20, 50, 100]}
              showLimitSelector={true}
              t={t}
              showFirstLast={true}
              showInfo={true}
            />
          </CardContent>
        </Card>
      </div>

      {/* Filter Sidebar */}
      <SidebarFilter
        isOpen={filterSidebarOpen}
        onClose={() => setFilterSidebarOpen(false)}
        title={t('filters', 'Filters')}
        subtitle={t('filterByLocation', 'Filter by location')}
        hasFilters={!!(filters.province || filters.district)}
        onClearFilters={handleResetFilters}
        onApply={handleApplyFilters}
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('province', 'Province')}
            </label>
            <SearchableDropdown
              options={provinces.map((p) => ({
                value: p.id,
                label: p.province_name_kh || p.province_name_en
              }))}
              value={tempFilters.province}
              onValueChange={handleProvinceChange}
              placeholder={t('selectProvince', 'Select Province')}
              searchPlaceholder={t('searchProvince', 'Search province...')}
              minWidth="w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              {t('district', 'District')}
            </label>
            <SearchableDropdown
              options={districts.map((d) => ({
                value: d.id,
                label: d.district_name_kh || d.district_name_en
              }))}
              value={tempFilters.district}
              onValueChange={handleDistrictChange}
              placeholder={t('selectDistrict', 'Select District')}
              searchPlaceholder={t('searchDistrict', 'Search district...')}
              disabled={!tempFilters.province}
              minWidth="w-full"
            />
          </div>
        </div>
      </SidebarFilter>

      {/* School Detail Modal */}
      {selectedSchool && (
        <SchoolAttendanceDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedSchool(null);
          }}
          school={selectedSchool}
        />
      )}
    </div>
  );
};

export default SchoolAttendanceList;
