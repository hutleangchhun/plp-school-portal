import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useLayout } from './LayoutProvider';
import { DynamicComponents } from '../../utils/componentLoader';

/**
 * ResponsiveLayout Component
 * Adaptive layout that responds to screen size and layout configuration
 * 
 * @param {Object} props
 * @param {Object} props.user - Current user object
 * @param {Function} props.onLogout - Logout handler
 * @param {React.ReactNode} props.children - Child components (optional, uses Outlet if not provided)
 */
export default function ResponsiveLayout({ user, onLogout, children }) {
  const { config, toggleSidebar, setSidebarCollapsed } = useLayout();
  const [isMobile, setIsMobile] = useState(false);
  // const [isTablet, setIsTablet] = useState(false); // For future responsive features

  // Responsive breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      // setIsTablet(width >= 768 && width < 1024); // For future use
      
      // Auto-collapse sidebar on mobile
      if (width < 768) {
        setSidebarCollapsed(true);
      } else if (width > 1024 && config.sidebarCollapsed) {
        setSidebarCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed, config.sidebarCollapsed]);

  // Layout classes based on configuration
  const getLayoutClasses = () => {
    const baseClasses = 'min-h-screen bg-gray-50';
    
    switch (config.type) {
      case 'dashboard':
        return `${baseClasses} flex`;
      case 'auth':
        return `${baseClasses} flex items-center justify-center`;
      case 'fullscreen':
        return `${baseClasses}`;
      default:
        return baseClasses;
    }
  };

  // Content area classes
  const getContentClasses = () => {
    if (config.type === 'dashboard') {
      return `flex-1 flex flex-col ${config.showSidebar && !config.sidebarCollapsed ? 'ml-0' : ''}`;
    }
    return 'w-full';
  };

  // Render layout based on type
  const renderLayout = () => {
    switch (config.type) {
      case 'dashboard':
        return (
          <div className={getLayoutClasses()}>
            {/* Sidebar */}
            {config.showSidebar && (
              <div className={`
                ${isMobile ? 'fixed inset-y-0 left-0 z-50' : 'relative'}
                ${config.sidebarCollapsed && !isMobile ? 'w-16' : 'w-64'}
                transition-all duration-300 ease-in-out
                ${isMobile && config.sidebarCollapsed ? '-translate-x-full' : 'translate-x-0'}
              `}>
                <DynamicComponents.Sidebar
                  isCollapsed={config.sidebarCollapsed}
                  setIsCollapsed={setSidebarCollapsed}
                  isMobile={isMobile}
                />
                
                {/* Mobile overlay */}
                {isMobile && !config.sidebarCollapsed && (
                  <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40"
                    onClick={() => setSidebarCollapsed(true)}
                  />
                )}
              </div>
            )}

            {/* Main content area */}
            <div className={getContentClasses()}>
              {/* Navbar */}
              {config.showNavbar && (
                <DynamicComponents.Navbar
                  user={user}
                  onLogout={onLogout}
                  onToggleSidebar={toggleSidebar}
                  isMobile={isMobile}
                />
              )}

              {/* Main content */}
              <main className="flex-1 relative overflow-hidden">
                <div className="h-full overflow-auto">
                  {children || <Outlet />}
                </div>
              </main>

              {/* Footer */}
              {config.showFooter && (
                <DynamicComponents.Footer />
              )}
            </div>
          </div>
        );

      case 'auth':
        return (
          <div className={getLayoutClasses()}>
            <div className="w-full max-w-md mx-auto">
              {children || <Outlet />}
            </div>
          </div>
        );

      case 'fullscreen':
        return (
          <div className={getLayoutClasses()}>
            {children || <Outlet />}
          </div>
        );

      default:
        return (
          <div className={getLayoutClasses()}>
            {config.showNavbar && (
              <DynamicComponents.Navbar
                user={user}
                onLogout={onLogout}
                simplified={true}
              />
            )}
            
            <main className="flex-1">
              {children || <Outlet />}
            </main>

            {config.showFooter && <DynamicComponents.Footer />}
          </div>
        );
    }
  };

  return renderLayout();
}

/**
 * Mobile-specific layout adjustments
 */
export const MobileLayoutAdjustments = {
  // Adjust sidebar behavior on mobile
  sidebarBehavior: 'overlay', // 'overlay' | 'push' | 'off-canvas'
  
  // Navigation behavior
  navCollapse: true,
  
  // Content padding adjustments
  contentPadding: {
    mobile: 'p-2',
    tablet: 'p-4',
    desktop: 'p-6'
  },
  
  // Font size adjustments
  fontSizes: {
    mobile: 'text-sm',
    tablet: 'text-base',
    desktop: 'text-base'
  }
};

/**
 * Layout utility functions
 */
export const LayoutUtils = {
  // Get responsive classes based on screen size
  getResponsiveClasses: (mobileClass, tabletClass, desktopClass) => {
    return `${mobileClass} md:${tabletClass} lg:${desktopClass}`;
  },
  
  // Check if current layout supports feature
  supportsFeature: (feature, layoutConfig) => {
    const featureMap = {
      sidebar: layoutConfig.showSidebar,
      navbar: layoutConfig.showNavbar,
      footer: layoutConfig.showFooter,
      breadcrumbs: layoutConfig.type === 'dashboard'
    };
    
    return featureMap[feature] || false;
  }
};