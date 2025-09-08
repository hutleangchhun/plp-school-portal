import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Users, 
  ChevronLeft, 
  ChevronRight
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import plpLogo from '../../assets/plp-logo-v2.png';
import MinistryLogo from '../../assets/moeys-logo.png';

export default function Sidebar({ isCollapsed, setIsCollapsed }) {
  const { t } = useLanguage();
  const location = useLocation();

  const navigationItems = [
    {
      name: t('dashboard') || 'Dashboard',
      href: '/dashboard',
      icon: Home,
      current: location.pathname === '/dashboard',
      color: 'blue'
    },
    {
      name: t('students') || 'Students',
      href: '/students',
      icon: Users,
      current: location.pathname === '/students',
      color: 'purple'
    },
    {
      name: t('attendance') || 'Attendance',
      href: '/attendance',
      icon: Users,
      current: location.pathname === '/attendance',
      color: 'green'
    },
  ];

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
      }
    };

    const colors = colorMap[color] || colorMap.blue;
    return isActive ? colors.active : `text-gray-700 ${colors.hover} hover:text-gray-900`;
  };

  return (
    <div className={`flex flex-col bg-gradient-to-b from-slate-50 to-white shadow-lg border-r border-slate-200 transition-all duration-300 ${
      isCollapsed ? 'w-20' : 'w-64'
    }`}>
      {/* Logo Header */}
      <div 
        className="flex items-center p-3 border-b border-slate-200 bg-white cursor-pointer hover:bg-gray-50 transition-colors duration-200"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className={`flex items-center ${isCollapsed ? 'justify-center w-full' : 'space-x-3'}`}>
          <img 
            src={plpLogo} 
            alt="PLP Logo" 
            className="h-10 w-10 flex-shrink-0 transition-all duration-300"
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-gray-800">ប្រព័ន្ធរដ្ឋបាលសម្រាប់គ្រូ</span>
              <span className="text-xs text-gray-600 mt-1">Teacher Portal</span>
            </div>
          )}
        </div>
      </div>
      {/* Navigation */}
      <nav className={`flex-1 py-4 ${isCollapsed ? 'px-2' : 'px-4'} space-y-1`}>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const colorClasses = getColorClasses(item.color, item.current);
          
          return (
            <div key={item.name} className={isCollapsed ? 'flex justify-center' : ''}>
              <Link
                to={item.href}
                className={`flex items-center text-sm font-medium rounded-xl transition-all duration-200 group relative ${
                  isCollapsed 
                    ? 'w-12 h-12 justify-center hover:scale-105' 
                    : 'px-4 py-3 w-full'
                } ${
                  item.current
                    ? `${colorClasses} border shadow-sm`
                    : `${colorClasses} border border-transparent`
                }`}
                title={isCollapsed ? item.name : undefined}
              >
                <div className={`${isCollapsed ? 'flex items-center justify-center' : ''}`}>
                  <Icon 
                    className={`flex-shrink-0 h-5 w-5 ${
                      item.current 
                        ? getColorClasses(item.color, true).includes('blue') ? 'text-blue-600' :
                          getColorClasses(item.color, true).includes('green') ? 'text-green-600' :
                          getColorClasses(item.color, true).includes('purple') ? 'text-purple-600' :
                          getColorClasses(item.color, true).includes('orange') ? 'text-orange-600' :
                          getColorClasses(item.color, true).includes('red') ? 'text-red-600' :
                          getColorClasses(item.color, true).includes('teal') ? 'text-teal-600' :
                          'text-yellow-600'
                        : 'text-slate-500 group-hover:text-slate-700'
                    }`} 
                  />
                </div>
                {!isCollapsed && (
                  <span className="ml-3 truncate font-medium">{item.name}</span>
                )}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                    {item.name}
                    <div className="absolute left-0 top-1/2 transform -translate-x-1 -translate-y-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                  </div>
                )}
              </Link>
            </div>
          );
        })}

      </nav>

      {/* Bottom Logo Section */}
      <div className="p-4 border-t border-slate-200">
        <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
          <img 
            src={MinistryLogo} 
            alt="Moeys Logo" 
            className="h-8 w-8 flex-shrink-0 transition-all duration-300"
          />
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-xs font-medium text-gray-700">Primary Education Department</span>
              <span className="text-xs text-gray-500">Moeys of Cambodia</span>
            </div>
          )}
        </div>
        
        {/* Collapse Button 
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={`w-full p-2.5 rounded-xl hover:bg-slate-100 transition-all duration-200 flex items-center justify-center ${
            isCollapsed ? 'hover:bg-indigo-50' : ''
          }`}
        >
          {isCollapsed ? (
            <ChevronRight className="h-5 w-5 text-slate-600 hover:text-indigo-600" />
          ) : (
            <ChevronLeft className="h-5 w-5 text-slate-600 hover:text-indigo-600" />
          )}
        </button>
        */}
      </div>
    </div>
  );
}