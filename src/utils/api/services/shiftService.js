import { attendanceApiClient, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

// Uses the attendance server (localhost:8082 in dev, 192.168.155.92 in prod)
const client = attendanceApiClient;

export const shiftService = {
  /**
   * Get all shifts
   * @returns {Promise<{success: boolean, data: Array}>}
   */
  async getShifts() {
    const response = await handleApiResponse(() =>
      client.get(ENDPOINTS.SHIFTS.BASE)
    );
    if (!response.success) return response;
    const data = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
        ? response.data
        : [];
    return { success: true, data };
  },

  /**
   * Get a single shift by ID
   * @param {number} id
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  async getShiftById(id) {
    const response = await handleApiResponse(() =>
      client.get(ENDPOINTS.SHIFTS.BY_ID(id))
    );
    if (!response.success) return response;
    return { success: true, data: response.data?.data ?? response.data };
  },

  /**
   * Create a new shift
   * @param {{ name: string, startTime: string, endTime: string, description?: string }} payload
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  async createShift(payload) {
    const response = await handleApiResponse(() =>
      client.post(ENDPOINTS.SHIFTS.BASE, payload)
    );
    if (!response.success) return response;
    return { success: true, data: response.data?.data ?? response.data };
  },

  /**
   * Update an existing shift (all fields optional)
   * @param {number} id
   * @param {{ name?: string, startTime?: string, endTime?: string, description?: string }} payload
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  async updateShift(id, payload) {
    const response = await handleApiResponse(() =>
      client.patch(ENDPOINTS.SHIFTS.BY_ID(id), payload)
    );
    if (!response.success) return response;
    return { success: true, data: response.data?.data ?? response.data };
  },

  /**
   * Delete a shift
   * @param {number} id
   * @returns {Promise<{success: boolean}>}
   */
  async deleteShift(id) {
    const response = await handleApiResponse(() =>
      client.delete(ENDPOINTS.SHIFTS.BY_ID(id))
    );
    return response;
  },
};

export default shiftService;
