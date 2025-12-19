import { apiClient_, handleApiResponse } from '../client.js';

const scheduleService = {
  // Get all schedules with filters
  getSchedules: async (params = {}) => {
    const response = await handleApiResponse(() =>
      apiClient_.get('/schedule', { params })
    );
    return response;
  },

  // Get teacher's schedule
  getTeacherSchedule: async (teacherId, params = {}) => {
    const response = await handleApiResponse(() =>
      apiClient_.get(`/schedule/teacher/${teacherId}`, { params })
    );
    return response;
  },

  // Get filtered teacher schedule (with classId and shift filters)
  getTeacherScheduleFiltered: async (teacherId, filters = {}) => {
    const response = await handleApiResponse(() =>
      apiClient_.get(`/schedule/teacher/${teacherId}/filter`, { params: filters })
    );
    return response;
  },

  // Get class schedule
  getClassSchedule: async (classId, params = {}) => {
    const response = await handleApiResponse(() =>
      apiClient_.get(`/schedule/class/${classId}`, { params })
    );
    return response;
  },

  // Get filtered class schedule (with shift and other filters)
  getClassScheduleFiltered: async (classId, filters = {}) => {
    const response = await handleApiResponse(() =>
      apiClient_.get(`/schedule/class/${classId}`, { params: filters })
    );
    return response;
  },

  // Get schedule by ID
  getScheduleById: async (id) => {
    const response = await handleApiResponse(() =>
      apiClient_.get(`/schedule/${id}`)
    );
    return response;
  },

  // Create new schedule
  createSchedule: async (scheduleData) => {
    const response = await handleApiResponse(() =>
      apiClient_.post('/schedule', scheduleData)
    );
    return response;
  },

  // Update schedule
  updateSchedule: async (id, scheduleData) => {
    const response = await handleApiResponse(() =>
      apiClient_.patch(`/schedule/${id}`, scheduleData)
    );
    return response;
  },

  // Delete schedule
  deleteSchedule: async (id) => {
    const response = await handleApiResponse(() =>
      apiClient_.delete(`/schedule/${id}`)
    );
    return response;
  },

  // Template management
  createTemplate: async (templateData) => {
    const response = await handleApiResponse(() =>
      apiClient_.post('/schedule/template', templateData)
    );
    return response;
  },

  applyTemplate: async (templateId, teacherId) => {
    const response = await handleApiResponse(() =>
      apiClient_.post(`/schedule/template/${templateId}/apply`, null, {
        params: { teacherId }
      })
    );
    return response;
  },

  getTemplates: async (params = {}) => {
    const response = await handleApiResponse(() =>
      apiClient_.get('/schedule/template', { params })
    );
    return response;
  },
};

export default scheduleService;
