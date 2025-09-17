/**
 * Academic Year Utilities
 * Handles automatic generation of academic years for educational applications
 */

/**
 * Get the current academic year based on the current date
 * Academic year typically runs from August to July of the following year
 * @returns {string} Current academic year in format "YYYY-YYYY"
 */
export const getCurrentAcademicYear = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth(); // 0-based (0 = January, 11 = December)
  
  if (currentMonth >= 7) { // August onwards - new academic year starts
    return `${currentYear}-${currentYear + 1}`;
  } else { // January to July - we're in the second half of the previous academic year
    return `${currentYear - 1}-${currentYear}`;
  }
};

/**
 * Generate a list of academic years
 * @param {number} pastYears - Number of past academic years to include (default: 2)
 * @param {number} futureYears - Number of future academic years to include (default: 2)
 * @returns {string[]} Array of academic years in format "YYYY-YYYY"
 */
export const generateAcademicYears = (pastYears = 2, futureYears = 2) => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();
  
  // Determine the current academic year start
  let startYear;
  if (currentMonth >= 7) { // August onwards - new academic year starts
    startYear = currentYear;
  } else { // January to July - we're in the second half of the previous academic year
    startYear = currentYear - 1;
  }
  
  const years = [];
  
  // Generate academic years from past to future
  for (let i = -pastYears; i <= futureYears; i++) {
    const year = startYear + i;
    years.push(`${year}-${year + 1}`);
  }
  
  return years;
};

/**
 * Check if a given academic year is the current academic year
 * @param {string} academicYear - Academic year in format "YYYY-YYYY"
 * @returns {boolean} True if it's the current academic year
 */
export const isCurrentAcademicYear = (academicYear) => {
  return academicYear === getCurrentAcademicYear();
};

/**
 * Parse academic year string and get start and end years
 * @param {string} academicYear - Academic year in format "YYYY-YYYY"
 * @returns {object} Object with startYear and endYear as numbers
 */
export const parseAcademicYear = (academicYear) => {
  const [startYear, endYear] = academicYear.split('-').map(year => parseInt(year, 10));
  return { startYear, endYear };
};

/**
 * Get academic year for a specific date
 * @param {Date} date - The date to get academic year for
 * @returns {string} Academic year in format "YYYY-YYYY"
 */
export const getAcademicYearForDate = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  if (month >= 7) { // August onwards
    return `${year}-${year + 1}`;
  } else { // January to July
    return `${year - 1}-${year}`;
  }
};

/**
 * Sort academic years in chronological order
 * @param {string[]} academicYears - Array of academic years
 * @param {boolean} descending - Sort in descending order (default: false)
 * @returns {string[]} Sorted array of academic years
 */
export const sortAcademicYears = (academicYears, descending = false) => {
  return academicYears.sort((a, b) => {
    const yearA = parseInt(a.split('-')[0], 10);
    const yearB = parseInt(b.split('-')[0], 10);
    return descending ? yearB - yearA : yearA - yearB;
  });
};