/**
 * Converts height input to centimeters
 * If input is a decimal like 1.7, converts to 170 cm
 * If input is already large (>= 10), assumes it's already in cm
 * @param {string|number} value - The height value
 * @returns {string} - The converted height value as string
 */
export const convertHeightToCm = (value) => {
  if (!value) return '';

  const numValue = parseFloat(String(value).trim());
  if (Number.isNaN(numValue)) return '';

  // If value is less than 10, assume it's in meters (like 1.7) and convert to cm
  // Otherwise, assume it's already in cm
  if (numValue > 0 && numValue < 10) {
    return String((numValue * 100).toFixed(1));
  }

  return String(numValue);
};

/**
 * Converts weight input to kilograms
 * If input is a decimal like 0.45, converts to 45 kg
 * If input is already large (>= 10), assumes it's already in kg
 * @param {string|number} value - The weight value
 * @returns {string} - The converted weight value as string
 */
export const convertWeightToKg = (value) => {
  if (!value) return '';

  const numValue = parseFloat(String(value).trim());
  if (Number.isNaN(numValue)) return '';

  // If value is less than 10, assume it's in hundreds of kg (like 0.45 for 45 kg) and convert
  // Otherwise, assume it's already in kg
  if (numValue > 0 && numValue < 10) {
    return String((numValue * 100).toFixed(2));
  }

  return String(numValue);
};

/**
 * Converts BMI based on weight (kg) and height (cm)
 * @param {string|number} weight - Weight in kg
 * @param {string|number} height - Height in cm
 * @returns {string} - The calculated BMI value
 */
export const calculateBMI = (weight, height) => {
  if (!weight || !height) return '';

  const w = parseFloat(String(weight).trim());
  const h = parseFloat(String(height).trim());

  if (Number.isNaN(w) || Number.isNaN(h) || h === 0) return '';

  // BMI = weight(kg) / (height(m))^2
  const heightInMeters = h / 100;
  const bmi = w / (heightInMeters * heightInMeters);

  return bmi.toFixed(1);
};
