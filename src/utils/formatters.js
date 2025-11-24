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

/**
 * Get calendar layout for a month with proper day-of-week alignment
 * @param {Date|number} date - Date object or year, or null for current month
 * @param {number} month - Month (0-11), optional if date is provided
 * @returns {Object} Calendar data with week array, starting day, and days in month
 */
export const getMonthCalendarLayout = (date = null, month = null) => {
  let year, monthNum;

  if (date instanceof Date) {
    year = date.getFullYear();
    monthNum = date.getMonth();
  } else if (typeof date === 'number' && month !== null) {
    year = date;
    monthNum = month;
  } else {
    const now = new Date();
    year = now.getFullYear();
    monthNum = now.getMonth();
  }

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const firstDay = new Date(year, monthNum, 1).getDay();
  // Convert to Monday-based week (0 = Monday, 6 = Sunday)
  const firstDayMondayBased = firstDay === 0 ? 6 : firstDay - 1;

  // Get number of days in month
  const daysInMonth = new Date(year, monthNum + 1, 0).getDate();

  // Create array with empty slots and day numbers
  const calendarDays = [];

  // Add empty slots for days before month starts
  for (let i = 0; i < firstDayMondayBased; i++) {
    calendarDays.push(null);
  }

  // Add day numbers
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  return {
    year,
    month: monthNum,
    daysInMonth,
    firstDay: firstDayMondayBased,
    calendarDays,
    totalCells: calendarDays.length
  };
};

/**
 * Get shorthand Khmer day name for a day of week
 * @param {number} dayOfWeek - Day of week (0 = Monday, 6 = Sunday)
 * @returns {string} Shorthand Khmer day name
 */
export const getKhmerDayShorthand = (dayOfWeek) => {
  // Shorthand Khmer day names
  const shortDays = {
    0: 'ច', // ច័ន្ទ (Monday)
    1: 'អ', // អង្គារ (Tuesday)
    2: 'ព', // ពុធ (Wednesday)
    3: 'ព្រ', // ព្រហស្បត៍ (Thursday)
    4: 'សុ', // សុក្រ (Friday)
    5: 'ស', // សៅរ៍ (Saturday)
    6: 'អា' // អាទិត្យ (Sunday)
  };

  return shortDays[dayOfWeek] || '';
};

/**
 * Get Khmer day name with shorthand and day number
 * @param {number} day - Day of month (1-31)
 * @param {number} dayOfWeek - Day of week (0 = Monday, 6 = Sunday)
 * @returns {string} Formatted as "១៥អ" (15 Tuesday)
 */
export const getKhmerDayWithShorthand = (day, dayOfWeek) => {
  if (!day) return '';
  const shorthand = getKhmerDayShorthand(dayOfWeek);
  return `${day}${shorthand}`;
};

/**
 * Check if day is weekend (Saturday or Sunday)
 * @param {number} dayOfWeek - Day of week (0 = Monday, 6 = Sunday)
 * @returns {boolean} True if Saturday (5) or Sunday (6)
 */
export const isWeekend = (dayOfWeek) => {
  return dayOfWeek === 5 || dayOfWeek === 6; // Saturday or Sunday
};

/**
 * Convert gender to Khmer
 * @param {string} gender - Gender in English (MALE, FEMALE, or other format)
 * @returns {string} Gender in Khmer (ប្រុស, ស្រី, or original value if not recognized)
 */
export const genderToKhmer = (gender) => {
  if (!gender) return 'N/A';

  const genderMap = {
    'MALE': 'ប្រុស',
    'male': 'ប្រុស',
    'M': 'ប្រុស',
    'FEMALE': 'ស្រី',
    'female': 'ស្រី',
    'F': 'ស្រី',
    'OTHER': 'ផ្សេងទៀត',
    'other': 'ផ្សេងទៀត'
  };

  return genderMap[gender] || gender;
};

/**
 * Convert BMI status to Khmer
 * @param {string} status - BMI status in English (underweight, normal, overweight, obese)
 * @returns {string} BMI status in Khmer
 */
export const bmiStatusToKhmer = (status) => {
  if (!status) return 'មិនមាន';

  const statusMap = {
    'underweight': 'មិនពេញលេញ',
    'normal': 'ធម្មតា',
    'overweight': 'ធ្វើឱ្យលើស',
    'obese': 'មានលើស'
  };

  return statusMap[status.toLowerCase()] || status;
};

/**
 * Calculate experience between a start date and now, as years/months text.
 * Example outputs: "3 years", "2 years 4 months", "5 months", "Less than 1 month".
 * @param {string|Date|null} startDate - Hire date or other start date
 * @param {Object} labels - Optional labels for i18n: { years, months, lessThanOneMonth }
 * @returns {string} Human readable experience string, or empty string if invalid
 */
export const calculateExperience = (startDate, labels = {}) => {
  if (!startDate) return '';

  const {
    years: yearsLabel = 'years',
    months: monthsLabel = 'months',
    lessThanOneMonth: lessThanOneMonthLabel = 'Less than 1 month'
  } = labels;

  try {
    const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
    if (!(start instanceof Date) || Number.isNaN(start.getTime())) {
      return '';
    }

    const now = new Date();
    const diffMs = now.getTime() - start.getTime();
    const diffYears = diffMs / (1000 * 60 * 60 * 24 * 365.25);

    if (Number.isNaN(diffYears) || diffYears < 0) {
      return '';
    }

    const years = Math.floor(diffYears);
    const months = Math.floor((diffYears - years) * 12);

    if (years > 0 && months > 0) {
      return `${years} ${yearsLabel} ${months} ${monthsLabel}`;
    }
    if (years > 0) {
      return `${years} ${yearsLabel}`;
    }
    if (months > 0) {
      return `${months} ${monthsLabel}`;
    }

    return lessThanOneMonthLabel;
  } catch (e) {
    console.warn('Error calculating experience:', e, startDate);
    return '';
  }
};