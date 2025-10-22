/**
 * Route Permission Configuration
 * Defines which routes are accessible to which roles
 */

// Role constants
export const ROLES = {
  TEACHER: 8,
  DIRECTOR: 8, // Same roleId as teacher, but isDirector = true
};

// Route permissions configuration
export const routePermissions = {
  // Director (role_id = 8 && isDirector = true) can access all routes below
  '/dashboard': {
    allowedRoles: [ROLES.TEACHER],
    component: 'Dashboard'
  },
  '/profile': {
    allowedRoles: [ROLES.TEACHER],
    component: 'ProfileUpdate'
  },
  '/students': {
    allowedRoles: [ROLES.TEACHER],
    component: 'StudentsManagement'
  },
  '/classes': {
    allowedRoles: [ROLES.TEACHER],
    component: 'ClassesManagement'
  },
  '/teachers': {
    allowedRoles: [ROLES.TEACHER],
    component: 'TeachersManagement'
  },
  '/parents': {
    allowedRoles: [ROLES.TEACHER],
    component: 'ParentsManagement'
  },
  '/attendance': {
    allowedRoles: [ROLES.TEACHER],
    component: 'Attendance'
  },
  '/my-classes': {
    allowedRoles: [ROLES.TEACHER],
    component: 'TeacherClasses'
  },
  '/my-students': {
    allowedRoles: [ROLES.TEACHER],
    component: 'TeacherStudentsManagement'
  },
  '/students/bulk-import': {
    allowedRoles: [ROLES.DIRECTOR], // Directors only
    component: 'BulkStudentImport'
  }
};

/**
 * Check if user has access to a route
 * @param {string} path - Route path
 * @param {Object} user - User object with roleId and isDirector
 * @returns {boolean} Whether user has access
 */
export const hasRouteAccess = (path, user) => {
  if (!user || !path) return false;

  // Director: roleId = 8 && isDirector = true can access all routes
  if (user.roleId === ROLES.DIRECTOR && user.isDirector === true) {
    return !!routePermissions[path];
  }

  // Teacher: roleId = 8 && (isDirector = false OR undefined) can only access /attendance, /my-classes, /my-students, and /profile
  // Teachers CANNOT access /students/bulk-import
  if (user.roleId === ROLES.TEACHER && (user.isDirector === false || user.isDirector === undefined)) {
    return path === '/attendance' || path === '/my-classes' || path === '/my-students' || path === '/profile';
  }

  return false;
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
 * @param {Object} user - User object with roleId and isDirector
 * @param {Function} t - Translation function
 * @returns {Array} Array of navigation items
 */
export const getNavigationItems = (user, t) => {
  if (!user) return [];

  // Debug logging
  console.log('getNavigationItems - User:', user);
  console.log('getNavigationItems - roleId:', user.roleId);
  console.log('getNavigationItems - isDirector:', user.isDirector);
  console.log('getNavigationItems - Is Director check:', user.roleId === ROLES.DIRECTOR && user.isDirector === true);
  console.log('getNavigationItems - Is Teacher check:', user.roleId === ROLES.TEACHER && (user.isDirector === false || user.isDirector === undefined));

  // Director gets all navigation items
  const directorItems = [
    {
      name: t('dashboard') || 'ផ្ទាំងគ្រប់គ្រង',
      href: '/dashboard',
    },
    {
      name: t('teachers') || 'គ្រូបង្រៀន',
      href: '/teachers',
    },
    {
      name: t('classes') || 'ថ្នាក់រៀន',
      href: '/classes',
    },
    {
      name: t('students') || 'សិស្ស',
      href: '/students',
    },
    {
      name: t('parents') || 'ឪពុកម្តាយ',
      href: '/parents',
    },
    {
      name: t('attendance') || 'វត្តមាន',
      href: '/attendance',
    },
    // Temporarily removed navigation items:
    // reports, achievements, settings
  ];

  // Teacher gets my-classes, my-students, and attendance
  const teacherItems = [
    {
      name: t('myClasses', 'My Classes'),
      href: '/my-classes',
    },
    {
      name: t('myStudents', 'My Students'),
      href: '/my-students',
    },
    {
      name: t('attendance') || 'វត្តមាន',
      href: '/attendance',
    },
  ];

  // Return appropriate items based on user role
  // Check isDirector FIRST since both roles have roleId = 8
  if (user.roleId === 8 && user.isDirector === true) {
    console.log('getNavigationItems - Returning DIRECTOR items');
    return directorItems;
  }

  if (user.roleId === 8 && (user.isDirector === false || user.isDirector === undefined)) {
    console.log('getNavigationItems - Returning TEACHER items');
    return teacherItems;
  }

  console.log('getNavigationItems - No match, returning empty array');
  return [];
};