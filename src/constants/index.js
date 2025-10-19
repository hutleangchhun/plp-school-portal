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

// Months of the year
export const MONTHS = [
  { value: 0, label: 'January', khmer: 'មករា', short: 'Jan', khmerShort: 'មករា' },
  { value: 1, label: 'February', khmer: 'កុម្ភៈ', short: 'Feb', khmerShort: 'កុម្ភៈ' },
  { value: 2, label: 'March', khmer: 'មីនា', short: 'Mar', khmerShort: 'មីនា' },
  { value: 3, label: 'April', khmer: 'មេសា', short: 'Apr', khmerShort: 'មេសា' },
  { value: 4, label: 'May', khmer: 'ឧសភា', short: 'May', khmerShort: 'ឧសភា' },
  { value: 5, label: 'June', khmer: 'មិថុនា', short: 'Jun', khmerShort: 'មិថុនា' },
  { value: 6, label: 'July', khmer: 'កក្កដា', short: 'Jul', khmerShort: 'កក្កដា' },
  { value: 7, label: 'August', khmer: 'សីហា', short: 'Aug', khmerShort: 'សីហា' },
  { value: 8, label: 'September', khmer: 'កញ្ញា', short: 'Sep', khmerShort: 'កញ្ញា' },
  { value: 9, label: 'October', khmer: 'តុលា', short: 'Oct', khmerShort: 'តុលា' },
  { value: 10, label: 'November', khmer: 'វិច្ឆិកា', short: 'Nov', khmerShort: 'វិច្ឆិកា' },
  { value: 11, label: 'December', khmer: 'ធ្នូ', short: 'Dec', khmerShort: 'ធ្នូ' }
];

// Month names arrays for quick access
export const MONTH_NAMES_EN = MONTHS.map(m => m.label);
export const MONTH_NAMES_KH = MONTHS.map(m => m.khmer);
export const MONTH_NAMES_SHORT_EN = MONTHS.map(m => m.short);
export const MONTH_NAMES_SHORT_KH = MONTHS.map(m => m.khmerShort);

// Day names arrays for quick access
export const DAY_NAMES_EN = DAYS_OF_WEEK.map(d => d.label);
export const DAY_NAMES_KH = DAYS_OF_WEEK.map(d => d.khmer);
export const DAY_NAMES_SHORT_EN = DAYS_OF_WEEK.map(d => d.short);
export const DAY_NAMES_SHORT_KH = DAYS_OF_WEEK.map(d => d.khmerShort);