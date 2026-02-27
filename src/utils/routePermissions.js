/**
 * Route Permission Configuration
 * Defines which routes are accessible to which roles
 */

import { userUtils } from './api/services/userService';

// Role constants
export const ROLES = {
  TEACHER: 8,
  DIRECTOR_ROLE: 14, // Director role ID
  ROLE1: 1,
  DIRECTOR: 'DIRECTOR', // Special marker to indicate director-only routes (roleId=14)
  TEACHER_ONLY: 'TEACHER_ONLY', // Special marker for teacher-only routes (roleId=8)
  ROLE1_ONLY: 'ROLE1_ONLY', // Special marker for role1-only routes (roleId=1)
  ROLE15: 15, // Deputy Principal
  ROLE16: 16, // School Secretary
  ROLE17: 17, // School Treasurer
  ROLE18: 18, // School Librarian
  ROLE19: 19, // School Workshop
  ROLE20: 20, // School Security
  ROLE21: 21, // ICT Teacher
  RESTRICTED_ROLES_ONLY: 'RESTRICTED_ROLES_ONLY', // Special marker for roles 15-21
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
    allowedRoles: [ROLES.TEACHER, ROLES.DIRECTOR, ROLES.RESTRICTED_ROLES_ONLY],
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
    allowedRoles: [ROLES.TEACHER],
    component: 'Attendance'
  },
  '/teacher-attendance': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'DirectorTeacherAttendance'
  },
  '/student-attendance-view': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'DirectorStudentAttendance'
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
    allowedRoles: [ROLES.TEACHER, ROLES.DIRECTOR, ROLES.RESTRICTED_ROLES_ONLY],
    component: 'TeacherSelfAttendance'
  },
  '/teacher-reports': {
    allowedRoles: [ROLES.TEACHER_ONLY],
    component: 'TeacherReports'
  },
  '/my-schedule': {
    allowedRoles: [ROLES.TEACHER_ONLY],
    component: 'WeeklySchedule'
  },
  '/school-schedule': {
    allowedRoles: [ROLES.DIRECTOR],
    component: 'DirectorSchedule'
  },
  '/students/bulk-import': {
    allowedRoles: [ROLES.ROLE1_ONLY, ROLES.DIRECTOR],
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
  },
  '/admin-logs': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'UserActivityLogs'
  },
  '/admin/logs': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'UserActivityLogs'
  },
  '/admin/teacher-transfer': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'TeacherTransferManagement'
  },
  '/admin/student-transfer': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'StudentTransferManagement'
  },
  '/admin/student-demographics': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'AdminStudentDemographic'
  },
  '/admin/bmi-report': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'BMIReport'
  },
  '/admin/school-attendance': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'SchoolAttendanceList'
  },
  '/admin/teacher-overview': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'TeacherOverviewDashboard'
  },
  '/admin/user-registration': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'UserRegistrationDashboard'
  },
  '/admin/officer-registration': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'OfficerRegistration'
  },
  '/admin/schools': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'SchoolManagement'
  },
  '/admin/shifts': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'ShiftsManagement'
  },
  '/admin/user-attendance': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'AdminUserAttendance'
  },
  '/admin/user-statistics': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'AdminUserStatistics'
  },
  '/admin/staff-data-completion': {
    allowedRoles: [ROLES.ROLE1_ONLY],
    component: 'AdminStaffDataCompletion'
  },
  '/multi-role-dashboard': {
    allowedRoles: [ROLES.TEACHER, ROLES.DIRECTOR, ROLES.RESTRICTED_ROLES_ONLY],
    component: 'MultiRoleDashboardPage'
  }
};

/**
 * Helper function to check if a user has teaching duties (has assigned classes)
 * Works for any role that has classIds
 * @param {Object} user - User object with roleId and classIds
 * @returns {boolean} Whether user has teaching duties
 */
export const hasTeachingDuties = (user) => {
  if (!user) {
    return false;
  }
  return user.classIds && user.classIds.length > 0;
};

