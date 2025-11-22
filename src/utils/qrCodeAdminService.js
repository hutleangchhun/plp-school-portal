/**
 * QR Code Admin Service
 * Handles bulk QR code operations for admins managing all users
 */

import QRCode from 'qrcode';

/**
 * Generate a QR code for authentication
 * @param {Object} userData - User data to encode
 * @param {number} size - QR code size (default 300)
 * @returns {Promise<string>} - Data URL of QR code
 */
const generateAuthQRCode = async (userData, size = 300) => {
  try {
    if (!userData || !userData.id) {
      throw new Error('Invalid user data');
    }

    const qrData = {
      id: userData.id,
      username: userData.username,
      email: userData.email,
      timestamp: new Date().toISOString(),
      role: userData.roleId === 14 ? 'Director' : (userData.roleId === 8 ? 'Teacher' : 'Student')
    };

    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      width: size,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    return qrDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
};

/**
 * Generate QR codes for multiple users
 * @param {Array} users - Array of user objects
 * @param {number} qrSize - QR code size
 * @returns {Promise<Array>} - Array of QR code data with user info
 */
export const generateBulkQRCodes = async (users, qrSize = 300) => {
  try {
    if (!Array.isArray(users) || users.length === 0) {
      throw new Error('Invalid users array');
    }

    const qrCodes = await Promise.all(
      users.map(async (user) => {
        try {
          const qrDataUrl = await generateAuthQRCode(user, qrSize);
          return {
            userId: user.id,
            username: user.username,
            fullName: user.fullName || user.full_name || `${user.first_name} ${user.last_name}`,
            email: user.email,
            role: user.roleId === 14 ? 'Director' : (user.roleId === 8 ? 'Teacher' : 'Student'),
            qrCode: qrDataUrl,
            generatedAt: new Date().toISOString(),
            size: qrSize,
            status: 'success'
          };
        } catch (error) {
          return {
            userId: user.id,
            username: user.username,
            fullName: user.fullName || user.full_name || `${user.first_name} ${user.last_name}`,
            email: user.email,
            role: user.roleId === 14 ? 'Director' : (user.roleId === 8 ? 'Teacher' : 'Student'),
            qrCode: null,
            generatedAt: new Date().toISOString(),
            size: qrSize,
            status: 'error',
            error: error.message
          };
        }
      })
    );

    return qrCodes;
  } catch (error) {
    console.error('Error generating bulk QR codes:', error);
    throw new Error(`Failed to generate QR codes: ${error.message}`);
  }
};

/**
 * Filter users by role
 * @param {Array} users - Array of users
 * @param {string} role - Role to filter by ('teacher', 'student', 'director')
 * @returns {Array} - Filtered users
 */
export const filterUsersByRole = (users, role) => {
  if (!role || role === 'all') return users;

  return users.filter(user => {
    if (role === 'teacher') {
      return user.roleId === 8;
    } else if (role === 'director') {
      return user.roleId === 14;
    } else if (role === 'student') {
      return user.roleId !== 8 && user.roleId !== 14;
    }
    return true;
  });
};

/**
 * Filter users by search term
 * @param {Array} users - Array of users
 * @param {string} searchTerm - Search term
 * @returns {Array} - Filtered users
 */
export const filterUsersBySearch = (users, searchTerm) => {
  if (!searchTerm || searchTerm.trim() === '') return users;

  const lowerSearch = searchTerm.toLowerCase().trim();

  return users.filter(user => {
    const username = (user.username || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const firstName = (user.first_name || user.firstName || '').toLowerCase();
    const lastName = (user.last_name || user.lastName || '').toLowerCase();
    const fullName = (user.fullName || user.full_name || '').toLowerCase();
    const id = String(user.id);

    return (
      username.includes(lowerSearch) ||
      email.includes(lowerSearch) ||
      firstName.includes(lowerSearch) ||
      lastName.includes(lowerSearch) ||
      fullName.includes(lowerSearch) ||
      id.includes(lowerSearch)
    );
  });
};

/**
 * Sort users by field
 * @param {Array} users - Array of users
 * @param {string} field - Field to sort by
 * @param {string} direction - 'asc' or 'desc'
 * @returns {Array} - Sorted users
 */
export const sortUsers = (users, field = 'username', direction = 'asc') => {
  const sorted = [...users].sort((a, b) => {
    let aVal = a[field];
    let bVal = b[field];

    // Handle nested properties
    if (field === 'fullName') {
      aVal = a.fullName || a.full_name || `${a.first_name} ${a.last_name}`;
      bVal = b.fullName || b.full_name || `${b.first_name} ${b.last_name}`;
    }

    // Convert to lowercase for string comparison
    if (typeof aVal === 'string') aVal = aVal.toLowerCase();
    if (typeof bVal === 'string') bVal = bVal.toLowerCase();

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
};

/**
 * Export QR codes as JSON
 * @param {Array} qrCodes - Array of QR code objects
 * @param {string} filename - Filename for export
 */
export const exportQRCodesAsJSON = (qrCodes, filename = 'qr-codes.json') => {
  try {
    // Remove QR code data URLs from export (they're very large)
    const exportData = qrCodes.map(qr => ({
      userId: qr.userId,
      username: qr.username,
      fullName: qr.fullName,
      email: qr.email,
      role: qr.role,
      generatedAt: qr.generatedAt,
      size: qr.size,
      status: qr.status
    }));

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting QR codes:', error);
    throw new Error(`Failed to export QR codes: ${error.message}`);
  }
};

/**
 * Export QR codes as CSV
 * @param {Array} qrCodes - Array of QR code objects
 * @param {string} filename - Filename for export
 */
export const exportQRCodesAsCSV = (qrCodes, filename = 'qr-codes.csv') => {
  try {
    const headers = ['User ID', 'Username', 'Full Name', 'Email', 'Role', 'Generated At', 'Size', 'Status'];
    const rows = qrCodes.map(qr => [
      qr.userId,
      qr.username,
      qr.fullName,
      qr.email,
      qr.role,
      qr.generatedAt,
      qr.size,
      qr.status
    ]);

    // Create CSV content
    const csvContent = [
      headers.map(h => `"${h}"`).join(','),
      ...rows.map(row => row.map(cell => `"${cell || ''}"`).join(','))
    ].join('\n');

    const dataBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw new Error(`Failed to export CSV: ${error.message}`);
  }
};

/**
 * Batch download QR codes as ZIP (requires additional library)
 * @param {Array} qrCodes - Array of QR code objects
 * @returns {Promise<void>}
 */
export const downloadQRCodesAsZip = async (qrCodes) => {
  try {
    // This would require jszip library
    // For now, provide information about implementation
    console.warn('ZIP download requires jszip library. Install with: npm install jszip');
    throw new Error('ZIP download requires jszip library. Please install it first.');
  } catch (error) {
    console.error('Error downloading QR codes as ZIP:', error);
    throw error;
  }
};

/**
 * Get statistics about QR codes
 * @param {Array} qrCodes - Array of QR code objects
 * @returns {Object} - Statistics
 */
export const getQRCodeStatistics = (qrCodes) => {
  if (!Array.isArray(qrCodes) || qrCodes.length === 0) {
    return {
      total: 0,
      successful: 0,
      failed: 0,
      successRate: 0,
      byRole: {}
    };
  }

  const total = qrCodes.length;
  const successful = qrCodes.filter(qr => qr.status === 'success').length;
  const failed = total - successful;

  const byRole = {};
  qrCodes.forEach(qr => {
    byRole[qr.role] = (byRole[qr.role] || 0) + 1;
  });

  return {
    total,
    successful,
    failed,
    successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
    byRole
  };
};

/**
 * Validate QR codes array
 * @param {Array} qrCodes - Array to validate
 * @returns {boolean} - True if valid
 */
export const isValidQRCodesArray = (qrCodes) => {
  return (
    Array.isArray(qrCodes) &&
    qrCodes.length > 0 &&
    qrCodes.every(qr =>
      qr.userId &&
      qr.username &&
      qr.role &&
      qr.status &&
      (qr.status === 'success' ? qr.qrCode : true)
    )
  );
};

export default {
  generateBulkQRCodes,
  filterUsersByRole,
  filterUsersBySearch,
  sortUsers,
  exportQRCodesAsJSON,
  exportQRCodesAsCSV,
  downloadQRCodesAsZip,
  getQRCodeStatistics,
  isValidQRCodesArray
};
