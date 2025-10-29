import { User, Edit, Edit2, Building2, Users, BookOpen, Award, Shield, Briefcase } from 'lucide-react';
import ClassStudentCountChart from '../../components/ui/ClassStudentCountChart';
import SchoolOverviewChart from '../../components/ui/SchoolOverviewChart';
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
    totalDirectors: 0
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

          // Get classes count
          const classesResponse = await classService.getBySchool(accountData.school_id);
          const totalClasses = classesResponse?.classes?.length || 0;

          // Get total students count
          const studentsResponse = await studentService.getStudentsBySchoolClasses(accountData.school_id, {
            page: 1,
            limit: 1 // Only need the count from pagination
          });

          const totalStudents = studentsResponse?.pagination?.total || 0;

          // Get teachers count from the teachers endpoint
          const teachersResponse = await teacherService.getTeachersBySchool(accountData.school_id, {
            page: 1,
            limit: 100 // Get all teachers to count properly
          });

          // Count based on isDirector field
          const allTeachers = teachersResponse?.data || [];
          const regularTeachers = allTeachers.filter(teacher => !teacher.isDirector);
          const directors = allTeachers.filter(teacher => teacher.isDirector === true);

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
        } catch (error) {
          console.warn('Failed to fetch school statistics:', error);
          setSchoolStats({
            totalClasses: 0,
            totalStudents: 0,
            totalTeachers: 0
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
  }, [authUser?.id, t, handleError, clearError]);

  // Initial data fetch
  useEffect(() => {
    fetchUserData();
  }, [fetchUserData]);

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

    // isDirector is nested inside user.teacher object
    const isDirector = user.teacher?.isDirector === true || user.isDirector === true;

    if (user.roleId === 8 && isDirector) {
      return {
        label: t('director') || 'Director',
        color: 'purple',
        Icon: Shield
      };
    }
    if (user.roleId === 8 && !isDirector) {
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-md">
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

        {/* Charts Grid */}
        <FadeInSection delay={300} className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Class Student Count Chart */}
          <ClassStudentCountChart
            schoolId={user?.school_id || user?.school?.id || user?.teacher?.school?.id || '76525'}
          />

          {/* School Overview Chart */}
          <SchoolOverviewChart
            schoolStats={schoolStats}
          />
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