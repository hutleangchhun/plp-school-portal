/**
 * Route Permission Configuration
 * Defines which routes are accessible to which roles
 */

// Role constants
export const ROLES = {
  TEACHER: 8,
  STUDENT: 9
};

// Route permissions configuration
export const routePermissions = {
  // Dashboard - accessible to both teachers and students
  '/dashboard': {
    allowedRoles: [ROLES.TEACHER, ROLES.STUDENT],
    component: 'Dashboard'
  },
  
  // Profile - accessible to both
  '/profile': {
    allowedRoles: [ROLES.TEACHER, ROLES.STUDENT],
    component: 'ProfileUpdate'
  },

  // Teacher-only routes
  '/student-grade-management': {
    allowedRoles: [ROLES.TEACHER],
    component: 'StudentGradeManagement'
  },
  '/students': {
    allowedRoles: [ROLES.TEACHER],
    component: 'StudentsManagement'
  },
  '/classes': {
    allowedRoles: [ROLES.TEACHER],
    component: 'ClassesManagement'
  },
  // Temporarily removed routes (will be re-enabled later):
  // '/reports', '/attendance', '/achievements', '/settings'
  // '/my-grades', '/my-attendance', '/my-assignments'
};

/**
 * Check if user has access to a route
 * @param {string} path - Route path
 * @param {Object} user - User object with roleId
 * @returns {boolean} Whether user has access
 */
export const hasRouteAccess = (path, user) => {
  if (!user || !path) return false;
  
  const routeConfig = routePermissions[path];
  if (!routeConfig) return false;
  
  return routeConfig.allowedRoles.includes(user.roleId);
};

/**
 * Get accessible routes for a user
 * @param {Object} user - User object with roleId
 * @returns {Array} Array of accessible route paths
 */
export const getAccessibleRoutes = (user) => {
  if (!user) return [];
  
  return Object.keys(routePermissions).filter(path => 
    hasRouteAccess(path, user)
  );
};

/**
 * Get navigation items based on user role
 * @param {Object} user - User object with roleId
 * @param {Function} t - Translation function
 * @returns {Array} Array of navigation items
 */
export const getNavigationItems = (user, t) => {
  if (!user) return [];
  
  const commonItems = [
    {
      name: t('dashboard') || 'Dashboard',
      href: '/dashboard',
      allowedRoles: [ROLES.TEACHER, ROLES.STUDENT]
    }
  ];

  const teacherItems = [
    {
      name: t('students') || 'Students',
      href: '/students',
      allowedRoles: [ROLES.TEACHER]
    },
    {
      name: t('classes') || 'Classes',
      href: '/classes',
      allowedRoles: [ROLES.TEACHER]
    },
    {
      name: t('student-grade-management') || 'Grade Management',
      href: '/student-grade-management',
      allowedRoles: [ROLES.TEACHER]
    }
    // Temporarily removed navigation items:
    // attendance, reports, achievements, settings
  ];

  const studentItems = [
    // Temporarily removed student navigation items:
    // my-grades, my-attendance, my-assignments
  ];

  const allItems = [...commonItems, ...teacherItems, ...studentItems];
  
  return allItems.filter(item => 
    item.allowedRoles.includes(user.roleId)
  );
};