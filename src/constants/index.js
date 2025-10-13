// Main constants export file
export * from './grades.js';
export * from './achievements.js';
export * from './ui.js';
export * from './relationships.js';

// Application-wide constants
export const APP_CONFIG = {
  name: 'Teacher Portal',
  version: '1.0.0',
  defaultLanguage: 'km',
  supportedLanguages: ['km', 'en'],
  itemsPerPage: 10,
  maxRetries: 3,
  requestTimeout: 30000 // 30 seconds
};

// API endpoints base paths
export const API_ENDPOINTS = {
  AUTH: '/auth',
  USERS: '/users',
  STUDENTS: '/students',
  CLASSES: '/classes',
  SCHOOLS: '/schools',
  ATTENDANCE: '/attendance',
  ACHIEVEMENTS: '/achievements',
  REPORTS: '/reports'
};

// User roles
export const USER_ROLES = {
  TEACHER: 'teacher',
  ADMIN: 'admin',
  PRINCIPAL: 'principal'
};

// Status options
export const STATUS_OPTIONS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  SUSPENDED: 'suspended'
};

// Gender options
export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male', khmer: 'ប្រុស' },
  { value: 'female', label: 'Female', khmer: 'ស្រី' }
];

// Days of the week
export const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday', khmer: 'ថ្ងៃច័ន្ទ', short: 'Mon', khmerShort: 'ច' },
  { value: 'tuesday', label: 'Tuesday', khmer: 'ថ្ងៃអង្គារ', short: 'Tue', khmerShort: 'អ' },
  { value: 'wednesday', label: 'Wednesday', khmer: 'ថ្ងៃពុធ', short: 'Wed', khmerShort: 'ព' },
  { value: 'thursday', label: 'Thursday', khmer: 'ថ្ងៃព្រហស្បតិ៍', short: 'Thu', khmerShort: 'ព្រ' },
  { value: 'friday', label: 'Friday', khmer: 'ថ្ងៃសុក្រ', short: 'Fri', khmerShort: 'សុ' },
  { value: 'saturday', label: 'Saturday', khmer: 'ថ្ងៃសៅរ៍', short: 'Sat', khmerShort: 'ស' },
  { value: 'sunday', label: 'Sunday', khmer: 'ថ្ងៃអាទិត្យ', short: 'Sun', khmerShort: 'អា' }
];