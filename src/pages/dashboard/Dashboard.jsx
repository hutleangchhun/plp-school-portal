import { User, Edit, Edit2, Building2, Users, BookOpen, Award, Shield, Briefcase, Lock } from 'lucide-react';
import SchoolOverviewChart from '../../components/ui/SchoolOverviewChart';
import StudentDemographicsChart from '../../components/ui/StudentDemographicsChart';
import BMIPieChart from '../../components/ui/BMIPieChart';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLoading } from '../../contexts/LoadingContext';
import WelcomeAlert from '../../components/ui/WelcomeAlert';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import StatsCard from '../../components/ui/StatsCard';
import { utils, userService } from '../../utils/api';
import classService from '../../utils/api/services/classService';
import { teacherService } from '../../utils/api/services/teacherService';
import schoolService from '../../utils/api/services/schoolService';
import { studentService } from '../../utils/api/services/studentService';
import { dashboardService } from '../../utils/api/services/dashboardService';
import Badge from '@/components/ui/Badge';
import { useStableCallback } from '../../utils/reactOptimization';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import DynamicLoader, { PageLoader } from '../../components/ui/DynamicLoader';
import AttendanceStatusCard from '../../components/attendance/AttendanceStatusCard';

export default function Dashboard({ user: initialUser }) {
  const { t } = useLanguage();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const { startLoading, stopLoading } = useLoading();
  const [user, setUserData] = useState(initialUser);
  const [showWelcome, setShowWelcome] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
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
    totalTeacherIct: 0
  });
  const [schoolInfo, setSchoolInfo] = useState(null);

  const [authUser, setAuthUser] = useState(() => {
    try {
      const userData = localStorage.getItem('user');
      return userData ? JSON.parse(userData) : null;
    } catch (err) {
      handleError(err, {
        toastMessage: t('failedToParseUserData', 'Failed to parse user data from localStorage'),
        setError: false
      });
      return null;
    }
  });

  // Listen for localStorage changes (e.g., after login updates user data)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          console.log('🔄 localStorage changed in Dashboard, updating authUser state:', parsedUser);
          setAuthUser(parsedUser);
          setUserData(parsedUser);
        } else {
          setAuthUser(null);
          setUserData(null);
        }
      } catch (err) {
        console.error('Error parsing updated user data:', err);
      }
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Also set up a custom event listener for same-tab updates
    window.addEventListener('userDataUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userDataUpdated', handleStorageChange);
    };
  }, []);
  // Fetch user data and school statistics
  const fetchUserData = useStableCallback(async () => {
    console.log('🔄 Dashboard: fetchUserData called at', new Date().toISOString());
    clearError();

    try {
      startLoading('fetchUserData', t('loadingDashboard', 'Loading dashboard...'));
      // Fetch detailed user data with school information
      let userData = null;

      // First try to get detailed user data with school info
      if (authUser?.id) {
        try {
          const detailedResponse = await userService.getUserByID(authUser.id);
          userData = detailedResponse?.data || detailedResponse;
          console.log('Detailed user data with school:', userData);
        } catch (error) {
          console.warn('Failed to fetch detailed user data, falling back to getMyAccount:', error);
        }
      }

      // Always get account data from my-account endpoint
      const accountResponse = await userService.getMyAccount();
      const accountData = accountResponse?.data || accountResponse;
      console.log('📥 Dashboard my-account response:', accountData);

      // Use accountData as fallback for userData if needed
      if (!userData && accountData) {
        userData = accountData;
      }

      if (userData && (userData.username || userData.fullname || userData.email)) {
        setUserData(userData);
      } else {
        throw new Error(t('noValidUserData', 'No valid user data received from API'));
      }

      // Fetch school information and statistics if we have school ID
      if (accountData && accountData.school_id) {
        try {
          // Get school information
          const schoolResponse = await schoolService.getSchoolInfo(accountData.school_id);
          if (schoolResponse?.data) {
            setSchoolInfo(schoolResponse.data);
            console.log('✅ Dashboard school info:', schoolResponse.data);
          }

          // For directors, use the optimized getSchoolDistribution endpoint
          if (userData?.roleId === 14) {
            console.log('📊 Fetching director dashboard data via getSchoolDistribution...');
            const distributionResponse = await dashboardService.getSchoolDistribution({
              schoolId: accountData.school_id
            });

            if (distributionResponse.success && distributionResponse.raw && distributionResponse.raw.length > 0) {
              const schoolData = distributionResponse.raw[0];
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
                totalTeacherIct: schoolData.teacherIctCount || 0
              });

              console.log('✅ Director dashboard school stats:', {
                totalClasses: schoolData.classCount,
                totalStudents: schoolData.studentCount,
                totalTeachers: schoolData.teacherCount,
                totalDirectors: schoolData.directorCount,
                totalDeputyPrincipals: schoolData.deputyPrincipalCount,
                totalSecretaries: schoolData.schoolSecretaryCount,
                totalTreasurers: schoolData.schoolTreasurerCount,
                totalLibrarians: schoolData.schoolLibrarianCount,
                totalWorkshop: schoolData.schoolWorkshopCount,
                totalSecurity: schoolData.schoolSecurityCount,
                totalTeacherIct: schoolData.teacherIctCount
              });
            } else {
              throw new Error('Failed to fetch school distribution data');
            }
          } else {
            // For non-directors, use the original approach
            // Get classes count - fetch all classes without limit
            const classesResponse = await classService.getBySchool(accountData.school_id, {
              page: 1,
              limit: 9999 // No practical limit - fetch all classes
            });
            const totalClasses = classesResponse?.classes?.length || 0;

            // Get total students count - fetch all students without pagination
            const studentsResponse = await studentService.getStudentsBySchoolClasses(accountData.school_id, {
              page: 1,
              limit: 9999 // No practical limit - fetch all students
            });

            // Use pagination.total if available (server-side count), otherwise use data length
            const totalStudents = studentsResponse?.pagination?.total || studentsResponse?.data?.length || 0;

            // Get teachers count from the teachers endpoint - fetch all teachers
            const teachersResponse = await teacherService.getTeachersBySchool(accountData.school_id, {
              page: 1,
              limit: 200 // API max limit is 100
            });

            // Count based on roleId: directors are roleId = 14
            const allTeachers = teachersResponse?.data || [];
            const regularTeachers = allTeachers.filter(teacher => teacher.roleId !== 14);
            const directors = allTeachers.filter(teacher => teacher.roleId === 14);

            const totalTeachers = regularTeachers.length;
            const totalDirectors = directors.length;

            setSchoolStats({
              totalClasses,
              totalStudents,
              totalTeachers,
              totalDirectors
            });

            console.log('✅ Dashboard school stats:', {
              totalClasses,
              totalStudents,
              totalTeachers,
              totalDirectors
            });
          }
        } catch (error) {
          console.warn('Failed to fetch school statistics:', error);
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
            totalTeacherIct: 0
          });
        }
      }

    } catch (error) {
      handleError(error, {
        toastMessage: t('failedToLoadDashboard', 'Failed to load dashboard data')
      });
    } finally {
      stopLoading('fetchUserData');
      setInitialLoading(false);
    }
  }, [authUser?.id]);

  // Initial data fetch - only run once when component mounts or authUser.id changes
  useEffect(() => {
    if (authUser?.id) {
      fetchUserData();
    }
  }, [authUser?.id]);

  // Profile picture URL is handled by ProfileImage component

  // Initial loading state
  if (initialLoading) {
    return (
      <PageLoader
        message={t('loadingDashboard')}
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
        label: t('director') || 'Director',
        color: 'purple',
        Icon: Shield
      };
    }
    // Teacher: roleId = 8
    if (user.roleId === 8) {
      return {
        label: t('teacher') || 'Teacher',
        color: 'blue',
        Icon: Briefcase
      };
    }
    return null;
  };

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-3 sm:p-6">
        {/* School Information Card */}
        {schoolInfo && (
          <FadeInSection delay={100} className="mb-6">
            <div className="bg-white rounded-md border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-md shadow-md">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{schoolInfo.name || t('schoolInformation', 'School Information')}</h2>
                    <p className="text-sm text-gray-500">{t('schoolDetails', 'School Details')}</p>
                  </div>
                </div>
                {getUserRole() && (() => {
                  const role = getUserRole();
                  const IconComponent = role.Icon;
                  return (
                    <Badge
                      variant="filled"
                      color={role.color}
                      size="sm"
                      className="flex items-center gap-2 mt-4 sm:mt-0"
                    >
                      <IconComponent className="w-4 h-4" />
                      {role.label}
                    </Badge>
                  );
                })()}
              </div>

              <div className="flex flex-col sm:flex-row justify-start sm:items-start items-start space-y-2 sm:space-y-0">
                {/* School Code */}
                {schoolInfo.code && (
                  <Badge variant="outline" size='sm' color='purple'>
                    {t('schoolCode', 'School Code')}: {schoolInfo.code}
                  </Badge>
                )}

                {/* Place */}
                {schoolInfo.place && (
                  <Badge variant="outline" size='sm' color='green' className="sm:ml-2 ml-0">{t('place', 'Place')}: {schoolInfo.place}</Badge>
                )}
              </div>
            </div>
          </FadeInSection>
        )}

        {/* School Statistics */}
        <FadeInSection delay={200} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title={t('totalClasses') || 'Total Classes'}
            value={schoolStats.totalClasses}
            icon={BookOpen}
            enhanced={true}
            gradientFrom="from-blue-500"
            gradientTo="to-blue-600"
            hoverColor="hover:border-blue-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalStudents') || 'Total Students'}
            value={schoolStats.totalStudents}
            icon={Users}
            enhanced={true}
            gradientFrom="from-green-500"
            gradientTo="to-green-600"
            hoverColor="hover:border-green-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalTeachers') || 'Total Teachers'}
            value={schoolStats.totalTeachers}
            icon={User}
            enhanced={true}
            gradientFrom="from-purple-500"
            gradientTo="to-purple-600"
            hoverColor="hover:border-purple-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalDirectors') || 'Total Directors'}
            value={schoolStats.totalDirectors}
            icon={Award}
            enhanced={true}
            gradientFrom="from-orange-500"
            gradientTo="to-orange-600"
            hoverColor="hover:border-orange-200"
            responsive={true}
          />
        </FadeInSection>

        {/* Additional Staff Roles Statistics */}
        <FadeInSection delay={250} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <StatsCard
            title={t('totalDeputyPrincipals', 'Deputy Principals')}
            value={schoolStats.totalDeputyPrincipals}
            icon={User}
            enhanced={true}
            gradientFrom="from-pink-500"
            gradientTo="to-pink-600"
            hoverColor="hover:border-pink-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalSecretaries', 'Secretaries')}
            value={schoolStats.totalSecretaries}
            icon={Briefcase}
            enhanced={true}
            gradientFrom="from-cyan-500"
            gradientTo="to-cyan-600"
            hoverColor="hover:border-cyan-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalTreasurers', 'Treasurers')}
            value={schoolStats.totalTreasurers}
            icon={Briefcase}
            enhanced={true}
            gradientFrom="from-teal-500"
            gradientTo="to-teal-600"
            hoverColor="hover:border-teal-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalLibrarians', 'Librarians')}
            value={schoolStats.totalLibrarians}
            icon={BookOpen}
            enhanced={true}
            gradientFrom="from-indigo-500"
            gradientTo="to-indigo-600"
            hoverColor="hover:border-indigo-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalWorkshop', 'Workshop Staff')}
            value={schoolStats.totalWorkshop}
            icon={Briefcase}
            enhanced={true}
            gradientFrom="from-amber-500"
            gradientTo="to-amber-600"
            hoverColor="hover:border-amber-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalSecurity', 'Security Staff')}
            value={schoolStats.totalSecurity}
            icon={Shield}
            enhanced={true}
            gradientFrom="from-slate-500"
            gradientTo="to-slate-600"
            hoverColor="hover:border-slate-200"
            responsive={true}
          />

          <StatsCard
            title={t('totalTeacherIct', 'ICT Teachers')}
            value={schoolStats.totalTeacherIct}
            icon={User}
            enhanced={true}
            gradientFrom="from-lime-500"
            gradientTo="to-lime-600"
            hoverColor="hover:border-lime-200"
            responsive={true}
          />
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
              schoolId={user?.teacher?.schoolId || user?.school_id || user?.school?.id || user?.teacher?.school?.id || '76525'}
              showBothTabs={true}
            />
          </div>

          {/* BMI Distribution Pie Chart */}
          <div className="">
            <BMIPieChart
              schoolId={user?.teacher?.schoolId || user?.school_id || user?.school?.id || user?.teacher?.school?.id || '76525'}
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