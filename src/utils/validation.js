// Validation utility functions
import { VALIDATION_PATTERNS } from '../constants';

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export const isValidEmail = (email) => {
  if (!email) return false;
  return VALIDATION_PATTERNS.EMAIL.test(email);
};

/**
 * Validate phone number
 * @param {string} phone - Phone number to validate
 * @returns {boolean} True if valid phone number
 */
export const isValidPhone = (phone) => {
  if (!phone) return false;
  return VALIDATION_PATTERNS.PHONE.test(phone);
};

/**
 * Validate username
 * @param {string} username - Username to validate
 * @returns {boolean} True if valid username
 */
export const isValidUsername = (username) => {
  if (!username) return false;
  return VALIDATION_PATTERNS.USERNAME.test(username);
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result with isValid and messages
 */
export const validatePassword = (password) => {
  const result = {
    isValid: false,
    messages: []
  };
  
  if (!password) {
    result.messages.push('Password is required');
    return result;
  }
  
  if (password.length < 6) {
    result.messages.push('Password must be at least 6 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    result.messages.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    result.messages.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    result.messages.push('Password must contain at least one number');
  }
  
  result.isValid = result.messages.length === 0;
  return result;
};

/**
 * Validate required fields in an object
 * @param {object} data - Data object to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {object} Validation result with isValid and errors
 */
export const validateRequiredFields = (data, requiredFields) => {
  const errors = {};
  
  requiredFields.forEach(field => {
    if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
      errors[field] = `${field} is required`;
    }
  });
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

/**
 * Validate file upload
 * @param {File} file - File to validate
 * @param {object} options - Validation options
 * @returns {object} Validation result
 */
export const validateFile = (file, options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
    maxSize = 5 * 1024 * 1024, // 5MB
    maxFiles = 1
  } = options;
  
  const result = {
    isValid: false,
    messages: []
  };
  
  if (!file) {
    result.messages.push('File is required');
    return result;
  }
  
  if (!allowedTypes.includes(file.type)) {
    result.messages.push(`File type ${file.type} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
  }
  
  if (file.size > maxSize) {
    result.messages.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024)}MB`);
  }
  
  result.isValid = result.messages.length === 0;
  return result;
};

/**
 * Validate date range
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {object} Validation result
 */
export const validateDateRange = (startDate, endDate) => {
  const result = {
    isValid: false,
    messages: []
  };
  
  if (!startDate || !endDate) {
    result.messages.push('Both start and end dates are required');
    return result;
  }
  
  if (startDate >= endDate) {
    result.messages.push('Start date must be before end date');
  }
  
  result.isValid = result.messages.length === 0;
  return result;
};

/**
 * Validate numeric range
 * @param {number} value - Value to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {boolean} True if value is within range
 */
export const isInRange = (value, min, max) => {
  if (value === null || value === undefined) return false;
  return value >= min && value <= max;
};

/**
 * Validate array length
 * @param {Array} array - Array to validate
 * @param {number} minLength - Minimum length
 * @param {number} maxLength - Maximum length
 * @returns {boolean} True if array length is valid
 */
export const isValidArrayLength = (array, minLength = 0, maxLength = Infinity) => {
  if (!Array.isArray(array)) return false;
  return array.length >= minLength && array.length <= maxLength;
};

/**
 * Sanitize input string (remove potentially harmful characters)
 * @param {string} input - Input string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeInput = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"]/g, '') // Remove quotes
    .trim();
};