import { lazy } from 'react';

/**
 * Dynamic Component Loader
 * This utility provides dynamic component loading for better code splitting and maintenance
 */

// Page Components (lazy loaded for better performance)
export const DynamicComponents = {
  // Authentication
  Login: lazy(() => import('../pages/auth/Login')),
  
  // Layout Components
  Layout: lazy(() => import('../components/layout/Layout')),
  DashboardLayout: lazy(() => import('../components/layout/DashboardLayout')),
  Navbar: lazy(() => import('../components/layout/Navbar')),
  Sidebar: lazy(() => import('../components/layout/Sidebar')),
  
  // Page Components
  Dashboard: lazy(() => import('../pages/dashboard/Dashboard')),
  ProfileUpdate: lazy(() => import('../pages/profile/ProfileUpdate')),
  StudentsManagement: lazy(() => import('../pages/students/StudentsManagement')),
  StudentGradeManagement: lazy(() => import('../pages/students/StudentGradeManagement')),
  ClassesManagement: lazy(() => import('../pages/classes/ClassesManagement')),
  // Temporarily removed components (will be re-enabled later):
  // Reports: lazy(() => import('../pages/reports/Reports')),
  // Attendance: lazy(() => import('../pages/attendance/Attendance')),
  // Achievements: lazy(() => import('../pages/achievements/Achievements')),
  // Settings: lazy(() => import('../pages/settings/Settings')),
  // StudentGrades: lazy(() => import('../pages/students/StudentGrades')),
  // StudentAttendance: lazy(() => import('../pages/students/StudentAttendance')),
  // StudentAssignments: lazy(() => import('../pages/students/StudentAssignments')),
};

// Component Registry for dynamic loading based on strings
export const ComponentRegistry = {
  'Login': DynamicComponents.Login,
  'Dashboard': DynamicComponents.Dashboard,
  'ProfileUpdate': DynamicComponents.ProfileUpdate,
  'StudentsManagement': DynamicComponents.StudentsManagement,
  'StudentGradeManagement': DynamicComponents.StudentGradeManagement,
  'ClassesManagement': DynamicComponents.ClassesManagement,
  // Temporarily removed component registry entries (will be re-enabled later):
  // 'Reports': DynamicComponents.Reports,
  // 'Attendance': DynamicComponents.Attendance,
  // 'Achievements': DynamicComponents.Achievements,
  // 'Settings': DynamicComponents.Settings,
  // 'StudentGrades': DynamicComponents.StudentGrades,
  // 'StudentAttendance': DynamicComponents.StudentAttendance,
  // 'StudentAssignments': DynamicComponents.StudentAssignments,
};

/**
 * Get component by name dynamically
 * @param {string} componentName - Name of the component
 * @returns {React.Component} - The requested component
 */
export const getComponent = (componentName) => {
  return ComponentRegistry[componentName] || null;
};

/**
 * Route Configuration for dynamic loading
 */
export const RouteConfig = [
  {
    path: '/login',
    component: 'Login',
    title: 'signIn',
    requiresAuth: false,
    layout: null
  },
  {
    path: '/dashboard',
    component: 'Dashboard',
    title: 'dashboard',
    requiresAuth: true,
    layout: 'dashboard'
  },
  {
    path: '/profile',
    component: 'ProfileUpdate',
    title: 'profile',
    requiresAuth: true,
    layout: 'dashboard'
  },
  {
    path: '/students',
    component: 'StudentsManagement',
    title: 'studentsManagement',
    requiresAuth: true,
    layout: 'dashboard'
  },
  {
    path: '/classes',
    component: 'ClassesManagement',
    title: 'classesManagement',
    requiresAuth: true,
    layout: 'dashboard'
  },
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