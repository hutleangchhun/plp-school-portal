// Utility functions for formatting data
import { format, parseISO } from 'date-fns';
import { MONTH_NAMES_KH, DAY_NAMES_KH } from '@/constants';

/**
 * Format a date using the specified format
 * @param {Date|string} date - Date to format
 * @param {string} formatStr - Format string (default: 'MMM dd, yyyy')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, formatStr = 'MMM dd, yyyy') => {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.warn('Date formatting error:', error);
    return date.toString();
  }
};

/**
 * Format a date in Khmer
 * @param {Date|string} date - Date to format
 * @param {string} formatType - Format type: 'full', 'short', 'monthYear', 'dateOnly'
 * @returns {string} Formatted date string in Khmer
 */
export const formatDateKhmer = (date, formatType = 'full') => {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    const day = dateObj.getDate();
    const month = dateObj.getMonth();
    const year = dateObj.getFullYear();
    const dayOfWeek = dateObj.getDay();

    switch (formatType) {
      case 'full':
        // Format: ថ្ងៃច័ន្ទ ទី១៥ ខែមករា ឆ្នាំ២០២៥
        return `${DAY_NAMES_KH[dayOfWeek === 0 ? 6 : dayOfWeek - 1]} ទី${day} ខែ${MONTH_NAMES_KH[month]} ឆ្នាំ${year}`;
      case 'short':
        // Format: ១៥ មករា ២០២៥
        return `${day} ${MONTH_NAMES_KH[month]} ${year}`;
      case 'monthYear':
        // Format: មករា ២០២៥
        return `${MONTH_NAMES_KH[month]} ${year}`;
      case 'dateOnly':
        // Format: ១៥/០១/២០២៥
        return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
      case 'dayMonth':
        // Format: ១៥ មករា
        return `${day} ${MONTH_NAMES_KH[month]}`;
      default:
        return `${day} ${MONTH_NAMES_KH[month]} ${year}`;
    }
  } catch (error) {
    console.warn('Khmer date formatting error:', error);
    return date.toString();
  }
};

/**
 * Format date for display based on locale
 * @param {Date|string} date - Date to format
 * @param {string} locale - Locale ('km' or 'en')
 * @param {string} formatType - Format type
 * @returns {string} Formatted date string
 */
export const formatDateLocale = (date, locale = 'km', formatType = 'short') => {
  if (!date) return '';

  if (locale === 'km') {
    return formatDateKhmer(date, formatType);
  }

  // English formatting
  const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
  const options = {
    full: { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
    short: { year: 'numeric', month: 'short', day: 'numeric' },
    monthYear: { year: 'numeric', month: 'long' },
    dateOnly: { year: 'numeric', month: '2-digit', day: '2-digit' },
    dayMonth: { month: 'short', day: 'numeric' }
  };

  return dateObj.toLocaleDateString('en-US', options[formatType] || options.short);
};

/**
 * Format a number with comma separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (num) => {
  if (num === null || num === undefined) return '';
  return new Intl.NumberFormat().format(num);
};

/**
 * Format a percentage
 * @param {number} value - Decimal value (0.85 = 85%)
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage string
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '';
  return `${(value * 100).toFixed(decimals)}%`;
};

/**
 * Truncate text to specified length with ellipsis
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Format file size in human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size
 */
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format phone number
 * @param {string} phone - Phone number string
 * @returns {string} Formatted phone number
 */
export const formatPhoneNumber = (phone) => {
  if (!phone) return '';
  
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX for 10 digits
  if (cleaned.length === 10) {
    return `(${cleaned.substring(0, 3)}) ${cleaned.substring(3, 6)}-${cleaned.substring(6)}`;
  }
  
  // Return original if not 10 digits
  return phone;
};

/**
 * Format name (capitalize first letter of each word)
 * @param {string} name - Name to format
 * @returns {string} Formatted name
 */
export const formatName = (name) => {
  if (!name) return '';
  
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @param {string} currency - Currency code (default: 'USD')
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD') => {
  if (amount === null || amount === undefined) return '';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Format array of items into readable list
 * @param {Array} items - Array of items
 * @param {number} maxDisplay - Maximum items to display before showing "and X more"
 * @returns {string} Formatted list string
 */
export const formatList = (items, maxDisplay = 3) => {
  if (!items || items.length === 0) return '';
  
  if (items.length <= maxDisplay) {
    return items.join(', ');
  }
  
  const displayed = items.slice(0, maxDisplay);
  const remaining = items.length - maxDisplay;
  
  return `${displayed.join(', ')} and ${remaining} more`;
};