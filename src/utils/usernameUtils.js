export function sanitizeUsername(value) {
  const safe = (value || '').toString();
  // Keep only ASCII letters and digits, then force lowercase
  return safe.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
}
