/**
 * Route Permission Configuration
 * Defines which routes are accessible to which roles
 */

// Role constants
export const ROLES = {
  TEACHER: 8,
  DIRECTOR_ROLE: 14, // Director role ID
  ROLE1: 1,
  DIRECTOR: 'DIRECTOR', // Special marker to indicate director-only routes (roleId=14)
  TEACHER_ONLY: 'TEACHER_ONLY', // Special marker for teacher-only routes (roleId=8)
  ROLE1_ONLY: 'ROLE1_ONLY', // Special marker for role1-only routes (roleId=1)
};

// Route permissions configuration
export const routePermissions = {
  // Director (roleId = 14) can access director-only routes
  // Teacher (roleId = 8) can access teacher-only and shared routes
  '/dashboard': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'Dashboard'
  },
  '/profile': {
    allowedRoles: [ROLES.TEACHER, ROLES.DIRECTOR],
    component: 'ProfileUpdate'
  },
  '/students': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'StudentsManagement'
  },
  '/students/edit': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'StudentEditModal'
  },
  '/classes': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'ClassesManagement'
  },
  '/teachers': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'TeachersManagement'
  },
  '/parents': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'ParentsManagement'
  },
  '/attendance': {
    allowedRoles: [ROLES.DIRECTOR, ROLES.TEACHER],
    component: 'Attendance'
  },
  '/teacher-attendance': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'DirectorTeacherAttendance'
  },
  '/teacher-dashboard': {
    allowedRoles: [ROLES.TEACHER_ONLY],
    component: 'TeacherClasses'
  },
  '/my-students': {
    allowedRoles: [ROLES.TEACHER_ONLY],
    component: 'TeacherStudentsManagement'
  },
  '/my-students/edit': {
    allowedRoles: [ROLES.TEACHER_ONLY],
    component: 'StudentEditModal'
  },
  '/my-attendance': {
    allowedRoles: [ROLES.TEACHER, ROLES.DIRECTOR],
    component: 'TeacherSelfAttendance'
  },
  '/teacher-reports': {
    allowedRoles: [ROLES.TEACHER_ONLY],
    component: 'TeacherReports'
  },
  '/students/bulk-import': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'BulkStudentImport'
  },
  '/attendance/approval': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'AttendanceApprovalPage'
  },
  '/exam-records': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'DirectorExamRecords'
  },
  '/exam-records/:userId': {
    allowedRoles: [ROLES.TEACHER, ROLES.DIRECTOR],
    component: 'StudentExamRecordsPage'
  },
  '/my-students-exams': {
    allowedRoles: [ROLES.TEACHER],
    component: 'TeacherExamRecords'
  },
  '/reports': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'Reports'
  },
  '/settings/school': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'SchoolSettingsPage'
  },
  '/qr-codes': {
    allowedRoles: [ROLES.TEACHER, ROLES.DIRECTOR],
    component: 'StudentQRCodeGenerator'
  },
  '/admin-dashboard': {
    allowedRoles: [ROLES.ROLE1_ONLY, ROLES.DIRECTOR],
    component: 'AdminDashboard'
  }
};

/**
 * Check if user has access to a route
 * @param {string} path - Route path
 * @param {Object} user - User object with roleId
 * @returns {boolean} Whether user has access
 */
