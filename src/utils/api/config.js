// API Configuration - Uses production API for all environments
const getApiBaseUrl = () => {
  // Use production API URL for both development and production
  return import.meta.env.VITE_API_URL || 'https://plp-api.moeys.gov.kh/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

// HTTPS Configuration
export const HTTPS_CONFIG = {
  // API URLs
  apiUrls: {
    production: 'https://plp-api.moeys.gov.kh/api/v1',
    development: 'https://plp-api.moeys.gov.kh/api/v1'
  },

  // Static asset URLs
  staticUrls: {
    production: 'https://plp-api.moeys.gov.kh',
    development: 'https://plp-api.moeys.gov.kh'
  },

  // Fallback behavior
  enableHttpFallback: false,

  // Timeout settings
  connectionTimeout: 10000,
  responseTimeout: 30000
};

const ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh-token',
    ME: '/auth/me',
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
  },
  SCHOOLS: {
    BASE: '/schools',
    SCHOOL_BY_ID: (schoolId) => `/schools${schoolId}`,
    SCHOOL_BY_PROVINCE: (provinceId) => `/schools/province/${provinceId}`,
    SCHOOL_BY_DISTRICT: (districtId) => `/schools/district/${districtId}`,
  },
  LOCATION: {
    BASE: '/locations/provinces',
    DISTRICTS: (provinceId) => `/locations/districts?province_id=${provinceId}`,
    COMMUNES: (provinceId, districtCode) => `/locations/communes?district_code=${districtCode}&province_id=${provinceId}`,
    VILLAGES: (provinceId, districtCode, communeCode) => `/locations/villages?commune_code=${communeCode}&district_code=${districtCode}&province_id=${provinceId}`,
  },
  STUDENTS: {
    BASE: '/students',
    REGISTER: '/students/register',
    MY_STUDENTS: '/students/my-students',
    AVAILABLE: '/students/available',
    ADD_TO_CLASS: '/students/add-to-class',
    BULK_REGISTER: '/students/bulk-register',
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
    BY_ID: (parentId) => `/parents/${parentId}`,
    CREATE: '/parents',
    UPDATE: (parentId) => `/parents/${parentId}`,
    DELETE: (parentId) => `/parents/${parentId}`,
    BY_SCHOOL: (schoolId) => `/parents/school/${schoolId}`,
    STUDENT_PARENT: '/parents/student-parent'
  },
  TEACHERS:{
    BASE: '/teachers',
    TEACHER_ID: (teacherId) => `/teachers/${teacherId}`,
    TEACHER_BY_SCHOOL: (schoolId) => `/teachers?school_id=${schoolId}`,
  },
  CLASSES: {
    BASE: '/classes',
    STUDENTS: (classId) => `/classes/${classId}/students`,
    SUBJECTS: (classId) => `/classes/${classId}/subjects`,
    SCHEDULE: (classId) => `/classes/${classId}/schedule`,
    MASTER: (schoolId) => `/master-class/${schoolId}/students`,
    MASTER_CLASSES: (schoolId) => `/master-class/${schoolId}/classes`,
    BY_USER: (userId) => `/classes/user/${userId}`,
    CLASS_BY_SCHOOL: (schoolId) => `/classes/school/${schoolId}`,
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
  // Use production static URL for all environments
  return import.meta.env.VITE_STATIC_BASE_URL || 'https://plp-api.moeys.gov.kh';
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
  // Use production API URL for all environments
  return import.meta.env.VITE_API_URL || 'https://plp-api.moeys.gov.kh/api/v1';
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