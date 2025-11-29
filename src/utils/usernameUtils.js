export function sanitizeUsername(value) {
  const safe = (value || '').toString();
  // Keep only ASCII letters and digits, then force lowercase
  return safe.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}

/**
 * Format a person's full name by combining first and last names
 * @param {Object} person - Person object with firstName/first_name and lastName/last_name
 * @param {string} fallback - Fallback value if no name parts available
 * @returns {string} Formatted full name (lastName + firstName)
 */
export function getFullName(person, fallback = '-') {
  if (!person) return fallback;

  const firstName = person.firstName || person.first_name || '';
  const lastName = person.lastName || person.last_name || '';

  // Return lastName + firstName format (Khmer convention)
  const fullName = `${lastName} ${firstName}`.trim();
  return fullName || fallback;
}
