import { User, Edit, GraduationCap, Building2, Users, Phone, Mail, Calendar, Globe, MapPin, BookOpen, Award, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import WelcomeAlert from '../../components/ui/WelcomeAlert';
import { Button } from '../../components/ui/Button';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import ProfileImage from '../../components/ui/ProfileImage';
import StatsCard from '../../components/ui/StatsCard';
import { utils, userService } from '../../utils/api';

export default function Dashboard({ user: initialUser }) {
  const { t } = useLanguage();
  const [user, setUserData] = useState(initialUser);
  const [showWelcome, setShowWelcome] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user data from API
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await userService.getMyAccount();
        
        // Handle both wrapped (response.data) and direct response formats
        const userData = response?.data || response;
        
        if (userData && (userData.username || userData.fullname || userData.email)) {
          setUserData(userData);
          setError(null);
        } else {
          throw new Error('No valid user data received from API');
        }
      } catch (error) {
        setError(error.message || 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Profile picture URL is handled by ProfileImage component

  // Refresh user data function
  const refreshUserData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await userService.getMyAccount();
      
      // Handle both wrapped (response.data) and direct response formats
      const userData = response?.data || response;
      
      if (userData && (userData.username || userData.fullname || userData.email)) {
        setUserData(userData);
        setError(null);
      } else {
        throw new Error('No valid user data received from API');
      }
    } catch (error) {
      setError(error.message || 'Failed to refresh user data');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="xl" className="mx-auto" />
          <p className="mt-4 text-gray-600 animate-pulse">{t('loading') || 'Loading dashboard...'}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white rounded-lg p-8 shadow-md">
          <div className="text-red-600 mb-4">
            <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('error') || 'Error'}</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="primary"
            size="default"
          >
            {t('retry') || 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <PageTransition variant="fade" className="flex-1 bg-gray-50">
      <div className="px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header Section */}
        <FadeInSection className="mb-3 border-2 bg-white rounded-xl border-gray-100 pb-4 sm:pb-6 hover:shadow-lg hover:border-blue-200 transition-all duration-300">
          <div className="rounded-2xl border-1 border-gray-100 overflow-hidden">
            <div className="px-3 py-4 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3 sm:space-x-4">
                  {/* Profile Picture */}
                  <div className="relative group">
                    <ProfileImage
                      user={user}
                      size="custom"
                      customSize="h-12 w-12 sm:h-16 sm:w-16 lg:h-20 lg:w-20"
                      alt="Profile"
                      className="shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
                      borderColor="border-white/20"
                      fallbackType="icon"
                    />
                    <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-green-400 rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                      <div className="h-2 w-2 bg-white rounded-full animate-ping"></div>
                    </div>
                  </div>
                  
                  {/* User Info */}
                  <div className="min-w-0 flex-1">
                    <h1 className="text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                      {utils.user.getDisplayName(user) || user?.username || t('welcome')}
                    </h1>
                    <p className="text-gray-500 text-xs sm:text-sm mt-1 flex items-center">
                      <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                      <span className="truncate">{utils.user.getRoleDisplay(user, t)}</span>
                    </p>
                    <p className="text-blue-100 text-xs sm:text-sm mt-1 truncate">
                      {t('teacherId')}: {user?.teacherId || t('notAssigned') || 'Not assigned'}
                    </p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={refreshUserData}
                    disabled={loading}
                    variant="secondary"
                    size="sm"
                    className="shadow-lg backdrop-blur-sm text-xs sm:text-sm"
                  >
                    <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
                    <span className="hidden xs:inline">{t('refresh') || 'Refresh'}</span>
                  </Button>
                  <Button
                    asChild
                    variant="primary"
                    size="sm"
                    className="shadow-lg backdrop-blur-sm text-xs sm:text-sm"
                  >
                    <Link to="/profile">
                      <Edit className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">{t('updateProfileTitle')}</span>
                      <span className="xs:hidden">Edit</span>
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>

        {/* Stats Grid */}
        <FadeInSection className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3">
          <StatsCard
            title={t('experience')}
            value={`${user?.yearsExperience || '0'} ${t('years')}`}
            icon={GraduationCap}
            enhanced={true}
            responsive={true}
            clickable={true}
            hoverColor="hover:border-blue-200"
            gradientFrom="from-blue-500"
            gradientTo="to-blue-600"
          />

          <StatsCard
            title={t('classes')}
            value={user?.classNames?.length || '0'}
            icon={BookOpen}
            enhanced={true}
            responsive={true}
            clickable={true}
            hoverColor="hover:border-green-200"
            gradientFrom="from-green-500"
            gradientTo="to-green-600"
          />

          <StatsCard
            title={t('students')}
            value={user?.totalStudents || '0'}
            icon={Users}
            enhanced={true}
            responsive={true}
            clickable={true}
            hoverColor="hover:border-purple-200"
            gradientFrom="from-purple-500"
            gradientTo="to-purple-600"
          />

          <StatsCard
            title={t('school')}
            value={user?.schoolName || t('assigned')}
            icon={Building2}
            enhanced={true}
            responsive={true}
            clickable={true}
            hoverColor="hover:border-orange-200"
            gradientFrom="from-orange-500"
            gradientTo="to-orange-600"
            valueColor="text-gray-900"
            className="text-sm sm:text-base lg:text-lg font-semibold"
          />
        </FadeInSection>

        {/* Detailed Information Cards */}
        <FadeInSection delay={200} className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-3">
          {/* Personal Information */}
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

          {/* Account Information */}
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
                    {user?.teacherId || t('notAssigned') || 'Not assigned'}
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