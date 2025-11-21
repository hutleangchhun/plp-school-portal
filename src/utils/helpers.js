// General helper functions
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GRADE_LEVELS, getGradeLevels } from '../constants/grades';

/**
 * Combine CSS classes with proper handling of Tailwind conflicts
 * @param {...any} inputs - Class inputs
 * @returns {string} Combined class string
 */
export const cn = (...inputs) => {
  return twMerge(clsx(inputs));
};

/**
 * Generate a random ID
 * @param {number} length - Length of the ID
 * @returns {string} Random ID string
 */
export const generateId = (length = 8) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after sleep
 */
export const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

/**
 * Group array of objects by a key
 * @param {Array} array - Array to group
 * @param {string} key - Key to group by
 * @returns {object} Grouped object
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

/**
 * Sort array of objects by multiple keys
 * @param {Array} array - Array to sort
 * @param {Array} sortKeys - Array of objects with key and direction
 * @returns {Array} Sorted array
 */
export const sortBy = (array, sortKeys) => {
  return [...array].sort((a, b) => {
    for (const { key, direction = 'asc' } of sortKeys) {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
};

/**
 * Remove duplicates from array based on a key
 * @param {Array} array - Array to deduplicate
 * @param {string} key - Key to check for uniqueness
 * @returns {Array} Deduplicated array
 */
export const uniqueBy = (array, key) => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

/**
 * Flatten nested array
 * @param {Array} array - Array to flatten
 * @param {number} depth - Depth to flatten (default: Infinity)
 * @returns {Array} Flattened array
 */
export const flatten = (array, depth = Infinity) => {
  return depth > 0 ? array.reduce((acc, val) => 
    acc.concat(Array.isArray(val) ? flatten(val, depth - 1) : val), []) : array.slice();
};

/**
 * Convert object to query string
 * @param {object} obj - Object to convert
 * @returns {string} Query string
 */
export const objectToQueryString = (obj) => {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== '') {
      params.append(key, value);
    }
  }
  return params.toString();
};

/**
 * Parse query string to object
 * @param {string} queryString - Query string to parse
 * @returns {object} Parsed object
 */
export const queryStringToObject = (queryString) => {
  const params = new URLSearchParams(queryString);
  const result = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
};

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Convert camelCase to kebab-case
 * @param {string} str - String to convert
 * @returns {string} Kebab-case string
 */
export const camelToKebab = (str) => {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
};

/**
 * Convert kebab-case to camelCase
 * @param {string} str - String to convert
 * @returns {string} CamelCase string
 */
export const kebabToCamel = (str) => {
  return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
};

/**
 * Retry async function with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} retries - Number of retries
 * @param {number} delay - Initial delay in milliseconds
 * @returns {Promise} Promise that resolves with function result
 */
export const retryWithBackoff = async (fn, retries = 3, delay = 1000) => {
  try {
    return await fn();
  } catch (error) {
    if (retries > 0) {
      await sleep(delay);
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
};

/**
 * Create URL-safe slug from string
 * @param {string} str - String to convert to slug
 * @returns {string} URL-safe slug
 */
export const createSlug = (str) => {
  if (!str) return '';

  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
};

/**
 * Get grade-level dropdown options using shared grade constants
 * @param {function} t - Translation function
 * @param {boolean} includeAllOption - Whether to include an "all" option
 * @returns {Array<{value: string, label: string}>} Grade level options
 */
export const getGradeLevelOptions = (t, includeAllOption = true) => {
  const gradesWithTranslation = getGradeLevels(t);

  const gradeOptions = gradesWithTranslation.map(grade => ({
    value: grade.value,
    label: grade.translatedLabel || grade.label
  }));

  if (!includeAllOption) {
    return gradeOptions;
  }

  return [
    { value: 'all', label: t('allGradeLevels', 'All Grade Levels') },
    ...gradeOptions
  ];
};

/**
 * Format class identifier combining grade level and section
 * @param {string|number} gradeLevel - Grade level
 * @param {string} section - Class section (optional)
 * @returns {string} Formatted identifier like "1-A" or "1"
 */
export const formatClassIdentifier = (gradeLevel, section) => {
  if (!gradeLevel) return '';
  return section ? `${gradeLevel}-${section}` : gradeLevel;
};

/**
 * Check if student has a class assigned
 * Handles both nested class object and flattened API fields
 * @param {Object} student - Student data object
 * @returns {boolean} True if student has a class assigned
 */
export const hasStudentClass = (student) => {
  if (!student) return false;

  // Check nested class object
  if (student.class?.id || student.class?.classId || student.class?.name ||
      student.class?.gradeLevel || student.class_grade_level) {
    return true;
  }

  // Check flattened API fields
  if (student.class_id || student.class_name || student.class_grade_level) {
    return true;
  }

  return false;
};

/**
 * Get formatted class display string for a student's assigned class
 * Handles both nested class object and flattened API fields
 * @param {Object} student - Student data object
 * @returns {string|null} Formatted class identifier or null if no class
 */
export const getStudentClassDisplay = (student) => {
  if (!student) return null;

  // Get gradeLevel from nested or flattened fields
  const gradeLevel = student.class?.gradeLevel || student.gradeLevel || student.class_grade_level || student.grade_level;

  // Get section from nested or flattened fields
  const section = student.class?.section || student.section;

  if (!gradeLevel) {
    // Fallback to class name
    return student.class?.name || student.class_name || null;
  }

  return formatClassIdentifier(gradeLevel, section);
};

/**
 * Check if student has been assigned to a master class
 * Master class is the main class a student is enrolled in
 * @param {Object} student - Student data object
 * @returns {boolean} True if student has a master class
 */
export const hasMasterClass = (student) => {
  if (!student) return false;

  // Check for master class data
  if (student.masterclass_id || student.masterClassId ||
      student.masterclass_name || student.masterClassName) {
    return true;
  }

  return false;
};

/**
 * Get formatted master class display string for a student
 * Master class is the main class a student is enrolled in
 * @param {Object} student - Student data object
 * @returns {string|null} Master class name or identifier, or null if not assigned
 */
export const getMasterClassDisplay = (student) => {
  if (!student) return null;

  // Return master class name if available
  if (student.masterclass_name) {
    return student.masterclass_name;
  }

  if (student.masterClassName) {
    return student.masterClassName;
  }

  // If no master class assigned
  return null;
};