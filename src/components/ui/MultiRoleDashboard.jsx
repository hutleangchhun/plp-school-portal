import React, { useEffect, useState } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import StatsCard from "./StatsCard";
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
  const [locationNames, setLocationNames] = useState({
    provinceName: null,
    districtName: null,
    communeName: null,
  });
  const [loadingLocations, setLoadingLocations] = useState(false);

  if (!user) {
    return null;
  }

  // Extract location names from officer data or use fallback names
  useEffect(() => {
    console.log("🔍 [useEffect] Extracting location names from officer data");

    if (!user?.officerRoles || user.officerRoles.length === 0) {
      console.log("🔍 [useEffect] No officer roles, skipping");
      return;
    }

    const officerData =
      user.provincialOfficer || user.districtOfficer || user.communeOfficer;
    console.log("🔍 [useEffect] Officer data:", officerData);

    if (!officerData) {
      console.log("🔍 [useEffect] No officer data found");
      return;
    }

    // Extract location names directly from officer data
    // API might return: province_name, district_name, commune_name OR just IDs
    const names = {
      provinceName:
        officerData.province_name || officerData.provinceName || null,
      districtName:
        officerData.district_name || officerData.districtName || null,
      communeName: officerData.commune_name || officerData.communeName || null,
    };

    console.log("🔍 [useEffect] Extracted names from officer data:", names);

    // If any names are missing, fetch them
    const needsFetch =
      !names.provinceName || !names.districtName || !names.communeName;

    if (needsFetch) {
      console.log("⚠️ [useEffect] Some names missing, fetching from API...");
      setLoadingLocations(true);

      const fetchMissingNames = async () => {
        try {
          let finalNames = { ...names };

          // Fetch province name
          if (!finalNames.provinceName && officerData.provinceId) {
            console.log(
              "🔍 Fetching province name for ID:",
              officerData.provinceId
            );
            finalNames.provinceName = await locationService.getProvinceName(
              officerData.provinceId
            );
            console.log("✅ Province name:", finalNames.provinceName);
          }

          // Fetch district name
          if (
            !finalNames.districtName &&
            officerData.districtId &&
            officerData.provinceId
          ) {
            console.log(
              "🔍 Fetching district name for ID:",
              officerData.districtId
            );
            finalNames.districtName = await locationService.getDistrictName(
              officerData.provinceId,
              officerData.districtId
            );
            console.log("✅ District name:", finalNames.districtName);
          }

          // Fetch commune name
          if (
            !finalNames.communeName &&
            officerData.communeId &&
            officerData.provinceId &&
            officerData.districtId
          ) {
            console.log(
              "🔍 Fetching commune name for ID:",
              officerData.communeId
            );
            finalNames.communeName = await locationService.getCommuneName(
              officerData.provinceId,
              officerData.districtId,
              officerData.communeId
            );
            console.log("✅ Commune name:", finalNames.communeName);
          }

          console.log("✅ All names ready:", finalNames);
          setLocationNames(finalNames);
        } catch (error) {
          console.error("❌ Error fetching location names:", error);
          setLocationNames(names);
        } finally {
          setLoadingLocations(false);
        }
      };

      fetchMissingNames();
    } else {
      console.log("✅ All location names available from officer data");
      setLocationNames(names);
      setLoadingLocations(false);
    }
  }, [user]);

  // Extract multi-role data
  // Users can have ONE of: PROVINCIAL_OFFICER, DISTRICT_OFFICER, or COMMUNE_OFFICER (defined in officerRoles array)
  const isTeacher = user.roleId === 8;
  const isProvincialOfficer = userUtils.isProvincialOfficer(user);
  const isDistrictOfficer = userUtils.isDistrictOfficer(user);
  const isCommuneOfficer = userUtils.isCommuneOfficer(user);

  // Get the appropriate officer data based on which officerRole they have
  // Priority: provincialOfficer > districtOfficer > communeOfficer
  // (Only one will be populated based on officerRoles array)
  const officerData =
    user.provincialOfficer || user.districtOfficer || user.communeOfficer;

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
            {/* Officer Section */}
            {officerData && (
              <div className="">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  {t("officialResponsibilities", "Official Responsibilities")}
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {officerData.provinceIds && officerData.provinceIds.length > 0 && (
                    <StatsCard
                      title={t("province", "Province")}
                      value={
                        loadingLocations
                          ? "..."
                          : locationNames.provinceName ||
                            `Province ${officerData.provinceIds[0]}`
                      }
                      subtitle={
                        officerData.provinceIds.length > 1
                          ? `+${officerData.provinceIds.length - 1} more`
                          : undefined
                      }
                      valueColor="text-gray-900"
                      titleColor="text-gray-700"
                    />
                  )}
                  {officerData.districtIds && officerData.districtIds.length > 0 && (
                    <StatsCard
                      title={t("district", "District")}
                      value={
                        loadingLocations
                          ? "..."
                          : locationNames.districtName ||
                            `District ${officerData.districtIds[0]}`
                      }
                      subtitle={
                        officerData.districtIds.length > 1
                          ? `+${officerData.districtIds.length - 1} more`
                          : undefined
                      }
                      valueColor="text-gray-900"
                      titleColor="text-gray-700"
                    />
                  )}
                  {officerData.communeIds && officerData.communeIds.length > 0 && (
                    <StatsCard
                      title={t("commune", "Commune")}
                      value={
                        loadingLocations
                          ? "..."
                          : locationNames.communeName ||
                            `Commune ${officerData.communeIds[0]}`
                      }
                      subtitle={
                        officerData.communeIds.length > 1
                          ? `+${officerData.communeIds.length - 1} more`
                          : undefined
                      }
                      valueColor="text-gray-900"
                      titleColor="text-gray-700"
                    />
                  )}
                  <StatsCard
                    title={t("role", "Role")}
                    value={
                      officerType === "PROVINCIAL_OFFICER"
                        ? t("provincialOfficer", "Provincial Officer")
                        : officerType === "DISTRICT_OFFICER"
                        ? t("districtOfficer", "District Officer")
                        : officerType === "COMMUNE_OFFICER"
                        ? t("communeOfficer", "Commune Officer")
                        : "-"
                    }
                    valueColor="text-gray-900"
                    titleColor="text-gray-700"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* School Distribution Chart with location filters */}
      <SchoolDistributionChart
        className="w-full"
        user={user}
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
