// API Configuration - Environment-aware URL selection
const getApiBaseUrl = () => {
  // 1. Development (Vite)
  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:8080/api/v1';
  }

  // 2. Production (browser)
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;

    // Physical server or official domain - use proxy /api
    if (hostname === 'plp-sms.moeys.gov.kh' || hostname === '192.168.155.105' || hostname === '192.168.155.115') {
      return '/api';
    }

    // Localhost in production build (e.g., served by a local server)
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8080/api/v1';
    }
  }

  // 3. Fallback - use /api (relative URL for proxy)
  return '/api';
};

export default getApiBaseUrl;



const API_BASE_URL = getApiBaseUrl();

// HTTPS Configuration - Environment-aware
export const HTTPS_CONFIG = {
  // API URLs
  apiUrls: {
    production: 'https://plp-api.moeys.gov.kh/api/v1',
    physical: 'http://192.168.155.105/api/v1',
    development: 'http://localhost:8080/api/v1'
  },

  // Static asset URLs
  staticUrls: {
    production: 'https://plp-api.moeys.gov.kh',
    physical: 'http://192.168.155.105',
    development: 'http://localhost:8080'
  },

  // Fallback behavior - disabled for development, enabled for production
  enableHttpFallback: import.meta.env.MODE === 'production',

  // Timeout settings
  connectionTimeout: 10000,
  responseTimeout: 30000
};

