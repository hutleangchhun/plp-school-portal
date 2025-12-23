import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import { PageLoader } from '../../components/ui/DynamicLoader';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { dashboardService } from '../../utils/api/services/dashboardService';
import locationService from '../../utils/api/services/locationService';
import schoolService from '../../utils/api/services/schoolService';
import StatsCard from '../../components/ui/StatsCard';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Users, Filter, Calendar, BarChart3 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { roleOptions, gradeLevelOptions } from '../../utils/formOptions';
import { DatePickerWithDropdowns } from '@/components/ui/date-picker-with-dropdowns';
import Dropdown from '@/components/ui/Dropdown';
import SidebarFilter from '../../components/ui/SidebarFilter';

const DEFAULT_ROLE_ID = roleOptions[0]?.value || '9';

const UserRegistrationDashboard = () => {
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
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const defaultStartDate = formatDateLocal(thirtyDaysAgo);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    genderDistribution: [],
    ageDistribution: [],
    filters: null,
  });

  const [tempFilters, setTempFilters] = useState({
    roleId: DEFAULT_ROLE_ID,
    gradeLevel: gradeLevelOptions[0]?.value || '0',
    startDate: defaultStartDate,
    endDate: today,
    excludeSchoolIdsText: '',
    province: '',
    district: '',
    school: '',
  });

  const [filterSidebarOpen, setFilterSidebarOpen] = useState(false);

  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [schools, setSchools] = useState([]);

  const [filters, setFilters] = useState({
    roleId: DEFAULT_ROLE_ID,
    gradeLevel: gradeLevelOptions[0]?.value || '0',
    startDate: defaultStartDate,
    endDate: today,
    excludeSchoolIdsText: '',
    province: '',
    district: '',
    school: '',
  });

  const parseExcludeSchoolIds = (text) => {
    if (!text) return [];
    return text
      .split(',')
      .map((v) => v.trim())
      .filter((v) => v)
      .map((v) => Number(v))
      .filter((v) => !Number.isNaN(v));
  };

  const fetchStats = useCallback(async () => {
    setLoading(true);
    clearError();

    try {
      const excludeSchoolIds = parseExcludeSchoolIds(filters.excludeSchoolIdsText);

      const params = {
        roleId: Number(filters.roleId) || undefined,
        gradeLevel: filters.gradeLevel,
        startDate: filters.startDate,
        endDate: filters.endDate,
        excludeSchoolIds,
        provinceId: filters.province ? parseInt(filters.province, 10) : undefined,
        districtId: filters.district ? parseInt(filters.district, 10) : undefined,
        schoolId: filters.school ? parseInt(filters.school, 10) : undefined,
      };

      console.log('UserRegistrationDashboard - fetching stats with params:', params);

      const response = await dashboardService.getUserRegistrationStats(params);

      if (!response || !response.success) {
        throw new Error(response?.error || 'Failed to load registration stats');
      }

      const data = response.data || {};

      setStats({
        total: data.total || 0,
        genderDistribution: Array.isArray(data.genderDistribution) ? data.genderDistribution : [],
        ageDistribution: Array.isArray(data.ageDistribution) ? data.ageDistribution : [],
        filters: data.filters || params,
      });
    } catch (err) {
      console.error('Error fetching user registration stats:', err);
      handleError(err, {
        toastMessage: t('failedToLoadRegistrationStats', 'Failed to load registration statistics'),
      });
    } finally {
      setLoading(false);
    }
  }, [filters, clearError, handleError, t]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleTempFilterChange = (field, value) => {
    setTempFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const fetchProvinces = useCallback(async () => {
    try {
      const response = await locationService.getProvinces();
      const provincesData = response.data || response;
      setProvinces(provincesData || []);
    } catch (err) {
      console.error('Error fetching provinces:', err);
    }
  }, []);

  const fetchDistricts = useCallback(async (provinceId) => {
    if (!provinceId) {
      setDistricts([]);
      setSchools([]);
      return;
    }

    try {
      const response = await locationService.getDistrictsByProvince(provinceId);
      const districtsData = response.data || response;
      setDistricts(districtsData || []);
      setSchools([]);
    } catch (err) {
      console.error('Error fetching districts:', err);
    }
  }, []);

  const fetchSchools = useCallback(async (districtId) => {
    if (!districtId) {
      setSchools([]);
      return;
    }

    try {
      const response = await schoolService.getSchoolsByDistrict(districtId);
      const schoolsData = response.data || response;
      setSchools(schoolsData || []);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  }, []);

  useEffect(() => {
    fetchProvinces();
  }, [fetchProvinces]);

  if (loading && !stats.total && !stats.genderDistribution.length && !stats.ageDistribution.length && !error) {
    return (
      <PageLoader
        message={t('loadingRegistrationStats', 'Loading registration statistics...')}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
        <ErrorDisplay
          error={error}
          onRetry={fetchStats}
          size="lg"
          className="min-h-[400px]"
        />
      </div>
    );
  }

  const totalGenderCount = stats.genderDistribution.reduce((sum, g) => sum + (g.count || 0), 0) || 0;

  const hasActiveFilters =
    filters.roleId !== DEFAULT_ROLE_ID ||
    filters.gradeLevel !== (gradeLevelOptions[0]?.value || '0') ||
    filters.startDate !== defaultStartDate ||
    filters.endDate !== today ||
    !!filters.excludeSchoolIdsText ||
    !!filters.province ||
    !!filters.district ||
    !!filters.school;

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('userRegistrationDashboard', 'User Registration Dashboard')}
            </h1>
            <p className="text-sm text-gray-600 mt-2">
              {t(
                'userRegistrationDashboardDesc',
                'Monitor user registrations by role, grade and demographics'
              )}
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setTempFilters(filters);
              setFilterSidebarOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            {t('filters', 'Filters')}
            {hasActiveFilters && (
              <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-white text-blue-600 rounded-full">
                {[
                  filters.roleId !== DEFAULT_ROLE_ID,
                  filters.gradeLevel !== (gradeLevelOptions[0]?.value || '0'),
                  filters.startDate !== defaultStartDate,
                  filters.endDate !== today,
                  !!filters.excludeSchoolIdsText,
                  !!filters.province,
                  !!filters.district,
                  !!filters.school,
                ].filter(Boolean).length}
              </span>
            )}
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatsCard
            title={t('totalRegistrations', 'Total Registrations')}
            value={stats.total}
            icon={Users}
            enhanced
            responsive
            gradientFrom="from-blue-500"
            gradientTo="to-blue-600"
          />

          <StatsCard
            title={t('uniqueGenders', 'Unique Genders')}
            value={stats.genderDistribution.length}
            icon={BarChart3}
            enhanced
            responsive
            gradientFrom="from-purple-500"
            gradientTo="to-purple-600"
          />

          <StatsCard
            title={t('uniqueAges', 'Unique Ages')}
            value={stats.ageDistribution.length}
            icon={BarChart3}
            enhanced
            responsive
            gradientFrom="from-green-500"
            gradientTo="to-green-600"
          />
        </div>

        {/* Gender distribution */}
        <Card className="mb-6 border border-gray-200 rounded-sm">
          <CardHeader>
            <CardTitle>{t('genderDistribution', 'Gender Distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.genderDistribution.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t('noGenderData', 'No gender distribution data available for the selected filters.')}
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stats.genderDistribution.map((item) => {
                  const count = item.count || 0;
                  const percentage = totalGenderCount
                    ? ((count / totalGenderCount) * 100).toFixed(1)
                    : '0.0';

                  const label =
                    item.gender === 'FEMALE'
                      ? t('female', 'Female')
                      : item.gender === 'MALE'
                      ? t('male', 'Male')
                      : item.gender || t('unknown', 'Unknown');

                  return (
                    <div
                      key={item.gender || label}
                      className="border border-gray-100 rounded-sm p-3 bg-white flex flex-col gap-1"
                    >
                      <div className="text-sm font-medium text-gray-700">{label}</div>
                      <div className="text-xl font-bold text-gray-900">{count}</div>
                      <div className="text-xs text-gray-500">{percentage}%</div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Age distribution */}
        <Card className="border border-gray-200 rounded-sm">
          <CardHeader>
            <CardTitle>{t('ageDistribution', 'Age Distribution')}</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.ageDistribution.length === 0 ? (
              <p className="text-sm text-gray-500">
                {t('noAgeData', 'No age distribution data available for the selected filters.')}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">
                        {t('age', 'Age')}
                      </th>
                      <th className="px-4 py-2 text-left font-medium text-gray-600">
                        {t('count', 'Count')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {stats.ageDistribution
                      .slice()
                      .sort((a, b) => (a.age || 0) - (b.age || 0))
                      .map((item) => (
                        <tr key={item.age}>
                          <td className="px-4 py-2 text-gray-900">{item.age}</td>
                          <td className="px-4 py-2 text-gray-900 font-medium">{item.count || 0}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SidebarFilter
        isOpen={filterSidebarOpen}
        onClose={() => setFilterSidebarOpen(false)}
        title={t('filters', 'Filters')}
        subtitle={t('filterByDemographics', 'Filter by role, grade, date and location')}
        hasFilters={hasActiveFilters}
        onClearFilters={() => {
          setFilters({
            roleId: DEFAULT_ROLE_ID,
            gradeLevel: gradeLevelOptions[0]?.value || '0',
            startDate: defaultStartDate,
            endDate: today,
            excludeSchoolIdsText: '',
            province: '',
            district: '',
            school: '',
          });
          setTempFilters({
            roleId: DEFAULT_ROLE_ID,
            gradeLevel: gradeLevelOptions[0]?.value || '0',
            startDate: defaultStartDate,
            endDate: today,
            excludeSchoolIdsText: '',
            province: '',
            district: '',
            school: '',
          });
          setDistricts([]);
          setSchools([]);
        }}
        onApply={() => {
          setFilters(tempFilters);
          setFilterSidebarOpen(false);
        }}
      >
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('role', 'Role')}
              </label>
              <Dropdown
                value={tempFilters.roleId}
                onValueChange={(val) => handleTempFilterChange('roleId', val)}
                options={roleOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.label,
                }))}
                placeholder={t('selectRole', 'Select role')}
                minWidth="w-full"
                triggerClassName="!w-full"
              />
            </div>

            {/* Grade Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('gradeLevel', 'Grade Level')}
              </label>
              <Dropdown
                value={tempFilters.gradeLevel}
                onValueChange={(val) => handleTempFilterChange('gradeLevel', val)}
                options={gradeLevelOptions.map((opt) => ({
                  value: opt.value,
                  label: opt.translationKey
                    ? t(opt.translationKey, opt.label)
                    : opt.label,
                }))}
                placeholder={t('selectGradeLevel', 'Select grade level')}
                minWidth="w-full"
                triggerClassName="!w-full"
              />
            </div>

            {/* Date range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                <Calendar className="h-4 w-4 text-gray-500" />
                {t('dateRange', 'Date Range')}
              </label>
              <div className="flex gap-2">
                <DatePickerWithDropdowns
                  value={tempFilters.startDate ? new Date(tempFilters.startDate) : undefined}
                  onChange={(date) =>
                    handleTempFilterChange('startDate', date ? formatDateLocal(date) : '')
                  }
                  placeholder={t('startDate', 'Start date')}
                  className="w-full"
                />
                <DatePickerWithDropdowns
                  value={tempFilters.endDate ? new Date(tempFilters.endDate) : undefined}
                  onChange={(date) =>
                    handleTempFilterChange('endDate', date ? formatDateLocal(date) : '')
                  }
                  placeholder={t('endDate', 'End date')}
                  className="w-full"
                />
              </div>
            </div>

            {/* Location cascade: Province -> District -> School */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('province', 'Province')}
                </label>
                <Dropdown
                  value={tempFilters.province}
                  onValueChange={(val) => {
                    handleTempFilterChange('province', val);
                    handleTempFilterChange('district', '');
                    handleTempFilterChange('school', '');
                    setDistricts([]);
                    setSchools([]);
                    if (val) {
                      fetchDistricts(val);
                    }
                  }}
                  options={provinces.map((p) => ({
                    value: String(p.id ?? p.province_id ?? ''),
                    label: p.province_name_kh || p.province_name_en || p.name || 'Unknown',
                  }))}
                  placeholder={t('selectProvince', 'Select Province')}
                  minWidth="w-full"
                  triggerClassName="!w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('district', 'District')}
                </label>
                <Dropdown
                  value={tempFilters.district}
                  onValueChange={(val) => {
                    handleTempFilterChange('district', val);
                    handleTempFilterChange('school', '');
                    setSchools([]);
                    if (val) {
                      fetchSchools(val);
                    }
                  }}
                  options={districts.map((d) => ({
                    value: String(d.id ?? d.district_id ?? ''),
                    label: d.district_name_kh || d.district_name_en || d.name || 'Unknown',
                  }))}
                  placeholder={t('selectDistrict', 'Select District')}
                  minWidth="w-full"
                  triggerClassName="!w-full"
                  disabled={!tempFilters.province}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('school', 'School')}
                </label>
                <Dropdown
                  value={tempFilters.school}
                  onValueChange={(val) => handleTempFilterChange('school', val)}
                  options={schools.map((s) => ({
                    value: String(s.id ?? s.school_id ?? ''),
                    label:
                      s.school_name_kh || s.school_name_en || s.name || s.school_name || 'Unknown',
                  }))}
                  placeholder={t('selectSchool', 'Select School')}
                  minWidth="w-full"
                  triggerClassName="!w-full"
                  disabled={!tempFilters.district}
                />
              </div>
            </div>

            {/* Excluded schools */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('excludeSchoolIds', 'Exclude School IDs')}
              </label>
              <input
                type="text"
                value={tempFilters.excludeSchoolIdsText}
                onChange={(e) => handleTempFilterChange('excludeSchoolIdsText', e.target.value)}
                placeholder={t('excludeSchoolIdsPlaceholder', '103777,103778')}
                className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                {t('excludeSchoolIdsHint', 'Comma-separated list of school IDs')}
              </p>
            </div>
          </div>
        </div>
      </SidebarFilter>
    </div>
  );
};

export default UserRegistrationDashboard;
