import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Users, Accessibility, ListFilter } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip
} from 'recharts';
import { dashboardService } from '../../utils/api/services/dashboardService';
import { ethnicGroupOptions, accessibilityOptions, roleOptions } from '../../utils/formOptions';
import DynamicLoader from '../ui/DynamicLoader';
import { Button } from '../ui/Button';
import SidebarFilter from '../ui/SidebarFilter';
import SearchableDropdown from '../ui/SearchableDropdown';
import locationService from '../../utils/api/services/locationService';
import schoolService from '../../utils/api/services/schoolService';

/**
 * SystemWideStudentStats Component
 * Displays user demographics (ethnic groups and accessibility needs) for admin view
 * Supports filtering by role and location (province, district, school)
 * Can work standalone with its own filters OR receive filters from parent
 * @param {number} roleId - The role ID to filter by (8 for teachers, 9 for students)
 * @param {string} provinceId - Province ID filter (optional, from parent)
 * @param {string} districtId - District ID filter (optional, from parent)
 * @param {string} schoolId - School ID filter (optional, from parent)
 * @param {boolean} showOwnFilters - Whether to show its own filter button (default: true)
 */
const SystemWideStudentStats = ({
  roleId: externalRoleId,
  provinceId: externalProvinceId,
  districtId: externalDistrictId,
  schoolId: externalSchoolId,
  showOwnFilters = true
}) => {
  const { t } = useLanguage();
  const [ethnicGroupData, setEthnicGroupData] = useState([]);
  const [accessibilityData, setAccessibilityData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetchingRef = useRef(false);

  // Internal filter state
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [schools, setSchools] = useState([]);

  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedRole, setSelectedRole] = useState("9");

  const [tempProvince, setTempProvince] = useState("");
  const [tempDistrict, setTempDistrict] = useState("");
  const [tempSchool, setTempSchool] = useState("");
  const [tempRole, setTempRole] = useState("9");

  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const provinceFetchedRef = useRef(false);

  // Use external filters if provided, otherwise use internal filters
  const activeRoleId = externalRoleId !== undefined ? externalRoleId : parseInt(selectedRole);
  const activeProvinceId = externalProvinceId !== undefined ? externalProvinceId : selectedProvince;
  const activeDistrictId = externalDistrictId !== undefined ? externalDistrictId : selectedDistrict;
  const activeSchoolId = externalSchoolId !== undefined ? externalSchoolId : selectedSchool;

  // Color palette for charts
  const ETHNIC_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#f43f5e'];
  const ACCESSIBILITY_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

  // Create label mapping for ethnic groups
  const ethnicGroupLabelMap = {};
  ethnicGroupOptions.forEach(option => {
    ethnicGroupLabelMap[option.value] = option.label;
  });

  // Create label mapping for accessibility
  const accessibilityLabelMap = {};
  accessibilityOptions.forEach(option => {
    accessibilityLabelMap[option.value] = option.label;
  });

  // Fetch provinces on mount if showing own filters
  useEffect(() => {
    if (showOwnFilters && !provinceFetchedRef.current) {
      provinceFetchedRef.current = true;
      fetchProvinces();
    }
  }, [showOwnFilters]);

  const fetchProvinces = async () => {
    try {
      const response = await locationService.getProvinces();
      const provincesData = response.data || response;
      setProvinces(provincesData);
    } catch (err) {
      console.error('Failed to load provinces:', err);
    }
  };

  const handleOpenFilterSidebar = () => {
    setTempProvince(selectedProvince);
    setTempDistrict(selectedDistrict);
    setTempSchool(selectedSchool);
    setTempRole(selectedRole);
    setIsFilterSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsFilterSidebarOpen(false);
  };

  const handleApplyFilters = () => {
    setSelectedProvince(tempProvince);
    setSelectedDistrict(tempDistrict);
    setSelectedSchool(tempSchool);
    setSelectedRole(tempRole);
    setIsFilterSidebarOpen(false);
  };

  const handleProvinceChange = async (province) => {
    setTempProvince(province);
    setTempDistrict("");
    setTempSchool("");
    setDistricts([]);
    setSchools([]);

    if (province) {
      try {
        const response = await locationService.getDistrictsByProvince(province);
        const districtsData = response.data || response;
        setDistricts(districtsData);
      } catch (err) {
        console.error('Failed to load districts:', err);
      }
    }
  };

  const handleDistrictChange = async (district) => {
    setTempDistrict(district);
    setTempSchool("");
    setSchools([]);

    if (district) {
      try {
        const response = await schoolService.getSchoolsByDistrict(district);
        const schoolsData = response.data || response;
        setSchools(schoolsData);
      } catch (err) {
        console.error('Failed to load schools:', err);
      }
    }
  };

  const handleSchoolChange = (school) => {
    setTempSchool(school);
  };

  const handleRoleChange = (role) => {
    setTempRole(role);
  };

  const handleReset = () => {
    setSelectedProvince("");
    setSelectedDistrict("");
    setSelectedSchool("");
    setSelectedRole("9");
    setTempProvince("");
    setTempDistrict("");
    setTempSchool("");
    setTempRole("9");
  };

  const allRoleOptions = [
    { value: '9', label: t('students', 'Students') },
    { value: '8', label: t('teachers', 'Teachers') },
    ...roleOptions.filter(r => r.value !== '8').map(role => ({ value: role.value, label: role.label }))
  ];

  const fetchStudentDemographics = async () => {
    if (fetchingRef.current) {
      console.log('⏸️ SystemWideStudentStats: Fetch already in progress, skipping');
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      console.log('🔍 SystemWideStudentStats: Fetching demographics with filters:', {
        roleId: activeRoleId,
        provinceId: activeProvinceId,
        districtId: activeDistrictId,
        schoolId: activeSchoolId
      });

      // Build params object with active filters
      const params = { roleId: activeRoleId };
      if (activeProvinceId) params.provinceId = parseInt(activeProvinceId, 10);
      if (activeDistrictId) params.districtId = parseInt(activeDistrictId, 10);
      if (activeSchoolId) params.schoolId = parseInt(activeSchoolId, 10);

      // Fetch data with filters
      const [ethnicResponse, accessibilityResponse] = await Promise.all([
        dashboardService.getStudentEthnicGroupDistribution(params),
        dashboardService.getStudentAccessibilityDistribution(params)
      ]);

      console.log('📊 SystemWideStudentStats: Ethnic response:', ethnicResponse);
      console.log('📊 SystemWideStudentStats: Accessibility response:', accessibilityResponse);

      // Extract nested data arrays
      const ethnicDistribution = ethnicResponse.data?.ethnicGroupDistribution || [];
      const accessibilityDistribution = accessibilityResponse.data?.accessibilityDistribution || [];

      // Process ethnic group data
      const ethnicData = ethnicDistribution
        .filter(item => {
          const group = item.ethnicGroup;
          // Filter out null, undefined, empty, or unknown values
          if (!group || group === 'null' || group === 'undefined' || group === '' ||
              group.toLowerCase() === 'unknown') {
            return false;
          }
          return true;
        })
        .map(item => ({
          name: ethnicGroupLabelMap[item.ethnicGroup] || item.ethnicGroup,
          count: parseInt(item.count) || 0
        }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

      // Process accessibility data
      const accessibilityDataProcessed = accessibilityDistribution
        .filter(item => {
          const type = item.accessibilityType;
          // Filter out null, undefined, empty values
          if (!type || type === 'null' || type === 'undefined' || type === '') {
            return false;
          }
          return true;
        })
        .map(item => ({
          name: accessibilityLabelMap[item.accessibilityType] || item.accessibilityType,
          count: parseInt(item.count) || 0
        }))
        .sort((a, b) => b.count - a.count); // Sort by count descending

      console.log('✅ SystemWideStudentStats: Processed ethnic data:', ethnicData);
      console.log('✅ SystemWideStudentStats: Processed accessibility data:', accessibilityDataProcessed);

      setEthnicGroupData(ethnicData);
      setAccessibilityData(accessibilityDataProcessed);
    } catch (err) {
      console.error('❌ SystemWideStudentStats: Error fetching demographics:', err);
      setError(err.message || 'Failed to fetch student demographics');
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    fetchStudentDemographics();
  }, [activeRoleId, activeProvinceId, activeDistrictId, activeSchoolId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('ethnicGroupDistribution', 'Ethnic Group Distribution')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <DynamicLoader />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Accessibility className="h-5 w-5" />
              {t('accessibilityNeeds', 'Accessibility Needs')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center">
              <DynamicLoader />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-500">
              <p>{t('errorLoadingData', 'Error loading data')}</p>
              <p className="text-sm mt-2">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Button - Only show if showOwnFilters is true */}
      {showOwnFilters && (
        <div className="flex justify-end">
          <Button
            onClick={handleOpenFilterSidebar}
            variant="primary"
            size="sm"
          >
            <ListFilter className="h-5 w-5 mr-2" />
            {t('filters', 'Filters')}
            {(selectedProvince || selectedDistrict || selectedSchool || selectedRole !== '9') && (
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-white text-blue-600 rounded-full">
                {
                  [
                    selectedProvince,
                    selectedDistrict,
                    selectedSchool,
                    selectedRole !== '9' ? selectedRole : null,
                  ].filter(Boolean).length
                }
              </span>
            )}
          </Button>
        </div>
      )}

      {/* Filter Sidebar */}
      {showOwnFilters && (
        <SidebarFilter
          isOpen={isFilterSidebarOpen}
          onClose={handleCloseSidebar}
          title={t('filters', 'Filters')}
          subtitle={t('filterDescription', 'Select location and role to filter data')}
          hasFilters={!!(selectedProvince || selectedDistrict || selectedSchool || selectedRole !== '9')}
          onClearFilters={handleReset}
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
                  label: p.province_name_kh,
                }))}
                value={tempProvince}
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
                  label: d.district_name_kh || d.district_name_en || d.name,
                }))}
                value={tempDistrict}
                onValueChange={handleDistrictChange}
                placeholder={t('selectDistrict', 'Select District')}
                searchPlaceholder={t('searchDistrict', 'Search district...')}
                disabled={!tempProvince}
                minWidth="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('school', 'School')}
              </label>
              <SearchableDropdown
                options={schools.map((s) => ({
                  value: s.id,
                  label: s.school_name_kh || s.school_name_en || s.name,
                }))}
                value={tempSchool}
                onValueChange={handleSchoolChange}
                placeholder={t('selectSchool', 'Select School')}
                searchPlaceholder={t('searchSchool', 'Search school...')}
                disabled={!tempDistrict}
                minWidth="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('role', 'Role')}
              </label>
              <SearchableDropdown
                options={allRoleOptions}
                value={tempRole}
                onValueChange={handleRoleChange}
                placeholder={t('selectRole', 'Select Role')}
                searchPlaceholder={t('searchRole', 'Search role...')}
                minWidth="w-full"
              />
            </div>
          </div>
        </SidebarFilter>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Ethnic Group Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('ethnicGroupDistribution', 'Ethnic Group Distribution')}
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            {t('totalStudents', 'Total Students')}: {ethnicGroupData.reduce((sum, item) => sum + item.count, 0)}
          </p>
        </CardHeader>
        <CardContent>
          {ethnicGroupData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              {t('noEthnicGroupData', 'No ethnic group data available')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ethnicGroupData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} />
                <Tooltip
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar dataKey="count" name={t('students', 'Students')} radius={[0, 4, 4, 0]}>
                  {ethnicGroupData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ETHNIC_COLORS[index % ETHNIC_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Accessibility Needs Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t('accessibilityNeeds', 'Accessibility Needs')}
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            {t('totalStudents', 'Total Students')}: {accessibilityData.reduce((sum, item) => sum + item.count, 0)}
          </p>
        </CardHeader>
        <CardContent>
          {accessibilityData.length === 0 ? (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              {t('noAccessibilityData', 'No accessibility data available')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={accessibilityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip
                  cursor={{ fill: 'rgba(16, 185, 129, 0.1)' }}
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Bar dataKey="count" name={t('students', 'Students')} radius={[0, 4, 4, 0]}>
                  {accessibilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ACCESSIBILITY_COLORS[index % ACCESSIBILITY_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};

export default SystemWideStudentStats;
