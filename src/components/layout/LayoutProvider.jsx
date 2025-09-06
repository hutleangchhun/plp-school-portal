import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getRouteConfig } from '../../utils/componentLoader';

const LayoutContext = createContext();

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};

/**
 * LayoutProvider Component
 * Manages layout state and configuration across the application
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 */
export const LayoutProvider = ({ children }) => {
  const location = useLocation();
  const [layoutConfig, setLayoutConfig] = useState({
    type: 'default',
    showSidebar: true,
    showNavbar: true,
    showFooter: true,
    sidebarCollapsed: false,
    theme: 'light'
  });

  // Update layout based on current route
  useEffect(() => {
    const routeConfig = getRouteConfig(location.pathname);
    
    const newConfig = {
      ...layoutConfig,
      type: routeConfig.layout || 'default',
      showSidebar: routeConfig.layout === 'dashboard',
      showNavbar: routeConfig.layout === 'dashboard',
      showFooter: routeConfig.layout !== 'login'
    };

    setLayoutConfig(newConfig);
  }, [location.pathname]);

  // Layout actions
  const toggleSidebar = () => {
    setLayoutConfig(prev => ({
      ...prev,
      sidebarCollapsed: !prev.sidebarCollapsed
    }));
  };

  const setSidebarCollapsed = (collapsed) => {
    setLayoutConfig(prev => ({
      ...prev,
      sidebarCollapsed: collapsed
    }));
  };

  const setTheme = (theme) => {
    setLayoutConfig(prev => ({
      ...prev,
      theme
    }));
  };

  const updateLayoutConfig = (updates) => {
    setLayoutConfig(prev => ({
      ...prev,
      ...updates
    }));
  };

  const value = {
    config: layoutConfig,
    toggleSidebar,
    setSidebarCollapsed,
    setTheme,
    updateLayoutConfig
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
};

/**
 * Layout Configuration Presets
 */
export const LayoutPresets = {
  dashboard: {
    type: 'dashboard',
    showSidebar: true,
    showNavbar: true,
    showFooter: true,
    sidebarCollapsed: false
  },
  auth: {
    type: 'auth',
    showSidebar: false,
    showNavbar: false,
    showFooter: false,
    sidebarCollapsed: false
  },
  fullscreen: {
    type: 'fullscreen',
    showSidebar: false,
    showNavbar: false,
    showFooter: false,
    sidebarCollapsed: false
  },
  minimal: {
    type: 'minimal',
    showSidebar: false,
    showNavbar: true,
    showFooter: false,
    sidebarCollapsed: false
  }
};

export default LayoutProvider;