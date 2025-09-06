// API Configuration - Force HTTP for API server
const getApiBaseUrl = () => {
  // Environment variable takes absolute precedence
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Force HTTP for API server (even when app is served over HTTPS)
  return 'http://157.10.73.52:8085/api/v1';
};

const API_BASE_URL = getApiBaseUrl();

// HTTPS Configuration
export const HTTPS_CONFIG = {
  // API URLs with protocol preferences
  apiUrls: {
    https: 'https://157.10.73.52:8085/api/v1',
    http: 'http://157.10.73.52:8085/api/v1'
  },
  
  // Static asset URLs
  staticUrls: {
    https: 'https://157.10.73.52:8085',
    http: 'http://157.10.73.52:8085'
  },
  
  // Fallback behavior
  enableHttpFallback: true,
  
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
    CHANGE_PASSWORD: '/users/change-password',
    RESET_PASSWORD: '/users/reset-password',
    VERIFY_EMAIL: '/users/verify-email',
    RESEND_VERIFICATION: '/users/resend-verification',
  },
  STUDENTS: {
    BASE: '/students',
    MY_STUDENTS: '/students/my-students',
    AVAILABLE: '/students/available',
    ADD_TO_CLASS: '/students/add-to-class',
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
  CLASSES: {
    BASE: '/classes',
    MY_CLASS: '/classes/my-class',
    STUDENTS: (classId) => `/classes/${classId}/students`,
    SUBJECTS: (classId) => `/classes/${classId}/subjects`,
    SCHEDULE: (classId) => `/classes/${classId}/schedule`,
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
    MARK: '/attendance/mark',
    BATCH_UPDATE: '/attendance/batch-update',
    REPORT: {
      MONTHLY: (year, month) => `/attendance/report/monthly/${year}/${month}`,
      STUDENT: (studentId, from, to) => `/attendance/report/student/${studentId}?from=${from}&to=${to}`,
      CLASS: (classId, date) => `/attendance/report/class/${classId}?date=${date}`,
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

// Function to get static asset base URL - Force HTTP
export const getStaticAssetBaseUrl = () => {
  // Check for environment variable first
  if (import.meta.env.VITE_STATIC_BASE_URL) {
    return import.meta.env.VITE_STATIC_BASE_URL;
  }
  
  // Force HTTP for static assets (same as API server)
  return 'http://157.10.73.52:8085';
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

// Function to get the API URL (always server)
export const getBestApiUrl = async () => {
  // Always return server API URL, override with environment variable if set
  return import.meta.env.VITE_API_URL || 'http://157.10.73.52:8085/api/v1';
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