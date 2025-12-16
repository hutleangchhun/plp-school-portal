import { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  UserCheck,
  Building2,
  Mail,
  Phone,
  User,
  Shield,
  Briefcase
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { classService } from '../../utils/api/services/classService';
import { studentService } from '../../utils/api/services/studentService';
import { attendanceService } from '../../utils/api/services/attendanceService';
import { schoolService } from '../../utils/api/services/schoolService';
import { PageTransition, FadeInSection } from '../../components/ui/PageTransition';
import DynamicLoader from '../../components/ui/DynamicLoader';
import StatsCard from '../../components/ui/StatsCard';
import Badge from '../../components/ui/Badge';
import { formatClassIdentifier } from '../../utils/helpers';

export default function TeacherDashboard({ user }) {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todayLate: 0,
    todayLeave: 0,
    attendanceRate: 0
  });
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(null); // Will be set to first class after loading
  const [classStats, setClassStats] = useState({}); // Store stats for each class
  const [recentActivity, setRecentActivity] = useState([]);
  const [schoolName, setSchoolName] = useState('');

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userId = user.id || user.userId || user.school_id || user.schoolId;
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

        // Fetch classes - use localStorage cache for teachers (roleId = 8)
        let teacherClasses = [];

        if (user.roleId === 8) {
          // Try to load from localStorage first (cached during login)
          try {
            const storedClasses = localStorage.getItem('teacherClasses');
            if (storedClasses) {
              teacherClasses = JSON.parse(storedClasses);
              console.log('📚 Loaded', teacherClasses.length, 'classes from localStorage for dashboard');
            }
          } catch (err) {
            console.error('Error loading classes from localStorage:', err);
          }
        }

        // Fallback: fetch from API if not in localStorage or not a teacher
        if (teacherClasses.length === 0) {
          const classesResponse = await classService.getClassByUser(userId);
          teacherClasses = classesResponse.success ? classesResponse.classes || [] : [];

          // Cache for teachers
          if (user.roleId === 8 && teacherClasses.length > 0) {
            localStorage.setItem('teacherClasses', JSON.stringify(teacherClasses));
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

        let totalStudents = 0;
        let todayPresent = 0;
        let todayAbsent = 0;
        let todayLate = 0;
        let todayLeave = 0;

        // Only fetch attendance and students if teacher has classes
        if (teacherClasses.length > 0) {
          // Get class IDs
          const classIds = teacherClasses.map(cls => cls.id || cls.classId);
          console.log('Teacher class IDs:', classIds);

          // Fetch students from each class and aggregate
          const allStudents = [];
          for (const classId of classIds) {
            try {
              const studentsResponse = await studentService.getMyStudents({
                classId: classId,
                page: 1,
                limit: 100
              });

              if (studentsResponse.success && studentsResponse.data) {
                allStudents.push(...studentsResponse.data);
              }
            } catch (error) {
              console.error(`Error fetching students for class ${classId}:`, error);
            }
          }

          // Remove duplicates based on student ID
          const uniqueStudents = allStudents.filter((student, index, self) =>
            index === self.findIndex(s => (s.id || s.userId) === (student.id || student.userId))
          );

          totalStudents = uniqueStudents.length;
          console.log(`Total unique students across all classes: ${totalStudents}`);

          // Fetch today's attendance only for teacher's classes
          const today = new Date().toISOString().split('T')[0];
          console.log('Fetching attendance for today:', today);

          const attendanceResponse = await attendanceService.getAttendance({
            date: today,
            page: 1,
            limit: 100
          });

          console.log('Today attendance response:', attendanceResponse);

          if (attendanceResponse.success && attendanceResponse.data) {
            // Filter to only include records from teacher's classes
            // IMPORTANT: Only count STUDENT attendance records (exclude teacher attendance)
            const todayRecords = attendanceResponse.data.filter(record => {
              const recordDate = new Date(record.date).toISOString().split('T')[0];
              const isToday = recordDate === today;
              const isTeacherClass = classIds.includes(record.classId);
              // Ensure the record has a classId (student attendance records have classId)
              // Teacher attendance records may have classId=null or be from different context
              const isStudentRecord = record.classId && record.classId !== null;
              return isToday && isTeacherClass && isStudentRecord;
            });

            console.log(`Found ${todayRecords.length} student attendance records for teacher's classes today`);

            // Calculate stats per class
            const statsPerClass = {};
            classIds.forEach(classId => {
              statsPerClass[classId] = {
                present: 0,
                absent: 0,
                late: 0,
                leave: 0
              };
            });

            todayRecords.forEach(record => {
              const classId = record.classId;
              if (statsPerClass[classId]) {
                if (record.status === 'PRESENT') {
                  todayPresent++;
                  statsPerClass[classId].present++;
                }
                else if (record.status === 'ABSENT') {
                  todayAbsent++;
                  statsPerClass[classId].absent++;
                }
                else if (record.status === 'LATE') {
                  todayLate++;
                  statsPerClass[classId].late++;
                }
                else if (record.status === 'LEAVE') {
                  todayLeave++;
                  statsPerClass[classId].leave++;
                }
              }
            });

            if (mounted) {
              setClassStats(statsPerClass);
            }
          }
        }

        const totalMarked = todayPresent + todayAbsent + todayLate;
        const attendanceRate = totalMarked > 0 ? Math.round((todayPresent / totalMarked) * 100) : 0;

        if (mounted) {
          setStats({
            totalClasses: teacherClasses.length,
            totalStudents,
            todayPresent,
            todayAbsent,
            todayLate,
            todayLeave,
            attendanceRate
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

  // Chart data for attendance - only showing student attendance statuses (Present, Absent, Late)
  // Leave status is excluded as it's a special case and not counted in standard attendance metrics
  const attendanceChartData = [
    {
      status: t('present', 'Present'),
      students: stats.todayPresent,
      fill: '#10b981'
    },
    {
      status: t('absent', 'Absent'),
      students: stats.todayAbsent,
      fill: '#ef4444'
    },
    {
      status: t('late', 'Late'),
      students: stats.todayLate,
      fill: '#f59e0b'
    }
  ];
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
          <div className="p-6 bg-white rounded-md border border-gray-200 mb-4">
            <div className='flex justify-between'>
              <div className='mb-8'>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                  {t('welcome', 'Welcome')}, {user?.name || user?.username || t('teacher', 'Teacher')}
                </h1>
                <p className="text-gray-600 text-xs sm:text-sm mt-2">
                  {t('dashboardGreeting', "Here's an overview of your classes and students")}
                </p>
              </div>
              <div>
                {getUserRole() && (() => {
                  const role = getUserRole();
                  const IconComponent = role.Icon;
                  return (
                    <Badge
                      variant="filled"
                      color={role.color}
                      size="lg"
                      className="flex items-center gap-2"
                    >
                      <IconComponent className="w-4 h-4" />
                      {role.label}
                    </Badge>
                  );
                })()}
              </div>
            </div>
            {/* Stats Grid - Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StatsCard
                title={t('school', 'School')}
                value={schoolName || t('loading', 'Loading...')}
                icon={Building2}
                iconBgColor="bg-indigo-100"
                iconColor="text-indigo-600"
                className='shadow-none border-2 border-indigo-100'
              />
              <StatsCard
                title={t('totalClasses', 'Total Classes')}
                value={stats.totalClasses}
                icon={BookOpen}
                iconBgColor="bg-blue-100"
                iconColor="text-blue-600"
                className='shadow-none border-2 border-blue-100'
              />
              <StatsCard
                title={t('totalStudents', 'Total Students')}
                value={stats.totalStudents}
                icon={Users}
                iconBgColor="bg-purple-100"
                iconColor="text-purple-600"
                className='shadow-none border-2 border-purple-100'
              />
            </div>
          </div>
          {/* User Information - Full Width */}
          <div className="mb-8">
            <div className="bg-white rounded-md border border-gray-200 p-6">
              <div className="flex mb-6">
                <div className=''>
                  <h3 className="text-lg font-bold text-gray-900">
                    {t('teacherInfo', 'Teacher Information')}
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
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

                {/* Classes */}
                <div className="flex items-start gap-3  bg-gray-50 p-3 border-l-2 border-blue-500">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-2">{t('myClasses', 'My Classes')}</p>
                    {classes.length > 0 ? (
                      <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                        {classes.map((cls) => {
                          const rawGradeLevel =
                            typeof cls.gradeLevel !== 'undefined' && cls.gradeLevel !== null
                              ? String(cls.gradeLevel)
                              : '';

                          const displayGradeLevel =
                            rawGradeLevel === '0'
                              ? t('grade0', 'Kindergarten')
                              : rawGradeLevel;

                          return (
                            <Badge
                              key={cls.id || cls.classId}
                              color="blue"
                              variant="filled"
                              size="sm"
                            >
                              {`${t('class') || 'Class'} ${formatClassIdentifier(displayGradeLevel, cls.section)}`}
                            </Badge>
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
