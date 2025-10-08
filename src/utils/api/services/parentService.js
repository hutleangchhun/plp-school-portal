import { apiClient_, handleApiResponse } from '../client.js';
import { ENDPOINTS } from '../config.js';

export const parentService = {
    // Fetch all parents with optional pagination and search
    getAllParents: async (params = {}) => {
        const { page = 1, limit = 10, search } = params;

        // Build query parameters
        const queryParams = { page, limit };
        if (search && search.trim()) {
            queryParams.search = search.trim();
        }

        const response = await handleApiResponse(() =>
            apiClient_.get(ENDPOINTS.PARENTS.BASE, { params: queryParams })
        );

        // Extract data from response
        const data = response?.data;
        const parents = Array.isArray(data) ? data : (data?.data || data?.parents || []);
        const total = data?.total || data?.totalCount || parents.length;
        const currentPage = data?.page || data?.currentPage || page;
        const totalPages = data?.totalPages || Math.ceil(total / limit);

        return {
            success: response.success,
            data: parents,
            total,
            page: currentPage,
            totalPages,
            error: response.error
        };
    },

    // Fetch parent by ID
    getParentById: async (parentId) => {
        const response = await handleApiResponse(() =>
            apiClient_.get(ENDPOINTS.PARENTS.BY_ID(parentId))
        );

        return {
            success: response.success,
            data: response?.data,
            error: response.error
        };
    },

    // Fetch parents by user ID
    getParentsByUserId: async (userId) => {
        const response = await handleApiResponse(() =>
            apiClient_.get(ENDPOINTS.PARENTS.BY_USER(userId))
        );

        return {
            success: response.success,
            data: response?.data,
            error: response.error
        };
    },

    // Create a new parent
    createParent: async (parentData) => {
        const response = await handleApiResponse(() =>
            apiClient_.post(ENDPOINTS.PARENTS.CREATE, parentData)
        );

        return {
            success: response.success,
            data: response?.data,
            error: response.error
        };
    },

    // Update an existing parent
    updateParent: async (parentId, parentData) => {
        const response = await handleApiResponse(() =>
            apiClient_.put(ENDPOINTS.PARENTS.UPDATE(parentId), parentData)
        );

        return {
            success: response.success,
            data: response?.data,
            error: response.error
        };
    },

    // Delete a parent
    deleteParent: async (parentId) => {
        const response = await handleApiResponse(() =>
            apiClient_.delete(ENDPOINTS.PARENTS.DELETE(parentId))
        );

        return {
            success: response.success,
            data: response?.data,
            error: response.error
        };
    },

    // Bulk delete parents
    bulkDeleteParents: async (parentIds) => {
        const response = await handleApiResponse(() =>
            apiClient_.post(`${ENDPOINTS.PARENTS.BASE}/bulk-delete`, { parentIds })
        );

        return {
            success: response.success,
            data: response?.data,
            error: response.error
        };
    },
};

export default parentService;
