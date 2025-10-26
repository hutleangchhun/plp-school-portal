import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  Home,
  Users,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BookOpen,
  FileText,
  Calendar,
  Trophy,
  Settings as SettingsIcon,
  GraduationCap,
  UserCheck,
  UserStar,
  User,
  UserCircle,
  QrCode,
  Award
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getNavigationItems } from '../../utils/routePermissions';
import plpLogo from '../../assets/plp-logo-v2.png';
import MinistryLogo from '../../assets/moeys-logo.png';

export default function Sidebar({ isCollapsed, setIsCollapsed, user }) {
  const { t } = useLanguage();
  const location = useLocation();
  const [openDropdowns, setOpenDropdowns] = useState({});

  const toggleDropdown = (key) => {
    setOpenDropdowns(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Debug: Log user object to check isDirector value
  console.log('Sidebar - User object:', user);
  console.log('Sidebar - isDirector:', user?.isDirector);
  console.log('Sidebar - roleId:', user?.roleId);

  // Icon mapping for routes
  const iconMap = {
    '/dashboard': Home,
    '/students': Users,
    '/classes': BookOpen,
    '/teachers': UserStar,
    '/parents': UserCircle,
    '/attendance': Calendar,
    '/teacher-attendance': UserCheck,
    '/my-classes': GraduationCap,
    '/my-students': Users,
    '/my-attendance': Calendar,
    '/qr-code-admin': QrCode,
    '/exam-records': Award,
    '/my-students-exams': Award,
    // Temporarily removed icon mappings (will be re-enabled later):
    // '/reports': FileText,
    // '/achievements': Trophy,
    // '/settings': SettingsIcon,
    // '/my-grades': GraduationCap,
    // '/my-assignments': FileText
  };

  // Color mapping for routes
  const colorMap = {
    '/dashboard': 'blue',
    '/students': 'purple',
    '/classes': 'green',
    '/teachers': 'orange',
    '/parents': 'pink',
    '/attendance': 'teal',
    '/teacher-attendance': 'teal',
    '/my-classes': 'orange',
    '/my-students': 'purple',
    '/my-attendance': 'teal',
    '/qr-code-admin': 'violet',
    '/exam-records': 'indigo',
    '/my-students-exams': 'indigo',
    // Temporarily removed color mappings (will be re-enabled later):
    // '/reports': 'yellow',
    // '/achievements': 'red',
    // '/settings': 'gray',
    // '/my-grades': 'orange',
    // '/my-assignments': 'yellow'
  };

  // Get navigation items based on user role
  const navigationItems = getNavigationItems(user, t).map(item => ({
    ...item,
    icon: iconMap[item.href] || Home,
    current: location.pathname === item.href,
    color: colorMap[item.href] || 'blue',
    // Check if any child is active
    hasActiveChild: item.children?.some(child => location.pathname === child.href)
  }));

  const getColorClasses = (color, isActive) => {
    const colorMap = {
      blue: {
        active: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: 'text-blue-600',
        hover: 'hover:bg-blue-50',
        iconHover: 'group-hover:text-blue-500'
      },
      green: {
        active: 'bg-green-100 text-green-700 border-green-200',
        icon: 'text-green-600',
        hover: 'hover:bg-green-50',
        iconHover: 'group-hover:text-green-500'
      },
      purple: {
        active: 'bg-purple-100 text-purple-700 border-purple-200',
        icon: 'text-purple-600',
        hover: 'hover:bg-purple-50',
        iconHover: 'group-hover:text-purple-500'
      },
      orange: {
        active: 'bg-orange-100 text-orange-700 border-orange-200',
        icon: 'text-orange-600',
        hover: 'hover:bg-orange-50',
        iconHover: 'group-hover:text-orange-500'
      },
      red: {
        active: 'bg-red-100 text-red-700 border-red-200',
        icon: 'text-red-600',
        hover: 'hover:bg-red-50',
        iconHover: 'group-hover:text-red-500'
      },
      teal: {
        active: 'bg-teal-100 text-teal-700 border-teal-200',
        icon: 'text-teal-600',
        hover: 'hover:bg-teal-50',
        iconHover: 'group-hover:text-teal-500'
      },
      yellow: {
        active: 'bg-yellow-100 text-yellow-700 border-yellow-200',
        icon: 'text-yellow-600',
        hover: 'hover:bg-yellow-50',
        iconHover: 'group-hover:text-yellow-500'
      },
      gray: {
        active: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: 'text-gray-600',
        hover: 'hover:bg-gray-50',
        iconHover: 'group-hover:text-gray-500'
      },
      pink: {
        active: 'bg-pink-100 text-pink-700 border-pink-200',
        icon: 'text-pink-600',
        hover: 'hover:bg-pink-50',
        iconHover: 'group-hover:text-pink-500'
      }
    };

    const colors = colorMap[color] || colorMap.blue;
    return isActive ? colors.active : `text-gray-700 ${colors.hover} hover:text-gray-900`;
  };

  return (
    <div className={`flex flex-col bg-white shadow-lg border-r border-slate-200 transition-all duration-200 ease-in-out overflow-hidden ${
      isCollapsed ? 'w-0 border-0' : 'w-64'
    }`}>
      {/* Logo Header */}
      <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-white">
        <div className="flex items-center space-x-3">
          <img 
            src={plpLogo} 
            alt="PLP Logo" 
            className="h-10 w-10 flex-shrink-0"
          />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-800">{t('schoolPortal')}</span>
          </div>
        </div>
      </div>
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
                  className={`flex items-center text-sm font-medium rounded-xl transition-all duration-200 group relative cursor-pointer px-4 py-3 w-full ${
                    isActive
                      ? `${colorClasses} border shadow-sm`
                      : `${colorClasses} border border-transparent`
                  }`}
                >
                  <Icon 
                    className={`flex-shrink-0 h-5 w-5 ${
                      isActive 
                        ? `text-${item.color}-600`
                        : 'text-slate-500 group-hover:text-slate-700'
                    }`} 
                  />
                  <span className="ml-3 truncate font-medium flex-1">{item.name}</span>
                  <ChevronDown 
                    className={`h-4 w-4 transition-transform duration-200 ${
                      isOpen ? 'transform rotate-180' : ''
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
                          className={`flex items-center text-sm font-medium rounded-xl transition-all duration-200 group px-4 py-2.5 w-full ${
                            childActive
                              ? `${childColorClasses} border shadow-sm`
                              : `${childColorClasses} border border-transparent`
                          }`}
                        >
                          <ChildIcon 
                            className={`flex-shrink-0 h-4 w-4 ${
                              childActive 
                                ? `text-${item.color}-600`
                                : 'text-slate-500 group-hover:text-slate-700'
                            }`} 
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
                className={`flex items-center text-sm font-medium rounded-xl transition-all duration-200 group relative px-4 py-3 w-full ${
                  item.current
                    ? `${colorClasses} border shadow-sm`
                    : `${colorClasses} border border-transparent`
                }`}
              >
                <Icon 
                  className={`flex-shrink-0 h-5 w-5 ${
                    item.current 
                      ? `text-${item.color}-600`
                      : 'text-slate-500 group-hover:text-slate-700'
                  }`} 
                />
                <span className="ml-3 truncate font-medium">{item.name}</span>
              </Link>
            </div>
          );
        })}

      </nav>

      {/* Bottom Logo Section */}
      <div className="p-4 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <img 
            src={MinistryLogo} 
            alt="Moeys Logo" 
            className="h-8 w-8 flex-shrink-0"
          />
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-700">{t('primaryEducationDepartment')}</span>
            <span className="text-xs text-gray-500">{t('moeysOfCambodia')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}