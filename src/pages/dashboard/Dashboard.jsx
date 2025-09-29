import { User, Edit,Edit2, Building2, Users, Phone, Mail, Calendar, Globe, MapPin, BookOpen, Award, RefreshCw, TrendingUp, Clock, Target, Activity, Settings, BarChart3, Zap, User2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import WelcomeAlert from '../../components/ui/WelcomeAlert';
import { Button } from '../../components/ui/Button';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import StatsCard from '../../components/ui/StatsCard';
import { utils, userService } from '../../utils/api';
import studentService from '../../utils/api/services/studentService';
import classService from '../../utils/api/services/classService';
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
  const [studentCount, setStudentCount] = useState(0);
  const [classCount, setClassCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false); // Disabled by default to prevent excessive API calls
  const [classDetails, setClassDetails] = useState([]);

  const [authUser] = useState(() => {
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
  
  // Get time-based greeting
  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning') || 'អរុណសួស្តី';
    if (hour < 17) return t('goodAfternoon') || 'ទិវាសួស្តី';
    return t('goodEvening') || 'សាយណ្ហសួស្តី';
  };

  // Fetch comprehensive data
  const fetchAllData = useStableCallback(async () => {
    console.log('🔄 Dashboard: fetchAllData called at', new Date().toISOString());
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
      
      // Fallback to getMyAccount if detailed fetch failed
      if (!userData) {
        const response = await userService.getMyAccount();
        userData = response?.data || response;
      }
      
      if (userData && (userData.username || userData.fullname || userData.email)) {
        setUserData(userData);
      } else {
        throw new Error(t('noValidUserData', 'No valid user data received from API'));
      }

      // Get class data from new /classes/user/{userId} endpoint
      let teacherClasses = [];
      if (authUser?.id) {
        try {
          const classResponse = await classService.getClassByUser(authUser.id);
          
          if (classResponse && classResponse.success && classResponse.classes && Array.isArray(classResponse.classes)) {
            teacherClasses = classResponse.classes;
            setClassCount(teacherClasses.length);
          } else {
            console.log('No classes found in API response:', classResponse);
            setClassCount(0);
          }
        } catch (error) {
          console.error('Failed to fetch classes from API:', error);
          setClassCount(0);
        }
      }

      // Get student count from API (all students assigned to teacher)
      const studentsResponse = await studentService.getMyStudents({ page: 1, limit: 1, status: 'active' });
      if (studentsResponse && studentsResponse.data) {
        const totalFromApi = studentsResponse.pagination?.total || studentsResponse.total || studentsResponse.data.length;
        setStudentCount(totalFromApi);
      } else if (studentsResponse && Array.isArray(studentsResponse)) {
        setStudentCount(studentsResponse.length);
      }

      // Get detailed class information with enrollment using the new API data
      if (teacherClasses.length > 0) {
        try {
          const classDetailsPromises = teacherClasses.map(async (classData) => {
            try {
              // Get students for this specific class
              const classId = classData.classId || classData.class_id || classData.id;
              const className = classData.name || classData.class_name || classData.className || `Class ${classId}`;
              const classStudentsResponse = await studentService.getMyStudents({ classId, class: classId, page: 1, limit: 1, status: 'active' });
              const classStudents = Array.isArray(classStudentsResponse?.data)
                ? classStudentsResponse.data
                : (Array.isArray(classStudentsResponse) ? classStudentsResponse : []);
              const enrolledCount = classStudentsResponse?.pagination?.total || classStudentsResponse?.total || classStudents.length || 0;
              
              return {
                id: classId,
                name: className,
                enrolledCount,
                maxCapacity: classData.maxStudents || 50
              };
            } catch (error) {
              const id = classData.classId || classData.class_id || classData.id;
              console.warn(`Failed to fetch data for class ${id}:`, error);
              return {
                id: id,
                name: classData.name || `Class ${id}`,
                enrolledCount: 0,
                maxCapacity: classData.maxStudents || 50
              };
            }
          });

          const classData = await Promise.all(classDetailsPromises);
          setClassDetails(classData);
        } catch (error) {
          console.warn('Failed to fetch class details:', error);
          setClassDetails([]);
        }
      } else {
        setClassDetails([]);
      }

      setLastRefresh(new Date());
      
    } catch (error) {
      handleError(error, {
        toastMessage: t('failedToLoadDashboard', 'Failed to load dashboard data')
      });
    } finally {
      setInitialLoading(false);
    }
  }, [authUser?.id, t, handleError, clearError]); // Fixed: use authUser.id consistently

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Auto-refresh functionality
  useEffect(() => {
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchAllData();
      }, 300000); // Refresh every 5 minutes (300000ms)
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, fetchAllData]);

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
        onRetry={() => retry(fetchAllData)}
        size="lg"
        className="min-h-screen bg-gray-50"
      />
    );
  }

  // Derived totals for capacity-based metrics
  const capacityTotal = Array.isArray(classDetails)
    ? classDetails.reduce((sum, c) => sum + (c?.maxCapacity || 50), 0)
    : 0;
  const availableSeats = Math.max(capacityTotal - studentCount, 0);

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="p-6">
        {/* Header Section */}
        <FadeInSection className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="mb-3 bg-gradient-to-br from-gray-50 to-blue-100 border border-blue-200 rounded-xl ">
            <div className="px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 gap-4">
              {/* Time-based greeting */}
              <div className="flex items-start justify-between">
                <div className="">
                  <h2 className="text-xl text-gray-600 font-semibold">
                    {getTimeBasedGreeting()}, {utils.user.getDisplayName(user) || user?.username || t('teacher')}
                  </h2>
                  <div className='flex flex-row items-start justify-center text-xs text-gray-500 mt-1'>
                    {t('lastUpdated')}: {lastRefresh.toLocaleTimeString()}
                  </div>
                </div>
                <div>
                  <Badge color='blue' size='sm' variant='filled' className='mt-1'>{user?.roleNameKh || user?.roleNameEn || '-'}</Badge>
                </div>
              </div>
            </div>
          </div>
          {/* School Information */}
          <div className="mb-3 bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 sm:border-2 overflow-hidden transition-all duration-300 group">
            <div className="flex items-center justify-between bg-gradient-to-bl from-gray-50 to-blue-100 px-3 py-3 sm:px-6 sm:py-4 border-b border-blue-100">
              <h3 className="text-base font-semibold text-gray-700 flex">
                <User className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 text-gray-600 group-hover:text-blue-600 transition-colors duration-300 flex-shrink-0" />
                <span className="truncate">{t('accountInformation')}</span>
              </h3>
              <div>
                <Link to="/profile">
                  <Edit className="h-4 w-4 text-gray-500 group-hover:text-blue-600 transition-colors duration-300 inline mr-1" />
                </Link>
              </div>
            </div>
            <div className="p-3 sm:p-4 lg:p-6">
              <dl className="space-y-2 sm:space-y-3 lg:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <dt className="flex text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('username')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4 break-words">{user?.username || '-'}</dd>
                </div>
                <div className="flex sm:flex-row sm:items-center">
                  <dt className="flex items-center text-xs sm:text-sm font-medium text-gray-500 sm:w-28 lg:w-32">
                    <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                    <span className="truncate">{t('school')}</span>
                  </dt>
                  <dd className="text-sm text-gray-900 sm:ml-2 lg:ml-4">
                    <div className="space-y-1">
                      <div className="font-medium">
                        {user?.teacher?.school?.name || user?.school?.name || t('notAssigned') || 'មិនបានកំណត់'}
                      </div>
                      {user?.teacher?.school?.code && (
                        <div className="text-xs text-gray-500">
                          {t('schoolCode') || 'School Code'}: {user.teacher.school.code}
                        </div>
                      )}
                      {user?.teacher?.school?.place && (
                        <div className="text-xs text-gray-500">
                          {user.teacher.school.place.province?.province_name_kh || user.teacher.school.place.province?.province_name_en}, 
                          {user.teacher.school.place.district?.district_name_kh || user.teacher.school.place.district?.district_name_en}
                        </div>
                      )}
                    </div>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        
        </FadeInSection>

        {/* Enhanced Stats Grid */}
        <FadeInSection className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
          <StatsCard
            title={t('classes') || 'ថ្នាក់រៀន'}
            value={classCount}
            icon={BookOpen}
            enhanced={true}
            responsive={true}
            clickable={true}
            hoverColor="hover:border-blue-200"
            gradientFrom="from-blue-500"
            gradientTo="to-blue-600"
          />

          <StatsCard
            title={t('assignedStudents') || 'សិស្សបានកំណត់'}
            value={studentCount}
            icon={Users}
            enhanced={true}
            responsive={true}
            clickable={true}
            hoverColor="hover:border-green-200"
            gradientFrom="from-green-500"
            gradientTo="to-green-600"
          />

          <StatsCard
            title={t('availableSeats') || 'Available Seats'}
            value={availableSeats}
            icon={Activity}
            enhanced={true}
            responsive={true}
            clickable={true}
            hoverColor="hover:border-orange-200"
            gradientFrom="from-orange-500"
            gradientTo="to-orange-600"
          />

          <StatsCard
            title={t('avgEnrollment') || 'ការចុះឈ្មោះជាមធ្យម'}
            value={`${classCount > 0 ? Math.round(studentCount / classCount) : 0}`}
            icon={TrendingUp}
            enhanced={true}
            responsive={true}
            clickable={true}
            hoverColor="hover:border-purple-200"
            gradientFrom="from-purple-500"
            gradientTo="to-purple-600"
          />
        </FadeInSection>


        {/* Class Enrollment Overview */}
        <FadeInSection delay={150} className="mb-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                <BarChart3 className="h-6 w-6 mr-3 text-indigo-600" />
                {t('classEnrollment') || 'ការចុះឈ្មោះថ្នាក់រៀន'}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-gray-500">
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                  {t('enrolled') || 'បានចុះឈ្មោះ'}
                </span>
                <span className="flex items-center">
                  <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
                  {t('capacity') || 'សមត្ថភាព'}
                </span>
              </div>
            </div>

            {/* Summary Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{studentCount}</div>
                <div className="text-sm text-gray-500">{t('totalEnrolled') || 'សិស្សចុះឈ្មោះសរុប'}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{availableSeats}</div>
                <div className="text-sm text-gray-500">{t('availableSeats') || 'Available Seats'}</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{classCount > 0 ? Math.round(studentCount / classCount) : 0}</div>
                <div className="text-sm text-gray-500">{t('avgPerClass') || 'ជាមធ្យមក្នុងមួយថ្នាក់'}</div>
              </div>
            </div>

            {/* Real Class List with Enrollment */}
            <div className="space-y-3">
              <h4 className="text-lg font-medium text-gray-900 mb-3">{t('yourClasses') || 'ថ្នាក់របស់អ្នក'}</h4>
              {classDetails.length > 0 ? (
                classDetails.map((classDetail) => (
                  <div key={classDetail.id} className="bg-transparent rounded-lg p-4 border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="font-medium text-gray-900">{classDetail.name}</h5>
                      <span className="text-sm text-gray-500">
                        {classDetail.enrolledCount}/{classDetail.maxCapacity} {t('students') || 'សិស្ស'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 bg-blue-100 rounded-full h-2">
                        <div 
                          className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((classDetail.enrolledCount / classDetail.maxCapacity) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-sm font-medium text-blue-600">
                        {Math.round((classDetail.enrolledCount / classDetail.maxCapacity) * 100)}%
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BookOpen className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>{t('noClassesAssigned') || 'មិនមានថ្នាក់រៀនដែលបានកំណត់'}</p>
                </div>
              )}
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