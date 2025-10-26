import { useState, useEffect } from 'react';
import {
  Users,
  BookOpen,
  UserCheck,
  Building2,
  Mail,
  Phone,
  User,
  TrendingUp,
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
import { Bar, BarChart, XAxis, YAxis, LabelList } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import EmptyState from '@/components/ui/EmptyState';

export default function TeacherDashboard({ user }) {
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todayLate: 0,
    attendanceRate: 0
  });
  const [classes, setClasses] = useState([]);
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

        // Fetch classes
        const classesResponse = await classService.getClassByUser(userId);
        const teacherClasses = classesResponse.success ? classesResponse.classes || [] : [];

        if (!mounted) return;
        setClasses(teacherClasses);

        let totalStudents = 0;
        let todayPresent = 0;
        let todayAbsent = 0;
        let todayLate = 0;

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
            const todayRecords = attendanceResponse.data.filter(record => {
              const recordDate = new Date(record.date).toISOString().split('T')[0];
              const isToday = recordDate === today;
              const isTeacherClass = classIds.includes(record.classId);
              return isToday && isTeacherClass;
            });

            console.log(`Found ${todayRecords.length} attendance records for teacher's classes today`);

            todayRecords.forEach(record => {
              if (record.status === 'PRESENT') todayPresent++;
              else if (record.status === 'ABSENT') todayAbsent++;
              else if (record.status === 'LATE') todayLate++;
            });
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

  // Chart data for attendance
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
    <PageTransition className='p-6'>
      <div className="">
        <FadeInSection>
          {/* Welcome Header */}
          <div className="p-6 bg-white rounded-xl border border-gray-200 mb-4">
            <div className='flex justify-between'>
              <div className='mb-8'>
                <h1 className="text-3xl font-bold text-gray-900">
                  {t('welcome', 'Welcome')}, {user?.name || user?.username || t('teacher', 'Teacher')}!
                </h1>
                <p className="text-gray-600 mt-2">
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
          {/* Chart and User Info Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {/* Attendance Chart */}
            <div className=" bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <UserCheck className="h-5 w-5 text-white" />
                </div>
                <div className="grid gap-2">
                  <h3 className="text-md font-bold text-gray-900">
                    {t('todayAttendanceOverview', "Today's Attendance Overview")}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {t('attendanceRate', 'Attendance Rate')}: <span className="font-semibold text-green-600">{stats.attendanceRate}%</span>
                  </p>
                </div>
              </div>

              {stats.totalStudents > 0 || attendanceChartData.some(item => item.students > 0) ? (
                <>
                  <ChartContainer
                    config={{
                      students: {
                        label: t('students', 'Students'),
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                    className="h-[350px]"
                  >
                    <BarChart data={attendanceChartData}>
                      <XAxis
                        dataKey="status"
                        tickLine={false}
                        axisLine={false}
                        className="text-xs"
                        height={80}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        className="text-xs"
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                      />
                      <Bar
                        dataKey="students"
                        radius={[4, 4, 0, 0]}
                        cursor="default"
                        style={{ cursor: 'default' }}
                        onMouseEnter={() => { }}
                        onMouseLeave={() => { }}
                      >
                        <LabelList
                          dataKey="students"
                          position="top"
                          offset={5}
                          style={{
                            fill: '#374151',
                            fontSize: '11px',
                            fontWeight: '600',
                            textAnchor: 'middle'
                          }}
                        />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  {stats.totalStudents > 0 && !attendanceChartData.some(item => item.students > 0) && (
                    <EmptyState
                      icon={TrendingUp}
                      title={t('noAttendanceData', 'No Attendance Data')}
                      description={t('noAttendanceDataMessage', 'No attendance data available for today.')}
                      variant='info'
                    />
                  )}
                </>
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title={t('noAttendanceData', 'No Attendance Data')}
                  description={t('noAttendanceDataMessage', 'No attendance data available for today.')}
                  variant='info'
                />
              )}
            </div>

            {/* User Information */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-md font-bold text-gray-900">
                    {t('teacherInfo', 'Teacher Information')}
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                {/* Name */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">{t('name', 'Name')}</p>
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {user?.name || user?.username || t('notAvailable', 'N/A')}
                    </p>
                  </div>
                </div>

                {/* Email */}
                {user?.email && (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-green-600" />
                    </div>
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
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 mb-1">{t('phone', 'Phone')}</p>
                      <p className="text-sm font-medium text-gray-900">
                        {user.phone}
                      </p>
                    </div>
                  </div>
                )}

                {/* School */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-1">{t('school', 'School')}</p>
                    <p className="text-sm font-medium text-gray-900 break-words">
                      {schoolName || t('loading', 'Loading...')}
                    </p>
                  </div>
                </div>

                {/* Classes */}
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 mb-2">{t('myClasses', 'My Classes')}</p>
                    {classes.length > 0 ? (
                      <div className="flex flex-wrap gap-2 max-h-64 overflow-y-auto">
                        {classes.map((cls) => (
                          <Badge
                            key={cls.id || cls.classId}
                            color="blue"
                            variant="filled"
                            size="sm"
                          >
                            {cls.name || t('untitledClass', 'Untitled Class')}
                          </Badge>
                        ))}
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
