import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ConfirmDialog from '../ui/ConfirmDialog';
import GlobalLoadingOverlay from '../ui/GlobalLoadingOverlay';

export default function DashboardLayout({ user, onLogout, children }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const handleLogout = () => {
    setShowLogoutDialog(true);
  };

  const handleConfirmLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
      }
    } catch (err) {
      console.error('Logout error:', err);
    }

    // Navigate to login
    navigate('/login');
    setShowLogoutDialog(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Fixed Navbar - z-30 to stay above sidebar and content */}
      <Navbar
        user={user}
        onLogout={handleLogout}
        hideTitle={true} // We keep this logic
        className="fixed top-0 left-0 right-0 z-30 border-b border-gray-200"
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
      />

      {/* Main Layout area with padding for Navbar */}
      <div className="flex-1 pt-14 sm:pt-16">
        {/* Sidebar - Fixed position, handled inside component */}
        <Sidebar
          isCollapsed={sidebarCollapsed}
          setIsCollapsed={setSidebarCollapsed}
          user={user}
        />

        {/* Content Area - pushes right when sidebar is open */}
        {/* min-h-screen ensures background covers full height */}
        <main
          className={`min-h-[calc(100vh-64px)] bg-white transition-all duration-200 ease-in-out ${sidebarCollapsed ? 'ml-0' : 'ml-60'
            }`}
        >
          {children ? children : <Outlet />}
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
        onConfirm={handleConfirmLogout}
        title={t('confirmLogout')}
        message={t('confirmLogoutMessage')}
        type="danger"
        confirmText={t('logout')}
        cancelText={t('cancel')}
      />

      {/* Global Loading Overlay */}
      <GlobalLoadingOverlay />
    </div>
  );
}