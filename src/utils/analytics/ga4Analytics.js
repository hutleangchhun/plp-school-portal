/**
 * GA4 Analytics Service
 * Tracks user interactions and events in Google Analytics 4
 */

// Role name mapping for better readability in GA4
const ROLE_NAMES = {
  1: 'Admin',
  8: 'Teacher',
  14: 'Director',
  15: 'Deputy Principal',
  16: 'School Secretary',
  17: 'School Treasurer',
  18: 'School Librarian',
  19: 'School Workshop',
  20: 'School Security',
  21: 'ICT Teacher'
};

/**
 * Get human-readable role name from role ID
 * @param {number} roleId - The role ID
 * @returns {string} Human-readable role name
 */
const getRoleName = (roleId) => {
  return ROLE_NAMES[roleId] || `Role_${roleId}`;
};

/**
 * Track user login event to GA4
 * @param {Object} userData - User data object containing roleId, schoolId, etc.
 */
export const trackLogin = (userData) => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('GA4 not initialized');
    return;
  }

  if (!userData || !userData.roleId) {
    console.warn('Invalid user data for GA4 tracking');
    return;
  }

  const roleName = getRoleName(userData.roleId);

  // Set user properties for GA4
  window.gtag('set', {
    'user_role': roleName,
    'role_id': userData.roleId.toString(),
    'school_id': userData.schoolId?.toString() || 'unknown'
  });

  // Track login event
  window.gtag('event', 'user_login', {
    'user_role': roleName,
    'role_id': userData.roleId,
    'school_id': userData.schoolId || 'unknown',
    'user_id': userData.id,
    'school_name': userData.schoolName || 'unknown'
  });

  console.log('GA4 Login tracked:', {
    role: roleName,
    roleId: userData.roleId,
    schoolId: userData.schoolId
  });
};

/**
 * Track user login failed event to GA4
 * @param {Object} failureData - Login failure data object
 * @param {string} failureData.reason - Reason for login failure (e.g., 'invalid_credentials', 'account_locked', 'network_error', etc.)
 * @param {string} failureData.email - User's email (optional, for tracking purposes)
 * @param {string} failureData.username - User's username (optional, for tracking purposes)
 * @param {string} failureData.errorMessage - Error message from API
 */
export const trackLoginFailed = (failureData = {}) => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('GA4 not initialized');
    return;
  }

  const eventPayload = {
    'failure_reason': failureData.reason || 'unknown',
    'error_message': failureData.errorMessage || 'unknown',
    'timestamp': new Date().toISOString()
  };

  // Add optional identifiers if provided
  if (failureData.email) {
    eventPayload['user_email'] = failureData.email;
  }
  if (failureData.username) {
    eventPayload['username'] = failureData.username;
  }

  window.gtag('event', 'login_failed', eventPayload);

  console.log('GA4 Login failed tracked:', eventPayload);
};

/**
 * Track user logout event to GA4
 */
export const trackLogout = () => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('GA4 not initialized');
    return;
  }

  window.gtag('event', 'user_logout', {
    'timestamp': new Date().toISOString()
  });

  // Clear user properties
  window.gtag('set', {
    'user_role': null,
    'role_id': null,
    'school_id': null
  });

  console.log('GA4 Logout tracked');
};

/**
 * Track navigation/page view by role
 * @param {string} pagePath - The page path or name
 * @param {string} roleId - The user's role ID
 */
export const trackPageView = (pagePath, roleId) => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('GA4 not initialized');
    return;
  }

  const roleName = getRoleName(roleId);

  window.gtag('event', 'page_view_by_role', {
    'page_path': pagePath,
    'user_role': roleName,
    'role_id': roleId
  });

  console.log('GA4 Page view tracked:', { page: pagePath, role: roleName });
};

/**
 * Track custom event with role context
 * @param {string} eventName - Name of the event
 * @param {Object} eventData - Event data object
 * @param {number} roleId - The user's role ID (optional)
 */
export const trackEvent = (eventName, eventData = {}, roleId = null) => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('GA4 not initialized');
    return;
  }

  const eventPayload = { ...eventData };

  if (roleId) {
    eventPayload.user_role = getRoleName(roleId);
    eventPayload.role_id = roleId;
  }

  window.gtag('event', eventName, eventPayload);

  console.log(`GA4 Event tracked: ${eventName}`, eventPayload);
};

/**
 * Track feature usage by role
 * @param {string} featureName - Name of the feature
 * @param {number} roleId - The user's role ID
 * @param {Object} additionalData - Any additional data to track
 */
export const trackFeatureUsage = (featureName, roleId, additionalData = {}) => {
  trackEvent('feature_used', {
    'feature_name': featureName,
    'user_role': getRoleName(roleId),
    'role_id': roleId,
    ...additionalData
  }, roleId);
};

export default {
  trackLogin,
  trackLoginFailed,
  trackLogout,
  trackPageView,
  trackEvent,
  trackFeatureUsage,
  getRoleName
};
