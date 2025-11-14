/**
 * Encryption Utility for URL Parameters
 * Uses Base64 encoding with additional obfuscation for basic URL parameter encryption
 * Note: This is for obfuscation purposes. For sensitive data, use server-side encryption.
 */

const SECRET_KEY = 'plp_school_portal_secret_key_2024';

/**
 * Encrypt a string (typically a user ID)
 * @param {string} value - The value to encrypt
 * @returns {string} - The encrypted value (base64 encoded)
 */
export const encryptId = (value) => {
  if (!value) return null;

  try {
    // Convert to string if not already
    const strValue = String(value);

    // Simple obfuscation: combine with secret key
    const combined = strValue + SECRET_KEY;

    // Encode to base64
    const encoded = btoa(combined);

    // Additional obfuscation: reverse some characters
    return encoded.split('').reverse().join('');
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
    // Reverse the obfuscation
    const reversed = encrypted.split('').reverse().join('');

    // Decode from base64
    const decoded = atob(reversed);

    // Remove the secret key from the end
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
