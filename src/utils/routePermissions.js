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
  '/teacher-attendance': {
    allowedRoles: [ROLES.DIRECTOR], // Directors only
    component: 'DirectorTeacherAttendance'
  },
  '/my-classes': {
    allowedRoles: [ROLES.TEACHER],
    component: 'TeacherClasses'
  },
  '/my-students': {
    allowedRoles: [ROLES.TEACHER],
    component: 'TeacherStudentsManagement'
  },
  '/my-attendance': {
    allowedRoles: [ROLES.TEACHER, ROLES.DIRECTOR],
    component: 'TeacherSelfAttendance'
  },
  '/students/bulk-import': {
    allowedRoles: [ROLES.DIRECTOR], // Directors only
    component: 'BulkStudentImport'
  },
  '/attendance/approval': {
    allowedRoles: [ROLES.DIRECTOR], // Directors only
    component: 'AttendanceApprovalPage'
  },
  '/exam-records': {
    allowedRoles: [ROLES.DIRECTOR], // Directors only
    component: 'DirectorExamRecords'
  },
  '/my-students-exams': {
    allowedRoles: [ROLES.TEACHER],
    component: 'TeacherExamRecords'
  },
  '/reports': {
    allowedRoles: [ROLES.DIRECTOR], // Directors only
    component: 'Reports'
  },
  '/settings/school': {
    allowedRoles: [ROLES.DIRECTOR], // Directors only
    component: 'SchoolSettingsPage'
  },
  '/qr-codes': {
    allowedRoles: [ROLES.TEACHER, ROLES.DIRECTOR], // Both teachers and directors
    component: 'StudentQRCodeGenerator'
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

  // Get isDirector value - it can be at top level or nested in teacher object
  const isDirector = user.teacher?.isDirector === true || user.isDirector === true;
  const isNotDirector = !isDirector;

  // Director: roleId = 8 && isDirector = true can access all routes
  if (user.roleId === ROLES.DIRECTOR && isDirector) {
    return !!routePermissions[path];
  }

  // Teacher: roleId = 8 && (isDirector = false OR undefined) can access /attendance, /my-classes, /my-students, /my-attendance, /profile, and /students/qr-codes
  // Teachers CANNOT access /students/bulk-import or /qr-code-admin
  if (user.roleId === ROLES.TEACHER && isNotDirector) {
    return path === '/attendance' || path === '/my-classes' || path === '/my-students' || path === '/my-attendance' || path === '/profile' || path === '/qr-codes';
  }

  // Director: roleId = 8 && isDirector = true (already handled above in the first check)
  // This is a fallback for any director routes not explicitly checked above

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

  // Get isDirector value - it can be at top level or nested in teacher object
  const isDirector = user.teacher?.isDirector === true || user.isDirector === true;

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
    // {
    //   name: t('QRCodeManangement', 'QR Codes Management'),
    //   href: '/qr-codes',
    // },
    // {
    //   name: t('examRecord', 'Exam Records'),
    //   href: '/exam-records',
    // },
    {
      name: t('reports', 'Reports'),
      href: '/reports',
    },
    // Other temporarily removed navigation items:
    // achievements, settings
  ];

  // Teacher gets my-classes, my-students, attendance, and my-attendance
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
    // Temporarily disabled - will implement later:
    // {
    //   name: t('myStudentsExams', 'My Students Exams'),
    //   href: '/my-students-exams',
    // },
  ];

  // Return appropriate items based on user role
  // Check isDirector FIRST since both roles have roleId = 8
  if (user.roleId === 8 && isDirector) {
    return directorItems;
  }

  if (user.roleId === 8 && !isDirector) {
    return teacherItems;
  }

  return [];
};