/**
 * Helper function to check if a director has teaching duties (has assigned classes)
 * Deprecated: Use hasTeachingDuties instead for any role
 * @param {Object} user - User object with roleId and classIds
 * @returns {boolean} Whether director has teaching duties
 */
export const isDirectorWithTeachingDuties = (user) => {
  if (!user || user.roleId !== ROLES.DIRECTOR_ROLE) {
    return false;
  }
  return hasTeachingDuties(user);
};

/**
 * Helper function to check if user can access teacher features
 * Teachers (roleId=8) OR any user with classIds can access teacher features
 * @param {Object} user - User object with roleId and classIds
 * @returns {boolean} Whether user can access teacher features
 */
export const canAccessTeacherFeatures = (user) => {
  if (!user) {
    return false;
  }
  // Direct teacher
  if (user.roleId === ROLES.TEACHER) {
    return true;
  }
  // Any user with teaching assignments
  if (hasTeachingDuties(user)) {
    return true;
  }
  return false;
};

/**
 * Check if user has access to a route
 * @param {string} path - Route path
 * @param {Object} user - User object with roleId and classIds
 * @returns {boolean} Whether user has access
 */
export const hasRouteAccess = (path, user) => {
  if (!user || !path) {
    return false;
  }

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

    // Special case: /multi-role-dashboard requires officerRoles
    if (path === '/multi-role-dashboard') {
      return userUtils.hasMultipleRoles(user);
    }
    // If route specifies allowed roles, check if director is allowed
    if (routeConfig.allowedRoles && routeConfig.allowedRoles.length > 0) {
      // Director can access routes that have ROLES.DIRECTOR in allowedRoles
      const canAccessAsDirector = routeConfig.allowedRoles.includes(ROLES.DIRECTOR);

      // User with teaching duties can also access teacher-only routes
      const hasTeaching = hasTeachingDuties(user);
      const canAccessAsTeacher = hasTeaching && (
        routeConfig.allowedRoles.includes(ROLES.TEACHER_ONLY) ||
        routeConfig.allowedRoles.includes(ROLES.TEACHER)
      );

      return canAccessAsDirector || canAccessAsTeacher;
    }

    // If no allowedRoles specified, deny access
    return false;
  }

  // Teacher: roleId = 8
  if (user.roleId === ROLES.TEACHER) {
    const routeConfig = findRouteConfig(path);

    // If route doesn't exist, deny access
    if (!routeConfig) return false;

    // Special case: /multi-role-dashboard requires officerRoles
    if (path === '/multi-role-dashboard') {
      return userUtils.hasMultipleRoles(user);
    }

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
    if (!routeConfig) {
      return false;
    }

    // Special case: /multi-role-dashboard requires officerRoles
    if (path === '/multi-role-dashboard') {
      return userUtils.hasMultipleRoles(user);
    }

    // If route specifies allowed roles, check if role1 can access
    if (routeConfig.allowedRoles && routeConfig.allowedRoles.length > 0) {
      const canAccess = routeConfig.allowedRoles.includes(ROLES.ROLE1_ONLY) ||
        routeConfig.allowedRoles.includes(ROLES.ROLE1) ||
        routeConfig.allowedRoles.includes(ROLES.TEACHER) ||
        routeConfig.allowedRoles.includes(ROLES.DIRECTOR);
      return canAccess;
    }

    // If no allowedRoles specified, deny access
    return false;
  }

  // Restricted Roles: roleId = 15-21 (can access only /profile and /my-attendance)
  // But if they have teaching duties, they can also access teacher features
  if (user.roleId >= ROLES.ROLE15 && user.roleId <= ROLES.ROLE21) {
    const routeConfig = findRouteConfig(path);

    // If route doesn't exist, deny access
    if (!routeConfig) {
      return false;
    }

    // Special case: /multi-role-dashboard requires officerRoles
    if (path === '/multi-role-dashboard') {
      return userUtils.hasMultipleRoles(user);
    }

    // If route specifies allowed roles, check if restricted role can access
    if (routeConfig.allowedRoles && routeConfig.allowedRoles.length > 0) {
      // Can access restricted roles routes
      const canAccessRestricted = routeConfig.allowedRoles.includes(ROLES.RESTRICTED_ROLES_ONLY);

      // If user has teaching duties, can also access teacher routes
      const hasTeaching = hasTeachingDuties(user);
      const canAccessAsTeacher = hasTeaching && (
        routeConfig.allowedRoles.includes(ROLES.TEACHER_ONLY) ||
        routeConfig.allowedRoles.includes(ROLES.TEACHER)
      );

      return canAccessRestricted || canAccessAsTeacher;
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
    // TEMPORARILY HIDDEN: School Schedule route
    // {
    //   name: t('schoolSchedule', 'School Schedule'),
    //   href: '/school-schedule',
    // },
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
          name: t('studentAttendanceView', 'Student Attendance View'),
          href: '/student-attendance-view',
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

  // Add multi-role dashboard if director has multiple roles
  if (user && userUtils.hasMultipleRoles(user)) {
    directorItems.push({
      name: t('multiRoleDashboard', 'Multi-Role Dashboard'),
      href: '#',
      children: [
        {
          name: t('multiRoleDashboard', 'Multi-Role Dashboard'),
          href: '/multi-role-dashboard',
        },
      ],
    });
  }

  // Teacher gets my-classes, my-students, attendance, my-attendance, and qr-codes
  const teacherItems = [
    {
      name: t('dashboard', 'Dashboard'),
      href: '/teacher-dashboard',
    },
    {
      name: t('student', 'Students'),
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
    // TEMPORARILY HIDDEN: My Schedule route
    // {
    //   name: t('mySchedule', 'My Schedule'),
    //   href: '/my-schedule',
    // },
    {
      name: t('QRCodeManangement', 'QR Codes Management'),
      href: '/qr-codes',
    },
    {
      name: t('reports', 'Reports'),
      href: '/teacher-reports',
    },
  ];

  // Add multi-role dashboard if teacher has secondary roles
  if (user && userUtils.hasMultipleRoles(user)) {
    teacherItems.push({
      name: t('multiRoleDashboard', 'Multi-Role Dashboard'),
      href: '#',
      children: [
        {
          name: t('multiRoleDashboard', 'Multi-Role Dashboard'),
          href: '/multi-role-dashboard',
        },
      ],
    });
  }

  // Role 1 (Admin) navigation items
  const role1Items = [
    {
      name: t('dashboard') || 'Dashboard',
      href: '/admin-dashboard',
    },
    {
      name: t('userActivityLogs', 'User Activity Logs'),
      href: '/admin-logs',
    },
    {
      name: t('teachersManagement', 'Teacher Management'),
      href: '#',
      children: [
        {
          name: t('teacherOverview', 'Teacher Overview'),
          href: '/admin/teacher-overview',
        },
        {
          name: t('teacherTransfer', 'Teacher Transfer'),
          href: '/admin/teacher-transfer',
        },
      ],
    },
    {
      name: t('studentsManagement', 'Students Management'),
      children: [
        {
          name: t('studentTransfer', 'Student Transfer'),
          href: '/admin/student-transfer',
        },
        {
          name: t('studentDataOverview', 'Student Data Overview'),
          href: '/admin/student-demographics',
        },
      ],
    },
    {
      name: t('bmiAnalysis', 'BMI Analysis'),
      href: '/admin/bmi-report',
    },
    {
      name: t('attendanceManagement', 'Attendance Management'),
      href: '#',
      children: [
        {
          name: t('schoolAttendanceList', 'School Attendance'),
          href: '/admin/school-attendance',
        },
        {
          name: t('shiftsManagement', 'Shifts Management'),
          href: '/admin/shifts',
        },
        {
          name: t('userAttendanceTrack', 'User Attendance Track'),
          href: '/admin/user-attendance',
        },
      ],
    },
    {
      name: t('userRegistrationDashboard', 'User Registration'),
      href: '/admin/user-registration',
    },
    {
      name: t('officerRegistration', 'Officer Registration'),
      href: '/admin/officer-registration',
    },
    {
      name: t('schoolManagementPage', 'School Management'),
      href: '/admin/schools',
    },
    {
      name: t('userStatistics', 'User Statistics'),
      href: '/admin/user-statistics',
    },
    {
      name: t('staffDataCompletion', 'ការបំពេញទិន្នន័យបុគ្គលិក'),
      href: '/admin/staff-data-completion',
    },
  ];

  // Add multi-role dashboard if admin has secondary roles
  if (user && userUtils.hasMultipleRoles(user)) {
    role1Items.push({
      name: t('multiRoleDashboard', 'Multi-Role Dashboard'),
      href: '#',
      children: [
        {
          name: t('multiRoleDashboard', 'Multi-Role Dashboard'),
          href: '/multi-role-dashboard',
        },
      ],
    });
  }

  // Restricted Roles (15-21) navigation items
  const restrictedRolesItems = [
    {
      name: t('myAttendance') || 'វត្តមានរបស់ខ្ញុំ',
      href: '/my-attendance',
    },
  ];

  // Add multi-role dashboard if restricted role has multiple roles
  if (user && userUtils.hasMultipleRoles(user)) {
    restrictedRolesItems.push({
      name: t('multiRoleDashboard', 'Multi-Role Dashboard'),
      href: '#',
      children: [
        {
          name: t('multiRoleDashboard', 'Multi-Role Dashboard'),
          href: '/multi-role-dashboard',
        },
      ],
    });
  }

  // Return appropriate items based on user role
  if (user.roleId === 1) {
    return role1Items;
  }

  // Director: roleId = 14
  if (user.roleId === 14) {
    // Check if director has teaching duties (assigned classes)
    if (isDirectorWithTeachingDuties(user)) {
      // Modify director items to remove /attendance from main Attendance dropdown
      // since it will be available under "My Class"
      const directorItemsModified = directorItems.map(item => {
        if (item.href === '#' && item.children && item.children.some(c => c.href === '/attendance')) {
          // This is the Attendance dropdown - remove /attendance child
          return {
            ...item,
            children: item.children.filter(child => child.href !== '/attendance')
          };
        }
        return item;
      });

      // Add teacher features to director navigation
      const directorWithTeacherItems = [
        ...directorItemsModified,
        {
          name: t('myTeachingClass', 'My Class'),
          href: '#',
          children: [
            {
              name: t('myStudents', 'My Students'),
              href: '/my-students',
            },
            {
              name: t('studentAttendance') || 'វត្តមានសិស្ស',
              href: '/attendance',
            },
          ],
        },
      ];
      return directorWithTeacherItems;
    }
    // Director without teaching duties - show standard director items
    return directorItems;
  }

  // Teacher: roleId = 8
  if (user.roleId === 8) {
    return teacherItems;
  }

  // Restricted Roles: roleId = 15-21 (Deputy Principal, School Secretary, etc.)
  // These roles can access /profile and /my-attendance with sidebar navigation
  if (user.roleId >= 15 && user.roleId <= 21) {
    // Check if restricted role has teaching duties (assigned classes)
    if (hasTeachingDuties(user)) {
      // Add teacher features to restricted role navigation
      const restrictedWithTeacherItems = [
        ...restrictedRolesItems,
        {
          name: t('myTeachingClass', 'My Class'),
          href: '#',
          children: [
            {
              name: t('myStudents', 'My Students'),
              href: '/my-students',
            },
            {
              name: t('studentAttendance') || 'វត្តមានសិស្ស',
              href: '/attendance',
            },
          ],
        },
      ];
      return restrictedWithTeacherItems;
    }
    return restrictedRolesItems;
  }

  return [];
};