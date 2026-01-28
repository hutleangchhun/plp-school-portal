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
            console.log('📍 Fetching school details for ID:', schoolId);
            const response = await handleApiResponse(() =>
                apiClient_.get(`${ENDPOINTS.SCHOOLS.BASE}/${schoolId}`)
            );

            console.log('📍 School by ID response:', response);

            // Handle both response formats: { data: {...} } or direct object
            let schoolData = response?.data || response;

            // If we got school data (either directly or nested)
            if (schoolData && Object.keys(schoolData).length > 0) {
                console.log('✅ School data fetched:', schoolData);
                return {
                    success: true,
                    data: schoolData
                };
            }

            return {
                success: false,
                error: 'Failed to fetch school data'
            };
        } catch (error) {
            console.error('Error fetching school by ID:', error);
            console.error('Error details:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            return {
                success: false,
                error: error.message || 'Failed to fetch school data'
            };
        }
    },

    async updateSchool(schoolId, data) {
        try {
            const isFormData = data instanceof FormData;
            const config = {};

            // Only set Content-Type header if using FormData, otherwise let axios handle it
            if (isFormData) {
                config.headers = {
                    'Content-Type': 'multipart/form-data'
                };
            }

            console.log('🔄 Updating school with:', { schoolId, isFormData });
            const response = await handleApiResponse(() =>
                apiClient_.put(`${ENDPOINTS.SCHOOLS.BASE}/${schoolId}`, data, config)
            );

            console.log('📡 Update school response:', response);

            // Success if response has success flag OR if we got a response object back
            if (response?.success || response?.message || Object.keys(response || {}).length > 0) {
                return {
                    success: true,
                    data: response?.data || response
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
            console.log('🌐 API: Getting schools by district ID:', districtId);
            const endpoint = ENDPOINTS.SCHOOLS.SCHOOL_BY_DISTRICT(districtId);
            console.log('🌐 API: Full endpoint URL:', endpoint);

            const response = await handleApiResponse(() =>
                apiClient_.get(endpoint)
            );

            console.log('🌐 API: Raw response:', response);

            // The response structure is { success: true, data: { data: [...], total, page, ... } }
            const schoolsData = response.data?.data || response.data;

            if (schoolsData && Array.isArray(schoolsData)) {
                console.log(`🌐 API: Found ${schoolsData.length} schools`);
                const formattedData = schoolsData.map(school => {
                    const formatted = schoolService.utils.formatSchoolData(school);
                    return formatted;
                });
                return {
                    data: formattedData,
                    total: response.data?.total || response.total,
                    page: response.data?.page || response.page,
                    limit: response.data?.limit || response.limit,
                    totalPages: response.data?.totalPages || response.totalPages
                };
            } else {
                console.warn('🌐 API: No data or data is not an array:', schoolsData);
                return {
                    data: [],
                    total: 0,
                    page: 1,
                    limit: 0,
                    totalPages: 0
                };
            }
        } catch (error) {
            console.error('🌐 API: Error fetching schools by district:', error);
            console.error('🌐 API: Error details:', {
                message: error.message,
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data
            });
            throw error;
        }
    },

    async getSchoolsByCommune(communeCode) {
        try {
            const response = await handleApiResponse(() =>
                apiClient_.get(ENDPOINTS.SCHOOLS.SCHOOL_BY_COMMUNE(communeCode))
            );
            console.log('Raw schools by commune API response:', response);
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
            console.error('Error fetching schools by commune:', error);
            throw error;
        }
    },

    async getSchoolProjectTypes() {
        try {
            const response = await handleApiResponse(() =>
                apiClient_.get(ENDPOINTS.SCHOOLS.PROJECT_TYPES)
            );

            if (response?.success && Array.isArray(response.data)) {
                return {
                    success: true,
                    data: response.data
                };
            } else if (Array.isArray(response?.data)) {
                // Handle case where data is directly returned without success flag
                return {
                    success: true,
                    data: response.data
                };
            }
            return {
                success: false,
                data: [],
                error: 'Failed to fetch school project types'
            };
        } catch (error) {
            console.error('Error fetching school project types:', error);
            return {
                success: false,
                data: [],
                error: error.message || 'Failed to fetch school project types'
            };
        }
    },

    async uploadSchoolProfileImage(schoolId, imageFile) {
        try {
            const formData = new FormData();
            formData.append('file', imageFile);

            console.log('📸 Uploading school profile image for school:', schoolId);
            const response = await handleApiResponse(() =>
                apiClient_.post(`${ENDPOINTS.SCHOOLS.BASE}/${schoolId}/upload-profile`, formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                })
            );

            console.log('📸 Image upload response:', response);

            if (response?.success || response?.message || Object.keys(response || {}).length > 0) {
                return {
                    success: true,
                    data: response?.data || response
                };
            }
            return {
                success: false,
                error: 'Failed to upload school profile image'
            };
        } catch (error) {
            console.error('Error uploading school profile image:', error);
            return {
                success: false,
                error: error.message || 'Failed to upload school profile image'
            };
        }
    },

    async createSchool(data) {
        try {
            console.log('➕ Creating new school with data:', data);
            const response = await handleApiResponse(() =>
                apiClient_.post(ENDPOINTS.SCHOOLS.BASE, data)
            );

            console.log('➕ Create school response:', response);

            if (response?.success || response?.data || Object.keys(response || {}).length > 0) {
                return {
                    success: true,
                    data: response?.data || response
                };
            }
            return {
                success: false,
                error: 'Failed to create school'
            };
        } catch (error) {
            console.error('Error creating school:', error);
            return {
                success: false,
                error: error.message || 'Failed to create school'
            };
        }
    },

    async deleteSchool(schoolId) {
        try {
            console.log('🗑️ Deleting school with ID:', schoolId);
            const response = await handleApiResponse(() =>
                apiClient_.delete(`${ENDPOINTS.SCHOOLS.BASE}/${schoolId}`)
            );

            console.log('🗑️ Delete school response:', response);

            if (response?.success || response?.message || Object.keys(response || {}).length > 0) {
                return {
                    success: true,
                    data: response?.data || response
                };
            }
            return {
                success: false,
                error: 'Failed to delete school'
            };
        } catch (error) {
            console.error('Error deleting school:', error);
            return {
                success: false,
                error: error.message || 'Failed to delete school'
            };
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
                updatedAt: school.updatedAt,
                schoolType: school.schoolType,
                projectType: school.projectType,
                projectTypeId: school.projectTypeId,
                profile: school.profile
            };
        },
    },
}
export default schoolService;