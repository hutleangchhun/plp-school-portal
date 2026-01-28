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
  getCommunesByDistrict: async (provinceId, districtId) => {
    try {
      const response = await get(ENDPOINTS.LOCATION.COMMUNES(provinceId, districtId));
      return response;
    } catch (error) {
      console.error('Error fetching communes:', error);
      throw error;
    }
  },
  getVillagesByCommune: async (provinceId, districtId, communeId) => {
    try {
      const response = await get(ENDPOINTS.LOCATION.VILLAGES(provinceId, districtId, communeId));
      return response;
    } catch (error) {
      console.error('Error fetching villages:', error);
      throw error;
    }
  },

  /**
   * Get all zones with their provinces
   * @returns {Promise<Object>} Response with zones data
   */
  getAllZones: async () => {
    try {
      const response = await get(ENDPOINTS.LOCATION.ZONES);
      console.log('Zones response:', response);
      return response;
    } catch (error) {
      console.error('Error fetching zones:', error);
      throw error;
    }
  },

  /**
   * Get province name by ID
   * @param {number} provinceId - Province ID
   * @returns {Promise<string>} Province name
   */
  getProvinceName: async (provinceId) => {
    try {
      console.log('🔍 [getProvinceName] Calling getProvinces for ID:', provinceId);
      const response = await locationService.getProvinces();

      const provinces = Array.isArray(response) ? response : (response?.data || []);
      console.log('🗺️ [getProvinceName] Provinces found:', provinces?.length || 0);

      const province = provinces.find(p => p.id === provinceId);
      if (province) {
        // Try different field names: name, province_name_kh, province_name_en
        const name = province.name || province.province_name_kh || province.province_name_en;
        console.log('✅ [getProvinceName] Found:', name);
        return name || `Province ${provinceId}`;
      }
      console.log('⚠️ [getProvinceName] Not found, returning fallback');
      return `Province ${provinceId}`;
    } catch (error) {
      console.error('❌ [getProvinceName] Error:', error);
      return `Province ${provinceId}`;
    }
  },

  /**
   * Get district name by ID and province ID
   * @param {number} provinceId - Province ID
   * @param {number} districtId - District ID
   * @returns {Promise<string>} District name
   */
  getDistrictName: async (provinceId, districtId) => {
    try {
      console.log('🔍 [getDistrictName] Fetching for district ID:', districtId, 'in province:', provinceId);
      const response = await locationService.getDistrictsByProvince(provinceId);

      const districts = Array.isArray(response) ? response : (response?.data || []);
      console.log('🗺️ [getDistrictName] Districts found:', districts?.length || 0);

      const district = districts.find(d => d.id === districtId);
      if (district) {
        // Try different field names: name, district_name_kh, district_name_en
        const name = district.name || district.district_name_kh || district.district_name_en;
        console.log('✅ [getDistrictName] Found:', name);
        return name || `District ${districtId}`;
      }
      console.log('⚠️ [getDistrictName] Not found, returning fallback');
      return `District ${districtId}`;
    } catch (error) {
      console.error('❌ [getDistrictName] Error:', error);
      return `District ${districtId}`;
    }
  },

  /**
   * Get commune name by ID, province ID and district ID
   * @param {number} provinceId - Province ID
   * @param {number} districtCode - District code
   * @param {number} communeId - Commune ID
   * @returns {Promise<string>} Commune name
   */
  getCommuneName: async (provinceId, districtIdOrCode, communeId) => {
    try {
      console.log('🔍 [getCommuneName] Fetching commune ID:', communeId, 'district:', districtIdOrCode, 'province:', provinceId);

      // Fetch districts first to get the district_code (not ID)
      const districtsResponse = await locationService.getDistrictsByProvince(provinceId);
      const districts = Array.isArray(districtsResponse) ? districtsResponse : (districtsResponse?.data || []);
      console.log('🗺️ [getCommuneName] Districts fetched:', districts?.length);

      // Find district by ID to get its code
      const district = districts.find(d => d.id === districtIdOrCode);
      if (!district) {
        console.error('❌ [getCommuneName] District not found for ID:', districtIdOrCode);
        return `Commune ${communeId}`;
      }

      // Use district_code (or code or id as fallback)
      const actualDistrictCode = district.district_code || district.code || district.id;
      console.log('✅ [getCommuneName] Using district code:', actualDistrictCode);

      // Now fetch communes using the correct code
      const communesResponse = await locationService.getCommunesByDistrict(provinceId, actualDistrictCode);
      const communes = Array.isArray(communesResponse) ? communesResponse : (communesResponse?.data || []);
      console.log('🗺️ [getCommuneName] Communes fetched:', communes?.length);

      // Find commune by ID
      const commune = communes.find(c => c.id === communeId);
      if (commune) {
        // Try different field names: name, commune_name_kh, commune_name_en
        const name = commune.name || commune.commune_name_kh || commune.commune_name_en;
        console.log('✅ [getCommuneName] Found:', name);
        return name || `Commune ${communeId}`;
      }
      console.log('⚠️ [getCommuneName] Commune not found, returning fallback');
      return `Commune ${communeId}`;
    } catch (error) {
      console.error('❌ [getCommuneName] Error:', error);
      return `Commune ${communeId}`;
    }
  },
};

export default locationService;