const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    SELECT_ACCOUNT: '/auth/select-account',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh-token',
    ME: '/auth/me',
    RESET_PASSWORD: '/auth/reset-password',
    SECONDARY_ROLES: '/auth/secondary-roles',
  },
  USERS: {
    BASE: '/users',
    FILTER: '/users/filter',
    PROFILE: (userId) => `/users/${userId}/profile`,
    MY_ACCOUNT: '/users/my-account',
    MY_PROFILE_PICTURE: '/users/my-account/profile-picture',
    UPLOAD_PROFILE: (userId) => `/users/${userId}/upload-profile`,
    CHANGE_PASSWORD: '/users/change-password',
    RESET_PASSWORD: '/users/reset-password',
    VERIFY_EMAIL: '/users/verify-email',
    RESEND_VERIFICATION: '/users/resend-verification',
    UPDATE_USER: (userId) => `/users/${userId}`,
    ACTIVE_STATUS: (userId) => `/users/${userId}/active-status`,
    GENERATE_QR_CODE: '/users/generate-qr-code',
    GENERATE_USERNAME: '/users/generate-username',
    VALIDATE_EMAIL: (email) => `/users/validate/email?email=${encodeURIComponent(email)}`,
    PUBLIC_SCHOOL_USERS: (schoolId) => `/users/public/school/${schoolId}`,
    SIMPLE: '/users/simple',
    CREATE_USER: '/users',
    BULK_DELETE: '/users/bulk/delete',
  },
  SCHOOLS: {
    BASE: '/schools',
    SCHOOL_BY_ID: (schoolId) => `/schools/${schoolId}`,
    SCHOOL_BY_PROVINCE: (provinceId) => `/schools/province/${provinceId}`,
    SCHOOL_BY_DISTRICT: (districtId) => `/schools/district/${districtId}`,
    SCHOOL_BY_COMMUNE: (communeCode) => `/schools/commune/${communeCode}`,
    PROJECT_TYPES: '/school-project-types',
  },
  LOCATION: {
    BASE: '/locations/provinces',
    DISTRICTS: (provinceId) => `/locations/districts?province_id=${provinceId}`,
    COMMUNES: (provinceId, districtCode) => `/locations/communes?district_code=${districtCode}&province_id=${provinceId}`,
    VILLAGES: (provinceId, districtCode, communeCode) => `/locations/villages?commune_code=${communeCode}&district_code=${districtCode}&province_id=${provinceId}`,
    ZONES: '/zones',
  },
  STUDENTS: {
    BASE: '/students',
    REGISTER: '/students/register',
    MY_STUDENTS: '/students/my-students',
    AVAILABLE: '/students/available',
    ADD_TO_CLASS: '/students/add-to-class',
    BULK_REGISTER: '/students/bulk-register',
    BULK_REGISTER_STATUS: (batchId) => `/students/bulk-register/status/${batchId}`,
    BULK_REGISTER_CLEAR: (batchId) => `/students/bulk-register/clear/${batchId}`,
    REMOVE_FROM_CLASS: (studentId) => `/students/${studentId}/remove-from-class`,
    ATTENDANCE: {
      BASE: (studentId) => `/students/${studentId}/attendance`,
      BY_DATE: (studentId, date) => `/students/${studentId}/attendance/${date}`,
    },
    GRADES: {
      BASE: (studentId) => `/students/${studentId}/grades`,
      SUBJECT: (studentId, subjectId) => `/students/${studentId}/grades/${subjectId}`,
    },
  },
  PARENTS: {
    BASE: '/parents',
    BY_USER: (userId) => `/parents/user/${userId}`,
    BY_STUDENT: (studentId) => `/parents/student/${studentId}`,
    BY_ID: (parentId) => `/parents/${parentId}`,
    CREATE: '/parents',
    UPDATE: (parentId) => `/parents/${parentId}`,
    DELETE: (parentId) => `/parents/${parentId}`,
    BY_SCHOOL: (schoolId) => `/parents/school/${schoolId}`,
    STUDENT_PARENT: '/parents/student-parent'
  },
  TEACHERS: {
    BASE: '/teachers',
    GET_BY_ID: (teacherId) => `/teachers/${teacherId}`,
    TEACHER_ID: (teacherId) => `/teachers/${teacherId}`,
    UPDATE: (teacherId) => `/teachers/${teacherId}`,
    TEACHER_BY_SCHOOL: (schoolId) => `/teachers?school_id=${schoolId}`,
    TRANSFER_SCHOOL: (teacherId) => `/teachers/${teacherId}/school`,
    CHECK_NUMBER: (teacherNumber) => `/teachers/check-number/${teacherNumber}`,
    CLASSES: (teacherId) => `/classes/teacher/${teacherId}`,
  },
  CLASSES: {
    BASE: '/classes',
    STUDENTS: (classId) => `/classes/${classId}/students`,
    SUBJECTS: (classId) => `/classes/${classId}/subjects`,
    SCHEDULE: (classId) => `/classes/${classId}/schedule`,
    MASTER: (schoolId) => `/master-class/${schoolId}/students`,
    MASTER_CLASSES: (schoolId) => `/master-class/${schoolId}/masterclasses`,
    BY_USER: (userId) => `/classes/user/${userId}`,
    CLASS_BY_SCHOOL: (schoolId) => `/classes/school/${schoolId}`,
    TRANSFER_STUDENT_MASTERCLASS: '/master-class/transfer-student-masterclass',
  },
  SUBJECTS: {
    BASE: '/subjects',
    TEACHER_SUBJECTS: '/subjects/my-subjects',
    STUDENTS: (subjectId) => `/subjects/${subjectId}/students`,
    GRADES: (subjectId) => `/subjects/${subjectId}/grades`,
    ATTENDANCE: (subjectId) => `/subjects/${subjectId}/attendance`,
  },
  ATTENDANCE: {
    BASE: '/attendance',
    DASHBOARD: {
      BASE: '/attendance-dashboard',
      PRIMARY: '/attendance-dashboard/primary',
      GENDER_COMPARISON: '/attendance-dashboard/gender-comparison',
      GRADE_BREAKDOWN: '/attendance-dashboard/grade-breakdown',
      CLASS_BREAKDOWN: '/attendance-dashboard/class-breakdown',
      SCHOOL_RANKINGS: '/attendance-dashboard/school-rankings',
      DAILY_TRENDS: '/attendance-dashboard/daily-trends',
      MONTHLY_TRENDS: '/attendance-dashboard/monthly-trends',
      APPROVAL_STATUS: '/attendance-dashboard/approval-status',
      TEACHER_PRIMARY: '/attendance-dashboard/teacher/primary',
      TEACHER_BY_ROLE: '/attendance-dashboard/teacher/by-role',
      TEACHER_MONTHLY_TRENDS: '/attendance-dashboard/teacher/monthly-trends',
    },
  },
  GRADES: {
    BASE: '/grades',
    SUBMIT: '/grades/submit',
    BATCH_UPDATE: '/grades/batch-update',
    REPORT: {
      STUDENT: (studentId, term) => `/grades/report/student/${studentId}?term=${term}`,
      CLASS: (classId, subjectId, term) =>
        `/grades/report/class/${classId}/${subjectId}?term=${term}`,
    },
  },
  STUDENT_MONTHLY_EXAM: {
    BASE: '/student-monthly-exam',
    BULK: '/student-monthly-exam/bulk',
  },
  UPLOAD: {
    SINGLE: '/upload/single',
    MULTIPLE: '/upload/multiple',
  },
  NOTIFICATIONS: {
    BASE: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    MARK_AS_READ: (notificationId) => `/notifications/${notificationId}/mark-as-read`,
    MARK_ALL_READ: '/notifications/mark-all-read',
  },
  SETTINGS: {
    PROFILE: '/settings/profile',
    ACCOUNT: '/settings/account',
    NOTIFICATIONS: '/settings/notifications',
    PREFERENCES: '/settings/preferences',
  },
  EXAM_HISTORY: {
    BASE: '/exam-history',
    BY_USER: (userId) => `/exam-history/user/${userId}`,
    BY_CLASS: (classId) => `/exam-history/class/${classId}`,
    DETAILS: (examHistoryId) => `/exam-history/${examHistoryId}`,
  },
  BMI: {
    BASE: '/bmi',
    BY_USER: (userId) => `/users/${userId}/bmi-history`,
    ALL_USERS_REPORT: '/bmi-report/all-users',
    DASHBOARD: (level) => `/bmi-dashboard/${level}`,
  },
  DASHBOARD: {
    BASE: '/dashboard',
    SCHOOL_BMI: (schoolId) => `/dashboard/school/${schoolId}/bmi`,
    USER_REGISTRATION_STATS: '/dashboard/users/registration-stats',
    STUDENT_EXTRA_LEARNING_TOOLS: '/dashboard/students/extra-learning-tools/stats',
    STUDENT_POOR_CARD_GRADE: '/dashboard/students/poor-card-grade',
    STUDENT_KINDERGARTEN: '/dashboard/students/kindergarten',
  },
  USER_ACTIVITY_LOGS: {
    BASE: '/user-activity-logs',
  },
  BOOKS: {
    BASE: '/books',
    BY_GRADE_LEVEL: (gradeLevel, page = 1, limit = 10) => `/books?gradeLevel=${gradeLevel}&page=${page}&limit=${limit}`,
    BY_FILTERS: (bookCategoryId = null, gradeLevel = null, subjectId = null, page = 1, limit = 10) => {
      const params = new URLSearchParams();
      if (bookCategoryId) params.append('bookCategoryId', bookCategoryId);
      if (gradeLevel) params.append('gradeLevel', gradeLevel);
      if (subjectId) params.append('subjectId', subjectId);
      params.append('page', page);
      params.append('limit', limit);
      return `/books?${params.toString()}`;
    },
  },
  SALARY_TYPES: {
    BASE: '/salary-types',
    BY_EMPLOYMENT_TYPE: (employmentType) => `/salary-types/employment-type/${encodeURIComponent(employmentType)}`,
  },
  RATE_LIMIT: {
    BASE: '/rate-limit',
    ALL_USERS: '/rate-limit/all-users',
    CONCURRENT_STATS: '/rate-limit/concurrent/stats',
    HOURLY_USAGE: '/api/usage/hourly',
  },
};

