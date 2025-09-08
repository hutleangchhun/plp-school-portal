import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import ConfirmDialog from '../ui/ConfirmDialog';
export default function DashboardLayout({ user, onLogout }) {
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
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar 
        isCollapsed={sidebarCollapsed} 
        setIsCollapsed={setSidebarCollapsed} 
      />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <div className="flex-shrink-0">
          <Navbar 
            user={user} 
            onLogout={handleLogout}
            hideTitle={true}
            className="border-b border-gray-200"
          />
        </div>
        
        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <Outlet />
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
    </div>
  );
}