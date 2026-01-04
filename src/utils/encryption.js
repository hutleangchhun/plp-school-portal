/**
 * Encryption Utility for URL Parameters
 * Uses Base64 encoding with additional obfuscation for basic URL parameter encryption
 * Note: This is for obfuscation purposes. For sensitive data, use server-side encryption.
 *
 * Enhanced version with nonce-based encryption for truly random values each time
 */

const SECRET_KEY = 'plp_school_portal_secret_key_2024';
const ENCRYPTION_MAP_KEY = 'plp_encryption_map';

/**
 * Generate a random nonce (random unique identifier)
 * @returns {string} - A random nonce
 */
const generateNonce = () => {
  return Math.random().toString(36).substring(2, 15) +
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36);
};

/**
 * Get or initialize the encryption mapping from sessionStorage
 * This maps encrypted tokens to their original values
 * @returns {object} - The encryption map
 */
const getEncryptionMap = () => {
  try {
    const stored = sessionStorage.getItem(ENCRYPTION_MAP_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error reading encryption map:', error);
    return {};
  }
};

/**
 * Save the encryption mapping to sessionStorage
 * @param {object} map - The encryption map to save
 */
const saveEncryptionMap = (map) => {
  try {
    sessionStorage.setItem(ENCRYPTION_MAP_KEY, JSON.stringify(map));
  } catch (error) {
    console.error('Error saving encryption map:', error);
  }
};

/**
 * Encrypt a string (typically a user ID) with nonce-based encryption
 * This generates a truly random encrypted value each time, even for the same ID
 * @param {string} value - The value to encrypt
 * @param {boolean} useNonce - Whether to use nonce (default: true for random each time)
 * @returns {string} - The encrypted value (base64 encoded with nonce)
 */
export const encryptId = (value, useNonce = true) => {
  if (!value) return null;

  try {
    const strValue = String(value);

    if (useNonce) {
      // Generate a unique nonce
      const nonce = generateNonce();

      // Combine value with nonce and secret key
      const combined = nonce + '|' + strValue + SECRET_KEY;

      // Encode to base64
      const encoded = btoa(combined);

      // Additional obfuscation: reverse
      const encrypted = encoded.split('').reverse().join('');

      // Store the mapping in sessionStorage so we can decrypt it later
      const encryptionMap = getEncryptionMap();
      encryptionMap[encrypted] = strValue;
      saveEncryptionMap(encryptionMap);

      return encrypted;
    } else {
      // Deterministic encryption (same value always produces same result)
      const combined = strValue + SECRET_KEY;
      const encoded = btoa(combined);
      return encoded.split('').reverse().join('');
    }
  } catch (error) {
    console.error('Error encrypting ID:', error);
    return null;
  }
};

/**
 * Decrypt a string (encrypted user ID)
 * @param {string} encrypted - The encrypted value
 * @returns {string} - The decrypted value
 */
export const decryptId = (encrypted) => {
  if (!encrypted) return null;

  try {
    // First, try to get from sessionStorage (nonce-based encryption)
    const encryptionMap = getEncryptionMap();
    if (encryptionMap[encrypted]) {
      return encryptionMap[encrypted];
    }

    // Fallback to deterministic decryption (old format)
    const reversed = encrypted.split('').reverse().join('');
    const decoded = atob(reversed);

    // Try to extract value from nonce format (nonce|value)
    if (decoded.includes('|')) {
      const parts = decoded.split('|');
      if (parts.length === 2) {
        const value = parts[1].replace(SECRET_KEY, '');
        return value || null;
      }
    }

    // Fallback to old format without nonce
    const value = decoded.replace(SECRET_KEY, '');
    return value || null;
  } catch (error) {
    console.error('Error decrypting ID:', error);
    return null;
  }
};

/**
 * Validate an encrypted token
 * @param {string} encrypted - The encrypted token
 * @returns {boolean} - Whether the token is valid
 */
export const isValidEncryptedId = (encrypted) => {
  if (!encrypted) return false;

  try {
    const decrypted = decryptId(encrypted);
    return decrypted !== null && decrypted.length > 0;
  } catch (error) {
    return false;
  }
};

/**
 * Clear the encryption map (useful for logout or clearing session)
 */
export const clearEncryptionMap = () => {
  try {
    sessionStorage.removeItem(ENCRYPTION_MAP_KEY);
  } catch (error) {
    console.error('Error clearing encryption map:', error);
  }
};

/**
 * Encrypt multiple parameters as a JSON object
 * @param {object} params - Object with parameters to encrypt (e.g., {classId: 123, schoolId: 456})
 * @returns {string} - Encrypted JSON string
 */
export const encryptParams = (params) => {
  if (!params || typeof params !== 'object') return null;

  try {
    const jsonStr = JSON.stringify(params);
    const nonce = generateNonce();
    const combined = nonce + '|' + jsonStr + SECRET_KEY;
    const encoded = btoa(combined);
    const encrypted = encoded.split('').reverse().join('');

    // Store mapping
    const encryptionMap = getEncryptionMap();
    encryptionMap[encrypted] = jsonStr;
    saveEncryptionMap(encryptionMap);

    return encrypted;
  } catch (error) {
    console.error('Error encrypting params:', error);
    return null;
  }
};

/**
 * Decrypt multiple parameters from encrypted string
 * @param {string} encrypted - Encrypted parameter string
 * @returns {object|null} - Decrypted object with parameters
 */
export const decryptParams = (encrypted) => {
  if (!encrypted) return null;

  try {
    // First try sessionStorage map
    const encryptionMap = getEncryptionMap();
    if (encryptionMap[encrypted]) {
      return JSON.parse(encryptionMap[encrypted]);
    }

    // Fallback to manual decryption
    const reversed = encrypted.split('').reverse().join('');
    const decoded = atob(reversed);

    // Extract from nonce format (nonce|json)
    if (decoded.includes('|')) {
      const parts = decoded.split('|');
      if (parts.length === 2) {
        const jsonStr = parts[1].replace(SECRET_KEY, '');
        return JSON.parse(jsonStr);
      }
    }

    return null;
  } catch (error) {
    console.error('Error decrypting params:', error);
    return null;
  }
};
