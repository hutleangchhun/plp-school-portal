// Main API exports
export { default as apiClient } from './client.js';
export { tokenManager, handleApiResponse } from './client.js';
export { API_CONFIG, ENDPOINTS, HTTP_STATUS, getBestApiUrl, testApiConnection, getStaticAssetBaseUrl } from './config.js';

// Service exports
export { authService, authUtils } from './services/authService.js';
export { userService, userUtils } from './services/userService.js';
export { studentService } from './services/studentService.js';

// Import services for convenience objects
import { authService, authUtils } from './services/authService.js';
import { userService, userUtils } from './services/userService.js';
import { studentService } from './services/studentService.js';

// Convenience exports for common operations
export const api = {
  auth: authService,
  user: userService,
  student: studentService
};

export const utils = {
  auth: authUtils,
  user: userUtils
};