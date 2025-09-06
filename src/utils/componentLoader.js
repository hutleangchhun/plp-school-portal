import { lazy } from 'react';

/**
 * Dynamic Component Loader
 * This utility provides dynamic component loading for better code splitting and maintenance
 */

// Page Components (lazy loaded for better performance)
export const DynamicComponents = {
  // Authentication
  Login: lazy(() => import('../components/Login')),
  
  // Layout Components
  Layout: lazy(() => import('../components/Layout')),
  DashboardLayout: lazy(() => import('../components/DashboardLayout')),
  Navbar: lazy(() => import('../components/Navbar')),
  Sidebar: lazy(() => import('../components/Sidebar')),
  MobileSidebar: lazy(() => import('../components/MobileSidebar')),
  Footer: lazy(() => import('../components/Footer')),
  
  // Page Components
  Dashboard: lazy(() => import('../components/Dashboard')),
  ProfileUpdate: lazy(() => import('../components/ProfileUpdate')),
  StudentsManagement: lazy(() => import('../components/StudentsManagement')),
  StudentGradeManagement: lazy(() => import('../components/StudentGradeManagement')),
  ClassesManagement: lazy(() => import('../components/ClassesManagement')),
  Reports: lazy(() => import('../components/Reports')),
  Attendance: lazy(() => import('../components/Attendance')),
  Achievements: lazy(() => import('../components/Achievements')),
  Settings: lazy(() => import('../components/Settings')),
  PlaceholderPage: lazy(() => import('../components/PlaceholderPage')),
  
  // Common Components
  LanguageSwitcher: lazy(() => import('../components/LanguageSwitcher')),
};

// Component Registry for dynamic loading based on strings
export const ComponentRegistry = {
  'login': DynamicComponents.Login,
  'dashboard': DynamicComponents.Dashboard,
  'profile': DynamicComponents.ProfileUpdate,
  'students': DynamicComponents.StudentsManagement,
  'student-grade': DynamicComponents.StudentGradeManagement,
  'classes': DynamicComponents.ClassesManagement,
  'reports': DynamicComponents.Reports,
  'attendance': DynamicComponents.Attendance,
  'achievements': DynamicComponents.Achievements,
  'settings': DynamicComponents.Settings,
  'placeholder': DynamicComponents.PlaceholderPage,
};

/**
 * Get component by name dynamically
 * @param {string} componentName - Name of the component
 * @returns {React.Component} - The requested component
 */
export const getComponent = (componentName) => {
  return ComponentRegistry[componentName] || DynamicComponents.PlaceholderPage;
};

/**
 * Route Configuration for dynamic loading
 */
export const RouteConfig = [
  {
    path: '/login',
    component: 'login',
    title: 'signIn',
    requiresAuth: false,
    layout: null
  },
  {
    path: '/dashboard',
    component: 'dashboard',
    title: 'dashboard',
    requiresAuth: true,
    layout: 'dashboard'
  },
  {
    path: '/profile',
    component: 'profile',
    title: 'profile',
    requiresAuth: true,
    layout: 'dashboard'
  },
  {
    path: '/students',
    component: 'students',
    title: 'studentsManagement',
    requiresAuth: true,
    layout: 'dashboard'
  },
  {
    path: '/student-grade-management',
    component: 'student-grade',
    title: 'studentGradeManagement',
    requiresAuth: true,
    layout: 'dashboard'
  },
  {
    path: '/classes',
    component: 'classes',
    title: 'classesManagement',
    requiresAuth: true,
    layout: 'dashboard'
  },
  {
    path: '/reports',
    component: 'reports',
    title: 'reports',
    requiresAuth: true,
    layout: 'dashboard'
  },
  {
    path: '/attendance',
    component: 'attendance',
    title: 'attendance',
    requiresAuth: true,
    layout: 'dashboard'
  },
  {
    path: '/achievements',
    component: 'achievements',
    title: 'achievements',
    requiresAuth: true,
    layout: 'dashboard'
  },
  {
    path: '/settings',
    component: 'settings',
    title: 'settings',
    requiresAuth: true,
    layout: 'dashboard'
  }
];

/**
 * Get route configuration by path
 * @param {string} path - Route path
 * @returns {Object} - Route configuration object
 */
export const getRouteConfig = (path) => {
  return RouteConfig.find(route => route.path === path) || {
    path: path,
    component: 'placeholder',
    title: 'pageNotFound',
    requiresAuth: true,
    layout: 'dashboard'
  };
};

/**
 * Navigation Menu Configuration
 */
export const NavigationConfig = [
  {
    id: 'dashboard',
    path: '/dashboard',
    titleKey: 'dashboard',
    icon: 'Home',
    color: 'blue',
    requiresAuth: true,
    roles: ['admin', 'teacher', 'student']
  },
  {
    id: 'students',
    path: '/students',
    titleKey: 'studentsManagement',
    icon: 'Users',
    color: 'purple',
    requiresAuth: true,
    roles: ['admin', 'teacher']
  },
  {
    id: 'classes',
    path: '/classes',
    titleKey: 'classesManagement',
    icon: 'BookOpen',
    color: 'green',
    requiresAuth: true,
    roles: ['admin', 'teacher']
  },
  {
    id: 'attendance',
    path: '/attendance',
    titleKey: 'attendance',
    icon: 'Calendar',
    color: 'orange',
    requiresAuth: true,
    roles: ['admin', 'teacher']
  },
  {
    id: 'achievements',
    path: '/achievements',
    titleKey: 'achievements',
    icon: 'Award',
    color: 'yellow',
    requiresAuth: true,
    roles: ['admin', 'teacher', 'student']
  },
  {
    id: 'reports',
    path: '/reports',
    titleKey: 'reports',
    icon: 'FileText',
    color: 'indigo',
    requiresAuth: true,
    roles: ['admin', 'teacher']
  },
  {
    id: 'settings',
    path: '/settings',
    titleKey: 'settings',
    icon: 'Settings',
    color: 'gray',
    requiresAuth: true,
    roles: ['admin', 'teacher', 'student']
  }
];

/**
 * Filter navigation items by user role
 * @param {Object} user - User object containing role information
 * @returns {Array} - Filtered navigation items
 */
export const getNavigationForUser = (user) => {
  if (!user) return [];
  
  const userRole = user.roleNameEn?.toLowerCase() || 'student';
  
  return NavigationConfig.filter(item => 
    item.roles.includes(userRole) || item.roles.includes('all')
  );
};

export default {
  DynamicComponents,
  ComponentRegistry,
  getComponent,
  RouteConfig,
  getRouteConfig,
  NavigationConfig,
  getNavigationForUser
};