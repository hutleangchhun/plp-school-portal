// Main API exports
export { default as apiClient } from './client.js';
export { tokenManager, handleApiResponse } from './client.js';
export { API_CONFIG, ENDPOINTS, HTTP_STATUS, getBestApiUrl, testApiConnection, getStaticAssetBaseUrl } from './config.js';

// Service exports
export { authService, authUtils } from './services/authService.js';
export { userService, userUtils } from './services/userService.js';
export { studentService } from './services/studentService.js';
export { attendanceService } from './services/attendanceService.js';
export { classService } from './services/classService.js';
export { subjectService } from './services/subjectService.js';
export { scoreService } from './services/scoreService.js';
export { userActivityLogService } from './services/userActivityLogService.js';
export { schoolService } from './services/schoolService.js';
export { teacherService } from './services/teacherService.js';

// Import services for convenience objects
import { authService, authUtils } from './services/authService.js';
import { userService, userUtils } from './services/userService.js';
import { studentService } from './services/studentService.js';
import { attendanceService } from './services/attendanceService.js';
import { classService } from './services/classService.js';
import { subjectService } from './services/subjectService.js';
import { scoreService } from './services/scoreService.js';
import { userActivityLogService } from './services/userActivityLogService.js';
import { schoolService } from './services/schoolService.js';
import { teacherService } from './services/teacherService.js';

// Convenience exports for common operations
export const api = {
  auth: authService,
  user: userService,
  student: studentService,
  attendance: attendanceService,
  class: classService,
  subject: subjectService,
  score: scoreService,
  userActivityLog: userActivityLogService,
  school: schoolService,
  teacher: teacherService,
};

export const utils = {
  auth: authUtils,
  user: userUtils
};