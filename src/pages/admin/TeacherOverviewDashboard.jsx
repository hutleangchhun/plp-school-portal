import React, { useState, useEffect, useMemo } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import {
  PageTransition,
  FadeInSection,
} from "../../components/ui/PageTransition";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../components/ui/card";
import ErrorDisplay from "../../components/ui/ErrorDisplay";
import SearchableDropdown from "../../components/ui/SearchableDropdown";
import SidebarFilter from "../../components/ui/SidebarFilter";
import TeacherEmploymentTypeTab from "../../components/admin/TeacherEmploymentTypeTab";
import TeacherExtraLearningToolTab from "../../components/admin/TeacherExtraLearningToolTab";
import AdminUserDemographic from "./AdminUserDemographic";
import locationService from "../../utils/api/services/locationService";
import schoolService from "../../utils/api/services/schoolService";
import { Button } from "@/components/ui/Button";
import { ListFilter } from "lucide-react";
import { roleOptions } from "../../utils/formOptions";

const TeacherOverviewDashboard = () => {
  const { t } = useLanguage();
  const { error, handleError, clearError } = useErrorHandler();

  // Location state for filtering
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [schools, setSchools] = useState([]);

  // Applied filters (used for data fetching)
  const [selectedProvince, setSelectedProvince] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedSchool, setSelectedSchool] = useState("");
  const [selectedRole, setSelectedRole] = useState("8"); // Default to teachers

  // Temporary filters (while sidebar is open)
  const [tempProvince, setTempProvince] = useState("");
  const [tempDistrict, setTempDistrict] = useState("");
  const [tempSchool, setTempSchool] = useState("");
  const [tempRole, setTempRole] = useState("8");

  const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);

  // Ref to prevent duplicate province fetches
  const provinceFetchedRef = React.useRef(false);

  // Fetch provinces on mount
  useEffect(() => {
    if (!provinceFetchedRef.current) {
      provinceFetchedRef.current = true;
      fetchProvinces();
    }
  }, []);

  const fetchProvinces = async () => {
    try {
      clearError();
      const response = await locationService.getProvinces();
      const provincesData = response.data || response;
      setProvinces(provincesData);
    } catch (err) {
      handleError(err, {
        toastMessage: t("failedToLoadProvinces", "Failed to load provinces"),
      });
    }
  };

  // Handle opening sidebar - initialize temp filters from applied filters
  const handleOpenFilterSidebar = () => {
    setTempProvince(selectedProvince);
    setTempDistrict(selectedDistrict);
    setTempSchool(selectedSchool);
    setTempRole(selectedRole);
    setIsFilterSidebarOpen(true);
  };

  // Handle closing sidebar without applying
  const handleCloseSidebar = () => {
    setIsFilterSidebarOpen(false);
  };

  // Handle applying filters from sidebar
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
        clearError();
        const response = await locationService.getDistrictsByProvince(province);
        const districtsData = response.data || response;
        setDistricts(districtsData);
      } catch (err) {
        handleError(err, {
          toastMessage: t("failedToLoadDistricts", "Failed to load districts"),
        });
      }
    }
  };

  const handleDistrictChange = async (district) => {
    setTempDistrict(district);
    setTempSchool("");
    setSchools([]);

    if (district) {
      try {
        clearError();
        const response = await schoolService.getSchoolsByDistrict(district);
        const schoolsData = response.data || response;
        setSchools(schoolsData);
      } catch (err) {
        handleError(err, {
          toastMessage: t("failedToLoadSchools", "Failed to load schools"),
        });
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
    setSelectedRole("8");
    setTempProvince("");
    setTempDistrict("");
    setTempSchool("");
    setTempRole("8");
  };

  // Prepare role options with Students at the top
  const allRoleOptions = [
    { value: "9", label: t("students", "Students") },
    { value: "8", label: t("teachers", "Teachers") },
    ...roleOptions
      .filter((r) => r.value !== "8")
      .map((role) => ({ value: role.value, label: role.label })),
  ];

  // Memoize filters object to prevent recreating on every render
  const filters = useMemo(
    () => ({
      selectedProvince,
      selectedDistrict,
      selectedSchool,
      selectedRole,
    }),
    [selectedProvince, selectedDistrict, selectedSchool, selectedRole]
  );

  if (error) {
    return (
      <ErrorDisplay
        error={error}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50 p-3 sm:p-4">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <FadeInSection delay={100} className="mb-6">
          <div className="">
            <div className="flex items-center justify-between gap-5">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {t("teacherOverview", "Teacher Overview")}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {t(
                    "teacherOverviewDesc",
                    "View all teachers data distribution in the system"
                  )}
                </p>
              </div>
              <Button
                onClick={handleOpenFilterSidebar}
                variant="primary"
                size="sm"
              >
                <ListFilter className="h-5 w-5 mr-2" />
                {t("filters", "Filters")}
                {(selectedProvince ||
                  selectedDistrict ||
                  selectedSchool ||
                  selectedRole !== "8") && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-semibold bg-white text-blue-600 rounded-full">
                    {
                      [
                        selectedProvince,
                        selectedDistrict,
                        selectedSchool,
                        selectedRole !== "8" ? selectedRole : null,
                      ].filter(Boolean).length
                    }
                  </span>
                )}
              </Button>
            </div>
          </div>
        </FadeInSection>

        {/* Filter Sidebar */}
        <SidebarFilter
          isOpen={isFilterSidebarOpen}
          onClose={handleCloseSidebar}
          title={t("filters", "Filters")}
          subtitle={t(
            "filterDescription",
            "Select location and role to filter data"
          )}
          hasFilters={
            !!(
              selectedProvince ||
              selectedDistrict ||
              selectedSchool ||
              selectedRole !== "8"
            )
          }
          onClearFilters={handleReset}
          onApply={handleApplyFilters}
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t("province", "Province")}
              </label>
              <SearchableDropdown
                options={provinces.map((p) => ({
                  value: p.id,
                  label: p.province_name_kh,
                }))}
                value={tempProvince}
                onValueChange={handleProvinceChange}
                placeholder={t("selectProvince", "Select Province")}
                searchPlaceholder={t("searchProvince", "Search province...")}
                minWidth="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t("district", "District")}
              </label>
              <SearchableDropdown
                options={districts.map((d) => ({
                  value: d.id,
                  label: d.district_name_kh || d.district_name_en || d.name,
                }))}
                value={tempDistrict}
                onValueChange={handleDistrictChange}
                placeholder={t("selectDistrict", "Select District")}
                searchPlaceholder={t("searchDistrict", "Search district...")}
                disabled={!tempProvince}
                minWidth="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t("school", "School")}
              </label>
              <SearchableDropdown
                options={schools.map((s) => ({
                  value: s.id,
                  label: s.school_name_kh || s.school_name_en || s.name,
                }))}
                value={tempSchool}
                onValueChange={handleSchoolChange}
                placeholder={t("selectSchool", "Select School")}
                searchPlaceholder={t("searchSchool", "Search school...")}
                disabled={!tempDistrict}
                minWidth="w-full"
              />
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                {t("role", "Role")}
              </label>
              <SearchableDropdown
                options={allRoleOptions}
                value={tempRole}
                onValueChange={handleRoleChange}
                placeholder={t("selectRole", "Select Role")}
                searchPlaceholder={t("searchRole", "Search role...")}
                minWidth="w-full"
              />
            </div>
          </div>
        </SidebarFilter>

        {/* Teacher Demographics Section */}
        <FadeInSection delay={300} className="mb-6">
          <Card className="border border-gray-200 shadow-sm rounded-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">
                {t("teacherDemographics", "Teacher Demographics")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdminUserDemographic
                fixedRole={8}
                showPageWrapper={false}
                filters={filters}
                useGlobalFilters={true}
              />
            </CardContent>
          </Card>
        </FadeInSection>

        {/* Employment Type Statistics */}
        <FadeInSection delay={400} className="mb-6">
          <Card className="border border-gray-200 shadow-sm rounded-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">
                {t("employmentType", "Teacher Employment Type Statistics")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TeacherEmploymentTypeTab filters={filters} />
            </CardContent>
          </Card>
        </FadeInSection>

        {/* Extra Learning Tools Statistics */}
        <FadeInSection delay={500} className="mb-6">
          <Card className="border border-gray-200 shadow-sm rounded-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold">
                {t(
                  "extraLearningTools",
                  "Teacher Extra Learning Tools Statistics"
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TeacherExtraLearningToolTab filters={filters} />
            </CardContent>
          </Card>
        </FadeInSection>
      </div>
    </PageTransition>
  );
};

export default TeacherOverviewDashboard;
