import React, { useEffect, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import Badge from "./Badge";
import SchoolDistributionChart from "./SchoolDistributionChart";
import { userUtils } from "../../utils/api/services/userService";
import locationService from "../../utils/api/services/locationService";

/**
 * MultiRoleDashboard Component
 * Displays combined dashboard for teachers with multiple roles (TEACHER + PROVINCIAL_OFFICER)
 * Shows both teacher statistics (classes) and provincial officer statistics
 */
const MultiRoleDashboard = ({ user, className = "" }) => {
  const { t } = useLanguage();
  const [locationNames, setLocationNames] = useState({});
  const [loadingNames, setLoadingNames] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);

  // Listen for localStorage updates when secondary role changes
  useEffect(() => {
    const handleUserDataUpdated = () => {
      console.log('🔄 [MultiRoleDashboard] User data updated event received');
      try {
        const updatedUser = JSON.parse(localStorage.getItem('user') || '{}');
        setCurrentUser(updatedUser);
        console.log('✅ [MultiRoleDashboard] Updated user from localStorage:', updatedUser);
      } catch (error) {
        console.error('❌ [MultiRoleDashboard] Error reading updated user from localStorage:', error);
      }
    };

    window.addEventListener('userDataUpdated', handleUserDataUpdated);
    return () => window.removeEventListener('userDataUpdated', handleUserDataUpdated);
  }, []);

  // Update currentUser when prop changes
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  if (!currentUser) {
    return null;
  }

  // Extract multi-role data
  // Users can have ONE of: PROVINCIAL_OFFICER, DISTRICT_OFFICER, or COMMUNE_OFFICER (defined in officerRoles array)
  const isTeacher = currentUser.roleId === 8;
  const isProvincialOfficer = userUtils.isProvincialOfficer(currentUser);
  const isDistrictOfficer = userUtils.isDistrictOfficer(currentUser);
  const isCommuneOfficer = userUtils.isCommuneOfficer(currentUser);

  // Get the appropriate officer data based on which officerRole they have
  // Priority: provincialOfficer > districtOfficer > communeOfficer
  // (Only one will be populated based on officerRoles array)
  const officerData =
    currentUser.provincialOfficer || currentUser.districtOfficer || currentUser.communeOfficer;

  // Determine officer type from the first true condition
  const officerType = isProvincialOfficer
    ? "PROVINCIAL_OFFICER"
    : isDistrictOfficer
    ? "DISTRICT_OFFICER"
    : isCommuneOfficer
    ? "COMMUNE_OFFICER"
    : null;

  // Show dashboard if user has ANY officer role (with or without teacher role)
  const hasOfficerRole =
    isProvincialOfficer || isDistrictOfficer || isCommuneOfficer;
  if (!hasOfficerRole) {
    return null;
  }

  // Extract filter IDs from officer data (use first ID for filtering)
  // API supports filtering by single province/district/commune ID
  const filterProvinceId = officerData?.provinceIds?.[0] || null;
  const filterDistrictId = officerData?.districtIds?.[0] || null;
  const filterCommuneId = officerData?.communeIds?.[0] || null;

  // Restricted location IDs for sidebar filters - only show user's assigned locations
  const restrictedProvinceIds = officerData?.provinceIds || [];
  const restrictedDistrictIds = officerData?.districtIds || [];
  const restrictedCommuneIds = officerData?.communeIds || [];

  // Fetch location names for all assigned IDs
  useEffect(() => {
    const fetchLocationNames = async () => {
      try {
        setLoadingNames(true);
        const names = {};

        // Fetch province names
        if (restrictedProvinceIds.length > 0) {
          for (const provinceId of restrictedProvinceIds) {
            try {
              const name = await locationService.getProvinceName(provinceId);
              names[`province_${provinceId}`] = name;
            } catch (error) {
              console.error(`Error fetching province name for ID ${provinceId}:`, error);
              names[`province_${provinceId}`] = `Province ${provinceId}`;
            }
          }
        }

        // Fetch district names
        if (restrictedDistrictIds.length > 0 && filterProvinceId) {
          for (const districtId of restrictedDistrictIds) {
            try {
              const name = await locationService.getDistrictName(filterProvinceId, districtId);
              names[`district_${districtId}`] = name;
            } catch (error) {
              console.error(`Error fetching district name for ID ${districtId}:`, error);
              names[`district_${districtId}`] = `District ${districtId}`;
            }
          }
        }

        // Fetch commune names
        if (restrictedCommuneIds.length > 0 && filterProvinceId && filterDistrictId) {
          for (const communeId of restrictedCommuneIds) {
            try {
              const name = await locationService.getCommuneName(filterProvinceId, filterDistrictId, communeId);
              names[`commune_${communeId}`] = name;
            } catch (error) {
              console.error(`Error fetching commune name for ID ${communeId}:`, error);
              names[`commune_${communeId}`] = `Commune ${communeId}`;
            }
          }
        }

        setLocationNames(names);
      } catch (error) {
        console.error('Error fetching location names:', error);
      } finally {
        setLoadingNames(false);
      }
    };

    if (officerData) {
      fetchLocationNames();
    }
  }, [restrictedProvinceIds.join(','), restrictedDistrictIds.join(','), restrictedCommuneIds.join(','), filterProvinceId, filterDistrictId]);

  console.log('🎯 Multi-Role Dashboard filters:');
  console.log('   - Province IDs:', officerData?.provinceIds);
  console.log('   - District IDs:', officerData?.districtIds);
  console.log('   - Commune IDs:', officerData?.communeIds);
  console.log('   - Filter Province ID:', filterProvinceId);
  console.log('   - Filter District ID:', filterDistrictId);
  console.log('   - Filter Commune ID:', filterCommuneId);
  console.log('   - Restricted Province IDs:', restrictedProvinceIds);
  console.log('   - Restricted District IDs:', restrictedDistrictIds);
  console.log('   - Restricted Commune IDs:', restrictedCommuneIds);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className=" rounded-sm border border-gray-200 bg-white p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t("multiRoleDashboard", "Multi-Role Dashboard")}
        </h2>
        <p className="text-gray-600 mb-4">
          {t(
            "multiRoleDescription",
            "Combined view of your teacher and officer responsibilities"
          )}
        </p>

        {/* Role badges */}
        <div className="flex flex-wrap gap-2">
          {isTeacher && (
            <Badge color="green" variant="outline" size="sm">
              {t("teacher", "Teacher")}
            </Badge>
          )}
          {isProvincialOfficer && (
            <Badge color="purple" variant="outline" size="sm">
              {t("provincialOfficer", "Provincial Officer")}
            </Badge>
          )}
          {isDistrictOfficer && (
            <Badge color="blue" variant="outline" size="sm">
              {t("districtOfficer", "District Officer")}
            </Badge>
          )}
          {isCommuneOfficer && (
            <Badge color="pink" variant="outline" size="sm">
              {t("communeOfficer", "Commune Officer")}
            </Badge>
          )}
        </div>
        {/* Overview Section */}
        <div className="bg-white rounded-lg mt-4">
          <div className="space-y-6">
            {/* All Assigned Locations Section */}
            {officerData && (
              <div className="mt-6 pt-4 border-t border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {t("assignedLocations", "Assigned Locations")}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* All Provinces Card */}
                  {officerData.provinceIds && officerData.provinceIds.length > 0 && (
                    <div className="flex-1 min-w-0 bg-gray-50 border-gray-100 border-2 p-4 rounded-md">
                      <p className="text-sm font-medium text-gray-500">{t("allAssignedProvinces", "ខេត្ត/ស្រុក")}</p>
                      <p className="text-sm text-gray-900 break-words mt-1">
                        {loadingNames ? t("loading", "កំពុងផ្ទុក...") : officerData.provinceIds.map(provinceId => locationNames[`province_${provinceId}`] || `Province ${provinceId}`).join(', ') || '-'}
                      </p>
                    </div>
                  )}

                  {/* All Districts Card */}
                  {officerData.districtIds && officerData.districtIds.length > 0 && (
                    <div className="flex-1 min-w-0 bg-gray-50 border-gray-100 border-2 p-4 rounded-md">
                      <p className="text-sm font-medium text-gray-500">{t("allAssignedDistricts", "ស្រុក")}</p>
                      <p className="text-sm text-gray-900 break-words mt-1">
                        {loadingNames ? t("loading", "កំពុងផ្ទុក...") : officerData.districtIds.map(districtId => locationNames[`district_${districtId}`] || `District ${districtId}`).join(', ') || '-'}
                      </p>
                    </div>
                  )}

                  {/* All Communes Card */}
                  {officerData.communeIds && officerData.communeIds.length > 0 && (
                    <div className="flex-1 min-w-0 bg-gray-50 border-gray-100 border-2 p-4 rounded-md">
                      <p className="text-sm font-medium text-gray-500">{t("allAssignedCommunes", "ឃុំ")}</p>
                      <p className="text-sm text-gray-900 break-words mt-1">
                        {loadingNames ? t("loading", "កំពុងផ្ទុក...") : officerData.communeIds.map(communeId => locationNames[`commune_${communeId}`] || `Commune ${communeId}`).join(', ') || '-'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* School Distribution Chart with location filters */}
      <SchoolDistributionChart
        className="w-full"
        user={currentUser}
        filterProvinceId={filterProvinceId}
        filterDistrictId={filterDistrictId}
        restrictedProvinceIds={restrictedProvinceIds}
        restrictedDistrictIds={restrictedDistrictIds}
        restrictedCommuneIds={restrictedCommuneIds}
      />
    </div>
  );
};

export default MultiRoleDashboard;
