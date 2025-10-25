import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, LogOut, User, Upload, Menu } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useLanguage } from '../../contexts/LanguageContext';
import LanguageSwitcher from '../common/LanguageSwitcher';
import ProfileImage from '../ui/ProfileImage';
import NotificationDropdown from '../notifications/NotificationDropdown';

const getPageTitle = (pathname) => {
  const path = pathname.split('/')[1];
  const titleMap = {
    'dashboard': 'dashboard',
    'students': 'manageStudentRecords',
    'classes': 'classesManagement',
    'reports': 'reports',
    'attendance': 'attendance',
    'achievements': 'achievements',
    'settings': 'settings',
    'profile': 'profile',
  };
  return titleMap[path] || 'dashboard';
};

export default function Navbar({
  user,
  onLogout,
  className = '',
  sidebarCollapsed,
  setSidebarCollapsed
}) {
  const { t } = useLanguage();
const location = useLocation();
const pageTitleKey = getPageTitle(location.pathname);
const translatedTitle = t(pageTitleKey) || pageTitleKey.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  return (
    <nav className={`bg-white shadow-sm ${className}`}>
      <div className="px-2 sm:px-4 lg:px-6 xl:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Menu Toggle Button and Page Title */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0 flex-1 mr-2">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg shadow-md hover:shadow-lg hover:scale-105 hover:from-blue-600 hover:to-blue-700 transition-all duration-200 group"
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" />
            </button>
            <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 truncate">
              {translatedTitle}
            </h1>
          </div>
          
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* Notification Dropdown */}
            <NotificationDropdown />

            {/* Profile Dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 hover:text-gray-900 rounded-md hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  <ProfileImage
                    user={user}
                    size="sm"
                    className="mr-1 sm:mr-2 flex-shrink-0"
                    alt="Profile"
                    borderColor="border-blue-500"
                    fallbackType="icon"
                  />
                  <span className="hidden md:inline mr-1 font-medium text-gray-700 truncate max-w-24 lg:max-w-32">
                    {`${user?.first_name || ''} ${user?.last_name || ''}`.trim() || user?.username || 'User'}
                  </span>
                  <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-500 flex-shrink-0" />
                </button>
              </DropdownMenu.Trigger>

              <DropdownMenu.Portal>
                <DropdownMenu.Content 
                  className="min-w-[160px] sm:min-w-[200px] bg-white rounded-md shadow-lg border border-gray-200 p-1 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
                  align="end"
                  sideOffset={5}
                >
                  <DropdownMenu.Item asChild>
                    <Link
                      to="/profile"
                      className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 rounded-sm cursor-pointer transition-colors hover:bg-blue-100 hover:text-gray-900 focus:outline-none"
                    >
                      <User className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-gray-500 flex-shrink-0" />
                      {t('profile') || 'Profile'}
                    </Link>
                  </DropdownMenu.Item>

                  {/* Bulk Import - Directors only */}
                  {user && user.isDirector === true && (
                    <DropdownMenu.Item asChild>
                      <Link
                        to="/students/bulk-import"
                        className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-gray-700 rounded-sm cursor-pointer transition-colors hover:bg-blue-100 hover:text-gray-900 focus:outline-none"
                      >
                        <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 text-gray-500 flex-shrink-0" />
                        {t('bulkStudentImport') || 'នាំចូលសិស្សច្រើន'}
                      </Link>
                    </DropdownMenu.Item>
                  )}

                  <DropdownMenu.Separator className="h-px bg-gray-200 my-1" />
                  
                  <DropdownMenu.Item
                    onSelect={handleLogout}
                    className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm text-red-600 rounded-sm cursor-pointer transition-colors hover:bg-red-50 hover:text-red-700 focus:outline-none data-[highlighted]:bg-red-50 data-[highlighted]:text-red-700 data-[highlighted]:outline-none"
                  >
                    <LogOut className="h-3 w-3 sm:h-4 sm:w-4 mr-2 sm:mr-3 flex-shrink-0" />
                    {t('logout') || 'Logout'}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </div>
    </nav>
  );
}