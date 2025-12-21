import { Shield, Briefcase, MapPin, Hash, School } from "lucide-react";
import SchoolOverviewChart from "../../components/ui/SchoolOverviewChart";
import StudentDemographicsChart from "../../components/ui/StudentDemographicsChart";
import BMIPieChart from "../../components/ui/BMIPieChart";
import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "../../contexts/LanguageContext";
import { useLoading } from "../../contexts/LoadingContext";
import WelcomeAlert from "../../components/ui/WelcomeAlert";
import {
  PageTransition,
  FadeInSection,
} from "../../components/ui/PageTransition";
import StatsCard from "../../components/ui/StatsCard";
import { utils, userService } from "../../utils/api";
import classService from "../../utils/api/services/classService";
import { teacherService } from "../../utils/api/services/teacherService";
import schoolService from "../../utils/api/services/schoolService";
import { studentService } from "../../utils/api/services/studentService";
import { dashboardService } from "../../utils/api/services/dashboardService";
import Badge from "@/components/ui/Badge";
import { useStableCallback } from "../../utils/reactOptimization";
import ErrorDisplay from "../../components/ui/ErrorDisplay";
import { useErrorHandler } from "../../hooks/useErrorHandler";
import DynamicLoader, { PageLoader } from "../../components/ui/DynamicLoader";
import AttendanceStatusCard from "../../components/attendance/AttendanceStatusCard";
import { getStaticAssetBaseUrl } from "../../utils/api/config";