export const hasRouteAccess = (path, user) => {
  if (!user || !path) return false;

  // Helper function to check if a path matches a route pattern
  const matchRoute = (pattern, pathname) => {
    // Exact match
    if (pattern === pathname) return true;

    // Pattern match (e.g., /exam-records/:userId matches /exam-records/123)
    const patternParts = pattern.split('/');
    const pathParts = pathname.split('/');

    if (patternParts.length !== pathParts.length) return false;

    return patternParts.every((part, index) => {
      return part.startsWith(':') || part === pathParts[index];
    });
  };

  // Helper function to find the route config for a path
  const findRouteConfig = (path) => {
    // Check exact match first
    if (routePermissions[path]) return routePermissions[path];

    // Check pattern matches
    for (const routePath of Object.keys(routePermissions)) {
      if (matchRoute(routePath, path)) {
        return routePermissions[routePath];
      }
    }
    return null;
  };

  // Director: roleId = 14
  if (user.roleId === ROLES.DIRECTOR_ROLE) {
    const routeConfig = findRouteConfig(path);

    // If route doesn't exist, deny access
    if (!routeConfig) return false;

    // If route specifies allowed roles, check if director is allowed
    if (routeConfig.allowedRoles && routeConfig.allowedRoles.length > 0) {
      // Director can access routes that have ROLES.DIRECTOR in allowedRoles
      return routeConfig.allowedRoles.includes(ROLES.DIRECTOR);
    }

    // If no allowedRoles specified, deny access
    return false;
  }

  // Teacher: roleId = 8
  if (user.roleId === ROLES.TEACHER) {
    const routeConfig = findRouteConfig(path);

    // If route doesn't exist, deny access
    if (!routeConfig) return false;

    // If route specifies allowed roles, check if teacher can access
    if (routeConfig.allowedRoles && routeConfig.allowedRoles.length > 0) {
      // Teacher can access routes that have ROLES.TEACHER_ONLY or ROLES.TEACHER in allowedRoles
      return routeConfig.allowedRoles.includes(ROLES.TEACHER_ONLY) || routeConfig.allowedRoles.includes(ROLES.TEACHER);
    }

    // If no allowedRoles specified, deny access
    return false;
  }

  // Role 1: roleId = 1 (can access role1-specific routes and shared routes)
  if (user.roleId === ROLES.ROLE1) {
    const routeConfig = findRouteConfig(path);

    // If route doesn't exist, deny access
    if (!routeConfig) return false;

    // If route specifies allowed roles, check if role1 can access
    if (routeConfig.allowedRoles && routeConfig.allowedRoles.length > 0) {
      // Role1 can access routes that have ROLE1_ONLY or any role that TEACHER or DIRECTOR can access
      return routeConfig.allowedRoles.includes(ROLES.ROLE1_ONLY) ||
             routeConfig.allowedRoles.includes(ROLES.ROLE1) ||
             routeConfig.allowedRoles.includes(ROLES.TEACHER) ||
             routeConfig.allowedRoles.includes(ROLES.DIRECTOR);
    }

    // If no allowedRoles specified, deny access
    return false;
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
 * @param {Object} user - User object with roleId
 * @param {Function} t - Translation function
 * @returns {Array} Array of navigation items
 */
export const getNavigationItems = (user, t) => {
  if (!user) return [];

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
    // {
    //   name: t('parents') || 'ឪពុកម្តាយ',
    //   href: '/parents',
    // },
    {
      name: t('attendance') || 'វត្តមាន',
      href: '#', // Parent item doesn't need a direct link
      children: [
        {
          name: t('studentAttendance') || 'វត្តមានសិស្ស',
          href: '/attendance',
        },
        {
          name: t('teacherAttendance') || 'វត្តមានគ្រូបង្រៀន',
          href: '/teacher-attendance',
        },
        {
          name: t('myAttendance') || 'វត្តមានរបស់ខ្ញុំ',
          href: '/my-attendance',
        },
      ],
    },
    {
       name: t('QRCodeManangement', 'QR Codes Management'),
      href: '/qr-codes',
     },
    // DISABLED: /exam-records removed from director navigation
    // {
    //   name: t('examRecords', 'Exam Records'),
    //   href: '/exam-records',
    // },
    {
      name: t('reports', 'Reports'),
      href: '/reports',
    },
    // Other temporarily removed navigation items:
    // achievements, settings
  ];

  // Teacher gets my-classes, my-students, attendance, my-attendance, and qr-codes
  const teacherItems = [
    {
      name: t('dashboard', 'Dashboard'),
      href: '/teacher-dashboard',
    },
    {      name: t('student', 'Students'),
      href: '/my-students',
    },
    {
      name: t('attendance') || 'វត្តមាន',
      href: '#', // Parent item doesn't need a direct link
      children: [
        {
          name: t('studentAttendance') || 'វត្តមានសិស្ស',
          href: '/attendance',
        },
        {
          name: t('myAttendance') || 'វត្តមានរបស់ខ្ញុំ',
          href: '/my-attendance',
        },
      ],
    },
    {
      name: t('QRCodeManangement', 'QR Codes Management'),
      href: '/qr-codes',
    },
    {
      name: t('reports', 'Reports'),
      href: '/teacher-reports',
    },
    // DISABLED: /my-students-exams removed from teacher navigation
    // {
    //   name: t('myStudentsExams', 'My Students Exams'),
    //   href: '/my-students-exams',
    // },
  ];

  // Role 1 (Admin) navigation items
  const role1Items = [
    {
      name: t('dashboard') || 'Dashboard',
      href: '/admin-dashboard',
    },
  ];

  // Return appropriate items based on user role
  if (user.roleId === 1) {
    return role1Items;
  }

  // Director: roleId = 14
  if (user.roleId === 14) {
    return directorItems;
  }

  // Teacher: roleId = 8
  if (user.roleId === 8) {
    return teacherItems;
  }

  return [];
};