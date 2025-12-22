import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import SystemWideStudentStats from '../../components/admin/SystemWideStudentStats';
import SidebarFilter from '../../components/ui/SidebarFilter';
import SearchableDropdown from '../../components/ui/SearchableDropdown';
import { Button } from '../../components/ui/Button';
import { ListFilter } from 'lucide-react';
import locationService from '../../utils/api/services/locationService';
import schoolService from '../../utils/api/services/schoolService';

/**
 * AdminUserDemographic Component
 * Page for viewing user demographics with global filters
 * Can be used for teachers (with role filter) or students (without role filter)
 * @param {number} fixedRole - If provided, role is fixed and role filter is hidden (e.g., 9 for students, 8 for teachers)
 * @param {boolean} showPageWrapper - Whether to show PageTransition wrapper (default: true)
 */
const AdminUserDemographic = ({ fixedRole, showPageWrapper = true }) => {
  const { t } = useLanguage();

  // Location state for filtering
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [schools, setSchools] = useState([]);

  // Applied filters
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedRole, setSelectedRole] = useState(fixedRole ? String(fixedRole) : "9");

  // Temporary filters (while sidebar is open)
  const [tempProvince, setTempProvince] = useState("");
  const [tempDistrict, setTempDistrict] = useState("");
  const [tempSchool, setTempSchool] = useState("");
  const [tempRole, setTempRole] = useState(fixedRole ? String(fixedRole) : "9");

  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);
  const provinceFetchedRef = useRef(false);

  // Fetch provinces on mount
  useEffect(() => {
    if (!provinceFetchedRef.current) {
      provinceFetchedRef.current = true;
      fetchProvinces();
    }
  }, []);

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
    if (!fixedRole) {
      setSelectedRole(tempRole);
    }
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
    if (!fixedRole) {
      setTempRole(role);
    }
  };

  const handleReset = () => {
    setSelectedProvince("");
    setSelectedDistrict("");
    setSelectedSchool("");
    if (!fixedRole) {
      setSelectedRole("9");
      setTempRole("9");
    }
    setTempProvince("");
    setTempDistrict("");
    setTempSchool("");
  };

  const roleOptions = [
    { value: '9', label: t('students', 'Students') },
    { value: '8', label: t('teachers', 'Teachers') }
  ];

  // Helper to get role label
  const getRoleLabel = (roleValue) => {
    const role = roleOptions.find(r => r.value === roleValue);
    return role ? role.label : roleValue;
  };

  // Helper to get location labels
  const getProvinceLabel = () => {
    const province = provinces.find(p => p.id === selectedProvince);
    return province ? province.province_name_kh : '';
  };

  const getDistrictLabel = () => {
    const district = districts.find(d => d.id === selectedDistrict);
    return district ? (district.district_name_kh || district.district_name_en || district.name) : '';
  };

  const getSchoolLabel = () => {
    const school = schools.find(s => s.id === selectedSchool);
    return school ? (school.school_name_kh || school.school_name_en || school.name) : '';
  };

  const content = (
    <>
      {/* Filter Button */}
      <div className="flex justify-end mb-6">
        <Button
          onClick={handleOpenFilterSidebar}
          variant="primary"
          size="sm"
        >
          <ListFilter className="h-5 w-5 mr-2" />
          {t('filters', 'Filters')}
          {(selectedProvince || selectedDistrict || selectedSchool || (!fixedRole && selectedRole !== '9')) && (
            <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-white text-blue-600 rounded-full">
              {
                [
                  selectedProvince,
                  selectedDistrict,
                  selectedSchool,
                  !fixedRole && selectedRole !== '9' ? selectedRole : null,
                ].filter(Boolean).length
              }
            </span>
          )}
        </Button>
      </div>

      {/* Active Filters Display */}
      {(selectedProvince || selectedDistrict || selectedSchool || (!fixedRole && selectedRole !== '9')) && (
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="text-sm font-medium text-gray-700">{t('activeFilters', 'Active Filters')}:</span>
          {selectedProvince && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">
              {t('province', 'Province')}: {getProvinceLabel()}
            </span>
          )}
          {selectedDistrict && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">
              {t('district', 'District')}: {getDistrictLabel()}
            </span>
          )}
          {selectedSchool && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">
              {t('school', 'School')}: {getSchoolLabel()}
            </span>
          )}
          {!fixedRole && selectedRole !== '9' && (
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-md text-sm font-medium">
              {t('role', 'Role')}: {getRoleLabel(selectedRole)}
            </span>
          )}
        </div>
      )}

      {/* Filter Sidebar */}
      <SidebarFilter
        isOpen={isFilterSidebarOpen}
        onClose={handleCloseSidebar}
        title={t('filters', 'Filters')}
        subtitle={t('filterDescription', 'Select location and role to filter data')}
        hasFilters={!!(selectedProvince || selectedDistrict || selectedSchool || (!fixedRole && selectedRole !== '9'))}
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

          {/* Role Filter - Only show if role is not fixed */}
          {!fixedRole && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t('role', 'Role')}
              </label>
              <SearchableDropdown
                options={roleOptions}
                value={tempRole}
                onValueChange={handleRoleChange}
                placeholder={t('selectRole', 'Select Role')}
                searchPlaceholder={t('searchRole', 'Search role...')}
                minWidth="w-full"
              />
            </div>
          )}
        </div>
      </SidebarFilter>

      {/* Demographics Charts */}
      <SystemWideStudentStats
        roleId={parseInt(selectedRole)}
        provinceId={selectedProvince}
        districtId={selectedDistrict}
        schoolId={selectedSchool}
        showOwnFilters={false}
        key={`${selectedRole}-${selectedProvince}-${selectedDistrict}-${selectedSchool}`}
      />
    </>
  );

  if (showPageWrapper) {
    return (
      <PageTransition>
        <div className="p-6 space-y-6">
          <FadeInSection>
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                {fixedRole === 8 ? t('teacherDemographics', 'Teacher Demographics') : t('studentDemographics', 'Student Demographics')}
              </h1>
              <p className="text-gray-600 mt-2">
                {fixedRole === 8
                  ? t('viewTeacherDemographics', 'View teacher ethnic groups and accessibility needs across all schools')
                  : t('viewStudentDemographics', 'View student ethnic groups and accessibility needs across all schools')
                }
              </p>
            </div>
          </FadeInSection>

          <FadeInSection delay={100}>
            {content}
          </FadeInSection>
        </div>
      </PageTransition>
    );
  }

  return content;
};

export default AdminUserDemographic;
