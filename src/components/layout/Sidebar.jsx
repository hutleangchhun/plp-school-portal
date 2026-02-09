import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import {
  Users,
  ChevronDown,
  BookOpen,
  Calendar,
  Settings as SettingsIcon,
  GraduationCap,
  UserCheck,
  UserStar,
  UserCircle,
  QrCode,
  Award,
  BarChart3,
  LayoutDashboard,
  CalendarCheck,
  UserRoundCheck,
  ListCheck,
  ListChecks,
  ArrowRightLeft,
  Activity,
  Heart,
  ClipboardList,
  Database,
  CalendarDays,
  Briefcase,
  UserPlus
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getNavigationItems } from '../../utils/routePermissions';
import MinistryLogo from '../../assets/moeys-logo.png';
import CustomIcon from '../svg/CustomIcon';

export default function Sidebar({ isCollapsed, setIsCollapsed, user }) {
  const { t } = useLanguage();
  const location = useLocation();
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [currentUser, setCurrentUser] = useState(user);

  const toggleDropdown = (key) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Listen for user data changes in localStorage (e.g., when secondary roles are loaded)
  useEffect(() => {
    const handleStorageChange = (event) => {
      try {
        const userData = localStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          console.log('🔄 Sidebar - User data updated from localStorage:', parsedUser);
          console.log('🔄 Sidebar - officerRoles:', parsedUser?.officerRoles);
          setCurrentUser(parsedUser);
        }
      } catch (err) {
        console.error('Error updating user from localStorage:', err);
      }
    };

    // Listen for custom event dispatched by userService.saveUserData
    // This fires when secondary roles are added/updated/deleted
    window.addEventListener('userDataUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('userDataUpdated', handleStorageChange);
    };
  }, []);

  // Update currentUser when prop user changes
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    }
  }, [user]);

  // Debug: Log user object to check roleId
  console.log('Sidebar - User object:', currentUser);
  console.log('Sidebar - roleId:', currentUser?.roleId);
  console.log('Sidebar - officerRoles:', currentUser?.officerRoles);

  // Icon mapping for routes
  const iconMap = {
    '/dashboard': (props) => <CustomIcon name="dashboard" {...props} />,
    '/students': (props) => <CustomIcon name="student" {...props} />,
    '/classes': (props) => <CustomIcon name="class" {...props} />,
    '/teachers': (props) => <CustomIcon name="teacher" {...props} />,
    '/parents': UserCircle,
    '/attendance': ListCheck,
    '/teacher-attendance': ListChecks,
    '/teacher-dashboard': (props) => <CustomIcon name="dashboard" {...props} />,
    '/my-students': (props) => <CustomIcon name="student" {...props} />,
    '/my-attendance': UserRoundCheck,
    '/my-schedule': CalendarDays,
    '/school-schedule': CalendarDays,
    '/qr-codes': (props) => <CustomIcon name="qrcode" {...props} />,
    '/exam-records': Award,
    '/my-students-exams': Award,
    '/reports': (props) => <CustomIcon name="report" {...props} />,
    '/teacher-reports': (props) => <CustomIcon name="report" {...props} />,
    '/admin-dashboard': (props) => <CustomIcon name="dashboard" {...props} />,
    '/admin-logs': Activity,
    '/admin/teacher-transfer': UserStar,
    '/admin/student-transfer': Users,
    '/admin/bmi-report': Heart,
    '/admin/school-attendance': CalendarCheck,
    '/admin/student-demographics': Database,
    '/admin/teacher-overview': Database,
    '/admin/officer-registration': UserPlus,
    '/multi-role-dashboard': Briefcase,
    'attendance': Calendar, // Parent item for attendance dropdown
    'attendanceManagement': ClipboardList, // Parent item for attendance management dropdown
    'attendance-management': ClipboardList,
    'admin-dashboard': LayoutDashboard,
    'admin-logs': Activity,
    'teacherManagement': UserStar, // Parent item for teacher management dropdown
    'teacher-overview': UserStar,
    'teacher-transfer': ArrowRightLeft,
    'student-transfer': ArrowRightLeft,
    'bmi-report': Heart,
    // Temporarily removed icon mappings (will be re-enabled later):
    // '/achievements': Trophy,
    // '/settings': SettingsIcon,
    // '/my-grades': GraduationCap,
    // '/my-assignments': FileText
  };

  // Color mapping for routes - All using blue
  const colorMap = {
    '/dashboard': 'blue',
    '/students': 'blue',
    '/classes': 'blue',
    '/teachers': 'blue',
    '/parents': 'blue',
    '/attendance': 'blue',
    '/teacher-attendance': 'blue',
    '/teacher-dashboard': 'blue',
    '/my-students': 'blue',
    '/my-attendance': 'blue',
    '/my-schedule': 'blue',
    '/school-schedule': 'blue',
    '/qr-codes': 'blue',
    '/exam-records': 'blue',
    '/my-students-exams': 'blue',
    '/reports': 'blue',
    '/teacher-reports': 'blue',
    '/admin-dashboard': 'blue',
    '/admin-logs': 'blue',
    '/admin/teacher-transfer': 'blue',
    '/admin/student-transfer': 'blue',
    '/admin/bmi-report': 'blue',
    '/admin/school-attendance': 'blue',
    '/admin/teacher-overview': 'blue',
    '/admin/officer-registration': 'blue',
    '/multi-role-dashboard': 'blue',
    'attendance': 'blue', // Parent item for attendance dropdown
    'attendanceManagement': 'blue', // Parent item for attendance management dropdown
    'attendance-management': 'blue',
    'admin-dashboard': 'blue',
    'admin-logs': 'blue',
    'teacherManagement': 'blue', // Parent item for teacher management dropdown
    'teacher-overview': 'blue',
    'teacher-transfer': 'blue',
    'student-transfer': 'blue',
    'bmi-report': 'blue',
    // Temporarily removed color mappings (will be re-enabled later):
    // '/achievements': 'blue',
    // '/settings': 'blue',
    // '/my-grades': 'blue',
    // '/my-assignments': 'blue'
  };

  // Get navigation items based on user role - memoized to update when currentUser changes
  const navigationItems = useMemo(() => {
    console.log('📋 [Sidebar] Regenerating navigation items for user:', currentUser?.email);
    console.log('📋 [Sidebar] hasMultipleRoles:', currentUser?.officerRoles?.length > 0);
    return getNavigationItems(currentUser, t).map(item => {
      // For parent items (those with children and href='#'), use the item name as key for icon/color lookup
      const iconKey = item.children ? item.name?.toLowerCase() || item.href : item.href;
      return {
        ...item,
        icon: iconMap[iconKey] || iconMap[item.href] || CalendarCheck,
        current: location.pathname === item.href,
        color: colorMap[iconKey] || colorMap[item.href] || 'blue',
        // Check if any child is active
        hasActiveChild: item.children?.some(child => location.pathname === child.href)
      };
    });
  }, [currentUser, t, location.pathname]);

  const getColorClasses = (color, isActive) => {
    const colorMap = {
      blue: {
        active: 'bg-blue-600 text-white',
        activeIcon: 'text-white',
        icon: 'text-blue-600',
        hover: 'hover:bg-blue-50',
        iconHover: 'group-hover:text-blue-500'
      },
      green: {
        active: 'bg-green-600 text-white',
        activeIcon: 'text-white',
        icon: 'text-green-600',
        hover: 'hover:bg-green-50',
        iconHover: 'group-hover:text-green-500'
      },
      purple: {
        active: 'bg-purple-600 text-white',
        activeIcon: 'text-white',
        icon: 'text-purple-600',
        hover: 'hover:bg-purple-50',
        iconHover: 'group-hover:text-purple-500'
      },
      orange: {
        active: 'bg-orange-600 text-white',
        activeIcon: 'text-white',
        icon: 'text-orange-600',
        hover: 'hover:bg-orange-50',
        iconHover: 'group-hover:text-orange-500'
      },
      red: {
        active: 'bg-red-600 text-white',
        activeIcon: 'text-white',
        icon: 'text-red-600',
        hover: 'hover:bg-red-50',
        iconHover: 'group-hover:text-red-500'
      },
      teal: {
        active: 'bg-teal-600 text-white',
        activeIcon: 'text-white',
        icon: 'text-teal-600',
        hover: 'hover:bg-teal-50',
        iconHover: 'group-hover:text-teal-500'
      },
      yellow: {
        active: 'bg-yellow-600 text-white',
        activeIcon: 'text-white',
        icon: 'text-yellow-600',
        hover: 'hover:bg-yellow-50',
        iconHover: 'group-hover:text-yellow-500'
      },
      gray: {
        active: 'bg-gray-600 text-white',
        activeIcon: 'text-white',
        icon: 'text-gray-600',
        hover: 'hover:bg-gray-50',
        iconHover: 'group-hover:text-gray-500'
      },
      pink: {
        active: 'bg-pink-600 text-white',
        activeIcon: 'text-white',
        icon: 'text-pink-600',
        hover: 'hover:bg-pink-50',
        iconHover: 'group-hover:text-pink-500'
      },
      violet: {
        active: 'bg-violet-600 text-white',
        activeIcon: 'text-white',
        icon: 'text-violet-600',
        hover: 'hover:bg-violet-50',
        iconHover: 'group-hover:text-violet-500'
      },
      indigo: {
        active: 'bg-indigo-600 text-white',
        activeIcon: 'text-white',
        icon: 'text-indigo-600',
        hover: 'hover:bg-indigo-50',
        iconHover: 'group-hover:text-indigo-500'
      }
    };

    const colors = colorMap[color] || colorMap.blue;
    return isActive ? { text: colors.active, icon: colors.activeIcon } : { text: `text-gray-700 ${colors.hover} hover:text-gray-900`, icon: 'text-slate-500 group-hover:text-slate-700' };
  };

  return (
    <div className={`fixed top-14 sm:top-16 left-0 bottom-0 z-20 flex flex-col bg-white shadow-lg border-r border-slate-200 transition-all duration-200 ease-in-out overflow-y-auto overflow-x-hidden ${isCollapsed ? 'w-0 border-0' : 'w-60'
      }`}>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.current || item.hasActiveChild;
          const colorClasses = getColorClasses(item.color, isActive);
          const isOpen = openDropdowns[item.name];

          // If item has children (dropdown)
          if (item.children && item.children.length > 0) {
            return (
              <div key={item.name}>
                {/* Parent Item */}
                <div
                  onClick={() => toggleDropdown(item.name)}
                  className={`flex items-center text-sm font-medium rounded-md transition-all duration-200 group relative cursor-pointer px-4 py-3 w-full ${isActive
                    ? `${colorClasses.text} border shadow-sm`
                    : `${colorClasses.text} border border-transparent`
                    }`}
                >
                  <Icon
                    className={`flex-shrink-0 h-5 w-5 ${colorClasses.icon}`}
                  />
                  <span className="ml-3 truncate font-medium flex-1">{item.name}</span>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''
                      }`}
                  />
                </div>

                {/* Dropdown Children */}
                {isOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => {
                      const ChildIcon = iconMap[child.href] || Calendar;
                      const childActive = location.pathname === child.href;
                      const childColorClasses = getColorClasses(item.color, childActive);

                      return (
                        <Link
                          key={child.name}
                          to={child.href}
                          className={`flex items-center text-sm font-medium rounded-md transition-all duration-200 group px-4 py-2.5 w-full ${childActive
                            ? `${childColorClasses.text} border shadow-sm`
                            : `${childColorClasses.text} border border-transparent`
                            }`}
                        >
                          <ChildIcon
                            className={`flex-shrink-0 h-4 w-4 ${childColorClasses.icon}`}
                          />
                          <span className="ml-3 truncate font-medium text-xs">{child.name}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // Regular item without children
          return (
            <div key={item.name}>
              <Link
                to={item.href}
                className={`flex items-center text-sm font-medium rounded-md transition-all duration-200 group relative px-4 py-3 w-full ${item.current
                  ? `${colorClasses.text} border shadow-sm`
                  : `${colorClasses.text} border border-transparent`
                  }`}
              >
                <Icon
                  className={`flex-shrink-0 h-5 w-5 ${colorClasses.icon}`}
                />
                <span className="ml-3 truncate font-medium">{item.name}</span>
              </Link>
            </div>
          );
        })}

      </nav>
    </div>
  );
}