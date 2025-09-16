import { get } from '../client';
import { ENDPOINTS } from '../config';

const locationService = {
  /**
   * Get all provinces
   * @returns {Promise<Array>} List of provinces
   */
  getProvinces: async () => {
    try {
      const response = await get(ENDPOINTS.LOCATION.BASE);
      console.log('Provinces response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching provinces:', error);
      throw error;
    }
  },

  /**
   * Get districts by province ID
   * @param {number} provinceId - Province ID
   * @returns {Promise<Array>} List of districts
   */
  getDistrictsByProvince: async (provinceId) => {
    try {
      const response = await get(ENDPOINTS.LOCATION.DISTRICTS(provinceId));
      return response;
    } catch (error) {
      console.error('Error fetching districts:', error);
      throw error;
    }
  },
  getCommunesByDistrict: async (provinceId, districtCode) => {
    try {
      const response = await get(ENDPOINTS.LOCATION.COMMUNES(provinceId, districtCode));
      return response;
    } catch (error) {
      console.error('Error fetching communes:', error);
      throw error;
    }
  },
  getVillagesByCommune: async (provinceId, districtCode, communeCode) => {
    try {
      const response = await get(ENDPOINTS.LOCATION.VILLAGES(provinceId, districtCode, communeCode));
      return response;
    } catch (error) {
      console.error('Error fetching villages:', error);
      throw error;
    }
  },
};

export default locationService;