export default function Dashboard({ user: initialUser }) {
  const { t } = useLanguage();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const { startLoading, stopLoading } = useLoading();
  const [user, setUserData] = useState(initialUser);
  const [showWelcome, setShowWelcome] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const fetchingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const [schoolStats, setSchoolStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalDirectors: 0,
    totalDeputyPrincipals: 0,
    totalSecretaries: 0,
    totalTreasurers: 0,
    totalLibrarians: 0,
    totalWorkshop: 0,
    totalSecurity: 0,
    totalTeacherIct: 0,
  });
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [schoolImageError, setSchoolImageError] = useState(false);

  // Construct full image URL from relative path
  const getFullImageUrl = useCallback((relativePath) => {
    if (!relativePath) return null;
    if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
      return relativePath;
    }
    if (relativePath.startsWith('data:')) {
      return relativePath;
    }
    const baseUrl = getStaticAssetBaseUrl();
    return `${baseUrl}/uploads/${relativePath}`;
  }, []);

  const [authUser, setAuthUser] = useState(() => {
    try {
      const userData = localStorage.getItem("user");
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      handleError(err, {
        toastMessage: t(
          "failedToParseUserData",
          "Failed to parse user data from localStorage"
        ),
        setError: false,
      });
      return null;
    }
  });

  // Listen for localStorage changes (e.g., after login updates user data)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const userData = localStorage.getItem("user");
        if (userData) {
          const parsedUser = JSON.parse(userData);
          console.log(
            "🔄 localStorage changed in Dashboard, updating authUser state:",
            parsedUser
          );
          setAuthUser(parsedUser);
          setUserData(parsedUser);
        } else {
          setAuthUser(null);
          setUserData(null);
        }
      } catch (err) {
        console.error("Error parsing updated user data:", err);
      }
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener("storage", handleStorageChange);

    // Also set up a custom event listener for same-tab updates
    window.addEventListener("userDataUpdated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("userDataUpdated", handleStorageChange);
    };
  }, []);
  // Fetch user data and school statistics
  const fetchUserData = useStableCallback(async () => {
    // Prevent duplicate fetches
    if (fetchingRef.current) {
      console.log("⏸️ Dashboard: fetchUserData already in progress, skipping");
      return;
    }

    console.log(
      "🔄 Dashboard: fetchUserData called at",
      new Date().toISOString()
    );
    clearError();

    try {
      fetchingRef.current = true;
      startLoading(
        "fetchUserData",
        t("loadingDashboard", "Loading dashboard...")
      );

      // Always get account data from my-account endpoint
      const accountResponse = await userService.getMyAccount();
      const accountData = accountResponse?.data || accountResponse;
      console.log("📥 Dashboard my-account response:", accountData);

      if (
        accountData &&
        (accountData.username || accountData.fullname || accountData.email)
      ) {
        setUserData(accountData);
      } else {
        throw new Error(
          t("noValidUserData", "No valid user data received from API")
        );
      }

      // Fetch school information and statistics if we have school ID
      if (accountData && accountData.school_id) {
        try {
          console.log("📊 Dashboard: Account data:", {
            roleId: accountData.roleId,
            role_id: accountData.role_id,
            schoolId: accountData.school_id,
          });

          // Get school information
          const schoolResponse = await schoolService.getSchoolInfo(
            accountData.school_id
          );
          const schoolData = schoolResponse?.data || schoolResponse;
          if (schoolData && (schoolData.id || schoolData.schoolId)) {
            setSchoolInfo(schoolData);
            console.log("✅ Dashboard school info:", schoolData);
          }

          // For directors, use the optimized getSchoolDistribution endpoint
          if (accountData?.roleId === 14 || accountData?.role_id === 14) {
            console.log(
              "📊 Fetching director dashboard data via getSchoolDistribution..."
            );
            const distributionResponse =
              await dashboardService.getSchoolDistribution({
                schoolId: accountData.school_id,
              });

            console.log("📊 Distribution response:", distributionResponse);

            if (
              distributionResponse.success &&
              distributionResponse.raw &&
              distributionResponse.raw.length > 0
            ) {
              const schoolData = distributionResponse.raw[0];
              console.log("📊 School data from distribution:", schoolData);

              setSchoolStats({
                totalClasses: schoolData.classCount || 0,
                totalStudents: schoolData.studentCount || 0,
                totalTeachers: schoolData.teacherCount || 0,
                totalDirectors: schoolData.directorCount || 0,
                totalDeputyPrincipals: schoolData.deputyPrincipalCount || 0,
                totalSecretaries: schoolData.schoolSecretaryCount || 0,
                totalTreasurers: schoolData.schoolTreasurerCount || 0,
                totalLibrarians: schoolData.schoolLibrarianCount || 0,
                totalWorkshop: schoolData.schoolWorkshopCount || 0,
                totalSecurity: schoolData.schoolSecurityCount || 0,
                totalTeacherIct: schoolData.teacherIctCount || 0,
              });

              console.log(
                "✅ Director dashboard school stats set successfully"
              );
            } else {
              console.error(
                "❌ Invalid distribution response structure:",
                distributionResponse
              );
              throw new Error("Failed to fetch school distribution data");
            }
          } else {
            console.log(
              "📊 Fetching non-director dashboard data (teachers/others)..."
            );
            // For non-directors, use the original approach
            // Get classes count - fetch all classes without limit
            const classesResponse = await classService.getBySchool(
              accountData.school_id,
              {
                page: 1,
                limit: 9999, // No practical limit - fetch all classes
              }
            );
            const totalClasses = classesResponse?.classes?.length || 0;
            console.log("📊 Total classes:", totalClasses);

            // Get total students count - fetch all students without pagination
            const studentsResponse =
              await studentService.getStudentsBySchoolClasses(
                accountData.school_id,
                {
                  page: 1,
                  limit: 9999, // No practical limit - fetch all students
                }
              );

            // Use pagination.total if available (server-side count), otherwise use data length
            const totalStudents =
              studentsResponse?.pagination?.total ||
              studentsResponse?.data?.length ||
              0;
            console.log("📊 Total students:", totalStudents);

            // Get teachers count from the teachers endpoint - fetch all teachers
            const teachersResponse = await teacherService.getTeachersBySchool(
              accountData.school_id,
              {
                page: 1,
                limit: 200, // API max limit is 100
              }
            );

            // Count based on roleId: directors are roleId = 14
            const allTeachers = teachersResponse?.data || [];
            const regularTeachers = allTeachers.filter(
              (teacher) => teacher.roleId !== 14
            );
            const directors = allTeachers.filter(
              (teacher) => teacher.roleId === 14
            );

            const totalTeachers = regularTeachers.length;
            const totalDirectors = directors.length;

            setSchoolStats({
              totalClasses,
              totalStudents,
              totalTeachers,
              totalDirectors,
            });

            console.log("✅ Non-director dashboard school stats:", {
              totalClasses,
              totalStudents,
              totalTeachers,
              totalDirectors,
            });
          }
        } catch (error) {
          console.warn("Failed to fetch school statistics:", error);
          setSchoolStats({
            totalClasses: 0,
            totalStudents: 0,
            totalTeachers: 0,
            totalDirectors: 0,
            totalDeputyPrincipals: 0,
            totalSecretaries: 0,
            totalTreasurers: 0,
            totalLibrarians: 0,
            totalWorkshop: 0,
            totalSecurity: 0,
            totalTeacherIct: 0,
          });
        }
      }
    } catch (error) {
      handleError(error, {
        toastMessage: t(
          "failedToLoadDashboard",
          "Failed to load dashboard data"
        ),
      });
    } finally {
      stopLoading("fetchUserData");
      setInitialLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Initial data fetch - only run once when component mounts
  useEffect(() => {
    if (authUser?.id && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchUserData();
    }
  }, []);

  // Profile picture URL is handled by ProfileImage component

  // Initial loading state
  if (initialLoading) {
    return (
      <PageLoader
        message={t("loadingDashboard")}
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Error state
  if (error) {
    return (
      <ErrorDisplay
        error={error}
        onRetry={() => retry(fetchUserData)}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Get user role display
  const getUserRole = () => {
    if (!user) return null;

    // Director: roleId = 14
    if (user.roleId === 14) {
      return {
        label: t("director") || "Director",
        color: "purple",
        Icon: Shield,
      };
    }
    // Teacher: roleId = 8
    if (user.roleId === 8) {
      return {
        label: t("teacher") || "Teacher",
        color: "blue",
        Icon: Briefcase,
      };
    }
    return null;
  };

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-3 sm:p-6">
        {/* School Statistics - Combined */}
        <FadeInSection delay={200} className="mb-6">
          <div className="bg-white rounded-sm border border-gray-200 shadow-sm p-4 sm:p-6">
            {/* School Information Card */}
            {schoolInfo && (
              <FadeInSection delay={100} className="mb-6">
                <div className="">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* School Profile Image */}
                    <div className="w-20 h-20 sm:w-32 sm:h-32 flex-shrink-0 rounded-sm shadow-lg overflow-hidden ring-2 ring-white">
                      {schoolInfo.profile && !schoolImageError ? (
                        <img
                          src={getFullImageUrl(schoolInfo.profile)}
                          alt={schoolInfo.name || "School"}
                          className="w-full h-full object-cover"
                          onError={() => setSchoolImageError(true)}
                        />
                      ) : (
                        <div className="w-full h-full flex justify-center items-center bg-gradient-to-br from-blue-500 to-indigo-600">
                          <School className="h-10 w-10 text-white" />
                        </div>
                      )}
                    </div>

                    {/* School Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div>
                          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">
                            {schoolInfo.name || t("schoolInformation", "School Information")}
                          </h2>
                          {getUserRole() && (
                            <Badge
                              variant="solid"
                              color={getUserRole().color}
                              size="sm"
                              className="inline-flex items-center gap-1.5 mt-1"
                            >
                              {(() => {
                                const role = getUserRole();
                                const IconComponent = role.Icon;
                                return (
                                  <>
                                    <IconComponent className="w-3.5 h-3.5" />
                                    {role.label}
                                  </>
                                );
                              })()}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                        {/* School Code */}
                        {schoolInfo.code && (
                          <div className="flex items-center gap-2 bg-gray-50 rounded-sm px-3 py-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100">
                              <Hash className="w-4 h-4 text-green-600" />
                            </div>
                            <div>
                              <p className="text-xs text-gray-500">{t("schoolCode", "School Code")}</p>
                              <p className="text-sm font-semibold text-gray-800">{schoolInfo.code}</p>
                            </div>
                          </div>
                        )}

                        {/* Location */}
                        {(schoolInfo.place || schoolInfo.placeObject) && (
                          <div className="flex items-center gap-2 bg-gray-50 rounded-sm px-3 py-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-sm">
                              <MapPin className="w-4 h-4 text-orange-600" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs text-gray-500">{t("location", "Location")}</p>
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {schoolInfo.place ||
                                  (schoolInfo.placeObject &&
                                    [
                                      schoolInfo.placeObject.commune_name_kh,
                                      schoolInfo.placeObject.district_name_kh,
                                      schoolInfo.placeObject.province_name_kh,
                                    ]
                                      .filter(Boolean)
                                      .join(", "))}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </FadeInSection>
            )}
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              {t("schoolStatistics", "School Statistics")}
            </h3>

            {/* Primary Stats Row */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
              <StatsCard
                title={t("totalClasses") || "Total Classes"}
                value={schoolStats.totalClasses}
                enhanced={true}
                gradientFrom="from-blue-500"
                gradientTo="to-blue-600"
                hoverColor="hover:border-blue-200"
                responsive={true}
              />

              <StatsCard
                title={t("totalStudents") || "Total Students"}
                value={schoolStats.totalStudents}
                enhanced={true}
                gradientFrom="from-green-500"
                gradientTo="to-green-600"
                hoverColor="hover:border-green-200"
                responsive={true}
              />
            </div>

            {/* Divider */}
            <div className="border-t border-gray-100 my-4"></div>

            {/* Staff Roles Row */}
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              {t("staffRoles", "Staff Roles")}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
              <StatsCard
                title={t("totalDirectors") || "Directors"}
                value={schoolStats.totalDirectors}
                enhanced={true}
                gradientFrom="from-orange-500"
                gradientTo="to-orange-600"
                hoverColor="hover:border-orange-200"
                responsive={true}
              />

              <StatsCard
                title={t("totalDeputyPrincipals", "Deputy Principals")}
                value={schoolStats.totalDeputyPrincipals}
                enhanced={true}
                gradientFrom="from-pink-500"
                gradientTo="to-pink-600"
                hoverColor="hover:border-pink-200"
                responsive={true}
              />

              <StatsCard
                title={t("totalTeachers") || "Teachers"}
                value={schoolStats.totalTeachers}
                enhanced={true}
                gradientFrom="from-purple-500"
                gradientTo="to-purple-600"
                hoverColor="hover:border-purple-200"
                responsive={true}
              />

              <StatsCard
                title={t("totalTeacherIct", "ICT Teachers")}
                value={schoolStats.totalTeacherIct}
                enhanced={true}
                gradientFrom="from-lime-500"
                gradientTo="to-lime-600"
                hoverColor="hover:border-lime-200"
                responsive={true}
              />

              <StatsCard
                title={t("totalSecretaries", "Secretaries")}
                value={schoolStats.totalSecretaries}
                enhanced={true}
                gradientFrom="from-cyan-500"
                gradientTo="to-cyan-600"
                hoverColor="hover:border-cyan-200"
                responsive={true}
              />

              <StatsCard
                title={t("totalTreasurers", "Treasurers")}
                value={schoolStats.totalTreasurers}
                enhanced={true}
                gradientFrom="from-teal-500"
                gradientTo="to-teal-600"
                hoverColor="hover:border-teal-200"
                responsive={true}
              />

              <StatsCard
                title={t("totalLibrarians", "Librarians")}
                value={schoolStats.totalLibrarians}
                enhanced={true}
                gradientFrom="from-indigo-500"
                gradientTo="to-indigo-600"
                hoverColor="hover:border-indigo-200"
                responsive={true}
              />

              <StatsCard
                title={t("totalWorkshop", "Workshop Staff")}
                value={schoolStats.totalWorkshop}
                enhanced={true}
                gradientFrom="from-amber-500"
                gradientTo="to-amber-600"
                hoverColor="hover:border-amber-200"
                responsive={true}
              />

              <StatsCard
                title={t("totalSecurity", "Security Staff")}
                value={schoolStats.totalSecurity}
                enhanced={true}
                gradientFrom="from-slate-500"
                gradientTo="to-slate-600"
                hoverColor="hover:border-slate-200"
                responsive={true}
              />
            </div>
          </div>
        </FadeInSection>

        {/* Charts Grid - Responsive Layout */}
        <FadeInSection delay={300} className="grid grid-cols-1 gap-6 mb-6">
          {/* School Overview Chart - 1 column on mobile, 1 column on desktop
          <div className="lg:col-span-1">
            <SchoolOverviewChart
              schoolStats={schoolStats}
            />
          </div>
           */}
          {/* Student Demographics Charts - Combined into single component to avoid duplicate API calls */}
          <div className="">
            <StudentDemographicsChart
              schoolId={
                user?.teacher?.schoolId ||
                user?.school_id ||
                user?.school?.id ||
                user?.teacher?.school?.id ||
                "76525"
              }
              showBothTabs={true}
            />
          </div>

          {/* BMI Distribution Pie Chart */}
          <div className="">
            <BMIPieChart
              schoolId={
                user?.teacher?.schoolId ||
                user?.school_id ||
                user?.school?.id ||
                user?.teacher?.school?.id ||
                "76525"
              }
            />
          </div>
        </FadeInSection>

        {/* Welcome Alert */}
        {showWelcome && (
          <WelcomeAlert
            user={user}
            t={t}
            onClose={() => setShowWelcome(false)}
          />
        )}
      </div>
    </PageTransition>
  );
}
