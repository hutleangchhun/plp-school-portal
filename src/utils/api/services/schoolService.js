import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

export const schoolService = {
    async getSchoolInfo(schoolId) {
        try {
            const response = await handleApiResponse(() =>
                apiClient_.get(`${ENDPOINTS.SCHOOLS.BASE}/${schoolId}`)
            );

            console.log('Raw school API response:', response);

            if (response.data) {
                const formatted = schoolService.utils.formatSchoolData(response.data);
                console.log('Formatted school data:', formatted);
                return { data: formatted };
            }
            return { data: null };
        } catch (error) {
            console.error('Error fetching school info:', error);
            throw error;
        }
    },

    async getSchoolById(schoolId) {
        try {
            const response = await handleApiResponse(() =>
                apiClient_.get(`${ENDPOINTS.SCHOOLS.BASE}/${schoolId}`)
            );

            if (response?.success && response.data) {
                return {
                    success: true,
                    data: response.data
                };
            }
            return {
                success: false,
                error: 'Failed to fetch school data'
            };
        } catch (error) {
            console.error('Error fetching school by ID:', error);
            return {
                success: false,
                error: error.message || 'Failed to fetch school data'
            };
        }
    },

    async updateSchool(schoolId, formData) {
        try {
            const response = await handleApiResponse(() =>
                apiClient_.put(`${ENDPOINTS.SCHOOLS.BASE}/${schoolId}`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                })
            );

            if (response?.success && response.data) {
                return {
                    success: true,
                    data: response.data
                };
            }
            return {
                success: false,
                error: 'Failed to update school'
            };
        } catch (error) {
            console.error('Error updating school:', error);
            return {
                success: false,
                error: error.message || 'Failed to update school'
            };
        }
    },
    async getAllSchools() {
        try {
            const response = await handleApiResponse(() =>
                apiClient_.get(ENDPOINTS.SCHOOLS.BASE)
            );

            console.log('Raw schools API response:', response);

            if (response.data && Array.isArray(response.data)) {
                const formattedData = response.data.map(school => {
                    console.log('Raw school before formatting:', school);
                    const formatted = schoolService.utils.formatSchoolData(school);
                    console.log('Formatted school:', formatted);
                    return formatted;
                }   );

                return { data: formattedData };
            }
            return { data: [] };
        } catch (error) {
            console.error('Error fetching all schools:', error);
            throw error;
        }
    },

    async getSchoolsByDistrict(districtId) {
        try {
            const response = await handleApiResponse(() =>
                apiClient_.get(ENDPOINTS.SCHOOLS.SCHOOL_BY_DISTRICT(districtId))
            );
            console.log('Raw schools by district API response:', response);
            if (response.data && Array.isArray(response.data)) {
                const formattedData = response.data.map(school => {
                    console.log('Raw school before formatting:', school);
                    const formatted = schoolService.utils.formatSchoolData(school);
                    console.log('Formatted school:', formatted);
                    return formatted;
                });
                return { data: formattedData };
            }
            return { data: [] };
        } catch (error) {
            console.error('Error fetching schools by district:', error);
            throw error;
        }
    },

    utils: {
        formatSchoolData(school) {
            // Format school data with correct field mapping
            console.log('Formatting school data:', school);

            // Format place - handle both string and object
            let placeText = '';
            if (school.place) {
                if (typeof school.place === 'string') {
                    placeText = school.place;
                } else if (typeof school.place === 'object') {
                    // Format place object as readable string
                    const parts = [
                        school.place.commune_name_kh || school.place.commune_name_en,
                        school.place.district_name_kh || school.place.district_name_en,
                        school.place.province_name_kh || school.place.province_name_en
                    ].filter(Boolean);
                    placeText = parts.join(', ');
                }
            }

            return {
                id: school.schoolId || school.id, // API returns 'schoolId', fallback to 'id'
                name: school.name,
                address: school.address,
                phone: school.phone,
                email: school.email,
                code: school.code,
                status: school.status,
                place: placeText,
                placeObject: school.place, // Keep original place object for reference
                establishedYear: school.established_year,
                createdAt: school.createdAt,
                updatedAt: school.updatedAt
            };
        },
    },
}
export default schoolService;