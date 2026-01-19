import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { attendanceService } from '../../utils/api/services/attendanceService';
import locationService from '../../utils/api/services/locationService';
import { School, Users, ChevronRight, Filter, CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import StatsCard from '../../components/ui/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import SidebarFilter from '../../components/ui/SidebarFilter';
import SchoolAttendanceDetailModal from '../../components/attendance/SchoolAttendanceDetailModal';
import SchoolAttendanceCountModal from '../../components/attendance/SchoolAttendanceCountModal';
import Badge from '@/components/ui/Badge';
import { Eye, Calendar } from 'lucide-react';
import { DatePickerWithDropdowns } from '@/components/ui/date-picker-with-dropdowns';

const SchoolCoverageTable = ({
  data = [],
  loading,
  pagination = {},
  onPageChange = () => {},
  onLimitChange = () => {},
  onViewDetails = () => {}
}) => {
  const { t } = useLanguage();
  const [sortConfig, setSortConfig] = useState({ key: 'schoolName', direction: 'asc' });

  const {
    page = 1,
    limit = 1,
    totalPages = 1,
    totalSchools = 0
  } = pagination;

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
        <p className="text-gray-500">{t('noSchoolsFound', 'No schools found')}</p>
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => {
    let aValue = a[sortConfig.key];
    let bValue = b[sortConfig.key];

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    if (typeof aValue === 'string' && typeof bValue === 'string') {
      aValue = aValue.toLowerCase();
      bValue = bValue.toLowerCase();
    }

    if (aValue < bValue) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (aValue > bValue) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction: sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc',
    });
  };

  const SortableHeader = ({ label, sortKey }) => (
    <th
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        {label}
        {sortConfig.key === sortKey && (
          sortConfig.direction === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        )}
      </div>
    </th>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {t('schoolCoverageList', 'Schools with Attendance Data')}
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <SortableHeader label={t('schoolName', 'School Name')} sortKey="schoolName" />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('studentData', 'Student Data')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('teacherData', 'Teacher Data')}
              </th>
              <SortableHeader label={t('studentCount', 'Student Records')} sortKey="studentAttendanceCount" />
              <SortableHeader label={t('teacherCount', 'Teacher Records')} sortKey="teacherAttendanceCount" />
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('dateRange', 'Date Range')}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('actions', 'Actions')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedData.map((school, index) => (
              <tr key={school.schoolId || index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{school.schoolName}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {school.hasStudentAttendance ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">{t('yes', 'Yes')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <XCircle className="h-5 w-5" />
                      <span className="text-sm">{t('no', 'No')}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {school.hasTeacherAttendance ? (
                    <div className="flex items-center gap-2 text-blue-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">{t('yes', 'Yes')}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400">
                      <XCircle className="h-5 w-5" />
                      <span className="text-sm">{t('no', 'No')}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 font-medium">
                    {(school.studentAttendanceCount || 0).toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="text-sm text-gray-900 font-medium">
                    {(school.teacherAttendanceCount || 0).toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-xs text-gray-500">
                    {school.firstAttendanceDate && school.lastAttendanceDate ? (
                      <>
                        <div>{new Date(school.firstAttendanceDate).toLocaleDateString()}</div>
                        <div className="text-gray-400">to</div>
                        <div>{new Date(school.lastAttendanceDate).toLocaleDateString()}</div>
                      </>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onViewDetails(school)}
                    className="p-2 h-auto"
                    title={t('viewDetails', 'View Details')}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        total={totalSchools}
        limit={limit}
        onPageChange={onPageChange}
        onLimitChange={onLimitChange}
        limitOptions={[10, 20, 50, 100]}
        showLimitSelector={true}
        t={t}
        showFirstLast={true}
        showInfo={true}
      />
    </div>
  );
};

const SchoolAttendanceList = () => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();

  const formatDateLocal = (date) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const today = formatDateLocal(new Date());

  const [loading, setLoading] = useState(true);
  const [schoolsData, setSchoolsData] = useState([]);
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
    district: '',
    date: today,
    startDate: '',
    endDate: '',
    filterMode: 'single' // 'single' or 'range'
  });

  const [tempFilters, setTempFilters] = useState({
    province: '',
    district: '',
    date: today,
    startDate: '',
    endDate: '',
    filterMode: 'single'
  });

  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);

  // Location options
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);

  // Selected school for detail modal
  const [selectedSchool, setSelectedSchool] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  
  // New modal for attendance counts
  const [attendanceCountModalOpen, setAttendanceCountModalOpen] = useState(false);

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

  // Fetch schools coverage data (students + teachers) directly from coverage endpoint
  // Note: dependency array intentionally scoped to filter values and stable handlers
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

      // Add date filters based on mode
      if (filters.filterMode === 'single' && filters.date) {
        params.date = filters.date;
      } else if (filters.filterMode === 'range') {
        if (filters.startDate) params.startDate = filters.startDate;
        if (filters.endDate) params.endDate = filters.endDate;
      }

      console.log('Fetching school coverage with params:', params);

      const response = await attendanceService.dashboard.getSchoolsCoverage(params);
      console.log('School coverage response:', response);

      if (response.success && response.data) {
        const data = response.data;
        const schools = Array.isArray(data.schools)
          ? data.schools
          : (Array.isArray(data) ? data : []);

        // Update table data directly from coverage endpoint
        setSchoolsData(schools);

        // Update pagination state
        setPagination(prev => ({
          ...prev,
          page: data.page || page,
          // Preserve the UI-selected limit
          limit: effectiveLimit,
          totalPages: data.totalPages || 1,
          totalSchools: data.totalSchools || schools.length
        }));

        // Store overall summary counts from the API (not just current page)
        setSchoolSummary({
          schoolsWithStudentAttendance: data.schoolsWithStudentAttendance || 0,
          schoolsWithTeacherAttendance: data.schoolsWithTeacherAttendance || 0
        });
      } else {
        setSchoolsData([]);
      }
    } catch (err) {
      console.error('Error fetching schools:', err);
      handleError(err, {
        toastMessage: t('failedToLoadSchools', 'Failed to load schools')
      });
    } finally {
      setLoading(false);
    }
  }, [filters, clearError, handleError, t, pagination.limit]);

  // Initial fetch and refetch when filters change
  useEffect(() => {
    fetchSchools(1);
  }, [fetchSchools, filters]);

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
    const resetFilters = { 
      province: '', 
      district: '', 
      date: '', 
      startDate: '', 
      endDate: '', 
      filterMode: 'single' 
    };
    setFilters(resetFilters);
    setTempFilters(resetFilters);
    setDistricts([]);
  };

  // Handle school click
  const handleSchoolClick = (school) => {
    setSelectedSchool(school);
    setDetailModalOpen(true);
  };

  const handleViewAttendanceCount = (school) => {
    setSelectedSchool(school);
    setAttendanceCountModalOpen(true);
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
              {(filters.province || filters.district || filters.date || filters.startDate || filters.endDate) && (
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-white text-blue-600 rounded-full">
                {[
                  filters.province, 
                  filters.district, 
                  filters.filterMode === 'single' ? filters.date : (filters.startDate || filters.endDate)
                ].filter(Boolean).length}
              </span>
            )}
            </Button>
          </div>
        </div>

        {/* Active Filter Badges */}
        {(filters.province || filters.district || filters.date || filters.startDate || filters.endDate) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {filters.province && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                {t('province', 'Province')}: {provinces.find(p => p.id === parseInt(filters.province))?.province_name_kh || filters.province}
              </Badge>
            )}
            {filters.district && (
              <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-100">
                {t('district', 'District')}: {districts.find(d => d.id === parseInt(filters.district))?.district_name_kh || filters.district}
              </Badge>
            )}
            {filters.filterMode === 'single' && filters.date && (
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100">
                {t('date', 'Date')}: {filters.date}
              </Badge>
            )}
            {filters.filterMode === 'range' && (filters.startDate || filters.endDate) && (
              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-100">
                {t('period', 'Period')}: {filters.startDate || '...'} {t('to', 'to')} {filters.endDate || '...'}
              </Badge>
            )}
            <button 
              onClick={handleResetFilters}
              className="text-xs text-red-600 hover:text-red-800 font-medium underline px-2"
            >
              {t('clearAll', 'Clear All')}
            </button>
          </div>
        )}

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
        <Card className="rounded-sm">
          <CardHeader>
            <CardTitle>{t('schools', 'Schools')}</CardTitle>
          </CardHeader>
          <CardContent>
            <SchoolCoverageTable
              data={schoolsData}
              loading={loading}
              pagination={pagination}
              onPageChange={(newPage) => {
                if (newPage < 1 || newPage > pagination.totalPages) return;
                fetchSchools(newPage);
              }}
              onLimitChange={(newLimit) => {
                setPagination(prev => ({
                  ...prev,
                  limit: newLimit,
                  page: 1
                }));
                fetchSchools(1, newLimit);
              }}
              onViewDetails={handleViewAttendanceCount}
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
        hasFilters={!!(filters.province || filters.district || filters.date || filters.startDate || filters.endDate)}
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

          <div className="pt-4 border-t border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-4">
              {t('filterByDate', 'Filter by Date')}
            </label>
            
            <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
              <button
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  tempFilters.filterMode === 'single' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setTempFilters(prev => ({ ...prev, filterMode: 'single' }))}
              >
                {t('singleDate', 'Single Date')}
              </button>
              <button
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                  tempFilters.filterMode === 'range' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setTempFilters(prev => ({ ...prev, filterMode: 'range' }))}
              >
                {t('dateRange', 'Date Range')}
              </button>
            </div>

            {tempFilters.filterMode === 'single' ? (
              <div className="space-y-3">
                <label className="block text-xs font-medium text-gray-500 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {t('selectDate', 'Select Date')}
                </label>
                <DatePickerWithDropdowns
                  value={tempFilters.date ? new Date(tempFilters.date) : undefined}
                  onChange={(date) =>
                    setTempFilters(prev => ({ ...prev, date: date ? formatDateLocal(date) : '' }))
                  }
                  placeholder={t('selectDate', 'Select date')}
                  className="w-full"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t('startDate', 'Start Date')}
                  </label>
                  <DatePickerWithDropdowns
                    value={tempFilters.startDate ? new Date(tempFilters.startDate) : undefined}
                    onChange={(date) =>
                      setTempFilters(prev => ({ ...prev, startDate: date ? formatDateLocal(date) : '' }))
                    }
                    placeholder={t('startDate', 'Start date')}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-medium text-gray-500 flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {t('endDate', 'End Date')}
                  </label>
                  <DatePickerWithDropdowns
                    value={tempFilters.endDate ? new Date(tempFilters.endDate) : undefined}
                    onChange={(date) =>
                      setTempFilters(prev => ({ ...prev, endDate: date ? formatDateLocal(date) : '' }))
                    }
                    placeholder={t('endDate', 'End date')}
                    className="w-full"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </SidebarFilter>

      {/* School Detail Modal */}
      {selectedSchool && detailModalOpen && (
        <SchoolAttendanceDetailModal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setSelectedSchool(null);
          }}
          school={selectedSchool}
        />
      )}

      {/* New School Attendance Count Modal */}
      {selectedSchool && attendanceCountModalOpen && (
        <SchoolAttendanceCountModal
          isOpen={attendanceCountModalOpen}
          onClose={() => {
            setAttendanceCountModalOpen(false);
            setSelectedSchool(null);
          }}
          schoolId={selectedSchool.schoolId}
          schoolName={selectedSchool.schoolName}
          initialFilterMode={filters.filterMode}
          initialDate={filters.date}
          initialStartDate={filters.startDate}
          initialEndDate={filters.endDate}
        />
      )}
    </div>
  );
};

export default SchoolAttendanceList;
