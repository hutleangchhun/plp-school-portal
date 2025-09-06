import { Link, useLocation } from 'react-router-dom';
import { Home, Users, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import plpLogo from '../assets/plp-logo-v2.png';

export default function MobileSidebar({ isOpen, onClose }) {
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
  ];

  const getColorClasses = (color, isActive) => {
    const colorMap = {
      blue: {
        active: 'bg-blue-100 text-blue-700 border-blue-200',
        hover: 'hover:bg-blue-50'
      },
      purple: {
        active: 'bg-purple-100 text-purple-700 border-purple-200',
        hover: 'hover:bg-purple-50'
      }
    };

    const colors = colorMap[color] || colorMap.blue;
    return isActive ? colors.active : `text-gray-700 ${colors.hover} hover:text-gray-900`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-gradient-to-b from-slate-50 to-white shadow-lg border-r border-slate-200 md:hidden">
      {/* Logo Header with Close Button */}
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
        <div className="flex items-center">
          <img 
            src={plpLogo} 
            alt="PLP Logo" 
            className="h-10 w-auto"
          />
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation - Text only, no icons */}
      <nav className="flex-1 py-4 px-4 space-y-1">
        {navigationItems.map((item) => {
          const colorClasses = getColorClasses(item.color, item.current);
          
          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={onClose}
              className={`flex items-center px-4 py-3 w-full text-sm font-medium rounded-xl transition-all duration-200 ${
                item.current
                  ? `${colorClasses} border shadow-sm`
                  : `${colorClasses} border border-transparent`
              }`}
            >
              {/* Text only - no icons */}
              <span className="truncate font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}