// HTTP Status codes for consistent error handling
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
};

// Function to get static asset base URL
export const getStaticAssetBaseUrl = () => {
  if (import.meta.env.MODE === 'development') {
    return 'http://localhost:8080';
  }

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    // In production, we proxy /uploads/ through the same domain to avoid Mixed Content errors
    if (hostname === 'plp-sms.moeys.gov.kh' || hostname === '192.168.155.105' || hostname === '192.168.155.115') {
      return ''; // Empty string means use current origin (e.g., /uploads/...)
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:8080';
    }
  }

  // Fallback to production API host for static assets
  return 'https://plp-api.moeys.gov.kh';
};

// Function to get book cover URL from filename
export const getBookCoverUrl = (coverBookFilename) => {
  if (!coverBookFilename) {
    return null;
  }
  return `${getStaticAssetBaseUrl()}/uploads/books/${coverBookFilename}`;
};

// Function to test API availability
export const testApiConnection = async (baseUrl) => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    // Try to make a simple request to test connectivity
    // Try multiple endpoints to increase chance of success - use public endpoints that don't require auth
    const testEndpoints = ['', '/health', '/status', '/docs'];

    for (const endpoint of testEndpoints) {
      try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json'
          }
        });

        // If we get any response (even 404 or 401), the server is reachable
        // Only server errors (5xx) indicate server problems
        if (response.status < 500) {
          clearTimeout(timeoutId);
          return true;
        }
      } catch {
        // Continue to next endpoint
        continue;
      }
    }

    clearTimeout(timeoutId);
    return false;
  } catch {
    return false;
  }
};

// Function to get the API URL
export const getBestApiUrl = async () => {
  // Return the environment-aware API URL
  return getApiBaseUrl();
};

// Main API configuration object
export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Export the configuration
export {
  API_BASE_URL,
  ENDPOINTS,
};

// This file contains all the API endpoints used in the application.
// The structure follows RESTful conventions and is organized by resource type.
// Each endpoint is defined as a constant for easy reference and maintenance.