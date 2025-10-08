import { User, Edit,Edit2, Building2, Users, Phone, Mail, Calendar, Globe, MapPin, BookOpen, Award, RefreshCw, TrendingUp, Clock, Target, Activity, Settings, BarChart3, Zap, User2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import WelcomeAlert from '../../components/ui/WelcomeAlert';
import { Button } from '../../components/ui/Button';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import StatsCard from '../../components/ui/StatsCard';
import { utils, userService } from '../../utils/api';
import classService from '../../utils/api/services/classService';
import { teacherService } from '../../utils/api/services/teacherService';
import Badge from '@/components/ui/Badge';
import { useStableCallback } from '../../utils/reactOptimization';
import ErrorDisplay from '../../components/ui/ErrorDisplay';
import { useErrorHandler } from '../../hooks/useErrorHandler';

export default function Dashboard({ user: initialUser }) {
  const { t } = useLanguage();
  const { error, handleError, clearError, retry } = useErrorHandler();
  const [user, setUserData] = useState(initialUser);
  const [showWelcome, setShowWelcome] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [schoolStats, setSchoolStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalDirectors: 0
  });

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

  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning') || 'អរុណសួស្តី';
    if (hour < 17) return t('goodAfternoon') || 'ទិវាសួស្តី';
    return t('goodEvening') || 'សាយណ្ហសួស្តី';
  };

  // Fetch user data and school statistics
  const fetchUserData = useStableCallback(async () => {
    console.log('🔄 Dashboard: fetchUserData called at', new Date().toISOString());
    clearError();

    try {
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

      // Fetch school statistics if we have school ID
      if (accountData && accountData.school_id) {
        try {
          // Get classes count
          const classesResponse = await classService.getBySchool(accountData.school_id);
          const totalClasses = classesResponse?.classes?.length || 0;

          // Get students count (from master classes endpoint)
          const studentsResponse = await classService.getMasterClasses(accountData.school_id, {
            page: 1,
            limit: 1
          });
          const totalStudents = studentsResponse?.total || 0;

          // Get teachers count from the teachers endpoint
          const teachersResponse = await teacherService.getTeachersBySchool(accountData.school_id, {
            page: 1,
            limit: 1000 // Get all teachers to count properly
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

          console.log('✅ Dashboard school stats:', { totalClasses, totalStudents, totalTeachers });
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
      <div className="flex-1 bg-gray-50 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg font-medium">
            {t('loadingDashboard')}
          </p>
        </div>
      </div>
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


  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-6">
        {/* Clean Header Section */}
        <FadeInSection className="mb-8">
          <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                      {getTimeBasedGreeting()}, {utils.user.getDisplayName(user) || user?.username || (user?.teacher?.isDirector ? t('director') : t('teacher'))}
                    </h1>
                    <p className="text-gray-600">{t('welcomeToDashboard', 'Welcome to your Teacher Portal Dashboard')}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge color="blue" variant="outline" size="sm">
                    {user?.teacher?.isDirector ? t('director') : (user?.roleNameKh || user?.roleNameEn || t('teacher'))}
                  </Badge>
                  <Badge color="green" variant="outline" size="sm">
                    {user?.teacher?.school?.name || user?.school?.name || 'School'}
                  </Badge>
                </div>
              </div>

              <div className="flex-shrink-0">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {new Date().getFullYear()}
                  </div>
                  <div className="text-gray-500 text-sm">
                    {t('academicYear', 'Academic Year')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>



        {/* Detailed Information Cards
        <FadeInSection delay={200} className="grid grid-cols-1 lg:grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 sm:border-2 overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-300 group">
            <div className="bg-blue-100 px-3 py-3 sm:px-6 sm:py-4 border-b border-gray-200 group-hover:bg-blue-200 transition-colors duration-300">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                <User className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-gray-600 group-hover:text-blue-600 transition-colors duration-300 flex-shrink-0" />
                <span className="truncate">{t('personalInformation')}</span>
              </h3>
            </div>
            <div className="p-3 sm:p-4 lg:p-6">
              <dl className="space-y-2 sm:space-y-3 lg:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('fullName')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4 break-words">{user?.fullname || '-'}</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                    <Mail className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('email')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4 break-all">{user?.email || '-'}</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                    <Phone className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('phone')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4">{user?.phone || '-'}</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('dateOfBirth')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4">{user?.date_of_birth || '-'}</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('gender')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4">
                    {user?.gender === 'FEMALE' ? t('female') : user?.gender === 'MALE' ? t('male') : '-'}
                  </dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                    <Globe className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('nationality')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4">{user?.nationality || '-'}</dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 sm:border-2 overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-300 group">
            <div className="bg-blue-100 px-3 py-3 sm:px-6 sm:py-4 border-b border-gray-200 group-hover:bg-blue-200 transition-colors duration-300">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-gray-600 group-hover:text-blue-600 transition-colors duration-300 flex-shrink-0" />
                <span className="truncate">{t('accountInformation')}</span>
              </h3>
            </div>
            <div className="p-3 sm:p-4 lg:p-6">
              <dl className="space-y-2 sm:space-y-3 lg:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('username')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4 break-words">{user?.username || '-'}</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('role')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4 break-words">{user?.roleNameKh || user?.roleNameEn || '-'}</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('teacherId')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4">
                    {user?.teacherId || t('notAssigned') || 'មិនបានកំណត់'}
                  </dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('teacherId')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4">
                    {user?.school?.name || t('notAssigned') || 'មិនបានកំណត់'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <div className="bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-100 sm:border-2 overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all duration-300 group">
            <div className="bg-blue-100 px-3 py-3 sm:px-6 sm:py-4 border-b border-gray-200 group-hover:bg-blue-200 transition-colors duration-300">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 flex items-center">
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-gray-600 group-hover:text-blue-600 transition-colors duration-300 flex-shrink-0" />
                <span className="truncate">{t('schoolInformation')}</span>
              </h3>
            </div>
            <div className="p-3 sm:p-4 lg:p-6">
              <dl className="space-y-2 sm:space-y-3 lg:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('username')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4 break-words">{user?.username || '-'}</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('role')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4 break-words">{user?.roleNameKh || user?.roleNameEn || '-'}</dd>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('teacherId')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4">
                    {user?.teacherId || t('notAssigned') || 'មិនបានកំណត់'}
                  </dd>
                </div>
                {user?.placeOfBirth && (
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                      <span className="truncate">{t('placeOfBirth')}</span>
                    </dt>
                    <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4 break-words">{user.placeOfBirth}</dd>
                  </div>
                )}
                {user?.residence && (
                  <div className="flex flex-col sm:flex-row sm:items-center">
                    <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32 mb-1 sm:mb-0">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                      <span className="truncate">{t('residence')}</span>
                    </dt>
                    <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4 break-words">{user.residence}</dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </FadeInSection>
        */}
        
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

        {/* Clean Information Cards */}
        <FadeInSection delay={300} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('personalInformation', 'Personal Information')}</h3>
                <p className="text-sm text-gray-500">{t('yourAccountDetails', 'Your account details')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-600">{t('username') || 'Username'}</span>
                <span className="text-sm font-semibold text-gray-900">{user?.username || '-'}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-600">{t('fullName') || 'Full Name'}</span>
                <span className="text-sm font-semibold text-gray-900 truncate">{utils.user.getDisplayName(user) || '-'}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-600">{t('email') || 'Email'}</span>
                <span className="text-sm font-semibold text-gray-900 truncate">{user?.email || '-'}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-600">{t('role') || 'Role'}</span>
                  {user?.teacher?.isDirector ? t('director') : (user?.roleNameKh || user?.roleNameEn || t('teacher'))}
              </div>
            </div>
          </div>

          {/* School Information Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <Building2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{t('schoolInformation', 'School Information')}</h3>
                <p className="text-sm text-gray-500">{t('yourSchoolDetails', 'Your school details')}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-600">{t('school') || 'School'}</span>
                <span className="text-sm font-semibold text-gray-900 truncate">{user?.teacher?.school?.name || user?.school?.name || '-'}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-600">{t('schoolCode') || 'School Code'}</span>
                <span className="text-sm font-semibold text-gray-900">{user?.teacher?.school?.code || '-'}</span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-600">{t('province') || 'Province'}</span>
                <span className="text-sm font-semibold text-gray-900 truncate">
                  {user?.teacher?.school?.place?.province?.province_name_kh ||
                   user?.teacher?.school?.place?.province?.province_name_en || '-'}
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-gray-600">{t('district') || 'District'}</span>
                <span className="text-sm font-semibold text-gray-900 truncate">
                  {user?.teacher?.school?.place?.district?.district_name_kh ||
                   user?.teacher?.school?.place?.district?.district_name_en || '-'}
                </span>
              </div>
            </div>
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