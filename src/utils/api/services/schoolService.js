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

    utils: {
        formatSchoolData(school) {
            // Format school data with correct field mapping
            console.log('Formatting school data:', school);
            return {
                id: school.schoolId || school.id, // API returns 'schoolId', fallback to 'id'
                name: school.name,
                address: school.address,
                phone: school.phone,
                email: school.email,
                code: school.code,
                status: school.status,
                place: school.place,
                establishedYear: school.established_year,
                createdAt: school.createdAt,
                updatedAt: school.updatedAt
            };
        },
    },
}
export default schoolService;