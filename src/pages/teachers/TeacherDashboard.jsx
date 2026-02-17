import { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Briefcase,
  Calendar
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { teacherService } from '../../utils/api/services/teacherService';
import { schoolService } from '../../utils/api/services/schoolService';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import DynamicLoader from '../../components/ui/DynamicLoader';
import Badge from '../../components/ui/Badge';
import CustomIcon from '../../components/svg/CustomIcon';
import { formatClassIdentifier } from '../../utils/helpers';
import { canAccessTeacherFeatures } from '../../utils/routePermissions';

export default function TeacherDashboard({ user }) {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0
  });
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null); // Will be set to first class after loading
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const teacherId = user.teacherId || user.id || user.userId;
        const userSchoolId = user.schoolId || user.school_id;

        // Fetch school information
        if (userSchoolId) {
          try {
            const schoolResponse = await schoolService.getSchoolInfo(userSchoolId);
            if (schoolResponse.data) {
              if (!mounted) return;
              setSchoolName(schoolResponse.data.name || t('unknownSchool', 'Unknown School'));
            }
          } catch (error) {
            console.error('Error fetching school info:', error);
            setSchoolName(t('unknownSchool', 'Unknown School'));
          }
        }

        // Fetch classes for the teacher using new endpoint: /api/v1/teachers/:teacherId/classes
        let teacherClasses = [];
        let totalStudents = 0;

        if (canAccessTeacherFeatures(user) && teacherId) {
          try {
            const classesResponse = await teacherService.getTeacherClasses(teacherId);

            if (classesResponse.success) {
              teacherClasses = classesResponse.data || [];
              console.log('📚 Fetched', teacherClasses.length, 'classes from /teachers/{teacherId}/classes endpoint');

              // Calculate total students from maxStudents in each class (or actual student count if available)
              totalStudents = teacherClasses.reduce((sum, cls) => {
                // If studentCount is available, use it; otherwise use maxStudents as capacity
                return sum + (cls.studentCount || 0);
              }, 0);

              console.log(`Total students in all classes: ${totalStudents}`);
            }
          } catch (error) {
            console.error('Error fetching teacher classes:', error);
          }
        }

        if (!mounted) return;
        setClasses(teacherClasses);

        // Auto-select first class if available, or use stored selection
        if (teacherClasses.length > 0) {
          const storedClassId = localStorage.getItem('currentClassId');
          if (storedClassId && teacherClasses.find(c => String(c.id || c.classId) === String(storedClassId))) {
            setSelectedClassId(storedClassId);
          } else {
            setSelectedClassId(String(teacherClasses[0].id || teacherClasses[0].classId));
          }
        }

        if (mounted) {
          setStats({
            totalClasses: teacherClasses.length,
            totalStudents
          });
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => {
      mounted = false;
    };
  }, [user]);

  // Get user role display
  const getUserRole = () => {
    if (!user) return null;

    // Director: roleId = 14
    if (user.roleId === 14) {
      // Director or director with teaching duties
      if (canAccessTeacherFeatures(user)) {
        return {
          label: t('directorTeacher', 'Director + Teacher'),
          color: 'cyan',
          Icon: Briefcase
        };
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <DynamicLoader
          type="spinner"
          size="xl"
          variant="primary"
          message={t('loadingDashboard', 'Loading dashboard...')} />
      </div>
    );
  }

  return (
    <PageTransition className='p-6 bg-gray-50 overflow-y-auto max-h-screen'>
      <div className="">
        <FadeInSection>
          {/* Welcome Header */}
          <div className="p-6 bg-white rounded-sm border border-gray-200 mb-4">
            <div className='flex flex-col sm:flex-row justify-between items-start mb-6 space-y-4 sm:space-y-0'>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-50 rounded-full border border-green-100">
                  <CustomIcon name="bee" className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-lg sm:text-xl font-bold text-gray-900">
                    {t('welcome', 'Welcome')}, {user?.lastName && user?.firstName ? `${user.lastName} ${user.firstName}` : user?.name || user?.username || t('teacher', 'Teacher')}
                  </h4>
                  <p className="text-gray-600 text-xs sm:text-sm mt-1">
                    {t('dashboardGreeting', "Here's an overview of your classes and students")}
                  </p>
                </div>
              </div>
              <div>
                {getUserRole() && (() => {
                  const role = getUserRole();
                  const IconComponent = role.Icon;
                  return (
                    <Badge
                      variant="outline"
                      color={role.color}
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      {role.label}
                    </Badge>
                  );
                })()}
              </div>
            </div>
            {/* Stats Grid - Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">{t('school', 'School')}</p>
                <p className="text-base font-medium text-gray-900">{schoolName || t('loading', 'Loading...')}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">{t('totalClasses', 'Total Classes')}</p>
                <p className="text-base font-medium text-gray-900">{stats.totalClasses}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1.5">{t('totalStudents', 'Total Students')}</p>
                <p className="text-base font-medium text-gray-900">{stats.totalStudents}</p>
              </div>
            </div>
          </div>
          {/* User Information - Full Width */}
          <div className="mb-8">
            <div className="bg-white rounded-sm border border-gray-200 p-6">
              <div className="flex mb-6">
                <div className=''>
                  <h3 className="text-lg font-bold text-gray-900">
                    {t('teacherInfo', 'Teacher Information')}
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className='space-y-2'>
                  {/* Name */}
                  <div className="flex items-start gap-3  bg-gray-50 p-3 border-l-2 border-green-500">

                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">{t('name', 'Name')}</p>
                      <p className="text-sm font-medium text-gray-900 break-words">
                        {user?.first_name && user?.last_name
                          ? `${user.first_name} ${user.last_name}`
                          : user?.first_name || user?.last_name || user?.name || user?.username || t('notAvailable', 'N/A')}
                      </p>
                    </div>
                  </div>

                  {/* Email */}
                  {user?.email && (
                    <div className="flex items-start gap-3  bg-gray-50 p-3 border-l-2 border-indigo-500">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">{t('email', 'Email')}</p>
                        <p className="text-sm font-medium text-gray-900 break-words">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Phone */}
                  {user?.phone && (
                    <div className="flex items-start gap-3  bg-gray-50 p-3 border-l-2 border-orange-500">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-500 mb-1">{t('phone', 'Phone')}</p>
                        <p className="text-sm font-medium text-gray-900">
                          {user.phone}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* School */}
                  <div className="flex items-start gap-3 bg-gray-50 p-3 border-l-2 border-purple-500">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">{t('school', 'School')}</p>
                      <p className="text-sm font-medium text-gray-900 break-words">
                        {schoolName || t('loading', 'Loading...')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Classes */}
                <div className="flex items-start gap-3 bg-gray-50 p-3 border-l-2 border-blue-500">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 mb-2">{t('myClasses', 'My Classes')}</p>
                    {classes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-2 gap-4 max-h-64 overflow-y-auto">
                        {classes.map((cls, index) => {
                          const rawGradeLevel =
                            typeof cls.gradeLevel !== 'undefined' && cls.gradeLevel !== null
                              ? String(cls.gradeLevel)
                              : '';
                          const displayGradeLevel =
                            rawGradeLevel === '0'
                              ? t('grade0', 'Kindergarten')
                              : rawGradeLevel;

                          // Defined colors for cycling
                          const cardColors = [
                            'border-l-4 border-l-blue-500',
                            'border-l-4 border-l-green-500',
                            'border-l-4 border-l-purple-500',
                            'border-l-4 border-l-orange-500',
                            'border-l-4 border-l-pink-500',
                            'border-l-4 border-l-teal-500',
                          ];
                          const colorClass = cardColors[index % cardColors.length];

                          return (
                            <div
                              key={cls.id || cls.classId}
                              className={`bg-white p-3 rounded-sm border border-gray-200 shadow-sm hover:shadow-md transition-shadow min-w-[200px] ${colorClass}`}
                            >
                              <div className="flex justify-between items-center mb-2 gap-2">
                                <span className="font-bold text-gray-900 text-sm">
                                  {`${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, cls.section)}`}
                                </span>
                              </div>

                              <div className="space-y-1.5">
                                <div className="flex items-center text-xs text-gray-600">
                                  <Users className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                  <span>
                                    <span className="font-medium text-gray-900">{cls.studentCount || 0}</span>
                                    <span className="text-gray-400 mx-1">/</span>
                                    {cls.maxStudents} {t('students') || 'Students'}
                                  </span>
                                </div>
                                <div className="flex items-center text-xs text-gray-600">
                                  <Calendar className="w-3.5 h-3.5 mr-2 text-gray-400" />
                                  <span>{cls.academicYear}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        {t('noClassesAssigned', 'No classes assigned')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeInSection>
      </div>
    </PageTransition>
  );
}
