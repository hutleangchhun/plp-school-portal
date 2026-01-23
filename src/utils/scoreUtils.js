/**
 * Score Utilities
 * Helper functions for score conversion and formatting
 */

/**
 * Convert score from 0-100 scale to 0-10 scale
 * @param {number} score - The score value (either percentage 0-100 or already 0-10)
 * @returns {number} Converted score on 0-10 scale
 */
export const convertScaleTo10 = (score) => {
  const numScore = parseFloat(score || 0);
  if (numScore > 10) {
    return numScore / 10;
  }
  return numScore;
};

/**
 * Format score for display with fixed decimal places
 * @param {number} score - The score value
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted score string
 */
export const formatScore = (score, decimals = 1) => {
  const converted = convertScaleTo10(score);
  return converted.toFixed(decimals);
};

/**
 * Get score from exam object (handles both percentage and raw score)
 * @param {Object} exam - Exam object
 * @returns {number} Score value
 */
export const getExamScore = (exam) => {
  return parseFloat(exam?.percentage || exam?.score || 0);
};

/**
 * Get converted exam score (0-10 scale)
 * @param {Object} exam - Exam object
 * @returns {number} Converted score on 0-10 scale
 */
export const getConvertedExamScore = (exam) => {
  return convertScaleTo10(getExamScore(exam));
};

/**
 * Format exam score for display with conversion
 * @param {Object} exam - Exam object
 * @param {number} decimals - Number of decimal places (default: 1)
 * @returns {string} Formatted score (e.g., "6.8/10")
 */
export const formatExamScore = (exam, decimals = 1) => {
  const converted = getConvertedExamScore(exam);
  return `${converted.toFixed(decimals)}/10`;
};

/**
 * Clamp score value between 0 and 10
 * @param {number} value - The value to clamp
 * @returns {number} Clamped value
 */
export const clampScore = (value) => {
  return Math.max(0, Math.min(parseFloat(value || 0), 10));
};

/**
 * Parse and validate score input
 * Allows empty strings and decimal points for editing
 * @param {string} value - Input value
 * @returns {number|string} Parsed value or empty string
 */
export const parseScoreInput = (value) => {
  if (value === "" || value === ".") {
    return value;
  }

  const parsed = parseFloat(value);
  if (!isNaN(parsed)) {
    return clampScore(parsed);
  }

  return "";
};
